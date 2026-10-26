# ADR 0068: Fix Thất Trảm Sớ Card Discard Selection and RangeSystem Dead Player Crash

## 1. Bối cảnh & Vấn đề (Context & Problems)
1. **Thất Trảm Sớ (Chu Văn An) bỏ bài tự động:**
   - Trong `ModalContainer.jsx`, modal phạt `ask_that_tram_so_punish` hardcode gửi phản hồi `cardIndexes: [0, 1]` ("Bỏ 2 Lá Bài (Tự động chọn 2 lá đầu)"), làm người chơi mất quyền tự tay lựa chọn 2 lá bài muốn bỏ trên tay.
2. **Crash đỏ giao diện khi có tướng tử trận (Ảnh 3 & 4):**
   - Lỗi: `Uncaught Error: [RangeSystem] Người chơi không tồn tại trong danh sách sống: 1 -> 0` tại `RangeSystem.js:41` được gọi từ `GameViewMapperV4.js:583` trong quá trình `toViewModel`.
   - Nguyên nhân: Khi người chơi bị thương tụt HP về 0 và đồng minh từ chối hoặc không có Đào cứu, người chơi chuyển trạng thái tử trận (`isAlive = false`). `toViewModel` duyệt qua danh sách toàn bộ người chơi (để hiển thị trạng thái bàn chơi) và gọi `calculateDistance`. `RangeSystem.calculateDistance` quăng ngoại lệ `throw new Error(...)` ngay khi một trong hai người chơi không có mặt trong mảng `alivePlayers`, gây sập toàn bộ React app.

## 2. Giải pháp thực thi (Solutions)
1. **Component [ThatTramSoPunishModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/ThatTramSoPunishModal.jsx):**
   - Hiển thị danh sách các lá bài trên tay với đầy đủ thông tin (chất bài, điểm số, tên lá bài, màu sắc).
   - Cho phép người chơi click chọn/hủy chọn linh hoạt (tối đa 2 lá). Khi chọn sang lá thứ 3, hệ thống tự động xoay vòng thay thế lá cũ nhất.
   - Nút "Bỏ 2 Lá Đã Chọn (x/2)" chỉ được kích hoạt (enabled) khi người chơi đã tự tay chọn đúng 2 lá bài và gửi payload `{ option: 'discard', cardIds: selectedIds }`.
   - Người chơi luôn có quyền chọn "💥 Nhận 1 Sát Thương" nếu không muốn bỏ bài.
   - Nếu người chơi có dưới 2 lá bài trên tay, hệ thống ghi chú rõ và chỉ cho phép chọn "💥 Nhận 1 Sát Thương".
2. **Khắc phục triệt để Crash trong [RangeSystem.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/RangeSystem.js) & [GameViewMapperV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/GameViewMapperV4.js):**
   - Trong `RangeSystem.calculateDistance`: Thay vì quăng `Error`, nếu `sourceIdx === -1 || targetIdx === -1` (hoặc `alivePlayers` rỗng), hàm an toàn trả về `999` (khoảng cách vô cực/ngoài tầm với).
   - Trong `GameViewMapperV4.js`: Bọc `try-catch` khi tính khoảng cách và chỉ tính toán `distances` cho người chơi còn sống (`p.isAlive`), đồng thời gán `pVM.distanceFromMe = (me && p.isAlive && me.isAlive) ? calculateDistance : (p.isAlive ? 1 : '-')`.

## 3. Kiểm chứng (Verification)
- Đã viết unit test chuyên sâu: [ThatTramSoAndDeadPlayerQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/ThatTramSoAndDeadPlayerQA.test.jsx).
- Chạy toàn bộ 78 test suites (671 tests) với kết quả 100% Pass.
- Chạy `npm run cap:build` biên dịch vite bundle và đồng bộ Capacitor sync Android & iOS hoàn tất.
