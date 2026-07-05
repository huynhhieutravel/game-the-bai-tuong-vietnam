const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`  'ho-gia': {
    id: 'ho-gia',
    name: 'Hộ Giá (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {`,
`  'ho-gia': {
    id: 'ho-gia',
    name: 'Hộ Giá (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      'BEFORE_ASK_DODGE': (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         
         const allies = state.players.filter(p => p.id !== playerId && p.isAlive && p.faction === 'Sơn' && p.hand.some(c => c.name === 'Né'));
         if (allies.length === 0) return false; // Không có ai giúp được
         
         dispatcher.addLog(\`👑 [Hộ Giá] kích hoạt! Đợi đồng minh Hệ Sơn đánh [Né] giúp \${dispatcher.getHeroName(state.players.find(p => p.id === playerId))}!\`, 'important');
         
         // Tạo request mới chèn ngang
         const currentReq = state.waitingForResponse;
         state.waitingForResponse = null;
         
         state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { 
               request: {
                  type: 'ask_ho_gia',
                  sourceId: playerId, // Người dùng Hộ Giá
                  targetId: allies[0].id, // Người đầu tiên bị hỏi
                  originalReq: currentReq,
                  askQueue: allies.map(p => p.id)
               }
            }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
