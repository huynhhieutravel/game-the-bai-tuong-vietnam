const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`    hooks: {
      'BEFORE_ASK_DODGE': (dispatcher, state, playerId, payload) => {`,
`    hooks: {
      'ON_ASK_DODGE': (dispatcher, state, playerId, payload) => {`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
