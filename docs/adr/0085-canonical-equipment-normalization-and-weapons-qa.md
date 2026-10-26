# ADR 0085: Chuẩn Hóa Nhận Diện Toàn Bộ Trang Bị & Kiểm Định Toàn Diện Hệ Thống Vũ Khí (Canonical Equipment Normalization & Comprehensive Weapons QA)

## 1. Bối cảnh & Vấn đề (Context & Root Cause)
Trong quá trình vận hành thực tế và phản hồi từ người chơi:
1. **Lỗi Liên Nỏ chỉ Chém được 1 lần / Thẻ bài Chém không sáng nút đánh**:
   - Khi trang bị các lá bài tạo ra từ bộ bài chuẩn `CardDeck.getStandardDeck()`, ID thẻ bài có định dạng tiếng Việt có dấu và kèm timestamp cùng index: ví dụ `'liên-nỏ-0-1792972291440_93'`, `'thanh-long-đao-0-1792972291440_94'`, `'rìu-đá-0-1792972291440_95'`.
   - Các đoạn mã kiểm tra trong engine cũ kiểm tra bằng chuỗi không dấu hoặc định dạng slug gạch dưới ASCII: `card.id?.includes('crossbow')` hoặc `card.id?.includes('thanh_long')` (có gạch dưới và thiếu chữ đ).
   - Khi tên hiển thị bị thay đổi hoặc truyền qua các lớp chuyển đổi, điều kiện so sánh bị sai lệch âm thầm (silent failure), dẫn đến người chơi trang bị Liên Nỏ nhưng vẫn bị chặn bởi giới hạn 1 đòn Chém/lượt.
2. **Lỗi tính sai Tầm đánh (Attack Range) của các Vũ khí**:
   - `RangeSystem.getAttackRange` tra cứu dictionary `WEAPON_RANGE_MAP` nhưng thiếu các dạng khóa tiếng Việt có dấu (`thanh-long-đao`, `rìu-đá`, `kỳ-lân-cung`, `quạt-sắt`, `phương-thiên-kích`), dẫn đến vũ khí bị rơi về tầm đánh mặc định = 1.
3. **Lỗi thẻ Trang bị không được phân loại đúng Subtype**:
   - `getCardSubType(card)` trong `gameData.js` chỉ kiểm tra nếu `card.type === 'equip'`, bỏ sót các thẻ bài có `card.type === 'equipment'` hoặc `card.type === 'weapon'` hoặc `card.type === 'armor'`.
4. **Lỗi tiềm ẩn trong UI GameView.jsx**:
   - `GameView.jsx` gọi trực tiếp `me.equipment?.find(...)`, gây lỗi `TypeError` khi `equipment` là dạng Object slot `{ weapon, armor, horse_attack, horse_defense }`.
5. **Thiếu trigger `ON_EQUIP_LOST` trong Mượn Đao và Song Kiếm**:
   - Khi mục tiêu nộp vũ khí cho người Mượn Đao hoặc bị Song Kiếm ép tháo giáp Bạch Ngân, sự kiện `ON_EQUIP_LOST` không được phát động, làm mất quyền rút 2 bài của Hồ Xuân Hương (Xuân Hương).

---

## 2. Giải pháp Kiến trúc (Architectural Solutions)

### A. Chuẩn Hóa Toàn Diện Khóa Trang Bị (`translationHelper.js`)
- Xây dựng từ điển khóa chuẩn hóa `CANONICAL_EQUIP_KEYS`:
  - Vũ khí (7): `lien_no`, `thanh_long_dao`, `riu_da`, `song_kiem`, `phuong_thien_kich`, `quat_sat`, `ky_lan_cung`.
  - Phòng cụ (3): `bat_quai`, `hac_thuan`, `bach_ngan`.
  - Thú cưỡi (2): `ngua_chien`, `ngua_than`.
- Hàm `normalizeEquipKey(cardOrName)`: Tự động loại bỏ toàn bộ dấu tiếng Việt (kể cả chữ `đ` -> `d`), xóa bỏ hậu tố ID ngẫu nhiên (`-0-1792...`), quy chuẩn về snake_case chuẩn.
- Hàm `isEquip(cardOrEquip, canonicalKey)`: Kiểm tra an toàn đa lớp trên cả `canonicalKey`, `id`, `name`, `key`, `idKey`, `virtualCardName`.

