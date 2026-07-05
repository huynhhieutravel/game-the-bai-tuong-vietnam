const fs = require('fs');
let taskCode = fs.readFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', 'utf8');

taskCode = taskCode.replace(
`  - [/] Kiểm tra từng tướng của Hệ Lạc (Lang Liêu, Lạc Long Quân, Chử Đồng Tử, Tiên Dung, v.v...)`,
`  - [x] Kiểm tra từng tướng của Hệ Lạc (Đã sửa lỗi Lang Liêu Bánh Chưng state mutation, Khai Thiên virtual card, Thần Giáp Rùa Vàng, v.v...)`
);

fs.writeFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/task.md', taskCode);
console.log("Success");
