const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);`,
`    hooks: {
      after_EVENT_APPLY_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
