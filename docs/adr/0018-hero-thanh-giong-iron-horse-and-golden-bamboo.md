# ADR 0018: Thiết Kế & Quy Chuẩn Kỹ Năng Thánh Gióng (Thiết Mã & Tre Ngà)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Thánh Gióng là danh tướng mở màn của phe 🟢 LẠC (Thục) với lượng máu chuẩn 4 HP (Nam). Vị tướng này đại diện cho lối chơi công kích áp đảo tầm xa và khắc chế triệt để các tướng có khả năng phòng thủ/phản đòn bằng kỹ năng:
1. **Thiết Mã (Iron Horse)**: Kỹ năng Tỏa Định Kỹ (Lock Skill) giúp khoảng cách từ Thánh Gióng đến người chơi khác luôn được tính là -1.
2. **Tre Ngà (Golden Bamboo)**: Kỹ năng chủ động/phản ứng khi sử dụng [Chém] chỉ định mục tiêu:
   - Tước bỏ toàn bộ kỹ năng không phải Tỏa Định Kỹ của nạn nhân cho đến hết lượt (`skillsSuppressed = true`).
   - Rút 1 lá bài phán xét từ đỉnh bộ bài rút (`judgeCard`) để xác định chất phán xét (`judgeSuit`).
   - Nạn nhân phải bỏ 1 lá bài có cùng chất chính xác với lá bài phán xét để giữ quyền sử dụng [Né].
   - Nếu nạn nhân không bỏ bài (hoặc bỏ sai chất), đòn Chém trở thành không thể né tránh (`unavoidable = true`) và gây sát thương trực tiếp.

## Quyết định Thiết kế (Decisions)

### 1. Kỹ Năng Thiết Mã (Lock Skill: Cự Ly -1)
- Kỹ năng được tích hợp tại `RangeSystem.js` và áp dụng cho:
  - Cự ly dùng [Chém].
  - Cự ly dùng Cẩm Nang (như [Cướp Bài] với mục tiêu ở cự ly gốc 2).
  - Tầm công kích hiệu dụng.
- **Cộng dồn**: Khi Thánh Gióng trang bị thêm `Ngựa Chiến (-1)`, tổng mức giảm cự ly là -2.
- **Sàn cự ly**: Khoảng cách hiệu dụng giữa Thánh Gióng và người chơi khác không bao giờ nhỏ hơn 1. Người khác tính khoảng cách đến Thánh Gióng không bị ảnh hưởng bởi Thiết Mã.

### 2. Kỹ Năng Tre Ngà — Khóa Kỹ Năng (Skill Suppression)
- Khi Thánh Gióng sử dụng lá [Chém] chỉ định mục tiêu thành công:
  - Nạn nhân nhận cờ `temporaryFlags.skillsSuppressed = true` kéo dài cho đến hết lượt của Gióng (được dọn sạch tại `StateMachine.nextTurn`).
  - Trong thời gian bị khóa, mọi lệnh gọi `HeroRegistry.hasSkill(target, skillId)` đối với các kỹ năng không phải Tỏa Định Kỹ (`!isLockSkill(skillId)`) đều trả về `false`.
  - **Tướng bị vô hiệu hóa:**
    - Công Chúa An Tư: Không thể dùng `Xả Thân` chuyển hướng Chém.
    - Lý Thường Kiệt: Không thể phát động `Tiên Phát` gọi đồng minh ra Né hộ.
    - Lạc Long Quân: Không thể phát động `Bọc Trăm Trứng`.
    - Hồ Xuân Hương: Không thể kích hoạt `Xuân Hương` rút bài nếu bị mất trang bị.
    - Trần Nhật Duật: Không thể kích hoạt `Hòa Nghị` chia bài khi nhận sát thương.
  - **Kỹ năng Tỏa Định Kỹ được miễn nhiễm:**
    - `Thần Giáp` (Rùa Vàng): Vẫn được phán xét Đỏ = Né.
    - `Đạm Bạc` (Lang Liêu): Vẫn giữ trạng thái miễn nhiễm Chém khi hết bài.
    - `Thiết Mã`, `Nỏ Thần`, `Hộ Giá`, `Quốc Sắc`.

### 3. Kỹ Năng Tre Ngà — Phán Xét & Kiểm Tra Chất Nghiêm Ngặt
- Hệ thống rút lá bài trên cùng từ `drawPile` (bằng `state.drawCardFromDeck()`) và đẩy vào `discardPile`.
- Chất của lá phán xét (`judgeCard.suit`) được gán vào context của frame `ASK_TRE_NGA_DISCARD` đẩy lên đỉnh `priorityStack`.
- **Khớp chất (Suit Matching):**
  - Trong `DispatcherV4.js`, khi nạn nhân gửi action `{ doDiscard: true, cardId/cardIndexSelected }`:
  - Hệ thống kiểm tra chặt chẽ `card.suit === judgeSuit` (hỗ trợ cả tên tiếng Anh `heart/diamond/spade/club` lẫn ký hiệu unicode `♥/♦/♠/♣`).
  - **Đúng chất:** Lá bài bị bỏ vào `discardPile`, frame `ASK_TRE_NGA_DISCARD` được pop, nạn nhân tiếp tục xử lý frame `ASK_DODGE` để đánh lá [Né].
  - **Sai chất hoặc Từ chối bỏ bài:** Frame `ASK_TRE_NGA_DISCARD` được pop, và `CombatRules.respondDodge(state, targetId, null)` được gọi ngay lập tức $\rightarrow$ Bỏ qua hoàn toàn việc đánh Né và áp dụng sát thương trực tiếp.

### 4. Tương Thích Client & Bot Brain
- Modal UI `ask_tre_nga_discard` trong `ModalContainer.jsx` gửi `{ doDiscard: true, cardIndexSelected: idx }` hoặc `{ doDiscard: false }`. `_resolveCard` giải quyết chính xác lá bài đã chọn.
- `BotBrain.decideReaction` quét bài trên tay tìm lá bài cùng chất phán xét; nếu có sẽ tự động bỏ bài để bảo toàn mạng sống, nếu không sẽ chấp nhận chịu sát thương.

## Hệ Quả (Consequences)
- Thánh Gióng trở thành một mũi nhọn tấn công chuẩn mực, có khả năng xuyên thủng các thế phòng thủ phản đòn phức tạp.
- Đóng đinh cơ chế `skillsSuppressed` trong toàn bộ hệ thống `HeroRegistry` cho các hiệu ứng khóa kỹ năng tương lai.
