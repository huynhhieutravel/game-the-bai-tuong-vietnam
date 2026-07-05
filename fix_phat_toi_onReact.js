const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`    onSkillResponse: (dispatcher, state, playerId, data) => {
        const { targetId } = data || {};
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);`,
`    onReact: (dispatcher, state, payload) => {
        const { playerId, doProvide, targetId } = payload || {};
        console.log("Phạt Tội payload:", payload, "targetId:", targetId, "playerId:", playerId);
        if (!doProvide) return;
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
