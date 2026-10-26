# ADR 0083: Rà Soát Toàn Diện Lỗi Tương Tự: Loại Trừ Thẻ Trang Bị, Đào và Rượu Vật Lý Khỏi Việc Đè Lên Hành Động Bài Ảo

## 1. Bối cảnh & Vấn đề Phát Hiện (Context & Investigation)
Sau khi giải quyết triệt để 3 vấn đề ban đầu (vòng lặp Hóa Giải, xung đột bí danh Tiên Duyên, và phân định mục tiêu Hỏa Công), chúng tôi tiếp tục rà soát toàn diện (Comprehensive Audit) trên toàn bộ hệ thống 39 Tướng và các kỹ năng chuyển đổi thẻ bài (Card Conversion Skills) để tìm các điểm mù (blind spots) và lỗi tương tự.

Qua rà soát sâu luồng thực thi tại [DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js) và [useCardInteraction.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/hooks/useCardInteraction.js), chúng tôi đã phát hiện **2 lỗ hổng logic nghiêm trọng tương tự**:

### 1.1. Lỗ Hổng 1: Kiểu thẻ vật lý (Trang bị, Đào, Rượu) "cướp" hành vi của Bài Ảo tại `DispatcherV4._handlePlayCard`
- **Mã nguồn trước đây:**
  ```javascript
  // 2. Đào (Peach)
  if (cardType === 'peach' || cardName === 'Đào') { ... return; }

  // 3. Rượu (Wine)
  if (cardType === 'wine' || cardName === 'Rượu') { ... return; }

  // 4. Trang bị (Equipment)
  const rawSubtype = getCardSubType(card) || cardType;
  let equipSlot = null;
  ...
  if (equipSlot) {
    player.equipment[equipSlot] = card;
    return;
  }
  ```
- **Hệ quả nguy hiểm:**
  - Nếu Rùa Vàng dùng `Thần Hỏa` với một lá **Đào đỏ** hoặc **Rượu đỏ** làm [Hỏa Công]: Vì `cardType === 'peach'` hoặc `cardType === 'wine'` thỏa mãn, Dispatcher sẽ cho người chơi tự ăn Đào hồi máu hoặc tự uống Rượu thay vì thiêu đốt đối thủ bằng Hỏa Công!
  - Nếu Rùa Vàng (`Thần Hỏa`), Dã Tượng (`Kỳ Tập`), Chử Đồng Tử (`Tiên Duyên`), Lý Thường Kiệt (`Phá Thành`), hay An Tư (`Hòa Thân`) dùng một **lá bài Trang bị** (Vũ khí, Giáp, Ngựa) làm bài ảo (Hỏa Công, Tước Bài, Xiềng Xích, Quyết Đấu, Hỗn Loạn):
    Khối `if (equipSlot)` tại dòng 251 không hề kiểm tra xem lá bài có đang được dùng như bài ảo (`virtualCardName`) hay không. Hệ thống sẽ **tự động trang bị** lá bài đó lên người thay vì thi triển cẩm nang!

### 1.2. Lỗ Hổng 2: Thiếu cảnh báo và ngăn chặn chọn bài sai điều kiện kỹ năng tại `useCardInteraction.js`
- Trong `useCardInteraction.js`, kỹ năng `Kỳ Tập` (Dã Tượng), `Dời Núi` (Sơn Tinh), và `Phá Thành` (Lý Thường Kiệt) trước đây chỉ kiểm tra một chiều (`if (effColor === 'black') virtualName = 'Tước Bài'`).
- Nếu người chơi vô tình click một lá bài Đỏ khi đang bật `Kỳ Tập`, hoặc lá bài khác màu khi đang bật `Phá Thành`, hệ thống không có thông báo lỗi chặn lại mà âm thầm để lá bài được sử dụng như chính nó.

---

## 2. Giải pháp Triển Khai (Implemented Fixes)

1. **Chuẩn hóa Phân Định Hành Động Bài Ảo tại [DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js):**
   - **Đào (Peach):** `const isPeachAction = virtualCardName ? virtualCardName === 'Đào' : (cardType === 'peach' || card.name === 'Đào');` -> Chỉ thực hiện hồi máu nếu thực sự là hành động Đào.
   - **Rượu (Wine):** `const isWineAction = virtualCardName ? virtualCardName === 'Rượu' : (cardType === 'wine' || card.name === 'Rượu');` -> Chỉ thực hiện uống Rượu nếu thực sự là hành động Rượu.
   - **Trang bị (Equipment):**
     ```javascript
     const isVirtualAction = Boolean(virtualCardName || payload.asSlash || payload.asDuel || payload.asDismantle || payload.asChaos || payload.asChain || payload.asFireAttack);
     if (!isVirtualAction && equipSlot) {
       // Chỉ trang bị khi KHÔNG PHẢI là bài ảo
     }
     ```
     Đảm bảo mọi lá bài Trang bị được dùng làm Hỏa Công, Tước Bài, Xiềng Xích, Quyết Đấu, Hỗn Loạn đều rơi vào đúng bộ xử lý Cẩm nang tương ứng thay vì tự trang bị.

2. **Bổ sung Lớp Phòng Vệ & Thông Báo Phản Hồi tại [useCardInteraction.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/hooks/useCardInteraction.js):**
   - Bổ sung kiểm tra và cảnh báo `danger` rõ ràng cho `Kỳ Tập` (bắt buộc bài Đen), `Dời Núi` (bắt buộc Chém/Né), và `Phá Thành` (bắt buộc khác màu phán xét).

---

## 3. Bộ Kiểm Thử Bổ Sung & Kết Quả (Test Suite & Verification)
- Tạo mới bộ kiểm thử chuyên biệt [VirtualCardAndConversionQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/rules/VirtualCardAndConversionQA.test.js) gồm 8 kịch bản bao phủ:
  1. Rùa Vàng [Thần Hỏa]: Dùng Ngựa Thần (+1) đỏ làm Hỏa Công.
  2. Rùa Vàng [Thần Hỏa]: Dùng Đào đỏ làm Hỏa Công (không hồi máu nhầm).
  3. Rùa Vàng [Thần Hỏa]: Dùng Rượu đỏ làm Hỏa Công (không uống rượu nhầm).
  4. Dã Tượng [Kỳ Tập]: Dùng Bát Quái đen làm Tước Bài (không gắn giáp nhầm).
  5. Chử Đồng Tử [Tiên Duyên]: Dùng Liên Nỏ ♣ làm Xiềng Xích Rèn Lại (rút 1 bài, không gắn nỏ).
  6. Chử Đồng Tử [Tiên Duyên]: Dùng Liên Nỏ ♣ làm Xiềng Xích khóa 2 mục tiêu.
  7. Công chúa An Tư [Hòa Thân]: Dùng Rìu Đá ♦ làm Hỗn Loạn.
  8. Lý Thường Kiệt [Phá Thành]: Dùng Vũ khí khác màu làm Quyết Đấu.
- Kết quả kiểm thử: **93/93 test suites (832/832 tests passed 100%)**.
