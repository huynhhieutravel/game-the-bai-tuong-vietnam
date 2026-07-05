const fs = require('fs');
const file = 'src/engine/botAI.js';
let content = fs.readFileSync(file, 'utf8');

const botLogic = `
    if (req.type === 'ask_hau_vien' && req.sourceId === bot.id) {
        // Bot sẽ luôn nhường Đào cho Hậu Viện nếu máu của target Hậu Viện rất thấp (<= 1)
        const targetId = req.targets.find(tid => {
           const t = state.players.find(p => p.id === tid);
           return t && t.hp <= 1;
        });
        if (targetId) {
            return { type: 'EVENT_ACTION_SKILL_RESPONSE', payload: { req, doReact: true, targetId } };
        }
        return { type: 'EVENT_ACTION_SKILL_RESPONSE', payload: { req, doReact: false } };
    }
`;

content = content.replace(/(if \(req\.type === 'ask_tien_phat')/, botLogic + '\n    $1');
fs.writeFileSync(file, content);
