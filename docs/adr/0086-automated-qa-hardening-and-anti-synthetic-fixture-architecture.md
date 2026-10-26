# ADR 0086: Nâng Cấp Kiến Trúc QA Bất Khả Xâm Phạm & Xóa Bỏ Thiên Kiến Dữ Liệu Giả (Automated QA Hardening & Anti-Synthetic Fixture Architecture)

## 1. Bối cảnh & Phân tích Nguyên Nhân Sâu Xa (Root Cause & Post-Mortem)
Người dùng đặt ra câu hỏi then chốt: *"Tại sao lỗi Liên Nỏ / Vũ khí vẫn dính khi chơi thực tế mà lúc QA và chạy test suites trước đó lại không phát hiện ra?"*

Qua giải phẫu hệ thống kiểm thử, chúng tôi đã vạch ra 3 **"Điểm Mù Kiểm Thử" (Testing Blind Spots)** mang tính cấu trúc:

1. **Thiên Kiến Dữ Liệu Giả (Synthetic Fixture Bias):**
   - Trong các unit test viết tay trước đây, lập trình viên tạo mock card bằng tay bằng các slug tiếng Anh hoặc chuỗi đơn giản: `p0.equipment.weapon = { id: 'crossbow', name: 'Liên Nỏ' };`.
   - Trong trận đấu thật, bộ bài chuẩn [CardDeck.getStandardDeck()](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/cards/CardDeck.js) sinh ID tiếng Việt có dấu kèm timestamp ngẫu nhiên (`liên-nỏ-0-1792972291440_93`).
   - Các hàm kiểm tra dùng chuỗi tĩnh như `id.includes('crossbow')` hoặc `id.includes('thanh_long')` sẽ **PASS 100% trong test mock**, nhưng **FAIL 100% khi người thật chơi bài thật**.
2. **Điểm Mù Của Trí Tuệ Bot Trong Giả Lập Headless (AI Logic Bypass):**
   - Các kịch bản giả lập 1.000 trận sử dụng Bot AI. Bot AI kiểm tra điều kiện bằng `card.name === 'Liên Nỏ'` hoặc tự động ép slot trang bị bằng `card.name?.includes('Nỏ')`.
   - Bot không tương tác qua lớp UI `TargetResolverV4.canPlayCard` hoặc trạng thái kích hoạt của nút bấm trên thanh hành động (`ActionBar.jsx`), tạo ra khoảng cách lớn giữa "Bot chơi mượt mà" và "Người thật bị khóa nút".
3. **Thiếu Bộ Quét Tĩnh Ngăn Chặn Anti-Pattern (Missing Static Code Gate):**
   - Không có công cụ tự động cấm lập trình viên hoặc AI viết các phép so sánh chuỗi ID thủ công (`.includes('crossbow')`, `.equipment?.find()`).

---

## 2. Giải Pháp Kiến Trúc Nâng Cấp (Architectural Upgrades)

Nhằm chấm dứt vĩnh viễn việc phải "nhặt lỗi vặt bằng tay", hệ thống thiết lập **Kiến Trúc Phòng Thủ 4 Tầng Bất Khả Xâm Phạm**:

```
[ Tầng 1: Static Build Gate ] ──> audit_canonical_equip_usage.mjs (Cấm so sánh chuỗi ID thủ công)
              │
[ Tầng 2: Anti-Synthetic Fixture ] ──> Cấm mock card tự chế; 100% test dùng CardDeck thật
              │
[ Tầng 3: 108 Permutation Fuzzing ] ──> StandardDeck108PermutationQA.test.js (Fuzz toàn bộ 108 lá)
              │
[ Tầng 4: ViewModel Contract Guard ] ──> ViewModelWeaponContractQA.test.js (Bảo vệ canPlay & UI nút bấm)
```

### A. Tầng 1: Cổng Kiểm Tra Tĩnh Tự Động (`audit_canonical_equip_usage.mjs`)
- Tích hợp trực tiếp vào lệnh `npm test` và `npm run cap:build`.
- Tự động quét toàn bộ cây thư mục `shared/` và `client/`.
- **Cấm tuyệt đối**:
  1. Các lệnh `.id.includes('crossbow')`, `.includes('thanh_long')`, v.v.
  2. Các lệnh gọi hàm `.equipment?.find()` gây crash khi `equipment` là Object.
- Nếu phát hiện bất kỳ vi phạm nào, script lập tức trả về mã lỗi `exit(1)` và ngắt toàn bộ pipeline kiểm thử.

### B. Tầng 2: Chính Sách Bãi Bỏ Mock Card Tự Chế (Anti-Synthetic Fixture Policy)
- Bãi bỏ việc tự tạo các object trang bị giả lập bằng slug ASCII tiếng Anh trong các file test.
- Mọi bài kiểm tra tính năng vũ khí, phòng cụ và thú cưỡi bắt buộc phải trích xuất thẻ bài thật từ `CardDeck.getStandardDeck()`.

### C. Tầng 3: Bộ Fuzzing Ma Trận 108 Lá Bài Thật (`StandardDeck108PermutationQA.test.js`)
- Duyệt qua toàn bộ 108 lá bài nguyên bản:
  - Kiểm tra 100% tính hợp lệ của `id`, `name`, `type`, `suit`, `rank`, `color`.
  - Kiểm tra phân loại trang bị: 100% thẻ bài trang bị phải được `getCardSubType()` và `normalizeEquipKey()` nhận diện đúng slot.
  - Fuzzing vòng đời trang bị: Mặc lên người, thay thế trang bị cũ và bảo toàn số lượng thẻ bài qua `DispatcherV4`.
  - Fuzzing thẻ [Đào] và [Rượu] thật qua Dispatcher.

### D. Tầng 4: Bảo Vệ Hợp Đồng Giao Diện Nút Bấm (`ViewModelWeaponContractQA.test.js`)
- Xác nhận hợp đồng giữa Engine và UI:
  - Khi trang bị Liên Nỏ thật từ CardDeck: Sau cú Chém lần 1 (`turnStats.slashCount === 1`), hàm `canPlayCard` và ViewModel của các lá Chém còn lại trên tay **BẮT BUỘC trả về `canPlay: true`**.
  - Khi không trang bị Liên Nỏ: `canPlayCard` lập tức khóa lá Chém sau lần Chém 1 (`valid: false`).
  - Phương Thiên Kích: Mở khóa `maxTargets = 3` khi là lá bài duy nhất, trở về `maxTargets = 1` khi còn >= 2 lá bài.

---

## 3. Kết Quả Kiểm Định Toàn Diện (Verification Results)
1. **Quét kiểm định tĩnh**:
   - `node shared/engine_v4/__tests__/audit_canonical_equip_usage.mjs`: **0 vi phạm**.
   - `node shared/engine_v4/__tests__/audit_39_heroes.mjs`: **39/39 Tướng 0 lỗi xung đột**.
2. **Bộ kiểm thử tự động (`npm test`)**:
   - **97/97 Test Suites PASS (876/876 Tests Xanh 100%)**.
3. **Mô phỏng 1.000 trận Core (`npm run sim:core`)**:
   - 1.000 / 1.000 Trận PASS (0 Exception, 0 Deadlock).
4. **Mô phỏng 1.000 trận Dispatcher Layer (`npm run sim:app`)**:
   - 1.000 / 1.000 Trận PASS (76.120 Actions, 101.639 Responses, 0 Deadlock).
