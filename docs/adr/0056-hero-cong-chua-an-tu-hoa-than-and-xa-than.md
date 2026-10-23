# ADR 0056: QA Tướng Công chúa An Tư (cong_chua_an_tu) — Hòa Thân & Xả Thân

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Công chúa An Tư (`cong_chua_an_tu`) — Phe 🔵 HÀ.
- **Máu:** 3 HP / 3 Max HP. Giới tính: Nữ.
- **Kỹ năng:**
  1. **Hòa Thân (`hoa_than_an_tu`):** Trong giai đoạn Hành động (Pha Ra bài), bạn có thể sử dụng một lá bài chất ♦ (Rô) trên tay như lá cẩm nang [Hỗn Loạn] (Lạc Bất Tư Thục).
  2. **Xả Thân (`xa_than`):** Khi bạn trở thành mục tiêu của [Chém], bạn có thể bỏ đi một lá bài (trên tay hoặc trang bị) và đem lá [Chém] này di chuyển sang một người chơi khác nằm trong phạm vi công kích của bạn.

## 2. Thiết kế Cơ chế & Ràng buộc
- **Hòa Thân (`hoa_than_an_tu`):**
  - **Chuyển hóa Cẩm nang Trì hoãn:** Nhận diện lá bài chất Rô ♦ (`suit === 'diamond'` hoặc `suit === '♦'`).
  - **Bảo toàn số lượng lá bài (Card Conservation):** Cẩm nang trì hoãn được chuyển trực tiếp từ tay An Tư sang khu phán xét (`judgementArea`) của mục tiêu; tuyệt đối không bỏ vào `discardPile` trước khi phán xét xong để tránh nhân đôi lá bài.
  - **Đa phương thức kích hoạt:**
    - Qua `ACTION_PLAY_CARD` với lá bài chất ♦ kèm thuộc tính `virtualCardName: 'Hỗn Loạn'` hoặc `asChaos: true`.
    - Qua `ACTION_USE_SKILL` với `skillId: 'hoa_than_an_tu'` kèm `cardIds` và `targets`.
  - Tách bạch hoàn toàn khỏi kỹ năng Ly Gián cùng tên `hoa_than` của Huyền Trân Công Chúa (`hoa_than_huyen_tran`).
- **Xả Thân (`xa_than`):**
  - **Kích hoạt trước Né:** Khi có người chơi phát động [Chém] nhắm vào An Tư, nếu An Tư còn bài (trên tay hoặc trang bị) và có đối tượng khác ngoài kẻ tấn công nằm trong tầm công kích của An Tư (`RangeSystem.inSlashRange`), mở frame ưu tiên `ASK_XA_THAN`.
  - **Chuyển hướng đòn đánh:**
    - Người chơi bỏ 1 lá bài (từ tay hoặc tháo trang bị) và chọn 1 mục tiêu chuyển hướng hợp lệ (`redirectedTargetId`).
    - Toàn bộ thuộc tính đòn đánh (sát thương, số Né cần thiết) được chuyển giao sang mục tiêu mới, mở frame `ASK_DODGE` cho mục tiêu mới.
  - **Từ chối / Bỏ qua:** Đòn Chém tiếp tục có hiệu lực lên An Tư, mở frame `ASK_DODGE` cho An Tư như bình thường.

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/CongChuaAnTuQA.test.js`.
- Kiểm tra 100% các tình huống:
  1. Hòa Thân: Chuyển đổi bài Rô ♦ thành [Hỗn Loạn] đặt vào `judgementArea` của mục tiêu, không trùng lặp `discardPile`.
  2. Hòa Thân: Chặn lá bài không phải chất Rô hoặc khi không chọn mục tiêu.
  3. Xả Thân: Kích hoạt khi bị Chém, bỏ bài trên tay chuyển hướng Chém sang người khác trong tầm.
  4. Xả Thân: Bỏ trang bị (ví dụ Bạch Ngân) để chuyển hướng và kích hoạt hiệu ứng hồi máu trang bị.
  5. Xả Thân: Từ chối chuyển hướng -> An Tư nhận `ASK_DODGE`.
  6. Xả Thân: Chặn chuyển hướng sang người ngoài tầm công kích.
