const fs = require('fs');
const file = 'src/engine/botAI.js';
let content = fs.readFileSync(file, 'utf8');

const botLogic = `
    if (req.type === 'ask_thong_ngon' && req.askQueue && req.askQueue[0] === bot.id) {
        // Bot sẽ ưu tiên đưa 1 lá bài phế hoặc bài cơ bản (nếu dư thừa) cho đồng minh
        const target = state.players.find(p => p.id === req.targetId);
        // Kiểm tra xem target có phải là đồng minh không (Ví dụ target có hệ Hà thì chắc chắn là đồng minh nếu bot cũng hệ Hà)
        const isAlly = target && target.hp > 0; // Giả sử Bot hệ Hà thân thiện
        if (isAlly && bot.hand.length > 0) {
            // Chọn lá bài rác (ví dụ: Vũ khí cùi, hoặc Cẩm nang không cần thiết)
            // Đơn giản hóa: đưa lá bài cuối cùng trên tay
            return { type: 'EVENT_ACTION_SKILL_RESPONSE', payload: { req, doReact: true, cardIndexSelected: bot.hand.length - 1 } };
        }
        return { type: 'EVENT_ACTION_SKILL_RESPONSE', payload: { req, doReact: false } };
    }
`;

content = content.replace(/(if \(req\.type === 'ask_hau_vien')/, botLogic + '\n    $1');
fs.writeFileSync(file, content);
