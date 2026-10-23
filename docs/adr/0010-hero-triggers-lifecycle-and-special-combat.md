# 0010. Khôi Phục Vòng Đời Kích Hoạt Kỹ Năng Tướng & Cơ Chế Chiến Đấu Đặc Thù

- **Status:** Accepted
- **Date:** 2026-10-23

## Ngữ Cảnh (Context)
Trong quá trình kiểm tra toàn diện di chuyển luật cũ (`shared/engine/`) sang Engine v4 (`shared/engine_v4/`):
1. **Lỗi ngắt kết nối vòng đời kích hoạt Tướng (Hero Trigger Lifecycle Disconnection):**
   - Toàn bộ 34 vị tướng của 4 phe (`Lạc`, `Việt`, `Hà`, `Sơn`) đã được khai báo các khế ước kỹ năng (`SkillContract`) chuẩn với các trigger phản ứng:
     `BEGIN_PHASE`, `DRAW_PHASE`, `END_PHASE`, `ON_SLASH_TARGET`, `ON_DODGE_SUCCESS`, `ON_DAMAGED`, `ON_DYING`, `ON_TRICK_PLAYED`, `ON_EQUIP_LOST`, `ON_JUDGED`.
   - Hàm điều phối `globalHeroRegistry.dispatchTrigger(eventType, eventData, state)` đã được viết nhưng **chưa từng được gọi trong `StateMachine.js`, `CombatRules.js`, và `TrickRules.js`**, khiến cho trong các trận đấu thực tế và mô phỏng, kỹ năng bị động/phản ứng của Tướng không tự động kích hoạt.
2. **Kỹ năng Tướng Nhiếp Chính (Tô Hiến Thành):**
   - Theo luật, chỉ được miễn bỏ bài ở `_runPhaseDiscard()` nếu trong lượt đó **chưa từng sử dụng lá Chém nào** (`player.turnStats.slashCount === 0`).
3. **Cơ chế Vũ Khí Đặc Thù:**
   - **Song Kiếm (`Song Kiếm`):** Khi chém mục tiêu khác giới tính (Nam chém Nữ, Nữ chém Nam), ép mục tiêu bỏ 1 lá bài hoặc cho người chém rút 1 lá bài.
   - **Phương Thiên Kích (`Phương Thiên Kích`):** Khi lá Chém đánh ra là lá bài cuối cùng trên tay, quét thêm tối đa 2 mục tiêu khác trong tầm.
4. **Cẩm Nang Ảo Hỏa Công (`hoa_cong` - Fire Attack):**
   - Kỹ năng [Thần Hỏa] của Rùa Vàng cho phép dùng bài Đỏ như [Hỏa Công], nhưng `TrickRules` và `DispatcherV4` chưa có bộ xử lý cẩm nang `hoa_cong` và chuỗi gây sát thương Lửa kết hợp Xiềng Xích.
5. **Bảo toàn Thẻ bài trong Kỹ năng Tướng:**
   - Một số kỹ năng phán xét (Thánh Gióng, Thần Giáp, Thất Trảm Sớ, Phá Thành, Thông Ngôn) trực tiếp gọi `drawPile.pop()` với fallback object rác thay vì dùng `state.drawCardFromDeck()`, gây nguy cơ tạo bài trùng hoặc bài biến mất làm sai lệch Invariant.

## Quyết Định (Decision)

### 1. 🔄 Tích Hợp `dispatchTrigger` Vào StateMachine 6 Pha
- `_runPhaseBegin()`: Gọi `dispatchTrigger('BEGIN_PHASE', { sourceId: player.id }, this.state)` (Lang Liêu - Bánh Chưng, Nguyên Phi Ỷ Lan - Phật Tâm).
- `_runPhaseDraw()`: Gọi `dispatchTrigger('DRAW_PHASE', { sourceId: player.id }, this.state)` trước khi rút bài (Phùng Hưng - Khởi Nghĩa rút 1 bài nhận +1 sát thương, Triệu Quang Phục - Dạ Trạch, Đô Đốc Bảo - Phá Thành).
- `_runPhaseDiscard()`: Kiểm tra `globalHeroRegistry.hasSkill(player, 'nhiep_chinh_to_hien_thanh', true) && player.turnStats.slashCount === 0`.
- `_runPhaseEnd()`: Gọi `dispatchTrigger('END_PHASE', { sourceId: player.id }, this.state)` (Trần Quang Khải - Đoạt Sáo, Huyền Trân Công Chúa - An Bang).

