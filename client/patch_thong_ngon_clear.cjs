const fs = require('fs');
const file = 'src/engine/registries/SkillRegistry.js';
let content = fs.readFileSync(file, 'utf8');

const clearHook = `        after_EVENT_APPLY_DRAW: (dispatcher, state, payload) => {`;
const replaceHook = `        after_EVENT_TURN_END: (dispatcher, state, payload) => {
             state.players.forEach(p => { p.unlimitedRangeThisTurn = false; });
        },
        after_EVENT_APPLY_DRAW: (dispatcher, state, payload) => {`;

content = content.replace(clearHook, replaceHook);
fs.writeFileSync(file, content);
