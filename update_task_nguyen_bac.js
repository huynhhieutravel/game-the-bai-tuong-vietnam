const fs = require('fs');
let code = fs.readFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', 'utf8');

code = code.replace(
`- [ ] **Nguyễn Bặc** (Sơn)
  - Kiểm tra \`Bình Loạn\`, \`Khai Quốc\`.`,
`- [x] **Nguyễn Bặc** (Sơn)
  - Đã fix lỗi state mutation trong \`Bình Loạn\`. Đã tích hợp \`Khai Quốc\` vào \`TurnRules.js\` (chưa có trước đó). Test passed.`
);

fs.writeFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', code);
console.log("Success");
