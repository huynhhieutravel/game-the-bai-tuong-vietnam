/**
 * TrickRules.js
 * Quản lý Toàn Bộ 10 Lá Bài Cẩm Nang & Chuỗi Hóa Giải (Negate Chain) trong Việt Sát v4.
 * Tích hợp chặt chẽ với PriorityStack và GameInvariants.
 */

import { RangeSystem } from './RangeSystem.js';
import { CombatRules } from './CombatRules.js';
import { globalHeroRegistry } from '../heroes/HeroRegistry.js';

export class TrickRules {
  /**
   * Sử dụng một lá Cẩm Nang
   */
  static playTrick(state, sourceId, targetIds, card, extraArgs = {}) {
    const source = state.getPlayer(sourceId);
    if (!source || !source.isAlive) {
      throw new Error(`[TrickRules] Người chơi ${sourceId} không hợp lệ.`);
    }

    const targets = Array.isArray(targetIds) ? targetIds : [targetIds];

    // 0. Kiểm tra Đạm Bạc (Lang Liêu) nếu là Quyết Đấu
    if ((card.name === 'Quyết Đấu' || card.type === 'duel') && targets.length > 0) {
      const target = state.getPlayer(targets[0]);
      if (target && globalHeroRegistry.hasSkill(target, 'dam_bac', true) && (!target.hand || target.hand.length === 0)) {
        throw new Error(`[TrickRules] ${target.name} đang kích hoạt [Đạm Bạc] (hết bài trên tay), không thể bị Quyết Đấu!`);
      }
    }

    // 1. Phân loại Cẩm nang thường vs Cẩm nang Trì hoãn (Sấm Sét, Hỗn Loạn)
    const isDelayed = ['sam_set', 'hon_loan'].includes(card.idKey || card.id) || ['Sấm Sét', 'Hỗn Loạn'].includes(card.name);
    if (isDelayed) {
      return this._playDelayedTrick(state, sourceId, targets[0] ?? sourceId, card);
    }

    // 2. Trừ lá bài trên tay vào discardPile cho cẩm nang thông thường
    state.discardFromHand(sourceId, [card.id]);
    state.addLog(`${source.name} sử dụng cẩm nang [${card.name}].`);

    // Kích hoạt kỹ năng phản ứng khi sử dụng Cẩm nang (Tiên Dung - Duyên Tiên...)
    globalHeroRegistry.dispatchTrigger('ON_TRICK_PLAYED', { sourceId, targetIds: targets, card }, state);

    // 3. Kiểm tra Xiềng Xích Rèn Lại (Reforge): Bỏ lá bài rút 1 lá mới, không mở hỏi Hóa Giải
    const isXiengXich = card.name === 'Xiềng Xích' || card.idKey === 'xieng_xich';
    const isReforge = isXiengXich && (extraArgs.reforge || !targets || targets.length === 0);

    if (isReforge) {
      state.drawCards(sourceId, 1);
      state.addLog(`🔄 ${source.name} chọn [Rèn Lại] lá [Xiềng Xích], rút 1 lá bài mới.`);
      return;
    }

    // 4. Mở vòng hỏi Hóa Giải (Negate Chain) cho Cẩm nang thường
    this._startNegateChain(state, sourceId, targets, card, extraArgs);
  }

  /**
   * Cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn)
   */
  static _playDelayedTrick(state, sourceId, targetId, card) {
    const target = state.getPlayer(targetId);
    if (!target) {
      throw new Error(`[TrickRules] Không tìm thấy mục tiêu ${targetId} cho cẩm nang trì hoãn!`);
    }

    target.judgementArea = target.judgementArea || [];
    if (target.judgementArea.some(c => (c.idKey || c.id) === (card.idKey || card.id))) {
      throw new Error(`[TrickRules] Mục tiêu đã có cẩm nang trì hoãn này trong khu phán xét!`);
    }

    // Chuyển trực tiếp từ tay người chơi vào khu phán xét (KHÔNG bỏ vào discardPile)
    const source = state.getPlayer(sourceId);
    source.hand = source.hand.filter(c => c.id !== card.id);
    target.judgementArea.push(card);
    state.addLog(`[${card.name}] được đặt vào khu phán xét của ${target.name}.`);
  }

