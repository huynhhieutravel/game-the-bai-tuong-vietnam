// @ts-check
/**
 * DispatcherV4.js
 * Bộ Điều Phối Sự Kiện (Event Resolver) trung tâm cho Việt Sát v4.
 * Kết nối các Action từ React UI & BotRunner tới StateMachine, PriorityStack & Rules.
 */

import { StateMachine, PHASES } from '../core/StateMachine.js';
import { CombatRules } from '../rules/CombatRules.js';
import { TrickRules } from '../rules/TrickRules.js';
import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { GameInvariants } from '../core/Invariants.js';
import { getCardSubType } from '../../data/gameData.js';

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

  dispatchAction(action) {
    if (!action || !action.type) return;

    try {
      switch (action.type) {
        case 'ACTION_PLAY_CARD':
          this._handlePlayCard(action.payload);
          break;

        case 'ACTION_REACT':
          this._handleReact(action.payload);
          break;

        case 'ACTION_USE_SKILL':
        case 'ACTION_SKILL_RESPONSE':
          this._handleSkill(action.payload);
          break;

        case 'ACTION_DRAW_CARDS':
          this._handleDrawCards(action.payload);
          break;

        case 'ACTION_END_PHASE':
          this._handleEndPhase(action.payload);
          break;

        case 'ACTION_DISCARD':
          this._handleDiscard(action.payload);
          break;

        case 'ACTION_REVEAL_HERO':
          this._handleRevealHero(action.payload);
          break;

        default:
          console.warn(`[DispatcherV4] Unhandled action type: ${action.type}`);
      }
    } catch (err) {
      console.error(`[DispatcherV4] Error dispatching action ${action.type}:`, err);
      this.addLog(`⚠️ Thao tác không thành công: ${err.message}`, 'error');
    }

    this.notifyListeners();
  }

  _handlePlayCard({ sourceId, cardId, targetIds = [], virtualCardName = null }) {
    const player = this.state.getPlayer(sourceId);
    if (!player || !player.isAlive) return;

    const card = player.hand.find(c => c.id === cardId);
    if (!card) {
      console.warn(`[DispatcherV4] Card ${cardId} not found in player ${sourceId} hand.`);
      return;
    }

    const cardType = card.type || '';
    const cardName = virtualCardName || card.name;

    // 1. Chém (Slash)
    if (cardType === 'slash' || cardName === 'Chém') {
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để Chém!');
      CombatRules.playSlash(this.state, sourceId, targetId, card);
      return;
    }

    // 2. Đào (Peach)
    if (cardType === 'peach' || cardName === 'Đào') {
      if (player.hp >= player.maxHp) {
        throw new Error('Máu đã đầy, không thể sử dụng Đào!');
      }
      this.state.discardFromHand(sourceId, [card.id]);
      player.hp = Math.min(player.maxHp, player.hp + 1);
      this.state.addLog(`${player.name} sử dụng [Đào], hồi phục 1 Máu (${player.hp}/${player.maxHp}).`);
      return;
    }

    // 3. Rượu (Wine)
    if (cardType === 'wine' || cardName === 'Rượu') {
      this.state.discardFromHand(sourceId, [card.id]);
      player.temporaryFlags = player.temporaryFlags || {};
      player.temporaryFlags.wineActive = true;
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
    if (cardName === 'Quyết Đấu') {
      const targetId = targetIds[0];
      TrickRules.playDuel(this.state, sourceId, targetId, card);
      return;
    }
    if (cardName === 'Tước Bài') {
      const targetId = targetIds[0];
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
    if (cardName === 'Vô Trung Sinh Hữu') {
      this.state.discardFromHand(sourceId, [card.id]);
      this.state.drawCards(sourceId, 2);
      this.state.addLog(`${player.name} dùng [Vô Trung Sinh Hữu], rút thêm 2 lá bài.`);
      return;
    }
    if (cardName === 'Hỗn Loạn') {
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để đặt Hỗn Loạn!');
      TrickRules.playChaos(this.state, sourceId, targetId, card);
      return;
    }
    if (cardName === 'Xiềng Xích') {
      TrickRules.playIronChain(this.state, sourceId, targetIds, card);
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
    if (cardName === 'Hỏa Công' || cardName === 'Hỏa công' || card.idKey === 'hoa_cong') {
      const targetId = targetIds[0];
      if (targetId === undefined) throw new Error('Vui lòng chọn mục tiêu để Hỏa Công!');
      TrickRules.playFireAttack(this.state, sourceId, targetId, card);
      return;
    }

    // Mặc định: Bỏ bài và ghi log nếu là lá bài khác
    this.state.discardFromHand(sourceId, [card.id]);
    this.state.addLog(`${player.name} sử dụng [${card.name}].`);
  }

  _resolveCard(player, data) {
    if (!player || !data) return null;
    if (data.cardId) {
      const found = player.hand?.find(c => c.id === data.cardId);
      if (found) return found;
      for (const slot in player.equipment) {
        if (player.equipment[slot]?.id === data.cardId) return player.equipment[slot];
      }
    }
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

  _handleReact({ playerId, responseType, data = {} }) {
    const frame = this.state.priorityStack.peek();
    if (!frame) {
      console.warn('[DispatcherV4] No active priority frame to react to.');
      return;
    }

    const isCancelOrSkip = responseType === 'cancel' || responseType === 'skip' || data.canceled;
    const player = this.state.getPlayer(playerId);

    switch (frame.type) {
      case 'ASK_DODGE': {
        let dodgeCard = null;
        if (!isCancelOrSkip && !data.useBagua && !data.doBagua) {
          dodgeCard = this._resolveCard(player, data) || player.hand.find(c => c.type === 'dodge' || c.name === 'Né');
        }
        CombatRules.respondDodge(this.state, playerId, dodgeCard, data);
        break;
      }

      case 'ASK_PEACH': {
        let peachCard = null;
        if (!isCancelOrSkip) {
          peachCard = this._resolveCard(player, data) || player.hand.find(c => c.type === 'peach' || c.name === 'Đào');
        }
        CombatRules.respondPeach(this.state, playerId, peachCard);
        break;
      }

      case 'ASK_NEGATE': {
        let negateCard = null;
        if (!isCancelOrSkip) {
          negateCard = this._resolveCard(player, data) || player.hand.find(c => c.name === 'Hóa Giải');
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
          slashCard = this._resolveCard(player, data) || player.hand.find(c => c.type === 'slash' || c.name === 'Chém');
        }
        TrickRules.respondDuel(this.state, playerId, slashCard);
        break;
      }

      case 'ASK_SLASH_RESPONSE': {
        let slashCard = null;
        if (!isCancelOrSkip) {
          slashCard = this._resolveCard(player, data) || player.hand.find(c => c.type === 'slash' || c.name === 'Chém');
        }
        TrickRules.respondBarbarian(this.state, playerId, slashCard);
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
              this.state.addLog(`🌿 [Diệu Dược] ${player.name} bỏ 1 bài, chữa lành 1 HP cho ${target.name} (${target.hp}/${target.maxHp})!`);
            }
          }
        }
        break;
      }

      case 'ASK_HOA_THAN': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.targetA !== undefined && data.targetB !== undefined) {
          const card = this._resolveCard(player, data);
          if (card) {
            this.state.discardFromHand(playerId, [card.id]);
            const targetA = this.state.getPlayer(data.targetA);
            const targetB = this.state.getPlayer(data.targetB);
            this.state.addLog(`💃 [Hòa Thân] ${player.name} bỏ 1 bài, ép ${targetA?.name || 'Mục tiêu A'} và ${targetB?.name || 'Mục tiêu B'} Quyết Đấu!`);
            TrickRules.playDuel(this.state, data.targetA, data.targetB, { name: 'Quyết Đấu', virtual: true });
          }
        }
        break;
      }

      case 'ASK_BINH_LOAN': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && Array.isArray(data.cardIndexes) && data.cardIndexes.length === 2) {
          const c1 = player.hand[data.cardIndexes[0]];
          const c2 = player.hand[data.cardIndexes[1]];
          if (c1 && c2 && c1.suit === c2.suit) {
            this.state.discardFromHand(playerId, [c1.id, c2.id]);
            this.state.addLog(`🏹 [Bình Loạn] ${player.name} bỏ 2 lá bài cùng chất ${c1.suit}, phát động Loạn Tiễn!`);
            TrickRules.playArrowRain(this.state, playerId, { name: 'Loạn Tiễn', virtual: true });
          }
        }
        break;
      }

      case 'ASK_TRUNG_DUNG': {
        this.state.priorityStack.pop();
        if (!isCancelOrSkip && data.virtualCardName) {
          const card = this._resolveCard(player, data);
          if (card) {
            this.state.discardFromHand(playerId, [card.id]);
            this.state.addLog(`🤥 [Trung Dũng] ${player.name} úp 1 lá bài, tuyên bố dùng như [${data.virtualCardName}]!`);
            this._handlePlayCard({
              sourceId: playerId,
              cardId: card.id,
              targetIds: data.targetId !== null && data.targetId !== undefined ? [data.targetId] : [],
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
          const myCard = this._resolveCard(player, data);
          const target = this.state.getPlayer(data.targetId);
          if (myCard && target && target.hand.length > 0) {
            const oppCard = target.hand.pop();
            this.state.discardPile.push(oppCard);
            this.state.discardFromHand(playerId, [myCard.id]);

            const myRank = parseInt(myCard.rank, 10) || 1;
            const oppRank = parseInt(oppCard.rank, 10) || 1;

            if (myRank > oppRank) {
              this.state.addLog(`⚔️ [Tự Chủ] ${player.name} (${myCard.name} ${myRank}) THẮNG ${target.name} (${oppCard.name} ${oppRank})!`);
              const aliveOthers = this.state.getAlivePlayers().filter(p => p.id !== target.id && p.id !== playerId);
              if (aliveOthers.length > 0) {
                CombatRules.playSlash(this.state, target.id, aliveOthers[0].id, { name: 'Chém', virtual: true });
              }
            } else {
              this.state.addLog(`⚔️ [Tự Chủ] ${player.name} (${myCard.name} ${myRank}) THUA ${target.name} (${oppCard.name} ${oppRank})! ${target.name} lập tức Chém ${player.name}!`);
              CombatRules.playSlash(this.state, target.id, playerId, { name: 'Chém', virtual: true });
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
  }

  _handleSkill({ playerId, skillId, cardIds = [], targets = [], ...options }) {
    const player = this.state.getPlayer(playerId);
    if (!player) return;

    const normSkillId = (skillId || '').replace(/-/g, '_').toLowerCase();

    // 1. Kỹ năng kích hoạt giao diện Modal
    if (normSkillId === 'dieu_duoc') {
      if (targets.length > 0 && cardIds.length > 0) {
        this.state.discardFromHand(playerId, [cardIds[0]]);
        const target = this.state.getPlayer(targets[0]);
        if (target && target.isAlive && target.hp < target.maxHp) {
          target.hp += 1;
          this.state.addLog(`🌿 [Diệu Dược] ${player.name} chữa lành 1 HP cho ${target.name} (${target.hp}/${target.maxHp})!`);
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

    if (normSkillId === 'hoa_than') {
      if (targets.length >= 2 && cardIds.length > 0) {
        this.state.discardFromHand(playerId, [cardIds[0]]);
        this.state.addLog(`💃 [Hòa Thân] ${player.name} bỏ 1 bài, ép ${this.state.getPlayer(targets[0])?.name} và ${this.state.getPlayer(targets[1])?.name} Quyết Đấu!`);
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
        this.state.discardFromHand(playerId, cardIds.slice(0, 2));
        this.state.addLog(`🏹 [Bình Loạn] ${player.name} bỏ 2 lá bài phát động Loạn Tiễn!`);
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

    if (normSkillId === 'trung_dung') {
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

  _handleEndPhase({ targetId }) {
    if (this.state.currentTurnPlayerId !== targetId) {
      console.warn(`[DispatcherV4] Cannot end phase: Not player ${targetId}'s turn.`);
      return;
    }
    this.stateMachine.endActionPhase();
  }

  _handleDiscard({ targetId, cardIds = [] }) {
    this.stateMachine.handleDiscard(targetId, cardIds);
  }

  _handleRevealHero({ playerId, heroIndex }) {
    const player = this.state.getPlayer(playerId);
    if (!player) return;
    player.revealedHeroes = player.revealedHeroes || [false, false];
    player.revealedHeroes[heroIndex] = true;

    const heroId = heroIndex === 0 ? player.mainHeroId : player.subHeroId;
    const hero = this.heroRegistry.get(heroId);
    const heroName = hero?.name || 'Tướng';
    const faction = hero?.faction ? ` (Phe ${hero.faction})` : '';
    this.state.addLog(`👁️ ${player.name} đã lộ diện tướng [${heroName}]${faction}!`);

    // Kiểm tra Cơ Chế Dã Tâm (Careerist)
    if (!player.isDaTam && player.faction && player.faction !== 'none') {
      const maxAllowed = Math.floor(this.state.players.length / 2);
      // Đếm số người chơi cùng phe này ĐÃ lộ diện tướng (không tính những người đã là Dã Tâm từ trước)
      const revealedSameFactionCount = this.state.players.filter(p =>
        p.revealedHeroes?.some(Boolean) &&
        p.faction === player.faction &&
        !p.isDaTam
      ).length;

      if (revealedSameFactionCount > maxAllowed) {
        player.isDaTam = true;
        this.state.addLog(`🐺 [Dã Tâm] Phe ${player.faction.toUpperCase()} đã vượt quá số lượng cho phép (${revealedSameFactionCount} > ${maxAllowed})! ${player.name} thoái hóa thành DÃ TÂM!`);
      }
    }
  }
}

export { DispatcherV4 as Dispatcher };
