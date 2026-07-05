// ==========================================
// Trick Handler — Cẩm nang & Trick Events
// EVENT_DISMANTLE, EVENT_SNATCH, EVENT_HOA_CONG, EVENT_DRAW_CARDS,
// EVENT_CHAIN, EVENT_ASK_TRE_NGA_DISCARD, EVENT_JUDGE, EVENT_ASK_NEGATE,
// EVENT_TRIGGER_SKILL_ASK, EVENT_HEAL
// ==========================================
import * as Effects from '../Effects';
import { HeroRegistry } from '../../registries/HeroRegistry';

export function handleTrickEvent(dispatcher, event) {
   const { type, payload } = event;

   switch (type) {
      case 'EVENT_DISMANTLE': {
         const { sourceId, targetId, sourceCardId, isCancelled } = payload;
         if (isCancelled) return true;
         dispatcher.state.waitingForResponse = { type: 'ask_dismantle', responderId: sourceId, sourceId, targetId, sourceCardId };
         return true;
      }

      case 'EVENT_SNATCH': {
         const { sourceId, targetId, sourceCardId, isCancelled } = payload;
         if (isCancelled) return true;
         dispatcher.state.waitingForResponse = { type: 'ask_snatch', responderId: sourceId, sourceId, targetId, sourceCardId };
         return true;
      }

      case 'EVENT_HOA_CONG': {
         const { sourceId, targetId, sourceCardId, isCancelled } = payload;
         if (isCancelled) return true;
         dispatcher.state.waitingForResponse = { type: 'ask_hoacong_reveal', responderId: targetId, sourceId, targetId, sourceCardId };
         return true;
      }

      case 'EVENT_DRAW_CARDS': {
         const { targetId, amount, isCancelled } = payload;
         if (isCancelled) return true;
         dispatcher.applyEffect(Effects.DrawCardEffect(targetId, amount));
         dispatcher.addLog(`📜 ${dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId))} rút thêm ${amount} lá bài!`);
         return true;
      }

      case 'EVENT_HEAL': {
         const { targetId, amount, isCancelled } = payload;
         if (isCancelled) return true;
         dispatcher.applyEffect(Effects.RecoverEffect(targetId, amount));
         dispatcher.addLog(`💚 ${dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId))} hồi ${amount} máu!`);
         return true;
      }

      case 'EVENT_CHAIN': {
         const { targetId, isCancelled } = payload;
         if (isCancelled) return true;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target) {
             target.isChained = !target.isChained;
             dispatcher.addLog(`🔗 ${dispatcher.getHeroName(target)} đã bị ${target.isChained ? 'Khóa' : 'Mở Khóa'} Xiềng Xích!`);
         }
         return true;
      }

      case 'EVENT_ASK_TRE_NGA_DISCARD': {
         const { playerId, targets, dodgeEventPayload, judgeSuit, isCancelled } = payload;
         if (isCancelled) return true;
         dispatcher.state.waitingForResponse = { type: 'ask_tre_nga_discard', responderId: targets[0], targetId: targets[0], sourceId: playerId, judgeSuit, dodgeEventPayload };
         return true;
      }

      case 'EVENT_TRIGGER_SKILL_ASK': {
          const request = payload.request;
          if (!request.responderId) {
             request.responderId = (request.askQueue && request.askQueue[0]) ?? request.targetId ?? request.sourceId;
          }
          dispatcher.state.waitingForResponse = request;
         return true;
      }

      case 'EVENT_JUDGE': {
         const { targetId, reason } = payload;
         
         const judgeCard = dispatcher.state.deck.length > 0 ? dispatcher.state.deck.pop() : { suit: '♠', rank: 2 }; 
         dispatcher.state.currentJudgeCard = judgeCard;
         
         const targetName = dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId));
         dispatcher.addLog(`⚖️ Phán Xét [${reason}]: ${targetName} lật ra lá ${judgeCard.suit} ${judgeCard.rank}`, 'info');
         
         // 1. Tạo hàng đợi những người có skill Quân Cơ (sau này có thể thêm Quỷ Tài)
         const aliveIds = dispatcher.state.players.filter(p => p.isAlive).map(p => p.id);
         const orderedIds = dispatcher.getOrderedTargets(targetId, aliveIds);
         
         const quanCoPlayers = orderedIds.filter(id => {
             const p = dispatcher.state.players.find(x => x.id === id);
             const heroes = [HeroRegistry[p.mainHeroId], HeroRegistry[p.subHeroId]];
             return heroes.some((hero, i) => hero && hero.skillIds && hero.skillIds.includes('quan-co') && p.revealedHeroes[i]);
         });
         
         // 2. Đẩy bước Resolve cuối cùng vào stack (LIFO -> thực hiện sau cùng)
         dispatcher.state.reactionStack.push({
             type: 'EVENT_JUDGE_RESOLVE',
             payload: { targetId, reason, originalCardId: payload.cardId }
         });
         
         // 3. Nếu có ai có thể đổi phán xét, hỏi họ
         if (quanCoPlayers.length > 0) {
             dispatcher.state.waitingForResponse = {
                 type: 'ask_quan_co',
                 askQueue: quanCoPlayers,
                 targetId: targetId,
                 reason: reason
             };
             // Setup responder đầu tiên
             dispatcher.state.waitingForResponse.responderId = quanCoPlayers[0];
         }
         return true;
      }
      
      case 'EVENT_JUDGE_RESOLVE': {
         const { targetId, reason, originalCardId } = payload;
         const targetName = dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId));
         
         const judgeCard = dispatcher.state.currentJudgeCard;
         if (!judgeCard) return true; // Safety
         
         // Bỏ bài phán xét vào mộ
         dispatcher.state.discardPile.push(judgeCard);
         dispatcher.state.currentJudgeCard = null;
         
         if (reason === 'phat-toi') {
            const { sourceId } = payload;
            const target = dispatcher.state.players.find(p => p.id === targetId);
            const source = dispatcher.state.players.find(p => p.id === sourceId);
            dispatcher.addLog(`⚖️ [Phạt Tội] phán xét ra ${judgeCard.suit} ${judgeCard.rank} (${judgeCard.color})!`, 'important');
            
            if (judgeCard.suit === '♠') {
                dispatcher.addLog(`⚡ ${dispatcher.getHeroName(target)} nhận 2 sát thương Lôi vì [Phạt Tội]!`, 'damage');
                dispatcher.state.reactionStack.push({
                    type: 'EVENT_DAMAGE',
                    payload: { sourceId: sourceId, targetId: targetId, amount: 2, damageType: 'lightning' }
                });
            } else if (judgeCard.suit === '♣') {
                dispatcher.applyEffect(Effects.RecoverEffect(sourceId, 1));
                dispatcher.addLog(`💖 ${dispatcher.getHeroName(source)} hồi 1 HP và gây 1 sát thương Lôi cho ${dispatcher.getHeroName(target)}!`, 'heal');
                dispatcher.state.reactionStack.push({
                    type: 'EVENT_DAMAGE',
                    payload: { sourceId: sourceId, targetId: targetId, amount: 1, damageType: 'lightning' }
                });
            } else {
                dispatcher.addLog(`💨 Phán xét ${judgeCard.suit}! ${dispatcher.getHeroName(target)} bình an vô sự.`, 'normal');
            }
         }
         else if (reason === 'bat-quai') {
            if (judgeCard.suit === '♥' || judgeCard.suit === '♦') {
               dispatcher.addLog(`☯️ [Bát Quái] Phán xét Đỏ! Đỡ đòn thành công.`, 'important');
               const askDodgeEvent = dispatcher.state.reactionStack.findLast(e => e.type === 'EVENT_ASK_DODGE' && e.payload.targetId === targetId);
               if (askDodgeEvent) {
                  askDodgeEvent.payload.isCancelled = true;
               }
            } else {
               dispatcher.addLog(`☯️ [Bát Quái] Phán xét Đen. Phải tự đánh [Né].`, 'warning');
            }
         }
         else if (reason === 'sam-set') {
            const isSpade = judgeCard.suit === '♠';
            const isBetween2And9 = (judgeCard.rank >= 2 && judgeCard.rank <= 9);
            if (isSpade && isBetween2And9) {
               dispatcher.addLog(`⚡ [Sấm Sét] BÙMMMM! ${targetName} bị sét đánh!`, 'danger');
               dispatcher.state.reactionStack.push({
                  type: 'EVENT_DAMAGE',
                  payload: { sourceId: null, targetId, amount: 3, damageType: 'lightning' }
               });
            } else {
               dispatcher.addLog(`⚡ [Sấm Sét] Hụt! Chuyền Sấm Sét cho người bên cạnh.`, 'normal');
               const targetIndex = dispatcher.state.players.findIndex(p => p.id === targetId);
               let nextIndex = (targetIndex + 1) % dispatcher.state.players.length;
               while (!dispatcher.state.players[nextIndex].isAlive) {
                  nextIndex = (nextIndex + 1) % dispatcher.state.players.length;
               }
               const nextPlayerId = dispatcher.state.players[nextIndex].id;
               
               dispatcher.applyEffect(Effects.MoveCardEffect(originalCardId, 'discardPile', 'judgement', null, nextPlayerId, 'sam-set'));
            }
         }
         else if (reason === 'binh-luong') {
            if (judgeCard.suit === '♣' || judgeCard.suit === 'club') {
               console.log(`[Binh Lương] Lật ra Chuồn! Mưu kế thất bại, vẫn được rút bài.`);
            } else {
               console.log(`[Binh Lương] Trúng kế! Bị bỏ qua vòng Rút Bài (EVENT_PHASE_DRAW).`);
               dispatcher.applyEffect(Effects.SetFlagEffect(targetId, 'skipDrawPhase', true));
            }
         }
         else if (reason === 'hon-loan') {
            if (judgeCard.suit === '♥' || judgeCard.suit === 'heart') {
               console.log(`[Hỗn Loạn] Lật ra Cơ! Mưu kế thất bại, vẫn được ra bài.`);
            } else {
               console.log(`[Hỗn Loạn] Trúng kế! Bị bỏ qua vòng Ra Bài (EVENT_PHASE_PLAY).`);
               dispatcher.applyEffect(Effects.SetFlagEffect(targetId, 'skipActionPhase', true));
            }
         }

         dispatcher.state.discardPile.push(judgeCard);
         return true;
      }

      default:
         return false;
   }
}
