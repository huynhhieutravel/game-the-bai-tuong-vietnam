const fs = require('fs');

let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const regex = /'quan-co': \{\s*id: 'quan-co'[\s\S]*?(?=\s*'dinh-quoc': \{)/;

const newQuanCo = `'quan-co': {
    id: 'quan-co',
    name: 'Quân Cơ',
    type: SKILL_TYPES.PASSIVE,
    // Logic của Quân Cơ (thay thế bài phán xét) đã được xử lý trong TrickHandler.js (EVENT_JUDGE)
    // và Dispatcher.js (ACTION_REACT cho ask_quan_co)
  },`;

code = code.replace(regex, newQuanCo + '\n');
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
