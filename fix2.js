const fs = require('fs');
let content = fs.readFileSync('client/src/engine/ai/botLogic.js', 'utf8');
content = content.replace(/\}const validTargets = allAlive\.filter.*?\n.*?\n.*?\n.*?\n\s+\}/s, '}');
fs.writeFileSync('client/src/engine/ai/botLogic.js', content);
