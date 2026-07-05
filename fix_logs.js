const fs = require('fs');
let content = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

// Thay thế Object.assign(state, addLog(state, `...`, type)) -> dispatcher.addLog(`...`, type)
content = content.replace(/Object\.assign\(state,\s*addLog\(state,\s*([^,]+),\s*([^)]+)\)\);/g, 'dispatcher.addLog($1, $2);');

// Handle cases without type (default type)
content = content.replace(/Object\.assign\(state,\s*addLog\(state,\s*([^)]+)\)\);/g, 'dispatcher.addLog($1);');

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', content);
