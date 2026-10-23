// ==========================================
// Equip Registry - Định nghĩa toàn bộ Trang bị
// ==========================================
import { CARD_SUITS } from '../../constants/cardTypes.js';
import { hasSkillEvenIfHidden } from '../gameState.js';

export const EQUIP_TYPES = {
  WEAPON: 'WEAPON',
  ARMOR: 'ARMOR',
  MOUNT_ATK: 'MOUNT_ATK',
  MOUNT_DEF: 'MOUNT_DEF'
};

export const EquipRegistry = {
  'lien-no': {
    id: 'lien-no',
    name: 'Liên Nỏ',
    type: EQUIP_TYPES.WEAPON,
    range: 1,
    hooks: {
      // Modifies max slash per turn
      onCalculateMaxSlash: (state, player, currentLimit) => Infinity
    }
  },

  'thanh-long-dao': {
    id: 'thanh-long-dao',
    name: 'Thanh Long Đao',
    type: EQUIP_TYPES.WEAPON,
    range: 3,
    hooks: {
      ON_DODGE: (dispatcher, state, playerId, payload) => {
         const { sourceId, attackerId, reason } = payload;
         // sourceId is the target who dodged
         // attackerId is the one who attacked
         if (attackerId === playerId && reason === 'chem') {
            const player = state.players.find(p => p.id === playerId);
            if (player && player.hand.length > 0) {
                // Check if they have a Chém, or a virtual Chém
                const hasDoiNui = !player.isSkillsSuppressed && hasSkillEvenIfHidden(player, 'doi-nui');
                const hasKhaiThien = !player.isSkillsSuppressed && hasSkillEvenIfHidden(player, 'khai-thien');
                
                const hasValidCard = player.hand.some(c => {
                    if (c.name === 'Chém') return true;
                    if (hasDoiNui && c.name === 'Né') return true;
                    if (hasKhaiThien && c.color === 'red') return true;
                    return false;
                });
                
                if (hasValidCard) {
                    dispatcher.state.reactionStack.push({
                       type: 'EVENT_TRIGGER_SKILL_ASK',
                       payload: { request: { type: 'ask_weapon_skill', weapon: 'Thanh Long Đao', targetId: sourceId, sourceId: playerId, responderId: playerId } }
                    });
                }
            }
         }
      }
    }
  },

  'riu-da': {
    id: 'riu-da',
    name: 'Rìu Đá',
    type: EQUIP_TYPES.WEAPON,
    range: 3,
    hooks: {
      ON_DODGE: (dispatcher, state, playerId, payload) => {
         const { sourceId, attackerId, reason } = payload;
         if (attackerId === playerId && reason === 'chem') {
            const player = state.players.find(p => p.id === playerId);
            const totalCards = player ? player.hand.length + player.equipment.length : 0;
            if (totalCards >= 3) { // Phải có ít nhất 2 lá khác Rìu Đá (tổng >= 3 vì đang trang bị Rìu Đá)
                dispatcher.state.reactionStack.push({
                   type: 'EVENT_TRIGGER_SKILL_ASK',
                   payload: { request: { type: 'ask_weapon_skill', weapon: 'Rìu Đá', targetId: sourceId, sourceId: playerId, responderId: playerId } }
                });
            }
         }
      }
    }
  },

  'phuong-thien-kich': {
    id: 'phuong-thien-kich',
    name: 'Phương Thiên Kích',
    type: EQUIP_TYPES.WEAPON,
    range: 4,
    hooks: {
      // Logic đặc biệt xử lý trong TargetResolver.js hoặc CardRules.js (khi Chém là lá bài cuối cùng trên tay)
    }
  },

  'song-kiem': {
    id: 'song-kiem',
    name: 'Song Kiếm',
    type: EQUIP_TYPES.WEAPON,
    range: 2,
    hooks: {
      ON_SLASH_DECLARED: (dispatcher, state, playerId, payload) => {
         const { targetId } = payload;
         const player = state.players.find(p => p.id === playerId);
         const target = state.players.find(p => p.id === targetId);
         if (player && target && player.gender !== 'Không' && target.gender !== 'Không' && player.gender !== target.gender) {
            dispatcher.state.reactionStack.push({
               type: 'EVENT_TRIGGER_SKILL_ASK',
               payload: { request: { type: 'ask_weapon_skill', weapon: 'Song Kiếm', targetId: targetId, sourceId: playerId, responderId: targetId } }
            });
         }
      }
    }
  },

  'quat-sat': {
    id: 'quat-sat',
    name: 'Quạt Sắt',
    type: EQUIP_TYPES.WEAPON,
    range: 2,
    hooks: {
      ON_DAMAGE_CALC: (dispatcher, state, playerId, payload) => {
         const { targetId, sourceId, damageType } = payload;
         if (sourceId === playerId && payload.reason === 'chem') {
             const player = state.players.find(p => p.id === playerId);
             const totalCards = player ? player.hand.length + player.equipment.length : 0;
             if (totalCards >= 3) {
                 dispatcher.state.reactionStack.push({
                    type: 'EVENT_TRIGGER_SKILL_ASK',
                    payload: { request: { type: 'ask_weapon_skill', weapon: 'Quạt Sắt', targetId: targetId, sourceId: playerId, responderId: playerId } }
                 });
             }
         }
      }
    }
  },

  'bat-quai': {
    id: 'bat-quai',
    name: 'Bát Quái',
    type: EQUIP_TYPES.ARMOR,
    hooks: {
      before_EVENT_ASK_DODGE: (dispatcher, state, playerId, payload) => {
         // Kích hoạt khi bản thân bị yêu cầu Né
         if (payload.targetId === playerId && !payload.isBatQuaiJudged && !payload.unavoidable) {
            
            // 1. Ghi đè lại chính Event Đòi Né xuống Stack (Kèm cờ đã xử lý Bát Quái để không bị lặp vô hạn)
            dispatcher.state.reactionStack.push({
               type: 'EVENT_ASK_DODGE',
               payload: { ...payload, isBatQuaiJudged: true, baguaAvailable: false }
            });

            // 2. Nhét Event Phán Xét Bát Quái lên Đỉnh Ngăn Xếp
            dispatcher.state.reactionStack.push({
               type: 'EVENT_JUDGE',
               payload: { 
                  targetId: playerId, 
                  reason: 'bat-quai',
                  // Hàm callback được nhúng thẳng vào payload (Khá hay nhưng nên cẩn thận khi clone State)
               }
            });

            // 3. Hủy ngay lập tức Event Đòi Né hiện tại (Vì nó đã được clone và dồn xuống dưới)
            payload.isCancelled = true;
         }
      }
    }
  },

  'hac-thuan': {
    id: 'hac-thuan',
    name: 'Hắc Thuẫn',
    type: EQUIP_TYPES.ARMOR,
    hooks: {
      ON_TARGETED_SLASH: (dispatcher, state, playerId, payload) => {
         const { sourceCardId, targetId } = payload;
         if (targetId === playerId) {
             const card = dispatcher.findCard(sourceCardId);
             if (card && (card.suit === '♠' || card.suit === '♣' || card.color === 'black')) {
                dispatcher.addLog(`🛡️ ${dispatcher.getHeroName(state.players.find(p=>p.id===playerId))} dùng [Hắc Thuẫn] vô hiệu hóa [Chém] (đen)!`, 'success');
                payload.isCancelled = true;
             }
         }
      }
    }
  },


  'bach-ngan': {
    id: 'bach-ngan',
    name: 'Bạch Ngân',
    type: EQUIP_TYPES.ARMOR,
    hooks: {
      ON_DAMAGE_CALC: (dispatcher, state, playerId, payload) => {
         const { targetId, amount } = payload;
         // Bạch Ngân giới hạn sát thương tối đa nhận vào mỗi lần là 1
         if (targetId === playerId && amount > 1) {
             dispatcher.addLog(`🛡️ [Bạch Ngân] bảo vệ ${dispatcher.getHeroName(state.players.find(p=>p.id===playerId))}, giảm sát thương từ ${amount} xuống 1!`, 'success');
             payload.amount = 1;
         }
      },
      ON_UNEQUIP: (dispatcher, state, playerId, payload) => {
         // Hồi 1 máu khi mất giáp Bạch Ngân
         dispatcher.applyEffect({
             type: 'RECOVER',
             targetId: playerId,
             amount: 1
         });
         dispatcher.addLog(`💖 [Bạch Ngân] rời khỏi Người chơi ${playerId + 1}, hồi 1 Sinh Lực!`, 'heal');
      }
    }
  },

  'ngua-chien': {
    id: 'ngua-chien',
    name: 'Ngựa Chiến (-1)',
    type: EQUIP_TYPES.MOUNT_ATK,
    hooks: {
      onCalculateAttackRange: (state, player, currentMod) => currentMod + 1
    }
  },

  'ngua-than': {
    id: 'ngua-than',
    name: 'Ngựa Thần (+1)',
    type: EQUIP_TYPES.MOUNT_DEF,
    hooks: {
      onCalculateDefenseRange: (state, player, currentMod) => currentMod + 1
    }
  }
};
