const fs = require('fs');
const file = 'src/engine/registries/SkillRegistry.js';
let content = fs.readFileSync(file, 'utf8');

const canGianCode = `  'can-gian': {
    id: 'can-gian',
    name: 'Can Gián',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_can_gian') return;

        const currentAskerId = req.askQueue[0];
        
        if (payload.doReact && payload.cardIndexSelected !== undefined) {
             const asker = state.players.find(p => p.id === currentAskerId);
             const target = state.players.find(p => p.id === req.targetId);
             const card = asker.hand[payload.cardIndexSelected];
             
             asker.hand = asker.hand.filter((_, i) => i !== payload.cardIndexSelected);
             target.hand.push(card);
             
             req.originalReq.isNegated = true;
             req.originalReq.askQueue = []; // Bỏ qua toàn bộ Hóa Giải (Vô T懈) phía sau
             
             import('../gameState.js').then(({ addLog }) => {
                 Object.assign(state, addLog(state, \`✨ \${asker.name} phát động [Can Gián], đưa 1 lá bài cho \${target.name} và vô hiệu hóa Cẩm Nang!\`, 'important'));
                 state.waitingForResponse = req.originalReq; // Phục hồi lại event gốc (ask_negate) nhưng đã rỗng queue và bị negate
                 dispatcher.resumeDispatcher();
                 dispatcher.tick();
             });
        } else {
             req.askQueue.shift();
             if (req.askQueue.length > 0) {
                 req.sourceId = req.askQueue[0];
                 dispatcher.resumeDispatcher();
                 dispatcher.tick();
             } else {
                 state.waitingForResponse = req.originalReq; // Trả về ask_negate bình thường
                 dispatcher.resumeDispatcher();
                 dispatcher.tick();
             }
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },`;

content = content.replace(/  'can-gian': \{[\s\S]*?aiConfig:[^\n]*\n  \},/m, canGianCode);
fs.writeFileSync(file, content);
