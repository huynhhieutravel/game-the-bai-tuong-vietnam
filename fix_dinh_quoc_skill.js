const fs = require('fs');

let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const regex = /'dinh-quoc': \{[\s\S]*?(?=\s*'trung-dung': \{)/;

const newDinhQuoc = `'dinh-quoc': {
    id: 'dinh-quoc',
    name: 'Định Quốc',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
        // Player is the one using the skill (the Sơn ally sending the card)
        return !player.dinhQuocUsedThisTurn && player.hand.length > 0;
    },
    hooks: {
        after_EVENT_TURN_END: (dispatcher, state, playerId, payload) => {
             state.players.forEach(p => { p.dinhQuocUsedThisTurn = false; });
        }
    },
    onUse: (dispatcher, state, playerId, targets, options) => {
        if (!options || options.cardIdx === undefined) return;
        if (!targets || targets.length === 0) return;
        
        const sender = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targets[0]); 
        
        const card = sender.hand[options.cardIdx];
        
        // Cần đảm bảo bài đưa là Né hoặc Sấm Sét
        if (card.name !== 'Né' && card.name !== 'Sấm Sét') {
           console.warn("[Định Quốc] Chỉ có thể đưa lá Né hoặc Sấm Sét!");
           return;
        }

        dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'hand', sender.id, target.id));
        dispatcher.addLog(\`⛰️ \${sender.name} dùng [Định Quốc] dâng 1 lá [\${card.name}] cho \${target.name}!\`, 'success');
        
        sender.dinhQuocUsedThisTurn = true;
    },
    turnResetFlags: ['dinhQuocUsedThisTurn']
  },`;

code = code.replace(regex, newDinhQuoc + '\n');
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
