// ==========================================
// Trick Handler — Cẩm nang & Trick Events
// EVENT_DISMANTLE, EVENT_SNATCH, EVENT_HOA_CONG, EVENT_DRAW_CARDS,
// EVENT_CHAIN, EVENT_ASK_TRE_NGA_DISCARD, EVENT_JUDGE, EVENT_ASK_NEGATE,
// EVENT_TRIGGER_SKILL_ASK, EVENT_HEAL
// ==========================================
import * as Effects from '../Effects';
import { HeroRegistry } from '../../registries/HeroRegistry';
import { hasSkill } from '../../gameState.js';
import { CARD_SUITS } from '../../../constants/cardTypes.js';

export function handleTrickEvent(dispatcher, event) {
   const { type, payload } = event;

   switch (type) {
      case 'EVENT_DISMANTLE': {
         const { sourceId, targetId, sourceCardId, isCancelled } = payload;
         if (isCancelled) return true;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         dispatcher.state.waitingForResponse = { type: 'ask_dismantle', responderId: sourceId, sourceId, targetId, sourceCardId };
         return true;
      }

      case 'EVENT_SNATCH': {
         const { sourceId, targetId, sourceCardId, isCancelled } = payload;
         if (isCancelled) return true;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         dispatcher.state.waitingForResponse = { type: 'ask_snatch', responderId: sourceId, sourceId, targetId, sourceCardId };
         return true;
      }

      case 'EVENT_HOA_CONG': {
         const { sourceId, targetId, sourceCardId, isCancelled } = payload;
         if (isCancelled) return true;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         dispatcher.state.waitingForResponse = { type: 'ask_hoacong_reveal', responderId: targetId, sourceId, targetId, sourceCardId };
         return true;
      }

      case 'EVENT_DRAW_CARDS': {
         const { targetId, amount, isCancelled } = payload;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (isCancelled || !target || !target.isAlive) return true;
         
         dispatcher.applyEffect(Effects.DrawCardEffect(targetId, amount));
         dispatcher.addLog(`📜 ${dispatcher.getHeroName(target)} rút thêm ${amount} lá bài!`);
         return true;
      }

      case 'EVENT_HEAL': {
         const { targetId, amount, isCancelled } = payload;
         if (isCancelled) return true;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         dispatcher.applyEffect(Effects.RecoverEffect(targetId, amount));
         return true;
      }

      case 'EVENT_CHAIN': {
         const { targetId, isCancelled } = payload;
         if (isCancelled) return true;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         
         target.isChained = !target.isChained;
         dispatcher.addLog(`🔗 ${dispatcher.getHeroName(target)} đã bị ${target.isChained ? 'Khóa' : 'Mở Khóa'} Xiềng Xích!`);
         return true;
      }

      case 'EVENT_ASK_TRE_NGA_DISCARD': {
         const { sourceId, targetId, dodgeEventPayload, judgeSuit, isCancelled } = payload;
         if (isCancelled) return true;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         dispatcher.state.waitingForResponse = { type: 'ask_tre_nga_discard', responderId: targetId, targetId: targetId, sourceId: sourceId, judgeSuit, dodgeEventPayload };
         return true;
      }

      case 'EVENT_TRIGGER_SKILL_ASK': {
          const request = payload.request;
          if (request.responderId === undefined || request.responderId === null) {
             request.responderId = (request.askQueue && request.askQueue[0]) ?? request.targetId ?? request.sourceId;
          }
          const responder = dispatcher.state.players.find(p => p.id === request.responderId);
          if (responder && !responder.isAlive) return true;
          
          if (request.sourceId) {
              const source = dispatcher.state.players.find(p => p.id === request.sourceId);
              if (source && !source.isAlive) return true;
          }
          
          dispatcher.state.waitingForResponse = request;
         return true;
      }

      case 'EVENT_JUDGE': {
         const { targetId, reason, isCancelled } = payload;
         
         if (isCancelled) return true;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         
         const judgeCard = dispatcher.state.deck.length > 0 ? dispatcher.state.deck.pop() : { id: 'fake-judge', name: 'Phán Xét', type: 'basic', suit: 'spade', rank: 2, color: 'black' }; 
         console.log('[DEBUG_TRICK] EVENT_JUDGE popped:', judgeCard?.name);
         dispatcher.state.currentJudgeCard = judgeCard;
         
         const targetName = dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId));
         dispatcher.addLog(`⚖️ Phán Xét [${reason}]: ${targetName} lật ra lá ${judgeCard.suit} ${judgeCard.rank}`, 'info');
         
         // 1. Tạo hàng đợi những người có skill Quân Cơ (sau này có thể thêm Quỷ Tài)
         const aliveIds = dispatcher.state.players.filter(p => p.isAlive).map(p => p.id);
         const orderedIds = dispatcher.getOrderedTargets(targetId, aliveIds);
         
         const judgePlayers = orderedIds.filter(id => {
             const p = dispatcher.state.players.find(x => x.id === id);
             if (p.isSkillsSuppressed) return false;
             return hasSkill(p, 'quan-co') || hasSkill(p, 'ung-bien');
         });
         
         // 2. Đẩy bước Resolve cuối cùng vào stack (LIFO -> thực hiện sau cùng)
         dispatcher.state.reactionStack.push({
             type: 'EVENT_JUDGE_RESOLVE',
             payload: { ...payload, originalCardId: payload.cardId }
         });
         
         // 3. Nếu có ai có thể đổi phán xét, hỏi họ
         if (judgePlayers.length > 0) {
             const skills = [];
             const firstPlayer = dispatcher.state.players.find(p => p.id === judgePlayers[0]);
             if (hasSkill(firstPlayer, 'quan-co')) skills.push('quan-co');
             if (hasSkill(firstPlayer, 'ung-bien')) skills.push('ung-bien');

             dispatcher.state.waitingForResponse = {
                 type: 'ask_change_judge',
                 askQueue: judgePlayers,
                 skills: skills,
                 targetId: targetId,
                 reason: reason
             };
             // Setup responder đầu tiên
             dispatcher.state.waitingForResponse.responderId = judgePlayers[0];
         }
         return true;
      }
      
      case 'EVENT_JUDGE_RESOLVE': {
         const { targetId, reason, originalCardId } = payload;
         console.log('[DEBUG_TRICK] EVENT_JUDGE_RESOLVE reason:', reason, 'targetId:', targetId);
         const targetName = dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId));
         
         const judgeCard = dispatcher.state.currentJudgeCard;
         if (!judgeCard) return true; // Safety
         
         if (reason === 'that-tram-so') {
            const { sourceId, damageSourceId } = event.payload;
            const chuVanAn = dispatcher.state.players.find(p => p.id === sourceId);
            const target = dispatcher.state.players.find(p => p.id === damageSourceId);
            dispatcher.addLog(`⚖️ [Thất Trảm Sớ] phán xét ra ${judgeCard.suit} ${judgeCard.rank} (${judgeCard.color})!`, 'important');
            
            if (judgeCard.suit !== 'heart') { // Not heart
                dispatcher.addLog(`🔥 Phán xét không phải Cơ! ${dispatcher.getHeroName(target)} phải chọn chịu phạt!`, 'danger');
                dispatcher.state.reactionStack.push({
                    type: 'EVENT_TRIGGER_SKILL_ASK',
                    payload: { request: { type: 'ask_that_tram_so_punish', sourceId: chuVanAn.id, targetId: target.id, responderId: target.id, skillId: 'that-tram-so' }}
                });
            } else {
                dispatcher.addLog(`💨 Phán xét là Cơ! [Thất Trảm Sớ] thất bại, ${dispatcher.getHeroName(target)} bình an vô sự.`, 'normal');
            }
         }
         else if (reason === 'phat-toi') {
            const { sourceId } = event.payload;
            const target = dispatcher.state.players.find(p => p.id === targetId);
            const source = dispatcher.state.players.find(p => p.id === sourceId);
            dispatcher.addLog(`⚖️ [Phạt Tội] phán xét ra ${judgeCard.suit} ${judgeCard.rank} (${judgeCard.color})!`, 'important');
            
            if (judgeCard.suit === CARD_SUITS.SPADE) {
                dispatcher.addLog(`⚡ ${dispatcher.getHeroName(target)} nhận 2 sát thương Lôi vì [Phạt Tội]!`, 'damage');
                dispatcher.state.reactionStack.push({
                    type: 'EVENT_DAMAGE',
                    payload: { sourceId: sourceId, targetId: targetId, amount: 2, damageType: 'lightning' }
                });
            } else if (judgeCard.suit === CARD_SUITS.CLUB) {
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
            const { originalReq } = payload;
            
            // Check for Thần Giáp
            const player = dispatcher.state.players.find(p => p.id === targetId);
            const hasThanGiap = player && [HeroRegistry[player.mainHeroId], HeroRegistry[player.subHeroId]].some((h, i) => h && player.revealedHeroes[i] && h.skills?.some(s => s.id === 'than-giap'));
            const sourceName = hasThanGiap && !player.equipment.some(e => e.name === 'Bát Quái' || e.name === 'Hắc Thuẫn') ? 'Thần Giáp' : 'Bát Quái';

            if (judgeCard.suit === CARD_SUITS.HEART || judgeCard.suit === CARD_SUITS.DIAMOND) {
               dispatcher.addLog(`☯️ [${sourceName}] Phán xét Đỏ! Đỡ đòn thành công.`, 'important');
               
               // Hủy EVENT_ASK_DODGE hoặc giảm số lượng Né cần thiết
               const askDodgeEvent = dispatcher.state.reactionStack.findLast(e => e.type === 'EVENT_ASK_DODGE' && e.payload.targetId === targetId);
               console.log('[DEBUG_BAT_QUAI] Found EVENT_ASK_DODGE?', !!askDodgeEvent, 'Target ID:', targetId);
               
               if (askDodgeEvent) {
                   console.log('[DEBUG_BAT_QUAI] askDodgeEvent.payload:', askDodgeEvent.payload);
                   if (askDodgeEvent.payload.reqDodges > 1) {
                       askDodgeEvent.payload.reqDodges -= 1;
                       console.log('[DEBUG_BAT_QUAI] reqDodges after:', askDodgeEvent.payload.reqDodges);
                       dispatcher.addLog(`☯️ [${sourceName}] đỡ được 1 đòn, nhưng vẫn cần thêm ${askDodgeEvent.payload.reqDodges} [Né]!`, 'warning');
                   } else {
                       askDodgeEvent.payload.isCancelled = true;
                       
                       // Hủy sát thương gốc
                       const dmgEvent = dispatcher.state.reactionStack.findLast(e => e.type === 'EVENT_DAMAGE' && e.payload.targetId === targetId);
                       console.log('[DEBUG_BAT_QUAI] Found EVENT_DAMAGE?', !!dmgEvent, 'Target ID:', targetId);
                       if (dmgEvent) dmgEvent.payload.isCancelled = true;
                       
                       // Báo hook ON_DODGE (cho Thanh Long Đao, Trượng Bát Xà Mâu...)
                       const sourceId = dmgEvent ? dmgEvent.payload.sourceId : null;
                       const dodgeReason = askDodgeEvent.payload.reason;
                       dispatcher.triggerHooks('ON_DODGE', { sourceId: targetId, attackerId: sourceId, reason: dodgeReason });
                   }
               }
               
            } else {
               dispatcher.addLog(`☯️ [${sourceName}] Phán xét Đen. Phải tự đánh [Né].`, 'warning');
            }
         }
         else if (reason === 'sam-set') {
            const isSpade = judgeCard.suit === CARD_SUITS.SPADE;
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
            if (judgeCard.suit === CARD_SUITS.CLUB) {
               dispatcher.addLog(`⚖️ [Binh Lương] Lật ra Chuồn! Mưu kế thất bại, vẫn được rút bài.`, 'success');
            } else {
               dispatcher.addLog(`⚖️ [Binh Lương] Trúng kế! Bị bỏ qua vòng Rút Bài.`, 'danger');
               dispatcher.applyEffect(Effects.SetFlagEffect(targetId, 'skipDrawPhase', true));
            }
         }
         else if (reason === 'hon-loan') {
            if (judgeCard.suit === CARD_SUITS.HEART) {
               dispatcher.addLog(`⚖️ [Hỗn Loạn] Lật ra Cơ! Mưu kế thất bại, vẫn được ra bài.`, 'success');
            } else {
               dispatcher.addLog(`⚖️ [Hỗn Loạn] Trúng kế! Bị bỏ qua vòng Ra Bài.`, 'danger');
               dispatcher.applyEffect(Effects.SetFlagEffect(targetId, 'skipActionPhase', true));
             }
          }
          else if (reason === 'pha-thanh') {
              const { sourceId } = event.payload;
              const source = dispatcher.state.players.find(p => p.id === sourceId);
              dispatcher.state.currentJudgeCard = null;
              source.hand.push(judgeCard);
              dispatcher.addLog(`🏰 ${dispatcher.getHeroName(source)} thu lá phán xét [${judgeCard.suit} ${judgeCard.rank}] về tay.`, 'important');
              dispatcher.applyEffect(Effects.SetFlagEffect(payload.sourceId, 'phaThanhColor', judgeCard.color));
              return true; // Lá bài không vào discardPile
          }

         const reaction = dispatcher.triggerHooks('AFTER_JUDGEMENT', { targetId, reason, originalCardId, judgeCard });
         console.log('[DEBUG_TRICK] reaction:', reaction);
         if (reaction) {
            return true;
         }

         dispatcher.state.discardPile.push(judgeCard);
         dispatcher.state.currentJudgeCard = null;
         return true;
      }

      default:
         return false;
   }
}
