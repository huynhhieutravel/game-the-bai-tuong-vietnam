// ==========================================
// Bot Runner - Application Layer
// Quản lý việc Bot ra quyết định. Không thuộc về UI, cũng không thuộc về Core Engine (Dispatcher).
// Nó đứng giữa: Lắng nghe GameState -> Đợi timeout -> Dùng GameAPI để ra lệnh
// ==========================================
import { PHASES } from '../../data/gameData';
import { getBotAction } from '../ai/botLogic';

export class BotRunner {
  constructor(gameAPI) {
    this.gameAPI = gameAPI;
    this.timerId = null;
    this.isProcessing = false;
  }

  // Được gọi khi GameState thay đổi
  onStateUpdate(gameState) {
    if (!gameState || gameState.gameOver || this.isProcessing) return;

    // --- Xử lý DRAFT Phase cho Bot ---
    if ((gameState.currentPhase || gameState.phase) === PHASES.DRAFT) {
      const botsToDraft = gameState.players.filter(p => p.isBot && !p.hasDrafted);
      if (botsToDraft.length > 0) {
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
          botsToDraft.forEach(bot => {
            const factions = {};
            bot.draftHeroes.forEach(h => {
              if (!factions[h.faction]) factions[h.faction] = [];
              factions[h.faction].push(h);
            });
            let selectedPair = null;
            for (const fac in factions) {
              if (factions[fac].length >= 2) {
                selectedPair = [factions[fac][0], factions[fac][1]];
                break;
              }
            }
            if (selectedPair) {
              this.gameAPI.selectDraftHeroes(bot.id, selectedPair[0].id, selectedPair[1].id);
            }
          });
          this.isProcessing = false;
        }, 800);
      }
      return;
    }

    // --- Xử lý In-Game cho Bot ---
    let activeActorId = gameState.currentPlayerIndex;
    if (gameState.waitingForResponse) {
      const req = gameState.waitingForResponse;
      activeActorId = req.responderId ?? (req.askQueue && req.askQueue.length > 0 ? req.askQueue[0] : null) ?? req.targetId ?? req.sourceId ?? gameState.currentPlayerIndex;
    }

    const activePlayer = gameState.players.find(p => p.id === activeActorId);
    
    // Nếu là lượt/yêu cầu của Bot
    if (activePlayer && activePlayer.isBot) {
        // Đánh giá THỬ xem Bot có hành động gì không (tránh việc block queue bởi các event chuyển phase lặt vặt)
        const tentativeAction = getBotAction(gameState, activePlayer);
        
        if (tentativeAction) {
            console.log(`[BotRunner] Triggered for Bot ID: ${activePlayer.id}, waitingForResponse:`, gameState.waitingForResponse);
            this.isProcessing = true;
            this.timerId = setTimeout(() => {
                try {
                    // Lấy LATEST state từ dispatcher thay vì dùng state trong closure bị cũ!
                    const latestState = this.gameAPI.dispatcher.state;
                    const currentActivePlayer = latestState.players.find(p => p.id === activeActorId);
                    
                    const action = getBotAction(latestState, currentActivePlayer);
                    console.log(`[BotRunner] getBotAction returned:`, action);
                    
                    this.isProcessing = false; // MUST reset before dispatch to allow nested state updates (reentrancy)
                    
                    if (action) {
                       if (this.gameAPI.dispatcher) {
                           console.log(`[BotRunner] Dispatching action:`, action);
                           this.gameAPI.dispatcher.dispatchAction(action);
                       } else {
                           console.error("BotRunner không tìm thấy dispatcher!");
                       }
                    }
                } catch (err) {
                    console.error("[BotRunner] Error in getBotAction:", err);
                    this.isProcessing = false;
                    
                    // CRITICAL FALLBACK: Ngăn chặn Game bị đứng (Freeze) nếu AI tính toán lỗi
                    if (this.gameAPI.dispatcher) {
                        const state = this.gameAPI.dispatcher.state;
                        if (state.waitingForResponse) {
                            console.warn("[BotRunner] Gửi tín hiệu Cancel do Bot AI bị lỗi (crash) trong lúc chờ phản hồi.");
                            this.gameAPI.dispatcher.dispatchAction({ 
                                type: 'ACTION_REACT', 
                                payload: { playerId: activeActorId, responseType: 'cancel', data: { canceled: true } } 
                            });
                        } else if (state.currentPhase === 'action' && state.currentPlayerIndex === activeActorId) {
                            console.warn("[BotRunner] Gửi tín hiệu End Phase do Bot AI bị lỗi (crash) trong Phase chính.");
                            this.gameAPI.dispatcher.dispatchAction({ 
                                type: 'ACTION_END_PHASE', 
                                payload: { playerId: activeActorId } 
                            });
                        }
                    }
                }
            }, 800); // 800ms delay cho cảm giác giống người
        }
    }
  }

  // Cleanup khi unmount (nếu có)
  cleanup() {
    if (this.timerId) clearTimeout(this.timerId);
    this.isProcessing = false;
  }
}
