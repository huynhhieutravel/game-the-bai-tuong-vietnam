// ==========================================
// Card Registry - Định nghĩa toàn bộ Thẻ bài (Cơ bản & Cẩm nang)
// ==========================================
import * as Effects from '../core/Effects.js';
import { canAttack, getDistance, canTarget } from '../rangeSystem.js';
import { HeroRegistry } from './HeroRegistry.js';
import { hasSkill, getAlivePlayers, getPlayerFaction } from '../gameState.js';

import { CARD_TYPES, CARD_SUBTYPES } from '../../constants/cardTypes.js';
import { getCardSubType } from '../../data/gameData.js';

export const CardRegistry = {
  'chem': {
    id: 'chem',
    name: 'Chém',
    type: CARD_TYPES.BASIC,
    targeting: (state, player) => {
       const isVanDonWin = player && player.vanDonWin;
       const hasPhuongThien = player && player.equipment && player.equipment.some(eq => eq.name === 'Phương Thiên Kích');
       const isLastCard = hasPhuongThien && player.hand.length === 1; // Lá bài cuối cùng
       let maxTargets = 1;
       if (isVanDonWin) maxTargets = 2;
       if (isLastCard) maxTargets = 3;
       
       return { type: maxTargets > 1 ? 'multiple' : 'single', min: 1, max: maxTargets };
    },
    canPlay: (state, player, physicalCardId, virtualCardName) => {
      if (player.vanDonLose) return false;
      
      // Logic kiểm tra số lần Chém trong lượt, có Liên Nỏ không, v.v...
      const limit = player.equipment.some(eq => eq.name === 'Liên Nỏ') ? Infinity : (player.vanDonWin ? 2 : 1);
      if ((player.attackCountThisTurn || 0) >= limit) {
         return { valid: false, reason: `Bạn chỉ được đánh [Chém] tối đa ${limit === Infinity ? 'vô hạn' : limit} lần trong lượt!` };
      }

      // Nếu là thẻ ảo (Virtual Card) do dùng skill biến ra
      if (virtualCardName === 'Chém') {
         if (physicalCardId === 'virtual_thuy_to') return true;
         
         const card = player.hand.find(c => c.id === physicalCardId) || player.equipment.find(c => c.id === physicalCardId);
         if (!card) return false;

         let isValidVirtual = false;
         
         // Khai Thiên: dùng bài Đỏ như Chém
         if (hasSkill(player, 'khai-thien') && card.color === 'red') {
             isValidVirtual = true;
         }
         
         // Dời Núi: dùng Né như Chém
         if (hasSkill(player, 'doi-nui') && card.name === 'Né') {
             isValidVirtual = true;
         }

         if (card.name === 'Chém') {
             isValidVirtual = true;
         }

         if (!isValidVirtual) return false;
      }
      
      return true;
    },
    getValidTargets: (state, player, cardId) => {
      const isVanDonWin = player && player.vanDonWin;
      return state.players.filter(p => p.id !== player.id && p.isAlive && (isVanDonWin || canAttack(state, player.id, p.id, cardId)) && canTarget(state, player.id, p.id, 'Chém', cardId));
    },
    onPlay: (dispatcher, state, playerId, targets, cardId, payload) => {
      // 1. Vứt bài Chém từ tay vào mộ
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      
      // 2. Tăng bộ đếm Chém — qua Reducer, KHÔNG mutate trực tiếp
      const player = dispatcher.state.players.find(p => p.id === playerId);
      const currentCount = player ? (player.attackCountThisTurn || 0) : 0;
      dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'attackCountThisTurn', currentCount + 1));
      
      // 3. Tính sát thương (có Rượu thì +1)
      let damageAmount = 1;
      if (player && player.drankWine) {
          damageAmount++;
          dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'drankWine', false));
      }
      
      const isEquipType = cardId ? (dispatcher.state.players[playerId]?.hand.find(c => c.id === cardId)?.type === 'Trang Bị' || dispatcher.state.players[playerId]?.equipment.find(c => c.id === cardId)?.type === 'Trang Bị') : false;
      const isKhaiThien = hasSkill(player, 'khai-thien') && (isEquipType || payload?.virtualCardName === 'Chém');
      const hasNoThan = hasSkill(player, 'no-than');
      
      // 4. Ném sự kiện sát thương và sự kiện yêu cầu Né vào Ngăn xếp (LIFO)
      // Chú ý: Ném DamageEvent vào TRƯỚC (nằm dưới đáy), AskDodgeEvent vào SAU (nằm trên đỉnh)
      targets.forEach(targetId => {
         const target = dispatcher.state.players.find(p => p.id === targetId);
         let finalDamage = damageAmount;
         let unavoidable = isKhaiThien;
         if (isKhaiThien) {
             dispatcher.addLog(`🪓 ${dispatcher.getHeroName(player)} kích hoạt [Khai Thiên]: Đòn đánh không thể bị Né hoặc Bát Quái!`, 'skill');
         }

         if (hasNoThan && target) {
             if (player.hand.length >= target.hand.length) {
                 unavoidable = true;
                 dispatcher.addLog(`🏹 ${dispatcher.getHeroName(player)} kích hoạt [Nỏ Thần]: Đòn đánh không thể bị Né!`, 'skill');
             }
             if (player.hp <= target.hp) {
                 finalDamage += 1;
                 dispatcher.addLog(`🏹 ${dispatcher.getHeroName(player)} kích hoạt [Nỏ Thần]: Sát thương +1 (Sinh lực mục tiêu >= Cao Lỗ)!`, 'skill');
             }
         }

         // Tính toán số Né và các hiệu ứng khi bị nhắm mục tiêu
         const askDodgePayload = { sourceId: playerId, targetId, sourceCardId: cardId, reason: 'chem', unavoidable, reqDodges: 1 };
         
         const preHooksLength = dispatcher.state.reactionStack.length;
         dispatcher.triggerHooks('ON_TARGETED_SLASH', askDodgePayload);

         if (!askDodgePayload.isCancelled) {
             const pushedEvents = [];
             // Lên lịch Sát thương (Chờ xử lý nếu không có Né)
             pushedEvents.push({
                type: 'EVENT_DAMAGE',
                payload: { sourceId: playerId, targetId, amount: finalDamage, damageType: 'normal', sourceCardId: cardId, isKhaiThien, reason: 'chem' }
             });

             // Đòi Né
             pushedEvents.push({
                type: 'EVENT_ASK_DODGE', // Yêu cầu đánh lá Né
                payload: askDodgePayload
             });
             
             // Insert these events below any events pushed by the ON_TARGETED_SLASH hooks
             dispatcher.state.reactionStack.splice(preHooksLength, 0, ...pushedEvents);
         }

         // Trigger ON_SLASH_DECLARED sau khi push DODGE để nó nằm trên cùng Stack (LIFO -> chạy trước)
         dispatcher.triggerHooks('ON_SLASH_DECLARED', { sourceId: playerId, targetId, cardId });
      });
    },
  },

  'ne': {
    id: 'ne',
    name: 'Né',
    type: CARD_TYPES.BASIC,
    targeting: { type: 'none' },
    canPlay: (state, player, physicalCardId, virtualCardName) => {
       // Dời Núi: Có thể dùng Né như Chém
       if (hasSkill(player, 'doi-nui') && (!virtualCardName || virtualCardName === 'Chém')) {
           const limit = player.equipment.some(eq => eq.name === 'Liên Nỏ') ? Infinity : (player.vanDonWin ? 2 : 1);
           return (player.attackCountThisTurn || 0) < limit;
       }
       return false; // Bình thường Né không thể đánh trong lượt
    },
    canReact: (state, player, event, physicalCardId, virtualCardName) => {
      if (virtualCardName === 'Né') {
         const card = player.hand.find(c => c.id === physicalCardId);
         if (card && card.name !== 'Né') {
             if (hasSkill(player, 'nhiep-chinh-2') && card.color === 'black') return true;
             if (!hasSkill(player, 'doi-nui')) return false;
             if (card.name !== 'Chém') return false;
         }
      }
      return event.type === 'ask_dodge' || event.type === 'ask_slash_or_dodge';
    },
    onReact: (state, player, event) => {
      // Trả về state giải quyết event
      return state;
    }
  },

  'dao': {
    id: 'dao',
    name: 'Đào',
    type: CARD_TYPES.BASIC,
    targeting: { type: 'self' },
    canPlay: (state, player) => {
       if (player.hp < player.maxHp) return true;
       return { valid: false, reason: 'Bạn đang đầy máu, không thể dùng Đào!' };
    },
    getValidTargets: (state, player) => [player], // Chủ động đánh chỉ cho mình
    canReact: (state, player, event) => event.type === 'save',
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      // Tự hồi máu hoặc Hậu Viện
      const targetId = targets && targets.length > 0 ? targets[0] : playerId;
      const player = state.players.find(p => p.id === playerId);
      
      if (targetId === playerId) {
          const playerFaction = getPlayerFaction(player);
          const hauVienTargets = getAlivePlayers(state).filter(p => p.id !== player.id && p.hp < p.maxHp && p.hp < player.hp && hasSkill(p, 'hau-vien'));
          
          if (playerFaction === 'Hà' && hauVienTargets.length > 0) {
             dispatcher.state.reactionStack.push({
                 type: 'EVENT_TRIGGER_SKILL_ASK',
                 payload: { request: { type: 'ask_hau_vien', sourceId: player.id, targets: hauVienTargets.map(p => p.id), cardName: 'Đào' } }
             });
             return;
          }
      }
      
      dispatcher.applyEffect(Effects.RecoverEffect(targetId, 1));
    },
    onReact: (dispatcher, state, playerId, event) => {
      // Logic cứu người khi Hấp hối
      dispatcher.applyEffect(Effects.RecoverEffect(event.payload.targetId, 1));
    }
  },

  'ruou': {
    id: 'ruou',
    name: 'Rượu',
    type: CARD_TYPES.BASIC,
    targeting: { type: 'self' },
    canPlay: (state, player) => {
       if (!player.drankWineThisTurn) return true;
       return { valid: false, reason: 'Bạn đã uống Rượu trong lượt này rồi!' };
    },
    getValidTargets: (state, player) => [player],
    canReact: (state, player, event) => event.type === 'save' && event.dyingId === player.id,
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      // Đánh dấu uống rượu — qua Reducer, KHÔNG mutate trực tiếp
      dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'drankWine', true));
      dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'drankWineThisTurn', true));
      const player = dispatcher.state.players.find(p => p.id === playerId);
      dispatcher.addLog(`🍷 ${dispatcher.getHeroName(player)} uống Rượu! Sát thương [Chém] tiếp theo trong lượt này sẽ +1.`);
    }
  },

  // ================= CẨM NANG (TRICKS) =================
  'da-man': {
    id: 'da-man',
    name: 'Dã Man',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'aoe' },
    canPlay: (state, player, physicalCardId, virtualCardName) => {
      if (virtualCardName === 'Quyết Đấu') {
          const physicalCard = player.hand.find(c => c.id === physicalCardId) || player.equipment.find(c => c.id === physicalCardId);
          if (!physicalCard) return false;
          
          if (player.phaThanhColor) {
              const inHand = player.hand.some(c => c.id === physicalCardId);
              if (!inHand) {
                  return { valid: false, reason: `Phá Thành chỉ cho phép dùng bài TRÊN TAY để làm Quyết Đấu` };
              }
              if (physicalCard.color === player.phaThanhColor) {
                  return { valid: false, reason: `Phá Thành yêu cầu dùng bài KHÁC MÀU với phán xét (${player.phaThanhColor})` };
              }
          }
      }
      return true;
    },
    getValidTargets: (state, player) => {
      // Nam man tự động chọn tất cả người chơi khác
      return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));

      // Lấy danh sách mục tiêu theo thứ tự vòng đánh (từ người tiếp theo)
      const targetIds = dispatcher.getOrderedTargets(playerId, targets);

      // Đẩy vào Ngăn xếp (LIFO). 
      // Phải đảo ngược mảng để người gần nhất (đẩy vào cuối) sẽ được lấy ra giải quyết đầu tiên.
      [...targetIds].reverse().forEach(targetId => {
         dispatcher.state.reactionStack.push({
            type: 'EVENT_DAMAGE',
            payload: { sourceId: playerId, targetId, amount: 1, damageType: 'normal', sourceCardId: cardId }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_SLASH', // Yêu cầu đánh lá Chém
            payload: { sourceId: playerId, targetId, sourceCardId: cardId, reason: 'nam-man' }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_NEGATE',
            payload: { sourceId: playerId, targetId, trickType: 'nam-man', sourceCardId: cardId }
         });
      });
    }
  },

  'loan-tien': {
    id: 'loan-tien',
    name: 'Loạn Tiễn',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'aoe' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));

      const targetIds = dispatcher.getOrderedTargets(playerId, targets);

      [...targetIds].reverse().forEach(targetId => {
         dispatcher.state.reactionStack.push({
            type: 'EVENT_DAMAGE',
            payload: { sourceId: playerId, targetId, amount: 1, damageType: 'normal', sourceCardId: cardId }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_DODGE', // Yêu cầu đánh lá Né
            payload: { sourceId: playerId, targetId, sourceCardId: cardId, reason: 'van-tien' }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_NEGATE',
            payload: { sourceId: playerId, targetId, trickType: 'van-tien', sourceCardId: cardId }
         });
      });
    }
  },

  'hoi-xuan': {
    id: 'hoi-xuan',
    name: 'Hồi Xuân',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'aoe' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Hồi máu cho tất cả người chơi còn sống đang bị mất máu
      return state.players.filter(p => p.isAlive && p.hp < p.maxHp);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));

      const targetIds = dispatcher.getOrderedTargets(playerId, targets);

      [...targetIds].reverse().forEach(targetId => {
         dispatcher.state.reactionStack.push({
            type: 'EVENT_HEAL',
            payload: { sourceId: playerId, targetId, amount: 1, sourceCardId: cardId }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_NEGATE',
            payload: { sourceId: playerId, targetId, trickType: 'hoi-xuan', sourceCardId: cardId }
         });
      });
    }
  },

  'tuoc-bai': {
    id: 'tuoc-bai',
    name: 'Tước Bài',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Bất kỳ ai có bài (trên tay, trang bị, hoặc phán xét)
      return state.players.filter(p => 
         p.id !== player.id && p.isAlive && 
         (p.hand.length > 0 || p.equipment.length > 0 || (p.judgementArea && p.judgementArea.length > 0))
      );
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      const targetId = targets[0];
      dispatcher.triggerHooks('ON_TARGETED_DISMANTLE', { sourceId: playerId, targetId, sourceCardId: cardId });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_DISMANTLE',
         payload: { sourceId: playerId, targetId, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'qua-ha', sourceCardId: cardId }
      });
    }
  },

  'cuop-bai': {
    id: 'cuop-bai',
    name: 'Cướp Bài',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Phải kiểm tra khoảng cách <= 1 (nếu không có kỹ năng Tiên Duyên)
      const hasTienDuyen = hasSkill(player, 'tien-duyen-passive');
      return state.players.filter(p => 
         p.id !== player.id && p.isAlive && !hasSkill(p, 'nghe-an-ke') &&
         (p.hand.length > 0 || p.equipment.length > 0 || (p.judgementArea && p.judgementArea.length > 0)) &&
         (hasTienDuyen || getDistance(state, player.id, p.id) <= 1)
      );
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      const targetId = targets[0];
      dispatcher.triggerHooks('ON_TARGETED_SNATCH', { sourceId: playerId, targetId, sourceCardId: cardId });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_SNATCH',
         payload: { sourceId: playerId, targetId, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'thuan-thu', sourceCardId: cardId }
      });
    }
  },

  'quyet-dau': {
    id: 'quyet-dau',
    name: 'Quyết Đấu',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player, cardId) => {
      return state.players.filter(p => p.id !== player.id && p.isAlive && canTarget(state, player.id, p.id, 'Quyết Đấu', cardId));
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      const targetId = targets[0];
      
      // Quyết Đấu tự quản lý vòng lặp đả ngược thông qua EVENT_DUEL
      dispatcher.state.reactionStack.push({
         type: 'EVENT_DUEL',
         payload: { sourceId: playerId, targetId, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'quyet-dau', sourceCardId: cardId }
      });
    }
  },

  // ================= CẨM NANG HỎI/ĐÁP (TRICKS) =================
  'muon-dao': {
    id: 'muon-dao',
    name: 'Mượn Đao',
    type: CARD_TYPES.TRICK,
    targeting: { 
      type: 'sequence', 
      steps: [
        { 
          message: 'Chọn người cho mượn đao (phải có vũ khí)',
          filter: (state, player, selectedTargets) => state.players.filter(p => p.id !== player.id && p.isAlive && p.equipment.some(e => getCardSubType(e) === CARD_SUBTYPES.EQUIP_WEAPON))
        },
        { 
          message: 'Chọn nạn nhân (phải trong tầm đánh của người mượn đao)',
          filter: (state, player, selectedTargets) => {
             const borrowerId = selectedTargets[0];
             return state.players.filter(p => p.id !== borrowerId && p.isAlive && canAttack(state, borrowerId, p.id));
          }
        }
      ] 
    },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
       // Legacy
       return state.players.filter(p => p.id !== player.id && p.isAlive && p.equipment.some(e => getCardSubType(e) === CARD_SUBTYPES.EQUIP_WEAPON));
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      const targetId = targets[0]; // Người mượn đao
      // extraTargetId (Nạn nhân) tạm thời không hỗ trợ trong getValidTargets mặc định, 
      // UI sẽ ghép target2 vào payload nếu cần, ta giả sử UI gửi lên mảng targets = [targetId, extraTargetId]
      const extraTargetId = targets[1] || targets[0]; 
      
      // Đẩy Ask Negate lên đầu
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_SLASH',
         payload: { sourceId: targetId, targetId: extraTargetId, borrowerId: playerId, isMuonDao: true, sourceCardId: cardId, reason: 'muon-dao' }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'muon-dao', sourceCardId: cardId }
      });
    }
  },

  'vo-trung': {
    id: 'vo-trung',
    name: 'Vô Trung Sinh Hữu',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'self' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => [player],
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      dispatcher.state.reactionStack.push({
         type: 'EVENT_DRAW_CARDS',
         payload: { targetId: playerId, amount: 2, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId: playerId, trickType: 'vo-trung', sourceCardId: cardId }
      });
    }
  },

  'hoa-cong': {
    id: 'hoa-cong',
    name: 'Hỏa Công',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'single' },
    canPlay: (state, player, physicalCardId, virtualCardName) => {
        if (virtualCardName === 'Hỏa Công') {
            const card = player.hand.find(c => c.id === physicalCardId);
            if (card && card.name !== 'Hỏa Công') {
                if (!hasSkill(player, 'than-hoa') || card.color !== 'red') return false;
            }
        }
        return true;
    },
    getValidTargets: (state, player) => {
      // Bất kỳ ai có bài trên tay
      return state.players.filter(p => p.isAlive && p.hand.length > 0);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      const targetId = targets[0];
      
      dispatcher.state.reactionStack.push({
         type: 'EVENT_HOA_CONG',
         payload: { sourceId: playerId, targetId, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'hoa-cong', sourceCardId: cardId }
      });
    }
  },

  'xieng-xich': {
    id: 'xieng-xich',
    name: 'Xiềng Xích', // Thiết Tác Liên Hoàn
    type: CARD_TYPES.TRICK,
    targeting: { type: 'multiple', min: 0, max: 2 },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => state.players.filter(p => p.isAlive),
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'discardPile', playerId));
      
      // Trọng chú: Nếu không chỉ định mục tiêu, rèn lại (rút 1 lá)
      if (!targets || targets.length === 0) {
          const player = dispatcher.state.players.find(p => p.id === playerId);
          dispatcher.applyEffect(Effects.DrawCardEffect(playerId, 1));
          dispatcher.addLog(`⛓️ ${dispatcher.getHeroName(player)} rèn lại [Xiềng Xích], rút 1 lá!`);
          return;
      }

      // Trọng Âm: Thiết tác hỗ trợ 1 hoặc 2 mục tiêu
      const orderedTargets = dispatcher.getOrderedTargets(playerId, targets);
      console.log('[DEBUG_CHEM] orderedTargets:', orderedTargets);
      [...orderedTargets].reverse().forEach(targetId => {
         console.log('[DEBUG_CHEM] Pushing EVENT_ASK_DODGE for', targetId);
         dispatcher.state.reactionStack.push({
             type: 'EVENT_CHAIN',
             payload: { sourceId: playerId, targetId, sourceCardId: cardId }
          });
          dispatcher.state.reactionStack.push({
             type: 'EVENT_ASK_NEGATE',
             payload: { sourceId: playerId, targetId, trickType: 'thi-thanh', sourceCardId: cardId }
          });
      });
    }
  },

  'hoa-giai': {
    id: 'hoa-giai',
    name: 'Hóa Giải', // Vô Giải Khả Kích
    type: CARD_TYPES.TRICK,
    canPlay: (state, player) => false, // Không thể play trực tiếp, chỉ dùng để React!
    getValidTargets: (state, player) => [],
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
        // Hóa giải xử lý ở EVENT_ACTION_REACT, không qua onPlay
    }
  },

  // ================= CẨM NANG PHÁN XÉT (DELAY TRICKS) =================
  'sam-set': {
    id: 'sam-set',
    name: 'Sấm Sét',
    type: CARD_TYPES.TRICK,
    isDelayed: true,
    targeting: { type: 'self' },
    canPlay: (state, player) => {
       // Không thể dùng nếu trên đầu đã có Sấm Sét
       return !player.judgementArea || !player.judgementArea.some(c => c.name === 'Sấm Sét');
    },
    getValidTargets: (state, player) => [player], // Tự đặt lên đầu mình
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'judgement', playerId, playerId, 'sam-set'));
    }
  },

  'binh-luong': {
    id: 'binh-luong',
    name: 'Binh Lương Thốn Đoạn',
    type: CARD_TYPES.TRICK,
    isDelayed: true,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Chỉ dùng lên người khác và người đó chưa bị Binh Lương (không giới hạn nếu có Tiên Duyên)
      const hasTienDuyen = hasSkill(player, 'tien-duyen-passive');
      return state.players.filter(p => 
         p.id !== player.id && p.isAlive && 
         (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Binh Lương Thốn Đoạn')) &&
         (hasTienDuyen || getDistance(state, player.id, p.id) <= 1)
      );
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      // Di chuyển vào vùng Phán xét của mục tiêu
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'judgement', playerId, targets[0], 'binh-luong'));
    }
  },

  'hon-loan': {
    id: 'hon-loan',
    name: 'Hỗn Loạn',
    type: CARD_TYPES.TRICK,
    isDelayed: true,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Chỉ dùng lên người khác và người đó chưa bị Hỗn Loạn
      return state.players.filter(p => 
         p.id !== player.id && p.isAlive && !hasSkill(p, 'nghe-an-ke') &&
         (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Hỗn Loạn'))
      );
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      const p = state.players.find(p => p.id === playerId);
      const fromZone = p && p.equipment.some(e => e.id === cardId) ? 'equipment' : 'hand';
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, fromZone, 'judgement', playerId, targets[0], 'hon-loan'));
    }
  }
};