### 2. ⚔️ Tích Hợp `dispatchTrigger` Vào CombatRules
- Trong `playSlash()`:
  - Kiểm tra `Song Kiếm`: Khác giới tính ép mục tiêu bỏ bài hoặc cho người chém rút bài.
  - Kiểm tra `Phương Thiên Kích`: Chém bài cuối cùng trên tay quét thêm mục tiêu trong tầm.
  - Phát sự kiện `ON_SLASH_TARGET`:
    - Cao Lỗ (Nỏ Thần): Nếu bài tay >= địch thì cấm Né (`slashEvent.unavoidable = true`); nếu HP <= địch thì +1 sát thương.
    - Nguyễn Xí (Phá Quân): Ép mục tiêu dùng 2 lá Né (`slashEvent.requiredDodges = 2`).
    - Thánh Gióng (Tre Ngà): Phán xét bắt bỏ bài cùng chất.
  - Nếu `slashEvent.unavoidable === true`, trực tiếp gây sát thương mà không mở khung hỏi Né.
- Trong `respondDodge()`:
  - Khi Né thành công, phát `ON_DODGE_SUCCESS` (Đinh Điền - Phạt Tội lập tức trừ 1 HP kẻ tấn công).
- Trong `applyDamage()`:
  - Sau khi trừ HP, phát `ON_DAMAGED` (Lý Thường Kiệt rút bài & thu hồi bài, Khúc Thừa Dụ - Khoan Dân, Đinh Bộ Lĩnh - Uy Chấn, Chu Văn An - Thất Trảm Sớ).
- Trong `enterDyingState()`:
  - Phát `ON_DYING` trước khi mở vòng cấp cứu `ASK_PEACH`. Nếu người chơi hồi phục sinh lực (Chử Đồng Tử - Hóa Tiên lên 3 HP, Nguyễn Địa Lô - Hộ Chủ lên 1 HP), lập tức giải phóng và thoát khỏi hấp hối.

### 3. 📜 Tích Hợp `TrickRules` & Kích Hoạt Cẩm Nang Hỏa Công
- Trong `playTrick()`: Phát sự kiện `ON_TRICK_PLAYED` (Tiên Dung - Duyên Tiên rút 1 bài khi dùng cẩm nang thường).
- Khi mất trang bị do Cướp Bài / Tước Bài hoặc thay thế trang bị trong `DispatcherV4`: Phát sự kiện `ON_EQUIP_LOST` (Hồ Xuân Hương - Xuân Hương rút 2 lá bài).
- Khi phán xét có hiệu lực trong `resolveJudgementPhase()`: Phát sự kiện `ON_JUDGED` (Ngọc Hân Công Chúa - Thông Ngôn thu hồi lá phán xét).
- Thêm cơ chế `Hỏa Công` (`hoa_cong`):
  - Mục tiêu lộ 1 lá bài trên tay.
  - Người chơi bỏ 1 lá bài cùng chất để kích hỏa gây 1 sát thương Lửa (`fire`).
  - Tự động tương thích với cơ chế truyền sát thương Xiềng Xích liên hoàn.

### 4. 🛡️ Chuẩn Hóa An Toàn Thẻ Bài (`state.drawCardFromDeck()`)
- Thay thế toàn bộ `state.drawPile.pop()` trong kỹ năng phán xét bằng `state.drawCardFromDeck()`.
- Thu hồi lá phán xét trong Thông Ngôn đồng thời lọc bỏ khỏi `state.discardPile` để bảo toàn tuyệt đối 100% Invariant thẻ bài.

## Hệ Quả (Consequences)
- Bộ kiểm thử Vitest mở rộng lên 22 test files với 155/155 tests passed (100% green), bao gồm 11 test case tích hợp chuyên sâu tại `HeroTriggersAndSpecialCombat.test.js`.
- Mô phỏng 1.000 trận đấu Song Tướng Engine v4 chạy thần tốc trong 0.82s:
  - 1000/1000 trận hoàn thành hợp lệ.
  - 0 lỗi Invariant, 0 Exception.
  - Tỉ lệ thắng 4 phe cực kỳ cân bằng (~25% mỗi phe).
