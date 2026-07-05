const fs = require('fs');
let code = fs.readFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', 'utf8');

code = code.replace(
`- [ ] **Tuệ Tĩnh** (Sơn)
  - Kiểm tra \`Nam Dược\` (bị động).
  - Kiểm tra \`Diệu Dược\` (bơm máu chủ động).`,
`- [x] **Tuệ Tĩnh** (Sơn)
  - Đã fix lỗi mutate state khi dùng splice trên bài tay lúc lấy Diệu Dược.
  - Nam Dược hoạt động chuẩn xác nhờ fix từ Hệ Lạc.`
);

fs.writeFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', code);
console.log("Success");
