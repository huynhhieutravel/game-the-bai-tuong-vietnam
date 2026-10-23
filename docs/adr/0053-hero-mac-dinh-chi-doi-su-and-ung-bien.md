# ADR 0053: QA Tướng Mạc Đĩnh Chi (mac_dinh_chi) — Đối Sứ & Ứng Biến

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Mạc Đĩnh Chi (`mac_dinh_chi`) — Phe 🔵 HÀ.
- **Máu:** 3 HP / 3 Max HP. Giới tính: Nam.
- **Kỹ năng:**
  1. **Đối Sứ (`doi_su`):** Sau khi nhận sát thương (`ON_DAMAGED`), thu lấy 1 lá bài từ nguồn sát thương (kẻ gây sát thương).
  2. **Ứng Biến (`ung_bien`):** Trước khi lá bài phán xét của một người chơi có hiệu lực (`ASK_CHANGE_JUDGE`), bạn có thể đánh ra 1 lá bài bất kỳ trên tay để thay thế lá bài phán xét đó.

## 2. Thiết kế Cơ chế & Ràng buộc
- **Đối Sứ:**
  - Phản ứng kỹ (`reactive trigger`): Lắng nghe `ON_DAMAGED`.
  - Điều kiện: Mạc Đĩnh Chi là nạn nhân nhận sát thương và kẻ gây sát thương (`ctx.actor`) còn bài trên tay (`actor.hand.length > 0`).
  - Mở frame `ASK_DOI_SU`: Khi chấp thuận dùng, Mạc Đĩnh Chi rút 1 lá bài từ tay kẻ tấn công đưa về tay mình.
- **Ứng Biến:**
  - Phản ứng kỹ (`reactive intercept`): Can thiệp trong Pha Phán xét (`PHASES.JUDGE`) của bất kỳ người chơi nào.
  - Khi có cẩm nang trì hoãn chuẩn bị giải quyết kết quả (Sấm Sét, Hỗn Loạn), hệ thống mở frame `ASK_CHANGE_JUDGE` cho các người chơi có kỹ năng đổi bài phán xét.
  - Khác với Quân Cơ của Đinh Điền (bắt buộc bài Đen), Ứng Biến của Mạc Đĩnh Chi cho phép sử dụng **bất kỳ lá bài nào** (Đỏ hoặc Đen) trên tay để thay thế lá phán xét ban đầu. Lá ban đầu bị hủy vào `discardPile`.

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/MacDinhChiQA.test.js`.
