# Changelog

All notable changes to this project will be documented in this file.

## [v3.1] - 2026-07-05

### 🚀 Nâng Cấp Kiến Trúc (Architecture Upgrade)
- **Tách File & Tái Cấu Trúc:**
  - Tách thành công "God Object" `SkillRegistry.js` (gần 3,000 dòng) thành các file riêng biệt theo phe (`combat.js`, `passive.js`, `neutral.js`, `lac.js`, `son.js`, `viet.js`).
  - Tách `GameView.jsx` (từ 1,666 dòng xuống còn ~250 dòng shell). Các logic chọn mục tiêu, kích hoạt kỹ năng, tương tác thẻ bài đã được module hóa thành các custom hooks (`useTargeting`, `useSkillExecution`, `useCardInteraction`).
  - Loại bỏ hoàn toàn Legacy Bridge (`engine/index.js` wrapper lồng nhau) - UI hiện tại giao tiếp trực tiếp qua cổng `GameAPI.js`.

### 🐛 Sửa Lỗi Tiềm Ẩn (Edge Cases & Bug Fixes)
- Fix lỗi vòng lặp vô hạn của `BotRunner` do gửi sai type event kiểu cũ `type: 'play'` thay vì `ACTION_PLAY_CARD` của Dispatcher mới.
- Fix lỗi crash game (`EVENT_DEATH`) khi xử lý đưa bài từ Khu Vực Phán Xét (Judgement Area) vào Mộ Bài mà dữ liệu khởi tạo bị `undefined`.

### 🧪 Deep QA & Test Coverage (Phase 4.1)
- Viết thành công **111 Test Cases**, đạt tỷ lệ Pass 100%, bao phủ logic kỹ năng, hooks và flow khép kín.
- Thiết lập Stress Test mô phỏng 4 Bots tự động đấu với nhau bằng `BotRunner` và `Dispatcher` liên tục.
- **Giải quyết 4 Deep Edge Cases cốt lõi của Engine:**
  1. **Chuỗi 4 lá Hóa Giải liên hoàn:** Xử lý trạng thái `isNegated` lật chính xác. Cẩm nang gốc hoạt động hoặc bị hủy đúng như logic lật cuối cùng.
  2. **Quyết Đấu tự sát:** Tự dùng Quyết Đấu đánh người khác và bị chém ngược lại đến chết. Vòng lặp kết thúc đúng mà không bị treo.
  3. **Luật phản bội:** Giết đồng minh cùng Faction bị phạt lột sạch trang bị và bài trên tay chuẩn xác.
  4. **Luật thưởng lập công:** Giết địch phe khác được thưởng rút bài chính xác, khắc phục luôn lỗi thiếu vũ khí cự ly.

## [v3.0] - Trước 2026-07-05
- Bản cập nhật cấu trúc cơ bản, chuyển đổi từ codebase cũ sang Engine Core mới (`Dispatcher.js`, `CombatHandler`, `State`).
