const fs = require('fs');

let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillCode = skillCode.replace(
`    onReact: (dispatcher, state, payload) => {
        const { targetId, playerId } = payload || {};
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);
        
        if (target) {`,
`    onReact: (dispatcher, state, payload) => {
        const { targetId, playerId, doProvide } = payload || {};
        console.log("Phạt Tội payload:", payload, "targetId:", targetId, "playerId:", playerId);
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);
        
        if (!doProvide) return; // Nếu chọn Skip thì bỏ qua

        if (target) {`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);
console.log("Success");