### B. Nâng Cấp Hệ Thống Tầm Đánh & Combat (`RangeSystem.js` & `CombatRules.js`)
- `RangeSystem.getAttackRange`: Tích hợp `normalizeEquipKey(weapon)` trước khi tra cứu, bổ sung đầy đủ mọi biến thể tên/slug vào `WEAPON_RANGE_MAP`.
- `CombatRules.js`:
  - Chuẩn hóa kiểm tra `isEquip` cho cả 7 vũ khí và 3 phòng cụ.
  - Bạch Ngân Sư Tử: Giới hạn sát thương tối đa 1 HP (`amount > 1 -> amount = 1`) và hồi 1 HP khi tháo bỏ / bị tước / chuyển hướng / thay thế.
  - Kỳ Lân Cung: Bắn hạ Ngựa thủ (+1) hoặc Ngựa công (-1), đồng thời phát sự kiện `ON_EQUIP_LOST`.
  - Song Kiếm: Xử lý tương tác khác giới tính, tự động hồi HP nếu ép tháo Bạch Ngân và phát sự kiện `ON_EQUIP_LOST`.

### C. Nâng Cấp Dispatcher & Target Resolver (`DispatcherV4.js` & `TargetResolverV4.js`)
- `DispatcherV4._handlePlayCard`: Hỗ trợ đọc cả `payload.cardId` lẫn `payload.card?.id`.
- `TargetResolverV4`: Dùng `isEquip` xác định người chơi trang bị Liên Nỏ (vô hạn Chém) và Phương Thiên Kích (Chém 3 mục tiêu khi là lá bài duy nhất).
- `TrickRules.respondBorrowSlash`: Bổ sung trigger `ON_EQUIP_LOST` khi mục tiêu nộp vũ khí.

### D. Bộ Kiểm Thử Chuyên Sâu (`WeaponsComprehensiveQA.test.js`)
Tạo mới bộ test chuyên sâu gồm 11 nhóm kiểm thử (20 tests):
1. Bảng ánh xạ tầm đánh 7 loại vũ khí với mọi dạng ID/dấu tiếng Việt từ `CardDeck.getStandardDeck()`.
2. Liên Nỏ: Cho phép đánh liên tiếp nhiều Chém và bật sáng trên UI.
3. Thanh Long Đao: Đánh tầm 3 và kích hoạt `ASK_WEAPON_SKILL` chém bồi khi bị Né.
4. Rìu Đá: Bỏ 2 bài xuyên giáp bắt buộc trúng đích khi bị Né.
5. Song Kiếm: Ép khác giới tính tự bỏ 1 bài trước khi Né.
6. Phương Thiên Kích: Cho phép Chém 3 mục tiêu khi là lá bài duy nhất trên tay.
7. Quạt Sắt: Gây 2 sát thương khi mục tiêu không có bài trên tay.
8. Kỳ Lân Cung: Bắn hạ Ngựa thủ (+1) của đối thủ khi Chém trúng.
9. Phòng cụ: Hắc Thuẫn (miễn nhiễm Chém đen), Bát Quái (phán xét Đỏ tự động Né), Bạch Ngân (hồi 1 HP khi thay thế và hóa giải sát thương dồn > 1 HP).
10. Thú cưỡi: Ngựa Chiến (-1) giảm cự ly tấn công, Ngựa Thần (+1) tăng cự ly phòng thủ.
11. Tương tác nâng cao: Mượn Đao nộp vũ khí và Song Kiếm ép tháo Bạch Ngân kích hoạt `ON_EQUIP_LOST` (Hồ Xuân Hương rút 2 bài).

---

## 3. Kết Quả Kiểm Định (Verification Results)
- **Bộ test chuyên sâu**: 20/20 Tests PASS (100%).
- **Toàn bộ hệ thống (`npm test`)**: 95/95 Test Suites PASS (869/869 Tests Xanh 100%).
- **Đại giả lập (`npm run sim:core`)**: 1.000 / 1.000 trận hoàn tất mượt mà, 0 Exception, 0 Deadlock.
