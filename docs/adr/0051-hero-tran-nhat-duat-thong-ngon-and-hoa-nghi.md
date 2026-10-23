# ADR 0051: QA Tướng Trần Nhật Duật (tran_nhat_duat) — Thông Ngôn & Hòa Nghị

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Trần Nhật Duật (`tran_nhat_duat`) — Phe 🔵 HÀ.
- **Máu:** 3 HP / 3 Max HP. Giới tính: Nam.
- **Kỹ năng:**
  1. **Thông Ngôn (`thong_ngon`):** Sau khi lá bài phán xét của bạn có hiệu lực (`ON_JUDGED`), bạn có thể thu lấy lá bài đó về tay.
  2. **Hòa Nghị (`hoa_nghi`):** Sau khi nhận 1 điểm sát thương (`ON_DAMAGED`), xem 2 lá bài trên cùng của chồng bài rút, sau đó phân phối những lá bài đó cho các tướng tùy ý (hoặc giữ lại cho bản thân).

## 2. Thiết kế Cơ chế & Ràng buộc
- **Thông Ngôn:**
  - Phản ứng kỹ (`reactive trigger`): Lắng nghe sự kiện `ON_JUDGED`.
  - Điều kiện: Chỉ kích hoạt khi chính Trần Nhật Duật là người phán xét (`ctx.ownerId === ctx.targetId`).
  - Hiệu ứng: Thu hồi trực tiếp lá bài phán xét (`ctx.judgeCard`) vào bài trên tay của mình và loại bỏ lá bài đó khỏi chồng bài bỏ (`discardPile`).
- **Hòa Nghị:**
  - Phản ứng kỹ (`reactive trigger`): Lắng nghe sự kiện `ON_DAMAGED`.
  - Hiệu ứng tức thời: Tự động rút 2 lá bài mới từ `drawPile` vào tay Trần Nhật Duật và đẩy frame `ASK_HOA_NGHI` vào priorityStack.
  - Phân phối:
    - Nếu gửi mảng `distribution: [{ cardId, targetId }]`, các lá bài tương ứng được chuyển giao cho các người chơi chỉ định.
    - Nếu không phân phối hoặc bấm bỏ qua, Trần Nhật Duật bảo lưu toàn bộ 2 lá bài đó trên tay cho bản thân.

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/TranNhatDuatQA.test.js`.
