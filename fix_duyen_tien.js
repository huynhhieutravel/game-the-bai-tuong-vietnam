const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`                  dispatcher.addLog(\`✨ \${dispatcher.getHeroName(player)} phát động [Duyên Tiên], rút 1 lá bài do dùng Cẩm Nang!\`, 'important');
                  dispatcher.state.reactionStack.push({ type: 'EVENT_DRAW_CARDS', payload: { targetId: sourceId, amount: 1 } });`,
`                  console.log("TRIGGER DUYEN TIEN FOR PLAYER", sourceId);
                  dispatcher.addLog(\`✨ \${dispatcher.getHeroName(player)} phát động [Duyên Tiên], rút 1 lá bài do dùng Cẩm Nang!\`, 'important');
                  dispatcher.state.reactionStack.push({ type: 'EVENT_DRAW_CARDS', payload: { targetId: sourceId, amount: 1 } });`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
