// @ts-check
/**
 * @typedef {import('../../types/GameState').GameState} GameState
 * @typedef {import('../../types/PlayerState').PlayerState} PlayerState
 * @typedef {import('../../types/Action').ClientAction} ClientAction
 * @typedef {import('../../types/Event').EngineEvent} EngineEvent
 * @typedef {import('../../types/Card').CardDefinition} CardDefinition
 * @typedef {import('../../types/Hero').Hero} Hero
 */
// ==========================================
// Combat Handler — Chiến đấu (Damage, Dodge, Dying, Death, Duel)
// ==========================================
import * as Effects from '../Effects';
import { HeroRegistry } from '../../registries/HeroRegistry';
import { getFactionCount, getPlayerFaction } from '../../gameState';

export function handleCombatEvent(dispatcher, event) {
   const { type, payload } = event;

   switch (type) {
      case 'EVENT_DAMAGE': {
         const { sourceId, targetId, amount, damageType, isCancelled } = payload;
         if (isCancelled) return true;
         
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         
         dispatcher.state.reactionStack.push({
             type: 'EVENT_APPLY_DAMAGE',
             payload: payload
         });
         
         dispatcher.triggerHooks('ON_DAMAGE_CALC', payload);
         return true;
      }

      case 'EVENT_APPLY_DAMAGE': {
         const { sourceId, targetId, amount, damageType, isCancelled, isChainedDamage } = payload;
         if (isCancelled) return true;

         const targetPre = dispatcher.state.players.find(p => p.id === targetId);
         if (!targetPre || !targetPre.isAlive) return true;

         dispatcher.applyEffect(Effects.DamageEffect(sourceId, targetId, amount, damageType));

         // 2. Kiểm tra Chain
         if (targetPre.isChained && (damageType === 'fire' || damageType === 'lightning')) {
             dispatcher.applyEffect(Effects.ToggleChainEffect(targetId, false));
             dispatcher.addLog(`⛓️ ${dispatcher.getHeroName(targetPre)} bị đứt Xiềng Xích${!isChainedDamage ? ' và truyền sát thương' : ''}!`, 'important');
             
             if (!isChainedDamage) {
                 const chainedPlayers = dispatcher.state.players.filter(p => p.id !== targetId && p.isAlive && p.isChained);
                 // Đẩy DamageEvent vào cho các người khác (isChainedDamage: true để tránh lặp)
                 for (const p of chainedPlayers) {
                     dispatcher.state.reactionStack.push({
                         type: 'EVENT_DAMAGE',
                         payload: { sourceId: sourceId, targetId: p.id, amount: amount, damageType: damageType, isChainedDamage: true }
                     });
                 }
             }
         }

         dispatcher.triggerHooks('POST_DAMAGE', payload);

         const p = dispatcher.state.players.find(x => x.id === targetId);
         const source = dispatcher.state.players.find(x => x.id === sourceId);
         dispatcher.addLog(`💥 ${dispatcher.getHeroName(p)} mất ${amount} Sinh Lực${source ? ` do bị ${dispatcher.getHeroName(source)} sát thương` : ''}.`);
            
         const target = dispatcher.state.players.find(x => x.id === targetId);
         if (target && target.hp <= 0) {
            dispatcher.state.reactionStack.push({
               type: 'EVENT_DYING',
               payload: { targetId: target.id, sourceId: sourceId }
            });
         }
         return true;
      }

      case 'EVENT_ASK_DODGE': {
         dispatcher.state.reactionStack.push({
             type: 'EVENT_DO_ASK_DODGE',
             payload: payload
         });
         return true;
      }

      case 'EVENT_DO_ASK_DODGE': {
         console.log("EVENT_DO_ASK_DODGE payload:", payload);
         const { sourceId, targetId, unavoidable, reason, reqDodges } = payload;
         if (payload.isCancelled) return true;
         
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (!target || !target.isAlive) return true;
         
         if (unavoidable) {
             // Đã có sẵn EVENT_DAMAGE trên reactionStack do CardRegistry.js push, không cần push thêm!
             return true; // Bỏ qua đòi Né
         }
         
         dispatcher.state.waitingForResponse = { type: 'ask_dodge', responderId: targetId, targetId, sourceId, reason, reqDodges, baguaAvailable: payload.baguaAvailable };
         dispatcher.triggerHooks('ON_ASK_DODGE', payload);
         return true;
      }

      case 'EVENT_ASK_SLASH': {
         if (payload.isCancelled) return true;
         
         const { targetId, sourceId, reason, isMuonDao, borrowerId, sourceCardId, reqSlashes } = payload;
         const responderId = isMuonDao ? sourceId : targetId;
         
         const responder = dispatcher.state.players.find(p => p.id === responderId);
         if (!responder || !responder.isAlive) return true;

         dispatcher.triggerHooks('ON_ASK_SLASH', payload);
         
         dispatcher.state.waitingForResponse = { type: 'ask_slash', responderId, targetId, sourceId, reason, isMuonDao, borrowerId, sourceCardId, reqSlashes };
         return true;
      }

      case 'EVENT_DYING': {
         const target = dispatcher.state.players.find(p => p.id === payload.targetId);
         if (!target || !target.isAlive || target.hp > 0) return true;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_DO_DYING',
            payload: payload
         });

         dispatcher.triggerHooks('DYING', payload);
         return true;
      }
      
      case 'EVENT_DO_DYING': {
         const target = dispatcher.state.players.find(p => p.id === payload.targetId);
         if (!target || !target.isAlive || target.hp > 0) return true;

         // Chờ xem có ai cứu không. Nếu không ai cứu (askQueue rỗng) thì EVENT_ACTION_REACT sẽ xử lý.
         const aliveIds = dispatcher.state.players.filter(p => p.isAlive).map(p => p.id);
         const askQueue = dispatcher.getOrderedTargets(target.id, aliveIds);

         dispatcher.state.waitingForResponse = { 
             type: 'ask_peach', 
             responderId: askQueue[0],
             dyingId: target.id, 
             targetId: askQueue[0],
             sourceId: payload.sourceId,
             askQueue 
         };
         return true;
      }

      case 'EVENT_DEATH': {
         const { targetId, sourceId } = payload;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target && target.hp <= 0) {
            target.revealedHeroes = [true, true];
            target.isRevealed = true;
            target.faction = HeroRegistry[target.mainHeroId]?.faction || 'Quần';
            
            const sameFactionRevealed = getFactionCount(target.faction, dispatcher.state.players, true);
            
            if (sameFactionRevealed > Math.floor(dispatcher.state.players.length / 2)) {
                target.isDaTam = true;
            }

            target.isAlive = false;
            dispatcher.addLog(`💀 Người chơi ${dispatcher.getHeroName(target)} ĐÃ TỬ TRẬN!`, 'important');

            // 1. Rớt bài của người chết
            const targetCards = [...(target.hand || []), ...(target.equipment || []), ...(target.judgementArea || [])];
            for (const card of targetCards) {
                let fromZone = 'hand';
                if (target.equipment && target.equipment.some(c => c.id === card.id)) fromZone = 'equipment';
                else if (target.judgementArea && target.judgementArea.some(c => c.id === card.id)) fromZone = 'judgementArea';
                dispatcher.applyEffect(Effects.MoveCardEffect(card.id, fromZone, 'discardPile', target.id, null));
            }

            if (sourceId !== undefined && sourceId !== target.id && sourceId !== null) {
                const killer = dispatcher.state.players.find(p => p.id === sourceId);
                if (killer && killer.isAlive) {
                    const targetFaction = getPlayerFaction(target);
                    const killerFaction = getPlayerFaction(killer);
                    
                    const isSameFaction = !killer.isDaTam && !target.isDaTam && (killerFaction === targetFaction);
                    
                    if (isSameFaction) {
                        // Phạt lột toàn bộ bài của Kẻ sát nhân bằng MoveCardEffect để kích hoạt hook ON_UNEQUIP
                        const killerCards = [...(killer.hand || []), ...(killer.equipment || [])];
                        for (const card of killerCards) {
                            let fromZone = 'hand';
                            if (killer.equipment && killer.equipment.some(c => c.id === card.id)) fromZone = 'equipment';
                            dispatcher.applyEffect(Effects.MoveCardEffect(card.id, fromZone, 'discardPile', killer.id, null));
                        }
                        dispatcher.addLog(`⚠️ ÁC MỘNG! ${dispatcher.getHeroName(killer)} đã giết đồng minh cùng phe ${targetFaction.toUpperCase()}! Bị phạt vứt toàn bộ bài!`, 'danger');
                    } else {
                        let revealedAlliesOfDead = 0;
                        if (!target.isDaTam) {
                            revealedAlliesOfDead = getFactionCount(targetFaction, dispatcher.state.players);
                        }
                        const rewardCount = revealedAlliesOfDead + 1;
                        console.log('DEBUG REWARD COUNT:', rewardCount);
                        dispatcher.applyEffect(Effects.DrawCardEffect(killer.id, rewardCount));
                        dispatcher.addLog(`🎁 LẬP CÔNG! ${dispatcher.getHeroName(killer)} giết kẻ địch! Thưởng rút ${rewardCount} lá bài!`, 'important');
                    }
                }
            }
            // 3. Kiểm tra chiến thắng
            dispatcher.checkVictory();
         }
         return true;
      }

      case 'EVENT_DUEL': {
         if (payload.isCancelled) return true;
         
         if (!payload.targetedHookFired) {
             payload.targetedHookFired = true;
             dispatcher.state.reactionStack.push(event); // Re-push EVENT_DUEL
             dispatcher.triggerHooks('ON_TARGETED_DUEL', payload);
             return true;
         }

         const { sourceId, targetId, currentTargetId } = payload;
         const currentDefenderId = currentTargetId ?? targetId;
         const currentAttackerId = currentDefenderId === targetId ? sourceId : targetId;
         
         dispatcher.state.reactionStack.push({
            type: 'EVENT_DUEL_RESOLVE',
            payload: { sourceId, targetId, currentTargetId: currentDefenderId }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_SLASH',
            payload: { sourceId: currentAttackerId, targetId: currentDefenderId, reason: 'quyet-dau' }
         });
         return true;
      }

      case 'EVENT_DUEL_RESOLVE': {
         const { sourceId, targetId, currentTargetId, slashReacted } = payload;
         const currentAttackerId = currentTargetId === targetId ? sourceId : targetId;
         const currentDefender = dispatcher.state.players.find(p => p.id === currentTargetId);

         if (slashReacted) {
            dispatcher.addLog(`⚔️ ${dispatcher.getHeroName(currentDefender)} đã đánh trả [Quyết Đấu] bằng 1 lá [Chém]!`);
            dispatcher.state.reactionStack.push({
               type: 'EVENT_DUEL',
               payload: { sourceId, targetId, currentTargetId: currentAttackerId }
            });
         } else {
            const currentAttacker = dispatcher.state.players.find(p => p.id === currentAttackerId);
            dispatcher.addLog(`💀 ${dispatcher.getHeroName(currentDefender)} không thể đánh [Chém] và thua [Quyết Đấu] từ ${dispatcher.getHeroName(currentAttacker)}!`);
            dispatcher.state.reactionStack.push({
                type: 'EVENT_DAMAGE',
                payload: { sourceId: currentAttackerId, targetId: currentTargetId, amount: 1, damageType: 'normal' }
            });
         }
         return true;
      }

      default:
         return false;
   }
}
