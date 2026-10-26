# ADR 0087: Chuẩn Hóa Cẩm Nang (Canonical Trick Cards) & Kiểm Định Chống Thiên Kiến Dữ Liệu Giả (Anti-Synthetic Fixture)

## 1. Bối cảnh & Vấn đề (Context & Problem Statement)
Sau khi thiết lập Kiến trúc Phòng thủ 4 tầng tại [ADR 0086](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/docs/adr/0086-automated-qa-hardening-and-anti-synthetic-fixture-architecture.md), chúng tôi tiếp tục rà soát sâu toàn bộ hệ thống Thẻ Bài (Cards) từ A đến Z.
Quá trình khảo sát phát hiện một lỗ hổng nghiêm trọng tồn tại trong việc quản lý Cẩm Nang (Tricks) và Cẩm Nang Trì Hoãn (Delayed Tricks):

1. **Thiên kiến dữ liệu giả trong Unit Test:**
   Các unit test cũ thường sử dụng card fixture giả tạo thủ công: `{ id: 'sam_set', idKey: 'sam_set', name: 'Sấm Sét' }`.
   Do đó, các phép so sánh chuỗi như:
   ```javascript
   if (target.judgementArea.some(c => (c.idKey || c.id) === (card.idKey || card.id)))
   ```
   hoạt động trơn tru trong test giả.
2. **Thực tế bộ bài chuẩn (Standard Deck):**
   Trong thực tế chạy game, `CardDeck.getStandardDeck()` sinh ra các thẻ bài có ID tiếng Việt kèm hậu tố thời gian ngẫu nhiên (ví dụ: `sấm-sét-0-179280..._0` và `sấm-sét-1-179280..._1`) và **hoàn toàn không có thuộc tính `idKey`**!
   Hậu quả là:
   `(c.idKey || c.id) === (card.idKey || card.id)` so sánh hai ID khác nhau -> trả về `false`!
   **Bug phát sinh ngoài đời:** Một người chơi có thể bị gắn 2 lá Sấm Sét hoặc 2 lá Hỗn Loạn cùng lúc vào khu phán xét — vi phạm nghiêm trọng luật chơi quốc tế của Tam Quốc Sát / Việt Sát.
3. **Phân mảnh và nuốt hiệu ứng khi chuyển đổi thẻ bài (Hero Conversion):**
   Trong `TrickRules.js`, việc kiểm tra lá bài Hóa Giải dùng:
   `slashCard.name === 'Hóa Giải' || slashCard.idKey === 'hoa_giai' || slashCard.id?.includes('hoa_giai')`
   Đối với thẻ bài thật ID là `hóa-giải-0-...` (có dấu tiếng Việt), chuỗi `includes('hoa_giai')` hoàn toàn thất bại.
   Đồng thời trong `TargetResolverV4.js`, hàm `mapVietnameseToSlug` trả về chuỗi có dấu tiếng Việt khi nhận vào `card.id`, khiến `switch (slug)` rơi vào `default` và trả về `{ type: 'none' }`.

---

## 2. Quyết định Kiến trúc (Architectural Decision)

### A. Chuẩn hóa Bộ Từ điển Canonical Cards (`translationHelper.js`)
Mở rộng lớp Translation Helper thành Single Source of Truth cho toàn bộ Thẻ bài (Basic & Tricks):
- Khai báo hằng số bất biến `CANONICAL_CARD_KEYS`:
  - Basic: `chem`, `ne`, `dao`, `ruou`.
  - Normal Tricks: `quyet_dau`, `cuop_bai`, `tuoc_bai`, `muon_dao`, `loan_tien`, `da_man`, `hoi_xuan`, `hoa_giai`, `xieng_xich`, `hoa_cong`, `vo_trung`.
  - Delayed Tricks: `sam_set`, `hon_loan`, `binh_luong`.
- Cung cấp các hàm kiểm tra bất biến chuẩn:
  - `normalizeCardKey(cardOrName)`: Bóc tách an toàn mọi ID tiếng Việt, bỏ dấu, chuẩn hóa theo thuật toán ưu tiên Longest Match (ưu tiên Cẩm Nang `Mượn Đao` trước Thẻ Cơ Bản `Đào`).
  - `isTrick(cardOrName, canonicalKey)`: Kiểm tra lá bài có phải cẩm nang chỉ định.
  - `isDelayedTrick(cardOrName, canonicalKey)`: Kiểm tra cẩm nang trì hoãn.
  - `isAOETrick(cardOrName)`: Kiểm tra cẩm nang toàn bàn (`loan_tien`, `da_man`, `hoi_xuan`).
  - `isBasicCard(cardOrName, canonicalKey)`: Kiểm tra bài cơ bản.

### B. Ngăn chặn triệt để Trùng Cẩm Nang Trì Hoãn
Trong `TrickRules._playDelayedTrick`:
```javascript
target.judgementArea = target.judgementArea || [];
if (target.judgementArea.some(c => normalizeCardKey(c) === normalizeCardKey(card))) {
  throw new Error(`[TrickRules] Mục tiêu đã có cẩm nang trì hoãn này trong khu phán xét!`);
}
```
Và trong `TargetResolverV4.canPlayCard`:
```javascript
if (slug === 'sam-set') {
  if (player.judgementArea && player.judgementArea.some(c => isDelayedTrick(c, 'sam_set'))) {
    return { valid: false, reason: 'Bạn đã có Sấm Sét trong khu phán xét' };
  }
}
```

### C. Cơ chế Nhảy Vòng Sấm Sét Bỏ Qua Người Đã Có
Khi Sấm Sét phán xét không nổ, lá bài chuyển sang người chơi còn sống kế tiếp.
Nếu người kế tiếp đã có Sấm Sét trong khu phán xét, Sấm Sét tiếp tục nhảy qua người đó để tìm người chơi còn sống tiếp theo chưa có Sấm Sét:
```javascript
let nextPlayer = null;
for (let step = 1; step < alive.length; step++) {
  const candidate = alive[(currIdx + step) % alive.length];
  const hasLightning = candidate.judgementArea && candidate.judgementArea.some(c => isDelayedTrick(c, 'sam_set'));
  if (!hasLightning) {
    nextPlayer = candidate;
    break;
  }
}
```
Nếu toàn bộ người chơi còn sống đều đã có Sấm Sét, lá bài được đưa an toàn vào `discardPile`, triệt tiêu hoàn toàn khả năng sinh 2 lá Sấm Sét trên cùng 1 người.

### D. Mở rộng Cổng Kiểm Tra Tĩnh (Static Code Gate)
Mở rộng `audit_canonical_equip_usage.mjs` để quét cả Cẩm Nang và Bài Cơ Bản. Cấm triệt để các anti-pattern:
- `id.includes('hoa_giai')`
- `id.includes('sam_set')`
- `id.includes('hon_loan')`
- `id.includes('crossbow')`
- `equipment?.find()`

---

## 3. Hệ Quả & Kết Quả Kiểm Định (Consequences & Validation)
1. **Static Build Gate:** 0 vi phạm trên toàn bộ codebase.
2. **Suite Test Mới:** [shared/engine_v4/__tests__/rules/TricksComprehensiveAntiSyntheticQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/rules/TricksComprehensiveAntiSyntheticQA.test.js) kiểm thử 100% bằng thẻ bài thật từ `CardDeck.getStandardDeck()`, 6/6 test cases đạt chuẩn xanh tuyệt đối.
3. **Toàn bộ Unit Test Suite:** 98/98 test files pass (882/882 tests xanh 100%).
4. **Không đụng chạm CSS:** Tuân thủ 100% quy tắc CSS is locked.
