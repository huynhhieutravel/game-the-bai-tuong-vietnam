# ADR 0013: Kỹ Năng Chủ Động Pha Hành Động, Đấu Điểm Vân Đồn & Chuyển Hướng Chém Xả Thân

## Trạng thái
Đã chấp thuận (Accepted) & Đang triển khai (In Progress).

## Bối cảnh (Context)
Sau kiểm toán toàn diện tính năng v3 sang v4, 4 cơ chế chiến thuật cao cấp cần được chuẩn hóa và phục hồi toàn vẹn:
1. **[Nhiếp Chính] (Tô Hiến Thành - Phe Hà)**:
   - Theo luật gốc: Trong Pha Hành động (`ACTION`), nếu Tô Hiến Thành không đánh bất kỳ lá [Chém] nào (`turnStats.slashCount === 0`), khi kết thúc Pha Hành động, ông được phép bỏ qua Pha Bỏ bài (`DISCARD`), bảo toàn 100% bài trên tay bất kể HP hiện tại, và chuyển thẳng sang Pha Kết thúc (`END`).
2. **[Vân Đồn] (Trần Khánh Dư - Phe Hà)**:
   - Cơ chế **Đấu Điểm (Point Duel)**: Kích hoạt 1 lần mỗi lượt trong Pha Hành động. Trần Khánh Dư chọn 1 đối thủ còn bài trên tay, hai bên cùng xuất 1 lá bài so sánh điểm số (A=1 ... K=13).
   - Thắng: Nhận cờ `vanDonWin`, được dùng thêm 1 lá [Chém] trong lượt, không bị giới hạn cự ly và được chọn tối đa 2 mục tiêu.
   - Thua / Hòa: Nhận cờ `vanDonLose`, bị cấm sử dụng [Chém] trong phần còn lại của lượt.
3. **[Xả Thân] (Công Chúa An Tư - Phe Hà)**:
   - Cơ chế **Chuyển Hướng Chém (Slash Redirection)**: Khi Công Chúa An Tư trở thành mục tiêu của [Chém], trước khi kích hoạt hỏi [Né], bà có thể bỏ 1 lá bài bất kỳ để chuyển hướng cú [Chém] sang một người chơi khác nằm trong tầm đánh của bà.
4. **Chuẩn hóa Vũ Khí Tương Tác ([Song Kiếm], [Quạt Sắt])**:
   - Phân tách rõ ràng giữa chế độ Người chơi (hiện modal tương tác bấm chọn) và Headless Bot AI (thực thi tự động heuristic không nghẽn luồng).

## Quyết định Thiết kế (Decisions)
1. **Tích hợp Nhiếp Chính vào `StateMachine.endActionPhase()`**:
   - Kiểm tra `globalHeroRegistry.hasSkill(player, 'nhiep_chinh', true) && (!player.turnStats.slashCount || player.turnStats.slashCount === 0)`.
   - Nếu thỏa mãn: Ghi log, bỏ qua `_runPhaseDiscard()`, chuyển thẳng sang `_runPhaseEnd()`.
2. **PriorityFrame `ASK_VAN_DON`**:
   - Chứa ngữ cảnh `sourceId`, `targetId`, so sánh rank theo chuẩn A=1, J=11, Q=12, K=13.
   - Hai lá bài dùng để đấu điểm được chuyển vào `state.discardPile` an toàn, bảo toàn thẻ bài.
3. **PriorityFrame `ASK_XA_THAN`**:
   - Trong `CombatRules.playSlash`, nếu mục tiêu là An Tư sở hữu `xa_than` và có bài để bỏ, đẩy `ASK_XA_THAN` lên trước `ASK_DODGE`.
   - Nếu An Tư chấp thuận chuyển hướng: Đổi `targetId` của cú Chém sang nạn nhân mới và mở `ASK_DODGE` cho nạn nhân đó.
4. **Dispatcher & UI Mapping**:
   - Ánh xạ đầy đủ `ASK_VAN_DON` và `ASK_XA_THAN` trong `GameViewMapperV4.js` và `DispatcherV4.js`.
   - Hỗ trợ phản hồi tương thích cho HeadlessRunner để 1.000 trận mô phỏng đạt 100% pass rate.

## Kết quả Mong đợi (Consequences)
- Đảm bảo 100% tính năng v3 được chuyển giao hoàn chỉnh lên kiến trúc v4 sạch sẽ, mô-đun hóa.
- Giữ vững 0 lỗi Invariant, 0 lỗi Exception trên 1.000 trận đấu giả lập song tướng.
