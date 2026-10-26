/**
 * TrickRules.js
 * Quản lý Toàn Bộ 10 Lá Bài Cẩm Nang & Chuỗi Hóa Giải (Negate Chain) trong Việt Sát v4.
 * Tích hợp chặt chẽ với PriorityStack và GameInvariants.
 */

import { RangeSystem } from './RangeSystem.js';
import { CombatRules } from './CombatRules.js';
import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { 
  normalizeSuit, 
  getSuitColor, 
  isSameSuit, 
  isEquip, 
  normalizeCardKey, 
  isTrick, 
  isDelayedTrick, 
  isAOETrick, 
  isBasicCard 
} from '../../utils/translationHelper.js';
import { GameInvariants } from '../core/Invariants.js';

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

    if (!isAOETrick(card)) {
      for (const tId of targets) {
        const t = state.getPlayer(tId);
        if (t && t.isAlive && t.hp <= 0) {
          throw new Error(`[TrickRules] Mục tiêu ${t.name} đang trong trạng thái Hấp Hối (HP: ${t.hp}), không thể trở thành mục tiêu của Cẩm nang!`);
        }
      }
    }

    // 0. Kiểm tra Đạm Bạc (Lang Liêu) nếu là Quyết Đấu
    if ((isTrick(card, 'quyet_dau') || card.type === 'duel') && targets.length > 0) {
      const target = state.getPlayer(targets[0]);
      if (target && globalHeroRegistry.hasSkill(target, 'dam_bac', true) && (!target.hand || target.hand.length === 0)) {
        throw new Error(`[TrickRules] ${target.name} đang kích hoạt [Đạm Bạc] (hết bài trên tay), không thể bị Quyết Đấu!`);
      }
    }

    // 0b. Kiểm tra Nghệ An Kế (Nguyễn Chích) nếu là Cướp Bài
    if (!extraArgs?.isIronChain && isTrick(card, 'cuop_bai') && targets.length > 0) {
      const target = state.getPlayer(targets[0]);
      if (target && (globalHeroRegistry.hasSkill(target, 'nghe_an_ke', true) || target.skills?.includes('nghe_an_ke'))) {
        throw new Error(`[Nghệ An Kế] ${target.name} không thể trở thành mục tiêu của [Cướp Bài]!`);
      }
    }

    // 1. Phân loại Cẩm nang thường vs Cẩm nang Trì hoãn (Sấm Sét, Hỗn Loạn, Binh Lương Thốn Đoạn)
    const isDelayed = isDelayedTrick(card);
    if (isDelayed) {
      return this._playDelayedTrick(state, sourceId, targets[0] ?? sourceId, card);
    }

    // 2. Trừ lá bài trên tay vào discardPile cho cẩm nang thông thường
    state.discardFromHand(sourceId, [card.id]);
    state.addLog(`${source.name} sử dụng cẩm nang [${card.name}].`);

    // Kích hoạt kỹ năng phản ứng khi sử dụng Cẩm nang (Tiên Dung - Duyên Tiên...)
    globalHeroRegistry.dispatchTrigger('ON_TRICK_PLAYED', { sourceId, targetIds: targets, card }, state);

    // 3. Kiểm tra Xiềng Xích Rèn Lại (Reforge): Bỏ lá bài rút 1 lá mới, không mở hỏi Hóa Giải
    const isXiengXich = isTrick(card, 'xieng_xich') || extraArgs.isIronChain || extraArgs.reforge;
    const isReforge = isXiengXich && (extraArgs.reforge || !targets || targets.length === 0);

    if (isReforge) {
      state.drawCards(sourceId, 1);
      state.addLog(`🔄 ${source.name} chọn [Rèn Lại] lá [Xiềng Xích], rút 1 lá bài mới.`);
      return;
    }

    // 3.5. Cẩm nang Toàn Bàn (AOE: Loạn Tiễn, Dã Man, Hồi Xuân):
    // Theo quy tắc Việt Sát / Tam Quốc Sát: Hóa Giải chỉ hóa giải đơn thể (không có Hóa Giải Vương).
    // Do đó cẩm nang AOE không thể bị hủy toàn bàn, mà thực thi ngay; mỗi cá nhân mục tiêu được Hóa Giải độc lập.
    const isAOE = isAOETrick(card);

    if (isAOE) {
      state.addLog(`⚡ Cẩm nang toàn bàn [${card.name}] có hiệu lực!`);
      this._executeTrickEffect(state, sourceId, targets, card, extraArgs);
      return;
    }

    // 4. Mở vòng hỏi Hóa Giải (Negate Chain) cho Cẩm nang đơn thể / có mục tiêu
    this._startNegateChain(state, sourceId, targets, card, extraArgs);
  }

  /**
   * Kiểm tra xem trên bàn chơi có bất kỳ ai sở hữu lá bài hoặc kỹ năng Hóa Giải không
   */
  static hasAnyNegatePlayer(state) {
    if (!state || !state.players) return false;
    return state.players.some(p => {
      if (!p.isAlive) return false;
      // Lá Hóa Giải trên tay
      if (p.hand && p.hand.some(c => isTrick(c, 'hoa_giai'))) {
        return true;
      }
      // Kỹ năng Linh Giám: bài đen dùng làm Hóa Giải
      if (globalHeroRegistry.hasSkill(p, 'linh_giam', true) || p.skills?.includes('linh_giam')) {
        if (p.hand && p.hand.some(c => {
          const col = globalHeroRegistry.getEffectiveColor(p, c);
          return col ? col === 'black' : Boolean(c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
        })) {
          return true;
        }
      }
      // Kỹ năng Chương Dương: trang bị dùng làm Hóa Giải
      if (globalHeroRegistry.hasSkill(p, 'chuong_duong', true) || p.skills?.includes('chuong_duong')) {
        const hasEquip = p.equipment && (Array.isArray(p.equipment) ? p.equipment.length > 0 : Object.values(p.equipment).some(Boolean));
        if (hasEquip) return true;
      }
      return false;
    });
  }

  /**
   * Cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn, Binh Lương Thốn Đoạn)
   */
  static _playDelayedTrick(state, sourceId, targetId, card, options = {}) {
    const target = state.getPlayer(targetId);
    if (!target) {
      throw new Error(`[TrickRules] Không tìm thấy mục tiêu ${targetId} cho cẩm nang trì hoãn!`);
    }

    target.judgementArea = target.judgementArea || [];
    if (target.judgementArea.some(c => normalizeCardKey(c) === normalizeCardKey(card))) {
      throw new Error(`[TrickRules] Mục tiêu đã có cẩm nang trì hoãn này trong khu phán xét!`);
    }

    if (isTrick(card, 'hon_loan') && (globalHeroRegistry.hasSkill(target, 'nghe_an_ke', true) || target.skills?.includes('nghe_an_ke'))) {
      throw new Error(`[Nghệ An Kế] ${target.name} không thể trở thành mục tiêu của [Hỗn Loạn]!`);
    }

    // Chuyển trực tiếp từ tay người chơi
    const source = state.getPlayer(sourceId);
    source.hand = source.hand.filter(c => c.id !== card.id);
    state.addLog(`${source.name} sử dụng cẩm nang trì hoãn [${card.name}] lên ${target.name}.`);

    // Mở vòng hỏi Hóa Giải nếu có người chơi sở hữu Hóa Giải trên bàn
    const canNegate = !options.skipNegate && this.hasAnyNegatePlayer(state);
    if (canNegate) {
      this._startNegateChain(state, sourceId, [targetId], card, { isDelayedTrick: true, delayedTargetId: targetId });
      return;
    }

    // Không ai có Hóa Giải -> Đặt trực tiếp vào khu phán xét của mục tiêu
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
        ...extraArgs,
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
            if (negateCard.name === 'Bạch Ngân' || negateCard.name === 'Bạch Ngân Sư Tử' || isEquip(negateCard, 'bach_ngan') || negateCard.idKey === 'bach_ngan' || negateCard.id?.includes('bach_ngan')) {
              player.hp = Math.min(player.maxHp, player.hp + 1);
              state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${player.name}, hồi 1 HP!`);
            }
            globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: rescuerId, card: negateCard }, state);
            break;
          }
        }
      }
      frame.context.negateCount += 1;
      frame.context.lastNegaterId = rescuerId;
      state.addLog(`🛡️ ${player.name} sử dụng [Hóa Giải]! (Chuỗi: ${frame.context.negateCount})`);

      // Reset lại vòng hỏi để người khác có cơ hội Hóa Giải lá Hóa Giải vừa rồi (loại trừ chính người vừa Hóa Giải)
      const alivePlayers = state.getAlivePlayers();
      const pIdx = alivePlayers.findIndex(p => p.id === rescuerId);
      frame.priorityQueue = [];
      for (let i = 1; i < alivePlayers.length; i++) {
        const idx = (pIdx + i) % alivePlayers.length;
        frame.priorityQueue.push(alivePlayers[idx].id);
      }
      if (frame.priorityQueue.length > 0) {
        frame.currentActorId = frame.priorityQueue[0];
        GameInvariants.assertNoSelfNegate(frame, frame.currentActorId);
        GameInvariants.assertNoPriorityQueueDeadlock(frame);
        return { negated: true, chainActive: true };
      } else {
        return this.respondNegate(state, rescuerId, null);
      }
    } else {
      // Người chơi này không dùng Hóa Giải -> Chuyển người tiếp theo
      const nextActor = frame.nextActor();
      if (nextActor !== null) {
        GameInvariants.assertNoSelfNegate(frame, frame.currentActorId);
      }
      if (nextActor === null) {
        // Hết vòng hỏi Hóa Giải!
        const finalNegateCount = frame.context.negateCount;
        const card = frame.context.card;
        const targets = frame.context.targets;
        const sourceId = frame.sourceId;
        const extraArgs = frame.context.extraArgs;

        state.priorityStack.pop(); // Giải phóng frame ASK_NEGATE

        // 1. Cẩm nang phán xét trong Judge Phase
        if (frame.context.isJudgementNegate) {
          const delayedCard = frame.context.delayedCard;
          const player = state.getPlayer(frame.targetId);

          if (finalNegateCount % 2 === 1) {
            state.discardPile.push(delayedCard);
            state.addLog(`🛡️ [${delayedCard.name}] đã bị [Hóa Giải] vô hiệu hóa thành công, hủy bỏ phán xét!`);
            if (player && player.judgementArea && player.judgementArea.length > 0) {
              this.resolveJudgementPhase(state, player.id, { interactiveRoll: frame.context.interactiveRoll });
            }
            return { negated: true, resolved: true };
          } else {
            if (frame.context.interactiveRoll) {
              state.priorityStack.push({
                type: 'ASK_JUDGEMENT_ROLL',
                sourceId: player.id,
                targetId: player.id,
                currentActorId: player.id,
                context: {
                  delayedCard,
                  cardKey: normalizeCardKey(delayedCard),
                  cardName: delayedCard.name,
                  interactiveRoll: true
                }
              });
              return { negated: false, resolved: false };
            }
            this._executeJudgementRoll(state, player, delayedCard, false);
            return { negated: false, resolved: true };
          }
        }

        // 2. Cẩm nang trì hoãn khi được đánh ra bàn
        if (extraArgs?.isDelayedTrick) {
          const target = state.getPlayer(extraArgs.delayedTargetId);
          if (finalNegateCount % 2 === 1) {
            state.discardPile.push(card);
            state.addLog(`❌ Cẩm nang trì hoãn [${card.name}] đã bị [Hóa Giải] vô hiệu hóa thành công!`);
            return { negated: true, resolved: true };
          } else {
            if (target && target.isAlive) {
              target.judgementArea = target.judgementArea || [];
              target.judgementArea.push(card);
              state.addLog(`[${card.name}] được đặt vào khu phán xét của ${target.name}.`);
            } else {
              state.discardPile.push(card);
            }
            return { negated: false, resolved: true };
          }
        }

        // 3. Cẩm nang thông thường
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
    const key = extraArgs?.trickKey || (extraArgs?.isIronChain ? 'xieng_xich' : null) || nameMap[card.name] || card.idKey || (card.id ? card.id.replace(/-/g, '_').split('_')[0] : '');

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

        const hasCards = (target.hand && target.hand.length > 0) ||
          Object.values(target.equipment || {}).some(Boolean) ||
          (target.judgementArea && target.judgementArea.length > 0);

        if (!hasCards) {
          state.addLog(`⚠️ ${target.name} không có bất kỳ lá bài nào để cướp!`);
          break;
        }

        if (extraArgs?.targetCardId) {
          this.resolveSteal(state, sourceId, targetId, extraArgs.targetCardId);
          break;
        }

        // Với Người chơi thật (Human khi chơi qua Dispatcher có cờ interactive: true) -> Mở popup chọn bài như v3
        if (extraArgs?.interactive && state.priorityStack && typeof state.priorityStack.push === 'function') {
          state.priorityStack.push({
            type: 'ASK_SNATCH',
            sourceId,
            targetId,
            currentActorId: sourceId,
            priorityQueue: [sourceId],
            context: {
              trickType: 'snatch',
              card,
              targetId
            }
          });
        } else {
          this.resolveSteal(state, sourceId, targetId, null);
        }
        break;
      }

      case 'tuoc_bai': {
        const targetId = targets[0];
        const target = state.getPlayer(targetId);
        const source = state.getPlayer(sourceId);

        const hasCards = (target.hand && target.hand.length > 0) ||
          Object.values(target.equipment || {}).some(Boolean) ||
          (target.judgementArea && target.judgementArea.length > 0);

        if (!hasCards) {
          state.addLog(`⚠️ ${target.name} không có bất kỳ lá bài nào để tước!`);
          break;
        }

        if (extraArgs?.targetCardId) {
          this.resolveDismantle(state, sourceId, targetId, extraArgs.targetCardId);
          break;
        }

        // Với Người chơi thật (Human khi chơi qua Dispatcher có cờ interactive: true) -> Mở popup chọn bài như v3
        if (extraArgs?.interactive && state.priorityStack && typeof state.priorityStack.push === 'function') {
          state.priorityStack.push({
            type: 'ASK_DISMANTLE',
            sourceId,
            targetId,
            currentActorId: sourceId,
            priorityQueue: [sourceId],
            context: {
              trickType: 'dismantle',
              card,
              targetId
            }
          });
        } else {
          this.resolveDismantle(state, sourceId, targetId, null);
        }
        break;
      }

      case 'loan_tien': {
        // Mọi người chơi khác phải đánh Né hoặc chịu 1 sát thương
        // Vì PriorityStack là cấu trúc LIFO, để giải quyết theo đúng chiều kim đồng hồ (người kề bên trước tiên),
        // ta đẩy các frame vào stack theo thứ tự đảo ngược (reverse).
        const vanTienAoe = {
          trickName: 'Vạn Tiễn',
          defended: [],
          damaged: [],
          total: targets.length
        };
        const reversedTargets = [...targets].reverse();
        for (const tid of reversedTargets) {
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
              trickType: 'arrow_rain',
              aoeResult: vanTienAoe
            }
          });
        }
        break;
      }

      case 'da_man': {
        // Mọi người chơi khác phải đánh Chém hoặc chịu 1 sát thương
        // Đẩy theo thứ tự đảo ngược để giải quyết theo đúng chiều kim đồng hồ
        const daManAoe = {
          trickName: 'Dã Man',
          defended: [],
          damaged: [],
          total: targets.length
        };
        const reversedTargets = [...targets].reverse();
        for (const tid of reversedTargets) {
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
              trickType: 'barbarian',
              aoeResult: daManAoe
            }
          });
        }
        break;
      }

      case 'hoi_xuan': {
        // Toàn bộ người chơi bị thương hồi 1 HP theo đúng chiều kim đồng hồ
        const effectiveTargets = (targets && targets.length > 0) ? targets : state.getAlivePlayers().map(p => p.id);
        for (const tid of effectiveTargets) {
          const p = state.getPlayer(tid);
          if (p && p.isAlive && p.hp < p.maxHp) {
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

        // Đẩy Frame 1: ASK_HOACONG_REVEAL cho mục tiêu chọn 1 lá bài để lộ
        state.priorityStack.push({
          type: 'ASK_HOACONG_REVEAL',
          sourceId,
          targetId,
          currentActorId: targetId,
          priorityQueue: [targetId],
          context: {
            sourceId,
            targetId,
            trickCard: card
          }
        });
        state.addLog(`🔥 [Hỏa Công]: ${source.name} sử dụng [Hỏa Công] lên ${target.name}, yêu cầu ${target.name} để lộ 1 lá bài trên tay...`);
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
      CombatRules.playSlash(state, targetAId, targetBId, slashCard, { isRedirected: true });
      return { slashed: true };
    } else {
      // Giao vũ khí cho Borrower
      const weaponCard = targetA.equipment?.weapon;
      if (weaponCard) {
        targetA.equipment.weapon = null;
        borrower.hand.push(weaponCard);
        globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: targetA.id, card: weaponCard }, state);
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
      const lacAllies = state.getAlivePlayers().filter(p =>
        p.id !== responder.id &&
        !p.isDaTam &&
        (p.revealedHeroes ? p.revealedHeroes.some(Boolean) : p.isRevealed !== false) &&
        (p.faction === 'lac' || p.faction === 'Lạc')
      );
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
      const winnerId = actorId === attackerId ? frame.targetId : attackerId;
      const winner = state.getPlayer(winnerId);
      const bonusDamage = winner?.temporaryFlags?.bonusDamage || 0;
      state.priorityStack.pop();
      state.addLog(`💥 ${responder.name} không có Chém, thua cuộc trong trận Quyết Đấu!`);
      CombatRules.applyDamage(state, winnerId, actorId, 1 + bonusDamage, 'duel');
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
      const lacAllies = state.getAlivePlayers().filter(p =>
        p.id !== target.id &&
        !p.isDaTam &&
        (p.revealedHeroes ? p.revealedHeroes.some(Boolean) : p.isRevealed !== false) &&
        (p.faction === 'lac' || p.faction === 'Lạc')
      );
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

    const aoe = frame.context?.aoeResult;
    let result;

    if (slashCard) {
      const isNegate = isTrick(slashCard, 'hoa_giai') ||
        slashCard.virtualCardName === 'Hóa Giải' || data?.virtualCardName === 'Hóa Giải' || data?.activeSkill === 'Linh Giám' || data?.asNegate;
      state.discardFromHand(targetId, [slashCard.id]);
      if (isNegate) {
        state.addLog(`🛡️ ${target.name} dùng lá [Hóa Giải] hóa giải thành công đợt [Dã Man] cho riêng mình!`);
        if (aoe) aoe.defended.push(`${target.name} (Hóa Giải)`);
        result = { defended: true, negatedSingle: true };
      } else {
        state.addLog(`${target.name} đánh ra lá [Chém] để cản [Dã Man]!`);
        if (aoe) aoe.defended.push(target.name);
        result = { defended: true };
      }
    } else {
      const damageAmount = frame.context?.damageAmount || 1;
      state.addLog(`💥 ${target.name} không có Chém, chịu ${damageAmount} sát thương từ [Dã Man]!`);
      if (aoe) aoe.damaged.push(target.name);
      CombatRules.applyDamage(state, frame.sourceId, targetId, damageAmount, 'barbarian');
      result = { defended: false };
    }

    if (aoe && (aoe.defended.length + aoe.damaged.length >= aoe.total)) {
      let summaryText = '';
      if (aoe.damaged.length === 0) {
        summaryText = `🏹 [Dã Man]: ${aoe.defended.join(', ')} đều dùng [Chém] cản đòn!`;
      } else if (aoe.defended.length === 0) {
        summaryText = `🏹 [Dã Man]: ${aoe.damaged.join(', ')} đều không có Chém, mất máu!`;
      } else {
        summaryText = `🏹 [Dã Man]: ${aoe.defended.join(', ')} dùng [Chém] cản; ${aoe.damaged.join(', ')} mất máu!`;
      }
      state.addLog(summaryText);
    }

    return result;
  }

  // Backward-compatible static helper methods
  static playDuel(state, sourceId, targetId, card) {
    return this.playTrick(state, sourceId, [targetId], card);
  }

  static resolveSteal(state, sourceId, targetId, targetCardId = null) {
    const target = state.getPlayer(targetId);
    const source = state.getPlayer(sourceId);
    if (!target || !source) return null;

    let stolenCard = null;
    let fromZoneDesc = 'trên tay';

    if (targetCardId) {
      const hIdx = (target.hand || []).findIndex(c => c.id === targetCardId);
      if (hIdx !== -1) {
        [stolenCard] = target.hand.splice(hIdx, 1);
      } else {
        for (const slot of ['weapon', 'armor', 'horse_attack', 'horse_defense']) {
          if (target.equipment?.[slot]?.id === targetCardId) {
            stolenCard = target.equipment[slot];
            target.equipment[slot] = null;
            fromZoneDesc = `trang bị [${stolenCard.name}]`;
            if (stolenCard.name === 'Bạch Ngân' || stolenCard.name === 'Bạch Ngân Sư Tử' || isEquip(stolenCard, 'bach_ngan') || stolenCard.id?.includes('bach_ngan')) {
              target.hp = Math.min(target.maxHp, target.hp + 1);
              state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${target.name}, hồi 1 HP!`);
            }
            break;
          }
        }
        if (!stolenCard && target.judgementArea) {
          const jIdx = target.judgementArea.findIndex(c => c.id === targetCardId);
          if (jIdx !== -1) {
            [stolenCard] = target.judgementArea.splice(jIdx, 1);
            fromZoneDesc = `khu phán xét [${stolenCard.name}]`;
          }
        }
      }
    }

    if (!stolenCard) {
      if (target.hand && target.hand.length > 0) {
        stolenCard = target.hand.pop();
      } else {
        const equipSlots = ['weapon', 'armor', 'horse_attack', 'horse_defense'].filter(s => target.equipment && target.equipment[s]);
        if (equipSlots.length > 0) {
          const slot = equipSlots[0];
          stolenCard = target.equipment[slot];
          target.equipment[slot] = null;
          fromZoneDesc = `trang bị [${stolenCard.name}]`;
          if (stolenCard.name === 'Bạch Ngân' || stolenCard.name === 'Bạch Ngân Sư Tử' || isEquip(stolenCard, 'bach_ngan') || stolenCard.id?.includes('bach_ngan')) {
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
      state.addLog(`🤏 ${source.name} đã cướp 1 lá bài (${fromZoneDesc}) của ${target.name}.`, {
        type: 'STEAL_CARD',
        victimId: targetId,
        thiefId: sourceId,
        cardId: stolenCard.id,
        cardName: stolenCard.name,
        cardSuit: stolenCard.suit,
        cardRank: stolenCard.rank,
        fromZoneDesc
      });
      if (fromZoneDesc.startsWith('trang bị')) {
        globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId, card: stolenCard }, state);
      }
      if (fromZoneDesc.startsWith('trên tay') && target.hand.length === 0 && (target.skills?.includes('hien_ke') || globalHeroRegistry.hasSkill(target, 'hien_ke', true))) {
        state.drawCards(targetId, 1);
        state.addLog(`📜 [Hiến Kế] ${target.name} mất lá bài cuối cùng trên tay, lập tức rút 1 lá bài!`);
      }
    }
    return stolenCard;
  }

  static resolveDismantle(state, sourceId, targetId, targetCardId = null) {
    const target = state.getPlayer(targetId);
    const source = state.getPlayer(sourceId);
    if (!target || !source) return null;

    let removedCard = null;
    let fromZoneDesc = 'trên tay';

    if (targetCardId) {
      const hIdx = (target.hand || []).findIndex(c => c.id === targetCardId);
      if (hIdx !== -1) {
        [removedCard] = target.hand.splice(hIdx, 1);
      } else {
        for (const slot of ['weapon', 'armor', 'horse_attack', 'horse_defense']) {
          if (target.equipment?.[slot]?.id === targetCardId) {
            removedCard = target.equipment[slot];
            target.equipment[slot] = null;
            fromZoneDesc = `trang bị [${removedCard.name}]`;
            if (removedCard.name === 'Bạch Ngân' || removedCard.name === 'Bạch Ngân Sư Tử' || isEquip(removedCard, 'bach_ngan') || removedCard.id?.includes('bach_ngan')) {
              target.hp = Math.min(target.maxHp, target.hp + 1);
              state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${target.name}, hồi 1 HP!`);
            }
            break;
          }
        }
        if (!removedCard && target.judgementArea) {
          const jIdx = target.judgementArea.findIndex(c => c.id === targetCardId);
          if (jIdx !== -1) {
            [removedCard] = target.judgementArea.splice(jIdx, 1);
            fromZoneDesc = `khu phán xét [${removedCard.name}]`;
          }
        }
      }
    }

    if (!removedCard) {
      if (target.hand && target.hand.length > 0) {
        removedCard = target.hand.pop();
      } else {
        const equipSlots = ['weapon', 'armor', 'horse_attack', 'horse_defense'].filter(s => target.equipment && target.equipment[s]);
        if (equipSlots.length > 0) {
          const slot = equipSlots[0];
          removedCard = target.equipment[slot];
          target.equipment[slot] = null;
          fromZoneDesc = `trang bị [${removedCard.name}]`;
          if (removedCard.name === 'Bạch Ngân' || removedCard.name === 'Bạch Ngân Sư Tử' || isEquip(removedCard, 'bach_ngan') || removedCard.id?.includes('bach_ngan')) {
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
      state.addLog(`💥 ${source.name} đã tước 1 lá bài (${fromZoneDesc}) của ${target.name}.`, {
        type: 'DISMANTLE_CARD',
        victimId: targetId,
        thiefId: sourceId,
        cardId: removedCard.id,
        cardName: removedCard.name,
        cardSuit: removedCard.suit,
        cardRank: removedCard.rank,
        fromZoneDesc
      });
      if (fromZoneDesc.startsWith('trang bị')) {
        globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId, card: removedCard }, state);
      }
      if (fromZoneDesc.startsWith('trên tay') && target.hand.length === 0 && (target.skills?.includes('hien_ke') || globalHeroRegistry.hasSkill(target, 'hien_ke', true))) {
        state.drawCards(targetId, 1);
        state.addLog(`📜 [Hiến Kế] ${target.name} mất lá bài cuối cùng trên tay, lập tức rút 1 lá bài!`);
      }
    }
    return removedCard;
  }

  static playDismantle(state, sourceId, targetId, card, extraArgs = {}) {
    return this.playTrick(state, sourceId, [targetId], card, extraArgs);
  }

  static playSteal(state, sourceId, targetId, card, extraArgs = {}) {
    return this.playTrick(state, sourceId, [targetId], card, extraArgs);
  }

  /**
   * Lấy danh sách người chơi còn sống theo chiều kim đồng hồ bắt đầu từ người kế tiếp
   */
  static getClockwiseTargets(state, sourceId, includeSelf = false) {
    const alive = state.getAlivePlayers();
    const sourceIdx = alive.findIndex(p => p.id === sourceId);
    if (sourceIdx === -1) return alive.map(p => p.id);
    const result = [];
    const count = includeSelf ? alive.length : alive.length - 1;
    const startOffset = includeSelf ? 0 : 1;
    for (let i = startOffset; i < startOffset + count; i++) {
      const idx = (sourceIdx + i) % alive.length;
      result.push(alive[idx].id);
    }
    return result;
  }

  static playArrowRain(state, sourceId, card) {
    const targets = this.getClockwiseTargets(state, sourceId, false);
    return this.playTrick(state, sourceId, targets, card);
  }

  static playBarbarian(state, sourceId, card) {
    const targets = this.getClockwiseTargets(state, sourceId, false);
    return this.playTrick(state, sourceId, targets, card);
  }

  static playPeachGarden(state, sourceId, card) {
    const targets = this.getClockwiseTargets(state, sourceId, true);
    return this.playTrick(state, sourceId, targets, card);
  }

  static playLightning(state, sourceId, card) {
    return this.playTrick(state, sourceId, [sourceId], card);
  }

  static playChaos(state, sourceId, targetId, card) {
    return this.playTrick(state, sourceId, [targetId], card);
  }

  static playStarvation(state, sourceId, targetId, card) {
    const target = state.getPlayer(targetId);
    if (!target) throw new Error(`[TrickRules] Mục tiêu ${targetId} không hợp lệ!`);
    const source = state.getPlayer(sourceId);
    const hasInfiniteTrickRange = globalHeroRegistry.hasSkill(source, 'tien_duyen_khoang_cach', true);
    const dist = RangeSystem.calculateDistance(source, target, state.getAlivePlayers());
    if (!hasInfiniteTrickRange && dist > 1) {
      throw new Error(`[TrickRules] Mục tiêu Binh Lương Thốn Đoạn phải ở cự ly <= 1 (Khoảng cách hiện tại: ${dist})!`);
    }
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
   * Xử lý cẩm nang trong khu phán xét của người chơi (Sấm Sét, Hỗn Loạn, Binh Lương Thốn Đoạn)
   */
  static resolveJudgementPhase(state, playerId, options = {}) {
    const player = state.getPlayer(playerId);
    if (!player || !player.judgementArea || player.judgementArea.length === 0 || !player.isAlive) {
      return;
    }

    // Lấy lá cẩm nang trên đỉnh khu phán xét (LIFO)
    const delayedCard = player.judgementArea.pop();

    // Kiểm tra xem trên bàn có ai sở hữu lá bài hoặc kỹ năng Hóa Giải không (Judgement Negate Window theo ADR 0005)
    const canNegate = !options.skipNegate && this.hasAnyNegatePlayer(state);
    if (canNegate) {
      state.addLog(`⚖️ Chuẩn bị phán xét [${delayedCard.name}] cho ${player.name}...`);
      const alivePlayers = state.getAlivePlayers();
      const pIdx = alivePlayers.findIndex(p => p.id === playerId);
      const priorityQueue = [];
      for (let i = 0; i < alivePlayers.length; i++) {
        const idx = (pIdx + i) % alivePlayers.length;
        priorityQueue.push(alivePlayers[idx].id);
      }

      state.priorityStack.push({
        type: 'ASK_NEGATE',
        sourceId: playerId,
        targetId: playerId,
        currentActorId: priorityQueue[0],
        priorityQueue,
        context: {
          card: delayedCard,
          delayedCard,
          isJudgementNegate: true,
          reason: 'judgement',
          negateCount: 0,
          interactiveRoll: options.interactiveRoll === true
        }
      });
      return;
    }

    // Không ai có Hóa Giải -> Nếu là tương tác, đẩy frame ASK_JUDGEMENT_ROLL
    if (options.interactiveRoll) {
      state.priorityStack.push({
        type: 'ASK_JUDGEMENT_ROLL',
        sourceId: player.id,
        targetId: player.id,
        currentActorId: player.id,
        context: {
          delayedCard,
          cardKey: normalizeCardKey(delayedCard),
          cardName: delayedCard.name,
          interactiveRoll: true
        }
      });
      return;
    }

    // Fallback đồng bộ cho các test headless không truyền options.interactiveRoll
    this._executeJudgementRoll(state, player, delayedCard, false);
  }

  /**
   * Phản hồi hành động Rút Bài Phán Xét (Judgement Roll)
   */
  static respondJudgementRoll(state, responderId, data = {}) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_JUDGEMENT_ROLL') return;
    state.priorityStack.pop();

    const { delayedCard } = frame.context;
    const player = state.getPlayer(responderId);
    if (!player || !player.isAlive) return;

    this._executeJudgementRoll(state, player, delayedCard, true);
  }

  /**
   * Thực hiện lật bài phán xét và xử lý đổi bài phán xét
   */
  static _executeJudgementRoll(state, player, delayedCard, interactive = false) {
    const cardKey = normalizeCardKey(delayedCard);

    state.addLog(`⚖️ Bắt đầu phán xét [${delayedCard.name}] cho ${player.name}...`);

    // Lật bài phán xét từ đầu drawPile
    const judgeCard = state.drawCardFromDeck();
    if (!judgeCard) {
      state.addLog(`Không còn bài để phán xét! Bỏ qua [${delayedCard.name}].`);
      state.discardPile.push(delayedCard);
      if (player.judgementArea && player.judgementArea.length > 0 && player.isAlive) {
        this.resolveJudgementPhase(state, player.id, { interactiveRoll: interactive });
      }
      return;
    }

    state.addLog(`🎲 ${player.name} lật mở lá bài phán xét: [${judgeCard.name} ${judgeCard.suit || ''} ${judgeCard.rank || ''}]!`);

    // Kiểm tra xem có người chơi nào có kỹ năng đổi phán xét (Mạc Đĩnh Chi - Ứng Biến, Đinh Điền - Quân Cơ)
    const candidateIds = state.players
      .filter(p => p.isAlive && p.hand && p.hand.length > 0 && (
        globalHeroRegistry.hasSkill(p, 'ung_bien', true) ||
        p.skills?.includes('ung_bien') ||
        globalHeroRegistry.hasSkill(p, 'quan_co', true) ||
        p.skills?.includes('quan_co')
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
          candidateIndex: 0,
          interactiveRoll: interactive
        }
      });
      return; // Dừng lại chờ phản hồi từ người đổi phán xét
    }

    // Không có ai đổi bài -> Xử lý kết quả phán xét
    this._finalizeDelayedJudgement(state, player, delayedCard, judgeCard, interactive);
    if (!interactive && player.judgementArea && player.judgementArea.length > 0 && player.isAlive) {
      this.resolveJudgementPhase(state, player.id);
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
    const { delayedCard, candidateIds, candidateIndex = 0, interactiveRoll = false } = frame.context;
    let finalJudgeCard = frame.context.judgeCard;
    const player = state.getPlayer(frame.targetId);

    if (replaceCard) {
      const hasUngBien = globalHeroRegistry.hasSkill(responder, 'ung_bien', true) || responder.skills?.includes('ung_bien');
      const hasQuanCo = globalHeroRegistry.hasSkill(responder, 'quan_co', true) || responder.skills?.includes('quan_co');
      if (hasQuanCo && !hasUngBien) {
        const effColor = replaceCard && responder ? globalHeroRegistry.getEffectiveColor(responder, replaceCard) : replaceCard.color;
        const isBlack = effColor ? effColor === 'black' : Boolean(replaceCard.color === 'black' || getSuitColor(replaceCard.suit) === 'black');
        if (!isBlack) {
          throw new Error(`[Quân Cơ] Đinh Điền chỉ được dùng lá bài màu Đen để thay thế bài phán xét!`);
        }
      }
      state.priorityStack.pop();
      responder.hand = responder.hand.filter(c => c.id !== replaceCard.id);
      state.discardPile.push(finalJudgeCard);
      finalJudgeCard = replaceCard;
      const skillName = hasUngBien ? 'Ứng Biến' : 'Quân Cơ';
      state.addLog(`☯️ [${skillName}] ${responder.name} đánh ra lá [${replaceCard.name} ${replaceCard.suit || ''}] thay thế lá phán xét!`);
      this._finalizeDelayedJudgement(state, player, delayedCard, finalJudgeCard, interactiveRoll);
      if (!interactiveRoll && player && player.judgementArea && player.judgementArea.length > 0 && player.isAlive) {
        this.resolveJudgementPhase(state, player.id);
      }
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
        this._finalizeDelayedJudgement(state, player, delayedCard, finalJudgeCard, interactiveRoll);
        if (!interactiveRoll && player && player.judgementArea && player.judgementArea.length > 0 && player.isAlive) {
          this.resolveJudgementPhase(state, player.id);
        }
        return { changed: false, finalCard: finalJudgeCard };
      }
    }
  }

  /**
   * Phản hồi xác nhận kết quả Phán Xét (Judgement Result Confirmation)
   */
  static respondJudgementResult(state, responderId, data = {}) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_JUDGEMENT_RESULT') return;
    state.priorityStack.pop();

    const player = state.getPlayer(responderId);
    if (player && player.judgementArea && player.judgementArea.length > 0 && player.isAlive) {
      this.resolveJudgementPhase(state, player.id, { interactiveRoll: true });
    }
  }

  /**
   * Thực thi kết quả phán xét cuối cùng cho Cẩm nang Trì hoãn
   */
  static _finalizeDelayedJudgement(state, player, delayedCard, judgeCard, interactive = false) {
    const cardKey = normalizeCardKey(delayedCard);
    state.discardPile.push(judgeCard);

    // Kích hoạt phản ứng phán xét (Ngọc Hân Công Chúa - Thông Ngôn...)
    globalHeroRegistry.dispatchTrigger('ON_JUDGED', { targetId: player.id, judgeCard }, state);

    let isSuccess = false;
    let resultMessage = '';

    if (cardKey === 'sam_set') {
      const isSpade = normalizeSuit(judgeCard.suit).code === 'spade';
      const rank = typeof judgeCard.rank === 'number' ? judgeCard.rank : parseInt(judgeCard.rank, 10);
      const isExploded = isSpade && rank >= 2 && rank <= 9;

      if (isExploded) {
        isSuccess = false;
        resultMessage = `🌩️⚡ [Sấm Sét] NỔ TRÚNG ${player.name} (${judgeCard.name} chất Bích ${rank})! Nhận 3 sát thương lôi hỏa!`;
        state.addLog(resultMessage);
        state.discardPile.push(delayedCard);
        CombatRules.applyDamage(state, null, player.id, 3, 'lightning');
      } else {
        isSuccess = true;
        resultMessage = `⚡ [Sấm Sét] Không nổ (${judgeCard.name} ${judgeCard.suit} ${judgeCard.rank || ''})!`;
        state.addLog(resultMessage);
        const alive = state.getAlivePlayers();
        const currIdx = alive.findIndex(p => p.id === player.id);
        let nextPlayer = null;
        for (let step = 1; step < alive.length; step++) {
          const candidate = alive[(currIdx + step) % alive.length];
          const hasLightning = candidate.judgementArea && candidate.judgementArea.some(c => isDelayedTrick(c, 'sam_set'));
          if (!hasLightning) {
            nextPlayer = candidate;
            break;
          }
        }
        if (nextPlayer) {
          nextPlayer.judgementArea = nextPlayer.judgementArea || [];
          nextPlayer.judgementArea.push(delayedCard);
          state.addLog(`⚡ [Sấm Sét] Chuyển sang khu phán xét của ${nextPlayer.name}.`);
        } else {
          state.discardPile.push(delayedCard);
          state.addLog(`⚡ [Sấm Sét] Tất cả người chơi đều đã có Sấm Sét, lá bài được đưa vào chồng bài bỏ.`);
        }
      }
    } else if (cardKey === 'hon_loan') {
      const isHeart = normalizeSuit(judgeCard.suit).code === 'heart';
      state.discardPile.push(delayedCard);

      if (!isHeart) {
        isSuccess = false;
        resultMessage = `🌀 [Hỗn Loạn] Phán xét KHÔNG PHẢI CƠ (${judgeCard.name} chất ${judgeCard.suit || judgeCard.color})! ${player.name} bị mất Giai đoạn Ra bài!`;
        state.addLog(resultMessage);
        player.temporaryFlags = player.temporaryFlags || {};
        player.temporaryFlags.skipActionPhase = true;
      } else {
        isSuccess = true;
        resultMessage = `✨ [Hỗn Loạn] Phán xét ra CƠ (${judgeCard.name})! ${player.name} thoát khỏi Hỗn Loạn thành công.`;
        state.addLog(resultMessage);
      }
    } else if (cardKey === 'binh_luong' || cardKey === 'binh-luong') {
      const isClub = normalizeSuit(judgeCard.suit).code === 'club';
      state.discardPile.push(delayedCard);

      if (!isClub) {
        isSuccess = false;
        resultMessage = `🌾 [Binh Lương Thốn Đoạn] Phán xét KHÔNG PHẢI NHÉP (${judgeCard.name} chất ${judgeCard.suit || judgeCard.color})! ${player.name} bị mất Pha Rút Bài!`;
        state.addLog(resultMessage);
        player.temporaryFlags = player.temporaryFlags || {};
        player.temporaryFlags.skipDrawPhase = true;
      } else {
        isSuccess = true;
        resultMessage = `✨ [Binh Lương Thốn Đoạn] Phán xét ra NHÉP (${judgeCard.name})! ${player.name} thoát khỏi Binh Lương thành công.`;
        state.addLog(resultMessage);
      }
    } else {
      state.discardPile.push(delayedCard);
    }

    if (interactive) {
      state.priorityStack.push({
        type: 'ASK_JUDGEMENT_RESULT',
        sourceId: player.id,
        targetId: player.id,
        currentActorId: player.id,
        context: {
          delayedCard,
          judgeCard,
          cardKey,
          cardName: delayedCard.name,
          isSuccess,
          resultMessage
        }
      });
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

  /**
   * Phản hồi Bước 1 Hỏa Công: Mục tiêu để lộ 1 lá bài
   */
  static respondHoaCongReveal(state, targetId, revealedCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_HOACONG_REVEAL' || frame.currentActorId !== targetId) {
      throw new Error(`[TrickRules] Không có yêu cầu để lộ bài Hỏa Công nào đang chờ cho người chơi ${targetId}!`);
    }

    const target = state.getPlayer(targetId);
    const { sourceId, trickCard } = frame.context;
    state.priorityStack.pop();

    const actualCard = revealedCard || (target.hand && target.hand.length > 0 ? target.hand[0] : null);
    if (!actualCard) {
      state.addLog(`💨 [Hỏa Công] ${target.name} không còn bài trên tay, Hỏa Công tiêu tan.`);
      return { success: false };
    }

    state.addLog(`👁️ [Hỏa Công]: ${target.name} để lộ lá bài [${actualCard.name || actualCard.id}] (Chất: ${actualCard.suit || actualCard.color}).`);

    // Đẩy Frame 2: ASK_HOACONG_DISCARD cho người dùng Hỏa Công
    state.priorityStack.push({
      type: 'ASK_HOACONG_DISCARD',
      sourceId,
      targetId,
      currentActorId: sourceId,
      priorityQueue: [sourceId],
      context: {
        sourceId,
        targetId,
        revealedCard: actualCard,
        trickCard
      }
    });

    return { success: true, revealedCard: actualCard };
  }

  /**
   * Phản hồi Bước 2 Hỏa Công: Người ra bài bỏ 1 lá cùng chất để phóng hỏa
   */
  static respondHoaCongDiscard(state, sourceId, discardCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_HOACONG_DISCARD' || frame.currentActorId !== sourceId) {
      throw new Error(`[TrickRules] Không có yêu cầu bỏ bài Hỏa Công nào đang chờ cho người chơi ${sourceId}!`);
    }

    const source = state.getPlayer(sourceId);
    const target = state.getPlayer(frame.targetId);
    const { revealedCard } = frame.context;
    state.priorityStack.pop();

    if (discardCard) {
      const sourceSuit = globalHeroRegistry.getEffectiveSuit(source, discardCard) || discardCard.suit;
      const targetSuit = globalHeroRegistry.getEffectiveSuit(target, revealedCard) || revealedCard.suit;
      const sourceColor = globalHeroRegistry.getEffectiveColor(source, discardCard) || discardCard.color;
      const targetColor = globalHeroRegistry.getEffectiveColor(target, revealedCard) || revealedCard.color;

      const match = (sourceSuit && isSameSuit(sourceSuit, targetSuit)) || 
                    (sourceColor && sourceColor === targetColor);
      if (!match) {
        state.addLog(`❌ [Hỏa Công]: Lá bài [${discardCard.name}] không cùng chất (${revealedCard.suit}) với lá bài đã lộ!`);
        return { success: false, reason: 'SUIT_MISMATCH' };
      }

      state.discardFromHand(sourceId, [discardCard.id]);
      state.addLog(`🔥 [Hỏa Công] KÍCH HỎA THÀNH CÔNG! ${source.name} bỏ lá bài [${discardCard.name}] cùng chất ${revealedCard.suit || ''}, gây 1 sát thương Lửa lên ${target.name}!`);
      CombatRules.applyDamage(state, sourceId, target.id, 1, 'fire');
      return { success: true, damageDealt: 1 };
    } else {
      state.addLog(`💨 [Hỏa Công] không thành: ${source.name} không bỏ bài cùng chất để kích hỏa.`);
      return { success: false };
    }
  }
}

