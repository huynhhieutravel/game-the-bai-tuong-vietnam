const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`        const player = state.players.find(p => p.id === req.targetId);
        if (payload.responseType === 'yes') {
            dispatcher.applyEffect({ type: 'SET_FLAG', playerId: player.id, flag: 'hoaTienUsed', value: true });`,
`        const player = state.players.find(p => p.id === req.targetId);
        if (payload.doProvide || payload.responseType === 'yes') {
            dispatcher.applyEffect({ type: 'SET_FLAG', playerId: player.id, flag: 'hoaTienUsed', value: true });`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
