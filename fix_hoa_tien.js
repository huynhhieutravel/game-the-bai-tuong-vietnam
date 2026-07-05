const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const oldHoaTien = `  'hoa-tien': {
    id: 'hoa-tien',
    name: 'Hóa Tiên',
    type: SKILL_TYPES.PASSIVE, // Kích hoạt bị động khi Hấp Hối
    hooks: {
      DYING: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.hoaTienUsed) return false; // Chỉ dùng 1 lần (tương tự Niết Bàn)
         
         // Đẩy Ask Hóa Tiên lên đầu (đè lên DO_DYING đang ở trong Stack)
         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_hoa_tien', targetId: player.id } }
         });
         return true; // Báo hiệu đã chèn
      }
    }
  },`;

const newHoaTien = `  'hoa-tien': {
    id: 'hoa-tien',
    name: 'Hóa Tiên',
    type: SKILL_TYPES.PASSIVE, // Kích hoạt bị động khi Hấp Hối
    hooks: {
      DYING: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.hoaTienUsed) return false; // Chỉ dùng 1 lần (tương tự Niết Bàn)
         
         // Đẩy Ask Hóa Tiên lên đầu (đè lên DO_DYING đang ở trong Stack)
         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_hoa_tien', targetId: player.id, skillId: 'hoa-tien' } }
         });
         return true; // Báo hiệu đã chèn
      }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_hoa_tien') return;
        
        const player = state.players.find(p => p.id === req.targetId);
        if (payload.responseType === 'yes') {
            dispatcher.applyEffect({ type: 'SET_FLAG', playerId: player.id, flag: 'hoaTienUsed', value: true });
            dispatcher.addLog(\`✨ \${player.name} phát động [Hóa Tiên], niết bàn trọng sinh!\`, 'important');
            
            // Bỏ toàn bộ bài trên tay, trang bị, phán xét
            const toDiscard = [...player.hand, ...player.equipment, ...(player.judgementArea || [])];
            toDiscard.forEach(card => {
               dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id)); // Đơn giản hóa, MoveCardEffect không quá khắt khe fromZone
            });
            player.hand = [];
            player.equipment = [];
            player.judgementArea = [];
            
            // Hồi sinh lực về 3
            player.hp = 3;
            
            // Rút 3 lá
            dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 3));
            
            // Hủy EVENT_DO_DYING dưới đáy (vì đã sống)
            const dyingIdx = state.reactionStack.findIndex(e => e.type === 'EVENT_DO_DYING' && e.payload.targetId === player.id);
            if (dyingIdx >= 0) state.reactionStack.splice(dyingIdx, 1);
            
            // Hủy Death nếu có
            const deathIdx = state.reactionStack.findIndex(e => e.type === 'EVENT_DEATH' && e.payload.targetId === player.id);
            if (deathIdx >= 0) state.reactionStack.splice(deathIdx, 1);
            
            state.waitingForResponse = null;
        } else {
            state.waitingForResponse = null;
        }
    }
  },`;

code = code.replace(oldHoaTien, newHoaTien);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
