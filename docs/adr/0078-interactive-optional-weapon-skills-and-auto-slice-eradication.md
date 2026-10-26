# ADR 0078: Hệ Thống Tương Tác Kỹ Năng Vũ Khí Tùy Chọn & Triệt Tiêu Lỗi Tự Động Cướp Bài (Interactive Optional Weapon Skills & Auto-Slice Eradication)

## Bối Cảnh (Context)
Trong hệ thống thẻ bài chiến thuật Tam Quốc Sát và Việt Sát, nhiều loại vũ khí có hiệu ứng **Tùy Chọn (Optional Trigger)** xảy ra trong các giai đoạn xử lý đòn Chém (trước hoặc sau khi đánh Né):
1. **Rìu Đá (Quán Thạch Phủ / Rock Axe):** Khi đòn Chém bị đối thủ đánh Né thành công, người tấn công có quyền chọn:
   - Vứt 2 lá bài bất kỳ (từ bài trên tay hoặc trang bị đang mang, trừ chính Rìu Đá) để xuyên qua thế Né (`slash_penetrate`), gây sát thương cho mục tiêu.
   - **HOẶC** bấm "Bỏ qua" để giữ lại toàn bộ bài của mình, chấp nhận đòn Chém bị né.
2. **Thanh Long Đao (Dragon Blade):** Khi đòn Chém bị đối thủ đánh Né thành công, người tấn công có quyền:
   - Chọn thêm 1 lá Chém khác từ tay để bồi thêm một đòn Chém nữa.
   - **HOẶC** bấm "Bỏ qua" để dừng đòn đánh.
3. **Song Kiếm (Twin Swords):** Khi Chém đối thủ khác giới tính, nạn nhân có quyền:
   - Chọn tự vứt 1 lá bài của mình (trên tay hoặc trang bị) để ngăn kẻ tấn công rút bài.
   - **HOẶC** bấm "Bỏ qua" để người tấn công rút 1 lá bài từ chồng bài rút.

### Lỗi Nghiêm Trọng Phát Hiện (The Critical Flaws):
Trước đây, mã nguồn trong [CombatRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/CombatRules.js) phạm phải anti-pattern nghiêm trọng:
- **Auto-Slice:** Tự tiện gọi `source.hand.slice(0, 2)` hoặc `splice(0, 1)` để trừ bài người chơi.
- **Tước đoạt quyền lựa chọn:** Người chơi cầm Rìu Đá hoặc bị chém bởi Song Kiếm không có bảng Modal để chọn thẻ bài muốn bỏ, và hoàn toàn **không có nút "Bỏ qua"** để từ chối sử dụng.
- Người chơi thường xuyên bị mất các lá bài quý giá (như Đào, Né, Áo Giáp) một cách thụ động ngoài ý muốn.

---

## Quyết Định Thiết Kế (Architectural Decisions)

### 1. Triệt Tiêu Hoàn Toàn Mã Cũ "Auto-Slice"
Loại bỏ 100% mọi đoạn mã tự động cắt mảng bài `slice(0, n)` hoặc `splice(0, 1)` đối với các hiệu ứng tùy chọn trong [CombatRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/CombatRules.js).

### 2. Thiết Lập Khung Tương Tác Chuẩn `ASK_WEAPON_SKILL`
Khi gặp hiệu ứng vũ khí tùy chọn mà người chơi chưa truyền sẵn tham số cụ thể, engine sẽ đẩy (push) một frame phản hồi vào `state.priorityStack`:
```javascript
state.pushFrame({
  type: 'ASK_WEAPON_SKILL',
  currentActorId: actor.id,
  sourceId: source.id,
  targetId: target.id,
  context: {
    weapon: 'rock_axe' | 'dragon_blade' | 'twin_swords',
    slashCard: slashCard,
    requiresDiscardCount: 2 | 1,
    canSkip: true
  }
});
```

### 3. Đảm Bảo Thứ Tự Ngăn Xếp LIFO Cho Song Kiếm
Với Song Kiếm, hiệu ứng xảy ra **ngay khi tuyên bố Chém đối thủ khác giới tính**, trước khi nạn nhân quyết định đánh Né:
- Khi xử lý `playSlash()`, engine đẩy frame `ASK_DODGE` vào stack.
- Sau đó, nếu điều kiện Song Kiếm thỏa mãn, engine tiếp tục đẩy frame `ASK_WEAPON_SKILL` (Song Kiếm) vào stack.
- Nhờ cơ chế LIFO (Last-In-First-Out), frame `ASK_WEAPON_SKILL` nằm trên đỉnh và được nạn nhân giải quyết trước. Sau khi giải quyết xong (bỏ bài hoặc đối thủ rút bài), frame `ASK_DODGE` tự động lộ ra để nạn nhân quyết định đánh Né.

