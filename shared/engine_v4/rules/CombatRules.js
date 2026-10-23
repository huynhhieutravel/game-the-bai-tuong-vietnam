/**
 * CombatRules.js
 * Xử lý Toàn Bộ Quy Tắc Chiến Đấu, Sát Thương & Hấp Hối trong Việt Sát v4.
 * Tích hợp chặt chẽ với PriorityStack và GameInvariants.
 */

import { RangeSystem } from './RangeSystem.js';
import { GameInvariants } from '../core/Invariants.js';
import { globalHeroRegistry } from '../heroes/HeroRegistry.js';

export class CombatRules {
  /**
   * Thực hiện hành động Đánh [Chém] từ Source lên Target
   */
  static playSlash(state, sourceId, targetId, card) {
    const source = state.getPlayer(sourceId);
    const target = state.getPlayer(targetId);
    const alivePlayers = state.getAlivePlayers();

    if (!source || !target || !source.isAlive || !target.isAlive) {
      throw new Error(`[CombatRules] Người chơi không hợp lệ hoặc đã tử trận.`);
    }

    // 0. Kiểm tra Đạm Bạc (Lang Liêu) của Target
    if (globalHeroRegistry.hasSkill(target, 'dam_bac', true) && (!target.hand || target.hand.length === 0)) {
      throw new Error(`[CombatRules] ${target.name} đang kích hoạt [Đạm Bạc] (hết bài trên tay), không thể bị Chém!`);
    }

    // 1. Kiểm tra tầm đánh
    if (!RangeSystem.inSlashRange(source, target, alivePlayers, card)) {
      const dist = RangeSystem.calculateDistance(source, target, alivePlayers);
      const range = RangeSystem.getAttackRange(source, card);
      throw new Error(`[CombatRules] Mục tiêu nằm ngoài tầm đánh! (Khoảng cách: ${dist}, Tầm đánh: ${range})`);
    }

    // 2. Kiểm tra giới hạn Chém trong lượt
    source.turnStats.slashCount = (source.turnStats.slashCount || 0) + 1;
    GameInvariants.assertSlashLimit(source);

    // 3. Trừ lá bài trên tay Source
    state.discardFromHand(sourceId, [card.id]);
    state.addLog(`${source.name} đánh [Chém] lên ${target.name}.`);

    // 4. Kiểm tra Giáp Hắc Thuẫn của Target (Miễn nhiễm Chém màu Đen: ♠, ♣)
    const targetArmor = target.equipment?.armor;
    const isBlackSlash = card.suit === 'spade' || card.suit === 'club' || card.suit === '♠' || card.suit === '♣' || card.color === 'black';
    const isHacThuan = targetArmor && (
      targetArmor.name === 'Hắc Thuẫn' || 
      targetArmor.id === 'black_shield' || 
      targetArmor.key === 'black_shield' ||
      targetArmor.id?.includes('black_shield') ||
      targetArmor.id?.includes('hac_thuan') ||
      targetArmor.id?.includes('hắc-thuẫn')
    );
    if (isHacThuan && isBlackSlash) {
      state.addLog(`🛡️ ${target.name} có [Hắc Thuẫn], miễn nhiễm với lá [Chém] màu Đen!`);
      return { success: false, reason: 'ARMOR_IMMUNE' };
    }

    // 5. Kiểm tra Vũ khí: Song Kiếm (Cross-gender weapon effect)
    const sourceWeapon = source.equipment?.weapon;
    const isSongKiem = sourceWeapon && (
      sourceWeapon.name === 'Song Kiếm' || 
      sourceWeapon.id?.includes('song_kiem') || 
      sourceWeapon.key === 'song-kiem'
    );
    if (isSongKiem) {
      const pGender = source.gender;
      const tGender = target.gender;
      if (pGender && tGender && pGender !== 'none' && tGender !== 'none' && pGender !== tGender) {
        if (target.hand && target.hand.length > 0) {
          const [discarded] = target.hand.splice(0, 1);
          state.discardPile.push(discarded);
          state.addLog(`⚔️ [Song Kiếm] ${target.name} khác giới tính với ${source.name}, bị ép bỏ 1 lá bài [${discarded.name || discarded.id}]!`);
        } else if (target.equipment && Object.values(target.equipment).some(Boolean)) {
          const slot = Object.keys(target.equipment).find(k => target.equipment[k]);
          const removed = target.equipment[slot];
          target.equipment[slot] = null;
          state.discardPile.push(removed);
          state.addLog(`⚔️ [Song Kiếm] ${target.name} bị ép tháo bỏ trang bị [${removed.name || removed.id}]!`);
        } else {
          state.drawCards(source.id, 1);
          state.addLog(`⚔️ [Song Kiếm] ${target.name} không có bài để bỏ, ${source.name} được rút 1 lá bài!`);
        }
      }
    }

    // 6. Kiểm tra Vũ khí: Phương Thiên Kích (Sky Halberd - Chém bài cuối cùng trên tay)
    const isPhuongThien = sourceWeapon && (
      sourceWeapon.name === 'Phương Thiên Kích' ||
      sourceWeapon.id?.includes('phuong_thien') ||
      sourceWeapon.key === 'phuong-thien-kich'
    );
    if (isPhuongThien && source.hand.length === 0) {
      const extraTargets = RangeSystem.getValidSlashTargets(source, alivePlayers, card)
        .filter(t => t.id !== target.id)
        .slice(0, 2);
      if (extraTargets.length > 0) {
        state.addLog(`🔱 [Phương Thiên Kích] ${source.name} đánh ra lá bài cuối cùng trên tay, quét thêm ${extraTargets.map(t => t.name).join(', ')}!`);
      }
    }

    // 7. Dispatch Trigger ON_SLASH_TARGET (Cao Lỗ - Nỏ Thần, Thánh Gióng - Tre Ngà, Nguyễn Xí - Phá Quân...)
    const slashEvent = {
      sourceId,
      targetId,
      source,
      target,
      card,
      damageAmount: (source.temporaryFlags?.wineActive ? 2 : 1),
      requiredDodges: source.skills?.includes('pha_quan_nguyen_xi') ? 2 : 1,
      unavoidable: false
    };
    globalHeroRegistry.dispatchTrigger('ON_SLASH_TARGET', slashEvent, state);

    // Nếu cú Chém bị khóa không thể Né (Nỏ Thần, v.v.) -> Gây sát thương trực tiếp
    if (slashEvent.unavoidable) {
      state.addLog(`🎯 Cú Chém của ${source.name} không thể Né!`);
      this.applyDamage(state, sourceId, targetId, slashEvent.damageAmount, 'slash');
      if (source.temporaryFlags?.wineActive) {
        source.temporaryFlags.wineActive = false;
      }
      return { success: true, unavoidable: true };
    }

    // 8. Đẩy Frame yêu cầu Né (ASK_DODGE) vào PriorityStack
    state.priorityStack.push({
      type: 'ASK_DODGE',
      sourceId,
      targetId,
      priorityQueue: [targetId],
      context: {
        card,
        requiredDodges: slashEvent.requiredDodges,
        dodgesProvided: 0,
        damageAmount: slashEvent.damageAmount
      }
    });

    // Reset cờ Rượu sau khi đã chém
    if (source.temporaryFlags?.wineActive) {
      source.temporaryFlags.wineActive = false;
    }

    return { success: true };
  }

