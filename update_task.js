const fs = require('fs');

let taskCode = fs.readFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', 'utf8');

taskCode = taskCode.replace(
`- [ ] **Đinh Điền** (Sơn)
  - Kiểm tra \`Phạt Tội\`, \`Quân Cơ\`, \`Định Quốc\`.`,
`## Phase 2B: Code lại và QA 4 Tướng Hệ Sơn Cuối Cùng
- [/] **Đinh Điền** (Sơn)
  - [ ] Code lại \`Quân Cơ\` (Quỷ Đạo)
  - [ ] Code lại \`Định Quốc\` (Hoàng Thiên)
  - [ ] QA Đinh Điền
- [ ] **Lê Ngân** (Sơn)
  - [ ] Code lại \`Hộ Giá\` (Triền Oán)
  - [ ] Code lại \`Trung Dũng\` (Cổ Hoặc)
  - [ ] QA Lê Ngân
- [ ] **Đô đốc Bảo** (Sơn)
  - [ ] Code lại \`Phá Thành\` (Song Hùng)
  - [ ] QA Đô đốc Bảo
- [ ] **Nguyễn Xí** (Sơn)
  - [ ] Củng cố và QA \`Phá Quân\` (Vô Song)
  - [ ] QA Nguyễn Xí`
);

fs.writeFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', taskCode);
console.log("Success");
