const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const replacement = `
    },
    onSkillResponse: (dispatcher, state, playerId, data) => {
        const { targetId } = data || {};
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);
        
        if (target) {
            dispatcher.addLog(\`⚡ \${dispatcher.getHeroName(player)} kích hoạt [Phạt Tội]!\`);
            // Phán xét mục tiêu
            dispatcher.state.reactionStack.push({
                type: 'EVENT_JUDGE',
                payload: { targetId, reason: 'phat-toi' }
            });
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },`;

code = code.replace(
`    },
    aiConfig: { priority: 5, condition: () => false }
  },`,
replacement);

// Wait, I also need to fix my Quân Cơ trick:
// const payload = { playerId, responseType: data ? 'play' : 'skip', data };
// const isSkipReq = !data || responseType === 'skip' ... wait! responseType was destructured from payload? No, I used unused1!
code = code.replace(
`    onSkillResponse: (dispatcher, state, playerId, data) => {
        const payload = { playerId, responseType: data ? 'play' : 'skip', data };
        const { responseType: unused1, data: unused2 } = payload;
        const player = state.players.find(p => p.id === playerId);
        const isSkipReq = !data || responseType === 'skip' || responseType === 'cancel' || !data.cardId;`,
`    onSkillResponse: (dispatcher, state, playerId, data) => {
        const responseType = data ? 'play' : 'skip';
        const player = state.players.find(p => p.id === playerId);
        const isSkipReq = !data || responseType === 'skip' || responseType === 'cancel' || !data.cardId;`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
