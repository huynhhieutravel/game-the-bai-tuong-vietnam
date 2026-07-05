const fs = require('fs');

// 1. SkillRegistry.js
let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');
skillCode = skillCode.replace(/       console\.log\("==AN BANG ON REACT==", payload\);\n\n/, '');
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);

// 2. heroes_son.test.js
let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');
testCode = testCode.replace(/      console\.log\("==TRƯỚC KHI REACT==", dispatcher\.state\.waitingForResponse\);\n/, '');
testCode = testCode.replace(/      console\.log\("==SAU KHI REACT==", dispatcher\.state\.waitingForResponse\);\n/, '');
testCode = testCode.replace(/      console\.log\("==STATE PLAYERS==", dispatcher\.state\.players\[0\]\);\n/, '');
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);

// 3. update task.md
let taskCode = fs.readFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', 'utf8');
taskCode = taskCode.replace(
`- [ ] **Huyền Trân Công Chúa** (Sơn)
  - Kiểm tra \`Hòa Thân\`, \`An Bang\`.`,
`- [x] **Huyền Trân Công Chúa** (Sơn)
  - Cập nhật \`An Bang\` xử lý state mutation (bằng SetFlagEffect). Test pass.
  - Cập nhật \`Hòa Thân\` xử lý state mutation. Test pass.`
);
fs.writeFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', taskCode);

console.log("Cleanup Done");
