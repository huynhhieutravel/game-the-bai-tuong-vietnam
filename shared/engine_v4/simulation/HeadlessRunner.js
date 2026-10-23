/**
 * HeadlessRunner.js
 * Trình Giả Lập Tự Động 1.000 Ván Đấu Giữa Các Bot (Headless Simulation) trong Việt Sát v4.
 * Kiểm định triệt để deadlock, infinite loop và các Game Invariants ở tốc độ cao.
 */

import { GameState } from '../core/GameState.js';
import { StateMachine, PHASES } from '../core/StateMachine.js';
import { CombatRules } from '../rules/CombatRules.js';
import { TrickRules } from '../rules/TrickRules.js';
import { BotBrain } from '../ai/BotBrain.js';
import { GameInvariants } from '../core/Invariants.js';

export class HeadlessRunner {
  /**
   * Tạo bộ bài chuẩn gồm các lá bài cơ bản và trang bị
   */
  static generateStandardDeck() {
    const deck = [];
    let idCounter = 1;

    // 30 Chém (đỏ và đen)
    for (let i = 0; i < 30; i++) {
      const isRed = i % 2 === 0;
      deck.push({
        id: `card_slash_${idCounter++}`,
        name: 'Chém',
        type: 'slash',
        suit: isRed ? (i % 4 === 0 ? 'heart' : 'diamond') : (i % 4 === 2 ? 'spade' : 'club'),
        color: isRed ? 'red' : 'black',
        rank: (i % 13) + 1
      });
    }

    // 15 Né
    for (let i = 0; i < 15; i++) {
      deck.push({
        id: `card_dodge_${idCounter++}`,
        name: 'Né',
        type: 'dodge',
        suit: 'heart',
        color: 'red',
        rank: (i % 13) + 1
      });
    }

    // 8 Đào
    for (let i = 0; i < 8; i++) {
      deck.push({
        id: `card_peach_${idCounter++}`,
        name: 'Đào',
        type: 'peach',
        suit: 'heart',
        color: 'red',
        rank: (i % 5) + 1
      });
    }

    // Trang bị
    deck.push({ id: `equip_${idCounter++}`, name: 'Liên Nỏ', type: 'weapon', range: 1 });
    deck.push({ id: `equip_${idCounter++}`, name: 'Thanh Long Đao', type: 'weapon', range: 3 });
    deck.push({ id: `equip_${idCounter++}`, name: 'Hắc Thuẫn', type: 'armor', idKey: 'black_shield' });
    deck.push({ id: `equip_${idCounter++}`, name: 'Ngựa Chiến (-1)', type: 'horse_attack' });
    deck.push({ id: `equip_${idCounter++}`, name: 'Ngựa Thần (+1)', type: 'horse_defense' });

    return deck;
  }