  /**
   * Phản hồi lá [Né] hoặc kích hoạt Phán xét [Bát Quái / Thần Giáp] từ Target
   */
  static respondDodge(state, targetId, dodgeCard = null, options = {}) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_DODGE' || frame.currentActorId !== targetId) {
      throw new Error(`[CombatRules] Không có yêu cầu Né hợp lệ cho người chơi ${targetId}`);
    }

    const target = state.getPlayer(targetId);

    // 0. Gọi đồng minh trợ chiến (Bọc Trăm Trứng / Tiên Phát)
    if (options.callBocTramTrung) {
      const allies = state.players.filter(p => p.id !== targetId && p.isAlive && p.faction === 'lac');
      if (allies.length > 0) {
        state.addLog(`🐉 ${target.name} phát động [Bọc Trăm Trứng], kêu gọi đồng minh hệ Lạc ra [Né] giùm!`);
        state.priorityStack.push({
          type: 'ASK_BOC_TRAM_TRUNG_DODGE',
          sourceId: targetId,
          targetId: targetId,
          priorityQueue: allies.map(a => a.id),
          currentActorId: allies[0].id,
          context: {
            allies: allies.map(a => a.id),
            allyIndex: 0
          }
        });
        return { calledAllies: true };
      } else {
        state.addLog(`🐉 Không có đồng minh hệ Lạc nào có thể ra [Né] giùm cho ${target.name}!`);
      }
    }

    if (options.doTienPhat) {
      const allies = state.players.filter(p => p.id !== targetId && p.isAlive && p.faction === 'viet');
      if (allies.length > 0) {
        state.addLog(`👑 ${target.name} phát động [Tiên Phát], kêu gọi đồng minh hệ Việt ra [Né] giùm!`);
        state.priorityStack.push({
          type: 'ASK_TIEN_PHAT',
          sourceId: targetId,
          targetId: targetId,
          priorityQueue: allies.map(a => a.id),
          currentActorId: allies[0].id,
          context: {
            allies: allies.map(a => a.id),
            allyIndex: 0
          }
        });
        return { calledAllies: true };
      } else {
        state.addLog(`👑 Không có đồng minh hệ Việt nào có thể ra [Né] giùm cho ${target.name}!`);
      }
    }

    // 1. Phán xét Bát Quái / Thần Giáp (Rùa Vàng)
    if (options.useBagua || options.doBagua) {
      const hasBaguaArmor = target.equipment?.armor && (
        target.equipment.armor.name === 'Bát Quái' ||
        target.equipment.armor.id === 'bat_quai' ||
        target.equipment.armor.key === 'bat_quai'
      );
      const hasThanGiap = !target.equipment?.armor && globalHeroRegistry.hasSkill(target, 'than_giap', true);

      if (!hasBaguaArmor && !hasThanGiap) {
        throw new Error(`[CombatRules] ${target.name} không có Bát Quái hoặc Thần Giáp để phán xét!`);
      }

      if (frame.context.baguaAttempted) {
        throw new Error(`[CombatRules] Bát Quái chỉ được phán xét một lần cho mỗi lượt yêu cầu Né!`);
      }

      frame.context.baguaAttempted = true;
      const judgeCard = state.drawCardFromDeck();
      if (!judgeCard) return;
      state.discardPile.push(judgeCard);

      const isRed = judgeCard.color === 'red' || 
                    judgeCard.suit === 'heart' || 
                    judgeCard.suit === 'diamond' || 
                    judgeCard.suit === '♥' || 
                    judgeCard.suit === '♦';

      if (isRed) {
        frame.context.dodgesProvided += 1;
        state.addLog(`☯️ [Bát Quái / Thần Giáp] Phán xét ĐỎ (${judgeCard.name || judgeCard.id} ${judgeCard.suit || ''})! Tính như 1 lá [Né] (${frame.context.dodgesProvided}/${frame.context.requiredDodges}).`);

        if (frame.context.dodgesProvided >= frame.context.requiredDodges) {
          state.priorityStack.pop();
          state.addLog(`${target.name} đã né thành công cú Chém nhờ [Bát Quái]!`);
          globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', { sourceId: frame.sourceId, targetId, card: judgeCard }, state);
          const postResult = this._handlePostDodgeWeapons(state, frame, target);
          return { ...postResult, baguaSuccess: true };
        }
        return { dodged: false, pendingMoreDodges: true, baguaSuccess: true };
      } else {
        state.addLog(`☯️ [Bát Quái / Thần Giáp] Phán xét ĐEN (${judgeCard.name || judgeCard.id} ${judgeCard.suit || ''})! Thất bại, cần tự đánh lá [Né] từ trên tay.`);
        return { dodged: false, baguaSuccess: false };
      }
    }

    if (dodgeCard) {
      // Người chơi cung cấp lá Né hợp lệ
      state.discardFromHand(targetId, [dodgeCard.id]);
      frame.context.dodgesProvided += 1;
      state.addLog(`${target.name} đánh ra lá [Né] (${frame.context.dodgesProvided}/${frame.context.requiredDodges}).`);

      if (frame.context.dodgesProvided >= frame.context.requiredDodges) {
        // Né thành công hoàn toàn -> Pop frame
        state.priorityStack.pop();
        state.addLog(`${target.name} đã né thành công cú Chém!`);
        globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', { sourceId: frame.sourceId, targetId, card: dodgeCard }, state);
        return this._handlePostDodgeWeapons(state, frame, target);
      }
      return { dodged: false, pendingMoreDodges: true };
    } else {
      // Người chơi chọn Không Né / Không có Né -> Nhận sát thương!
      const damageAmount = frame.context.damageAmount || 1;
      const sourceId = frame.sourceId;
      const damageType = frame.context?.reason === 'van-tien' ? 'arrow_rain' : 'slash';

      state.priorityStack.pop(); // Giải phóng frame ASK_DODGE
      this.applyDamage(state, sourceId, targetId, damageAmount, damageType);
      return { dodged: false };
    }
  }

  /**
   * Phản hồi Bọc Trăm Trứng (Né giùm cho Lạc Long Quân)
   */
  static respondBocTramTrungDodge(state, allyId, dodgeCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_BOC_TRAM_TRUNG_DODGE') {
      throw new Error(`[CombatRules] Không có yêu cầu Bọc Trăm Trứng Né nào đang chờ!`);
    }

    const ally = state.getPlayer(allyId);
    const llq = state.getPlayer(frame.sourceId);

    if (dodgeCard) {
      state.priorityStack.pop(); // Giải phóng frame hỏi đồng minh
      state.discardFromHand(allyId, [dodgeCard.id]);
      state.addLog(`🐉 [Bọc Trăm Trứng] ${ally.name} đánh ra lá [Né] đỡ đòn thay cho ${llq.name}!`);

      // Cập nhật frame ASK_DODGE bên dưới
      const dodgeFrame = state.priorityStack.peek();
      if (dodgeFrame && dodgeFrame.type === 'ASK_DODGE') {
        dodgeFrame.context.dodgesProvided += 1;
        if (dodgeFrame.context.dodgesProvided >= dodgeFrame.context.requiredDodges) {
          state.priorityStack.pop();
          state.addLog(`${llq.name} đã né thành công cú Chém nhờ đồng minh!`);
          globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', { sourceId: dodgeFrame.sourceId, targetId: llq.id, card: dodgeCard }, state);
          return this._handlePostDodgeWeapons(state, dodgeFrame, llq);
        }
      }
      return { defended: true };
    } else {
      // Đồng minh từ chối né giùm -> Chuyển sang đồng minh tiếp theo trong hàng đợi
      frame.context.allyIndex = (frame.context.allyIndex || 0) + 1;
      if (frame.context.allyIndex < frame.context.allies.length) {
        const nextAllyId = frame.context.allies[frame.context.allyIndex];
        frame.currentActorId = nextAllyId;
        frame.priorityQueue = [nextAllyId];
        return { continued: true, nextAllyId };
      } else {
        // Hết đồng minh trợ giúp -> Trả lại quyền quyết định cho Lạc Long Quân
        state.priorityStack.pop();
        state.addLog(`🐉 Đồng minh hệ Lạc không có ai ra [Né] thay cho ${llq.name}!`);
        return { defended: false };
      }
    }
  }

  /**
   * Phản hồi Tiên Phát (Né giùm cho Lý Thường Kiệt)
   */
  static respondTienPhat(state, allyId, dodgeCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_TIEN_PHAT') {
      throw new Error(`[CombatRules] Không có yêu cầu Tiên Phát nào đang chờ!`);
    }

    const ally = state.getPlayer(allyId);
    const ltk = state.getPlayer(frame.sourceId);

    if (dodgeCard) {
      state.priorityStack.pop(); // Giải phóng frame hỏi đồng minh
      state.discardFromHand(allyId, [dodgeCard.id]);
      state.addLog(`👑 [Tiên Phát] ${ally.name} đánh ra lá [Né] đỡ đòn thay cho ${ltk.name}!`);

      const dodgeFrame = state.priorityStack.peek();
      if (dodgeFrame && dodgeFrame.type === 'ASK_DODGE') {
        dodgeFrame.context.dodgesProvided += 1;
        if (dodgeFrame.context.dodgesProvided >= dodgeFrame.context.requiredDodges) {
          state.priorityStack.pop();
          state.addLog(`${ltk.name} đã né thành công cú Chém nhờ đồng minh [Tiên Phát]!`);
          globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', { sourceId: dodgeFrame.sourceId, targetId: ltk.id, card: dodgeCard }, state);
          return this._handlePostDodgeWeapons(state, dodgeFrame, ltk);
        }
      }
      return { defended: true };
    } else {
      frame.context.allyIndex = (frame.context.allyIndex || 0) + 1;
      if (frame.context.allyIndex < frame.context.allies.length) {
        const nextAllyId = frame.context.allies[frame.context.allyIndex];
        frame.currentActorId = nextAllyId;
        frame.priorityQueue = [nextAllyId];
        return { continued: true, nextAllyId };
      } else {
        state.priorityStack.pop();
        state.addLog(`👑 Đồng minh hệ Việt không có ai ra [Né] thay cho ${ltk.name}!`);
        return { defended: false };
      }
    }
  }

  /**
   * Phản hồi Bọc Trăm Trứng (Chém giùm cho Lạc Long Quân)
   */
  static respondBocTramTrungSlash(state, allyId, slashCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_BOC_TRAM_TRUNG_SLASH') {
      throw new Error(`[CombatRules] Không có yêu cầu Bọc Trăm Trứng Chém nào đang chờ!`);
    }

    const ally = state.getPlayer(allyId);
    const llq = state.getPlayer(frame.sourceId);

    if (slashCard) {
      state.priorityStack.pop(); // Giải phóng frame hỏi đồng minh
      state.discardFromHand(allyId, [slashCard.id]);
      state.addLog(`🐉 [Bọc Trăm Trứng] ${ally.name} đánh ra lá [Chém] giùm cho ${llq.name}!`);

      // Nếu trong Quyết Đấu
      const underlyingFrame = state.priorityStack.peek();
      if (underlyingFrame && underlyingFrame.type === 'ASK_SLASH_DUEL') {
        const nextId = underlyingFrame.currentActorId === underlyingFrame.context.attackerId 
          ? underlyingFrame.targetId 
          : underlyingFrame.context.attackerId;
        underlyingFrame.context.currentResponderId = nextId;
        underlyingFrame.currentActorId = nextId;
        underlyingFrame.priorityQueue = [nextId];
        return { continued: true, nextPlayerId: nextId };
      }
      return { slashed: true };
    } else {
      frame.context.allyIndex = (frame.context.allyIndex || 0) + 1;
      if (frame.context.allyIndex < frame.context.allies.length) {
        const nextAllyId = frame.context.allies[frame.context.allyIndex];
        frame.currentActorId = nextAllyId;
        frame.priorityQueue = [nextAllyId];
        return { continued: true, nextAllyId };
      } else {
        state.priorityStack.pop();
        state.addLog(`🐉 Đồng minh hệ Lạc không có ai ra [Chém] giùm cho ${llq.name}!`);
        return { slashed: false };
      }
    }
  }

  /**
   * Xử lý hiệu ứng Vũ Khí sau khi mục tiêu Né thành công (Rìu Đá, Thanh Long Đao)
   */
  static _handlePostDodgeWeapons(state, frame, target) {
    if (frame.context?.reason === 'van-tien') {
      return { dodged: true };
    }

    const source = state.getPlayer(frame.sourceId);
    if (!source || !source.isAlive) {
      return { dodged: true };
    }

    const sourceWeapon = source.equipment?.weapon;
    const weaponName = sourceWeapon?.name || '';
    const weaponId = sourceWeapon?.id || '';

    // 1. Rìu Đá (Rock Axe): Bỏ 2 lá bài để bắt buộc Chém trúng đích (xuyên giáp)
    const isRiuDa = weaponName === 'Rìu Đá' || weaponId.includes('riu_da') || sourceWeapon?.key === 'riu-da';
    if (isRiuDa && source.hand && source.hand.length >= 2) {
      const discards = source.hand.slice(0, 2);
      state.discardFromHand(source.id, discards.map(c => c.id));
      state.addLog(`🪓 [Rìu Đá] ${source.name} bỏ 2 lá bài [${discards.map(c => c.name).join(', ')}] để xuyên phá cú Né của ${target.name}!`);
      this.applyDamage(state, source.id, target.id, frame.context.damageAmount || 1, 'slash_penetrate');
      return { dodged: false, penetrated: true };
    }

    // 2. Thanh Long Đao: Chém bị Né -> Được Chém tiếp nếu còn bài Chém trên tay
    const isThanhLong = weaponName === 'Thanh Long Đao' || weaponId.includes('thanh_long') || sourceWeapon?.key === 'thanh-long-dao';
    if (isThanhLong) {
      const nextSlash = source.hand?.find(c => c.type === 'slash' || c.name === 'Chém');
      if (nextSlash) {
        state.discardFromHand(source.id, [nextSlash.id]);
        state.addLog(`🐉 [Thanh Long Đao] ${source.name} lập tức đánh tiếp lá [Chém] thứ hai lên ${target.name}!`);
        state.priorityStack.push({
          type: 'ASK_DODGE',
          sourceId: source.id,
          targetId: target.id,
          priorityQueue: [target.id],
          context: {
            card: nextSlash,
            requiredDodges: frame.context.requiredDodges || 1,
            dodgesProvided: 0,
            damageAmount: 1
          }
        });
        return { dodged: false, retriggeredSlash: true };
      }
    }

    return { dodged: true };
  }

  /**
   * Áp dụng Sát thương lên Target (Hỗ trợ truyền sát thương Xiềng Xích)
   */
  static applyDamage(state, sourceId, targetId, amount = 1, reason = 'normal', isChainedPropagation = false) {
    const target = state.getPlayer(targetId);
    const source = sourceId !== null ? state.getPlayer(sourceId) : null;

    // 1. Quạt Sắt: Nếu mục tiêu ĐANG KHÔNG CÓ BÀI TRÊN TAY, sát thương tăng thêm +1
    if (source && reason.startsWith('slash')) {
      const sourceWeapon = source.equipment?.weapon;
      const isQuatSat = sourceWeapon && (
        sourceWeapon.name === 'Quạt Sắt' ||
        sourceWeapon.id?.includes('quat_sat') ||
        sourceWeapon.key === 'quat-sat'
      );
      if (isQuatSat && (!target.hand || target.hand.length === 0)) {
        amount += 1;
        state.addLog(`💨 [Quạt Sắt] ${target.name} không có bài trên tay! Sát thương tăng thêm +1 (tổng: ${amount})!`);
      }
    }

    // 2. Bạch Ngân: Dù sát thương bao nhiêu cũng chỉ nhận tối đa 1 HP
    const targetArmor = target.equipment?.armor;
    const isBachNgan = targetArmor && (
      targetArmor.name === 'Bạch Ngân' ||
      targetArmor.id?.includes('bach_ngan') ||
      targetArmor.key === 'bach-ngan'
    );
    if (isBachNgan && amount > 1) {
      state.addLog(`🦁 [Bạch Ngân] Hóa giải sát thương dồn (${amount} -> 1 HP)!`);
      amount = 1;
    }

    // Ghi nhận trạng thái xích trước khi trừ HP
    const wasChained = Boolean(target.isChained);
    const isElemental = reason === 'lightning' || reason === 'fire' || reason === 'flame' || reason.startsWith('elemental');

    target.hp -= amount;
    target.turnStats.damageTaken = (target.turnStats.damageTaken || 0) + amount;
    if (source) {
      source.turnStats.damageDealt = (source.turnStats.damageDealt || 0) + amount;
    }

    state.addLog(`${target.name} nhận ${amount} điểm sát thương (${reason}). Sinh lực còn lại: ${target.hp}/${target.maxHp}`);

    // Kích hoạt kỹ năng phản ứng khi chịu sát thương (Lý Thường Kiệt, Khúc Thừa Dụ, Đinh Bộ Lĩnh...)
    globalHeroRegistry.dispatchTrigger('ON_DAMAGED', { sourceId, targetId, damageAmount: amount, reason, card: null }, state);

    // 3. Cơ chế Truyền Sát Thương Qua Xiềng Xích (Chained Elemental Damage)
    if (wasChained && isElemental && !isChainedPropagation) {
      target.isChained = false;
      state.addLog(`🔓 [Tháo Xích] ${target.name} nhận sát thương lôi hỏa, giải phóng xích!`);

      const otherChained = state.getAlivePlayers().filter(p => p.id !== target.id && p.isChained);
      for (const other of otherChained) {
        other.isChained = false;
        state.addLog(`⚡🔥 [Xiềng Xích Liên Hoàn] Sát thương lôi hỏa truyền sang ${other.name}!`);
        this.applyDamage(state, sourceId, other.id, amount, reason, true);
      }
    }

    // Kiểm tra Trạng thái Hấp hối (Dying State) khi HP <= 0
    if (target.hp <= 0) {
      this.enterDyingState(state, targetId, sourceId);
    }
  }

  /**
   * Kích hoạt Trạng thái Hấp hối (Dying State) và Vòng Cứu Viện
   */
  static enterDyingState(state, dyingPlayerId, killerId = null) {
    const dyingPlayer = state.getPlayer(dyingPlayerId);
    state.addLog(`⚠️ ${dyingPlayer.name} rơi vào TRẠNG THÁI HẤP HỐI (HP: ${dyingPlayer.hp})!`);

    // Kích hoạt kỹ năng phản ứng khi hấp hối (Chử Đồng Tử - Hóa Tiên, Nguyễn Địa Lô - Hộ Chủ...)
    globalHeroRegistry.dispatchTrigger('ON_DYING', { targetId: dyingPlayerId, sourceId: killerId }, state);
    if (dyingPlayer.hp > 0) {
      state.addLog(`💖 ${dyingPlayer.name} đã thoát khỏi trạng thái Hấp hối!`);
      return;
    }

    const alivePlayers = state.getAlivePlayers();
    const dyingIdx = alivePlayers.findIndex(p => p.id === dyingPlayerId);

    // Xây dựng danh sách hỏi Đào theo chiều kim đồng hồ, bắt đầu từ chính người hấp hối
    const priorityQueue = [];
    for (let i = 0; i < alivePlayers.length; i++) {
      const idx = (dyingIdx + i) % alivePlayers.length;
      priorityQueue.push(alivePlayers[idx].id);
    }

    state.priorityStack.push({
      type: 'ASK_PEACH',
      sourceId: killerId,
      targetId: dyingPlayerId,
      priorityQueue,
      context: {
        dyingPlayerId,
        hpNeeded: 1 - dyingPlayer.hp // Số Đào cần thiết để đưa HP về 1
      }
    });
  }

  /**
   * Phản hồi Đào cứu người hấp hối
   */
  static respondPeach(state, rescuerId, peachCard = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_PEACH') {
      throw new Error(`[CombatRules] Không có yêu cầu cứu viện Hấp hối nào đang chờ!`);
    }

    const dyingPlayer = state.getPlayer(frame.targetId);
    const rescuer = state.getPlayer(rescuerId);

    if (peachCard) {
      const isWine = peachCard.name === 'Rượu' || peachCard.type === 'wine';
      if (isWine && rescuerId !== dyingPlayer.id) {
        throw new Error(`[CombatRules] Rượu chỉ được dùng để tự cứu chính mình khi hấp hối!`);
      }

      state.discardFromHand(rescuerId, [peachCard.id]);
      dyingPlayer.hp += 1;
      const cardLabel = isWine ? 'Rượu' : 'Đào';
      state.addLog(`${rescuer.name} dùng [${cardLabel}] cứu ${dyingPlayer.name}! Sinh lực hồi phục lên ${dyingPlayer.hp}.`);

      if (dyingPlayer.hp >= 1) {
        // Đã thoát khỏi trạng thái Hấp hối!
        state.priorityStack.pop();
        state.addLog(`✨ ${dyingPlayer.name} đã thoát khỏi trạng thái Hấp hối thành công!`);
        return { saved: true };
      }
      return { saved: false, stillDying: true };
    } else {
      // Người chơi này không cứu -> Chuyển sang người tiếp theo trong vòng
      const nextActor = frame.nextActor();
      if (nextActor === null) {
        // Không còn ai cứu -> Người chơi TỬ TRẬN (Death)
        state.priorityStack.pop();
        this.handleDeath(state, frame.targetId, frame.sourceId);
        return { saved: false, dead: true };
      }
      state.addLog(`${rescuer.name} không dùng Đào. Chuyển quyền cứu sang ${state.getPlayer(nextActor).name}.`);
      return { saved: false, nextRescuerId: nextActor };
    }
  }

  /**
   * Xử lý khi Người chơi Tử trận (Death)
   */
  static handleDeath(state, deadPlayerId, killerId = null) {
    const deadPlayer = state.getPlayer(deadPlayerId);
    deadPlayer.isAlive = false;
    const deadFaction = deadPlayer.faction || deadPlayer.identity;
    state.addLog(`💀 ${deadPlayer.name} ĐÃ TỬ TRẬN! Phe phái: [${(deadFaction || 'Vô danh').toUpperCase()}].`);

    // 1. Thu hồi toàn bộ bài trên tay + trang bị + bài phán xét vào discardPile
    if (deadPlayer.hand.length > 0) {
      state.discardPile.push(...deadPlayer.hand);
      deadPlayer.hand = [];
    }
    for (const slot in deadPlayer.equipment) {
      if (deadPlayer.equipment[slot]) {
        state.discardPile.push(deadPlayer.equipment[slot]);
        deadPlayer.equipment[slot] = null;
      }
    }
    if (deadPlayer.judgementArea.length > 0) {
      state.discardPile.push(...deadPlayer.judgementArea);
      deadPlayer.judgementArea = [];
    }

    // 2. Thưởng / Phạt Phe Phái (Quốc Chiến & Nội Chiến)
    if (killerId !== null && killerId !== deadPlayerId) {
      const killer = state.getPlayer(killerId);
      if (killer && killer.isAlive) {
        const isNationalWar = Boolean(
          deadPlayer.faction && killer.faction &&
          deadPlayer.faction !== 'none' && killer.faction !== 'none'
        );

        if (isNationalWar) {
          const isSameFaction = !killer.isDaTam && !deadPlayer.isDaTam && (killer.faction === deadPlayer.faction);
          if (isSameFaction) {
            // Ngộ sát đồng minh cùng phe -> Phạt vứt toàn bộ bài trên tay và trang bị
            state.addLog(`⚠️ ÁC MỘNG! ${killer.name} đã ngộ sát đồng minh cùng phe ${deadPlayer.faction.toUpperCase()}! Bị trừng phạt vứt toàn bộ bài!`);
            if (killer.hand.length > 0) {
              state.discardPile.push(...killer.hand);
              killer.hand = [];
            }
            for (const slot in killer.equipment) {
              if (killer.equipment[slot]) {
                state.discardPile.push(killer.equipment[slot]);
                killer.equipment[slot] = null;
              }
            }
          } else {
            // Tiêu diệt kẻ địch khác phe -> Thưởng rút bài
            const deadAllies = state.players.filter(p => p.id !== deadPlayer.id && p.faction === deadPlayer.faction && (p.revealedHeroes?.[0] || p.revealedHeroes?.[1])).length;
            const rewardCards = deadPlayer.isDaTam ? 1 : Math.max(2, deadAllies + 1);
            state.addLog(`🎁 LẬP CÔNG! ${killer.name} tiêu diệt kẻ địch [${deadPlayer.name}], được thưởng rút ${rewardCards} lá bài!`);
            state.drawCards(killerId, rewardCards);
          }
        } else {
          // Fallback Chế độ Nội Chiến (Standard Identity Mode)
          if (deadPlayer.identity === 'rebel') {
            state.addLog(`🎁 ${killer.name} tiêu diệt Phản Tặc, được thưởng rút 3 lá bài!`);
            state.drawCards(killerId, 3);
          } else if (killer.isLord && deadPlayer.identity === 'loyalist') {
            state.addLog(`⚠️ Chủ Công ${killer.name} ngộ sát Trung Thần! Bị trừng phạt bỏ hết toàn bộ bài trên tay và trang bị!`);
            if (killer.hand.length > 0) {
              state.discardPile.push(...killer.hand);
              killer.hand = [];
            }
            for (const slot in killer.equipment) {
              if (killer.equipment[slot]) {
                state.discardPile.push(killer.equipment[slot]);
                killer.equipment[slot] = null;
              }
            }
          }
        }
      }
    }

    // 3. Kiểm tra điều kiện thắng trận Quốc Chiến
    this.checkGameOver(state);
  }

  /**
   * Kiểm tra điều kiện thắng cuộc Quốc Chiến:
   * 1. Nếu không còn ai sống -> Hòa
   * 2. Nếu chỉ còn 1 người sống -> Người đó thắng
   * 3. Nếu toàn bộ người sống sót cùng một Phe -> Phe đó toàn thắng (Đại Thắng Đồng Đội)
   * Khi kết thúc: Bắt buộc lật toàn bộ tướng của người sống sót để hiển thị trọn vẹn kết quả.
   */
  static checkGameOver(state) {
    const alivePlayers = state.getAlivePlayers();
    if (alivePlayers.length === 0) {
      state.gameOver = true;
      state.winner = null;
      state.addLog(`🏆 Trò chơi kết thúc! Hòa (Tất cả người chơi đều tử trận)!`);
      return true;
    }

    if (alivePlayers.length === 1) {
      const winner = alivePlayers[0];
      state.gameOver = true;
      state.winner = [winner.id];
      // Force reveal
      winner.revealedHeroes = [true, true];
      const winLabel = winner.isDaTam ? `🐺 DÃ TÂM ${winner.name}` : winner.name;
      state.addLog(`🏆 Trò chơi kết thúc! ${winLabel} là người sống sót cuối cùng và giành chiến thắng độc tôn!`);
      return true;
    }

    // Lấy phe của người chơi đầu tiên (phải là phe Quốc Chiến hợp lệ, không phải 'none')
    const firstPlayer = alivePlayers[0];
    const firstFaction = firstPlayer.faction;
    const isValidFaction = Boolean(firstFaction) && firstFaction !== 'none';

    // Kiểm tra xem tất cả người còn sống có cùng phe hợp lệ hay không VÀ không ai là Dã Tâm
    const allSameFaction = isValidFaction && alivePlayers.every(p => p.faction === firstFaction && !p.isDaTam);
    if (allSameFaction) {
      state.gameOver = true;
      state.winner = alivePlayers.map(p => p.id);
      // Force reveal toàn bộ người sống sót
      alivePlayers.forEach(p => {
        p.revealedHeroes = [true, true];
      });
      state.addLog(`🏆 TRÒ CHƠI KẾT THÚC! PHE ${firstFaction.toUpperCase()} ĐẠI THẮNG ĐỒNG ĐỘI!`);
      return true;
    }

    return false;
  }
}
