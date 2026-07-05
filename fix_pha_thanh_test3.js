const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`      DRAW_PHASE: (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         const player = state.players.find(p => p.id === playerId);
         if (player.phaThanhUsed) return false;`,
`      DRAW_PHASE: (dispatcher, state, playerId, payload) => {
         console.log("[PHA THANH] DRAW_PHASE triggered for playerId:", playerId, "targetId:", payload.targetId);
         if (playerId !== payload.targetId) return false;
         const player = state.players.find(p => p.id === playerId);
         console.log("[PHA THANH] player.phaThanhUsed:", player.phaThanhUsed);
         if (player.phaThanhUsed) return false;`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
