// ==========================================
// Phase Handler — Quản lý vòng lượt (Turn Phases)
// EVENT_TURN_START, EVENT_PHASE_*, EVENT_NEXT_TURN, EVENT_JUDGE
// ==========================================
import { PHASES } from '../../../data/gameData';
import { hasSkill, getHandLimit } from '../../gameState.js';
import { HeroRegistry } from '../../registries/HeroRegistry';
import * as Effects from '../Effects';

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
             
             const hasChuongDuong = hasSkill(player, 'chuong-duong');
             if (hasChuongDuong) {
                 dispatcher.state.waitingForResponse = {
                     type: 'ask_chuong_duong_discard',
                     sourceId: player.id,
                     isSkippingTurn: true,
                     skillId: 'chuong-duong'
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
         
         if (target && !target.isAlive) return true;

         if (target && target.skipJudgePhase) {
             dispatcher.addLog(`🛑 Giai đoạn Phán Xét bị bỏ qua do hiệu ứng kỹ năng!`);
             dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'skipJudgePhase', false));
             return true;
         }

         if (target && target.judgementArea && target.judgementArea.length > 0) {
            while (target.judgementArea.length > 0) {
               const card = target.judgementArea.shift(); // Dùng shift để cái mới đánh vào (cuối mảng) sẽ được push cuối cùng (để nổ đầu tiên)
               const reason = card.virtualName || card.name;
               delete card.virtualName;
               dispatcher.state.discardPile.push(card);
               dispatcher.state.reactionStack.push({
                  type: 'EVENT_JUDGE',
                  payload: { targetId, reason, cardId: card.id, sourceCardId: card.id }
               });
               dispatcher.state.reactionStack.push({
                  type: 'EVENT_ASK_NEGATE',
                  payload: { sourceId: null, targetId: targetId, trickType: reason, sourceCardId: card.id }
               });
            }
         }
         return true;
      }

      case 'EVENT_PHASE_START': {
         const { targetId } = event.payload;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target && !target.isAlive) return true;
         
         dispatcher.state.currentPhase = 'start';
         dispatcher.triggerHooks('TURN_BEGIN', payload);
         return true;
      }

      case 'EVENT_PHASE_DRAW': {
         const { targetId, isCancelled } = payload;
         
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target && !target.isAlive) return true;
         
         dispatcher.state.currentPhase = 'draw';
         
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
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target && !target.isAlive) return true;
         
         if (!isCancelled) {
            dispatcher.applyEffect(Effects.DrawCardEffect(targetId, drawnCards));
            const player = dispatcher.state.players.find(p => p.id === targetId);
            dispatcher.addLog(`🃏 ${dispatcher.getHeroName(player)} rút ${drawnCards} lá bài từ bộ bài.`);
         }
         return true;
      }

      case 'EVENT_ACTION_END_PHASE': {
         const playerId = payload.playerId ?? payload.targetId;
         const p = dispatcher.state.players.find(x => x.id === playerId);
         console.log(`[DEBUG EVENT_ACTION_END_PHASE] playerId=${playerId}, p.isAlive=${p?.isAlive}, waitingForResponse=${dispatcher.state.waitingForResponse?.type}`);
         if (!p) return true;
         
         if (p.isAlive) {
             // CHỈ cho phép kết thúc lượt nếu đang ở play_phase và đúng là người chơi đó đang giữ quyền
             if (!dispatcher.state.waitingForResponse || dispatcher.state.waitingForResponse.type !== 'play_phase' || dispatcher.state.waitingForResponse.targetId !== playerId) {
                return true; // Phớt lờ nếu không hợp lệ
             }
         }

         // Xóa trạng thái chờ để tick() đi tiếp
         dispatcher.state.waitingForResponse = null; 

         dispatcher.state.currentPhase = 'discard';

         if (p.isAlive) {
             dispatcher.addLog(`⏱️ ${dispatcher.getHeroName(p)} đã kết thúc lượt.`, 'info');
             dispatcher.addLog(`🛑 ${dispatcher.getHeroName(p)} đã kết thúc lượt Hành Động.`);
             
             const hasNhiepChinh = hasSkill(p, 'nhiep-chinh');
             if (hasNhiepChinh && !p.hasAttackedThisTurn && !p.hasPlayedSlashThisTurn) {
                 dispatcher.addLog(`✨ ${dispatcher.getHeroName(p)} phát động [Nhiếp Chính], tự động bỏ qua Giai đoạn Bỏ Bài!`, 'success');
                 dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId: playerId } });
                 return true;
             }
         }

         dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_DISCARD', payload: { targetId: playerId } });
         dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId: playerId } });
         return true;
      }

      case 'EVENT_PHASE_PLAY': {
         const { targetId, isCancelled } = payload;
         
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target && !target.isAlive) {
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_DISCARD', payload: { targetId } });
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId } });
             return true;
         }
         
         dispatcher.state.currentPhase = 'action';
         
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
         
         const target = dispatcher.state.players.find(p => p.id === targetId);
         if (target && !target.isAlive) return true;
         
         dispatcher.state.currentPhase = 'discard';
         
         if (target && target.skipDiscardPhase) {
             dispatcher.addLog(`🛑 Giai đoạn Bỏ Bài bị bỏ qua do hiệu ứng kỹ năng!`);
             dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'skipDiscardPhase', false));
             return true;
         }

         const hasNhiepChinh = hasSkill(target, 'nhiep-chinh');
         if (hasNhiepChinh && !target.hasPlayedAttack && !target.hasAttackedThisTurn) {
             dispatcher.addLog(`✨ ${dispatcher.getHeroName(target)} phát động [Nhiếp Chính], bỏ qua Bỏ bài do không dùng Chém!`, 'important');
             dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId } });
             return true;
         }

         if (target) {
            const limit = getHandLimit(dispatcher.state, targetId);
            const discardCount = target.hand.length - limit;
            if (discardCount > 0) {
               dispatcher.state.waitingForResponse = { type: 'discard_phase', responderId: targetId, targetId, amount: discardCount };
            }
         }
         return true;
      }

      case 'EVENT_PHASE_END': {
         const { targetId } = payload;
         const target = dispatcher.state.players.find(p => p.id === targetId);
         dispatcher.state.currentPhase = 'end';
         dispatcher.state.reactionStack.push({ type: 'EVENT_NEXT_TURN' });
         if (target && target.isAlive) {
             dispatcher.triggerHooks('END_PHASE', payload);
         }
         return true;
      }

      case 'EVENT_NEXT_TURN': {
         const currentIdx = dispatcher.state.currentPlayerIndex;
         const currentPlayerId = dispatcher.state.players[currentIdx].id;
         dispatcher.applyEffect(Effects.ResetTurnFlagsEffect(currentPlayerId));
         
         // Failsafe: Dọn dẹp bàn nếu còn sót bài chưa cất (vd: sau Đấu Điểm Vân Đồn)
         if (dispatcher.state.playedCards && dispatcher.state.playedCards.length > 0) {
             dispatcher.state.discardPile.push(...dispatcher.state.playedCards);
             dispatcher.state.playedCards = [];
         }
         
         let nextIdx = (currentIdx + 1) % dispatcher.state.players.length;
         while (!dispatcher.state.players[nextIdx].isAlive) {
            nextIdx = (nextIdx + 1) % dispatcher.state.players.length;
         }

         if (nextIdx <= currentIdx) {
            dispatcher.state.turn = (dispatcher.state.turn || 0) + 1;
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
