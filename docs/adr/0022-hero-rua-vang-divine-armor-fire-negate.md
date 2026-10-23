# ADR 0022: Thiết Kế & Quy Chuẩn Kỹ Năng Rùa Vàng (Thần Giáp, Thần Hỏa & Linh Giám)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Rùa Vàng (Thần Kim Quy) là thánh thú hộ quốc của phe 🟢 LẠC (Thục) với lượng máu chuẩn 3 HP (Phi giới tính). Danh tướng này sở hữu bộ ba kỹ năng phòng thủ và kiểm soát cẩm nang toàn diện:
1. **Thần Giáp (Divine Armor - Lock Skill)**: Nếu chưa trang bị Giáp (`!equipment.armor`), Rùa Vàng được xem như đã trang bị [Bát Quái Trận] (phán xét bài Đỏ = Né).
2. **Thần Hỏa (Divine Fire - Active Skill)**: Có thể sử dụng bất kỳ lá bài màu ĐỎ nào như cẩm nang [Hỏa Công].
3. **Linh Giám (Sacred Negate - Active Skill)**: Có thể sử dụng bất kỳ lá bài màu ĐEN nào như cẩm nang [Hóa Giải / Vô Giải Khả Kích].

## Quyết định Thiết kế (Decisions)

### 1. Thần Giáp — Bát Quái Trận Bẩm Sinh (Innate Bagua Array)
- Tích hợp tại `CombatRules.respondDodge`:
  - Khi cần né đòn [Chém] hoặc [Loạn Tiễn], nếu Rùa Vàng không có giáp trang bị (`!target.equipment?.armor`), hệ thống cấp quyền phán xét Bát Quái bẩm sinh (`useBagua: true`).
  - Lật 1 lá bài từ đỉnh chồng rút:
    - **Màu ĐỎ (♥, ♦):** Tính như 1 lá [Né] thành công (`dodgesProvided += 1`).
    - **Màu ĐEN (♠, ♣):** Phán xét thất bại; Rùa Vàng vẫn giữ nguyên quyền sử dụng lá [Né] từ trên tay để né đòn tiếp theo hoặc chịu mất máu.
  - **Tương tác trang bị:** Khi Rùa Vàng trang bị giáp khác (như [Bạch Ngân] hoặc [Hắc Thuẫn]), Thần Giáp tự động nhường chỗ cho thuộc tính của giáp đang trang bị.
  - **Tỏa Định Kỹ (Lock Skill):** Thần Giáp nằm trong danh mục `isLockSkill('than_giap') === true`, do đó không bị phong ấn bởi kỹ năng [Tre Ngà] của Thánh Gióng.

### 2. Thần Hỏa — Biến Đổi Bài Đỏ Thành [Hỏa Công]
- Tích hợp tại `TargetResolverV4.js` (`getTargetingDefinition` & `canPlayCard`) và `DispatcherV4.js`:
  - Cho phép chọn bất kỳ lá bài Đỏ nào trên tay phát động cẩm nang [Hỏa Công] lên mục tiêu còn bài trên tay.
  - Cẩm nang trải qua đầy đủ chu trình: Vòng hỏi Hóa Giải $\rightarrow$ Mục tiêu hiển lộ 1 lá bài trên tay (`ASK_HOACONG_REVEAL`) $\rightarrow$ Rùa Vàng vứt bỏ 1 lá bài cùng chất để gây 1 điểm sát thương lửa (`ASK_HOACONG_DISCARD`).

### 3. Linh Giám — Biến Đổi Bài Đen Thành [Hóa Giải]
- Tích hợp tại `DispatcherV4.js` (`case 'ASK_NEGATE'`) & `BotBrain.js`:
  - Khi xuất hiện khung yêu cầu Hóa Giải cẩm nang (`ASK_NEGATE`), Rùa Vàng có thể đánh ra bất kỳ lá bài Đen nào (♠, ♣) từ trên tay để vô hiệu hóa cẩm nang đang kích hoạt.
  - Áp dụng để hóa giải cẩm nang đơn thể, cẩm nang phán xét (Sấm Sét, Hỗn Loạn), hoặc vô hiệu hóa lá [Hóa Giải] của đối thủ.

### 4. Trí Tuệ Nhân Tạo Bot (Bot Brain v4)
- Khi đối mặt `ASK_DODGE`: Bot Rùa Vàng luôn ưu tiên gửi `{ useBagua: true }` để phán xét miễn phí trước khi quyết định dùng lá Né trên tay.
- Khi đối mặt `ASK_NEGATE`: Bot Rùa Vàng quét bài Đen để cứu bản thân và đồng minh khỏi các cẩm nang sát thương nguy hiểm.

## Hệ Quả (Consequences)
- Rùa Vàng trở thành vị tướng có năng lực phòng ngự kiên cố và phá vỡ các đòn cẩm nang của kẻ thù một cách linh hoạt nhờ kho bài Đen làm Hóa Giải.
