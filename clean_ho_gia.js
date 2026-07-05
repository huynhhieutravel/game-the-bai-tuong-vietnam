const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`      'ON_ASK_DODGE': (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         
         const allies = state.players.filter(p => {
            console.log("Checking ally:", p.id, "isAlive:", p.isAlive, "faction:", p.faction, "hand:", p.hand.map(c => c.name));
            return p.id !== playerId && p.isAlive && p.faction === 'Sơn' && p.hand.some(c => c.name === 'Né');
         });
         console.log("Hộ Giá allies found:", allies.length);
         if (allies.length === 0) return false; // Không có ai giúp được`,
`      'ON_ASK_DODGE': (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         
         const allies = state.players.filter(p => p.id !== playerId && p.isAlive && p.faction === 'Sơn' && p.hand.some(c => c.name === 'Né'));
         if (allies.length === 0) return false; // Không có ai giúp được`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
