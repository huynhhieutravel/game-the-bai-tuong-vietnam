const fs = require('fs');
let code = fs.readFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', 'utf8');

code = code.replace(
`- [ ] **Đinh Điền** (Sơn)
  - Kiểm tra \`Trung Dũng\`, \`Đồng Sinh\`.`,
`- [ ] **Đinh Điền** (Sơn)
  - Kiểm tra \`Phạt Tội\`, \`Quân Cơ\`, \`Định Quốc\`.`
);

fs.writeFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', code);
console.log("Success");