### 4. Xử Lý Phản Hồi Toàn Diện Trong [DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js)
Trong `_handleReact`:
- Nhánh `case 'ASK_WEAPON_SKILL'`:
  - **Khi người chơi chọn Bỏ Qua (`isCancelOrSkip || doUse === false`):**
    - Rìu Đá & Thanh Long Đao: Pop frame an toàn, giữ nguyên toàn bộ bài.
    - Song Kiếm: Kẻ tấn công được gọi `state.drawCards(source.id, 1)` và ghi nhận log hệ thống.
  - **Khi người chơi Đồng Ý Dùng:**
    - Rìu Đá: Nhận danh sách thẻ (`cardIds`, `equipIds`, `cardIndexes`, `equipIndexes`), kiểm tra đủ 2 thẻ, vứt bài hợp lệ và kích hoạt sát thương xuyên thấu `applyDamage('slash_penetrate')`.
    - Thanh Long Đao: Nhận thẻ Chém bồi, vứt thẻ Chém và đẩy frame `ASK_DODGE` mới cho mục tiêu.
    - Song Kiếm: Nạn nhân tự vứt đúng lá bài chỉ định; kẻ tấn công không được rút bài.

### 5. Giao Diện Người Dùng Tương Tác ([AskWeaponSkillModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/AskWeaponSkillModal.jsx))
- Hiển thị đầy đủ danh sách bài trên tay và bài trang bị của người phản hồi.
- Cho phép tích chọn trực quan thẻ bài muốn vứt.
- Nút "Xác Nhận Sử Dụng" tự động vô hiệu hóa cho đến khi chọn đủ số lượng thẻ yêu cầu.
- Nút "Bỏ Qua / Không Dùng" luôn nổi bật, giúp người chơi bảo toàn tài nguyên khi không cần thiết.
- Bảo đảm tương thích cấu trúc trang bị dạng Object (`{ weapon, armor, ... }`) và dạng Array.

### 6. Trí Tuệ Nhân Tạo Chiến Thuật ([BotBrain.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/ai/BotBrain.js))
Bot AI không còn bị cứng nhắc hay tự vứt bừa bãi:
- **Rìu Đá:** Chỉ kích hoạt khi đối thủ sắp hấp hối (máu $\le 1$) hoặc Bot đang có dư thừa nhiều bài rác. Không bao giờ vứt Đào hoặc Né quý báu chỉ để đổi lấy 1 sát thương không cần thiết.
- **Thanh Long Đao:** Chỉ chém tiếp khi mục tiêu là kẻ địch và Bot còn dư thẻ Chém.
- **Song Kiếm:** Nạn nhân Bot ưu tiên vứt thẻ rác trên tay để không cho kẻ địch bốc thêm bài; nếu chỉ toàn bài bảo mạng (Đào/Né) thì chấp nhận bấm Bỏ qua.

---

## Kết Quả & Kiểm Định (Verification & Results)
1. **Unit & Integration Test Suite ([WeaponSkillsChoiceQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/WeaponSkillsChoiceQA.test.jsx)):**
   - Đạt **12/12 test pass 100%**:
     - Test 1: Rìu Đá chọn 2 thẻ bài vứt để xuyên Né thành công.
     - Test 2: Rìu Đá vứt 1 thẻ tay + 1 thẻ trang bị (Ngựa/Giáp).
     - Test 3: Rìu Đá bấm Bỏ Qua bảo toàn nguyên vẹn bài.
     - Test 4: Thanh Long Đao chọn lá Chém bồi đòn đánh tiếp.
     - Test 5: Thanh Long Đao bấm Bỏ Qua dừng đòn đánh.
     - Test 6: Song Kiếm nạn nhân chọn vứt bài ngăn rút bài.
     - Test 7: Song Kiếm nạn nhân bấm Bỏ Qua cho đối thủ rút bài.
     - Test 8-10: Modal UI hiển thị chính xác, nút bấm enable/disable chuẩn.
     - Test 11-12: Bot AI đưa ra quyết định thông minh theo ngữ cảnh trận đấu.
2. **Kiểm Tra Toàn Dự Án:**
   - 86/86 Test Suites passed.
   - 753/753 Tests passed (100%).
3. **Đại Giả Lập 1.000 Trận Tầng Ứng Dụng:**
   - 1000/1000 trận thành công không có ngoại lệ, không deadlock.
   - Build client production và Capacitor sync thành công 100%.
