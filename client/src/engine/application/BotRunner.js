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
      activeActorId = (req.askQueue && req.askQueue.length > 0 ? req.askQueue[0] : req.responderId) ?? req.targetId ?? gameState.currentPlayerIndex;
    }

    const activePlayer = gameState.players.find(p => p.id === activeActorId);
    
    // Nếu là lượt/yêu cầu của Bot
    if (activePlayer && activePlayer.isBot) {
        this.isProcessing = true;
        this.timerId = setTimeout(() => {
            const action = getBotAction(gameState, activePlayer);
            this.isProcessing = false; // MUST reset before dispatch to allow nested state updates (reentrancy)
            if (action) {
               if (this.gameAPI.dispatcher) {
                   this.gameAPI.dispatcher.dispatchAction(action);
               } else {
                   console.error("BotRunner không tìm thấy dispatcher!");
               }
            }
        }, 800); // 800ms delay cho cảm giác giống người
    }
  }

  // Cleanup khi unmount (nếu có)
  cleanup() {
    if (this.timerId) clearTimeout(this.timerId);
    this.isProcessing = false;
  }
}
