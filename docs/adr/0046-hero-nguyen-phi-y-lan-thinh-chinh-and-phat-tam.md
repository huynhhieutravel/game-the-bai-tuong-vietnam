# ADR 0046: QA Tướng Nguyên Phi Ỷ Lan (nguyen_phi_y_lan) — Thính Chính & Phật Tâm

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Nguyên Phi Ỷ Lan (`nguyen_phi_y_lan`) — Phe 🔵 HÀ.
- **Máu:** 3 HP / 3 Max HP. Giới tính: Nữ.
- **Kỹ năng:**
  1. **Thính Chính (`thinh_chinh`):** Bạn có thể sử dụng hoặc đánh ra một lá bài Đen trên tay như [Né].
  2. **Phật Tâm (`phat_tam`):** Trong giai đoạn Chuẩn bị (`BEGIN_PHASE`), bạn có thể tiến hành phán xét. Nếu kết quả là bài Đen, bạn có thể lặp lại quá trình này. Sau đó, thu lấy tất cả các lá bài phán xét màu Đen về tay.

## 2. Thiết kế Cơ chế & Ràng buộc
- **Thính Chính:**
  - Tích hợp tại `CombatRules.respondDodge`.
  - Nhận diện mọi lá bài trên tay có màu Đen (`color === 'black'` hoặc suit là `spade` / `club`) được đánh ra đáp ứng yêu cầu Né khi bị Chém hoặc chịu sát thương từ [Loạn Tiễn].
  - Bài Đen biến đổi thành lá Né hợp lệ và đưa vào chồng bài bỏ sau khi sử dụng.
  - Từ chối các lá bài màu Đỏ không phải lá Né nguyên bản.
- **Phật Tâm:**
  - Kích hoạt tại Pha Bắt đầu (`BEGIN_PHASE`) thông qua `dispatchTrigger('BEGIN_PHASE')`.
  - Phán xét lặp: Rút liên tiếp các lá bài từ bộ bài rút (`drawPile`).
  - Nếu lá bài rút ra là Đen: Ghi nhận và tiếp tục rút lá tiếp theo.
  - Nếu lá bài rút ra là Đỏ: Đưa lá Đỏ vào chồng bài bỏ (`discardPile`) và dừng vòng lặp phán xét.
  - Đưa toàn bộ các lá bài Đen phán xét thành công vào tay Nguyên Phi Ỷ Lan.

## 3. Trạng thái kiểm thử
- Đã kiểm tra logic trong `CombatRules.js`, `StateMachine.js` và `ha/index.js`.
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/NguyenPhiYLanQA.test.js`.
