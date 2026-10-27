# ADR 0103: Hỗ Trợ Mượn Đao Chọn Vũ Khí (Thanh Long Đao Đa Cấu Trúc) & Loại Bỏ Triệt Để Đứng Hình Trong BotRunner (Zero Freeze Invariant)

## 1. Bối cảnh & Vấn đề (Context & Problem)
1. **Lỗi chọn mục tiêu Mượn Đao Diệt Địch (Borrow Sword with Thanh Long Đao):**
   - Người chơi sử dụng [Mượn Đao Diệt Địch] muốn mượn Thanh Long Đao (tầm = 3) của đối thủ để chém kẻ khác.
   - Tuy nhiên, trong ViewModel React phía client, `player.equipment` được lưu dưới dạng mảng (Array) các thẻ bài trang bị thay vì đối tượng `{ weapon, armor, horse_attack, horse_defense }`.
   - `RangeSystem.js` và `TargetResolverV4.js` trước đây chỉ đọc `source.equipment?.horse_attack` hoặc gọi `RangeSystem.getWeaponRange(e.name)` (vốn hàm này chưa từng tồn tại trên `RangeSystem` static class).
   - Hậu quả: `RangeSystem.getAttackRange` fallback về 1. Đối thủ mang Thanh Long Đao nhưng chỉ được tính tầm 1, không với tới ai, dẫn đến bộ lọc `validVictims.length === 0` và loại bỏ đối thủ khỏi danh sách mục tiêu hợp lệ ở bước 1!
   - Thêm vào đó, trên giao diện `PlayerBoard.jsx`, thẻ đối thủ có mini equipment row chặn sự kiện click (`e.stopPropagation()` để mở HeroPopup), khiến người chơi bấm trúng ô vũ khí của đối thủ thì lại hiện popup xem trang bị thay vì chọn mục tiêu.

2. **Lỗi đứng hình 5-6 giây sau Loạn Tiễn / Vạn Tiễn (BotRunner Timer Freeze):**
   - Khi có cẩm nang diện rộng (Loạn Tiễn, Vạn Tiễn) hoặc đọ Chém/Né liên hoàn:
   - Các Bot lần lượt vào hàng đợi phản hồi và đặt `setTimeout` với cờ `isProcessing = true`.
   - Nếu người chơi người dùng đánh lá [Né] làm giải phóng nhanh `PriorityFrame` (`priorityStack.isEmpty()`), Engine phát ra `onStateUpdate` mới (báo trạng thái trở lại Action Phase của Bot đi trước).
   - Tuy nhiên, vì `this.isProcessing` vẫn đang là `true` (timer phản ứng cũ chưa kịp chạy xong), hàm `onStateUpdate(state)` vứt bỏ sự kiện (`if (this.isProcessing) return;`).
   - Đến khi timer cũ chạy xong, nó phát hiện `latestFrame` không còn tồn tại nên chỉ đặt `this.isProcessing = false` rồi kết thúc trong im lặng mà **không hề đánh thức lại trạng thái mới**!
   - Kết quả: Trận đấu bị treo cứng (đứng hình 5-6 giây) cho đến khi người chơi phải bấm nút hoặc timeout.

---

## 2. Quyết định Kiến trúc (Architectural Decisions)

### 2.1. Đa Cấu Trúc Trang Bị (Array & Object Equipment Compatibility)
- Bổ sung hàm tiện ích `getEquipmentSlot(player, slot)` và phương thức chuẩn `RangeSystem.getWeaponRange(cardOrName)` vào [RangeSystem.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/RangeSystem.js).
- Hàm này tự động thích ứng hoàn hảo với cả 2 cấu trúc dữ liệu:
  - Dạng Object truyền thống của Engine: `player.equipment.weapon`, `player.equipment.armor`, v.v.
  - Dạng Mảng (Array) của ViewModel: tìm thẻ bài trang bị có `type === 'weapon'`, `subtype === 'equip_weapon'`, hoặc có tên trong `WEAPON_RANGE_MAP`.
- Cập nhật cả `RangeSystem.calculateDistance` (tính khoảng cách với Ngựa công/Ngựa thủ) và `RangeSystem.getAttackRange` (tính tầm đánh với Thanh Long Đao tầm 3, Phương Thiên Kích tầm 4, Kỳ Lân Cung tầm 5).
- Tinh gọn bộ lọc vũ khí trong `TargetResolverV4.js` (`case 'muon-dao'`) qua `Boolean(getEquipmentSlot(x, 'weapon'))`.

### 2.2. Ưu Tiên Chọn Mục Tiêu Trên Bàn Đấu (Targeting Priority on Player Board)
- Trong [PlayerBoard.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/PlayerBoard.jsx):
  - Khi đối thủ đang có cờ `isTargetable = true` (đang trong tầm chọn mục tiêu của Mượn Đao, Chém, Cướp Bài...), sự kiện nhấp vào hàng trang bị mini sẽ ưu tiên gọi `handleTargetClick(player.id)`.
  - Chỉ khi người chơi không ở trong chế độ chọn mục tiêu, nhấp vào hàng trang bị mới mở popup chi tiết `setHeroPopup`.

### 2.3. Cơ Chế Hàng Đợi Trạng Thái BotRunner (Pending State Queue - Zero Freeze Invariant)
- Trong [BotRunnerV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/BotRunnerV4.js):
  - Bổ sung thuộc tính `this.pendingState = null;`.
  - Khi `onStateUpdate(state)` được gọi trong lúc `this.isProcessing = true`, state mới nhất không bị vứt bỏ mà được lưu vào `this.pendingState = state;`.
  - Thêm phương thức `_finishProcessing()`: giải phóng cờ `isProcessing = false`, đồng thời kiểm tra nếu có `pendingState` thì tự động xả hàng đợi và gọi lại `this.onStateUpdate(pending);`.
  - Trong các nhánh timer phản ứng và hành động, nếu phát hiện `latestFrame` không còn tồn tại hoặc actor không còn là người cần phản hồi, BotRunner ngay lập tức gọi `this._finishProcessing()` và đánh thức `this.onStateUpdate(latestState)`.
  - Đảm bảo mạch điều khiển Bot luôn liên tục, loại bỏ hoàn toàn hiện tượng đứng hình hay đơ game.

---

## 3. Kết Quả Kiểm Định (Verification Results)
1. **Unit Test Chuyên Biệt:**
   - [BorrowSwordThanhLongAndBotRunnerQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/rules/BorrowSwordThanhLongAndBotRunnerQA.test.js): Pass 4/4 bài kiểm tra (nhận diện Thanh Long Đao tầm 3, Mượn Đao bước 1 chọn đúng người có Thanh Long Đao, cơ chế `pendingState` tự động kích hoạt sau processing).
2. **Toàn Bộ Test Suite:**
   - 112/112 test files passed 100% (967/967 tests).
3. **Build Bundle:**
   - `npm run build` thành công trong 488ms không có lỗi cú pháp.
