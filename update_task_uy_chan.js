const fs = require('fs');
let code = fs.readFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', 'utf8');

code = code.replace(
`- [ ] **Đinh Bộ Lĩnh** (Sơn)
  - Kiểm tra \`Uy Chấn\`.`,
`- [x] **Đinh Bộ Lĩnh** (Sơn)
  - QA \`Uy Chấn\` thành công, logic prompt (ask_uy_chan) hoạt động chuẩn. Test passed.`
);

fs.writeFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', code);
console.log("Success");
