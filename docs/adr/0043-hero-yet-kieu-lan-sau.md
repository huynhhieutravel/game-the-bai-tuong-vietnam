# ADR 0043: Chuẩn Hóa Cơ Chế Tướng Yết Kiêu — Lặn Sâu

## 1. Bối cảnh & Hiện trạng
Yết Kiêu (`yet_kieu`) là danh tướng thủy quân thời Trần, thuộc **Phe 🔵 HÀ**, sở hữu 4 HP và kỹ năng độc môn:
- **Lặn Sâu (`lan_sau`):** Kỹ năng chủ động trong Pha Ra bài (`PHASES.ACTION`). Cho phép Yết Kiêu chủ động mất 1 điểm Sinh lực để lặn sâu thu thập tài nguyên, lập tức rút 2 lá bài mới từ bộ bài rút.

## 2. Quyết định Kỹ thuật
- **Điều kiện kích hoạt (`canUse`):**
  - Chỉ được kích hoạt khi Sinh lực hiện tại lớn hơn 1 (`hp > 1`).
  - Tuyệt đối cấm kích hoạt khi chỉ còn 1 HP (`hp <= 1`) để tránh trường hợp người chơi vô tình tự sát không hợp lý.
- **Tiêu hao & Hiệu ứng:**
  - Trừ trực tiếp 1 HP: `owner.hp -= 1`.
  - Rút 2 lá bài: `state.drawCards(owner.id, 2)`.
  - Không giới hạn số lần sử dụng trong lượt (có thể kích hoạt liên tiếp miễn là còn đủ HP > 1).
- **Hỗ trợ thực thi Dispatcher:**
  - Kích hoạt qua `ACTION_SKILL` hoặc `USE_SKILL` với `skillId: 'lan_sau'`.

## 3. Hệ quả & Ràng buộc
- Kiểm tra chặt chẽ ngưỡng máu tối thiểu 2 HP.
- Tương thích hoàn toàn với hệ thống bảo toàn bài và không kích hoạt vòng cứu người hấp hối vì máu không giảm xuống <= 0.
