// ==========================================
// Phase Handler — Quản lý vòng lượt (Turn Phases)
// EVENT_TURN_START, EVENT_PHASE_*, EVENT_NEXT_TURN, EVENT_JUDGE
// ==========================================
import * as Effects from '../Effects';
import { HeroRegistry } from '../../registries/HeroRegistry';

export function handlePhaseEvent(dispatcher, event) {
   const { type, payload } = event;

   switch (type) {
      case 'EVENT_TURN_START': {
         const { playerId } = payload;
         const player = dispatcher.state.players.find(p => p.id === playerId);
         console.log(`\n=== BẮT ĐẦU LƯỢT CỦA ${playerId} ===`);
         dispatcher.addLog(`🔄 Bắt đầu lượt của ${dispatcher.getHeroName(player)}`);
         dispatcher.state.currentPlayerIndex = playerId;
         
         if (player.isFlipped) {
             player.isFlipped = false;
             dispatcher.addLog(`🔄 ${dispatcher.getHeroName(player)} bị lật mặt tướng, phải bỏ qua lượt và tự lật ngửa lại!`, 'danger');
             
             const hasChuongDuong = player.heroes?.some((h, i) => player.revealedHeroes && player.revealedHeroes[i] && h.skills?.some(s => s.id === 'chuong-duong'));
             if (hasChuongDuong) {
                 dispatcher.state.waitingForResponse = {
                     type: 'ask_chuong_duong_discard',
                     sourceId: player.id,
                     isSkippingTurn: true
                 };
             } else {
                 dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId: playerId } });
             }
         } else {
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_START', payload: { targetId: playerId } });
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_JUDGE', payload: { targetId: playerId } });
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_DRAW', payload: { targetId: playerId } });
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_PLAY', payload: { targetId: playerId } });
         }
         return true;
      }

      case 'EVENT_PHASE_JUDGE': {
         const { targetId } = payload;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         
         if (target && target.skipJudgePhase) {
             dispatcher.addLog(`🛑 Giai đoạn Phán Xét bị bỏ qua do hiệu ứng kỹ năng!`);
             dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'skipJudgePhase', false));
             return true;
         }

         if (target && target.judgementArea && target.judgementArea.length > 0) {
            while (target.judgementArea.length > 0) {
               const card = target.judgementArea.pop();
               dispatcher.state.discardPile.push(card);
               
               const reason = card.virtualName || card.name;
               dispatcher.state.reactionStack.push({
                  type: 'EVENT_JUDGE',
                  payload: { targetId, reason, cardId: card.id }
               });
            }
         }
         return true;
      }

      case 'EVENT_PHASE_START': {
         dispatcher.state.currentPhase = 'start';
         dispatcher.triggerHooks('TURN_BEGIN', payload);
         return true;
      }

      case 'EVENT_PHASE_DRAW': {
         const { targetId, isCancelled } = payload;
         dispatcher.state.currentPhase = 'draw';
         
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target && target.skipDrawPhase) {
             dispatcher.addLog(`🛑 Giai đoạn Rút Bài bị bỏ qua do hiệu ứng kỹ năng!`);
             dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'skipDrawPhase', false));
             return true;
         }

         if (isCancelled) {
            dispatcher.addLog(`🛑 Giai đoạn Rút Bài bị bỏ qua do Binh Lương!`);
            return true;
         }
         dispatcher.state.waitingForResponse = { type: 'draw_phase', responderId: targetId, targetId };
         dispatcher.triggerHooks('DRAW_PHASE', payload);
         return true;
      }
      
      case 'EVENT_APPLY_DRAW': {
         const { targetId, isCancelled, drawnCards = 2 } = payload;
         if (!isCancelled) {
            dispatcher.applyEffect(Effects.DrawCardEffect(targetId, drawnCards));
            const player = dispatcher.state.players.find(p => p.id === targetId);
            dispatcher.addLog(`🃏 ${dispatcher.getHeroName(player)} rút ${drawnCards} lá bài từ bộ bài.`);
         }
         return true;
      }

      case 'EVENT_PHASE_PLAY': {
         const { targetId, isCancelled } = payload;
         dispatcher.state.currentPhase = 'action';
         
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target && target.skipActionPhase) {
             dispatcher.addLog(`🛑 Giai đoạn Ra Bài bị bỏ qua do hiệu ứng kỹ năng!`);
             dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'skipActionPhase', false));
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_DISCARD', payload: { targetId } });
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId } });
             return true; // Skip directly to discard
         }

         if (isCancelled) {
             dispatcher.addLog(`🌀 Giai đoạn Ra Bài bị bỏ qua do Hỗn Loạn!`);
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_DISCARD', payload: { targetId } });
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId } });
             return true;
         }

         dispatcher.state.waitingForResponse = { type: 'play_phase', responderId: targetId, targetId };
         return true;
      }

      case 'EVENT_PHASE_DISCARD': {
         const { targetId } = payload;
         dispatcher.state.currentPhase = 'discard';
         const target = dispatcher.state.players.find(p => p.id === targetId);
         
         if (target && target.skipDiscardPhase) {
             dispatcher.addLog(`🛑 Giai đoạn Bỏ Bài bị bỏ qua do hiệu ứng kỹ năng!`);
             dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'skipDiscardPhase', false));
             return true;
         }

         if (target) {
            const discardCount = target.hand.length - target.hp;
            if (discardCount > 0) {
               dispatcher.state.waitingForResponse = { type: 'discard_phase', responderId: targetId, targetId, amount: discardCount };
            }
         }
         return true;
      }

      case 'EVENT_PHASE_END': {
         dispatcher.state.currentPhase = 'end';
         dispatcher.state.reactionStack.push({ type: 'EVENT_NEXT_TURN' });
         dispatcher.triggerHooks('END_PHASE', payload);
         return true;
      }

      case 'EVENT_NEXT_TURN': {
         const currentIdx = dispatcher.state.currentPlayerIndex;
         const currentPlayerId = dispatcher.state.players[currentIdx].id;
         dispatcher.applyEffect(Effects.ResetTurnFlagsEffect(currentPlayerId));
         
         let nextIdx = (currentIdx + 1) % dispatcher.state.players.length;
         while (!dispatcher.state.players[nextIdx].isAlive) {
            nextIdx = (nextIdx + 1) % dispatcher.state.players.length;
         }
         dispatcher.state.reactionStack.push({
            type: 'EVENT_TURN_START',
            payload: { playerId: dispatcher.state.players[nextIdx].id }
         });
         return true;
      }

      case 'EVENT_JUDGE': {
         // Keep in Dispatcher for now — complex judge logic
         return false; // Falls through to Dispatcher
      }

      default:
         return false; // Not handled
   }
}
