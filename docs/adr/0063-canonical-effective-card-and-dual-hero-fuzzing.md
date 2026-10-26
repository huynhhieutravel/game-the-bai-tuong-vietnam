# ADR 0063: Canonical Effective Card Resolver, UI Reaction Payload Contracts & Dual-Hero Combinatorial Fuzzing

## Trạng thái
Đã chấp thuận & Triển khai thành công (Accepted & Implemented)

## Bối cảnh (Context)
Dù hệ thống đã đạt 75/75 file test Vitest (649/649 tests) và 1,000 trận giả lập Bot (`sim:app`, `sim:core`) thành công không lỗi, người dùng thực tế trên iPhone (Xcode / Capacitor) và Web vẫn thỉnh thoảng gặp lỗi logic hoặc nút bấm bị mờ/kẹt (deadlock/watchdog timer 15s).

Qua phân tích chuyên sâu mã nguồn dự án, nguyên nhân gốc rễ (Root Causes) đã được xác định:
1. **Điểm Mù Bot Giả Lập (Headless Bot Blindspot):** Các trận giả lập bot chạy thuần trên bộ nhớ qua `BotBrain.js` và trực tiếp gọi `engine.dispatch()`. Bot hoàn toàn không chạm vào DOM React, không mở `ModalContainer.jsx`, không đi qua `useCardInteraction.js` hay thao tác cảm ứng chạm chọn của con người.
2. **Sự Tách Biệt Lọc Thẻ Bài Thô Ở Client UI:** Nhiều modal giao diện (`DodgeModal.jsx`, `BinhLoanModal.jsx`, `HoaCongDiscardModal.jsx`, `ModalContainer.jsx`, `AskWeaponSkillModal.jsx`) tự lọc thẻ bài dựa trên thuộc tính vật lý thô (`c.color === 'red'`, `c.suit === 'spade'`) thay vì truy vấn hàm hiệu dụng từ Engine (`getEffectiveColor`, `getEffectiveSuit`). Khi người chơi sử dụng tướng biến đổi chất (như Quốc Sắc của Ngọc Hân Công Chúa: Bích biến thành Cơ/Đỏ), giao diện Client coi thẻ bài là Đen và vô hiệu hóa nút bấm, trong khi Engine coi thẻ bài là Đỏ.
3. **Bùng Nổ Tổ Hợp Song Tướng (741 Cặp Tướng):** 39 vị tướng trong chế độ Quốc Chiến tạo ra $\binom{39}{2} = 741$ cặp song tướng. Các bài Unit Test hiện tại chủ yếu kiểm thử từng vị tướng đơn lẻ mà chưa quét toàn bộ các xung đột chéo giữa tướng đổi chất/màu và tướng có kỹ năng tiêu hao theo chất/màu.
4. **Sai Lệch Hợp Đồng Payload (Payload Contract Mismatch):** Khi Client phản hồi qua `gameAPI.respond(payload)`, một số modal truyền tên trường không đồng nhất với `DispatcherV4._handleReact()` (ví dụ: `cardIdx` thay vì `cardId`, `suit` thay vì `selectedSuit`), khiến Engine không nhận diện được và đẩy người chơi vào trạng thái chờ hết 15s của Watchdog Timer.

## Quyết định Thiết kế (Decisions)

### 1. Thống Nhất Bộ Lọc Thẻ Hiệu Dụng Đồng Nhất (Single Source of Truth)
- Xuất khẩu trực tiếp các helper chuẩn mực từ Engine sang Client:
  `getEffectiveSuit(card, player)`, `getEffectiveColor(card, player)`, `getEffectiveCard(card, player)`.
- Rà soát và thay thế toàn bộ các phép so sánh thô `card.suit === '...'` và `card.color === '...'` tại tất cả các component Modal và Hand sang bộ lọc hiệu dụng.

### 2. Xây Dựng Kịch Bản Fuzzing Ma Trận Song Tướng (`fuzz_dual_heroes.mjs` & Vitest Matrix)
- Tự động hóa kiểm thử tổ hợp 741 cặp song tướng, đặc biệt chú trọng 12 vị tướng có kỹ năng can thiệp bài/chất/màu:
  - Ngọc Hân Công Chúa (Quốc Sắc: Bích -> Cơ/Đỏ)
  - Thần Trụ Trời (Khai Thiên: Đỏ -> Chém)
  - Triệu Quang Phục (Linh Giám: Đen -> Hóa Giải)
  - Trần Quang Khải (Chương Dương: Đen -> Chém)
  - Nguyễn Bặc (Bình Loạn: 2 lá cùng chất -> Loạn Tiễn)
  - Đinh Điền (Quân Cơ: Đen -> Thay bài phán xét)
  - Nguyễn Lữ (Thính Chính: Đen -> Né)
  - Tuệ Tĩnh (Nam Dược: Đỏ ngoài lượt -> Đào)
  - Rùa Vàng (Thần Hỏa: Đỏ -> Hỏa Công)
  - Dã Tượng (Kỳ Tập: Đen -> Tước Bài)
  - Sơn Tinh (Dời Núi: Chém/Né hoán đổi)
  - Công Chúa An Tư (Hòa Thân: Rô -> Hỗn Loạn)

### 3. Nâng Cấp Tầng Test UI Reaction Contract
- Chuyển đổi bộ test `client/src/components/__tests__/modals.test.jsx` từ việc chỉ kiểm tra `expect(container).toBeTruthy()` sang kiểm tra hành vi tương tác thực tế (Integration Test):
  - Kích hoạt modal với dữ liệu mô phỏng.
  - Chọn thẻ bài hợp lệ (kể cả thẻ bài đã qua biến đổi chất).
  - Bấm xác nhận và kiểm tra payload gửi về `gameAPI.respond(payload)` có chứa đầy đủ và chính xác các trường `cardId`, `targetId`, `doProvide`, `selectedSuit`.
