// @ts-check
/**
 * DispatcherV4.js
 * Bộ Điều Phối Sự Kiện (Event Resolver) trung tâm cho Việt Sát v4.
 * Kết nối các Action từ React UI & BotRunner tới StateMachine, PriorityStack & Rules.
 */

import { StateMachine, PHASES } from '../core/StateMachine.js';
import { CombatRules } from '../rules/CombatRules.js';
import { TrickRules } from '../rules/TrickRules.js';
import { RangeSystem } from '../rules/RangeSystem.js';
import { globalHeroRegistry, getPlayerGender } from '../heroes/HeroRegistry.js';
import { GameInvariants } from '../core/Invariants.js';
import { getCardSubType, HEROES } from '../../data/gameData.js';
import { normalizeSkillId, getCanonicalFaction, isSameFaction, normalizeSuit, getSuitColor, isSameSuit, isEquip, isTrick, isBasicCard } from '../../utils/translationHelper.js';

function rankToNumber(rank) {
  if (typeof rank === 'number') return rank;
  if (!rank) return 1;
  const str = String(rank).trim().toUpperCase();
  if (str === 'A') return 1;
  if (str === 'J') return 11;
  if (str === 'Q') return 12;
  if (str === 'K') return 13;
  const num = parseInt(str, 10);
  return isNaN(num) ? 1 : num;
}

