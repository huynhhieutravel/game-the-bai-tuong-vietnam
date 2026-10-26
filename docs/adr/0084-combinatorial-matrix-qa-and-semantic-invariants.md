# ADR 0084: Tự Động Hóa QA Ma Trận Tổ Hợp & Lá Chắn Bất Biến Ngữ Nghĩa (Combinatorial Matrix QA & Semantic Invariants)

## 1. Bối cảnh & Vấn đề (Context & Root Cause)
Trước đây, dù hệ thống có 92 test suites và bộ giả lập 1.000 trận hoàn thành 100%, người dùng khi chơi thực tế vẫn gặp các lỗi:
1. **Lỗi vòng lặp tự Hóa Giải chính mình (Self-Negate Loop)**.
2. **Lỗi thẻ ảo bị mặc nhầm vào ô trang bị**: Rùa Vàng (Thần Hỏa) hoặc Võ Thần dùng Giáp/Vũ khí làm Hỏa Công thì lá bài bị trang bị lên người thay vì thi triển Cẩm nang.
3. **Lỗi nuốt hiệu ứng của Rượu/Đào khi dùng làm bài ảo**.

Nguyên nhân gốc rễ là **Bài toán Bùng nổ tổ hợp (Combinatorial Explosion)**:
- 39 Tướng × 108 Lá bài × 5 Thể loại (Vũ khí, Giáp, Ngựa công, Ngựa thủ, Đào, Rượu, Chém, Né, Cẩm nang thường, Cẩm nang trễ) × 2 Màu sắc (Đỏ/Đen) × 4 Người chơi tạo ra hàng chục nghìn nhánh trạng thái logic.
- Con người và các unit test viết tay truyền thống không thể bao quát hết từng trường hợp đơn lẻ.

## 2. Giải pháp Kiến trúc (Architectural Solutions)

### A. Lá Chắn Cửa Ngõ Tổng Quát (Universal Gateway Guard)
- Bổ sung Bất Biến Luật Thép (Game Invariants) vào `Invariants.js`:
  - `assertNoSelfNegate(frame, actorId)`: Cấm người vừa đánh Hóa Giải xuất hiện trong hàng đợi hỏi tiếp theo.
  - `assertVirtualActionIntegrity(player, isVirtualAction, card, virtualCardName)`: Cấm tuyệt đối việc gắn thẻ vật lý vào ô `equipment` khi hành động là thẻ ảo.
  - `assertNoPriorityQueueDeadlock(frame)`: Giám sát kích thước PriorityQueue không vượt quá ngưỡng cho phép.
- Cắm trực tiếp các Invariants vào `DispatcherV4._handlePlayCard` và `TrickRules.respondNegate`.

### B. Bộ Sinh Kiểm Thử Ma Trận Tổ Hợp Tự Động (Combinatorial Matrix QA Generator)
- Tạo mới file test: `shared/engine_v4/__tests__/matrix/HeroCardCombinatorialMatrixQA.test.js`:
  - Ma Trận 1: Thần Hỏa / Võ Thần — 6 nguyên mẫu bài Đỏ (Vũ khí, Giáp, Ngựa, Đào, Rượu, Né) làm Hỏa Công.
  - Ma Trận 2: Kỳ Tập — 4 nguyên mẫu bài Đen (Vũ khí, Giáp, Ngựa, Chém) làm Tước Bài.
  - Ma Trận 3: Dời Núi — Hoán đổi Né thành Chém trong Pha Hành Động.
  - Ma Trận 4: Phá Thành — Dùng bài khác màu làm Quyết Đấu.
  - Ma Trận 5: Chuỗi Hóa Giải — Kiểm định Bất biến cấm tự Hóa Giải chính mình.
  - Ma Trận 6: Chương Dương — Tháo Trang bị trên người hoặc trên tay làm Hóa Giải.

### C. Nâng Cấp Bộ Quét 39 Tướng (`audit_39_heroes.mjs`)
- Tự động quét va chạm chéo (Cross-Hero Skill ID Collision) giữa toàn bộ 39 vị tướng.
- Tự động kiểm định danh sách kỹ năng biến đổi bài quan trọng (`than_hoa`, `ky_tap`, `doi_nui`, `pha_thanh`, `chuong_duong`).

## 3. Kết Quả Kiểm Định (Verification Results)
1. **`npm test`**:
   - `audit_39_heroes.mjs`: 39/39 Tướng đạt chuẩn 100%, 0 xung đột chéo.
   - Vitest: **94/94 Test Suites PASS (847/847 Tests 100% Xanh) trong 3.73s**.
2. **`npm run sim:app`**:
   - Hoàn thành **1.000 / 1.000 trận đấu** mô phỏng đầy đủ tương tác qua Dispatcher V4.
   - 0 Exception, 0 Deadlock, 0 Invariant Violation.
   - 74.336 actions, 97.754 responses, 40.691 cẩm nang, 7.932 lượt kỹ năng chủ động kích hoạt.
