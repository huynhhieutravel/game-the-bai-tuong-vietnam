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
    const frame = gameState.priorityStack?.peek?.() || (gameState.waitingForResponse ? {
      currentActorId: gameState.waitingForResponse.responderId,
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
                const discardIds = reaction.discardCardIds || (currentActor.hand || []).slice(0, 1).map(c => c.id);
                this.gameAPI.discardCards(actor.id, discardIds);
              } else {
                const chosenCard = reaction.dodgeCard || reaction.peachCard || null;
                this.gameAPI.respond({
                  playerId: actor.id,
                  cardId: chosenCard?.id,
                  canceled: !chosenCard && !reaction.useBagua,
                  ...reaction
                });
              }
            }
          } catch (err) {
            console.error('[BotRunnerV4] Error during bot reaction:', err);
            // Universal AI Fallback: Bỏ qua yêu cầu nếu bị lỗi để không kẹt game
            this.gameAPI.respond({ playerId: actor.id, canceled: true });
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
                this.gameAPI.playCard(currentTurnId, action.cardId, action.targetId !== undefined ? [action.targetId] : []);
              } else {
                this.gameAPI.endPhase(currentTurnId);
              }
            }
          } catch (err) {
            console.error('[BotRunnerV4] Error during bot action phase:', err);
            this.gameAPI.endPhase(currentTurnId);
          } finally {
            this.isProcessing = false;
          }
        }, 700);
      } else if (currentPhase === 'DRAW') {
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          try {
            this.gameAPI.drawPhase(currentTurnId);
          } finally {
            this.isProcessing = false;
          }
        }, 300);
      } else if (currentPhase === 'DISCARD') {
        const excess = (currentTurnPlayer.hand || []).length - currentTurnPlayer.hp;
        if (excess > 0) {
          const cardIds = currentTurnPlayer.hand.slice(0, excess).map(c => c.id);
          this.gameAPI.discardCards(currentTurnId, cardIds);
        }
      }
    }
  }
}

export { BotRunnerV4 as BotRunner };
