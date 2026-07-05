const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`      'ON_TARGETED_SLASH': (dispatcher, state, playerId, payload) => {
          if (playerId !== payload.sourceId) return false;`,
`      'ON_TARGETED_SLASH': (dispatcher, state, playerId, payload) => {
          console.log("[PHA QUAN] ON_TARGETED_SLASH called. playerId:", playerId, "sourceId:", payload.sourceId);
          if (playerId !== payload.sourceId) return false;`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
