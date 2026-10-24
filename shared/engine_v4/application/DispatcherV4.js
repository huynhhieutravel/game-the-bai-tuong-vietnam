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
    const cardId = payload.cardId;
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
    const isRedCard = card.color === 'red' || card.suit === 'heart' || card.suit === 'diamond' || card.suit === '♥' || card.suit === '♦';
    const isNonTargetedRedCard = ['dodge', 'peach', 'wine', 'equip'].includes(cardType) || ['Né', 'Đào', 'Rượu'].includes(card.name);
    const isTargetingOther = targetIds.length > 0 && targetIds[0] !== sourceId;
    const hasDoiNuiSlash = globalHeroRegistry.hasSkill(player, 'doi_nui', true) && (virtualCardName === 'Chém' || payload.asSlash || (isTargetingOther && (cardType === 'dodge' || card.name === 'Né')));
    const hasKhaiThien = globalHeroRegistry.hasSkill(player, 'khai_thien', true) && isRedCard && (virtualCardName === 'Chém' || payload.asSlash || (isTargetingOther && isNonTargetedRedCard));

    // 1. Chém (Slash) - Chỉ xử lý khi bài thực sự là Chém hoặc biến đổi thành Chém, KHÔNG xử lý khi virtualCardName là Đào/Rượu/Cẩm nang
    const isConvertedNonSlash = virtualCardName && virtualCardName !== 'Chém';
    const isSlashAction = !isConvertedNonSlash && (cardName === 'Chém' || (!virtualCardName && cardType === 'slash') || hasDoiNuiSlash || hasKhaiThien);

    if (isSlashAction) {
      if (player.temporaryFlags?.vanDonWin && targetIds.length > 1) {
        const targets = targetIds.slice(0, 2);
        this.state.discardFromHand(sourceId, [card.id]);
        this.state.addLog(`🌊 [Vân Đồn] ${player.name} dùng [Chém] quét 2 mục tiêu: ${targets.map(id => this.state.getPlayer(id)?.name).join(', ')}!`);
        CombatRules.playSlash(this.state, sourceId, targets[0], card, { alreadyDiscardedCard: true, asSlash: cardName === 'Chém' || hasDoiNuiSlash || hasKhaiThien });
        CombatRules.playSlash(this.state, sourceId, targets[1], card, { alreadyDiscardedCard: true, isRedirected: true, asSlash: cardName === 'Chém' || hasDoiNuiSlash || hasKhaiThien });
        return;
      }

      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để Chém!');
      CombatRules.playSlash(this.state, sourceId, targetId, card, { asSlash: cardName === 'Chém' || hasDoiNuiSlash || hasKhaiThien });
      return;
    }

    // 2. Đào (Peach)
    if (cardType === 'peach' || cardName === 'Đào') {
      if (player.hp >= player.maxHp) {
        throw new Error('Máu đã đầy, không thể sử dụng Đào!');
      }

      this.state.discardFromHand(sourceId, [card.id]);

      // Kiểm tra Kỹ Năng Hậu Viện (Ngô Quyền - Phe Hà)
      const isHaFaction = (player.faction || '').toLowerCase() === 'ha' || player.faction === 'Hà' || player.rawFaction === 'ha';
      const hauVienTargets = isHaFaction
        ? this.state.getAlivePlayers().filter(p => p.id !== player.id && ((p.faction || '').toLowerCase() === 'ha' || p.faction === 'Hà' || p.rawFaction === 'ha') && p.hp < p.maxHp && (globalHeroRegistry.hasSkill(p, 'hau_vien') || globalHeroRegistry.hasSkill(p, 'hau-vien') || p.skills?.includes('hau_vien') || p.skills?.includes('hau-vien')))
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
    if (cardType === 'wine' || cardName === 'Rượu') {
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

    if (equipSlot) {
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
        if (oldEquip.name === 'Bạch Ngân' || oldEquip.id?.includes('bach_ngan') || oldEquip.key === 'bach-ngan') {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          this.state.addLog(`🦁 [Bạch Ngân] Rời khỏi người ${player.name}, hồi 1 HP (${player.hp}/${player.maxHp})!`);
        }
      }

      player.equipment[equipSlot] = card;
      this.state.addLog(`${player.name} trang bị [${card.name}].`);
      return;
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
        this.state.discardFromHand(sourceId, [card.id]);
        this.state.addLog(`⚡ [Phá Thành] ${player.name} sử dụng lá [${card.name}] màu ${isRedCard ? 'Đỏ' : 'Đen'} như [Quyết Đấu]!`);
        TrickRules.playDuel(this.state, sourceId, targetId, { ...card, name: 'Quyết Đấu', virtual: true });
        return;
      }
      TrickRules.playDuel(this.state, sourceId, targetId, card);
      return;
    }
    const hasKyTap = (globalHeroRegistry.hasSkill(player, 'ky_tap', true) || player.skills?.includes('ky_tap')) && !isRedCard && (virtualCardName === 'Tước Bài' || payload.asDismantle || card.asDismantle);
    if (cardName === 'Tước Bài' || hasKyTap) {
      const targetId = targetIds[0];
      if (hasKyTap) {
        this.state.discardFromHand(sourceId, [card.id]);
        this.state.addLog(`⚡ [Kỳ Tập] ${player.name} sử dụng lá bài Đen [${card.name}] như [Tước Bài]!`);
        TrickRules.playDismantle(this.state, sourceId, targetId, { ...card, name: 'Tước Bài', idKey: 'tuoc_bai', virtual: true });
        return;
      }
      TrickRules.playDismantle(this.state, sourceId, targetId, card);
      return;
    }
    if (cardName === 'Cướp Bài') {
      const targetId = targetIds[0];
      TrickRules.playSteal(this.state, sourceId, targetId, card);
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
    const isDiamond = card && (card.suit === 'diamond' || card.suit === 'diamonds' || card.suit === '♦');
    const hasHoaThanAnTu = (globalHeroRegistry.hasSkill(player, 'hoa_than_an_tu', true) || globalHeroRegistry.hasSkill(player, 'hoa-than-an-tu', true)) && isDiamond && (virtualCardName === 'Hỗn Loạn' || payload.asChaos || card.asChaos);
    if (cardName === 'Hỗn Loạn' || hasHoaThanAnTu) {
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để đặt Hỗn Loạn!');
      if (hasHoaThanAnTu) {
        this.state.addLog(`🌺 [Hòa Thân] ${player.name} sử dụng lá bài Rô [${card.name}] như [Hỗn Loạn]!`);
        TrickRules.playChaos(this.state, sourceId, targetId, { ...card, name: 'Hỗn Loạn', idKey: 'hon_loan', virtual: true });
        return;
      }
      TrickRules.playChaos(this.state, sourceId, targetId, card);
      return;
    }
    const hasTienDuyenChain = globalHeroRegistry.hasSkill(player, 'tien_duyen_chu_dong_tu', true) && (card.suit === 'club' || card.suit === '♣') && (virtualCardName === 'Xiềng Xích' || payload.asChain);
    if (cardName === 'Xiềng Xích' || card.idKey === 'xieng_xich' || hasTienDuyenChain) {
      const chainCard = hasTienDuyenChain ? { ...card, name: 'Xiềng Xích', idKey: 'xieng_xich', virtual: true } : card;
      TrickRules.playIronChain(this.state, sourceId, targetIds, chainCard, { isIronChain: true, reforge: payload.reforge });
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
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để Hỏa Công!');
      const fireCard = hasThanHoa ? { ...card, name: 'Hỏa Công', idKey: 'hoa_cong', virtual: true } : card;
      TrickRules.playFireAttack(this.state, sourceId, targetId, fireCard);
      return;
    }

    // Mặc định: Bỏ bài và ghi log nếu là lá bài khác
    this.state.discardFromHand(sourceId, [card.id]);
    this.state.addLog(`${player.name} sử dụng [${card.name}].`);
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

    const player = this.state.getPlayer(playerId);

    switch (frame.type) {
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
        if (!isCancelOrSkip && !data.useBagua && !data.doBagua && !data.callBocTramTrung && !data.doTienPhat && !data.doHoGia) {
          const hasDoiNui = globalHeroRegistry.hasSkill(player, 'doi_nui', true);
          const hasThinhChinh = globalHeroRegistry.hasSkill(player, 'thinh_chinh', true);
          const isBlack = c => c && (c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
          dodgeCard = this._resolveCard(player, data) || (data.doReact ? (player.hand.find(c => c.type === 'dodge' || c.name === 'Né') || (hasDoiNui ? player.hand.find(c => c.type === 'slash' || c.name === 'Chém') : null) || (hasThinhChinh ? player.hand.find(isBlack) : null)) : null);
        }
        CombatRules.respondDodge(this.state, playerId, dodgeCard, data);
        break;
      }

      case 'ASK_PEACH': {
        let peachCard = null;
        if (!isCancelOrSkip) {
          const hasNamDuoc = globalHeroRegistry.hasSkill(player, 'nam_duoc', true) && this.state.currentTurnPlayerId !== playerId;
          const isRed = c => c && (c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
          peachCard = this._resolveCard(player, data) || 
            (data.doSave ? player.hand.find(c => c.type === 'peach' || c.name === 'Đào' || (playerId === frame.targetId && (c.type === 'wine' || c.name === 'Rượu')) || (hasNamDuoc && isRed(c))) : null);
        }
        CombatRules.respondPeach(this.state, playerId, peachCard);
        break;
      }

      case 'ASK_NEGATE': {
        let negateCard = null;
        if (!isCancelOrSkip) {
          const hasLinhGiam = globalHeroRegistry.hasSkill(player, 'linh_giam', true);
          const isBlack = c => c && (c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
          negateCard = this._resolveCard(player, data) || 
            player.hand.find(c => c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') ||
            (hasLinhGiam ? player.hand.find(isBlack) : null);
        }
        TrickRules.respondNegate(this.state, playerId, negateCard);
        break;
      }

      case 'ASK_DISCARD': {
        const cardIds = data.cardIds || (data.cardId ? [data.cardId] : (data.selectedDiscards || []));
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
        let slashCard = null;
        if (!isCancelOrSkip) {
          const hasDoiNui = globalHeroRegistry.hasSkill(player, 'doi_nui', true);
          const hasKhaiThien = globalHeroRegistry.hasSkill(player, 'khai_thien', true);
          const isRed = c => c && (c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
          slashCard = this._resolveCard(player, data) || 
            player.hand.find(c => c.type === 'slash' || c.name === 'Chém') || 
            (hasDoiNui ? player.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
            (hasKhaiThien ? player.hand.find(isRed) : null);
        }
        TrickRules.respondDuel(this.state, playerId, slashCard, data);
        break;
      }

      case 'ASK_SLASH_RESPONSE': {
        let slashCard = null;
        if (!isCancelOrSkip) {
          const hasDoiNui = globalHeroRegistry.hasSkill(player, 'doi_nui', true);
          const hasKhaiThien = globalHeroRegistry.hasSkill(player, 'khai_thien', true);
          const isRed = c => c && (c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
          slashCard = this._resolveCard(player, data) || 
            player.hand.find(c => c.type === 'slash' || c.name === 'Chém') || 
            (hasDoiNui ? player.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
            (hasKhaiThien ? player.hand.find(isRed) : null);
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

      case 'ASK_BOC_TRAM_TRUNG_DODGE': {
        let dodgeCard = null;
        if (!isCancelOrSkip && (data.doProvide || data.doReact)) {
          dodgeCard = this._resolveCard(player, data) || player.hand.find(c => c.type === 'dodge' || c.name === 'Né');
        }
        CombatRules.respondBocTramTrungDodge(this.state, playerId, dodgeCard);
        break;
      }

      case 'ASK_BOC_TRAM_TRUNG_SLASH': {
        let slashCard = null;
        if (!isCancelOrSkip && (data.doProvide || data.doReact)) {
          slashCard = this._resolveCard(player, data) || player.hand.find(c => c.type === 'slash' || c.name === 'Chém');
        }
        CombatRules.respondBocTramTrungSlash(this.state, playerId, slashCard);
        break;
      }

      case 'ASK_TIEN_PHAT': {
        let dodgeCard = null;
        if (!isCancelOrSkip && (data.doProvide || data.doReact || data.cardId || data.card)) {
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
          if (c1 && c2 && c1.suit === c2.suit) {
            this.state.discardFromHand(playerId, [c1.id, c2.id]);
            this.state.addLog(`🏹 [Bình Loạn] ${player.name} bỏ 2 lá bài cùng chất ${c1.suit}, phát động Loạn Tiễn!`);
            TrickRules.playArrowRain(this.state, playerId, { name: 'Loạn Tiễn', virtual: true });
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
            const oppCard = target.hand.pop();
            this.state.discardPile.push(oppCard);
            this.state.discardFromHand(playerId, [myCard.id]);

            const myRank = rankToNumber(myCard.rank);
            const oppRank = rankToNumber(oppCard.rank);

            if (myRank > oppRank) {
              this.state.addLog(`⚔️ [Tự Chủ] ${player.name} (${myCard.name} [${myRank}]) THẮNG ${target.name} (${oppCard.name} [${oppRank}])!`);
              const aliveOthers = this.state.getAlivePlayers().filter(p => p.id !== target.id && p.id !== playerId && !(globalHeroRegistry.hasSkill(p, 'dam_bac') && (!p.hand || p.hand.length === 0)));
              if (aliveOthers.length > 0 && !target.temporaryFlags?.vanDonLose) {
                CombatRules.playSlash(this.state, target.id, aliveOthers[0].id, { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
              }
            } else {
              this.state.addLog(`⚔️ [Tự Chủ] ${player.name} (${myCard.name} [${myRank}]) THUA ${target.name} (${oppCard.name} [${oppRank}])! ${target.name} lập tức Chém ${player.name}!`);
              if (!target.temporaryFlags?.vanDonLose && !(globalHeroRegistry.hasSkill(player, 'dam_bac') && (!player.hand || player.hand.length === 0))) {
                CombatRules.playSlash(this.state, target.id, playerId, { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
              }
            }
          }
        }
        break;
      }

      case 'ASK_VAN_DON': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip) {
          const myCard = this._resolveCard(player, data) || (player.hand && player.hand.length > 0 ? player.hand[0] : null);
          const target = this.state.getPlayer(frame.targetId);
          if (myCard && target && target.hand && target.hand.length > 0) {
            const oppCard = (data.targetCardId ? target.hand.find(c => c.id === data.targetCardId) : null) || target.hand[0];
            
            this.state.discardFromHand(playerId, [myCard.id]);
            this.state.discardFromHand(target.id, [oppCard.id]);

            const myRank = rankToNumber(myCard.rank);
            const oppRank = rankToNumber(oppCard.rank);

            player.temporaryFlags = player.temporaryFlags || {};
            if (myRank > oppRank) {
              player.temporaryFlags.vanDonWin = true;
              this.state.addLog(`🌊 [Vân Đồn] ${player.name} (${myCard.name} [${myCard.rank || myRank}]) THẮNG ${target.name} (${oppCard.name} [${oppCard.rank || oppRank}])! Được đánh thêm 1 Chém vô hạn cự ly và chọn 2 mục tiêu!`);
            } else {
              player.temporaryFlags.vanDonLose = true;
              this.state.addLog(`🌊 [Vân Đồn] ${player.name} (${myCard.name} [${myCard.rank || myRank}]) THUA hoặc HÒA ${target.name} (${oppCard.name} [${oppCard.rank || oppRank}])! Bị cấm Chém trong lượt này!`);
            }
          }
        }
        break;
      }

      case 'ASK_DUYEN_THO': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.targetId !== undefined) {
          const target = this.state.getPlayer(data.targetId);
          const cardIds = data.cardIds || (data.cardId ? [data.cardId] : []);
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
              if (oldEquip.name === 'Bạch Ngân' || oldEquip.id?.includes('bach_ngan') || oldEquip.key === 'bach-ngan') {
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
          const isSuitMatch = card && (
            card.suit === requiredSuit ||
            (requiredSuit === 'heart' && (card.suit === '♥' || card.suit === 'heart')) ||
            (requiredSuit === 'diamond' && (card.suit === '♦' || card.suit === 'diamond')) ||
            (requiredSuit === 'spade' && (card.suit === '♠' || card.suit === 'spade')) ||
            (requiredSuit === 'club' && (card.suit === '♣' || card.suit === 'club'))
          );

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
            if (data.costType === 'weapon' && player.equipment?.weapon) {
              const w = player.equipment.weapon;
              player.equipment.weapon = null;
              this.state.discardPile.push(w);
              globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: player.id, card: w }, this.state);
              this.state.addLog(`⚡ [Tiên Phong] ${player.name} bỏ vũ khí [${w.name}], gây 1 sát thương lên ${target?.name}!`);
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
          const stolen = asker.hand.pop();
          player.hand.push(stolen);
          const chosenSuit = data.suit || '♥';
          const cardSuitEmoji = stolen.suit === 'heart' ? '♥' : stolen.suit === 'diamond' ? '♦' : stolen.suit === 'spade' ? '♠' : stolen.suit === 'club' ? '♣' : stolen.suit;
          const isMatch = chosenSuit === cardSuitEmoji || chosenSuit === stolen.suit;
          this.state.addLog(`🔮 [Tâm Công] ${player.name} đoán chất [${chosenSuit}]. Lá bài nhận được là [${stolen.name} ${cardSuitEmoji}]!`);
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

      default:
        // Universal AI Fallback & Frame Auto-pop
        this.state.priorityStack.pop();
        break;
    }

    // Post-reaction Phase Transitions when stack clears
    if (this.state.priorityStack.isEmpty()) {
      const turnPlayer = this.state.getCurrentPlayer();
      if (turnPlayer) {
        if (this.state.currentPhase === PHASES.BEGIN && turnPlayer.temporaryFlags?.skipJudgePhase) {
          turnPlayer.temporaryFlags.skipJudgePhase = false;
          turnPlayer.temporaryFlags.skipDrawPhase = false;
          this.stateMachine._runPhaseAction();
        } else if (this.state.currentPhase === PHASES.ACTION && turnPlayer.temporaryFlags?.endActionAfterSlash) {
          turnPlayer.temporaryFlags.endActionAfterSlash = false;
          this.stateMachine.endActionPhase();
        } else if (this.state.currentPhase === PHASES.DISCARD && turnPlayer.temporaryFlags?.skipDiscardPhase) {
          turnPlayer.temporaryFlags.skipDiscardPhase = false;
          this.stateMachine._runPhaseEnd();
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

    const normSkillId = (skillId || '').replace(/-/g, '_').toLowerCase();

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
      const isRed = card.color === 'red' || card.suit === 'heart' || card.suit === 'diamond' || card.suit === '♥' || card.suit === '♦';
      if (isRed) throw new Error('[Kỳ Tập] Chỉ có thể dùng lá bài màu Đen như [Tước Bài]!');
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;
      if (targetId === undefined) throw new Error('[Kỳ Tập] Vui lòng chọn mục tiêu để Tước Bài!');
      this.state.discardFromHand(playerId, [card.id]);
      this.state.addLog(`⚡ [Kỳ Tập] ${player.name} dùng lá bài Đen [${card.name}] như [Tước Bài]!`);
      TrickRules.playDismantle(this.state, playerId, targetId, { ...card, name: 'Tước Bài', idKey: 'tuoc_bai', virtual: true });
      return;
    }

    if (normSkillId === 'can_gian') {
      if (player.hp <= 1) throw new Error('[Can Gián] Sinh lực phải lớn hơn 1 để Can Gián!');
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;
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
      const card = player.hand.find(c => c.id === usedCardId);
      if (!card) throw new Error('[Hòa Thân] Không tìm thấy lá bài trên tay!');
      const isDiamond = card.suit === 'diamond' || card.suit === 'diamonds' || card.suit === '♦';
      if (!isDiamond) throw new Error('[Hòa Thân] Chỉ có thể dùng lá bài chất Rô ♦ như [Hỗn Loạn]!');
      const targetId = targets[0] !== undefined ? targets[0] : options.targetId;
      if (targetId === undefined) throw new Error('[Hòa Thân] Vui lòng chọn mục tiêu để đặt Hỗn Loạn!');
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
        if (c1.suit !== c2.suit) {
          throw new Error(`[Bình Loạn] 2 lá bài phải cùng chất để phát động Loạn Tiễn!`);
        }
        this.state.discardFromHand(playerId, [c1.id, c2.id]);
        this.state.addLog(`🏹 [Bình Loạn] ${player.name} bỏ 2 lá bài cùng chất ${c1.suit}, phát động Loạn Tiễn!`);
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
        const isSonFaction = player.faction === 'son' || player.faction === 'Sơn' || player.rawFaction === 'son';
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
        .filter(p => p.id !== dinhDien.id && p.isAlive && (p.faction === 'son' || p.faction === 'Sơn' || p.rawFaction === 'son'))
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
        const isRed = card.color === 'red' || card.suit === 'heart' || card.suit === 'diamond' || card.suit === 'hearts' || card.suit === 'diamonds' || card.suit === '♥' || card.suit === '♦';
        const cardColor = isRed ? 'red' : 'black';
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

    if (normSkillId === 'thuy_to') {
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
        if (options.costType) {
          if (options.costType === 'weapon') {
            if (!player.equipment?.weapon) {
              throw new Error('[Tiên Phong] Không có vũ khí để hy sinh!');
            }
            const w = player.equipment.weapon;
            player.equipment.weapon = null;
            this.state.discardPile.push(w);
            globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: player.id, card: w }, this.state);
            this.state.addLog(`⚡ [Tiên Phong] ${player.name} bỏ vũ khí [${w.name}], gây 1 sát thương lên ${target.name}!`);
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
      if (targets.length > 0) {
        player.skillUsage.tam_cong.usedThisTurn = true;
        this.state.priorityStack.push({
          type: 'ASK_SUIT',
          sourceId: playerId,
          targetId: targets[0],
          currentActorId: targets[0],
          priorityQueue: [targets[0]],
          context: { sourceId: playerId }
        });
      }
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
        priorityQueue: [playerId],
        context: {
          reason: 'van_don',
          sourceId: playerId,
          targetId: validTarget
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
    this.stateMachine.endActionPhase();
  }

  _handleDiscard(payload = {}) {
    const targetId = payload.targetId !== undefined ? payload.targetId : payload.playerId;
    this.stateMachine.handleDiscard(targetId, payload.cardIds || []);
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
}

export { DispatcherV4 as Dispatcher };
