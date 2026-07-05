const fs = require('fs');
const file = 'src/engine/registries/SkillRegistry.js';
let content = fs.readFileSync(file, 'utf8');

const dinhQuocCode = `  'dinh-quoc': {
    id: 'dinh-quoc',
    name: 'Định Quốc',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
        return !player.dinhQuocUsedThisTurn && player.hand.length > 0;
    },
    hooks: {
        after_EVENT_TURN_END: (dispatcher, state, payload) => {
             state.players.forEach(p => { p.dinhQuocUsedThisTurn = false; });
        }
    },
    onUse: (dispatcher, state, playerId, targets, options) => {
        if (!options || options.cardIdx === undefined) return;
        if (!targets || targets.length === 0) return;
        
        const sender = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targets[0]); 
        
        const card = sender.hand[options.cardIdx];
        sender.hand = sender.hand.filter((_, i) => i !== options.cardIdx);
        target.hand.push(card);
        
        target.hp = Math.min(target.hp + 1, target.maxHp);
        
        sender.dinhQuocUsedThisTurn = true;
        
        import('../gameState.js').then(({ addLog }) => {
            Object.assign(state, addLog(state, \`✨ \${sender.name} dùng [Định Quốc], giao 1 lá bài cho \${target.name}! \${target.name} hồi 1 HP (\${target.hp}/\${target.maxHp})\`, 'important'));
            dispatcher.resumeDispatcher();
            dispatcher.tick();
        });
    },
    aiConfig: { priority: 2, condition: () => false } // Will be handled explicitly in botAI.js
  },`;

content = content.replace(/  'dinh-quoc': \{[\s\S]*?aiConfig:[^\n]*\n  \},/m, dinhQuocCode);
fs.writeFileSync(file, content);
