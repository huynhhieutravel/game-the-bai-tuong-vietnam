const fs = require('fs');
const path = './client/src/engine/registries/EquipRegistry.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /([A-Z_]+):\s*\(\s*dispatcher,\s*state,\s*player,\s*payload\s*\)\s*=>\s*\{/g;
let count = 0;
content = content.replace(regex, (match, hookName) => {
    count++;
    return `${hookName}: (dispatcher, state, playerId, payload) => {\n         const player = state.players.find(p => p.id === playerId);`;
});

fs.writeFileSync(path, content);
console.log(`Replaced ${count} occurrences.`);
