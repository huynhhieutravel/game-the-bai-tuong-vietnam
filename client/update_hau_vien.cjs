const fs = require('fs');
const file = 'src/engine/registries/SkillRegistry.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  'hau-vien': {
    id: 'hau-vien',
    name: 'Hậu Viện',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_hau_vien') return;

        const player = state.players.find(p => p.id === req.sourceId); // The one who played Đào
        
        if (payload.doReact) {
             const target = state.players.find(p => p.id === payload.targetId); // The Hậu Viện user
             target.hp = Math.min(target.hp + 1, target.maxHp);
             import('../gameState.js').then(({ addLog }) => {
                 Object.assign(state, addLog(state, \`✨ \${player.name} phát động [Hậu Viện], nhường [Đào] cho \${target.name}!\`, 'heal'));
                 import('../core/Reducer.js').then(Reducer => {
                     let newState = Reducer.drawCards(state, player.id, 1);
                     newState.waitingForResponse = null;
                     Object.assign(state, newState);
                     dispatcher.resumeDispatcher();
                     dispatcher.tick();
                 });
             });
        } else {
             player.hp = Math.min(player.hp + 1, player.maxHp);
             import('../gameState.js').then(({ addLog }) => {
                 Object.assign(state, addLog(state, \`\${player.name} dùng [Đào] hồi 1 HP (\${player.hp}/\${player.maxHp})\`, 'heal'));
                 state.waitingForResponse = null;
                 dispatcher.resumeDispatcher();
                 dispatcher.tick();
             });
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },`;

content = content.replace(/  'hau-vien': \{[\s\S]*?aiConfig:[^\n]*\n  \},/m, replacement);
fs.writeFileSync(file, content);
