// @ts-check
/**
 * BotRunnerV4.js
 * Quản lý Trí Tuệ Nhân Tạo & Điều Phối Lượt Bot cho Việt Sát v4.
 * Tích hợp BotBrain v4, Universal AI Fallback và chống deadlock, treo game tuyệt đối.
 */

import { BotBrain } from '../ai/BotBrain.js';
import { PHASES } from '../../constants/phases.js';

export const BOT_PACE_CONFIG = {
  slow: {
    action: 1800,
    reaction: 1200,
    draw: 600,
    discard: 700,
    end: 500,
    draft: 800
  },
  normal: { // Mặc định mới: nhịp độ thong thả, rõ ràng
    action: 1300,
    reaction: 900,
    draw: 450,
    discard: 500,
    end: 400,
    draft: 500
  },
  fast: { // Tốc độ tiêu chuẩn ban đầu của game
    action: 700,
    reaction: 600,
    draw: 300,
    discard: 400,
    end: 300,
    draft: 500
  }
};

const DEFAULT_PACE = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') ? 'fast' : 'normal';

export class BotRunnerV4 {
  constructor(gameAPI, pace = DEFAULT_PACE) {
    this.gameAPI = gameAPI;
    this.timerId = null;
    this.isProcessing = false;
    this.pace = BOT_PACE_CONFIG[pace] ? pace : DEFAULT_PACE;
  }

  setPace(pace) {
    if (BOT_PACE_CONFIG[pace]) {
      this.pace = pace;
    }
  }

  getPace() {
    return this.pace;
  }

  getDelay(type) {
    const config = BOT_PACE_CONFIG[this.pace] || BOT_PACE_CONFIG.normal;
    return config[type] ?? BOT_PACE_CONFIG.normal[type] ?? 1000;
  }

  _clearTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  cleanup() {
    this._clearTimer();
    this.isProcessing = false;
  }

