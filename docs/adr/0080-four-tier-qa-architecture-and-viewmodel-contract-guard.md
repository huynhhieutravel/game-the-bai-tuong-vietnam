# ADR 0080: Kiến Trúc QA 4 Tầng, ViewModel Contract Guard & Giả Lập Lai Human-Bot

## Trạng thái
Đã chấp thuận (Accepted) — Triển khai ngày 25/10/2026

## Bối cảnh (Context)
Dù hệ thống kiểm thử tự động đã đạt 87/87 test suites và 765 tests passed, người chơi khi trải nghiệm trực tiếp trên trình duyệt vẫn gặp lỗi nghiêm trọng (như lỗi Quyết Đấu bị "im luôn", lỗi Hỗn Loạn không hỏi Hóa Giải). 

Sau khi mổ xẻ kiến trúc (Grill Session), chúng tôi phát hiện **3 Điểm mù chết người (Testing Blind Spots)**:
1. **Unit Test cô lập (Bypassed UI ViewModel):** Các bài test kiểm tra hàm logic nội bộ (`TrickRules`, `CombatRules`, `DispatcherV4`) bằng cách nạp trực tiếp tham số `playerId = 0`, không đi qua hàm biến đổi dữ liệu giao diện `toViewModel(state, 0)`.
2. **Giả lập chỉ có Bot (Bypassed React UI Components):** Các kịch bản giả lập 200 hoặc 1.000 ván đấu sử dụng 4 Bot tự động. Bot đọc trực tiếp từ `frame.currentActorId` trong bộ nhớ, không bao giờ đọc `vm.waitingForResponse` và không bao giờ render các React Component (`ModalContainer.jsx`).
3. **Mù màu với giá trị biên 0 (Zero-Falsy Blindness):** Người chơi chính (Bạn) luôn có ID = 0. Do `0` là giá trị falsy trong JavaScript (`Boolean(0) === false`), mọi toán tử `||` như `frame.currentActorId || frame.targetId` đều âm thầm nuốt số 0 và gán ID của đối thủ (ví dụ số 3) cho người chơi.

## Quyết định Kiến trúc (Decisions)

Thiết lập **Kiến Trúc Kiểm Thử 4 Tầng (Four-Tier QA Architecture)** bắt buộc:

### Tầng 1: Unit Rules & Hero Skills (Logic Luật Cốt Lõi)
- Kiểm tra tính đúng đắn của từng lá bài, từng kỹ năng của 39 tướng theo luật Việt Sát.
- Bảo đảm tính bất biến (Invariant) về máu, bài trên tay, chồng bài bỏ, tầm đánh và liên hoàn xích.

### Tầng 2: ViewModel Contract Guard (`ViewModelContractGuard.test.js`)
- Kiểm tra giao ước hợp đồng dữ liệu giữa Game Engine và UI Client.
- Duyệt qua **100% tất cả các loại Frame trên PriorityStack** (`ASK_SLASH_DUEL`, `ASK_SLASH_RESPONSE`, `ASK_NEGATE`, `ASK_DODGE`, `ASK_PEACH`, `ASK_DISCARD`, `ASK_HAU_VIEN`, `ASK_WEAPON_SKILL`, `ASK_DISMANTLE`, `ASK_SNATCH`,...).
- Ép kiểm tra với `currentActorId = 0`. Tuyệt đối cấm mọi trường hợp `vm.waitingForResponse.responderId` bị biến đổi thành ID khác do toán tử falsy `||`.

### Tầng 3: Modal Container Integration QA (`ModalContainerIntegrationQA.test.jsx`)
- Sử dụng `@testing-library/react` để render thực tế `<ModalContainer />`.
- Giả lập `me.id = 0` và nạp từng trạng thái phản ứng.
- Khẳng định: Pop-up tương ứng PHẢI xuất hiện trên DOM (`document.body`), hiển thị chính xác tên đối thủ, các lá bài phản hồi hợp lệ (kể cả kỹ năng chuyển đổi bài như Khai Thiên, Dời Núi), và nút bấm kích hoạt chính xác action dispatch.

### Tầng 4: Hybrid Human-Bot Simulation (`HybridHumanBotSimulation.test.js`)
- Mô hình giả lập lai: **1 Người Thật (Player 0) + 3 Bots**.
- Người chơi 0 KHÔNG ĐƯỢC đọc ngầm state của Engine. Người chơi 0 hành động 100% dựa trên `toViewModel(state, 0).waitingForResponse`.
- Nếu Engine rơi vào trạng thái chờ Người chơi 0 nhưng `waitingForResponse` không thông báo cho Người chơi 0, runner lập tức ném lỗi `DEADLOCK_DETECTED / VIEWMODEL_DESYNC`.

### Cổng Chặn Cửa & Đại Giả Lập 1.000 Trận:
- Tạo lệnh kiểm thử tổng hợp chạy tuần tự cả 4 tầng: `npm run qa:full`.
- Kịch bản Đại giả lập 1.000 trận Song Tướng (`run_1000_matches.mjs`) và 1.000 trận Lai Human-Bot (`run_1000_hybrid_matches.mjs`):
  + **1.000 Trận Song Tướng Headless:** 1000/1000 trận hoàn thành hợp lệ, 0 lỗi Invariant / Exception. Bảo toàn 100% thẻ bài (bao gồm thẻ bài trong transit frame của PriorityStack).
  + **1.000 Trận Lai Human-Bot:** 1000/1000 trận hoàn thành hợp lệ trong 3.50s, 0 deadlock, 0 desync, xử lý 15.760 phản xạ của Người chơi 0 qua `toViewModel(state, 0)`.
- Bất kỳ PR hay bản cập nhật nào chỉ được coi là hoàn tất khi `npm run qa:full` đạt tỷ lệ 100% thành công.

## Hệ quả & Giá trị mang lại (Consequences)
- Triệt tiêu hoàn toàn khoảng trống giữa logic Engine và hiển thị React UI.
- Phát hiện ngay lập tức mọi lỗi falsy `0`, lỗi không hiện pop-up, lỗi bot không đánh hoặc người không có nút bấm trước khi người dùng kịp mở trình duyệt.
- Nâng cao độ tin cậy và sự ổn định lâu dài của toàn bộ dự án.
