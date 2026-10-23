# ADR 0049: QA Tướng Dã Tượng (da_tuong) — Kỳ Tập

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Dã Tượng (`da_tuong`) — Phe 🔵 HÀ.
- **Máu:** 4 HP / 4 Max HP. Giới tính: Nam.
- **Kỹ năng:**
  1. **Kỳ Tập (`ky_tap`):** Bạn có thể sử dụng một lá bài Đen trên tay như một lá [Tước Bài].

## 2. Thiết kế Cơ chế & Ràng buộc
- **Kỳ Tập:**
  - Chủ động kỹ (`active skill`): Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - Hỗ trợ cả 2 luồng dispatch:
    - Qua `ACTION_PLAY_CARD` với `virtualCardName: 'Tước Bài'` hoặc `asDismantle: true`.
    - Qua `ACTION_SKILL` với `skillId: 'ky_tap'`.
  - Điều kiện lá bài: Bắt buộc phải là **lá bài màu Đen** (`color === 'black'` hoặc suit là `spade` ♠ / `club` ♣).
  - Từ chối nghiêm ngặt nếu cố tình sử dụng bài màu Đỏ làm Kỳ Tập.
  - Sau khi kích hoạt: Lá bài Đen được đưa vào chồng bài bỏ và mở chuỗi cẩm nang [Tước Bài] (bao gồm vòng Hóa Giải `ASK_NEGATE` nếu có, sau đó tước bài trên tay / trang bị của mục tiêu).

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/DaTuongQA.test.js`.