  onStateUpdate(gameState) {
    if (!gameState || gameState.gameOver || this.isProcessing) return;

    // --- 1. Xử lý giai đoạn Chọn Tướng (DRAFT) cho Bot ---
    if ((gameState.currentPhase || gameState.phase) === PHASES.DRAFT || gameState.phase === 'draft') {
      const botsToDraft = (gameState.players || []).filter(p => p.isBot && !p.hasDrafted);
      if (botsToDraft.length > 0) {
        this._clearTimer();
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          this.timerId = null;
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
        }, this.getDelay('draft'));
      }
      return;
    }

    // --- 2. Xử lý phản hồi khi có PriorityFrame đang chờ ---
    const peeked = gameState.priorityStack?.peek?.();
    const frame = peeked ? {
      ...peeked,
      currentActorId: peeked.context?.currentResponderId ?? peeked.currentActorId ?? peeked.priorityQueue?.[0] ?? peeked.targetId
    } : (gameState.waitingForResponse ? {
      currentActorId: gameState.waitingForResponse.responderId ?? gameState.waitingForResponse.targetId,
      type: (gameState.waitingForResponse.type || '').toUpperCase(),
      context: gameState.waitingForResponse
    } : null);

    if (frame) {
      if (frame.currentActorId !== undefined && frame.currentActorId !== null) {
        const actor = (gameState.players || []).find(p => p.id === frame.currentActorId);
        if (actor && actor.isBot) {
          this._clearTimer();
          this.isProcessing = true;
          this.timerId = setTimeout(() => {
            this.timerId = null;
            try {
              const latestState = this.gameAPI.dispatcher.state;
              const latestFrame = latestState.priorityStack?.peek?.();
              if (!latestFrame) {
                this.isProcessing = false;
                return;
              }

              // Kiểm tra chính xác ai đang thực sự được chờ phản hồi trên latestFrame
              const expectedActorId = latestFrame.context?.currentResponderId ?? 
                                      latestFrame.currentActorId ?? 
                                      latestFrame.priorityQueue?.[0] ?? 
                                      latestFrame.targetId;

              // NẾU actor.id KHÔNG CÒN LÀ NGƯỜI CẦN PHẢN HỒI -> THOÁT NGAY ĐỂ TRÁNH LỖI ĐỌ CHÉM/NÉ CỦA NGƯỜI KHÁC!
              if (expectedActorId !== actor.id) {
                this.isProcessing = false;
                return;
              }

              const currentActor = latestState.getPlayer ? latestState.getPlayer(actor.id) : latestState.players.find(p => p.id === actor.id);

              if (currentActor && currentActor.isAlive) {
                const reaction = BotBrain.decideReaction(latestState, actor.id, latestFrame);

                if (latestFrame.type === 'ASK_DISCARD') {
                  const required = Math.min((currentActor.hand || []).length, latestFrame.context?.cardsToDiscard || 1);
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
                    : (!chosenCard && !chosenCardId && !reaction.useBagua && !reaction.doUse && !reaction.orderedCards && !reaction.doProvide && !reaction.doReact && !reaction.doJudge && !reaction.doDiscard && !reaction.option && !reaction.selectedAlly && !reaction.suit && !reaction.virtualCardName && !reaction.costType && !reaction.cardIds && !reaction.targetId && !reaction.targetA && !reaction.targets);
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
                // Actor đã chết -> Tự động bỏ qua yêu cầu phản hồi để giải phóng PriorityFrame
                this.isProcessing = false;
                this.gameAPI.respond({ playerId: actor.id, canceled: true, _isAuto: true });
              }
            } catch (err) {
              console.error('[BotRunnerV4] Error during bot reaction:', err);
              this.isProcessing = false;
              // Chỉ fallback canceled nếu latestFrame vẫn đang thực sự chờ actor này
              try {
                const state = this.gameAPI.dispatcher.state;
                const frame = state.priorityStack?.peek?.();
                const expectedId = frame?.context?.currentResponderId ?? frame?.currentActorId ?? frame?.priorityQueue?.[0] ?? frame?.targetId;
                if (expectedId === actor.id) {
                  this.gameAPI.respond({ playerId: actor.id, canceled: true, _isAuto: true });
                }
              } catch (_) {}
            } finally {
              this.isProcessing = false;
            }
          }, this.getDelay('reaction'));
          return;
        }
      }
      // Đang có PriorityFrame chờ phản hồi (của người chơi Người hoặc chờ tiến trình) -> DỪNG LẠI, KHÔNG rơi xuống xử lý lượt hành động!
      return;
    }

    // --- 3. Xử lý Lượt Hành Động của Bot ---
    const currentTurnId = gameState.currentTurnPlayerId ?? gameState.currentPlayerIndex;
    const currentTurnPlayer = (gameState.players || []).find(p => p.id === currentTurnId);

    if (currentTurnPlayer && currentTurnPlayer.isBot && currentTurnPlayer.isAlive) {
      const currentPhase = (gameState.currentPhase || gameState.phase || '').toUpperCase();

      if (currentPhase === 'ACTION') {
        this._clearTimer();
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          this.timerId = null;
          try {
            const latestState = this.gameAPI.dispatcher.state;
            const latestPhase = (latestState.currentPhase || latestState.phase || '').toUpperCase();
            
            // NẾU LATEST STATE KHÔNG CÒN Ở ACTION PHASE HOẶC ĐANG CÓ PRIORITY FRAME CHỜ PHẢN HỒI -> THOÁT NGAY!
            if (latestPhase !== 'ACTION' || (latestState.priorityStack && !latestState.priorityStack.isEmpty()) || latestState.waitingForResponse) {
              this.isProcessing = false;
              return;
            }

            const latestBot = latestState.getPlayer ? latestState.getPlayer(currentTurnId) : latestState.players.find(p => p.id === currentTurnId);

            if (latestBot && latestBot.isAlive) {
              const action = BotBrain.decideAction(latestState, currentTurnId);

              if (action && action.type === 'PLAY_CARD') {
                const targetIds = action.targetIds || (action.targetId !== undefined ? [action.targetId] : []);
                this.isProcessing = false;
                this.gameAPI.playCard(currentTurnId, action.cardId, targetIds, {
                  virtualCardName: action.virtualCardName,
                  asSlash: action.asSlash,
                  asChain: action.asChain,
                  ...(action.customData || {})
                });
              } else if (action && action.type === 'USE_SKILL') {
                this.isProcessing = false;
                this.gameAPI.useSkill(
                  currentTurnId,
                  action.skillId,
                  action.cardIds || [],
                  action.targets || [],
                  action.options || {}
                );
              } else if (action && action.type === 'REVEAL_HERO') {
                this.isProcessing = false;
                this.gameAPI.revealHero(currentTurnId, action.heroIndex);
              } else {
                this.isProcessing = false;
                this.gameAPI.endPhase(currentTurnId);
              }
            }
          } catch (err) {
            console.error('[BotRunnerV4] Error during bot action phase:', err);
            this.isProcessing = false;
            try {
              if ((this.gameAPI.dispatcher.state.currentPhase || '').toUpperCase() === 'ACTION') {
                this.gameAPI.endPhase(currentTurnId);
              }
            } catch (_) {}
          } finally {
            this.isProcessing = false;
          }
        }, this.getDelay('action'));
      } else if (currentPhase === 'DRAW') {
        this._clearTimer();
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          this.timerId = null;
          try {
            const latestState = this.gameAPI.dispatcher.state;
            const latestPhase = (latestState.currentPhase || latestState.phase || '').toUpperCase();
            if (latestPhase === 'DRAW') {
              this.isProcessing = false;
              this.gameAPI.drawPhase(currentTurnId);
            }
          } finally {
            this.isProcessing = false;
          }
        }, this.getDelay('draw'));
      } else if (currentPhase === 'DISCARD') {
        this._clearTimer();
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          this.timerId = null;
          try {
            const latestState = this.gameAPI.dispatcher.state;
            const latestPhase = (latestState.currentPhase || latestState.phase || '').toUpperCase();
            if (latestPhase !== 'DISCARD') {
              this.isProcessing = false;
              return;
            }

            const latestBot = latestState.getPlayer ? latestState.getPlayer(currentTurnId) : latestState.players.find(p => p.id === currentTurnId);
            if (!latestBot || !latestBot.isAlive) {
              this.isProcessing = false;
              return;
            }

            const currentFrame = latestState.priorityStack?.peek?.();
            const excess = (latestBot.hand || []).length - Math.max(0, latestBot.hp);
            const rawRequired = currentFrame?.context?.cardsToDiscard ?? Math.max(0, excess);
            const requiredCards = Math.min((latestBot.hand || []).length, rawRequired);

            if (requiredCards > 0 && currentFrame && currentFrame.type === 'ASK_DISCARD') {
              const cardIds = (latestBot.hand || []).slice(0, requiredCards).map(c => c.id);
              this.isProcessing = false;
              this.gameAPI.discardCards(currentTurnId, cardIds);
            } else if (excess <= 0 && (!currentFrame || currentFrame.type !== 'ASK_DISCARD')) {
              // Thỏa mãn giới hạn bài tay -> Kết thúc pha Bỏ bài để chuyển sang END
              this.isProcessing = false;
              this.gameAPI.endPhase(currentTurnId);
            } else {
              // Đang có frame khác chờ hoặc chưa sẵn sàng discard -> chờ vòng lặp tiếp theo
              this.isProcessing = false;
              return;
            }
          } catch (err) {
            console.error('[BotRunnerV4] Error during bot discard phase:', err);
            this.isProcessing = false;
            try {
              this.gameAPI.endPhase(currentTurnId);
            } catch (_) {}
          } finally {
            this.isProcessing = false;
          }
        }, this.getDelay('discard'));
      } else if (currentPhase === 'END') {
        this._clearTimer();
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          this.timerId = null;
          try {
            const latestState = this.gameAPI.dispatcher.state;
            const latestPhase = (latestState.currentPhase || latestState.phase || '').toUpperCase();
            if (latestPhase === 'END' && (!latestState.priorityStack || latestState.priorityStack.isEmpty())) {
              this.isProcessing = false;
              this.gameAPI.endPhase(currentTurnId);
            }
          } finally {
            this.isProcessing = false;
          }
        }, this.getDelay('end'));
      }
    }
  }
}

export { BotRunnerV4 as BotRunner };
