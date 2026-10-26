# 0065. Rà Soát QA Toàn Diện: Cơ Chế Triệt Tiêu Dead Actor Tránh Đứng Hình Và Chuẩn Hóa Màu Sắc Song Tướng

**Ngày:** 2026-10-24  
**Trạng thái:** Accepted  
**Tác giả:** Antigravity Team & huynhhieutravel  

---

## 1. Ngữ cảnh (Context)
Trong quá trình chơi thử nghiệm trên thiết bị di động (iPhone 15 Pro Max) và mô phỏng tải cao, người chơi gặp phải tình trạng trò chơi bị đứng hình (deadlock / freeze) giữa các lượt chơi. Khi kiểm thử chuyên sâu theo Tiêu chuẩn Hero QA SOP 6 bước (`.agents/skills/qa-hero-viet-sat/SKILL.md`), chúng tôi đã phân tích và phát hiện 4 nguyên nhân gốc rễ dẫn đến lỗi đứng hình:

1. **Lệch màu sắc hợp lực giữa các tướng (Synergistic Color Conflict):**
   - Ví dụ: Cặp song tướng **Nguyên Phi Ỷ Lan** (kỹ năng *Thính Chính*: mọi lá bài màu Đen đều được dùng như [Né]) kết hợp cùng **Trần Hưng Đạo** (kỹ năng *Khai Thiên*: mọi lá bài trên tay đều biến thành màu Đỏ).
   - `BotBrain.js` trước đây chỉ kiểm tra trực tiếp thuộc tính thô `card.color === 'black'`. BotBrain chọn một lá [Chém] chất Đen để né đòn, nhưng khi đẩy vào `CombatRules.respondDodge`, hiệu ứng *Khai Thiên* chuyển toàn bộ bài thành Đỏ. Việc này khiến luật chơi báo lỗi `Lá bài không phải là lá [Né] hợp lệ!` và làm ngưng trệ vòng lặp trò chơi.
2. **Kẹt Frame Phản hồi khi Người chơi Tử trận (Dead Player PriorityStack Deadlock):**
   - Khi một người chơi tử trận trong chuỗi công kích (ví dụ trong trận Quyết Đấu `ASK_SLASH_DUEL`, đợt Dã Man `ASK_SLASH_RESPONSE`, hoặc các đòn kỹ năng liên hoàn), nếu các khung phản hồi (`PriorityFrame`) vẫn còn lưu `targetId` hoặc `currentActorId` của người đã khuất, trò chơi sẽ chờ đợi một người chơi đã chết phản hồi vô thời hạn.
3. **Lỗi Ràng Buộc Thẻ Bài Bỏ Trong Pha Bỏ Bài (Discard Phase Invariant Mismatch):**
   - Trong `StateMachine.handleDiscard`, nếu số lượng thẻ gửi xuống không khớp chính xác với `cardsToDiscard` (do người dùng click nhầm, lỗi giao diện hoặc biến động bài tay), hệ thống văng lỗi ngoại lệ và không giải phóng `ASK_DISCARD` frame khỏi `priorityStack`.
4. **Xung Đột Actor Trong Cửa Sổ Ưu Tiên (Priority Actor Race Conditions):**
   - Khi có nhiều người chơi cùng nhận yêu cầu hoặc thao tác phản hồi gửi lệch thứ tự (out-of-turn skips/cancels), việc thiếu chốt chặn Authoritative Actor khiến frame bị giải phóng sai người hoặc nuốt gói tin.

---

## 2. Quyết định Kỹ thuật (Decisions)

### 2.1. Chuẩn hóa màu sắc thẻ bài qua HeroRegistry
- Bắt buộc mọi vị trí tính toán chất/màu bài trong `BotBrain.js`, `DispatcherV4.js`, `CombatRules.js`, và `TargetResolverV4.js` phải gọi qua `globalHeroRegistry.getEffectiveColor(player, card)` và `globalHeroRegistry.getEffectiveSuit(player, card)`.
- Khi lá bài gửi vào `CombatRules.respondDodge` không hợp lệ, Dispatcher tự động giáng cấp bài về `null` thay vì văng ngoại lệ làm crash StateMachine; người chơi sẽ nhận sát thương an toàn theo đúng luật Tam Quốc Sát.

### 2.2. Cơ chế Thanh tẩy Toàn diện Khi Tử Trận (Universal PriorityFrame Death Purge)
- Trong `CombatRules.handleDeath(state, deadPlayerId, killerId)`:
  1. Loại bỏ toàn bộ `deadPlayerId` khỏi tất cả các hàng đợi `priorityQueue` trong stack.
  2. Xóa sổ tức thì các trận Quyết Đấu `ASK_SLASH_DUEL` liên quan đến người đã khuất.
  3. Tự động thanh tẩy mọi `PriorityFrame` đơn lẻ mà người đã khuất là mục tiêu duy nhất (`frame.targetId === deadPlayerId`).
  4. Nếu người đã khuất là `currentActorId`, tự động đẩy quyền phản hồi cho người kế tiếp trong `priorityQueue`; nếu không còn ai, pop frame ngay lập tức.

### 2.3. Tự Động Phục Hồi Thẻ Bỏ Bài (Auto-fallback Discard Limit)
- Trong `DispatcherV4.js` (`_handleDiscard` và `case 'ASK_DISCARD'`):
  - Tính toán `required = Math.min(player.hand.length, cardsToDiscard)`.
  - Nếu danh sách thẻ bài gửi lên không đúng số lượng hoặc chứa thẻ không hợp lệ, Dispatcher tự động chọn `required` lá đầu tiên từ trên tay để hoàn tất việc bỏ bài, pop frame và chuyển sang pha `END`.

### 2.4. Bổ sung Watchdog & Timeout Safety ở Client UI
- Trong `GameView.jsx` (`confirmPlayCard`), bao bọc logic thực thi trong `try/finally` kèm `setTimeout` 500ms giải phóng cờ `isActionPending.current`.
- Trong `useCardInteraction.js` (`confirmDiscard`), bảo vệ mảng thẻ bài bằng `player.hand[idx]?.id` và `.filter(Boolean)`.

---

## 3. Kết quả Kiểm định (Verification)
1. **Unit Test Suite:**
   - 76/76 test files passed (663/663 unit tests).
2. **Fuzzing Ma Trận Song Tướng:**
   - 741/741 cặp song tướng với 2.964 thẻ bài kiểm thử biến đổi đạt 100% không lỗi (`fuzz_dual_heroes.mjs`).
3. **Đại Giả Lập 1.000 Trận Tầng Ứng Dụng (Application Layer Stress Test):**
   - 1.000/1.000 trận mô phỏng qua Dispatcher V4 hoàn tất trọn vẹn trong 2.04 giây, 0 lỗi ngoại lệ, 0 deadlock.
4. **Mô Phỏng Cốt Lõi 1.000 Trận (Core Engine Simulation):**
   - 1.000/1.000 trận hợp lệ, 0 lỗi Invariant.
5. **Triển khai Trực Tiếp:**
   - Biên dịch và đồng bộ Capacitor iOS thành công (`dist/` -> `client/ios/App/App/public`).
   - Cài đặt và khởi chạy mượt mà trên iPhone 15 Pro Max ("Loki Phone") qua WiFi.