  /**
   * Khởi tạo một trận đấu bot ngẫu nhiên
   */
  static createGame(playerCount = 4) {
    const deck = this.generateStandardDeck();
    // Xáo bài đơn giản
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const identities = playerCount === 4 ? ['lord', 'loyalist', 'rebel', 'rebel'] : ['lord', 'rebel'];

    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: `Bot ${i} [${identities[i]}]`,
      isLord: identities[i] === 'lord',
      identity: identities[i],
      hp: identities[i] === 'lord' ? 5 : 4,
      maxHp: identities[i] === 'lord' ? 5 : 4,
      hand: [],
      skills: []
    }));

    const gameState = new GameState({
      players,
      drawPile: deck,
      currentTurnPlayerId: 0,
      initialTotalCards: deck.length
    });

    // Chia mỗi người 4 lá bài ban đầu
    for (const p of gameState.players) {
      gameState.drawCards(p.id, 4);
    }

    return new StateMachine(gameState);
  }

  /**
   * Chạy mô phỏng 1 ván đấu cho đến khi có người thắng hoặc chạm giới hạn
   */
  static runSingleGame(playerCount = 4, maxSteps = 1500) {
    const stateMachine = this.createGame(playerCount);
    const state = stateMachine.state;

    stateMachine.startTurn(0);

    let step = 0;
    while (step < maxSteps) {
      step++;

      // Kiểm tra điều kiện thắng
      const alive = state.getAlivePlayers();
      if (state.gameOver) {
        const lordAlive = alive.some(p => p.isLord);
        return { winner: lordAlive ? 'LORD' : 'REBEL', turns: step, state };
      }
      const lordAlive = alive.some(p => p.isLord);
      const rebelsAlive = alive.some(p => p.identity === 'rebel');

      if (!lordAlive) {
        return { winner: 'REBEL', turns: step, state };
      }
      if (!rebelsAlive) {
        return { winner: 'LORD', turns: step, state };
      }

      // 1. Nếu PriorityStack có yêu cầu phản hồi (ASK_DODGE, ASK_PEACH, ASK_DISCARD)
      if (!state.priorityStack.isEmpty()) {
        const frame = state.priorityStack.peek();
        const actorId = frame.currentActorId;
        const reaction = BotBrain.decideReaction(state, actorId, frame);

        if (frame.type === 'ASK_DODGE') {
          CombatRules.respondDodge(state, actorId, reaction.dodgeCard, reaction);
        } else if (frame.type === 'ASK_PEACH') {
          CombatRules.respondPeach(state, actorId, reaction.peachCard);
        } else if (frame.type === 'ASK_DISCARD') {
          stateMachine.handleDiscard(actorId, reaction.discardCardIds);
        } else if (frame.type === 'ASK_SLASH_DUEL') {
          TrickRules.respondDuel(state, actorId, reaction.slashCard);
        } else if (frame.type === 'ASK_NEGATE') {
          TrickRules.respondNegate(state, actorId, reaction.negateCard);
        } else if (frame.type === 'ASK_CHANGE_JUDGE') {
          TrickRules.respondChangeJudge(state, actorId, null);
        } else if (frame.type === 'ASK_BOC_TRAM_TRUNG_DODGE') {
          CombatRules.respondBocTramTrungDodge(state, actorId, reaction.dodgeCard || null);
        } else if (frame.type === 'ASK_BOC_TRAM_TRUNG_SLASH') {
          CombatRules.respondBocTramTrungSlash(state, actorId, reaction.slashCard || null);
        } else if (frame.type === 'ASK_TIEN_PHAT') {
          CombatRules.respondTienPhat(state, actorId, reaction.dodgeCard || null);
        } else if (frame.type === 'ASK_HAU_VIEN') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          p.hp = Math.min(p.maxHp, p.hp + 1);
        } else if (frame.type === 'ASK_HOACONG_REVEAL') {
          const p = state.getPlayer(actorId);
          const card = p.hand && p.hand.length > 0 ? p.hand[0] : null;
          TrickRules.respondHoaCongReveal(state, actorId, card);
        } else if (frame.type === 'ASK_HOACONG_DISCARD') {
          const p = state.getPlayer(actorId);
          const { revealedCard } = frame.context;
          const matchCard = p.hand?.find(c => (c.suit && c.suit === revealedCard?.suit) || (c.color && c.color === revealedCard?.color));
          TrickRules.respondHoaCongDiscard(state, actorId, matchCard || null);
        } else if (frame.type === 'ASK_TRE_NGA_DISCARD') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const matchCard = p.hand?.find(c => c.suit === frame.context?.judgeSuit);
          if (matchCard) {
            state.discardFromHand(actorId, [matchCard.id]);
          } else if (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_DODGE') {
            CombatRules.respondDodge(state, actorId, null);
          }
        } else if (frame.type === 'ASK_DOAT_SAO') {
          state.priorityStack.pop();
          state.drawCards(actorId, 4);
          const p = state.getPlayer(actorId);
          if (p.hand && p.hand.length > 0) {
            state.priorityStack.push({
              type: 'ASK_DOAT_SAO_DISCARD',
              sourceId: actorId,
              targetId: actorId,
              currentActorId: actorId,
              priorityQueue: [actorId]
            });
          }
        } else if (frame.type === 'ASK_DOAT_SAO_DISCARD') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          if (p.hand && p.hand.length > 0) {
            state.discardFromHand(actorId, [p.hand[0].id]);
          }
        } else if (frame.type === 'ASK_HIEN_HAU') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          p.temporaryFlags = p.temporaryFlags || {};
          p.temporaryFlags.hienHauAttempted = true;
          CombatRules.applyDamage(
            state,
            frame.context.attackerId,
            actorId,
            frame.context.damageAmount,
            frame.context.reason,
            frame.context.isChainedPropagation
          );
          p.temporaryFlags.hienHauAttempted = false;
        } else if (frame.type === 'ASK_KHOAN_DAN') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const deficit = Math.max(0, Math.min(5, p.maxHp) - (p.hand ? p.hand.length : 0));
          if (deficit > 0) {
            state.drawCards(actorId, deficit);
          }
        } else if (frame.type === 'ASK_BANH_CHUNG') {
          state.priorityStack.pop();
        } else {
          // Bỏ qua các frame khác bằng cách pop
          if (frame.context?.judgeCard) state.discardPile.push(frame.context.judgeCard);
          if (frame.context?.delayedCard) state.discardPile.push(frame.context.delayedCard);
          state.priorityStack.pop();
        }

        continue;
      }

      // 2. Nếu đang ở Pha Hành động (ACTION)
      if (state.currentPhase === PHASES.ACTION) {
        const currentBotId = state.currentTurnPlayerId;
        const action = BotBrain.decideAction(state, currentBotId);

        if (action.type === 'PLAY_CARD') {
          const card = state.getPlayer(currentBotId).hand.find(c => c.id === action.cardId);
          if (card && card.type === 'slash') {
            CombatRules.playSlash(state, currentBotId, action.targetId, card);
          } else if (card && card.type === 'trick') {
            try {
              TrickRules.playTrick(state, currentBotId, action.targetId !== undefined ? [action.targetId] : [], card);
            } catch (e) {
              // Nếu mục tiêu không hợp lệ hoặc đã có trong khu phán xét, kết thúc hành động
              stateMachine.endActionPhase();
            }
          } else if (card && card.type === 'peach') {
            // Ăn Đào
            const p = state.getPlayer(currentBotId);
            state.discardFromHand(currentBotId, [card.id]);
            p.hp = Math.min(p.maxHp, p.hp + 1);
          } else if (card) {
            // Trang bị: Chuyển từ tay sang slot trang bị (trang bị cũ vào discardPile)
            const p = state.getPlayer(currentBotId);
            p.hand = p.hand.filter(c => c.id !== card.id);
            let slot = null;
            if (card.type === 'weapon' || card.name?.includes('Đao') || card.name?.includes('Nỏ') || card.name?.includes('Rìu')) slot = 'weapon';
            else if (card.type === 'armor' || card.name?.includes('Thuẫn') || card.name?.includes('Quái')) slot = 'armor';
            else if (card.type === 'horse_attack' || card.name?.includes('(-1)')) slot = 'horse_attack';
            else if (card.type === 'horse_defense' || card.name?.includes('(+1)')) slot = 'horse_defense';

            if (slot) {
              const old = p.equipment[slot];
              if (old) state.discardPile.push(old);
              p.equipment[slot] = card;
            } else {
              state.discardPile.push(card);
            }
          }
        } else {
          // Kết thúc Pha Hành động -> Chuyển sang Bỏ bài
          stateMachine.endActionPhase();
        }

        continue;
      }

      // Các trường hợp khác: Nếu đang ở DISCARD mà không cần bỏ bài -> đã tự động sang END -> nextTurn
      if (state.currentPhase === PHASES.DISCARD) {
        stateMachine._runPhaseDiscard();
      }
    }

    return { winner: 'DRAW_OR_TIMEOUT', turns: step, state };
  }

  /**
   * Chạy hàng loạt N ván đấu để kiểm tra độ ổn định và phát hiện crash/deadlock
   */
  static runBatch(gameCount = 100, playerCount = 4) {
    const results = {
      total: gameCount,
      lordWins: 0,
      rebelWins: 0,
      timeouts: 0,
      errors: []
    };

    for (let i = 0; i < gameCount; i++) {
      try {
        const res = this.runSingleGame(playerCount);
        if (res.winner === 'LORD') results.lordWins++;
        else if (res.winner === 'REBEL') results.rebelWins++;
        else results.timeouts++;
      } catch (err) {
        results.errors.push({ gameIndex: i, error: err.message, stack: err.stack });
      }
    }

    return results;
  }
}
