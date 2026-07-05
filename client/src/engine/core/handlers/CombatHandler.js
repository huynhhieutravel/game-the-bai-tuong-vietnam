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
         
         dispatcher.state.reactionStack.push({
             type: 'EVENT_APPLY_DAMAGE',
             payload: payload
         });
         
         dispatcher.triggerHooks('ON_DAMAGE_CALC', payload);
         return true;
      }

      case 'EVENT_APPLY_DAMAGE': {
         const { sourceId, targetId, amount, damageType, isCancelled } = payload;
         if (isCancelled) return true;

         dispatcher.applyEffect(Effects.DamageEffect(sourceId, targetId, amount, damageType));

         dispatcher.triggerHooks('POST_DAMAGE', payload);

         const p = dispatcher.state.players.find(x => x.id === targetId);
         const source = dispatcher.state.players.find(x => x.id === sourceId);
         dispatcher.addLog(`💥 ${dispatcher.getHeroName(p)} mất ${amount} Sinh Lực${source ? ` do bị ${dispatcher.getHeroName(source)} sát thương` : ''}.`);
            
         const target = dispatcher.state.players.find(p => p.id === targetId);
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
         
         dispatcher.triggerHooks('ON_TARGETED_SLASH', payload);
         return true;
      }

      case 'EVENT_DO_ASK_DODGE': {
         const { sourceId, targetId, unavoidable, reason, reqDodges } = payload;
         if (payload.isCancelled) return true;
         
         if (unavoidable) {
             return true; // Bỏ qua đòi Né
         }
         
         dispatcher.state.waitingForResponse = { type: 'ask_dodge', responderId: targetId, targetId, sourceId, reason, reqDodges };
         dispatcher.triggerHooks('ON_ASK_DODGE', payload);
         return true;
      }

      case 'EVENT_ASK_SLASH': {
         if (payload.isCancelled) return true;
         dispatcher.triggerHooks('ON_ASK_SLASH', payload);
         
         const { targetId, sourceId, reason, isMuonDao, borrowerId, sourceCardId, reqSlashes } = payload;
         const responderId = isMuonDao ? sourceId : targetId;
         dispatcher.state.waitingForResponse = { type: 'ask_slash', responderId, targetId, sourceId, reason, isMuonDao, borrowerId, sourceCardId, reqSlashes };
         return true;
      }

      case 'EVENT_DYING': {
         const target = dispatcher.state.players.find(p => p.id === payload.targetId);
         if (!target || target.hp > 0) return true;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_DO_DYING',
            payload: payload
         });

         dispatcher.triggerHooks('DYING', payload);
         return true;
      }
      
      case 'EVENT_DO_DYING': {
         const target = dispatcher.state.players.find(p => p.id === payload.targetId);
         if (!target || target.hp > 0) return true;

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
            
            const sameFactionRevealed = getFactionCount(target.faction, dispatcher.state.players);
            
            if (sameFactionRevealed + 1 > Math.floor(dispatcher.state.players.length / 2)) {
                target.isDaTam = true;
            }

            target.isAlive = false;
            dispatcher.addLog(`💀 Người chơi ${dispatcher.getHeroName(target)} ĐÃ TỬ TRẬN!`, 'important');

            dispatcher.state.discardPile.push(...(target.hand || []), ...(target.equipment || []), ...(target.judgementArea || []));
            target.hand = [];
            target.equipment = [];
            target.judgementArea = [];

            if (sourceId !== undefined && sourceId !== target.id && sourceId !== null) {
                const killer = dispatcher.state.players.find(p => p.id === sourceId);
                if (killer && killer.isAlive) {
                    const targetFaction = getPlayerFaction(target);
                    const killerFaction = getPlayerFaction(killer);
                    
                    const isSameFaction = !killer.isDaTam && !target.isDaTam && (killerFaction === targetFaction);
                    
                    if (isSameFaction) {
                        dispatcher.state.discardPile.push(...killer.hand, ...killer.equipment);
                        killer.hand = [];
                        killer.equipment = [];
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
            
            const alivePlayers = dispatcher.state.players.filter(p => p.isAlive);
            if (alivePlayers.length === 1) {
                dispatcher.state.isGameOver = true;
                dispatcher.state.winner = alivePlayers[0];
                const winMsg = alivePlayers[0].isDaTam 
                  ? `🏆 🐺 DÃ TÂM ${dispatcher.getHeroName(alivePlayers[0])} ĐÃ ĐỘC CHIẾM THIÊN HẠ!` 
                  : `🏆 ${dispatcher.getHeroName(alivePlayers[0])} ĐÃ CHIẾN THẮNG!`;
                dispatcher.addLog(winMsg, 'important');
            } else if (alivePlayers.length > 0) {
                const firstFaction = getPlayerFaction(alivePlayers[0]);
                const allSameFaction = alivePlayers.every(p => getPlayerFaction(p) === firstFaction);
                const hasRevealedDaTam = alivePlayers.some(p => p.isDaTam);
                const wouldHaveDaTam = alivePlayers.length > dispatcher.state.players.length / 2;

                if (allSameFaction && !hasRevealedDaTam && !wouldHaveDaTam) {
                    dispatcher.state.isGameOver = true;
                    dispatcher.state.winner = alivePlayers[0];
                    const winnersNames = alivePlayers.map(p => dispatcher.getHeroName(p)).join(', ');
                    dispatcher.addLog(`🏆 Phe ${firstFaction.toUpperCase()} (${winnersNames}) ĐÃ CHIẾN THẮNG!`, 'important');
                }
            }
         }
         return true;
      }

      case 'EVENT_DUEL': {
         if (payload.isCancelled) return true;
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
