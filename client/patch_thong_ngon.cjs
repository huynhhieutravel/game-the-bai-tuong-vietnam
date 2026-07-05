const fs = require('fs');
const file = 'src/engine/registries/SkillRegistry.js';
let content = fs.readFileSync(file, 'utf8');

const thongNgonCode = `  'thong-ngon': {
    id: 'thong-ngon',
    name: 'Thông Ngôn',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        after_EVENT_APPLY_DRAW: (dispatcher, state, payload) => {
             const targetId = payload.targetId;
             const targetPlayer = state.players.find(p => p.id === targetId);
             
             import('../gameState.js').then(({ getPlayerFaction, isPlayerRevealed }) => {
                 if (getPlayerFaction(targetPlayer) === 'Hà') {
                     const thongNgonPlayers = state.players.filter(p => p.id !== targetId && p.isAlive && p.hand.length > 0 && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.name === 'Thông Ngôn')));
                     
                     if (thongNgonPlayers.length > 0) {
                         state.waitingForResponse = {
                             type: 'ask_thong_ngon',
                             askQueue: thongNgonPlayers.map(p => p.id),
                             targetId: targetId
                         };
                         // Must set targetId of waitingForResponse to the first in askQueue for UI routing
                         state.waitingForResponse.sourceId = state.waitingForResponse.askQueue[0]; // Temporary, logic expects sourceId or targetId
                     }
                 }
             });
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_thong_ngon') return;

        const currentAskerId = req.askQueue[0];
        
        if (payload.doReact && payload.cardIndexSelected !== undefined) {
             const asker = state.players.find(p => p.id === currentAskerId);
             const target = state.players.find(p => p.id === req.targetId);
             const card = asker.hand[payload.cardIndexSelected];
             
             asker.hand = asker.hand.filter((_, i) => i !== payload.cardIndexSelected);
             target.hand.push(card);
             
             target.unlimitedRangeThisTurn = true; // Flag for rangeSystem
             
             import('../gameState.js').then(({ addLog }) => {
                 Object.assign(state, addLog(state, \`✨ \${asker.name} phát động [Thông Ngôn], đưa 1 lá bài cho \${target.name}! \${target.name} sẽ không bị giới hạn khoảng cách trong lượt này.\`, 'important'));
                 state.waitingForResponse = null;
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
                 state.waitingForResponse = null;
                 dispatcher.resumeDispatcher();
                 dispatcher.tick();
             }
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },`;

content = content.replace(/  'thong-ngon': \{[\s\S]*?aiConfig:[^\n]*\n  \},/m, thongNgonCode);
fs.writeFileSync(file, content);
