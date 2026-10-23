# ADR 0045: Chuẩn Hóa Cơ Chế Tướng Tô Hiến Thành — Nhiếp Chính

## 1. Bối cảnh & Hiện trạng
Tô Hiến Thành (`to_hien_thanh`) là bậc Đại Thần - Phụ Chính Đại Thần thời Lý, thuộc **Phe 🔵 HÀ**, sở hữu 3 HP và kỹ năng Tỏa Định Kỹ:
- **Nhiếp Chính (`nhiep_chinh`):** Tỏa Định Kỹ (Lock Skill). Nếu trong giai đoạn Hành động (`PHASES.ACTION`) Tô Hiến Thành không sử dụng hoặc đánh ra bất kỳ lá [Chém] nào, ông được quyền bỏ qua toàn bộ giai đoạn Bỏ bài (`PHASES.DISCARD`) và giữ nguyên vẹn tất cả các lá bài trên tay sang lượt kế tiếp (tương tự Khắc Kỷ của Lữ Mông trong Tam Quốc Sát).

## 2. Quyết định Kỹ thuật
- **Điều kiện miễn trừ bỏ bài:**
  - `(player.turnStats?.slashCount || 0) === 0`.
- **Luồng xử lý Pha trong StateMachine:**
  - Tại `StateMachine.endActionPhase()`:
    - Kiểm tra kỹ năng `nhiep_chinh` (hoặc alias `nhiep-chinh`, `nhiep_chinh_to_hien_thanh`).
    - Nếu `slashCount === 0`, ghi log miễn trừ và gọi trực tiếp `this._runPhaseEnd()`, bỏ qua hoàn toàn `_runPhaseDiscard()`.
    - Nếu `slashCount > 0`, chuyển sang `_runPhaseDiscard()` và ép bỏ bài theo giới hạn HP hiện tại như bình thường.
- **Đồng bộ Bất biến (Invariants):**
  - Cập nhật `GameInvariants.assertDiscardLimit(player)` để không báo lỗi vi phạm nếu Tô Hiến Thành sở hữu kỹ năng và không dùng Chém trong lượt.

## 3. Hệ quả & Ràng buộc
- Cho phép Tô Hiến Thành tích trữ kho quân nhu khổng lồ khi nhẫn nhịn không tấn công.
- Tương thích 100% với hệ thống kiểm soát lượt và các cẩm nang/vũ khí.