  /**
   * Khởi tạo vòng hỏi Hóa Giải (Negate Chain) theo vòng kim đồng hồ
   */
  static _startNegateChain(state, sourceId, targets, card, extraArgs) {
    const alivePlayers = state.getAlivePlayers();
    const sourceIdx = alivePlayers.findIndex(p => p.id === sourceId);

    const priorityQueue = [];
    for (let i = 0; i < alivePlayers.length; i++) {
      const idx = (sourceIdx + i) % alivePlayers.length;
      priorityQueue.push(alivePlayers[idx].id);
    }

    state.priorityStack.push({
      type: 'ASK_NEGATE',
      sourceId,
      targetId: targets[0] ?? null,
      priorityQueue,
      context: {
        card,
        targets,
        extraArgs,
        negateCount: 0 // Số lần Hóa Giải được kích hoạt liên tiếp
      }
    });
  }

  /**
   * Phản hồi Hóa Giải từ người chơi
   */
  static respondNegate(state, rescuerId, negateCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_NEGATE') {
      throw new Error(`[TrickRules] Không có yêu cầu Hóa Giải nào đang chờ!`);
    }

    const player = state.getPlayer(rescuerId);

    if (negateCard) {
      // Người chơi dùng Hóa Giải
      if (player.hand && player.hand.some(c => c.id === negateCard.id)) {
        state.discardFromHand(rescuerId, [negateCard.id]);
      } else {
        // Rút từ trang bị (kỹ năng Chương Dương của Trần Quang Khải)
        for (const slot in player.equipment) {
          if (player.equipment[slot]?.id === negateCard.id) {
            player.equipment[slot] = null;
            state.discardPile.push(negateCard);
            state.addLog(`🛡️ [Chương Dương] ${player.name} tháo trang bị [${negateCard.name}] làm [Hóa Giải]!`);
            globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: rescuerId, card: negateCard }, state);
            break;
          }
        }
      }
      frame.context.negateCount += 1;
      state.addLog(`🛡️ ${player.name} sử dụng [Hóa Giải]! (Chuỗi: ${frame.context.negateCount})`);

      // Reset lại vòng hỏi để người khác có cơ hội Hóa Giải lá Hóa Giải vừa rồi
      const alivePlayers = state.getAlivePlayers();
      const pIdx = alivePlayers.findIndex(p => p.id === rescuerId);
      frame.priorityQueue = [];
      for (let i = 0; i < alivePlayers.length; i++) {
        const idx = (pIdx + i) % alivePlayers.length;
        frame.priorityQueue.push(alivePlayers[idx].id);
      }
      frame.currentActorId = frame.priorityQueue[0];
      return { negated: true, chainActive: true };
    } else {
      // Người chơi này không dùng Hóa Giải -> Chuyển người tiếp theo
      const nextActor = frame.nextActor();
      if (nextActor === null) {
        // Hết vòng hỏi Hóa Giải!
        const finalNegateCount = frame.context.negateCount;
        const card = frame.context.card;
        const targets = frame.context.targets;
        const sourceId = frame.sourceId;
        const extraArgs = frame.context.extraArgs;

        state.priorityStack.pop(); // Giải phóng frame ASK_NEGATE

        if (finalNegateCount % 2 === 1) {
          // Số Hóa Giải là lẻ -> Cẩm nang bị HỦY HOÀN TOÀN
          state.addLog(`❌ Cẩm nang [${card.name}] đã bị [Hóa Giải] vô hiệu hóa thành công!`);
          return { negated: true, resolved: true };
        } else {
          // Không bị hóa giải (hoặc bị hóa giải chẵn lần) -> THỰC THI HIỆU ỨNG CẨM NANG!
          state.addLog(`⚡ Cẩm nang [${card.name}] có hiệu lực!`);
          this._executeTrickEffect(state, sourceId, targets, card, extraArgs);
          return { negated: false, resolved: true };
        }
      }

      return { nextActorId: nextActor };
    }
  }

  /**
   * Thực thi hiệu ứng cụ thể của từng loại Cẩm nang
   */
  static _executeTrickEffect(state, sourceId, targets, card, extraArgs) {
    const nameMap = {
      'Quyết Đấu': 'quyet_dau',
      'Cướp Bài': 'cuop_bai',
      'Tước Bài': 'tuoc_bai',
      'Loạn Tiễn': 'loan_tien',
      'Vạn Tiễn Quy Tâm': 'loan_tien',
      'Dã Man': 'da_man',
      'Nam Man Xâm Nhập': 'da_man',
      'Hồi Xuân': 'hoi_xuan',
      'Đào Viên Kết Nghĩa': 'hoi_xuan',
      'Vô Trung Sinh Hữu': 'vo_trung_sinh_huu',
      'Sấm Sét': 'sam_set',
      'Hỗn Loạn': 'hon_loan',
      'Xiềng Xích': 'xieng_xich',
      'Mượn Đao': 'muon_dao',
      'Hỏa Công': 'hoa_cong',
      'Hỏa công': 'hoa_cong'
    };
    const key = extraArgs?.trickKey || nameMap[card.name] || card.idKey || (card.id ? card.id.replace(/-/g, '_').split('_')[0] : '');

    switch (key) {
      case 'quyet_dau': {
        const targetId = targets[0];
        // Đẩy Frame Quyết Đấu: Target phải ra Chém trước
        state.priorityStack.push({
          type: 'ASK_SLASH_DUEL',
          sourceId,
          targetId,
          currentActorId: targetId,
          priorityQueue: [targetId],
          context: {
            attackerId: sourceId,
            currentResponderId: targetId,
            reason: 'quyet-dau',
            trickType: 'duel'
          }
        });
        state.addLog(`⚔️ [Quyết Đấu] bắt đầu giữa ${state.getPlayer(sourceId).name} và ${state.getPlayer(targetId).name}!`);
        break;
      }

      case 'cuop_bai': {
        const targetId = targets[0];
        const target = state.getPlayer(targetId);
        const source = state.getPlayer(sourceId);
        let stolenCard = null;
        let fromZoneDesc = 'trên tay';

        if (extraArgs?.targetCardId) {
          const hIdx = target.hand.findIndex(c => c.id === extraArgs.targetCardId);
          if (hIdx !== -1) {
            [stolenCard] = target.hand.splice(hIdx, 1);
          } else {
            for (const slot of ['weapon', 'armor', 'horse_attack', 'horse_defense']) {
              if (target.equipment?.[slot]?.id === extraArgs.targetCardId) {
                stolenCard = target.equipment[slot];
                target.equipment[slot] = null;
                fromZoneDesc = `trang bị [${stolenCard.name}]`;
                if (stolenCard.name === 'Bạch Ngân' || stolenCard.id?.includes('bach_ngan')) {
                  target.hp = Math.min(target.maxHp, target.hp + 1);
                  state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${target.name}, hồi 1 HP!`);
                }
                break;
              }
            }
            if (!stolenCard && target.judgementArea) {
              const jIdx = target.judgementArea.findIndex(c => c.id === extraArgs.targetCardId);
              if (jIdx !== -1) {
                [stolenCard] = target.judgementArea.splice(jIdx, 1);
                fromZoneDesc = `khu phán xét [${stolenCard.name}]`;
              }
            }
          }
        } else {
          // Mặc định tự động chọn nếu không chỉ định ID cụ thể: Ưu tiên Hand -> Equipment -> JudgementArea
          if (target.hand.length > 0) {
            stolenCard = target.hand.pop();
          } else {
            const equipSlots = ['weapon', 'armor', 'horse_attack', 'horse_defense'].filter(s => target.equipment && target.equipment[s]);
            if (equipSlots.length > 0) {
              const slot = equipSlots[0];
              stolenCard = target.equipment[slot];
              target.equipment[slot] = null;
              fromZoneDesc = `trang bị [${stolenCard.name}]`;
              if (stolenCard.name === 'Bạch Ngân' || stolenCard.id?.includes('bach_ngan')) {
                target.hp = Math.min(target.maxHp, target.hp + 1);
                state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${target.name}, hồi 1 HP!`);
              }
            } else if (target.judgementArea && target.judgementArea.length > 0) {
              stolenCard = target.judgementArea.pop();
              fromZoneDesc = `khu phán xét [${stolenCard.name}]`;
            }
          }
        }

        if (stolenCard) {
          source.hand.push(stolenCard);
          state.addLog(`🤏 ${source.name} đã cướp 1 lá bài (${fromZoneDesc}) của ${target.name}.`);
          if (fromZoneDesc.startsWith('trang bị')) {
            globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId, card: stolenCard }, state);
          }
        }
        break;
      }

      case 'tuoc_bai': {
        const targetId = targets[0];
        const target = state.getPlayer(targetId);
        const source = state.getPlayer(sourceId);
        let removedCard = null;
        let fromZoneDesc = 'trên tay';

        if (extraArgs?.targetCardId) {
          const hIdx = target.hand.findIndex(c => c.id === extraArgs.targetCardId);
          if (hIdx !== -1) {
            [removedCard] = target.hand.splice(hIdx, 1);
          } else {
            for (const slot of ['weapon', 'armor', 'horse_attack', 'horse_defense']) {
              if (target.equipment?.[slot]?.id === extraArgs.targetCardId) {
                removedCard = target.equipment[slot];
                target.equipment[slot] = null;
                fromZoneDesc = `trang bị [${removedCard.name}]`;
                if (removedCard.name === 'Bạch Ngân' || removedCard.id?.includes('bach_ngan')) {
                  target.hp = Math.min(target.maxHp, target.hp + 1);
                  state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${target.name}, hồi 1 HP!`);
                }
                break;
              }
            }
            if (!removedCard && target.judgementArea) {
              const jIdx = target.judgementArea.findIndex(c => c.id === extraArgs.targetCardId);
              if (jIdx !== -1) {
                [removedCard] = target.judgementArea.splice(jIdx, 1);
                fromZoneDesc = `khu phán xét [${removedCard.name}]`;
              }
            }
          }
        } else {
          if (target.hand.length > 0) {
            removedCard = target.hand.pop();
          } else {
            const equipSlots = ['weapon', 'armor', 'horse_attack', 'horse_defense'].filter(s => target.equipment && target.equipment[s]);
            if (equipSlots.length > 0) {
              const slot = equipSlots[0];
              removedCard = target.equipment[slot];
              target.equipment[slot] = null;
              fromZoneDesc = `trang bị [${removedCard.name}]`;
              if (removedCard.name === 'Bạch Ngân' || removedCard.id?.includes('bach_ngan')) {
                target.hp = Math.min(target.maxHp, target.hp + 1);
                state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${target.name}, hồi 1 HP!`);
              }
            } else if (target.judgementArea && target.judgementArea.length > 0) {
              removedCard = target.judgementArea.pop();
              fromZoneDesc = `khu phán xét [${removedCard.name}]`;
            }
          }
        }

        if (removedCard) {
          state.discardPile.push(removedCard);
          state.addLog(`💥 ${source.name} đã tước 1 lá bài (${fromZoneDesc}) của ${target.name}.`);
          if (fromZoneDesc.startsWith('trang bị')) {
            globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId, card: removedCard }, state);
          }
        }
        break;
      }

      case 'loan_tien': {
        // Mọi người chơi khác phải đánh Né hoặc chịu 1 sát thương
        for (const tid of targets) {
          state.priorityStack.push({
            type: 'ASK_DODGE',
            sourceId,
            targetId: tid,
            currentActorId: tid,
            priorityQueue: [tid],
            context: {
              card,
              requiredDodges: 1,
              dodgesProvided: 0,
              damageAmount: 1,
              reason: 'van-tien',
              trickType: 'arrow_rain'
            }
          });
        }
        break;
      }

      case 'da_man': {
        // Mọi người chơi khác phải đánh Chém hoặc chịu 1 sát thương
        for (const tid of targets) {
          state.priorityStack.push({
            type: 'ASK_SLASH_RESPONSE',
            sourceId,
            targetId: tid,
            currentActorId: tid,
            priorityQueue: [tid],
            context: {
              card,
              damageAmount: 1,
              reason: 'nam-man',
              trickType: 'barbarian'
            }
          });
        }
        break;
      }

      case 'hoi_xuan': {
        // Toàn bộ người chơi bị thương hồi 1 HP
        for (const p of state.getAlivePlayers()) {
          if (p.hp < p.maxHp) {
            p.hp += 1;
            state.addLog(`🌸 [Hồi Xuân] hồi phục 1 HP cho ${p.name} (${p.hp}/${p.maxHp}).`);
          }
        }
        break;
      }

      case 'vo_trung_sinh_huu': {
        state.drawCards(sourceId, 2);
        state.addLog(`📜 ${state.getPlayer(sourceId).name} dùng [Vô Trung Sinh Hữu] rút 2 lá bài.`);
        break;
      }

      case 'xieng_xich': {
        if (!targets || targets.length === 0 || extraArgs?.reforge) {
          state.drawCards(sourceId, 1);
          state.addLog(`🔄 ${state.getPlayer(sourceId).name} [Rèn Lại] lá [Xiềng Xích], rút 1 lá bài mới.`);
        } else {
          for (const tid of targets) {
            const target = state.getPlayer(tid);
            if (target && target.isAlive) {
              target.isChained = !target.isChained;
              const statusStr = target.isChained ? 'bị KHÓA XÍCH ⛓️' : 'được THÁO XÍCH 🔓';
              state.addLog(`⛓️ [Xiềng Xích]: ${target.name} ${statusStr}.`);
            }
          }
        }
        break;
      }

      case 'muon_dao': {
        const targetAId = targets[0];
        const targetBId = targets[1] !== undefined ? targets[1] : (extraArgs?.secondTargetId ?? null);
        const targetA = state.getPlayer(targetAId);

        if (!targetA || !targetA.equipment?.weapon) {
          state.addLog(`🗡️ [Mượn Đao] thất bại: ${targetA?.name || 'Mục tiêu'} không có vũ khí trang bị!`);
          break;
        }

        state.priorityStack.push({
          type: 'ASK_BORROW_SLASH',
          sourceId,
          targetId: targetAId,
          currentActorId: targetAId,
          priorityQueue: [targetAId],
          context: {
            borrowerId: sourceId,
            targetBId: targetBId,
            weapon: targetA.equipment.weapon
          }
        });
        const targetBName = targetBId !== null ? state.getPlayer(targetBId)?.name : 'mục tiêu chỉ định';
        state.addLog(`🗡️ [Mượn Đao]: ${state.getPlayer(sourceId).name} ép ${targetA.name} phải [Chém] ${targetBName} hoặc giao nộp vũ khí [${targetA.equipment.weapon.name}]!`);
        break;
      }

      case 'hoa_cong': {
        const targetId = targets[0];
        const target = state.getPlayer(targetId);
        const source = state.getPlayer(sourceId);

        if (!target || !target.hand || target.hand.length === 0) {
          state.addLog(`🔥 [Hỏa Công] thất bại: ${target?.name || 'Mục tiêu'} không có bài trên tay!`);
          break;
        }

        // Mục tiêu để lộ 1 lá bài trên tay
        const revealedCard = target.hand[0];
        state.addLog(`👁️ [Hỏa Công]: ${target.name} để lộ lá bài [${revealedCard.name || revealedCard.id}] (Chất: ${revealedCard.suit || revealedCard.color}).`);

        // Người chơi Hỏa Công kiểm tra xem có bài cùng chất để phóng hỏa không
        const matchIdx = source.hand.findIndex(c => (c.suit && c.suit === revealedCard.suit) || (c.color && c.color === revealedCard.color));
        if (matchIdx !== -1) {
          const matchingCard = source.hand.splice(matchIdx, 1)[0];
          state.discardPile.push(matchingCard);
          state.addLog(`🔥 [Hỏa Công] phóng hỏa! ${source.name} bỏ lá bài [${matchingCard.name || matchingCard.id}] cùng chất, gây 1 sát thương Lửa lên ${target.name}!`);
          CombatRules.applyDamage(state, sourceId, targetId, 1, 'fire');
        } else {
          state.addLog(`💨 [Hỏa Công] không thành: ${source.name} không có lá bài cùng chất để kích hỏa.`);
        }
        break;
      }

      default:
        state.addLog(`Cẩm nang [${card.name}] đã kích hoạt.`);
        break;
    }
  }

  /**
   * Phản hồi yêu cầu Mượn Đao Giết Người
   */
  static respondBorrowSlash(state, targetAId, slashCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_BORROW_SLASH') {
      throw new Error(`[TrickRules] Không có yêu cầu Mượn Đao nào đang chờ!`);
    }

    if (frame.targetId !== targetAId) {
      throw new Error(`[TrickRules] Không phải lượt phản hồi Mượn Đao của người chơi ${targetAId}!`);
    }

    const { borrowerId, targetBId } = frame.context;
    const targetA = state.getPlayer(targetAId);
    const borrower = state.getPlayer(borrowerId);

    state.priorityStack.pop();

    if (slashCard && targetBId !== null && targetBId !== undefined) {
      const targetB = state.getPlayer(targetBId);
      state.addLog(`🗡️ ${targetA.name} đồng ý xuất [Chém] tấn công ${targetB?.name || 'mục tiêu'} theo lệnh Mượn Đao!`);
      CombatRules.playSlash(state, targetAId, targetBId, slashCard);
      return { slashed: true };
    } else {
      // Giao vũ khí cho Borrower
      const weaponCard = targetA.equipment?.weapon;
      if (weaponCard) {
        targetA.equipment.weapon = null;
        borrower.hand.push(weaponCard);
        state.addLog(`🗡️ ${targetA.name} không dùng Chém, bị ${borrower.name} tịch thu vũ khí [${weaponCard.name}]!`);
        return { surrenderedWeapon: true, weapon: weaponCard };
      }
      return { surrenderedWeapon: false };
    }
  }

  /**
   * Phản hồi trong trận Quyết Đấu (Duel)
   */
  static respondDuel(state, actorId, slashCard = null, data = {}) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_SLASH_DUEL') {
      throw new Error(`[TrickRules] Không có trận Quyết Đấu nào đang chờ!`);
    }

    const { attackerId, currentResponderId } = frame.context;
    if (actorId !== currentResponderId) {
      throw new Error(`[TrickRules] Không phải lượt đọ Chém của người chơi ${actorId}!`);
    }

    const responder = state.getPlayer(actorId);

    // Lạc Long Quân: Bọc Trăm Trứng (Hỏi đồng minh Lạc Chém thay)
    if (data.callBocTramTrung) {
      const isLLQ = globalHeroRegistry.hasSkill(responder, 'boc_tram_trung', true);
      const lacAllies = state.getAlivePlayers().filter(p => p.id !== responder.id && p.faction === 'lac');
      if (isLLQ && lacAllies.length > 0) {
        state.addLog(`🐉 [Bọc Trăm Trứng] ${responder.name} kêu gọi đồng minh hệ Lạc ra [Chém] giùm trong Quyết Đấu!`);
        state.priorityStack.push({
          type: 'ASK_BOC_TRAM_TRUNG_SLASH',
          sourceId: responder.id,
          targetId: responder.id,
          currentActorId: lacAllies[0].id,
          priorityQueue: [lacAllies[0].id],
          context: {
            reason: 'boc_tram_trung_slash',
            allies: lacAllies.map(p => p.id),
            allyIndex: 0
          }
        });
        return { calledAllies: true };
      }
    }

    if (slashCard) {
      // Đánh ra Chém hợp lệ -> Đổi lượt sang người kia
      state.discardFromHand(actorId, [slashCard.id]);
      state.addLog(`${responder.name} đánh ra [Chém] trong Quyết Đấu!`);

      const nextId = actorId === attackerId ? frame.targetId : attackerId;
      frame.context.currentResponderId = nextId;
      frame.currentActorId = nextId;
      frame.priorityQueue = [nextId];
      return { continued: true, nextPlayerId: nextId };
    } else {
      // Người chơi này không có Chém -> THUA CUỘC VÀ NHẬN 1 SÁT THƯƠNG
      const winnerId = actorId === attackerId ? frame.targetId : attackerId;
      state.priorityStack.pop();
      state.addLog(`💥 ${responder.name} không có Chém, thua cuộc trong trận Quyết Đấu!`);
      CombatRules.applyDamage(state, winnerId, actorId, 1, 'duel');
      return { continued: false, loserId: actorId };
    }
  }

  /**
   * Phản hồi trong đợt công kích Dã Man Xâm Nhập (Nam Man)
   */
  static respondBarbarian(state, targetId, slashCard = null, data = {}) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_SLASH_RESPONSE') {
      throw new Error(`[TrickRules] Không có yêu cầu đỡ Dã Man nào đang chờ!`);
    }

    const target = state.getPlayer(targetId);

    // Lạc Long Quân: Bọc Trăm Trứng (Hỏi đồng minh Lạc Chém thay cản Dã Man)
    if (data.callBocTramTrung) {
      const isLLQ = globalHeroRegistry.hasSkill(target, 'boc_tram_trung', true);
      const lacAllies = state.getAlivePlayers().filter(p => p.id !== target.id && p.faction === 'lac');
      if (isLLQ && lacAllies.length > 0) {
        state.addLog(`🐉 [Bọc Trăm Trứng] ${target.name} kêu gọi đồng minh hệ Lạc ra [Chém] giùm cản Dã Man!`);
        state.priorityStack.push({
          type: 'ASK_BOC_TRAM_TRUNG_SLASH',
          sourceId: target.id,
          targetId: target.id,
          currentActorId: lacAllies[0].id,
          priorityQueue: [lacAllies[0].id],
          context: {
            reason: 'boc_tram_trung_slash',
            allies: lacAllies.map(p => p.id),
            allyIndex: 0,
            isDefensive: true
          }
        });
        return { calledAllies: true };
      }
    }

    state.priorityStack.pop();

    if (slashCard) {
      state.discardFromHand(targetId, [slashCard.id]);
      state.addLog(`${target.name} đánh ra lá [Chém] để cản [Dã Man]!`);
      return { defended: true };
    } else {
      const damageAmount = frame.context?.damageAmount || 1;
      state.addLog(`💥 ${target.name} không có Chém, chịu ${damageAmount} sát thương từ [Dã Man]!`);
      CombatRules.applyDamage(state, frame.sourceId, targetId, damageAmount, 'barbarian');
      return { defended: false };
    }
  }

  // Backward-compatible static helper methods
  static playDuel(state, sourceId, targetId, card) {
    return this.playTrick(state, sourceId, [targetId], card);
  }

  static playDismantle(state, sourceId, targetId, card) {
    return this.playTrick(state, sourceId, [targetId], card);
  }

  static playSteal(state, sourceId, targetId, card) {
    return this.playTrick(state, sourceId, [targetId], card);
  }

  static playArrowRain(state, sourceId, card) {
    const targets = state.getAlivePlayers().filter(p => p.id !== sourceId).map(p => p.id);
    return this.playTrick(state, sourceId, targets, card);
  }

  static playBarbarian(state, sourceId, card) {
    const targets = state.getAlivePlayers().filter(p => p.id !== sourceId).map(p => p.id);
    return this.playTrick(state, sourceId, targets, card);
  }

  static playPeachGarden(state, sourceId, card) {
    const targets = state.getAlivePlayers().map(p => p.id);
    return this.playTrick(state, sourceId, targets, card);
  }

  static playLightning(state, sourceId, card) {
    return this.playTrick(state, sourceId, [sourceId], card);
  }

  static playChaos(state, sourceId, targetId, card) {
    return this.playTrick(state, sourceId, [targetId], card);
  }

  static playIronChain(state, sourceId, targetIds = [], card, extraArgs = {}) {
    return this.playTrick(state, sourceId, targetIds, card, extraArgs);
  }

  static playBorrowSword(state, sourceId, targetAId, targetBId, card) {
    const targetA = state.getPlayer(targetAId);
    if (!targetA || !targetA.equipment?.weapon) {
      throw new Error(`[TrickRules] Mục tiêu ${targetA?.name || targetAId} không có vũ khí để mượn đao!`);
    }
    if (targetBId !== null && targetBId !== undefined) {
      const canAttack = RangeSystem.canAttack(state, targetAId, targetBId);
      if (!canAttack) {
        throw new Error(`[TrickRules] Mục tiêu bị Chém nằm ngoài tầm đánh của người cho mượn đao!`);
      }
    }
    return this.playTrick(state, sourceId, [targetAId, targetBId], card, { secondTargetId: targetBId });
  }

  /**
   * Xử lý toàn bộ cẩm nang trong khu phán xét của người chơi (Sấm Sét, Hỗn Loạn)
   */
  static resolveJudgementPhase(state, playerId) {
    const player = state.getPlayer(playerId);
    if (!player || !player.judgementArea || player.judgementArea.length === 0) {
      return;
    }

    // Xử lý lần lượt từng lá bài (LIFO: lá đặt vào sau cùng được xử lý trước)
    while (player.judgementArea.length > 0 && player.isAlive) {
      const delayedCard = player.judgementArea.pop();
      const cardKey = delayedCard.idKey || (delayedCard.name === 'Sấm Sét' ? 'sam_set' : (delayedCard.name === 'Hỗn Loạn' ? 'hon_loan' : delayedCard.id));

      state.addLog(`⚖️ Bắt đầu phán xét [${delayedCard.name}] cho ${player.name}...`);

      // Lật bài phán xét từ đầu drawPile
      const judgeCard = state.drawCardFromDeck();
      if (!judgeCard) {
        state.addLog(`Không còn bài để phán xét! Bỏ qua [${delayedCard.name}].`);
        state.discardPile.push(delayedCard);
        continue;
      }

      // Kiểm tra xem có người chơi nào có kỹ năng đổi phán xét (Mạc Đĩnh Chi - Ứng Biến, Đinh Điền - Quân Cơ)
      const candidateIds = state.players
        .filter(p => p.isAlive && p.hand && p.hand.length > 0 && (
          globalHeroRegistry.hasSkill(p, 'ung_bien', true) ||
          globalHeroRegistry.hasSkill(p, 'quan_co', true)
        ))
        .map(p => p.id);

      if (candidateIds.length > 0) {
        state.priorityStack.push({
          type: 'ASK_CHANGE_JUDGE',
          sourceId: player.id,
          targetId: player.id,
          priorityQueue: candidateIds,
          currentActorId: candidateIds[0],
          context: {
            delayedCard,
            judgeCard,
            reason: cardKey,
            candidateIds,
            candidateIndex: 0
          }
        });
        return; // Dừng lại chờ phản hồi từ người đổi phán xét
      }

      // Không có ai đổi bài -> Xử lý kết quả phán xét trực tiếp
      this._finalizeDelayedJudgement(state, player, delayedCard, judgeCard);
    }
  }

  /**
   * Phản hồi đổi bài phán xét (Mạc Đĩnh Chi - Ứng Biến, Đinh Điền - Quân Cơ)
   */
  static respondChangeJudge(state, responderId, replaceCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_CHANGE_JUDGE') {
      throw new Error(`[TrickRules] Không có yêu cầu đổi phán xét nào đang chờ!`);
    }

    const responder = state.getPlayer(responderId);
    const { delayedCard, candidateIds, candidateIndex = 0 } = frame.context;
    let finalJudgeCard = frame.context.judgeCard;
    const player = state.getPlayer(frame.targetId);

    if (replaceCard) {
      state.priorityStack.pop();
      responder.hand = responder.hand.filter(c => c.id !== replaceCard.id);
      state.discardPile.push(finalJudgeCard);
      finalJudgeCard = replaceCard;
      const skillName = globalHeroRegistry.hasSkill(responder, 'ung_bien', true) ? 'Ứng Biến' : 'Quân Cơ';
      state.addLog(`☯️ [${skillName}] ${responder.name} đánh ra lá [${replaceCard.name} ${replaceCard.suit || ''}] thay thế lá phán xét!`);
      this._finalizeDelayedJudgement(state, player, delayedCard, finalJudgeCard);
      return { changed: true, newCard: replaceCard };
    } else {
      // Bỏ qua / Từ chối đổi -> Chuyển sang candidate tiếp theo nếu có
      const nextIdx = candidateIndex + 1;
      if (nextIdx < candidateIds.length) {
        frame.context.candidateIndex = nextIdx;
        const nextId = candidateIds[nextIdx];
        frame.currentActorId = nextId;
        frame.priorityQueue = [nextId];
        return { continued: true, nextPlayerId: nextId };
      } else {
        // Hết người muốn đổi -> Chốt phán xét với lá ban đầu
        state.priorityStack.pop();
        this._finalizeDelayedJudgement(state, player, delayedCard, finalJudgeCard);
        return { changed: false, finalCard: finalJudgeCard };
      }
    }
  }

  /**
   * Thực thi kết quả phán xét cuối cùng cho Cẩm nang Trì hoãn
   */
  static _finalizeDelayedJudgement(state, player, delayedCard, judgeCard) {
    const cardKey = delayedCard.idKey || (delayedCard.name === 'Sấm Sét' ? 'sam_set' : (delayedCard.name === 'Hỗn Loạn' ? 'hon_loan' : delayedCard.id));
    state.discardPile.push(judgeCard);

    // Kích hoạt phản ứng phán xét (Ngọc Hân Công Chúa - Thông Ngôn...)
    globalHeroRegistry.dispatchTrigger('ON_JUDGED', { targetId: player.id, judgeCard }, state);

    if (cardKey === 'sam_set') {
      const isSpade = judgeCard.suit === 'spade' || judgeCard.suit === '♠';
      const rank = typeof judgeCard.rank === 'number' ? judgeCard.rank : parseInt(judgeCard.rank, 10);
      const isExploded = isSpade && rank >= 2 && rank <= 9;

      if (isExploded) {
        state.addLog(`🌩️⚡ [Sấm Sét] NỔ TRÚNG ${player.name} (${judgeCard.name} chất Bích ${rank})! Nhận 3 sát thương lôi hỏa!`);
        state.discardPile.push(delayedCard);
        CombatRules.applyDamage(state, null, player.id, 3, 'lightning');
      } else {
        state.addLog(`⚡ [Sấm Sét] Không nổ (${judgeCard.name} ${judgeCard.suit} ${judgeCard.rank || ''})! Chuyển cẩm nang sang người chơi còn sống kế tiếp.`);
        const alive = state.getAlivePlayers();
        const currIdx = alive.findIndex(p => p.id === player.id);
        const nextPlayer = alive[(currIdx + 1) % alive.length];
        nextPlayer.judgementArea = nextPlayer.judgementArea || [];
        nextPlayer.judgementArea.push(delayedCard);
      }
    } else if (cardKey === 'hon_loan') {
      const isHeart = judgeCard.suit === 'heart' || judgeCard.suit === '♥' || (judgeCard.color === 'red' && judgeCard.suit !== 'diamond' && judgeCard.suit !== '♦');
      state.discardPile.push(delayedCard);

      if (!isHeart) {
        state.addLog(`🌀 [Hỗn Loạn] Phán xét KHÔNG PHẢI CƠ (${judgeCard.name} chất ${judgeCard.suit || judgeCard.color})! ${player.name} bị mất Giai đoạn Ra bài!`);
        player.temporaryFlags = player.temporaryFlags || {};
        player.temporaryFlags.skipActionPhase = true;
      } else {
        state.addLog(`✨ [Hỗn Loạn] Phán xét ra CƠ (${judgeCard.name})! ${player.name} thoát khỏi Hỗn Loạn thành công.`);
      }
    } else {
      state.discardPile.push(delayedCard);
    }
  }

  /**
   * Cẩm nang Hỏa Công (Fire Attack)
   */
  static playFireAttack(state, sourceId, targetId, card) {
    const target = state.getPlayer(targetId);
    if (!target || !target.hand || target.hand.length === 0) {
      throw new Error(`[TrickRules] Mục tiêu không có bài trên tay để thực hiện Hỏa Công!`);
    }
    this.playTrick(state, sourceId, [targetId], card, { trickKey: 'hoa_cong' });
  }
}
