// ==========================================
// Equip Registry - Định nghĩa toàn bộ Trang bị
// ==========================================

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
         const { sourceId, attackerId } = payload;
         // sourceId is the target who dodged
         // attackerId is the one who attacked
         if (attackerId === playerId) {
            const player = state.players.find(p => p.id === playerId);
            if (player && player.hand.length > 0) {
                dispatcher.state.reactionStack.push({
                   type: 'EVENT_TRIGGER_SKILL_ASK',
                   payload: { request: { type: 'ask_weapon_skill', weapon: 'Thanh Long Đao', targetId: sourceId, sourceId: playerId, responderId: playerId } }
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
         if (payload.targetId === playerId && !payload.isBatQuaiJudged) {
            
            // 1. Ghi đè lại chính Event Đòi Né xuống Stack (Kèm cờ đã xử lý Bát Quái để không bị lặp vô hạn)
            dispatcher.state.reactionStack.push({
               type: 'EVENT_ASK_DODGE',
               payload: { ...payload, isBatQuaiJudged: true }
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
