// @ts-check
/**
 * BotRunnerV4.js
 * Quản lý Trí Tuệ Nhân Tạo & Điều Phối Lượt Bot cho Việt Sát v4.
 * Tích hợp BotBrain v4, Universal AI Fallback và chống deadlock, treo game tuyệt đối.
 */

import { BotBrain } from '../ai/BotBrain.js';
import { PHASES } from '../../constants/phases.js';

export class BotRunnerV4 {
  constructor(gameAPI) {
    this.gameAPI = gameAPI;
    this.timerId = null;
    this.isProcessing = false;
  }

  cleanup() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isProcessing = false;
  }

  onStateUpdate(gameState) {
    if (!gameState || gameState.gameOver || this.isProcessing) return;

    // --- 1. Xử lý giai đoạn Chọn Tướng (DRAFT) cho Bot ---
    if ((gameState.currentPhase || gameState.phase) === PHASES.DRAFT || gameState.phase === 'draft') {
      const botsToDraft = (gameState.players || []).filter(p => p.isBot && !p.hasDrafted);
      if (botsToDraft.length > 0) {
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          try {
            botsToDraft.forEach(bot => {
              const factions = {};
              (bot.draftHeroes || []).forEach(h => {
                if (!factions[h.faction]) factions[h.faction] = [];
                factions[h.faction].push(h);
              });

              let selectedPair = null;
              for (const fac in factions) {
                if (factions[fac].length >= 2) {
                  selectedPair = [factions[fac][0].id, factions[fac][1].id];
                  break;
                }
              }

              this.isProcessing = false;
              if (selectedPair) {
                this.gameAPI.selectDraftHeroes(bot.id, selectedPair[0], selectedPair[1]);
              } else if (bot.draftHeroes && bot.draftHeroes.length >= 2) {
                this.gameAPI.selectDraftHeroes(bot.id, bot.draftHeroes[0].id, bot.draftHeroes[1].id);
              }
            });
          } finally {
            this.isProcessing = false;
          }
        }, 500);
      }
      return;
    }

    // --- 2. Xử lý phản hồi khi có PriorityFrame đang chờ ---
    const peeked = gameState.priorityStack?.peek?.();
    const frame = peeked ? {
      ...peeked,
      currentActorId: peeked.currentActorId ?? peeked.priorityQueue?.[0] ?? peeked.targetId
    } : (gameState.waitingForResponse ? {
      currentActorId: gameState.waitingForResponse.responderId ?? gameState.waitingForResponse.targetId,
      type: (gameState.waitingForResponse.type || '').toUpperCase(),
      context: gameState.waitingForResponse
    } : null);

    if (frame && frame.currentActorId !== undefined && frame.currentActorId !== null) {
      const actor = (gameState.players || []).find(p => p.id === frame.currentActorId);
      if (actor && actor.isBot) {
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          try {
            const latestState = this.gameAPI.dispatcher.state;
            const currentActor = latestState.getPlayer ? latestState.getPlayer(actor.id) : latestState.players.find(p => p.id === actor.id);
            const latestFrame = latestState.priorityStack?.peek?.() || frame;

            if (currentActor && currentActor.isAlive) {
              const reaction = BotBrain.decideReaction(latestState, actor.id, latestFrame);

              if (latestFrame.type === 'ASK_DISCARD') {
                const required = latestFrame.context?.cardsToDiscard || 1;
                const discardIds = (reaction.discardCardIds && reaction.discardCardIds.length === required)
                  ? reaction.discardCardIds
                  : (currentActor.hand || []).slice(0, required).map(c => c.id);
                this.isProcessing = false;
                this.gameAPI.discardCards(actor.id, discardIds);
              } else {
                const chosenCard = reaction.dodgeCard || reaction.peachCard || reaction.slashCard || reaction.negateCard || null;
                const chosenCardId = reaction.cardId || chosenCard?.id;
                const isCanceled = reaction.canceled !== undefined 
                  ? reaction.canceled 
                  : (!chosenCard && !chosenCardId && !reaction.useBagua && !reaction.doUse && !reaction.orderedCards && !reaction.doProvide && !reaction.doReact);
                this.isProcessing = false;
                this.gameAPI.respond({
                  playerId: actor.id,
                  cardId: chosenCardId,
                  canceled: isCanceled,
                  _isAuto: true,
                  ...reaction
                });
              }
            } else if (currentActor && !currentActor.isAlive) {
              // Actor đã chết -> Tự động bỏ qua yêu cầu phản hồi để giải phóng PriorityFrame, chống kẹt game
              this.isProcessing = false;
              this.gameAPI.respond({ playerId: actor.id, canceled: true, _isAuto: true });
            }
          } catch (err) {
            console.error('[BotRunnerV4] Error during bot reaction:', err);
            // Universal AI Fallback: Bỏ qua yêu cầu nếu bị lỗi để không kẹt game
            this.isProcessing = false;
            this.gameAPI.respond({ playerId: actor.id, canceled: true, _isAuto: true });
          } finally {
            this.isProcessing = false;
          }
        }, 600);
        return;
      }
    }

    // --- 3. Xử lý Lượt Hành Động của Bot ---
    const currentTurnId = gameState.currentTurnPlayerId ?? gameState.currentPlayerIndex;
    const currentTurnPlayer = (gameState.players || []).find(p => p.id === currentTurnId);

    if (currentTurnPlayer && currentTurnPlayer.isBot && currentTurnPlayer.isAlive) {
      const currentPhase = (gameState.currentPhase || gameState.phase || '').toUpperCase();

      if (currentPhase === 'ACTION') {
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          try {
            const latestState = this.gameAPI.dispatcher.state;
            const latestBot = latestState.getPlayer ? latestState.getPlayer(currentTurnId) : latestState.players.find(p => p.id === currentTurnId);

            if (latestBot && latestBot.isAlive) {
              const action = BotBrain.decideAction(latestState, currentTurnId);

              if (action && action.type === 'PLAY_CARD') {
                const targetIds = action.targetIds || (action.targetId !== undefined ? [action.targetId] : []);
                this.isProcessing = false;
                this.gameAPI.playCard(currentTurnId, action.cardId, targetIds);
              } else {
                this.isProcessing = false;
                this.gameAPI.endPhase(currentTurnId);
              }
            }
          } catch (err) {
            console.error('[BotRunnerV4] Error during bot action phase:', err);
            this.isProcessing = false;
            this.gameAPI.endPhase(currentTurnId);
          } finally {
            this.isProcessing = false;
          }
        }, 700);
      } else if (currentPhase === 'DRAW') {
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          try {
            this.isProcessing = false;
            this.gameAPI.drawPhase(currentTurnId);
          } finally {
            this.isProcessing = false;
          }
        }, 300);
      } else if (currentPhase === 'DISCARD') {
        const excess = (currentTurnPlayer.hand || []).length - currentTurnPlayer.hp;
        if (excess > 0) {
          const cardIds = currentTurnPlayer.hand.slice(0, excess).map(c => c.id);
          this.isProcessing = false;
          this.gameAPI.discardCards(currentTurnId, cardIds);
        }
      }
    }
  }
}

export { BotRunnerV4 as BotRunner };
