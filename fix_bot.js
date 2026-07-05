const fs = require('fs');
let content = fs.readFileSync('client/src/engine/ai/botLogic.js', 'utf8');

// Fix Hồi Xuân grouping
content = content.replace(
    /else if \(trick\.name === 'Dã Man' \|\| trick\.name === 'Loạn Tiễn' \|\| trick\.name === 'Đào Viên Kết Nghĩa' \|\| trick\.name === 'Ngũ Cốc Phong Đăng'\) \{/g,
    "else if (trick.name === 'Dã Man' || trick.name === 'Loạn Tiễn' || trick.name === 'Đào Viên Kết Nghĩa' || trick.name === 'Ngũ Cốc Phong Đăng' || trick.name === 'Hồi Xuân') {"
);

content = content.replace(
    /else if \(trick\.name === 'Sấm Sét' \|\| trick\.name === 'Hồi Xuân' \|\| trick\.name === 'Vô Trung Sinh Hữu'\) \{/g,
    "else if (trick.name === 'Sấm Sét' || trick.name === 'Vô Trung Sinh Hữu') {"
);

// Fix save block not returning explicitly
content = content.replace(
    /return \{ type: 'ACTION_REACT', payload: \{ playerId: bot\.id, responseType: 'play', data: \{ cardId: bot\.hand\[peachIdx\]\.id, virtualCardName: 'Đào' \} \} \};\n                \}\n            \}\n        \}\n        else if \(req\.type === 'ask_negate'\)/g,
    "return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[peachIdx].id, virtualCardName: 'Đào' } } };\n                }\n            }\n            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', req: req, data: { doReact: false } } };\n        }\n        else if (req.type === 'ask_negate')"
);

fs.writeFileSync('client/src/engine/ai/botLogic.js', content);