export class DispatcherV4 {
  constructor(initialState) {
    this.state = initialState;
    this.heroRegistry = globalHeroRegistry;
    this.stateMachine = new StateMachine(this.state);
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState() {
    return this.state;
  }

  addLog(message, type = 'info') {
    if (this.state && typeof this.state.addLog === 'function') {
      this.state.addLog(message, { type });
    } else if (this.state && Array.isArray(this.state.logs)) {
      this.state.logs.push({ message, timestamp: Date.now(), type });
    }
    this.notifyListeners();
  }

  findCard(cardId) {
    if (!cardId || !this.state) return null;
    for (const p of this.state.players) {
      const inHand = p.hand?.find(c => c.id === cardId);
      if (inHand) return inHand;
      const inEquip = Array.isArray(p.equipment) 
        ? p.equipment.find(c => c.id === cardId)
        : Object.values(p.equipment || {}).find(c => c?.id === cardId);
      if (inEquip) return inEquip;
      const inJudge = p.judgementArea?.find(c => c.id === cardId);
      if (inJudge) return inJudge;
    }
    const inDiscard = this.state.discardPile?.find(c => c.id === cardId);
    if (inDiscard) return inDiscard;
    const inDeck = this.state.drawPile?.find(c => c.id === cardId);
    if (inDeck) return inDeck;
    return null;
  }

  getHeroName(player) {
    if (!player) return 'Ai đó';
    if (player.id === 0) return 'Bạn';
    return player.name || `Người chơi ${player.id + 1}`;
  }

  dispatch(action) {
    return this.dispatchAction(action);
  }

  dispatchAction(action) {
    if (!action || !action.type) return;
    const payload = action.payload !== undefined ? action.payload : action;

    try {
      switch (action.type) {
        case 'ACTION_PLAY_CARD':
        case 'PLAY_CARD':
          this._handlePlayCard(payload);
          break;

        case 'ACTION_REACT':
        case 'ACTION_RESPONSE':
        case 'RESPOND_ACTION':
        case 'REACT':
          this._handleReact(payload);
          break;

        case 'ACTION_SKILL':
        case 'USE_SKILL':
        case 'ACTION_USE_SKILL':
        case 'ACTION_SKILL_RESPONSE':
          this._handleSkill(payload);
          break;

        case 'ACTION_DRAW_CARDS':
          this._handleDrawCards(payload);
          break;

        case 'ACTION_END_PHASE':
          this._handleEndPhase(payload);
          break;

        case 'ACTION_DISCARD':
        case 'DISCARD_CARDS':
        case 'DISCARD':
          this._handleDiscard(payload);
          break;

        case 'ACTION_REVEAL_HERO':
          this._handleRevealHero(payload);
          break;

        default:
          console.warn(`[DispatcherV4] Unhandled action type: ${action.type}`);
      }
    } catch (err) {
      console.error(`[DispatcherV4] Error dispatching action ${action.type}:`, err);
      this.addLog(`⚠️ Thao tác không thành công: ${err.message}`, 'error');
      if (action.throwOnError || payload?.throwOnError) {
        throw err;
      }
    }

    this.notifyListeners();
  }

  _handlePlayCard(payload) {
    const sourceId = payload.sourceId !== undefined ? payload.sourceId : payload.playerId;
    const cardId = payload.cardId || payload.card?.id;
    const targetIds = payload.targetIds || payload.targets || (payload.targetId !== undefined ? [payload.targetId] : []);
    const virtualCardName = payload.virtualCardName || null;
    const player = this.state.getPlayer(sourceId);
    if (!player || !player.isAlive) return;

    const card = player.hand.find(c => c.id === cardId);
    if (!card) {
      console.warn(`[DispatcherV4] Card ${cardId} not found in player ${sourceId} hand.`);
      return;
    }

    const cardType = card.type || '';
    const cardName = virtualCardName || card.name;
    const effColor = globalHeroRegistry.getEffectiveColor(player, card);
    const effSuit = globalHeroRegistry.getEffectiveSuit(player, card);
    const isRedCard = effColor ? effColor === 'red' : Boolean(card.color === 'red' || getSuitColor(card.suit) === 'red');
    const isNonTargetedRedCard = ['dodge', 'peach', 'wine', 'equip'].includes(cardType) || ['Né', 'Đào', 'Rượu'].includes(card.name);
    const isTargetingOther = targetIds.length > 0 && targetIds[0] !== sourceId;
    const hasDoiNuiSlash = (globalHeroRegistry.hasSkill(player, 'doi_nui') || player.skills?.includes('doi_nui')) && (virtualCardName === 'Chém' || payload.asSlash || (isTargetingOther && (cardType === 'dodge' || card.name === 'Né')));
    const hasKhaiThien = (globalHeroRegistry.hasSkill(player, 'khai_thien') || player.skills?.includes('khai_thien')) && isRedCard && (virtualCardName === 'Chém' || payload.asSlash || (isTargetingOther && isNonTargetedRedCard));

    // 1. Chém (Slash) - Chỉ xử lý khi bài thực sự là Chém hoặc biến đổi thành Chém, KHÔNG xử lý khi virtualCardName là Đào/Rượu/Cẩm nang
    const isConvertedNonSlash = virtualCardName && virtualCardName !== 'Chém';
    const isSlashAction = !isConvertedNonSlash && (cardName === 'Chém' || (!virtualCardName && cardType === 'slash') || hasDoiNuiSlash || hasKhaiThien);

    if (isSlashAction) {
      if (hasDoiNuiSlash && (cardType === 'dodge' || card.name === 'Né')) {
        this._ensureHeroRevealedForSkill(player, 'doi_nui', 'Dời Núi');
      } else if (hasKhaiThien && isNonTargetedRedCard) {
        this._ensureHeroRevealedForSkill(player, 'khai_thien', 'Khai Thiên');
      }

      if (player.temporaryFlags?.vanDonWin && targetIds.length > 1) {
        const targets = targetIds.slice(0, 2);
        this.state.discardFromHand(sourceId, [card.id]);
        this.state.addLog(`🌊 [Vân Đồn] ${player.name} dùng [Chém] quét 2 mục tiêu: ${targets.map(id => this.state.getPlayer(id)?.name).join(', ')}!`);
        CombatRules.playSlash(this.state, sourceId, targets[0], card, { alreadyDiscardedCard: true, asSlash: cardName === 'Chém' || hasDoiNuiSlash || hasKhaiThien, interactiveSongKiem: true });
        CombatRules.playSlash(this.state, sourceId, targets[1], card, { alreadyDiscardedCard: true, isRedirected: true, asSlash: cardName === 'Chém' || hasDoiNuiSlash || hasKhaiThien, interactiveSongKiem: true });
        return;
      }

      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để Chém!');
      CombatRules.playSlash(this.state, sourceId, targetId, card, { asSlash: cardName === 'Chém' || hasDoiNuiSlash || hasKhaiThien, interactiveSongKiem: true });
      return;
    }

    // 2. Đào (Peach)
    const isPeachAction = virtualCardName ? virtualCardName === 'Đào' : (cardType === 'peach' || card.name === 'Đào');
    if (isPeachAction) {
      if (player.hp >= player.maxHp) {
        throw new Error('Máu đã đầy, không thể sử dụng Đào!');
      }

      this.state.discardFromHand(sourceId, [card.id]);

      // Kiểm tra Kỹ Năng Hậu Viện (Ngô Quyền - Phe Hà)
      const isHaFaction = getCanonicalFaction(player.faction) === 'ha';
      const hauVienTargets = isHaFaction
        ? this.state.getAlivePlayers().filter(p => p.id !== player.id && getCanonicalFaction(p.faction) === 'ha' && p.hp < p.maxHp && (globalHeroRegistry.hasSkill(p, 'hau_vien') || globalHeroRegistry.hasSkill(p, 'hau-vien') || p.skills?.includes('hau_vien') || p.skills?.includes('hau-vien')))
        : [];

      if (hauVienTargets.length > 0) {
        this.state.priorityStack.push({
          type: 'ASK_HAU_VIEN',
          sourceId: player.id,
          targetId: player.id,
          currentActorId: player.id,
          priorityQueue: [player.id],
          context: {
            reason: 'hau_vien',
            targets: hauVienTargets.map(p => p.id)
          }
        });
        this.state.addLog(`✨ [Hậu Viện] ${player.name} có thể nhường lá [Đào] này cho Chúa công Ngô Quyền!`);
        return;
      }

      player.hp = Math.min(player.maxHp, player.hp + 1);
      this.state.addLog(`${player.name} sử dụng [Đào], hồi phục 1 Máu (${player.hp}/${player.maxHp}).`);
      return;
    }

    // 3. Rượu (Wine)
    const isWineAction = virtualCardName ? virtualCardName === 'Rượu' : (cardType === 'wine' || card.name === 'Rượu');
    if (isWineAction) {
      if ((player.turnStats?.wineCount || 0) >= 1) {
        throw new Error('Mỗi lượt chỉ được uống Rượu 1 lần trong giai đoạn Hành động!');
      }
      this.state.discardFromHand(sourceId, [card.id]);
      player.temporaryFlags = player.temporaryFlags || {};
      player.temporaryFlags.wineActive = true;
      player.turnStats = player.turnStats || {};
      player.turnStats.wineCount = (player.turnStats.wineCount || 0) + 1;
      GameInvariants.assertWineLimit(player);
      this.state.addLog(`${player.name} uống [Rượu], sát thương Chém tiếp theo tăng thêm 1!`);
      return;
    }

    // 4. Trang bị (Equipment)
    const rawSubtype = getCardSubType(card) || cardType;
    let equipSlot = null;
    if (rawSubtype === 'equip_weapon' || rawSubtype === 'weapon') equipSlot = 'weapon';
    else if (rawSubtype === 'equip_armor' || rawSubtype === 'armor') equipSlot = 'armor';
    else if (rawSubtype === 'equip_mount_atk' || rawSubtype === 'horse_attack') equipSlot = 'horse_attack';
    else if (rawSubtype === 'equip_mount_def' || rawSubtype === 'horse_defense') equipSlot = 'horse_defense';

    const isVirtualAction = Boolean(virtualCardName || payload.asSlash || payload.asDuel || payload.asDismantle || payload.asChaos || payload.asChain || payload.asFireAttack);

    if (!isVirtualAction && equipSlot) {
      // Chuyển bài từ tay lên trang bị (KHÔNG đẩy vào discardPile)
      player.hand = player.hand.filter(c => c.id !== card.id);
      player.equipment = player.equipment || {};

      // Nếu đã có trang bị ở slot này, đưa trang bị cũ vào Discard Pile
      const oldEquip = player.equipment[equipSlot];
      if (oldEquip) {
        this.state.discardPile.push(oldEquip);
        // Kích hoạt phản ứng mất trang bị (Hồ Xuân Hương - Xuân Hương...)
        globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: player.id, card: oldEquip }, this.state);
        // Bạch Ngân: Khi tháo giáp hoặc bị thay thế -> Hồi 1 HP
        if (oldEquip.name === 'Bạch Ngân' || oldEquip.name === 'Bạch Ngân Sư Tử' || isEquip(oldEquip, 'bach_ngan') || oldEquip.id?.includes('bach_ngan') || oldEquip.key === 'bach-ngan') {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          this.state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${player.name}, hồi 1 HP (${player.hp}/${player.maxHp})!`);
        }
      }

      player.equipment[equipSlot] = card;
      this.state.addLog(`${player.name} trang bị [${card.name}].`);
      return;
    }

    if (isVirtualAction) {
      GameInvariants.assertVirtualActionIntegrity(player, isVirtualAction, card, virtualCardName);
    }

    // 5. Cẩm nang (Tricks)
    const hasPhaThanhDuel = globalHeroRegistry.hasSkill(player, 'pha_thanh', true) && 
      player.temporaryFlags?.phaThanhOppositeColor && 
      ((player.temporaryFlags.phaThanhOppositeColor === 'red' && isRedCard) || 
       (player.temporaryFlags.phaThanhOppositeColor === 'black' && !isRedCard)) && 
      (virtualCardName === 'Quyết Đấu' || payload.asDuel);

    if (cardName === 'Quyết Đấu' || hasPhaThanhDuel) {
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để Quyết Đấu!');
      if (hasPhaThanhDuel) {
        this._ensureHeroRevealedForSkill(player, 'pha_thanh', 'Phá Thành');
        this.state.discardFromHand(sourceId, [card.id]);
        this.state.addLog(`⚡ [Phá Thành] ${player.name} sử dụng lá [${card.name}] màu ${isRedCard ? 'Đỏ' : 'Đen'} như [Quyết Đấu]!`);
        TrickRules.playDuel(this.state, sourceId, targetId, { ...card, name: 'Quyết Đấu', virtual: true });
        return;
      }
      TrickRules.playDuel(this.state, sourceId, targetId, card);
      return;
    }
    const isInteractive = payload.interactive === true;
    const hasKyTap = (globalHeroRegistry.hasSkill(player, 'ky_tap', true) || player.skills?.includes('ky_tap')) && !isRedCard && (virtualCardName === 'Tước Bài' || payload.asDismantle || card.asDismantle);
    if (cardName === 'Tước Bài' || hasKyTap) {
      const targetId = targetIds[0];
      if (hasKyTap) {
        this._ensureHeroRevealedForSkill(player, 'ky_tap', 'Kỳ Tập');
        this.state.discardFromHand(sourceId, [card.id]);
        this.state.addLog(`⚡ [Kỳ Tập] ${player.name} sử dụng lá bài Đen [${card.name}] như [Tước Bài]!`);
        TrickRules.playDismantle(this.state, sourceId, targetId, { ...card, name: 'Tước Bài', idKey: 'tuoc_bai', virtual: true }, { interactive: isInteractive, targetCardId: payload.targetCardId });
        return;
      }
      TrickRules.playDismantle(this.state, sourceId, targetId, card, { interactive: isInteractive, targetCardId: payload.targetCardId });
      return;
    }
    if (cardName === 'Cướp Bài') {
      const targetId = targetIds[0];
      TrickRules.playSteal(this.state, sourceId, targetId, card, { interactive: isInteractive, targetCardId: payload.targetCardId });
      return;
    }
    if (cardName === 'Vạn Tiễn Quy Tâm' || cardName === 'Loạn Tiễn') {
      TrickRules.playArrowRain(this.state, sourceId, card);
      return;
    }
    if (cardName === 'Nam Man Xâm Nhập' || cardName === 'Dã Man') {
      TrickRules.playBarbarian(this.state, sourceId, card);
      return;
    }
    if (cardName === 'Đào Viên Kết Nghĩa' || cardName === 'Hồi Xuân') {
      TrickRules.playPeachGarden(this.state, sourceId, card);
      return;
    }
    if (cardName === 'Sấm Sét') {
      TrickRules.playLightning(this.state, sourceId, card);
      return;
    }
    if (cardName === 'Vô Trung Sinh Hữu' || card.idKey === 'vo_trung' || card.idKey === 'vo_trung_sinh_huu') {
      TrickRules.playTrick(this.state, sourceId, [sourceId], card);
      return;
    }
    const isDiamond = card && normalizeSuit(card.suit).code === 'diamond';
    const hasHoaThanAnTu = (globalHeroRegistry.hasSkill(player, 'hoa_than_an_tu', true) || globalHeroRegistry.hasSkill(player, 'hoa-than-an-tu', true)) && isDiamond && (virtualCardName === 'Hỗn Loạn' || payload.asChaos || card.asChaos);
    if (cardName === 'Hỗn Loạn' || hasHoaThanAnTu) {
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để đặt Hỗn Loạn!');
      if (hasHoaThanAnTu) {
        this._ensureHeroRevealedForSkill(player, 'hoa_than_an_tu', 'Hòa Thân');
        this.state.addLog(`🌺 [Hòa Thân] ${player.name} sử dụng lá bài Rô [${card.name}] như [Hỗn Loạn]!`);
        TrickRules.playChaos(this.state, sourceId, targetId, { ...card, name: 'Hỗn Loạn', idKey: 'hon_loan', virtual: true });
        return;
      }
      TrickRules.playChaos(this.state, sourceId, targetId, card);
      return;
    }
    if (cardName === 'Binh Lương Thốn Đoạn' || cardName === 'Binh Lương' || card.idKey === 'binh_luong' || card.idKey === 'binh-luong') {
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để Binh Lương Thốn Đoạn!');
      TrickRules.playStarvation(this.state, sourceId, targetId, card);
      return;
    }
    const isClub = card && normalizeSuit(card.suit).code === 'club';
    const hasTienDuyenChain = globalHeroRegistry.hasSkill(player, 'tien_duyen_chu_dong_tu', true) && isClub && (virtualCardName === 'Xiềng Xích' || payload.asChain);
    if (cardName === 'Xiềng Xích' || card.idKey === 'xieng_xich' || hasTienDuyenChain) {
      if (hasTienDuyenChain) {
        this._ensureHeroRevealedForSkill(player, 'tien_duyen_chu_dong_tu', 'Tiên Duyên');
      }
      const chainCard = hasTienDuyenChain ? { ...card, name: 'Xiềng Xích', idKey: 'xieng_xich', virtual: true } : card;
      const isReforgeMode = Boolean(payload.reforge || payload.isReforge);
      TrickRules.playIronChain(this.state, sourceId, targetIds, chainCard, { isIronChain: true, reforge: isReforgeMode });
      return;
    }
    if (cardName === 'Mượn Đao') {
      const targetAId = targetIds[0];
      const targetBId = targetIds[1];
      if (targetAId === undefined || targetBId === undefined) {
        throw new Error('Vui lòng chọn người có vũ khí và mục tiêu bị Chém!');
      }
      TrickRules.playBorrowSword(this.state, sourceId, targetAId, targetBId, card);
      return;
    }
    const hasThanHoa = globalHeroRegistry.hasSkill(player, 'than_hoa', true) && isRedCard && (virtualCardName === 'Hỏa Công' || payload.asFireAttack);
    if (cardName === 'Hỏa Công' || cardName === 'Hỏa công' || card.idKey === 'hoa_cong' || hasThanHoa) {
      if (hasThanHoa) {
        this._ensureHeroRevealedForSkill(player, 'than_hoa', 'Thần Hỏa');
      }
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để Hỏa Công!');
      const fireCard = hasThanHoa ? { ...card, name: 'Hỏa Công', idKey: 'hoa_cong', virtual: true } : card;
      TrickRules.playFireAttack(this.state, sourceId, targetId, fireCard);
      return;
    }

    if (cardName === 'Hóa Giải' || card.idKey === 'hoa_giai') {
      throw new Error('Lá [Hóa Giải] chỉ có thể sử dụng khi phản ứng cẩm nang, không thể chủ động đánh ra trong lượt!');
    }
    const hasDoiNui = globalHeroRegistry.hasSkill(player, 'doi_nui', true);
    if ((cardName === 'Né' || card.idKey === 'ne') && !hasDoiNui && !hasKhaiThien) {
      throw new Error('Lá [Né] chỉ có thể sử dụng khi phản ứng Né đòn, không thể chủ động đánh ra trong lượt!');
    }

    // Tuyệt đối không tự ý discardFromHand các lá bài không hợp lệ hoặc chưa phân loại
    throw new Error(`Lá bài [${card.name}] không thể sử dụng trực tiếp trong Pha Hành Động!`);
  }

  _resolveCard(player, data) {
    if (!player || !data) return null;
    const targetCardId = data.cardId || data.dodgeCardId || data.slashCardId || data.peachCardId;
    if (targetCardId) {
      const found = player.hand?.find(c => c.id === targetCardId);
      if (found) return found;
      for (const slot in player.equipment) {
        if (player.equipment[slot]?.id === targetCardId) return player.equipment[slot];
      }
    }
    if (data.dodgeCard) return data.dodgeCard;
    if (data.peachCard) return data.peachCard;
    if (data.slashCard) return data.slashCard;
    if (data.negateCard) return data.negateCard;
    if (data.card) return data.card;
    if (data.cardIndexSelected !== undefined && player.hand?.[data.cardIndexSelected]) {
      return player.hand[data.cardIndexSelected];
    }
    if (data.cardIdx !== undefined && player.hand?.[data.cardIdx]) {
      return player.hand[data.cardIdx];
    }
    if (data.cardIndex !== undefined && player.hand?.[data.cardIndex]) {
      return player.hand[data.cardIndex];
    }
    if (data.negateCardIndex !== undefined && player.hand?.[data.negateCardIndex]) {
      return player.hand[data.negateCardIndex];
    }
    if (data.negateEquipIndex !== undefined) {
      const equipCards = Object.values(player.equipment || {}).filter(Boolean);
      if (equipCards[data.negateEquipIndex]) return equipCards[data.negateEquipIndex];
    }
    return null;
  }

  _handleReact(payload = {}) {
    const playerId = payload.playerId;
    const responseType = payload.responseType;
    const data = { ...payload, ...(payload.data || {}) };

    const frame = this.state.priorityStack.peek();
    if (!frame) {
      console.warn('[DispatcherV4] No active priority frame to react to.');
      return;
    }

    const isCancelOrSkip = responseType === 'cancel' || 
      responseType === 'skip' || 
      data.canceled === true || 
      data.doReact === false || 
      data.doSave === false || 
      data.doUse === false || 
      data.doNegate === false || 
      data.doProvide === false;

    const expectedActorId = frame.context?.currentResponderId ?? 
                            frame.currentActorId ?? 
                            frame.priorityQueue?.[0] ?? 
                            frame.targetId ?? 
                            frame.sourceId;

    const isQueueFrame = frame.type === 'ASK_NEGATE' || frame.type === 'ASK_PEACH';
    if (isQueueFrame) {
      if (isCancelOrSkip) {
        if (playerId !== undefined && playerId !== null && expectedActorId !== undefined && expectedActorId !== null && playerId !== expectedActorId) {
          console.warn(`[DispatcherV4] Bỏ qua lượt bỏ qua từ player ${playerId} cho frame ${frame.type} vì frame đang chờ player ${expectedActorId}`);
          return;
        }
      } else {
        if (Array.isArray(frame.priorityQueue) && frame.priorityQueue.length > 0 && !frame.priorityQueue.includes(playerId)) {
          console.warn(`[DispatcherV4] Player ${playerId} không có trong danh sách ưu tiên của frame ${frame.type}`);
          return;
        }
      }
    } else {
      if (playerId !== undefined && playerId !== null && expectedActorId !== undefined && expectedActorId !== null && playerId !== expectedActorId) {
        console.warn(`[DispatcherV4] Bỏ qua phản hồi từ player ${playerId} cho frame ${frame.type} vì frame đang chờ player ${expectedActorId}`);
        return;
      }
    }

    const expectedPlayer = this.state.getPlayer(expectedActorId);
    if (expectedPlayer && !expectedPlayer.isAlive) {
      console.warn(`[DispatcherV4] Người chơi ${expectedActorId} đang chờ phản hồi đã tử trận. Đang tự động giải phóng frame ${frame.type}.`);
      if (typeof frame.nextActor === 'function') {
        const next = frame.nextActor();
        if (!next) {
          this.state.priorityStack.pop();
        }
      } else {
        this.state.priorityStack.pop();
      }
      return;
    }

    const player = this.state.getPlayer(playerId);

    switch (frame.type) {
      case 'ASK_WEAPON_SKILL': {
        const weapon = frame.context?.weapon || frame.context?.weaponName;
        const source = this.state.getPlayer(frame.sourceId);
        const target = this.state.getPlayer(frame.targetId);

        if (weapon === 'Rìu Đá' || weapon === 'Quán Thạch Phủ' || isEquip(weapon, 'riu_da')) {
          if (!isCancelOrSkip && data.doUse) {
            let cardIdsToDiscard = [];
            if (Array.isArray(data.cardIds) && data.cardIds.length > 0) {
              cardIdsToDiscard.push(...data.cardIds);
            }
            if (Array.isArray(data.equipIds) && data.equipIds.length > 0) {
              cardIdsToDiscard.push(...data.equipIds);
            }
            if (cardIdsToDiscard.length < 2 && Array.isArray(data.cardIndexes)) {
              for (const idx of data.cardIndexes) {
                if (source?.hand?.[idx] && !cardIdsToDiscard.includes(source.hand[idx].id)) {
                  cardIdsToDiscard.push(source.hand[idx].id);
                }
              }
            }
            if (cardIdsToDiscard.length < 2 && Array.isArray(data.equipIndexes)) {
              const rawEquips = Array.isArray(source?.equipment)
                ? source.equipment
                : Object.values(source?.equipment || {}).filter(Boolean);
              for (const idx of data.equipIndexes) {
                if (rawEquips[idx] && !cardIdsToDiscard.includes(rawEquips[idx].id)) {
                  cardIdsToDiscard.push(rawEquips[idx].id);
                }
              }
            }
            if (cardIdsToDiscard.length < 2) {
              const availableHand = (source?.hand || []).map(c => c.id);
              const availableEquip = Object.values(source?.equipment || {})
                .filter(e => e && e.name !== 'Rìu Đá' && e.id !== source.equipment?.weapon?.id)
                .map(e => e.id);
              const allAvailable = [...availableHand, ...availableEquip];
              cardIdsToDiscard = allAvailable.slice(0, 2);
            }

            if (cardIdsToDiscard.length >= 2) {
              const chosen = cardIdsToDiscard.slice(0, 2);
              for (const cid of chosen) {
                const inHand = source.hand?.some(c => c.id === cid);
                if (inHand) {
                  this.state.discardFromHand(source.id, [cid]);
                } else if (source.equipment) {
                  for (const slot in source.equipment) {
                    if (source.equipment[slot]?.id === cid) {
                      const removed = source.equipment[slot];
                      source.equipment[slot] = null;
                      this.state.discardPile.push(removed);
                      globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: source.id, card: removed }, this.state);
                    }
                  }
                }
              }
              this.state.priorityStack.pop();
              this.state.addLog(`🪓 [Rìu Đá] ${source.name} bỏ 2 lá bài để xuyên phá cú Né của ${target.name}!`);
              CombatRules.applyDamage(this.state, source.id, target.id, frame.context.damageAmount || 1, 'slash_penetrate', false, frame.context.slashCard || frame.context.card);
              break;
            }
          }
          this.state.priorityStack.pop();
          this.state.addLog(`🪓 [Rìu Đá] ${source.name} không kích hoạt Rìu Đá, ${target.name} né thành công!`);
          break;
        }

        if (weapon === 'Thanh Long Đao' || isEquip(weapon, 'thanh_long_dao')) {
          if (!isCancelOrSkip && data.doUse) {
            const hasDoiNui = globalHeroRegistry.hasSkill(source, 'doi_nui', true);
            const hasKhaiThien = globalHeroRegistry.hasSkill(source, 'khai_thien', true);
            const isRed = c => {
              if (!c) return false;
              const col = globalHeroRegistry.getEffectiveColor(source, c);
              return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
            };
            const resolved = this._resolveCard(source, data) || 
              (data.cardId ? source.hand?.find(c => c.id === data.cardId) : null) ||
              source.hand?.find(c => c.type === 'slash' || c.name === 'Chém' || c.idKey === 'slash') ||
              (hasDoiNui ? source.hand?.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
              (hasKhaiThien ? source.hand?.find(isRed) : null);

            if (resolved) {
              this.state.discardFromHand(source.id, [resolved.id]);
              this.state.priorityStack.pop();
              this.state.addLog(`🐉 [Thanh Long Đao] ${source.name} vung tiếp lá [Chém] thứ hai lên ${target.name}!`);
              this.state.priorityStack.push({
                type: 'ASK_DODGE',
                sourceId: source.id,
                targetId: target.id,
                priorityQueue: [target.id],
                context: {
                  card: resolved,
                  requiredDodges: 1,
                  dodgesProvided: 0,
                  damageAmount: 1
                }
              });
              break;
            }
          }
          this.state.priorityStack.pop();
          this.state.addLog(`🐉 [Thanh Long Đao] ${source.name} không đánh tiếp, ${target.name} né thành công!`);
          break;
        }

        if (weapon === 'Song Kiếm' || isEquip(weapon, 'song_kiem')) {
          const actor = this.state.getPlayer(playerId);
          if (!isCancelOrSkip && data.doUse) {
            let cardIdToDiscard = data.cardId || (Array.isArray(data.cardIds) ? data.cardIds[0] : null);
            let equipIdToDiscard = data.equipId || (Array.isArray(data.equipIds) ? data.equipIds[0] : null);

            if (!cardIdToDiscard && !equipIdToDiscard) {
              if (Array.isArray(data.cardIndexes) && data.cardIndexes.length > 0) {
                cardIdToDiscard = actor?.hand?.[data.cardIndexes[0]]?.id;
              } else if (Array.isArray(data.equipIndexes) && data.equipIndexes.length > 0) {
                const rawEquips = Array.isArray(actor?.equipment)
                  ? actor.equipment
                  : Object.values(actor?.equipment || {}).filter(Boolean);
                equipIdToDiscard = rawEquips[data.equipIndexes[0]]?.id;
              }
            }

            if (cardIdToDiscard) {
              this.state.discardFromHand(actor.id, [cardIdToDiscard]);
              this.state.priorityStack.pop();
              this.state.addLog(`⚔️ [Song Kiếm] ${actor.name} tự bỏ 1 lá bài từ trên tay.`);
              break;
            } else if (equipIdToDiscard && actor.equipment) {
              for (const slot in actor.equipment) {
                if (actor.equipment[slot]?.id === equipIdToDiscard) {
                  const removed = actor.equipment[slot];
                  actor.equipment[slot] = null;
                  this.state.discardPile.push(removed);
                  globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: actor.id, card: removed }, this.state);
                }
              }
              this.state.priorityStack.pop();
              this.state.addLog(`⚔️ [Song Kiếm] ${actor.name} tháo bỏ 1 trang bị.`);
              break;
            }
          }
          this.state.priorityStack.pop();
          this.state.drawCards(source.id, 1);
          this.state.addLog(`⚔️ [Song Kiếm] ${actor.name} không bỏ bài, ${source.name} được rút 1 lá bài!`);
          break;
        }

        this.state.priorityStack.pop();
        break;
      }

      case 'ASK_DISMANTLE': {
        const targetId = frame.targetId ?? frame.context?.targetId;
        const targetCardId = isCancelOrSkip ? null : (data.cardId || data.targetCardId || null);
        TrickRules.resolveDismantle(this.state, playerId, targetId, targetCardId);
        this.state.priorityStack.pop();
        break;
      }

      case 'ASK_SNATCH': {
        const targetId = frame.targetId ?? frame.context?.targetId;
        const targetCardId = isCancelOrSkip ? null : (data.cardId || data.targetCardId || null);
        TrickRules.resolveSteal(this.state, playerId, targetId, targetCardId);
        this.state.priorityStack.pop();
        break;
      }

      case 'ASK_XA_THAN': {
        if (isCancelOrSkip) {
          CombatRules.respondXaThan(this.state, playerId, null, null);
        } else {
          const discardCard = this._resolveCard(player, data) || (player.hand && player.hand.length > 0 ? player.hand[0] : null);
          const redirectedTargetId = data.targetId !== undefined 
            ? data.targetId 
            : (data.redirectedTargetId !== undefined 
                ? data.redirectedTargetId 
                : (frame.context?.validTargets?.length > 0 ? frame.context.validTargets[0] : null));
          CombatRules.respondXaThan(this.state, playerId, discardCard, redirectedTargetId);
        }
        break;
      }

      case 'ASK_DODGE': {
        let dodgeCard = null;
        if (!isCancelOrSkip && !data.useBagua && !data.doBagua && !data.doTienPhat && !data.doHoGia) {
          const hasDoiNui = globalHeroRegistry.hasSkill(player, 'doi_nui', true);
          const hasThinhChinh = globalHeroRegistry.hasSkill(player, 'thinh_chinh', true);
          const hasLinhGiam = globalHeroRegistry.hasSkill(player, 'linh_giam', true);
          const isBlack = c => {
            if (!c) return false;
            const col = globalHeroRegistry.getEffectiveColor(player, c);
            return col ? col === 'black' : Boolean(c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
          };
          const resolved = this._resolveCard(player, data) || (data.doReact ? (
            player.hand.find(c => c.type === 'dodge' || c.name === 'Né') || 
            (hasDoiNui ? player.hand.find(c => c.type === 'slash' || c.name === 'Chém') : null) || 
            (hasThinhChinh ? player.hand.find(isBlack) : null) ||
            (frame.context?.reason === 'van-tien' ? player.hand.find(c => c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') : null) ||
            (frame.context?.reason === 'van-tien' && hasLinhGiam ? player.hand.find(isBlack) : null)
          ) : null);
          if (resolved) {
            const isNegate = (isTrick(resolved, 'hoa_giai') ||
              data.virtualCardName === 'Hóa Giải' || data.activeSkill === 'Linh Giám' ||
              (hasLinhGiam && isBlack(resolved) && (data.virtualCardName === 'Hóa Giải' || data.asNegate))) && frame.context?.reason === 'van-tien';
            const isDodge = resolved.name === 'Né' || resolved.type === 'dodge' || resolved.idKey === 'ne' || resolved.idKey === 'dodge' || resolved.id?.includes('dodge') || resolved.id?.includes('ne') ||
              (hasDoiNui && (resolved.name === 'Chém' || resolved.type === 'slash')) ||
              (hasThinhChinh && isBlack(resolved)) ||
              isNegate;
            if (isDodge) {
              dodgeCard = resolved;
            }
          }
        }
        CombatRules.respondDodge(this.state, playerId, dodgeCard, data);
        break;
      }

      case 'ASK_PEACH': {
        let peachCard = null;
        if (!isCancelOrSkip) {
          const hasNamDuoc = globalHeroRegistry.hasSkill(player, 'nam_duoc', true) && this.state.currentTurnPlayerId !== playerId;
          const isRed = c => {
            if (!c) return false;
            const col = globalHeroRegistry.getEffectiveColor(player, c);
            return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
          };
          peachCard = this._resolveCard(player, data) || 
            (data.doSave ? player.hand.find(c => c.type === 'peach' || c.name === 'Đào' || (playerId === frame.targetId && (c.type === 'wine' || c.name === 'Rượu')) || (hasNamDuoc && isRed(c))) : null);
        }
        CombatRules.respondPeach(this.state, playerId, peachCard);
        if (this.state.currentPhase === PHASES.JUDGE && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeJudgePhase();
        } else if (this.state.currentPhase === PHASES.DRAW && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeDrawPhase();
        } else if (this.state.currentPhase === PHASES.BEGIN && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeBeginPhase();
        }
        break;
      }

      case 'ASK_NEGATE': {
        let negateCard = null;
        if (!isCancelOrSkip) {
          const hasLinhGiam = globalHeroRegistry.hasSkill(player, 'linh_giam', true);
          const isBlack = c => {
            if (!c) return false;
            const col = globalHeroRegistry.getEffectiveColor(player, c);
            return col ? col === 'black' : Boolean(c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
          };
          negateCard = this._resolveCard(player, data) || 
            player.hand.find(c => c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') ||
            (hasLinhGiam ? player.hand.find(isBlack) : null);
        }
        TrickRules.respondNegate(this.state, playerId, negateCard);
        if (this.state.currentPhase === PHASES.JUDGE && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeJudgePhase();
        }
        break;
      }

      case 'ASK_DISCARD': {
        const rawCardIds = data.cardIds || (data.cardId ? [data.cardId] : (data.selectedDiscards || []));
        const required = Math.min(player?.hand?.length || 0, frame.context?.cardsToDiscard || 1);
        let cardIds = Array.isArray(rawCardIds) ? rawCardIds.filter(cid => player.hand.some(c => c.id === cid)) : [];
        if (cardIds.length !== required) {
          console.warn(`[DispatcherV4] CardIds bỏ bài không khớp yêu cầu (${required} lá). Tự động chọn.`);
          cardIds = (player?.hand || []).slice(0, required).map(c => c.id);
        }
        this.stateMachine.handleDiscard(playerId, cardIds);
        break;
      }

      case 'ASK_BORROW_SLASH': {
        let slashCard = null;
        if (!isCancelOrSkip) {
          slashCard = this._resolveCard(player, data) || (data.doUse ? player.hand.find(c => c.type === 'slash' || c.name === 'Chém') : null);
        }
        TrickRules.respondBorrowSlash(this.state, playerId, slashCard);
        break;
      }

      case 'ASK_SLASH_DUEL': {
        const duelFrame = this.state.priorityStack.peek();
        if (duelFrame && duelFrame.context && duelFrame.context.currentResponderId !== undefined && duelFrame.context.currentResponderId !== playerId) {
          console.warn(`[DispatcherV4] Bỏ qua respondDuel từ player ${playerId} vì frame đang chờ player ${duelFrame.context.currentResponderId}`);
          break;
        }
        let slashCard = null;
        if (!isCancelOrSkip) {
          const hasDoiNui = globalHeroRegistry.hasSkill(player, 'doi_nui', true);
          const hasKhaiThien = globalHeroRegistry.hasSkill(player, 'khai_thien', true);
          const isRed = c => {
            if (!c) return false;
            const col = globalHeroRegistry.getEffectiveColor(player, c);
            return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
          };
          const resolved = this._resolveCard(player, data) || 
            player.hand.find(c => c.type === 'slash' || c.name === 'Chém') || 
            (hasDoiNui ? player.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
            (hasKhaiThien ? player.hand.find(isRed) : null);
          if (resolved) {
            const isSlash = resolved.name === 'Chém' || resolved.type === 'slash' || resolved.idKey === 'chem' || resolved.idKey === 'slash' || resolved.id?.includes('slash') || resolved.id?.includes('chem') ||
              (hasDoiNui && (resolved.name === 'Né' || resolved.type === 'dodge')) ||
              (hasKhaiThien && isRed(resolved));
            if (isSlash) {
              slashCard = resolved;
            }
          }
        }
        TrickRules.respondDuel(this.state, playerId, slashCard, data);
        break;
      }

      case 'ASK_SLASH_RESPONSE': {
        const barbFrame = this.state.priorityStack.peek();
        if (barbFrame && barbFrame.currentActorId !== undefined && barbFrame.currentActorId !== playerId) {
          console.warn(`[DispatcherV4] Bỏ qua respondBarbarian từ player ${playerId} vì frame đang chờ player ${barbFrame.currentActorId}`);
          break;
        }
        let slashCard = null;
        if (!isCancelOrSkip) {
          const hasDoiNui = globalHeroRegistry.hasSkill(player, 'doi_nui', true);
          const hasKhaiThien = globalHeroRegistry.hasSkill(player, 'khai_thien', true);
          const hasLinhGiam = globalHeroRegistry.hasSkill(player, 'linh_giam', true);
          const isRed = c => {
            if (!c) return false;
            const col = globalHeroRegistry.getEffectiveColor(player, c);
            return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
          };
          const isBlack = c => {
            if (!c) return false;
            const col = globalHeroRegistry.getEffectiveColor(player, c);
            return col ? col === 'black' : Boolean(c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
          };
          const resolved = this._resolveCard(player, data) || 
            player.hand.find(c => c.type === 'slash' || c.name === 'Chém') || 
            (hasDoiNui ? player.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
            (hasKhaiThien ? player.hand.find(isRed) : null) ||
            player.hand.find(c => c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') ||
            (hasLinhGiam ? player.hand.find(isBlack) : null);
          if (resolved) {
            const isNegate = isTrick(resolved, 'hoa_giai') ||
              data.virtualCardName === 'Hóa Giải' || data.activeSkill === 'Linh Giám' ||
              (hasLinhGiam && isBlack(resolved) && (data.virtualCardName === 'Hóa Giải' || data.asNegate));
            const isSlash = resolved.name === 'Chém' || resolved.type === 'slash' || resolved.idKey === 'chem' || resolved.idKey === 'slash' || resolved.id?.includes('slash') || resolved.id?.includes('chem') ||
              (hasDoiNui && (resolved.name === 'Né' || resolved.type === 'dodge')) ||
              (hasKhaiThien && isRed(resolved)) ||
              isNegate;
            if (isSlash) {
              slashCard = resolved;
            }
          }
        }
        TrickRules.respondBarbarian(this.state, playerId, slashCard, data);
        break;
      }

      case 'ASK_CHANGE_JUDGE': {
        let replaceCard = null;
        if (!isCancelOrSkip && (data.doReact || data.cardId || data.cardIndex !== undefined)) {
          replaceCard = this._resolveCard(player, data);
        }
        TrickRules.respondChangeJudge(this.state, playerId, replaceCard, data);
        if (this.state.currentPhase === PHASES.JUDGE && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeJudgePhase();
        }
        break;
      }

      case 'ASK_HAU_VIEN': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doReact && data.targetId !== undefined) {
          this._ensureHeroRevealedForSkill(player, 'hau_vien', 'Hậu Viện');
          const target = this.state.getPlayer(data.targetId);
          if (target && target.isAlive) {
            target.hp = Math.min(target.maxHp, target.hp + 1);
            this.state.addLog(`✨ [Hậu Viện] ${player.name} nhường [Đào] cho ${target.name} (${target.hp}/${target.maxHp}) và rút 1 lá bài!`);
            this.state.drawCards(playerId, 1);
          }
        } else {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          this.state.addLog(`${player.name} sử dụng [Đào], hồi phục 1 Máu (${player.hp}/${player.maxHp}).`);
        }
        break;
      }

      case 'ASK_BOC_TRAM_TRUNG_SLASH': {
        let slashCard = null;
        if (!isCancelOrSkip && (data.doProvide || data.doReact)) {
          const frame = this.state.priorityStack.peek();
          if (frame && frame.sourceId !== undefined) {
            const lord = this.state.getPlayer(frame.sourceId);
            if (lord) this._ensureHeroRevealedForSkill(lord, 'boc_tram_trung', 'Bọc Trăm Trứng');
          }
          slashCard = this._resolveCard(player, data) || player.hand.find(c => c.type === 'slash' || c.name === 'Chém');
        }
        CombatRules.respondBocTramTrungSlash(this.state, playerId, slashCard);
        break;
      }

      case 'ASK_TIEN_PHAT': {
        let dodgeCard = null;
        if (!isCancelOrSkip && (data.doProvide || data.doReact || data.cardId || data.card)) {
          this._ensureHeroRevealedForSkill(player, 'tien_phat', 'Tiên Phát');
          dodgeCard = this._resolveCard(player, data) || player.hand.find(c => c.type === 'dodge' || c.name === 'Né');
        }
        CombatRules.respondTienPhat(this.state, playerId, dodgeCard);
        break;
      }

      case 'ASK_HOACONG_REVEAL': {
        const revealedCard = this._resolveCard(player, data) || (player.hand && player.hand.length > 0 ? player.hand[0] : null);
        TrickRules.respondHoaCongReveal(this.state, playerId, revealedCard);
        break;
      }

      case 'ASK_HOACONG_DISCARD': {
        let discardCard = null;
        if (!isCancelOrSkip && (data.doReact || data.cardId || data.card)) {
          discardCard = this._resolveCard(player, data);
        }
        TrickRules.respondHoaCongDiscard(this.state, playerId, discardCard);
        break;
      }

      case 'ASK_BANH_CHUNG': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && (data.orderedCards || data.deckTop || data.deckBottom)) {
          const viewCount = frame.context?.viewCount || 0;
          if (viewCount > 0 && this.state.drawPile.length >= viewCount) {
            this.state.drawPile = this.state.drawPile.slice(0, this.state.drawPile.length - viewCount);
            const bottomCards = data.deckBottom ? [...data.deckBottom].reverse() : [];
            const topCards = data.deckTop ? [...data.deckTop].reverse() : (Array.isArray(data.orderedCards) ? [...data.orderedCards].reverse() : []);
            this.state.drawPile = [...bottomCards, ...this.state.drawPile, ...topCards];
            this.state.addLog(`✨ [Bánh Chưng] ${player.name} đã sắp xếp lại ${viewCount} lá bài trên đỉnh bộ bài!`);
          }
        }
        if (this.state.currentPhase === PHASES.BEGIN && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeBeginPhase();
        }
        break;
      }

      case 'ASK_DUONG_QUAN_1': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse && data.targetId !== undefined) {
          player.temporaryFlags = player.temporaryFlags || {};
          player.temporaryFlags.skipJudgePhase = true;
          player.temporaryFlags.skipDrawPhase = true;
          this.state.addLog(`⚡ [Dưỡng Quân] ${player.name} bỏ qua Pha Phán xét và Rút bài, tung đòn Chém thần tốc vào ${this.state.getPlayer(data.targetId)?.name}!`);
          CombatRules.playSlash(this.state, playerId, data.targetId, { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
        }
        if (this.state.currentPhase === PHASES.BEGIN && this.state.priorityStack.isEmpty()) {
          if (player.temporaryFlags?.skipJudgePhase) {
            player.temporaryFlags.skipJudgePhase = false;
            player.temporaryFlags.skipDrawPhase = false;
            this.stateMachine._runPhaseAction();
          } else {
            this.stateMachine._completeBeginPhase();
          }
        }
        break;
      }

      case 'ASK_DUONG_QUAN_2': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.targetId !== undefined) {
          const equipCard = this._resolveCard(player, data) || 
            (player.hand ? player.hand.find(c => c.type === 'equip' || c.type === 'EQUIP') : null) ||
            Object.values(player.equipment || {}).find(Boolean);
          if (equipCard) {
            if (player.hand && player.hand.some(c => c.id === equipCard.id)) {
              this.state.discardFromHand(playerId, [equipCard.id]);
            } else {
              for (const slot in player.equipment) {
                if (player.equipment[slot]?.id === equipCard.id) {
                  this.state.discardPile.push(player.equipment[slot]);
                  player.equipment[slot] = null;
                }
              }
            }
            player.temporaryFlags = player.temporaryFlags || {};
            player.temporaryFlags.endActionAfterSlash = true;
            this.state.addLog(`⚡ [Dưỡng Quân] ${player.name} bỏ trang bị [${equipCard.name}], kết thúc Pha Ra bài và Chém thần tốc vào ${this.state.getPlayer(data.targetId)?.name}!`);
            CombatRules.playSlash(this.state, playerId, data.targetId, { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
          }
        }
        break;
      }

      case 'ASK_DUONG_QUAN_3': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse && data.targetId !== undefined) {
          player.isFaceUp = false;
          player.temporaryFlags = player.temporaryFlags || {};
          player.temporaryFlags.skipDiscardPhase = true;
          this.state.addLog(`⚡ [Dưỡng Quân] ${player.name} tự lật úp mặt tướng, bỏ qua Pha Bỏ bài và Chém thần tốc vào ${this.state.getPlayer(data.targetId)?.name}!`);
          CombatRules.playSlash(this.state, playerId, data.targetId, { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
        }
        if (this.state.currentPhase === PHASES.DISCARD && this.state.priorityStack.isEmpty()) {
          if (player.temporaryFlags?.skipDiscardPhase) {
            player.temporaryFlags.skipDiscardPhase = false;
            this.stateMachine._runPhaseEnd();
          } else {
            this.stateMachine._checkDiscardLimit(player);
          }
        }
        break;
      }

      case 'ASK_DIEU_DUOC': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.targetId !== undefined) {
          const card = this._resolveCard(player, data);
          if (card) {
            this.state.discardFromHand(playerId, [card.id]);
            const target = this.state.getPlayer(data.targetId);
            if (target && target.isAlive && target.hp < target.maxHp) {
              target.hp += 1;
              player.skillUsage = player.skillUsage || {};
              player.skillUsage.dieu_duoc = player.skillUsage.dieu_duoc || {};
              player.skillUsage.dieu_duoc.usedThisTurn = true;
              this.state.addLog(`🌿 [Diệu Dược] ${player.name} bỏ 1 bài, chữa lành 1 HP cho ${target.name} (${target.hp}/${target.maxHp})!`);
            }
          }
        }
        break;
      }

      case 'ASK_HOA_THAN': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.targetA !== undefined && data.targetB !== undefined) {
          const targetA = this.state.getPlayer(data.targetA);
          const targetB = this.state.getPlayer(data.targetB);
          if (targetA && targetB && targetA.isAlive && targetB.isAlive && targetA.id !== targetB.id && getPlayerGender(targetA) === 'male' && getPlayerGender(targetB) === 'male') {
            const card = this._resolveCard(player, data);
            if (card) {
              this.state.discardFromHand(playerId, [card.id]);
              player.skillUsage = player.skillUsage || {};
              player.skillUsage.hoa_than = player.skillUsage.hoa_than || {};
              player.skillUsage.hoa_than.usedThisTurn = true;
              this.state.addLog(`💃 [Hòa Thân] ${player.name} bỏ 1 bài, ép ${targetA.name} và ${targetB.name} Quyết Đấu!`);
              TrickRules.playDuel(this.state, data.targetA, data.targetB, { name: 'Quyết Đấu', virtual: true });
            }
          }
        }
        break;
      }

      case 'ASK_BINH_LOAN': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip) {
          let c1, c2;
          if (Array.isArray(data.cardIndexes) && data.cardIndexes.length === 2) {
            c1 = player.hand[data.cardIndexes[0]];
            c2 = player.hand[data.cardIndexes[1]];
          } else if (Array.isArray(data.cardIds) && data.cardIds.length === 2) {
            c1 = player.hand.find(c => c.id === data.cardIds[0]);
            c2 = player.hand.find(c => c.id === data.cardIds[1]);
          }
          if (c1 && c2) {
            const s1 = globalHeroRegistry.getEffectiveSuit(player, c1);
            const s2 = globalHeroRegistry.getEffectiveSuit(player, c2);
            if (s1 === s2) {
              this.state.discardFromHand(playerId, [c1.id, c2.id]);
              this.state.addLog(`🏹 [Bình Loạn] ${player.name} bỏ 2 lá bài cùng chất ${s1}, phát động Loạn Tiễn!`);
              TrickRules.playArrowRain(this.state, playerId, { name: 'Loạn Tiễn', virtual: true });
            }
          }
        }
        break;
      }

      case 'ASK_DINH_QUOC': {
        const frame = this.state.priorityStack.peek();
        const { allySonIds, allyIndex = 0 } = frame.context || {};
        const dinhDien = this.state.getPlayer(frame.sourceId);

        if (!isCancelOrSkip) {
          const card = this._resolveCard(player, data);
          if (card && (card.type === 'dodge' || card.name === 'Né' || card.idKey === 'sam_set' || card.name === 'Sấm Sét')) {
            player.hand = player.hand.filter(c => c.id !== card.id);
            dinhDien.hand.push(card);
            this.state.addLog(`👑 [Định Quốc] ${player.name} dâng tặng lá [${card.name}] cho Định Quốc Công ${dinhDien.name}!`);
            this.state.priorityStack.pop();
            break;
          }
        }

        const nextIdx = allyIndex + 1;
        if (allySonIds && nextIdx < allySonIds.length) {
          frame.context.allyIndex = nextIdx;
          const nextId = allySonIds[nextIdx];
          frame.currentActorId = nextId;
          frame.priorityQueue = [nextId];
        } else {
          this.state.priorityStack.pop();
        }
        break;
      }

      case 'ASK_TRUNG_DUNG': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.virtualCardName) {
          if (player.hp <= 1 && globalHeroRegistry.hasSkill(player, 'ho_gia', true)) {
            this.state.addLog(`⚠️ [Hộ Giá] Lê Ngân còn 1 HP, kỹ năng Trung Dũng bị vô hiệu hóa!`);
            break;
          }
          const card = this._resolveCard(player, data);
          if (card) {
            player.skillUsage = player.skillUsage || {};
            player.skillUsage.trung_dung = player.skillUsage.trung_dung || {};
            player.skillUsage.trung_dung.usedThisTurn = true;
            this.state.addLog(`🤥 [Trung Dũng] ${player.name} úp 1 lá bài, tuyên bố dùng như [${data.virtualCardName}]!`);
            this._handlePlayCard({
              sourceId: playerId,
              cardId: card.id,
              targetIds: data.targetId !== null && data.targetId !== undefined ? [data.targetId] : (data.targetIds || []),
              virtualCardName: data.virtualCardName
            });
          }
        }
        break;
      }

      case 'ASK_THUY_TO': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.selectedAlly !== undefined && Array.isArray(data.selectedCardIds) && data.selectedCardIds.length > 0) {
          const ally = this.state.getPlayer(data.selectedAlly);
          if (ally && ally.isAlive) {
            const transferredCards = [];
            for (const cid of data.selectedCardIds) {
              const idx = player.hand.findIndex(c => c.id === cid);
              if (idx !== -1) {
                const [c] = player.hand.splice(idx, 1);
                transferredCards.push(c);
              }
            }
            ally.hand.push(...transferredCards);
            this.state.addLog(`🌊 [Thủy Tổ] ${player.name} giao ${transferredCards.length} lá bài cho ${ally.name}!`);

            if (transferredCards.length >= 2) {
              this.state.priorityStack.push({
                type: 'ASK_THUY_TO_BONUS',
                sourceId: playerId,
                targetId: playerId,
                currentActorId: playerId,
                priorityQueue: [playerId],
                context: { reason: 'thuy_to_bonus' }
              });
            }
          }
        }
        break;
      }

      case 'ASK_THUY_TO_BONUS': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.virtualCardName) {
          if (data.virtualCardName === 'Chém' && data.targetId !== null && data.targetId !== undefined) {
            CombatRules.playSlash(this.state, playerId, data.targetId, { name: 'Chém', virtual: true });
          } else if (data.virtualCardName === 'Đào') {
            if (player.hp < player.maxHp) {
              player.hp += 1;
              this.state.addLog(`🌊 [Thủy Tổ Thưởng] ${player.name} dùng Đào miễn phí, hồi 1 HP (${player.hp}/${player.maxHp})!`);
            }
          } else if (data.virtualCardName === 'Rượu') {
            player.temporaryFlags = player.temporaryFlags || {};
            player.temporaryFlags.wineActive = true;
            this.state.addLog(`🌊 [Thủy Tổ Thưởng] ${player.name} uống Rượu miễn phí!`);
          }
        }
        break;
      }

      case 'ASK_TU_CHU': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.targetId !== undefined) {
          const myCard = this._resolveCard(player, data) || (player.hand && player.hand.length > 0 ? player.hand[0] : null);
          const target = this.state.getPlayer(data.targetId);
          if (myCard && target && target.hand && target.hand.length > 0) {
            const oppCard = (data.targetCardId ? target.hand.find(c => c.id === data.targetCardId) : null) || target.hand[0];
            // Các lá bài sau khi đấu điểm tiến vào chồng bài bỏ (không tính là bỏ bài)
            this.state.moveCard(oppCard.id, { type: 'hand', playerId: target.id }, { type: 'discardPile' });
            this.state.moveCard(myCard.id, { type: 'hand', playerId: playerId }, { type: 'discardPile' });

            const myRank = rankToNumber(myCard.rank);
            const oppRank = rankToNumber(oppCard.rank);

            if (myRank > oppRank) {
              this.state.addLog(`⚔️ [Tự Chủ] Lộ bài Đấu Điểm: ${player.name} (${myCard.name} [${myRank}]) THẮNG ${target.name} (${oppCard.name} [${oppRank}])!`);
              const aliveOthers = this.state.getAlivePlayers().filter(p => p.id !== target.id && p.id !== playerId && !(globalHeroRegistry.hasSkill(p, 'dam_bac') && (!p.hand || p.hand.length === 0)));
              if (aliveOthers.length > 0 && !target.temporaryFlags?.vanDonLose) {
                CombatRules.playSlash(this.state, target.id, aliveOthers[0].id, { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
              }
            } else if (myRank < oppRank) {
              this.state.addLog(`⚔️ [Tự Chủ] Lộ bài Đấu Điểm: ${player.name} (${myCard.name} [${myRank}]) THUA ${target.name} (${oppCard.name} [${oppRank}])! ${target.name} lập tức Chém ${player.name}!`);
              if (!target.temporaryFlags?.vanDonLose && !(globalHeroRegistry.hasSkill(player, 'dam_bac') && (!player.hand || player.hand.length === 0))) {
                CombatRules.playSlash(this.state, target.id, playerId, { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
              }
            } else {
              // Điểm bằng nhau: Cả hai đều không thắng và không thua
              this.state.addLog(`⚔️ [Tự Chủ] Lộ bài Đấu Điểm HÒA: ${player.name} (${myCard.name} [${myRank}]) HÒA ${target.name} (${oppCard.name} [${oppRank}])! Cả hai đều không thắng và không thua.`);
            }
          }
        }
        break;
      }

      case 'ASK_VAN_DON': {
        if (isCancelOrSkip) {
          if (playerId === frame.sourceId && (!frame.context?.chosenCards || Object.keys(frame.context.chosenCards).length === 0)) {
            this.state.priorityStack.pop();
            this.state.addLog(`🌊 [Vân Đồn] ${player.name} đã hủy bỏ Đấu Điểm.`);
            break;
          }
        }

        const target = this.state.getPlayer(frame.targetId);
        const initiator = this.state.getPlayer(frame.sourceId);

        // Trường hợp 1: Backward-compatibility khi unit test gửi kèm targetCardId ngay lập tức
        if (data.targetCardId && target && target.hand && target.hand.length > 0) {
          this.state.priorityStack.pop();
          const myCard = this._resolveCard(player, data) || (player.hand && player.hand.length > 0 ? player.hand[0] : null);
          const oppCard = target.hand.find(c => c.id === data.targetCardId) || target.hand[0];
          if (myCard && oppCard) {
            this.state.moveCard(myCard.id, { type: 'hand', playerId: initiator.id }, { type: 'discardPile' });
            this.state.moveCard(oppCard.id, { type: 'hand', playerId: target.id }, { type: 'discardPile' });

            const myRank = rankToNumber(myCard.rank);
            const oppRank = rankToNumber(oppCard.rank);

            initiator.temporaryFlags = initiator.temporaryFlags || {};
            if (myRank > oppRank) {
              initiator.temporaryFlags.vanDonWin = true;
              this.state.addLog(`🌊 [Vân Đồn] Lộ bài Đấu Điểm: ${initiator.name} (${myCard.name} [${myCard.rank || myRank}]) THẮNG ${target.name} (${oppCard.name} [${oppCard.rank || oppRank}])! Được đánh thêm 1 Chém vô hạn cự ly và chọn 2 mục tiêu!`);
            } else if (myRank < oppRank) {
              initiator.temporaryFlags.vanDonLose = true;
              this.state.addLog(`🌊 [Vân Đồn] Lộ bài Đấu Điểm: ${target.name} (${oppCard.name} [${oppCard.rank || oppRank}]) THẮNG ${initiator.name} (${myCard.name} [${myCard.rank || myRank}])! ${initiator.name} bị cấm Chém trong lượt này!`);
            } else {
              initiator.temporaryFlags.vanDonLose = true;
              this.state.addLog(`🌊 [Vân Đồn] Lộ bài Đấu Điểm HÒA: ${initiator.name} (${myCard.name} [${myCard.rank || myRank}]) HÒA ${target.name} (${oppCard.name} [${oppCard.rank || oppRank}])! Cả hai đều không thắng và không thua. ${initiator.name} không thắng nên bị cấm Chém trong lượt này!`);
            }
          }
          break;
        }

        // Trường hợp 2: Quy trình Đấu Điểm chuẩn (Two-Phase Point Duel)
        const chosenCard = this._resolveCard(player, data) || (player.hand && player.hand.length > 0 ? player.hand[0] : null);
        if (!chosenCard) {
          this.state.priorityStack.pop();
          break;
        }

        frame.context = frame.context || {};
        frame.context.chosenCards = frame.context.chosenCards || {};
        frame.context.chosenCards[playerId] = chosenCard;

        const nextActor = frame.nextActor();
        if (nextActor !== null) {
          // Còn người chơi tiếp theo cần chọn bài bí mật
          const nextPlayer = this.state.getPlayer(nextActor);
          this.state.addLog(`🌊 [Vân Đồn] ${player.name} đã chọn bài đấu điểm. Đang chờ ${nextPlayer?.name} chọn bài đọ điểm...`);
          break;
        }

        // Tất cả người tham gia đã chọn bài xong -> Pop frame và LỘ BÀI CÙNG LÚC!
        this.state.priorityStack.pop();
        const myCard = frame.context.chosenCards[frame.sourceId];
        const oppCard = frame.context.chosenCards[frame.targetId];

        if (initiator && target && myCard && oppCard) {
          // Các lá bài sau khi đấu điểm sẽ tiến vào chồng bài bỏ (không tính là bỏ bài)
          this.state.moveCard(myCard.id, { type: 'hand', playerId: initiator.id }, { type: 'discardPile' });
          this.state.moveCard(oppCard.id, { type: 'hand', playerId: target.id }, { type: 'discardPile' });

          const myRank = rankToNumber(myCard.rank);
          const oppRank = rankToNumber(oppCard.rank);

          initiator.temporaryFlags = initiator.temporaryFlags || {};
          if (myRank > oppRank) {
            initiator.temporaryFlags.vanDonWin = true;
            this.state.addLog(`🌊 [Vân Đồn] Lộ bài Đấu Điểm: ${initiator.name} (${myCard.name} [${myCard.rank || myRank}]) THẮNG ${target.name} (${oppCard.name} [${oppCard.rank || oppRank}])! Được đánh thêm 1 Chém vô hạn cự ly và chọn 2 mục tiêu!`);
          } else if (myRank < oppRank) {
            initiator.temporaryFlags.vanDonLose = true;
            this.state.addLog(`🌊 [Vân Đồn] Lộ bài Đấu Điểm: ${target.name} (${oppCard.name} [${oppCard.rank || oppRank}]) THẮNG ${initiator.name} (${myCard.name} [${myCard.rank || myRank}])! ${initiator.name} bị cấm Chém trong lượt này!`);
          } else {
            // "Nếu 2 lá bài có điểm số bằng nhau sẽ được tính là cả không thắng và không thua."
            // Với kỹ năng Vân Đồn: "Nếu không thắng, bạn không thể sử dụng [Chém] trong lượt này."
            initiator.temporaryFlags.vanDonLose = true;
            this.state.addLog(`🌊 [Vân Đồn] Lộ bài Đấu Điểm HÒA: ${initiator.name} (${myCard.name} [${myCard.rank || myRank}]) HÒA ${target.name} (${oppCard.name} [${oppCard.rank || oppRank}])! Cả hai đều không thắng và không thua. ${initiator.name} không thắng nên bị cấm Chém trong lượt này!`);
          }
        }
        break;
      }

      case 'ASK_DUYEN_THO': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.targetId !== undefined) {
          const target = this.state.getPlayer(data.targetId);
          const cardIds = (Array.isArray(data.cardIds) && data.cardIds.length > 0)
            ? data.cardIds
            : (data.cardIndexes ? data.cardIndexes.map(i => player.hand[i]?.id).filter(Boolean) : (data.cardId ? [data.cardId] : []));
          let cardsToDiscard = [];
          if (cardIds.length >= 2) {
            cardsToDiscard = cardIds.slice(0, 2);
          } else if (player.hand && player.hand.length >= 2) {
            cardsToDiscard = [player.hand[0].id, player.hand[1].id];
          }

          if (cardsToDiscard.length >= 2) {
            this.state.discardFromHand(playerId, cardsToDiscard);
            if (player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + 1);
            if (target && target.isAlive && getPlayerGender(target) === 'male' && target.hp < target.maxHp) {
              target.hp = Math.min(target.maxHp, target.hp + 1);
            }
            player.skillUsage = player.skillUsage || {};
            player.skillUsage.duyen_tho = player.skillUsage.duyen_tho || {};
            player.skillUsage.duyen_tho.usedThisTurn = true;
            this.state.addLog(`📜 [Duyên Thơ] ${player.name} bỏ 2 lá bài ngâm thơ, hồi 1 HP cho bản thân (${player.hp}/${player.maxHp}) và ${target?.name || 'tướng nam'} (${target?.hp}/${target?.maxHp})!`);
          }
        }
        break;
      }

      case 'ASK_DOAT_SAO': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse) {
          player.isFaceUp = !player.isFaceUp;
          player.isFlipped = !player.isFaceUp;
          this.state.drawCards(playerId, 4);
          this.state.addLog(`⭐ [Đoạt Sáo] ${player.name} lật mặt tướng và rút 4 lá bài!`);
          if (player.hand && player.hand.length > 0) {
            this.state.priorityStack.push({
              type: 'ASK_DOAT_SAO_DISCARD',
              sourceId: playerId,
              targetId: playerId,
              currentActorId: playerId,
              priorityQueue: [playerId]
            });
          }
        }
        break;
      }

      case 'ASK_DOAT_SAO_DISCARD': {
        this.state.priorityStack.pop();
        const card = this._resolveCard(player, data) || (player.hand && player.hand.length > 0 ? player.hand[0] : null);
        if (card) {
          let rawSubtype = null;
          try {
            rawSubtype = getCardSubType(card);
          } catch (e) {
            rawSubtype = card.subtype || card.type;
          }
          if (!rawSubtype) rawSubtype = card.subtype || card.type;
          let equipSlot = null;
          if (rawSubtype === 'equip_weapon' || rawSubtype === 'weapon' || card.subtype === 'equip_weapon') equipSlot = 'weapon';
          else if (rawSubtype === 'equip_armor' || rawSubtype === 'armor' || card.subtype === 'equip_armor') equipSlot = 'armor';
          else if (rawSubtype === 'equip_mount_atk' || rawSubtype === 'horse_attack' || card.subtype === 'equip_mount_atk') equipSlot = 'horse_attack';
          else if (rawSubtype === 'equip_mount_def' || rawSubtype === 'horse_defense' || card.subtype === 'equip_mount_def') equipSlot = 'horse_defense';

          if (equipSlot) {
            player.hand = player.hand.filter(c => c.id !== card.id);
            player.equipment = player.equipment || {};
            const oldEquip = player.equipment[equipSlot];
            if (oldEquip) {
              this.state.discardPile.push(oldEquip);
              globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: player.id, card: oldEquip }, this.state);
              if (oldEquip.name === 'Bạch Ngân' || oldEquip.name === 'Bạch Ngân Sư Tử' || isEquip(oldEquip, 'bach_ngan') || oldEquip.id?.includes('bach_ngan') || oldEquip.key === 'bach-ngan') {
                player.hp = Math.min(player.maxHp, player.hp + 1);
                this.state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${player.name}, hồi 1 HP (${player.hp}/${player.maxHp})!`);
              }
            }
            player.equipment[equipSlot] = card;
            this.state.addLog(`⭐ [Đoạt Sáo] ${player.name} tự động trang bị [${card.name}]!`);
          } else {
            this.state.discardFromHand(playerId, [card.id]);
            this.state.addLog(`⭐ [Đoạt Sáo] ${player.name} bỏ lá bài [${card.name}]!`);
          }
        }
        break;
      }

      case 'ASK_HIEN_HAU': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse && data.targetId !== undefined) {
          // Bắt buộc Minh Khai tướng sở hữu kỹ năng Hiền Hậu (Ngọc Hân Công Chúa) nếu đang ẩn
          this._ensureHeroRevealedForSkill(player, 'hien_hau', 'Hiền Hậu');

          const cardId = data.cardId || (player.hand[data.cardIdx] && player.hand[data.cardIdx].id);
          const card = player.hand.find(c => c.id === cardId) || player.hand[0];
          if (card) {
            this.state.discardFromHand(playerId, [card.id]);
            this.state.addLog(`🌸 [Hiền Hậu] ${player.name} bỏ lá bài [${card.name}] ngăn toàn bộ sát thương!`);
            const other = this.state.getPlayer(data.targetId);
            if (other && other.isAlive) {
              if (data.option === 1) {
                CombatRules.applyDamage(this.state, playerId, other.id, 1, 'hien_hau');
                const deficit = Math.min(5, Math.max(0, other.maxHp - other.hp));
                if (deficit > 0) {
                  this.state.drawCards(other.id, deficit);
                  this.state.addLog(`🃏 [Hiền Hậu] ${other.name} rút ${deficit} lá bài!`);
                }
              } else {
                other.hp -= 1;
                this.state.addLog(`⚡ [Hiền Hậu] ${other.name} mất 1 HP (${other.hp}/${other.maxHp}) và thu lấy lá [${card.name}]!`);
                other.hand.push(card);
                this.state.discardPile = this.state.discardPile.filter(c => c.id !== card.id);
                if (other.hp <= 0) {
                  CombatRules.enterDyingState(this.state, other.id, playerId);
                }
              }
            }
          }
        } else {
          // Bỏ qua Hiền Hậu -> Áp dụng lại sát thương
          player.temporaryFlags = player.temporaryFlags || {};
          player.temporaryFlags.hienHauAttempted = true;
          CombatRules.applyDamage(
            this.state,
            frame.context.attackerId,
            playerId,
            frame.context.damageAmount,
            frame.context.reason,
            frame.context.isChainedPropagation
          );
          player.temporaryFlags.hienHauAttempted = false;
        }
        break;
      }

      case 'ASK_KHOAN_DAN': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse && data.targetId !== undefined) {
          const chosen = this.state.getPlayer(data.targetId);
          if (chosen && chosen.isAlive) {
            const deficit = Math.max(0, Math.min(5, chosen.maxHp) - (chosen.hand ? chosen.hand.length : 0));
            if (deficit > 0) {
              this.state.drawCards(chosen.id, deficit);
              this.state.addLog(`🕊️ [Khoan Dân] ${player.name} chọn ${chosen.name} rút ${deficit} lá bài cho bằng giới hạn HP!`);
            }
          }
        }
        break;
      }

      case 'ASK_TRE_NGA_DISCARD': {
        this.state.priorityStack.pop();
        const requiredSuit = frame.context?.judgeSuit;
        if (!isCancelOrSkip && data.doDiscard) {
          const card = this._resolveCard(player, data);
          const effSuit = globalHeroRegistry.getEffectiveSuit(player, card) || card.suit;
          const isSuitMatch = card && isSameSuit(effSuit, requiredSuit);

          if (isSuitMatch) {
            this.state.discardFromHand(playerId, [card.id]);
            this.state.addLog(`🎋 [Tre Ngà] ${player.name} bỏ 1 lá bài chất [${card.suit}] để giữ quyền dùng [Né]!`);
          } else {
            this.state.addLog(`🎋 [Tre Ngà] ${player.name} không bỏ đúng lá bài chất [${requiredSuit}], mất quyền dùng [Né]!`);
            if (!this.state.priorityStack.isEmpty() && this.state.priorityStack.peek().type === 'ASK_DODGE') {
              CombatRules.respondDodge(this.state, playerId, null);
            }
          }
        } else {
          this.state.addLog(`🎋 [Tre Ngà] ${player.name} không bỏ bài, mất quyền dùng [Né]!`);
          if (!this.state.priorityStack.isEmpty() && this.state.priorityStack.peek().type === 'ASK_DODGE') {
            CombatRules.respondDodge(this.state, playerId, null);
          }
        }
        break;
      }

      case 'ASK_THAT_TRAM_SO_PUNISH': {
        this.state.priorityStack.pop();
        if (data.option === 'discard' && player.hand?.length >= 2) {
          const toDiscard = (Array.isArray(data.cardIds) && data.cardIds.length >= 2)
            ? data.cardIds.slice(0, 2)
            : (data.cardIndexes ? data.cardIndexes.map(i => player.hand[i]?.id).filter(Boolean) : [player.hand[0]?.id, player.hand[1]?.id].filter(Boolean));
          this.state.discardFromHand(playerId, toDiscard);
          this.state.addLog(`⚖️ [Thất Trảm Sớ] ${player.name} chọn bỏ 2 lá bài!`);
        } else {
          this.state.addLog(`⚡ [Thất Trảm Sớ] ${player.name} nhận 1 sát thương!`);
          CombatRules.applyDamage(this.state, frame.context.sourceId, playerId, 1, 'that_tram_so');
        }
        break;
      }

      case 'ASK_DOI_SU': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse) {
          const target = this.state.getPlayer(frame.targetId);
          if (target && target.hand && target.hand.length > 0) {
            const stolen = target.hand.pop();
            player.hand.push(stolen);
            this.state.addLog(`📜 [Đối Sứ] ${player.name} thu lấy 1 lá bài từ ${target.name}!`);
          }
        }
        break;
      }

      case 'ASK_HOA_NGHI': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.distribution && Array.isArray(data.distribution)) {
          for (const dist of data.distribution) {
            const cardIdx = player.hand.findIndex(c => c.id === dist.cardId);
            const target = this.state.getPlayer(dist.targetId);
            if (cardIdx !== -1 && target && target.isAlive && target.id !== player.id) {
              const [card] = player.hand.splice(cardIdx, 1);
              target.hand.push(card);
              this.state.addLog(`🕊️ [Hòa Nghị] ${player.name} tặng lá [${card.name}] cho ${target.name}!`);
            }
          }
        } else {
          this.state.addLog(`🕊️ [Hòa Nghị] ${player.name} giữ lại toàn bộ bài từ [Hòa Nghị]!`);
        }
        break;
      }

      case 'ASK_DA_TRACH': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse && Array.isArray(data.targets) && data.targets.length > 0) {
          player.temporaryFlags = player.temporaryFlags || {};
          player.temporaryFlags.skipDrawPhase = true;
          for (const tId of data.targets.slice(0, 2)) {
            const target = this.state.getPlayer(tId);
            if (target && target.hand && target.hand.length > 0) {
              const stolen = target.hand.pop();
              player.hand.push(stolen);
              this.state.addLog(`🌙 [Dạ Trạch] ${player.name} rút trộm 1 lá bài từ ${target.name}!`);
            }
          }
        }
        if (this.state.currentPhase === PHASES.DRAW && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeDrawPhase();
        }
        break;
      }

      case 'ASK_KHOI_NGHIA': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse) {
          player.temporaryFlags = player.temporaryFlags || {};
          player.temporaryFlags.drawCardCount = 1;
          player.temporaryFlags.bonusDamage = 1;
          this.state.addLog(`🔥 [Khởi Nghĩa] ${player.name} phát động Khởi Nghĩa, rút 1 lá và nhận +1 sát thương lượt này!`);
        }
        if (this.state.currentPhase === PHASES.DRAW && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeDrawPhase();
        }
        break;
      }

      case 'ASK_PHA_THANH': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doJudge) {
          const judgeCard = this.state.drawCardFromDeck();
          if (judgeCard) {
            player.hand.push(judgeCard);
            player.temporaryFlags = player.temporaryFlags || {};
            player.temporaryFlags.skipDrawPhase = true;
            const isRed = judgeCard.color === 'red' || judgeCard.suit === 'heart' || judgeCard.suit === 'diamond' || judgeCard.suit === '♥' || judgeCard.suit === '♦';
            player.temporaryFlags.phaThanhOppositeColor = isRed ? 'black' : 'red';
            this.state.addLog(`⚡ [Phá Thành] ${player.name} phán xét nhận lá [${judgeCard.name}] màu ${judgeCard.color}, có thể dùng bài màu ${player.temporaryFlags.phaThanhOppositeColor} như [Quyết Đấu]!`);
          }
        }
        if (this.state.currentPhase === PHASES.DRAW && this.state.priorityStack.isEmpty()) {
          this.stateMachine._completeDrawPhase();
        }
        break;
      }

      case 'ASK_NAM_QUOC_SON_HA': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse) {
          this.state.drawCards(player.id, 1);
          const dmgCard = frame.context?.damageCard;
          if (dmgCard && dmgCard.id && !dmgCard.virtual) {
            const idx = this.state.discardPile.findIndex(c => c.id === dmgCard.id);
            if (idx !== -1) {
              const [retrieved] = this.state.discardPile.splice(idx, 1);
              player.hand.push(retrieved);
              this.state.addLog(`📜 [Nam Quốc Sơn Hà] ${player.name} thu hồi lá [${retrieved.name}]!`);
            } else {
              this.state.addLog(`📜 [Nam Quốc Sơn Hà] ${player.name} rút 1 lá bài!`);
            }
          } else {
            this.state.addLog(`📜 [Nam Quốc Sơn Hà] ${player.name} rút 1 lá bài!`);
          }
        }
        break;
      }

      case 'ASK_TIEN_PHONG': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse) {
          const target = this.state.getPlayer(data.targetId || frame.targetId);
          if (target && target.isAlive) {
            const alivePlayers = this.state.getAlivePlayers();
            if (!RangeSystem.inSlashRange(player, target, alivePlayers)) {
              throw new Error('[Tiên Phong] Mục tiêu nằm ngoài tầm đánh!');
            }
            if (data.costType === 'weapon') {
              let weaponCard = null;
              if (data.cardId) {
                if (player.equipment?.weapon && player.equipment.weapon.id === data.cardId) {
                  weaponCard = player.equipment.weapon;
                  player.equipment.weapon = null;
                  this.state.discardPile.push(weaponCard);
                  globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: player.id, card: weaponCard }, this.state);
                } else {
                  const handCard = player.hand?.find(c => c.id === data.cardId);
                  if (handCard) {
                    weaponCard = handCard;
                    this.state.discardFromHand(player.id, [weaponCard.id]);
                  }
                }
              }
              if (!weaponCard) {
                if (player.equipment?.weapon) {
                  weaponCard = player.equipment.weapon;
                  player.equipment.weapon = null;
                  this.state.discardPile.push(weaponCard);
                  globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: player.id, card: weaponCard }, this.state);
                } else {
                  const handWeapon = (player.hand || []).find(c => {
                    if (!c) return false;
                    const st = getCardSubType(c);
                    return st === 'equip_weapon' || c.type === 'weapon' || c.subtype === 'equip_weapon' || c.subType === 'equip_weapon';
                  });
                  if (handWeapon) {
                    weaponCard = handWeapon;
                    this.state.discardFromHand(player.id, [weaponCard.id]);
                  }
                }
              }
              if (weaponCard) {
                this.state.addLog(`⚡ [Tiên Phong] ${player.name} bỏ vũ khí [${weaponCard.name}], gây 1 sát thương lên ${target?.name}!`);
              } else {
                throw new Error('[Tiên Phong] Không tìm thấy vũ khí để bỏ!');
              }
            } else {
              player.hp -= 1;
              this.state.addLog(`⚡ [Tiên Phong] ${player.name} mất 1 HP, gây 1 sát thương lên ${target?.name}!`);
            }
            CombatRules.applyDamage(this.state, player.id, target.id, 1, 'tien_phong');
          }
        }
        break;
      }

      case 'ASK_SUIT': {
        this.state.priorityStack.pop();
        const asker = this.state.getPlayer(frame.context?.sourceId);
        if (asker && asker.hand && asker.hand.length > 0) {
          const randomIndex = Math.floor(Math.random() * asker.hand.length);
          const [stolen] = asker.hand.splice(randomIndex, 1);
          player.hand.push(stolen);

          const suitMap = {
            '♥': 'heart', 'heart': 'heart', 'hearts': 'heart', 'cơ': 'heart',
            '♦': 'diamond', 'diamond': 'diamond', 'diamonds': 'diamond', 'rô': 'diamond',
            '♠': 'spade', 'spade': 'spade', 'spades': 'spade', 'bích': 'spade',
            '♣': 'club', 'club': 'club', 'clubs': 'club', 'chuồn': 'club', 'tép': 'club'
          };
          const suitLabels = {
            'heart': '♥ Cơ',
            'diamond': '♦ Rô',
            'spade': '♠ Bích',
            'club': '♣ Chuồn'
          };

          const rawChosen = data.suit || '♥';
          const normalizedChosen = suitMap[rawChosen] || 'heart';
          const normalizedCardSuit = suitMap[stolen.suit] || stolen.suit;
          const isMatch = normalizedChosen === normalizedCardSuit;

          const chosenLabel = suitLabels[normalizedChosen] || rawChosen;
          const cardLabel = suitLabels[normalizedCardSuit] || stolen.suit;

          this.state.addLog(`🔮 [Tâm Công] ${player.name} đoán chất [${chosenLabel}]. Lá bài nhận được là [${stolen.name} ${cardLabel}]!`);
          if (!isMatch) {
            this.state.addLog(`💥 Đoán sai chất! ${player.name} nhận 1 sát thương từ [Tâm Công]!`);
            CombatRules.applyDamage(this.state, asker.id, player.id, 1, 'tam_cong');
          } else {
            this.state.addLog(`✅ Đoán đúng chất! ${player.name} an toàn nhận bài!`);
          }
        }
        break;
      }

      case 'ASK_HO_CHU': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse) {
          const card = this.state.drawCardFromDeck();
          if (card) {
            player.trungCards = player.trungCards || [];
            const isDuplicate = player.trungCards.some(c => c.rank === card.rank);
            if (!isDuplicate) {
              player.trungCards.push(card);
              player.hp = Math.max(1, player.hp);
              this.state.addLog(`🛡️ [Hộ Chủ] ${player.name} lật [Trung]: ${card.suit} ${card.rank} (không trùng điểm)! Thoát chết hồi phục lên 1 HP!`);
              if (!this.state.priorityStack.isEmpty() && this.state.priorityStack.peek().type === 'ASK_PEACH') {
                this.state.priorityStack.pop();
              }
            } else {
              this.state.discardPile.push(card);
              this.state.addLog(`❌ [Hộ Chủ] ${player.name} lật [Trung]: ${card.suit} ${card.rank} (bị trùng điểm)! Thất bại.`);
            }
          }
        }
        break;
      }

      case 'ASK_HOA_THAN_AN_TU': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.targetId !== undefined) {
          let card = null;
          if (data.cardFrom === 'equip' && data.cardIndex !== undefined) {
            const equipCards = Object.values(player.equipment || {}).filter(Boolean);
            card = equipCards[data.cardIndex];
            if (card) {
              for (const slot in player.equipment) {
                if (player.equipment[slot]?.id === card.id) {
                  delete player.equipment[slot];
                  break;
                }
              }
            }
          } else {
            card = this._resolveCard(player, data);
            if (card) {
              this.state.discardFromHand(playerId, [card.id]);
            }
          }

          if (card) {
            this.state.addLog(`🌺 [Hòa Thân] ${player.name} sử dụng lá bài Rô [${card.name}] như [Hỗn Loạn]!`);
            TrickRules.playChaos(this.state, playerId, data.targetId, { ...card, name: 'Hỗn Loạn', idKey: 'hon_loan', virtual: true });
          }
        }
        break;
      }

      case 'ASK_CAN_GIAN': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && (data.doUse || data.doReact) && player.hp > 1) {
          const targetId = data.targetId !== undefined ? data.targetId : (frame.targetId !== undefined ? frame.targetId : null);
          const target = targetId !== null ? this.state.getPlayer(targetId) : null;
          if (target && target.isAlive) {
            player.hp -= 1;
            this.state.drawCards(target.id, 2);
            this.state.addLog(`🕊️ [Can Gián] ${player.name} mất 1 HP giúp ${target.name} rút 2 lá bài!`);
          }
        }
        break;
      }

      case 'ASK_THONG_NGON': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse && frame.context?.judgeCard) {
          const judgeCard = frame.context.judgeCard;
          player.hand.push(judgeCard);
          this.state.discardPile = this.state.discardPile.filter(c => c.id !== judgeCard.id);
          this.state.addLog(`📜 [Thông Ngôn] ${player.name} thu hồi lá phán xét [${judgeCard.name}] về tay!`);
        }
        break;
      }

      case 'ASK_PHAT_TAM': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.doUse) {
          const blackCards = [];
          while (true) {
            const judge = this.state.drawCardFromDeck();
            if (!judge) break;
            const isBlack = judge.color === 'black' || judge.suit === 'spade' || judge.suit === 'club' || judge.suit === '♠' || judge.suit === '♣';
            if (isBlack) {
              blackCards.push(judge);
              this.state.addLog(`🧘 [Phật Tâm] ${player.name} phán xét ra lá [${judge.name} ${judge.suit}] (ĐEN), tiếp tục phán xét!`);
            } else {
              this.state.discardPile.push(judge);
              this.state.addLog(`🧘 [Phật Tâm] ${player.name} phán xét ra lá [${judge.name} ${judge.suit}] (ĐỎ), kết thúc phán xét.`);
              break;
            }
          }
          if (blackCards.length > 0) {
            player.hand.push(...blackCards);
            this.state.addLog(`🧘 [Phật Tâm] ${player.name} thu được ${blackCards.length} lá bài Đen về tay!`);
          }
        }
        break;
      }

      default:
        // Universal AI Fallback & Frame Auto-pop
        this.state.priorityStack.pop();
        break;
    }

    // Post-reaction Phase Transitions when stack clears
    if (this.state.priorityStack.isEmpty()) {
      const turnPlayer = this.state.getCurrentPlayer();
      if (turnPlayer) {
        if (!turnPlayer.isAlive) {
          this.stateMachine.nextTurn();
        } else if (this.state.currentPhase === PHASES.BEGIN && turnPlayer.temporaryFlags?.skipJudgePhase) {
          turnPlayer.temporaryFlags.skipJudgePhase = false;
          turnPlayer.temporaryFlags.skipDrawPhase = false;
          this.stateMachine._runPhaseAction();
        } else if (this.state.currentPhase === PHASES.ACTION && turnPlayer.temporaryFlags?.endActionAfterSlash) {
          turnPlayer.temporaryFlags.endActionAfterSlash = false;
          this.stateMachine.endActionPhase();
        } else if (this.state.currentPhase === PHASES.DISCARD && turnPlayer.temporaryFlags?.skipDiscardPhase) {
          turnPlayer.temporaryFlags.skipDiscardPhase = false;
          this.stateMachine._runPhaseEnd();
        } else if (this.state.currentPhase === PHASES.DISCARD) {
          this.stateMachine._checkDiscardLimit(turnPlayer);
        } else if (this.state.currentPhase === PHASES.END) {
          this.stateMachine.nextTurn();
        }
      }
    }
  }

  _handleSkill({ playerId, sourceId, skillId, cardIds = [], targets = [], ...options }) {
    const effectivePlayerId = playerId !== undefined ? playerId : sourceId;
    const player = this.state.getPlayer(effectivePlayerId);
    if (!player) return;
    playerId = effectivePlayerId;

    // Bắt buộc Minh Khai tướng sở hữu kỹ năng khi kích hoạt chủ động
    if (skillId) {
      this._ensureHeroRevealedForSkill(player, skillId);
    }

    const normSkillId = normalizeSkillId(skillId);

    if (normSkillId === 'lan_sau') {
      if (player.hp <= 1) {
        throw new Error('[Lặn Sâu] Không thể mất máu khi chỉ còn 1 HP!');
      }
      player.hp -= 1;
      this.state.drawCards(playerId, 2);
      this.state.addLog(`🌊 [Lặn Sâu] kích hoạt: ${player.name} mất 1 HP để rút 2 lá bài!`);
      return;
    }

    if (normSkillId === 'bach_dang') {
      player.skillUsage = player.skillUsage || {};
      player.skillUsage.bach_dang = player.skillUsage.bach_dang || {};
      if (player.skillUsage.bach_dang.usedThisTurn) {
        throw new Error('[Bạch Đằng] Mỗi lượt chỉ được sử dụng 1 lần!');
      }
      const handCards = player.hand || [];
      if (handCards.length === 0) {
        throw new Error('[Bạch Đằng] Không có bài trên tay để đổi!');
      }
      const usedCardIds = cardIds.length > 0 ? cardIds : (options.cardId ? [options.cardId] : handCards.map(c => c.id));
      const count = usedCardIds.length;
      const discardedAll = (count === handCards.length);
      this.state.discardFromHand(playerId, usedCardIds);
      const drawCount = discardedAll ? count + 1 : count;
      this.state.drawCards(playerId, drawCount);
      player.skillUsage.bach_dang.usedThisTurn = true;
      this.state.addLog(`🌊 [Bạch Đằng] ${player.name} đổi ${count} bài và rút ${drawCount} lá bài mới!`);
      return;
    }

    if (normSkillId === 'ky_tap') {
      const usedCardId = cardIds.length > 0 ? cardIds[0] : options.cardId;
      const card = player.hand.find(c => c.id === usedCardId);
      if (!card) throw new Error('[Kỳ Tập] Không tìm thấy lá bài trên tay!');
      const effColor = globalHeroRegistry.getEffectiveColor(player, card);
      const isRed = effColor ? effColor === 'red' : Boolean(card.color === 'red' || getSuitColor(card.suit) === 'red');
      if (isRed) throw new Error('[Kỳ Tập] Chỉ có thể dùng lá bài màu Đen như [Tước Bài]!');
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;
      if (targetId === undefined) throw new Error('[Kỳ Tập] Vui lòng chọn mục tiêu để Tước Bài!');
      this.state.discardFromHand(playerId, [card.id]);
      this.state.addLog(`⚡ [Kỳ Tập] ${player.name} dùng lá bài Đen [${card.name}] như [Tước Bài]!`);
      const isInteractive = options.interactive === true;
      TrickRules.playDismantle(this.state, playerId, targetId, { ...card, name: 'Tước Bài', idKey: 'tuoc_bai', virtual: true }, { interactive: isInteractive });
      return;
    }

    if (normSkillId === 'can_gian') {
      if (player.hp <= 1) throw new Error('[Can Gián] Sinh lực phải lớn hơn 1 để Can Gián!');
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;
      if (targetId === undefined) {
        this.state.priorityStack.push({
          type: 'ASK_CAN_GIAN',
          sourceId: playerId,
          targetId: playerId,
          currentActorId: playerId,
          priorityQueue: [playerId],
          context: { reason: 'can_gian' }
        });
        return;
      }
      const target = this.state.getPlayer(targetId);
      if (!target || !target.isAlive) throw new Error('[Can Gián] Mục tiêu không hợp lệ!');
      player.hp -= 1;
      this.state.drawCards(target.id, 2);
      this.state.addLog(`🕊️ [Can Gián] ${player.name} mất 1 HP giúp ${target.name} rút 2 lá bài!`);
      return;
    }

    if (normSkillId === 'dieu_duoc') {
      const usedCardIds = cardIds.length > 0 ? cardIds : (options.cardId ? [options.cardId] : []);
      if (player.skillUsage?.dieu_duoc?.usedThisTurn) {
        throw new Error('[Diệu Dược] Mỗi lượt chỉ được sử dụng 1 lần!');
      }
      if (targets.length > 0 && usedCardIds.length > 0) {
        const target = this.state.getPlayer(targets[0]);
        if (target && target.isAlive && target.hp < target.maxHp) {
          this.state.discardFromHand(playerId, [usedCardIds[0]]);
          target.hp += 1;
          player.skillUsage = player.skillUsage || {};
          player.skillUsage.dieu_duoc = player.skillUsage.dieu_duoc || {};
          player.skillUsage.dieu_duoc.usedThisTurn = true;
          this.state.addLog(`🌿 [Diệu Dược] ${player.name} chữa lành 1 HP cho ${target.name} (${target.hp}/${target.maxHp})!`);
        } else {
          throw new Error('[Diệu Dược] Mục tiêu đã đầy Máu!');
        }
      } else {
        this.state.priorityStack.push({
          type: 'ASK_DIEU_DUOC',
          sourceId: playerId,
          targetId: playerId,
          currentActorId: playerId,
          priorityQueue: [playerId],
          context: { reason: 'dieu_duoc' }
        });
      }
      return;
    }

    if (normSkillId === 'hoa_than_an_tu') {
      const usedCardId = cardIds.length > 0 ? cardIds[0] : options.cardId;
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;

      if (!usedCardId || targetId === undefined) {
        this.state.priorityStack.push({
          type: 'ASK_HOA_THAN_AN_TU',
          sourceId: playerId,
          targetId: playerId,
          currentActorId: playerId,
          priorityQueue: [playerId],
          context: { reason: 'hoa_than_an_tu' }
        });
        return;
      }

      const card = player.hand.find(c => c.id === usedCardId);
      if (!card) throw new Error('[Hòa Thân] Không tìm thấy lá bài trên tay!');
      const isDiamond = normalizeSuit(card.suit).code === 'diamond';
      if (!isDiamond) throw new Error('[Hòa Thân] Chỉ có thể dùng lá bài chất Rô ♦ như [Hỗn Loạn]!');
      this.state.addLog(`🌺 [Hòa Thân] ${player.name} sử dụng lá bài Rô [${card.name}] như [Hỗn Loạn]!`);
      TrickRules.playChaos(this.state, playerId, targetId, { ...card, name: 'Hỗn Loạn', idKey: 'hon_loan', virtual: true });
      return;
    }

    if (normSkillId === 'hoa_than' || normSkillId === 'hoa_than_huyen_tran') {
      player.skillUsage = player.skillUsage || {};
      player.skillUsage.hoa_than = player.skillUsage.hoa_than || {};
      if (player.skillUsage.hoa_than.usedThisTurn) {
        throw new Error('[Hòa Thân] Mỗi lượt chỉ được sử dụng 1 lần!');
      }

      if (targets.length >= 2) {
        const targetA = this.state.getPlayer(targets[0]);
        const targetB = this.state.getPlayer(targets[1]);
        if (!targetA || !targetB || !targetA.isAlive || !targetB.isAlive) {
          throw new Error('[Hòa Thân] Hai mục tiêu phải còn sống!');
        }
        if (targetA.id === targetB.id) {
          throw new Error('[Hòa Thân] Hai mục tiêu phải là hai người chơi khác nhau!');
        }
        if (getPlayerGender(targetA) !== 'male' || getPlayerGender(targetB) !== 'male') {
          throw new Error('[Hòa Thân] Cả hai mục tiêu phải là tướng Nam!');
        }
        const usedCardId = cardIds.length > 0 ? cardIds[0] : options.cardId;
        if (!usedCardId) {
          throw new Error('[Hòa Thân] Cần bỏ 1 lá bài trên tay!');
        }
        this.state.discardFromHand(playerId, [usedCardId]);
        player.skillUsage.hoa_than.usedThisTurn = true;
        this.state.addLog(`💃 [Hòa Thân] ${player.name} bỏ 1 bài, ép ${targetA.name} và ${targetB.name} Quyết Đấu!`);
        TrickRules.playDuel(this.state, targets[0], targets[1], { name: 'Quyết Đấu', virtual: true });
      } else {
        this.state.priorityStack.push({
          type: 'ASK_HOA_THAN',
          sourceId: playerId,
          targetId: playerId,
          currentActorId: playerId,
          priorityQueue: [playerId],
          context: { reason: 'hoa_than' }
        });
      }
      return;
    }

    if (normSkillId === 'binh_loan') {
      if (cardIds.length >= 2) {
        const c1 = player.hand.find(c => c.id === cardIds[0]);
        const c2 = player.hand.find(c => c.id === cardIds[1]);
        if (!c1 || !c2) {
          throw new Error(`[Bình Loạn] Không tìm thấy 2 lá bài chỉ định trên tay!`);
        }
        const s1 = globalHeroRegistry.getEffectiveSuit(player, c1);
        const s2 = globalHeroRegistry.getEffectiveSuit(player, c2);
        if (s1 !== s2) {
          throw new Error(`[Bình Loạn] 2 lá bài phải cùng chất để phát động Loạn Tiễn!`);
        }
        this.state.discardFromHand(playerId, [c1.id, c2.id]);
        this.state.addLog(`🏹 [Bình Loạn] ${player.name} bỏ 2 lá bài cùng chất ${s1}, phát động Loạn Tiễn!`);
        TrickRules.playArrowRain(this.state, playerId, { name: 'Loạn Tiễn', virtual: true });
      } else {
        this.state.priorityStack.push({
          type: 'ASK_BINH_LOAN',
          sourceId: playerId,
          targetId: playerId,
          currentActorId: playerId,
          priorityQueue: [playerId],
          context: { reason: 'binh_loan' }
        });
      }
      return;
    }

    if (normSkillId === 'dinh_quoc') {
      const dinhDien = this.state.players.find(p => p.isAlive && (globalHeroRegistry.hasSkill(p, 'dinh_quoc', true) || p.skills?.includes('dinh_quoc')));
      if (!dinhDien) {
        throw new Error('[Định Quốc] Không tìm thấy Chúa Công Đinh Điền còn sống trên bàn cờ!');
      }

      // Trường hợp 1: Đồng minh Sơn tự đưa bài cho Đinh Điền
      if (player.id !== dinhDien.id) {
        const isSonFaction = getCanonicalFaction(player.faction) === 'son';
        if (!isSonFaction) {
          throw new Error('[Định Quốc] Chỉ có tướng phe Sơn mới có thể hiến bài cho Đinh Điền!');
        }
        const usedCardId = cardIds.length > 0 ? cardIds[0] : options.cardId;
        const card = player.hand.find(c => c.id === usedCardId);
        if (!card) {
          throw new Error('[Định Quốc] Không tìm thấy lá bài trên tay!');
        }
        const isValidCard = card.type === 'dodge' || card.name === 'Né' || card.idKey === 'sam_set' || card.name === 'Sấm Sét';
        if (!isValidCard) {
          throw new Error('[Định Quốc] Chỉ có thể dâng tặng lá [Né] hoặc [Sấm Sét] cho Đinh Điền!');
        }
        player.hand = player.hand.filter(c => c.id !== card.id);
        dinhDien.hand.push(card);
        this.state.addLog(`👑 [Định Quốc] ${player.name} dâng tặng lá [${card.name}] cho Định Quốc Công ${dinhDien.name}!`);
        return;
      }

      // Trường hợp 2: Đinh Điền chủ động phát động Định Quốc kêu gọi đồng minh Sơn dâng bài
      const allySonIds = this.state.players
        .filter(p => p.id !== dinhDien.id && p.isAlive && getCanonicalFaction(p.faction) === 'son')
        .map(p => p.id);

      if (allySonIds.length === 0) {
        throw new Error('[Định Quốc] Không có đồng minh phe Sơn nào còn sống trên bàn cờ!');
      }

      this.state.priorityStack.push({
        type: 'ASK_DINH_QUOC',
        sourceId: dinhDien.id,
        targetId: dinhDien.id,
        priorityQueue: allySonIds,
        currentActorId: allySonIds[0],
        context: { reason: 'dinh_quoc', allyIndex: 0, allySonIds }
      });
      return;
    }

    if (normSkillId === 'trung_dung') {
      if (player.hp <= 1 && globalHeroRegistry.hasSkill(player, 'ho_gia', true)) {
        throw new Error('[Hộ Giá] Khi còn 1 HP, kỹ năng Trung Dũng bị vô hiệu hóa!');
      }
      player.skillUsage = player.skillUsage || {};
      player.skillUsage.trung_dung = player.skillUsage.trung_dung || {};
      if (player.skillUsage.trung_dung.usedThisTurn) {
        throw new Error('[Trung Dũng] Mỗi lượt chỉ được sử dụng 1 lần!');
      }

      const virtualCardName = options.virtualCardName || options.cardName;
      const usedCardId = cardIds.length > 0 ? cardIds[0] : options.cardId;
      if (virtualCardName && usedCardId) {
        const card = player.hand.find(c => c.id === usedCardId);
        if (!card) {
          throw new Error('[Trung Dũng] Không tìm thấy lá bài trên tay!');
        }
        player.skillUsage.trung_dung.usedThisTurn = true;
        this.state.addLog(`🤥 [Trung Dũng] ${player.name} úp 1 lá bài, tuyên bố dùng như [${virtualCardName}]!`);
        this._handlePlayCard({
          sourceId: playerId,
          cardId: card.id,
          targetIds: targets,
          virtualCardName
        });
        return;
      }

      this.state.priorityStack.push({
        type: 'ASK_TRUNG_DUNG',
        sourceId: playerId,
        targetId: playerId,
        currentActorId: playerId,
        priorityQueue: [playerId],
        context: { reason: 'trung_dung' }
      });
      return;
    }

    if (normSkillId === 'pha_thanh') {
      if (this.state.currentPhase === PHASES.ACTION && targets.length > 0) {
        const usedCardId = cardIds.length > 0 ? cardIds[0] : options.cardId;
        const card = player.hand.find(c => c.id === usedCardId);
        if (!card) {
          throw new Error('[Phá Thành] Không tìm thấy lá bài trên tay!');
        }
        const effColor = globalHeroRegistry.getEffectiveColor(player, card);
        const cardColor = effColor || (card.color === 'red' || getSuitColor(card.suit) === 'red' ? 'red' : 'black');
        if (player.temporaryFlags?.phaThanhOppositeColor && player.temporaryFlags.phaThanhOppositeColor !== cardColor) {
          throw new Error(`[Phá Thành] Chỉ có thể dùng bài màu ${player.temporaryFlags.phaThanhOppositeColor === 'red' ? 'Đỏ' : 'Đen'} như [Quyết Đấu]!`);
        }
        this.state.discardFromHand(playerId, [card.id]);
        this.state.addLog(`⚡ [Phá Thành] ${player.name} dùng lá [${card.name}] màu ${cardColor} như [Quyết Đấu]!`);
        TrickRules.playDuel(this.state, playerId, targets[0], { ...card, name: 'Quyết Đấu', idKey: 'quyet_dau', virtual: true });
        return;
      }

      this.state.priorityStack.push({
        type: 'ASK_PHA_THANH',
        sourceId: playerId,
        targetId: playerId,
        currentActorId: playerId,
        priorityQueue: [playerId],
        context: { reason: 'pha_thanh' }
      });
      return;
    }

    if (normSkillId === 'boc_tram_trung') {
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;
      if (targetId === undefined) {
        throw new Error('[Bọc Trăm Trứng] Vui lòng chọn 1 mục tiêu kẻ địch!');
      }
      const target = this.state.getPlayer(targetId);
      if (!target || !target.isAlive) {
        throw new Error('[Bọc Trăm Trứng] Mục tiêu không hợp lệ!');
      }
      const alivePlayers = this.state.getAlivePlayers();
      if (!RangeSystem.inSlashRange(player, target, alivePlayers)) {
        throw new Error('[Bọc Trăm Trứng] Mục tiêu nằm ngoài tầm đánh!');
      }
      const hasCrossbow = player.equipment?.weapon?.idKey === 'lien_no';
      if (!hasCrossbow && (player.turnStats?.slashCount || 0) >= 1) {
        throw new Error('[Bọc Trăm Trứng] Đã hết số lần Chém trong lượt này!');
      }
      const allies = this.state.players.filter(p =>
        p.id !== playerId &&
        p.isAlive &&
        !p.isDaTam &&
        (p.revealedHeroes ? p.revealedHeroes.some(Boolean) : p.isRevealed !== false) &&
        getCanonicalFaction(p.faction) === 'lac'
      );
      if (allies.length === 0) {
        this.state.addLog(`🐉 Không có đồng minh hệ Lạc nào có thể ra [Chém] giùm cho ${player.name}!`);
        return;
      }
      this.state.addLog(`🐉 ${player.name} phát động [Bọc Trăm Trứng], kêu gọi đồng minh hệ Lạc ra [Chém] tấn công ${target.name}!`);
      this.state.priorityStack.push({
        type: 'ASK_BOC_TRAM_TRUNG_SLASH',
        sourceId: playerId,
        targetId: targetId,
        priorityQueue: allies.map(a => a.id),
        currentActorId: allies[0].id,
        context: {
          allies: allies.map(a => a.id),
          allyIndex: 0,
          isInitiatedAttack: true,
          targetId: targetId
        }
      });
      return;
    }

    if (normSkillId === 'thuy_to') {
      if (!player.hand || player.hand.length === 0) {
        throw new Error('[Thủy Tổ] Bạn không có bài trên tay để chia cho đồng minh!');
      }
      this.state.priorityStack.push({
        type: 'ASK_THUY_TO',
        sourceId: playerId,
        targetId: playerId,
        currentActorId: playerId,
        priorityQueue: [playerId],
        context: { reason: 'thuy_to', maxCards: player.hand.length }
      });
      return;
    }

    if (normSkillId === 'tu_chu') {
      this.state.priorityStack.push({
        type: 'ASK_TU_CHU',
        sourceId: playerId,
        targetId: playerId,
        currentActorId: playerId,
        priorityQueue: [playerId],
        context: { reason: 'tu_chu' }
      });
      return;
    }

    if (normSkillId === 'duong_quan' || normSkillId === 'duong_quan_2') {
      const equipCards = [
        ...(player.hand ? player.hand.filter(c => c.type === 'equip' || c.type === 'EQUIP') : []),
        ...Object.values(player.equipment || {}).filter(Boolean)
      ];
      if (equipCards.length === 0) {
        throw new Error('[Dưỡng Quân] Cần ít nhất 1 lá bài Trang bị để kích hoạt!');
      }
      this.state.priorityStack.push({
        type: 'ASK_DUONG_QUAN_2',
        sourceId: playerId,
        targetId: playerId,
        currentActorId: playerId,
        priorityQueue: [playerId],
        context: {
          validTargets: this.state.getAlivePlayers().filter(p => p.id !== playerId).map(p => p.id),
          equipCardIds: equipCards.map(c => c.id)
        }
      });
      return;
    }

    if (normSkillId === 'tien_phong' || normSkillId === 'tien_phong_nguyen_lu') {
      if (targets.length > 0) {
        const target = this.state.getPlayer(targets[0]);
        if (!target || !target.isAlive) {
          throw new Error('[Tiên Phong] Mục tiêu không hợp lệ!');
        }
        const alivePlayers = this.state.getAlivePlayers();
        if (!RangeSystem.inSlashRange(player, target, alivePlayers)) {
          throw new Error('[Tiên Phong] Mục tiêu nằm ngoài tầm đánh!');
        }
        const opt = (options && options.options) ? { ...options, ...options.options } : (options || {});
        const costType = opt.costType;
        const targetCardId = opt.cardId || (cardIds.length > 0 ? cardIds[0] : undefined);
        if (costType) {
          if (costType === 'weapon') {
            let weaponCard = null;
            if (targetCardId) {
              if (player.equipment?.weapon && player.equipment.weapon.id === targetCardId) {
                weaponCard = player.equipment.weapon;
                player.equipment.weapon = null;
                this.state.discardPile.push(weaponCard);
                globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: player.id, card: weaponCard }, this.state);
              } else {
                const handCard = player.hand?.find(c => c.id === targetCardId);
                if (handCard) {
                  weaponCard = handCard;
                  this.state.discardFromHand(player.id, [weaponCard.id]);
                }
              }
            }
            if (!weaponCard) {
              if (player.equipment?.weapon) {
                weaponCard = player.equipment.weapon;
                player.equipment.weapon = null;
                this.state.discardPile.push(weaponCard);
                globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: player.id, card: weaponCard }, this.state);
              } else {
                const handWeapon = (player.hand || []).find(c => {
                  if (!c) return false;
                  const st = getCardSubType(c);
                  return st === 'equip_weapon' || c.type === 'weapon' || c.subtype === 'equip_weapon' || c.subType === 'equip_weapon';
                });
                if (handWeapon) {
                  weaponCard = handWeapon;
                  this.state.discardFromHand(player.id, [weaponCard.id]);
                }
              }
            }
            if (!weaponCard) {
              throw new Error('[Tiên Phong] Không có vũ khí để hy sinh!');
            }
            this.state.addLog(`⚡ [Tiên Phong] ${player.name} bỏ vũ khí [${weaponCard.name}], gây 1 sát thương lên ${target.name}!`);
          } else {
            player.hp -= 1;
            this.state.addLog(`⚡ [Tiên Phong] ${player.name} mất 1 HP, gây 1 sát thương lên ${target.name}!`);
          }
          CombatRules.applyDamage(this.state, player.id, target.id, 1, 'tien_phong');
        } else {
          this.state.priorityStack.push({
            type: 'ASK_TIEN_PHONG',
            sourceId: playerId,
            targetId: targets[0],
            currentActorId: playerId,
            priorityQueue: [playerId],
            context: { reason: 'tien_phong', targetId: targets[0] }
          });
        }
      }
      return;
    }

    if (normSkillId === 'tam_cong') {
      player.skillUsage = player.skillUsage || {};
      player.skillUsage.tam_cong = player.skillUsage.tam_cong || {};
      if (player.skillUsage.tam_cong.usedThisTurn) {
        throw new Error('[Tâm Công] Mỗi lượt chỉ được sử dụng 1 lần!');
      }
      if (!player.hand || player.hand.length === 0) {
        throw new Error('[Tâm Công] Bạn không có bài trên tay để đối thủ rút!');
      }
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;
      if (targetId === undefined) {
        throw new Error('[Tâm Công] Vui lòng chọn mục tiêu đối thủ!');
      }
      player.skillUsage.tam_cong.usedThisTurn = true;
      this.state.priorityStack.push({
        type: 'ASK_SUIT',
        sourceId: playerId,
        targetId: targetId,
        currentActorId: targetId,
        priorityQueue: [targetId],
        context: { sourceId: playerId }
      });
      return;
    }

    if (normSkillId === 'van_don') {
      if (player.temporaryFlags?.vanDonUsed) {
        throw new Error('[Vân Đồn] Mỗi lượt chỉ được sử dụng 1 lần!');
      }
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;
      const validTarget = targetId !== undefined ? targetId : this.state.getAlivePlayers().find(p => p.id !== playerId && p.hand?.length > 0)?.id;
      if (validTarget === undefined) {
        throw new Error('Không có mục tiêu hợp lệ có bài trên tay để đấu điểm Vân Đồn!');
      }
      player.temporaryFlags = player.temporaryFlags || {};
      player.temporaryFlags.vanDonUsed = true;
      this.state.priorityStack.push({
        type: 'ASK_VAN_DON',
        sourceId: playerId,
        targetId: validTarget,
        currentActorId: playerId,
        priorityQueue: [playerId, validTarget],
        context: {
          reason: 'van_don',
          sourceId: playerId,
          targetId: validTarget,
          chosenCards: {}
        }
      });
      this.state.addLog(`🌊 [Vân Đồn] ${player.name} phát động Đấu Điểm với ${this.state.getPlayer(validTarget)?.name}!`);
      return;
    }

    if (normSkillId === 'duyen_tho') {
      player.skillUsage = player.skillUsage || {};
      player.skillUsage.duyen_tho = player.skillUsage.duyen_tho || {};
      if (player.skillUsage.duyen_tho.usedThisTurn) {
        throw new Error('[Duyên Thơ] Mỗi lượt chỉ được sử dụng 1 lần!');
      }

      if (targets.length > 0 && cardIds.length >= 2) {
        const target = this.state.getPlayer(targets[0]);
        this.state.discardFromHand(playerId, cardIds.slice(0, 2));
        if (player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + 1);
        if (target && target.isAlive && getPlayerGender(target) === 'male' && target.hp < target.maxHp) {
          target.hp = Math.min(target.maxHp, target.hp + 1);
        }
        player.skillUsage = player.skillUsage || {};
        player.skillUsage.duyen_tho = player.skillUsage.duyen_tho || {};
        player.skillUsage.duyen_tho.usedThisTurn = true;
        this.state.addLog(`📜 [Duyên Thơ] ${player.name} bỏ 2 lá bài ngâm thơ, hồi 1 HP cho bản thân (${player.hp}/${player.maxHp}) và ${target?.name || 'tướng nam'} (${target?.hp}/${target?.maxHp})!`);
      } else {
        this.state.priorityStack.push({
          type: 'ASK_DUYEN_THO',
          sourceId: playerId,
          targetId: playerId,
          currentActorId: playerId,
          priorityQueue: [playerId],
          context: {
            reason: 'duyen_tho',
            validTargets: this.state.getAlivePlayers().filter(p => getPlayerGender(p) === 'male' && p.hp < p.maxHp).map(p => p.id)
          }
        });
      }
      return;
    }

    const normSkill = normalizeSkillId(skillId);
    if (['tien_duyen', 'tien_duyen_chu_dong_tu', 'tien_duyen_active'].includes(normSkill) || skillId === 'tien-duyen-active' || skillId === 'Tiên Duyên') {
      const selectedCards = cardIds || options?.cardIds || [];
      const cardId = selectedCards[0];
      if (!cardId) {
        throw new Error('[Tiên Duyên] Vui lòng chọn 1 lá bài ♣ trên tay để chuyển hóa thành Xiềng Xích!');
      }
      const card = player.hand.find(c => c.id === cardId);
      if (!card) throw new Error('[Tiên Duyên] Không tìm thấy lá bài trên tay!');
      const isClub = normalizeSuit(card.suit).code === 'club';
      if (!isClub) throw new Error('[Tiên Duyên] Kỹ năng Tiên Duyên chỉ dùng được với lá bài ♣ (Chuồn)!');

      const isReforge = !targets || targets.length === 0;
      return this.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: {
          playerId,
          cardId,
          targetIds: targets || [],
          virtualCardName: 'Xiềng Xích',
          isReforge,
          reforge: isReforge,
          asChain: true
        }
      });
    }

    if (['than_hoa', 'than_hoa_active'].includes(normSkill) || skillId === 'than-hoa' || skillId === 'Thần Hỏa') {
      const selectedCards = cardIds || options?.cardIds || [];
      const cardId = selectedCards[0];
      if (!cardId) {
        throw new Error('[Thần Hỏa] Vui lòng chọn 1 lá bài Đỏ trên tay để chuyển hóa thành Hỏa Công!');
      }
      const card = player.hand.find(c => c.id === cardId);
      if (!card) throw new Error('[Thần Hỏa] Không tìm thấy lá bài trên tay!');
      const effColor = globalHeroRegistry.getEffectiveColor(player, card);
      if (effColor !== 'red') throw new Error('[Thần Hỏa] Kỹ năng Thần Hỏa chỉ dùng được với lá bài Đỏ!');
      const targetId = targets && targets[0];
      if (targetId === undefined) throw new Error('[Thần Hỏa] Vui lòng chọn mục tiêu để Hỏa Công!');

      return this.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: {
          playerId,
          cardId,
          targetIds: [targetId],
          virtualCardName: 'Hỏa Công',
          asFireAttack: true
        }
      });
    }

    const skill = this.heroRegistry.getSkill(skillId);
    if (skill) {
      const context = {
        owner: player,
        ownerId: player.id,
        cardIds,
        targets,
        options,
        state: this.state
      };
      if (typeof skill.canUse === 'function' && !skill.canUse(this.state, context)) {
        throw new Error(`[${skill.name || skillId}] Không đủ điều kiện để kích hoạt!`);
      }
      skill.execute(this.state, context, this.state.priorityStack);
      this.state.addLog(`${player.name} kích hoạt kỹ năng [${skill.name || skillId}].`);
    } else {
      console.warn(`[DispatcherV4] Skill not found: ${skillId}`);
    }
  }

  _handleDrawCards({ targetId, skipDraw = false, drawExtra = false }) {
    if (!skipDraw) {
      const count = drawExtra ? 3 : 2;
      this.state.drawCards(targetId, count);
      this.state.addLog(`${this.state.getPlayer(targetId)?.name} rút ${count} lá bài.`);
    }
    this.state.currentPhase = PHASES.ACTION;
  }

  _handleEndPhase(payload = {}) {
    const targetId = payload.targetId !== undefined ? payload.targetId : payload.playerId;
    if (this.state.currentTurnPlayerId !== targetId) {
      console.warn(`[DispatcherV4] Cannot end phase: Not player ${targetId}'s turn.`);
      return;
    }
    if (this.state.priorityStack && !this.state.priorityStack.isEmpty()) {
      console.warn(`[DispatcherV4] Cannot end phase while priority stack is not empty.`);
      return;
    }
    if (this.state.currentPhase === PHASES.ACTION) {
      this.stateMachine.endActionPhase();
    } else if (this.state.currentPhase === PHASES.DISCARD) {
      const player = this.state.getPlayer(targetId);
      this.stateMachine._checkDiscardLimit(player);
    } else if (this.state.currentPhase === PHASES.END) {
      this.stateMachine.nextTurn();
    }
  }

  _handleDiscard(payload = {}) {
    const targetId = payload.targetId !== undefined ? payload.targetId : payload.playerId;
    if (this.state.currentPhase !== PHASES.DISCARD) {
      console.warn(`[DispatcherV4] Bỏ qua lệnh bỏ bài từ player ${targetId} vì không ở pha DISCARD (hiện tại: ${this.state.currentPhase})`);
      return;
    }
    const currentFrame = this.state.priorityStack.peek();
    if (!currentFrame || currentFrame.type !== 'ASK_DISCARD') {
      console.warn(`[DispatcherV4] Bỏ qua lệnh bỏ bài từ player ${targetId} vì không có frame ASK_DISCARD`);
      return;
    }
    const player = this.state.getPlayer(targetId);
    if (!player) return;
    const required = Math.min(player.hand?.length || 0, currentFrame.context?.cardsToDiscard || 1);
    let cardIds = Array.isArray(payload.cardIds) ? payload.cardIds.filter(cid => player.hand.some(c => c.id === cid)) : [];
    if (cardIds.length !== required) {
      console.warn(`[DispatcherV4] CardIds bỏ bài không khớp yêu cầu (${required} lá). Tự động chọn.`);
      cardIds = (player.hand || []).slice(0, required).map(c => c.id);
    }
    this.stateMachine.handleDiscard(targetId, cardIds);
  }

  _handleRevealHero({ playerId, heroIndex }) {
    const player = this.state.getPlayer(playerId);
    if (!player) return;
    if (heroIndex === 'all' || heroIndex === -1 || heroIndex === undefined) {
      this.heroRegistry.revealPlayerHero(this.state, player, 0, null, true);
      this.heroRegistry.revealPlayerHero(this.state, player, 1, null, true);
    } else {
      this.heroRegistry.revealPlayerHero(this.state, player, heroIndex, null, true);
    }
  }

  /**
   * Đảm bảo tướng sở hữu kỹ năng được lật mặt (Minh Khai) khi phát động kỹ năng
   * Theo đúng Luật Quốc Chiến: Bất kỳ tướng nào sử dụng kỹ năng thì tướng đó phải lật mở chân dung!
   */
  _ensureHeroRevealedForSkill(player, skillId, skillDisplayName = null) {
    if (!player) return;
    const heroIdx = this.heroRegistry.getHeroIndexForSkill(player, skillId);
    if (player.revealedHeroes && !player.revealedHeroes[heroIdx]) {
      this.heroRegistry.revealPlayerHero(this.state, player, heroIdx, skillDisplayName || skillId);
    }
  }
}

export { DispatcherV4 as Dispatcher };
