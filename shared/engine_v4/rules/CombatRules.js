/**
 * CombatRules.js
 * Xử lý Toàn Bộ Quy Tắc Chiến Đấu, Sát Thương & Hấp Hối trong Việt Sát v4.
 * Tích hợp chặt chẽ với PriorityStack và GameInvariants.
 */

import { RangeSystem } from './RangeSystem.js';
import { GameInvariants } from '../core/Invariants.js';
import { globalHeroRegistry, getPlayerGender } from '../heroes/HeroRegistry.js';
import { 
  isSameFaction, 
  getCanonicalFaction, 
  getFactionLabel,
  normalizeSuit,
  getSuitColor,
  isSameSuit,
  isEquip,
  normalizeEquipKey,
  isTrick
} from '../../utils/translationHelper.js';

export class CombatRules {
  /**
   * Thực hiện hành động Đánh [Chém] từ Source lên Target
   */
  static playSlash(state, sourceId, targetId, card, options = {}) {
    const source = state.getPlayer(sourceId);
    const target = state.getPlayer(targetId);
    const alivePlayers = state.getAlivePlayers();

    if (!source || !target || !source.isAlive || !target.isAlive) {
      throw new Error(`[CombatRules] Người chơi không hợp lệ hoặc đã tử trận.`);
    }

    if (target.hp <= 0) {
      throw new Error(`[CombatRules] Mục tiêu ${target.name} đang trong trạng thái Hấp Hối (HP: ${target.hp}), không thể tấn công!`);
    }

    const hasDoiNui = globalHeroRegistry.hasSkill(source, 'doi_nui', true) && (card?.name === 'Né' || card?.type === 'dodge');
    const effColor = card && source ? globalHeroRegistry.getEffectiveColor(source, card) : card?.color;
    const isRed = effColor ? effColor === 'red' : Boolean(card && (card.color === 'red' || getSuitColor(card.suit) === 'red'));
    const hasKhaiThien = globalHeroRegistry.hasSkill(source, 'khai_thien', true) && isRed;
    const isSlash = card?.name === 'Chém' || card?.type === 'slash' || card?.idKey === 'slash' || card?.idKey === 'chem' || card?.id?.includes('slash') || card?.id?.includes('chem') || card?.virtual || options.asSlash || hasDoiNui || hasKhaiThien;
    if (!isSlash) {
      throw new Error(`[CombatRules] Lá bài [${card?.name || card?.id}] không phải là lá [Chém] hợp lệ!`);
    }

    // Kiểm tra cấm Chém do thua Đấu Điểm Vân Đồn
    if (source.temporaryFlags?.vanDonLose) {
      throw new Error(`[CombatRules] ${source.name} đã thất bại trong đấu điểm [Vân Đồn], không thể Chém trong lượt này!`);
    }

    // 0. Kiểm tra Đạm Bạc (Lang Liêu) của Target
    if (globalHeroRegistry.hasSkill(target, 'dam_bac', true) && (!target.hand || target.hand.length === 0)) {
      throw new Error(`[CombatRules] ${target.name} đang kích hoạt [Đạm Bạc] (hết bài trên tay), không thể bị Chém!`);
    }

    // 1. Kiểm tra tầm đánh (Bỏ qua nếu là đòn Chém vô hạn cự ly như Dưỡng Quân hoặc thắng Vân Đồn)
    const isInfiniteRange = options.infiniteRange || card?.infiniteRange || Boolean(source.temporaryFlags?.vanDonWin);
    if (!isInfiniteRange && !RangeSystem.inSlashRange(source, target, alivePlayers, card)) {
      const dist = RangeSystem.calculateDistance(source, target, alivePlayers);
      const range = RangeSystem.getAttackRange(source, card);
      throw new Error(`[CombatRules] Mục tiêu nằm ngoài tầm đánh! (Khoảng cách: ${dist}, Tầm đánh: ${range})`);
    }

    // 2. Kiểm tra giới hạn Chém trong lượt
    if (!options.isRedirected && !card?.virtual && !options.skipSlashCount) {
      source.turnStats.slashCount = (source.turnStats.slashCount || 0) + 1;
      GameInvariants.assertSlashLimit(source);
    }

    // 3. Trừ lá bài trên tay Source (nếu chưa trừ trước và không phải lá ảo)
    if (!options.alreadyDiscardedCard && !card?.virtual) {
      state.discardFromHand(sourceId, [card.id]);
      state.addLog(`${source.name} đánh [Chém] lên ${target.name}.`);
    } else {
      state.addLog(`${source.name} dùng cùng lá [Chém] nhắm vào ${target.name}.`);
    }

    // 4. Kiểm tra Giáp Hắc Thuẫn của Target (Miễn nhiễm Chém màu Đen: ♠, ♣)
    const targetArmor = target.equipment?.armor;
    const effSuit = globalHeroRegistry.getEffectiveSuit(source, card);
    const isBlackSlash = effSuit === 'spade' || effSuit === 'club' || effSuit === '♠' || effSuit === '♣' || effColor === 'black';
    const isHacThuan = targetArmor && (
      targetArmor.name === 'Hắc Thuẫn' || 
      isEquip(targetArmor, 'hac_thuan') ||
      targetArmor.id === 'black_shield' || 
      targetArmor.key === 'black_shield' ||
      targetArmor.idKey === 'hac_thuan' ||
      targetArmor.idKey === 'black_shield' ||
      targetArmor.id?.includes('black_shield') ||
      targetArmor.id?.includes('hac_thuan') ||
      targetArmor.id?.includes('hac-thuan') ||
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
      isEquip(sourceWeapon, 'song_kiem') ||
      sourceWeapon.idKey === 'song_kiem' ||
      sourceWeapon.idKey === 'song-kiem' ||
      sourceWeapon.id?.includes('song_kiem') || 
      sourceWeapon.id?.includes('song-kiem') ||
      sourceWeapon.id?.includes('song-kiếm') ||
      sourceWeapon.key === 'song-kiem' ||
      sourceWeapon.key === 'song_kiem'
    );
    let pendingSongKiemSkill = false;
    if (isSongKiem) {
      const pGender = getPlayerGender(source);
      const tGender = getPlayerGender(target);
      if (pGender !== 'none' && tGender !== 'none' && pGender !== tGender) {
        const hasHand = target.hand && target.hand.length > 0;
        const hasEquip = target.equipment && Object.values(target.equipment).some(Boolean);
        if (!hasHand && !hasEquip) {
          state.drawCards(source.id, 1);
          state.addLog(`⚔️ [Song Kiếm] ${target.name} không có bài để bỏ, ${source.name} được rút 1 lá bài!`);
        } else if (options.songKiemDiscardCardId) {
          state.discardFromHand(target.id, [options.songKiemDiscardCardId]);
          state.addLog(`⚔️ [Song Kiếm] ${target.name} bỏ 1 lá bài chỉ định.`);
        } else if (options.useSongKiem === false || options.skipSongKiemDiscard) {
          state.drawCards(source.id, 1);
          state.addLog(`⚔️ [Song Kiếm] ${target.name} không bỏ bài, ${source.name} được rút 1 lá bài!`);
        } else if (options.interactiveSongKiem) {
          pendingSongKiemSkill = true;
        } else {
          if (hasHand) {
            const [discarded] = target.hand.splice(0, 1);
            state.discardPile.push(discarded);
            state.addLog(`⚔️ [Song Kiếm] ${target.name} khác giới tính với ${source.name}, bị ép bỏ 1 lá bài [${discarded.name || discarded.id}]!`);
          } else if (hasEquip) {
            const slot = Object.keys(target.equipment).find(k => target.equipment[k]);
            const removed = target.equipment[slot];
            target.equipment[slot] = null;
            state.discardPile.push(removed);
            if (isEquip(removed, 'bach_ngan') || removed.name === 'Bạch Ngân' || removed.name === 'Bạch Ngân Sư Tử') {
              target.hp = Math.min(target.maxHp, target.hp + 1);
              state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${target.name}, hồi 1 HP!`);
            }
            globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: target.id, card: removed }, state);
            state.addLog(`⚔️ [Song Kiếm] ${target.name} bị ép tháo bỏ trang bị [${removed.name || removed.id}]!`);
          }
        }
      }
    }

    // 6. Kiểm tra Vũ khí: Phương Thiên Kích (Sky Halberd - Chém bài cuối cùng trên tay)
    const isPhuongThien = sourceWeapon && (
      sourceWeapon.name === 'Phương Thiên Kích' ||
      isEquip(sourceWeapon, 'phuong_thien_kich') ||
      sourceWeapon.idKey === 'phuong_thien_kich' ||
      sourceWeapon.idKey === 'phuong-thien-kich' ||
      sourceWeapon.id?.includes('phuong_thien') ||
      sourceWeapon.id?.includes('phuong-thien') ||
      sourceWeapon.id?.includes('phương-thiên') ||
      sourceWeapon.key === 'phuong-thien-kich' ||
      sourceWeapon.key === 'phuong_thien_kich'
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
      damageAmount: (source.temporaryFlags?.wineActive ? 2 : 1) + (source.temporaryFlags?.bonusDamage || 0),
      requiredDodges: source.skills?.includes('pha_quan_nguyen_xi') ? 2 : 1,
      unavoidable: false
    };
    globalHeroRegistry.dispatchTrigger('ON_SLASH_TARGET', slashEvent, state);

    // Nếu cú Chém bị khóa không thể Né (Nỏ Thần, v.v.) -> Gây sát thương trực tiếp
    if (slashEvent.unavoidable) {
      state.addLog(`🎯 Cú Chém của ${source.name} không thể Né!`);
      this.applyDamage(state, sourceId, targetId, slashEvent.damageAmount, 'slash', false, card);
      if (source.temporaryFlags?.wineActive) {
        source.temporaryFlags.wineActive = false;
      }
      return { success: true, unavoidable: true };
    }

    // 7.5. Nếu mục tiêu là Công Chúa An Tư sở hữu [Xả Thân]: Bỏ 1 bài chuyển hướng Chém
    const hasXaThan = globalHeroRegistry.hasSkill(target, 'xa_than', true) || 
                      globalHeroRegistry.hasSkill(target, 'xa_than_an_tu', true) ||
                      globalHeroRegistry.hasSkill(target, 'xa-than', true);
    const targetCardsCount = (target.hand?.length || 0) + (target.equipment ? Object.values(target.equipment).filter(Boolean).length : 0);
    const validRedirects = alivePlayers.filter(p => p.id !== target.id && p.id !== source.id && RangeSystem.inSlashRange(target, p, alivePlayers));

    if (hasXaThan && targetCardsCount > 0 && validRedirects.length > 0 && !options.skipXaThan) {
      state.priorityStack.push({
        type: 'ASK_XA_THAN',
        sourceId,
        targetId,
        currentActorId: targetId,
        priorityQueue: [targetId],
        context: {
          attackerId: sourceId,
          card,
          validTargets: validRedirects.map(p => p.id),
          slashEvent
        }
      });
      state.addLog(`🕊️ [Xả Thân] ${target.name} có thể bỏ 1 lá bài để chuyển hướng cú [Chém] sang người khác!`);
      if (source.temporaryFlags?.wineActive) {
        source.temporaryFlags.wineActive = false;
      }
      return { success: true, pendingXaThan: true };
    }

    // 8. Đẩy Frame yêu cầu Né (ASK_DODGE) vào PriorityStack
    state.priorityStack.push({
      type: 'ASK_DODGE',
      sourceId,
      targetId,
      currentActorId: targetId,
      priorityQueue: [targetId],
      context: {
        card,
        requiredDodges: slashEvent.requiredDodges,
        dodgesProvided: 0,
        damageAmount: slashEvent.damageAmount
      }
    });

    // 9. Nếu Thánh Gióng phát động [Tre Ngà] -> Đẩy Frame ASK_TRE_NGA_DISCARD lên đỉnh stack
    if (slashEvent.treNgaJudgeSuit) {
      state.priorityStack.push({
        type: 'ASK_TRE_NGA_DISCARD',
        sourceId,
        targetId,
        currentActorId: targetId,
        priorityQueue: [targetId],
        context: {
          judgeSuit: slashEvent.treNgaJudgeSuit
        }
      });
    }

    // 10. Nếu Song Kiếm kích hoạt tương tác khác giới -> Đẩy Frame ASK_WEAPON_SKILL lên đỉnh stack
    if (pendingSongKiemSkill) {
      state.priorityStack.push({
        type: 'ASK_WEAPON_SKILL',
        sourceId,
        targetId,
        currentActorId: targetId,
        priorityQueue: [targetId],
        context: {
          weapon: 'Song Kiếm',
          weaponName: 'Song Kiếm'
        }
      });
      state.addLog(`⚔️ [Song Kiếm] ${target.name} khác giới tính với ${source.name}! ${target.name} có thể bỏ 1 lá bài hoặc để ${source.name} rút 1 lá.`);
    }

    // Reset cờ Rượu sau khi đã chém
    if (source.temporaryFlags?.wineActive) {
      source.temporaryFlags.wineActive = false;
    }

    return { success: true };
  }

  /**
   * Phản hồi Xả Thân (Công Chúa An Tư chuyển hướng Chém)
   */
  static respondXaThan(state, targetId, discardCard = null, redirectedTargetId = null) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_XA_THAN' || frame.currentActorId !== targetId) {
      throw new Error(`[CombatRules] Không có yêu cầu Xả Thân hợp lệ cho người chơi ${targetId}`);
    }

    state.priorityStack.pop();

    const target = state.getPlayer(targetId);
    const sourceId = frame.sourceId;
    const card = frame.context.card;
    const slashEvent = frame.context.slashEvent;

    if (discardCard && redirectedTargetId !== null && redirectedTargetId !== undefined) {
      const validTargets = frame.context?.validTargets || [];
      if (validTargets.length > 0 && !validTargets.includes(redirectedTargetId)) {
        throw new Error(`[CombatRules] Mục tiêu chuyển hướng ${redirectedTargetId} không hợp lệ hoặc ngoài tầm công kích!`);
      }

      const redirectedTarget = state.getPlayer(redirectedTargetId);
      const cardId = discardCard.id || discardCard;
      if (target.hand && target.hand.some(c => c.id === cardId)) {
        state.discardFromHand(targetId, [cardId]);
      } else if (target.equipment) {
        for (const slot in target.equipment) {
          if (target.equipment[slot]?.id === cardId) {
            const eqCard = target.equipment[slot];
            target.equipment[slot] = null;
            state.discardPile.push(eqCard);
            if (isEquip(eqCard, 'bach_ngan') || eqCard.name === 'Bạch Ngân' || eqCard.name === 'Bạch Ngân Sư Tử' || eqCard.idKey === 'bach_ngan' || eqCard.id?.includes('bach_ngan')) {
              target.hp = Math.min(target.maxHp, target.hp + 1);
              state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${target.name}, hồi 1 HP!`);
            }
            globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId, card: eqCard }, state);
            break;
          }
        }
      } else {
        state.discardFromHand(targetId, [cardId]);
      }

      state.addLog(`🕊️ [Xả Thân] ${target.name} bỏ 1 lá bài, đem cú [Chém] chuyển hướng sang ${redirectedTarget.name}!`);

      state.priorityStack.push({
        type: 'ASK_DODGE',
        sourceId,
        targetId: redirectedTargetId,
        currentActorId: redirectedTargetId,
        priorityQueue: [redirectedTargetId],
        context: {
          card,
          requiredDodges: slashEvent.requiredDodges || 1,
          dodgesProvided: 0,
          damageAmount: slashEvent.damageAmount || 1
        }
      });
      return { redirected: true, redirectedTargetId };
    } else {
      // Từ chối -> Tiếp tục đòn Chém lên An Tư
      state.priorityStack.push({
        type: 'ASK_DODGE',
        sourceId,
        targetId,
        currentActorId: targetId,
        priorityQueue: [targetId],
        context: {
          card,
          requiredDodges: slashEvent.requiredDodges || 1,
          dodgesProvided: 0,
          damageAmount: slashEvent.damageAmount || 1
        }
      });
      return { redirected: false };
    }
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
      const allies = state.players.filter(p =>
        p.id !== targetId &&
        p.isAlive &&
        !p.isDaTam &&
        (p.revealedHeroes ? p.revealedHeroes.some(Boolean) : p.isRevealed !== false) &&
        getCanonicalFaction(p.faction) === 'lac'
      );
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
      const allies = state.players.filter(p =>
        p.id !== targetId &&
        p.isAlive &&
        !p.isDaTam &&
        (p.revealedHeroes ? p.revealedHeroes.some(Boolean) : p.isRevealed !== false) &&
        getCanonicalFaction(p.faction) === 'viet'
      );
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

    const aoe = frame.context?.aoeResult;

    // 1. Phán xét Bát Quái / Thần Giáp (Rùa Vàng)
    if (options.useBagua || options.doBagua) {
      const hasBaguaArmor = target.equipment?.armor && (
        target.equipment.armor.name === 'Bát Quái' ||
        isEquip(target.equipment.armor, 'bat_quai') ||
        target.equipment.armor.id === 'bat_quai' ||
        target.equipment.armor.idKey === 'bat_quai' ||
        target.equipment.armor.key === 'bat_quai' ||
        target.equipment.armor.id?.includes('bat_quai') ||
        target.equipment.armor.id?.includes('bat-quai') ||
        target.equipment.armor.id?.includes('bát-quái')
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

      const isRed = judgeCard.color === 'red' || getSuitColor(judgeCard.suit) === 'red';

      if (isRed) {
        frame.context.dodgesProvided += 1;
        state.addLog(`☯️ [Bát Quái / Thần Giáp] Phán xét ĐỎ (${judgeCard.name || judgeCard.id} ${judgeCard.suit || ''})! Tính như 1 lá [Né] (${frame.context.dodgesProvided}/${frame.context.requiredDodges}).`);

        if (frame.context.dodgesProvided >= frame.context.requiredDodges) {
          state.priorityStack.pop();
          state.addLog(`${target.name} đã né thành công ${frame.context?.reason === 'van-tien' ? '[Loạn Tiễn]' : 'cú Chém'} nhờ [Bát Quái]!`);
          globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', { sourceId: frame.sourceId, targetId, card: judgeCard }, state);
          if (aoe) {
            aoe.defended.push(`${target.name} (Bát Quái)`);
            if (aoe.defended.length + aoe.damaged.length >= aoe.total) {
              state.addLog(`🏹 [Loạn Tiễn] Kết thúc: ${aoe.defended.length > 0 ? aoe.defended.join(', ') + ' né thành công; ' : ''}${aoe.damaged.length > 0 ? aoe.damaged.join(', ') + ' mất máu!' : 'không ai mất máu!'}`);
            }
          }
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
      const isNegate = (isTrick(dodgeCard, 'hoa_giai') ||
        dodgeCard.virtualCardName === 'Hóa Giải' || (options && (options.virtualCardName === 'Hóa Giải' || options.activeSkill === 'Linh Giám' || options.asNegate))) && frame.context?.reason === 'van-tien';
      if (isNegate) {
        state.discardFromHand(targetId, [dodgeCard.id]);
        state.priorityStack.pop();
        state.addLog(`🛡️ ${target.name} dùng lá [Hóa Giải] hóa giải thành công [Loạn Tiễn] cho riêng mình!`);
        if (aoe) aoe.defended.push(`${target.name} (Hóa Giải)`);
        if (aoe && (aoe.defended.length + aoe.damaged.length >= aoe.total)) {
          const sumText = aoe.damaged.length === 0
            ? `🎯 [Vạn Tiễn]: ${aoe.defended.join(', ')} đều dùng [Né] cản đòn!`
            : (aoe.defended.length === 0
              ? `🎯 [Vạn Tiễn]: ${aoe.damaged.join(', ')} đều không có Né, mất máu!`
              : `🎯 [Vạn Tiễn]: ${aoe.defended.join(', ')} dùng [Né] cản; ${aoe.damaged.join(', ')} mất máu!`);
          state.addLog(sumText);
        }
        return { dodged: true, negatedSingle: true };
      }
      const hasDoiNui = globalHeroRegistry.hasSkill(target, 'doi_nui', true) && (dodgeCard.name === 'Chém' || dodgeCard.type === 'slash');
      const effColor = dodgeCard && target ? globalHeroRegistry.getEffectiveColor(target, dodgeCard) : dodgeCard?.color;
      const isBlackCard = effColor ? effColor === 'black' : Boolean(dodgeCard && (dodgeCard.color === 'black' || getSuitColor(dodgeCard.suit) === 'black'));
      const hasThinhChinh = (globalHeroRegistry.hasSkill(target, 'thinh_chinh', true) || target.skills?.includes('thinh_chinh')) && isBlackCard;
      const isDodge = dodgeCard.name === 'Né' || dodgeCard.type === 'dodge' || dodgeCard.idKey === 'ne' || dodgeCard.idKey === 'dodge' || dodgeCard.id?.includes('dodge') || dodgeCard.id?.includes('ne') || hasDoiNui || hasThinhChinh;
      if (!isDodge) {
        throw new Error(`[CombatRules] Lá bài [${dodgeCard.name || dodgeCard.id}] không phải là lá [Né] hợp lệ!`);
      }
      // Người chơi cung cấp lá Né hợp lệ
      state.discardFromHand(targetId, [dodgeCard.id]);
      frame.context.dodgesProvided += 1;
      state.addLog(`${target.name} đánh ra lá [Né] (${frame.context.dodgesProvided}/${frame.context.requiredDodges}).`);

      if (frame.context.dodgesProvided >= frame.context.requiredDodges) {
        // Né thành công hoàn toàn -> Pop frame
        state.priorityStack.pop();
        const attackName = frame.context?.card?.name || (frame.context?.reason === 'van-tien' ? 'Loạn Tiễn' : 'cú Chém');
        state.addLog(`${target.name} đã né thành công ${attackName === 'cú Chém' ? 'cú Chém' : `[${attackName}]`}!`);
        if (aoe) aoe.defended.push(target.name);
        if (aoe && (aoe.defended.length + aoe.damaged.length >= aoe.total)) {
          const sumText = aoe.damaged.length === 0
            ? `🎯 [Vạn Tiễn]: ${aoe.defended.join(', ')} đều dùng [Né] cản đòn!`
            : (aoe.defended.length === 0
              ? `🎯 [Vạn Tiễn]: ${aoe.damaged.join(', ')} đều không có Né, mất máu!`
              : `🎯 [Vạn Tiễn]: ${aoe.defended.join(', ')} dùng [Né] cản; ${aoe.damaged.join(', ')} mất máu!`);
          state.addLog(sumText);
        }
        globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', { sourceId: frame.sourceId, targetId, card: dodgeCard }, state);
        return this._handlePostDodgeWeapons(state, frame, target, options);
      }
      return { dodged: false, pendingMoreDodges: true };
    } else {
      // Người chơi chọn Không Né / Không có Né -> Nhận sát thương!
      const damageAmount = frame.context.damageAmount || 1;
      const sourceId = frame.sourceId;
      const damageType = frame.context?.reason === 'van-tien' ? 'arrow_rain' : 'slash';

      state.priorityStack.pop(); // Giải phóng frame ASK_DODGE
      if (aoe) aoe.damaged.push(target.name);
      if (aoe && (aoe.defended.length + aoe.damaged.length >= aoe.total)) {
        const sumText = aoe.damaged.length === 0
          ? `🎯 [Vạn Tiễn]: ${aoe.defended.join(', ')} đều dùng [Né] cản đòn!`
          : (aoe.defended.length === 0
            ? `🎯 [Vạn Tiễn]: ${aoe.damaged.join(', ')} đều không có Né, mất máu!`
            : `🎯 [Vạn Tiễn]: ${aoe.defended.join(', ')} dùng [Né] cản; ${aoe.damaged.join(', ')} mất máu!`);
        state.addLog(sumText);
      }
      this.applyDamage(state, sourceId, targetId, damageAmount, damageType, false, frame.context?.card || null);
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
        const dodgeFrame = state.priorityStack.peek();
        if (dodgeFrame && dodgeFrame.context) {
          dodgeFrame.context.bocTramTrungFailed = true;
        }
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
        const dodgeFrame = state.priorityStack.peek();
        if (dodgeFrame && dodgeFrame.context) {
          dodgeFrame.context.tienPhatFailed = true;
        }
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

      if (frame.context?.isInitiatedAttack) {
        llq.turnStats = llq.turnStats || {};
        llq.turnStats.slashCount = (llq.turnStats.slashCount || 0) + 1;
        const targetId = frame.targetId;
        this.playSlash(state, llq.id, targetId, { ...slashCard, name: 'Chém', type: 'slash', virtual: true }, { isVirtualSlash: true });
        return { slashed: true };
      }

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
        if (frame.context?.isInitiatedAttack) {
          state.addLog(`🐉 Đồng minh hệ Lạc không ai ra [Chém] giùm cho ${llq.name}. ${llq.name} vẫn có thể tự mình dùng bài!`);
          return { slashed: false };
        }
        const underlyingFrame = state.priorityStack.peek();
        if (underlyingFrame && underlyingFrame.context) {
          underlyingFrame.context.bocTramTrungFailed = true;
        }
        state.addLog(`🐉 Đồng minh hệ Lạc không có ai ra [Chém] giùm cho ${llq.name}!`);
        return { slashed: false };
      }
    }
  }

  /**
   * Xử lý hiệu ứng Vũ Khí sau khi mục tiêu Né thành công (Rìu Đá, Thanh Long Đao)
   */
  static _handlePostDodgeWeapons(state, frame, target, options = {}) {
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
    const weaponKey = sourceWeapon?.idKey || sourceWeapon?.key || '';

    // 1. Rìu Đá (Rock Axe): Bỏ 2 lá bài để bắt buộc Chém trúng đích (xuyên giáp)
    const isRiuDa = weaponName === 'Rìu Đá' || weaponName === 'Quán Thạch Phủ' || 
      isEquip(sourceWeapon, 'riu_da') ||
      weaponId.includes('riu_da') || weaponId.includes('riu-da') || weaponId.includes('rìu-đá') ||
      weaponKey === 'riu-da' || weaponKey === 'riu_da';
    if (isRiuDa) {
      if (options.useRockAxe === false) {
        return { dodged: true };
      }
      if (options.rockAxeCardIds && Array.isArray(options.rockAxeCardIds) && options.rockAxeCardIds.length === 2) {
        state.discardFromHand(source.id, options.rockAxeCardIds);
        state.addLog(`🪓 [Rìu Đá] ${source.name} bỏ 2 lá bài chỉ định để xuyên phá cú Né của ${target.name}!`);
        this.applyDamage(state, source.id, target.id, frame.context.damageAmount || 1, 'slash_penetrate', false, frame.context?.card);
        return { dodged: false, penetrated: true };
      }
      if (options.autoResolveWeapons && source.hand && source.hand.length >= 2) {
        const discards = source.hand.slice(0, 2);
        state.discardFromHand(source.id, discards.map(c => c.id));
        state.addLog(`🪓 [Rìu Đá] ${source.name} bỏ 2 lá bài [${discards.map(c => c.name).join(', ')}] để xuyên phá cú Né của ${target.name}!`);
        this.applyDamage(state, source.id, target.id, frame.context.damageAmount || 1, 'slash_penetrate', false, frame.context?.card);
        return { dodged: false, penetrated: true };
      }

      // Luồng tương tác chuẩn: Đẩy ASK_WEAPON_SKILL nếu source có đủ >= 2 lá bài (tay + trang bị trừ Rìu Đá)
      const handCount = source.hand?.length || 0;
      const equipCards = Object.values(source.equipment || {}).filter(c => c && c.id !== sourceWeapon.id);
      if (handCount + equipCards.length >= 2) {
        state.priorityStack.push({
          type: 'ASK_WEAPON_SKILL',
          sourceId: source.id,
          targetId: target.id,
          currentActorId: source.id,
          priorityQueue: [source.id],
          context: {
            weapon: 'Rìu Đá',
            weaponName: 'Rìu Đá',
            damageAmount: frame.context.damageAmount || 1,
            slashCard: frame.context?.card || null
          }
        });
        state.addLog(`🪓 [Rìu Đá] ${source.name} có thể bỏ 2 lá bài để xuyên phá cú Né của ${target.name}!`);
        return { dodged: true, pendingWeaponSkill: true };
      }
    }

    // 2. Thanh Long Đao: Chém bị Né -> Được Chém tiếp nếu còn bài Chém trên tay
    const isThanhLong = weaponName === 'Thanh Long Đao' || 
      isEquip(sourceWeapon, 'thanh_long_dao') ||
      weaponId.includes('thanh_long') || weaponId.includes('thanh-long') || weaponId.includes('thanh-long-đao') ||
      weaponKey === 'thanh-long-dao' || weaponKey === 'thanh_long_dao';
    if (isThanhLong) {
      if (options.useDragonBlade === false) {
        return { dodged: true };
      }
      if (options.dragonBladeCardId) {
        const nextSlash = source.hand?.find(c => c.id === options.dragonBladeCardId);
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
      if (options.autoResolveWeapons) {
        const nextSlash = source.hand?.find(c => c.type === 'slash' || c.name === 'Chém' || c.idKey === 'slash');
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

      // Luồng tương tác chuẩn: Đẩy ASK_WEAPON_SKILL nếu source có bài Chém (hoặc kỹ năng biến Chém)
      const hasDoiNui = globalHeroRegistry.hasSkill(source, 'doi_nui', true);
      const hasKhaiThien = globalHeroRegistry.hasSkill(source, 'khai_thien', true);
      const isRed = c => {
        if (!c) return false;
        const col = globalHeroRegistry.getEffectiveColor(source, c);
        return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
      };
      const canSlash = source.hand?.some(c => 
        c.type === 'slash' || c.name === 'Chém' || c.idKey === 'slash' ||
        (hasDoiNui && (c.name === 'Né' || c.type === 'dodge')) ||
        (hasKhaiThien && isRed(c))
      );

      if (canSlash) {
        state.priorityStack.push({
          type: 'ASK_WEAPON_SKILL',
          sourceId: source.id,
          targetId: target.id,
          currentActorId: source.id,
          priorityQueue: [source.id],
          context: {
            weapon: 'Thanh Long Đao',
            weaponName: 'Thanh Long Đao',
            damageAmount: 1
          }
        });
        state.addLog(`🐉 [Thanh Long Đao] ${source.name} có thể đánh tiếp lá [Chém] thứ hai lên ${target.name}!`);
        return { dodged: true, pendingWeaponSkill: true };
      }
    }

    return { dodged: true };
  }

  /**
   * Áp dụng Sát thương lên Target (Hỗ trợ truyền sát thương Xiềng Xích)
   */
  static applyDamage(state, sourceId, targetId, amount = 1, reason = 'normal', isChainedPropagation = false, card = null) {
    const target = state.getPlayer(targetId);
    const source = sourceId !== null ? state.getPlayer(sourceId) : null;
    if (!target || !target.isAlive) return;

    // Kiểm tra kỹ năng Hiền Hậu (Ngọc Hân Công Chúa): Chặn sát thương nếu có bài Cơ (hoặc Bích do Quốc Sắc)
    if ((globalHeroRegistry.hasSkill(target, 'hien_hau', true) || target.skills?.includes('hien_hau')) && !target.temporaryFlags?.hienHauAttempted) {
      const hasHeartOrSpade = target.hand?.some(c => {
        const effSuit = globalHeroRegistry.getEffectiveSuit(target, c) || c.suit;
        return normalizeSuit(effSuit).code === 'heart';
      });
      if (hasHeartOrSpade) {
        state.priorityStack.push({
          type: 'ASK_HIEN_HAU',
          sourceId: targetId,
          targetId: targetId,
          currentActorId: targetId,
          priorityQueue: [targetId],
          context: {
            attackerId: sourceId,
            damageAmount: amount,
            reason,
            isChainedPropagation,
            card
          }
        });
        return;
      }
    }

    // 1. Quạt Sắt: Nếu mục tiêu ĐANG KHÔNG CÓ BÀI TRÊN TAY, sát thương tăng thêm +1
    if (source && reason.startsWith('slash')) {
      const sourceWeapon = source.equipment?.weapon;
      const isQuatSat = sourceWeapon && (
        sourceWeapon.name === 'Quạt Sắt' ||
        sourceWeapon.name === 'Cổ Đĩnh Đao' ||
        isEquip(sourceWeapon, 'quat_sat') ||
        sourceWeapon.idKey === 'quat_sat' ||
        sourceWeapon.idKey === 'quat-sat' ||
        sourceWeapon.idKey === 'co_dinh_dao' ||
        sourceWeapon.id?.includes('quat_sat') ||
        sourceWeapon.id?.includes('quat-sat') ||
        sourceWeapon.id?.includes('quạt-sắt') ||
        sourceWeapon.id?.includes('cổ-đĩnh-đao') ||
        sourceWeapon.key === 'quat-sat' ||
        sourceWeapon.key === 'quat_sat'
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
      targetArmor.name === 'Bạch Ngân Sư Tử' ||
      isEquip(targetArmor, 'bach_ngan') ||
      targetArmor.id?.includes('bach_ngan') ||
      targetArmor.id?.includes('bach-ngan') ||
      targetArmor.id?.includes('bạch-ngân') ||
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

    // 4. Kỳ Lân Cung (Kirin Bow): Bắn hạ Ngựa của mục tiêu khi Chém gây sát thương
    if (source && (reason === 'slash' || reason.startsWith('slash'))) {
      const sourceWeapon = source.equipment?.weapon;
      const isKirinBow = sourceWeapon && (
        sourceWeapon.name === 'Kỳ Lân Cung' ||
        isEquip(sourceWeapon, 'ky_lan_cung') ||
        sourceWeapon.idKey === 'ky_lan_cung' ||
        sourceWeapon.idKey === 'ky-lan-cung' ||
        sourceWeapon.id?.includes('ky_lan') ||
        sourceWeapon.id?.includes('ky-lan') ||
        sourceWeapon.id?.includes('kỳ-lân') ||
        sourceWeapon.id?.includes('wp_bow') ||
        sourceWeapon.key === 'ky-lan-cung' ||
        sourceWeapon.key === 'ky_lan_cung'
      );
      if (isKirinBow) {
        if (target.equipment?.horse_defense) {
          const horse = target.equipment.horse_defense;
          target.equipment.horse_defense = null;
          state.discardPile.push(horse);
          state.addLog(`🏹 [Kỳ Lân Cung] ${source.name} bắn hạ [${horse.name || 'Ngựa Thần (+1)'}] của ${target.name}!`);
          globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: target.id, card: horse }, state);
        } else if (target.equipment?.horse_attack) {
          const horse = target.equipment.horse_attack;
          target.equipment.horse_attack = null;
          state.discardPile.push(horse);
          state.addLog(`🏹 [Kỳ Lân Cung] ${source.name} bắn hạ [${horse.name || 'Ngựa Chiến (-1)'}] của ${target.name}!`);
          globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: target.id, card: horse }, state);
        }
      }
    }

    // Kiểm tra Trạng thái Hấp hối (Dying State) khi HP <= 0
    if (target.hp <= 0) {
      this.enterDyingState(state, targetId, sourceId);
    }

    // Kích hoạt kỹ năng phản ứng khi chịu sát thương (chỉ kích hoạt nếu tướng còn sống và đã thoát khỏi hấp hối)
    if (target.isAlive && target.hp > 0) {
      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', { sourceId, targetId, damageAmount: amount, reason, card }, state);
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
      const isWine = peachCard.name === 'Rượu' || peachCard.type === 'wine' || peachCard.idKey === 'wine' || peachCard.idKey === 'ruou' || peachCard.id?.includes('wine') || peachCard.id?.includes('ruou');
      const isPeach = peachCard.name === 'Đào' || peachCard.type === 'peach' || peachCard.idKey === 'peach' || peachCard.idKey === 'dao' || peachCard.id?.includes('peach') || peachCard.id?.includes('dao');
      const hasNamDuoc = globalHeroRegistry.hasSkill(rescuer, 'nam_duoc', true) && state.currentTurnPlayerId !== rescuerId;
      const effColor = peachCard && rescuer ? globalHeroRegistry.getEffectiveColor(rescuer, peachCard) : peachCard.color;
      const isRed = effColor ? effColor === 'red' : Boolean(peachCard.color === 'red' || getSuitColor(peachCard.suit) === 'red');
      const isNamDuocPeach = hasNamDuoc && isRed;

      if (!isWine && !isPeach && !isNamDuocPeach) {
        throw new Error(`[CombatRules] Lá bài [${peachCard.name || peachCard.id}] không thể dùng để cứu người hấp hối!`);
      }

      if (isWine && rescuerId !== dyingPlayer.id) {
        throw new Error(`[CombatRules] Rượu chỉ được dùng để tự cứu chính mình khi hấp hối!`);
      }

      state.discardFromHand(rescuerId, [peachCard.id]);
      dyingPlayer.hp += 1;
      const cardLabel = isWine ? 'Rượu' : (isNamDuocPeach ? `Nam Dược (${peachCard.name})` : 'Đào');
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
    deadPlayer.revealedHeroes = [true, true];
    deadPlayer.isRevealed = true;

    const h1 = globalHeroRegistry.getHero(deadPlayer.mainHeroId || deadPlayer.heroId);
    const h2 = globalHeroRegistry.getHero(deadPlayer.subHeroId);
    const heroNames = [h1?.name, h2?.name].filter(Boolean).join(' & ') || 'Võ Tướng';
    const deadFaction = deadPlayer.faction || h1?.faction || deadPlayer.identity;
    state.addLog(`💀 [${deadPlayer.name}] (${heroNames}) ĐÃ TỬ TRẬN! Phe phái: [${(deadFaction || 'Vô danh').toUpperCase()}].`);

    // 1. Dọn dẹp tất cả các frame trong priorityStack liên quan đến người chơi đã tử trận
    if (state.priorityStack && Array.isArray(state.priorityStack._stack)) {
      const stack = state.priorityStack._stack;
      for (let i = stack.length - 1; i >= 0; i--) {
        const frame = stack[i];
        if (!frame) continue;

        if (Array.isArray(frame.priorityQueue)) {
          frame.priorityQueue = frame.priorityQueue.filter(id => id !== deadPlayerId);
        }

        if (frame.type === 'ASK_SLASH_DUEL') {
          if (frame.context?.p1 === deadPlayerId || frame.context?.p2 === deadPlayerId || frame.sourceId === deadPlayerId || frame.targetId === deadPlayerId || frame.context?.attackerId === deadPlayerId) {
            stack.splice(i, 1);
            continue;
          }
        }

        // Nếu frame nhắm vào người chơi đã chết và không còn ai khác trong priorityQueue
        if (frame.targetId === deadPlayerId && (!Array.isArray(frame.priorityQueue) || frame.priorityQueue.length === 0)) {
          stack.splice(i, 1);
          continue;
        }

        if (frame.currentActorId === deadPlayerId || frame.sourceId === deadPlayerId) {
          if (Array.isArray(frame.priorityQueue) && frame.priorityQueue.length > 0) {
            frame.currentActorId = frame.priorityQueue[0];
          } else {
            stack.splice(i, 1);
            continue;
          }
        }
      }
    }

    // 2. Thu hồi toàn bộ bài trên tay + trang bị + bài phán xét vào discardPile
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
    if (deadPlayer.trungCards && deadPlayer.trungCards.length > 0) {
      state.discardPile.push(...deadPlayer.trungCards);
      deadPlayer.trungCards = [];
    }

    // 3. Thưởng / Phạt Phe Phái (Quốc Chiến & Nội Chiến)
    if (killerId !== null && killerId !== deadPlayerId) {
      const killer = state.getPlayer(killerId);
      if (killer && killer.isAlive) {
        const isNationalWar = Boolean(
          deadPlayer.faction && killer.faction &&
          deadPlayer.faction !== 'none' && killer.faction !== 'none'
        );

        if (isNationalWar) {
          const isAlly = isSameFaction(killer, deadPlayer);
          if (isAlly) {
            // Ngộ sát đồng minh cùng phe -> Phạt vứt toàn bộ bài trên tay và trang bị
            state.addLog(`⚠️ ÁC MỘNG! ${killer.name} đã ngộ sát đồng minh cùng phe ${getFactionLabel(deadPlayer.faction).toUpperCase()}! Bị trừng phạt vứt toàn bộ bài!`);
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
            const deadAllies = state.players.filter(p => p.id !== deadPlayer.id && isSameFaction(p, deadPlayer) && (p.revealedHeroes?.[0] || p.revealedHeroes?.[1])).length;
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
    const firstFaction = getCanonicalFaction(firstPlayer.faction);
    const isValidFaction = firstFaction !== 'none' && !firstPlayer.isDaTam;
    const maxAllowedFaction = Math.floor(state.players.length / 2);

    // Nếu tất cả người sống sót đều cùng phe gốc:
    if (isValidFaction && alivePlayers.every(p => isSameFaction(p, firstPlayer))) {
      // Nếu số lượng người sống sót vượt quá giới hạn phe (ví dụ 3 người phe Lạc trong bàn 4 người):
      // Buộc các tướng chưa lật phải lộ diện để kích hoạt cơ chế Dã Tâm!
      if (state.players.length >= 4 && alivePlayers.length > maxAllowedFaction) {
        alivePlayers.forEach(p => {
          if (!p.revealedHeroes || !p.revealedHeroes.some(Boolean)) {
            globalHeroRegistry.revealPlayerHero(state, p, 0, null, true);
          }
        });
      }

      // Kiểm tra lại: Tất cả phải cùng phe VÀ số lượng <= maxAllowedFaction VÀ không ai là Dã Tâm
      const canTeamWin = (state.players.length < 4 || alivePlayers.length <= maxAllowedFaction) &&
        alivePlayers.every(p => !p.isDaTam);

      if (canTeamWin) {
        state.gameOver = true;
        state.winner = alivePlayers.map(p => p.id);
        // Force reveal toàn bộ người sống sót
        alivePlayers.forEach(p => {
          p.revealedHeroes = [true, true];
        });
        state.addLog(`🏆 TRÒ CHƠI KẾT THÚC! PHE ${firstFaction.toUpperCase()} ĐẠI THẮNG ĐỒNG ĐỘI!`);
        return true;
      }
    }

    return false;
  }
}
