# ADR 0048: QA Tướng Ngọc Hân Công Chúa (ngoc_han_cong_chua) — Hiền Hậu & Quốc Sắc

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Ngọc Hân Công Chúa (`ngoc_han_cong_chua`) — Phe 🔵 HÀ.
- **Máu:** 3 HP / 3 Max HP. Giới tính: Nữ.
- **Kỹ năng:**
  1. **Hiền Hậu (`hien_hau`):** Khi bạn nhận sát thương, bạn có thể bỏ 1 lá bài ♥ trên tay để ngăn chặn sát thương đó, rồi chọn 1 tướng khác và chọn 1 trong 2 hiệu ứng:
     - Lựa chọn 1: Tướng đó nhận 1 điểm sát thương, sau đó rút $X$ lá bài ($X$ là số Sinh lực đã mất của họ, tối đa 5).
     - Lựa chọn 2: Tướng đó mất 1 điểm Sinh lực, sau đó thu lấy lá bài bạn vừa bỏ vào tay.
  2. **Quốc Sắc (`quoc_sac`):** Tỏa Định Kỹ: Mọi lá bài Spade (♠) của bạn được xem như Heart (♥).

## 2. Thiết kế Cơ chế & Ràng buộc
- **Quốc Sắc:**
  - Tỏa định kỹ: Luôn có hiệu lực.
  - Tích hợp vào `HeroRegistry.getEffectiveSuit` và `HeroRegistry.getEffectiveColor`:
    - Biến đổi chất: `suit === 'spade'` chuyển thành `'heart'`.
    - Biến đổi màu: Màu bài chuyển từ Đen sang Đỏ.
    - Nhờ đó, bài Spade (♠) thỏa mãn điều kiện là lá bài ♥ của Hiền Hậu.
- **Hiền Hậu:**
  - Phản ứng kỹ khi chuẩn bị nhận sát thương (`CombatRules.applyDamage`).
  - Mở frame `ASK_HIEN_HAU` cho Ngọc Hân Công Chúa.
  - Khi chấp thuận dùng:
    - Bỏ 1 lá bài Cơ (hoặc Bích do Quốc Sắc).
    - Ngăn chặn hoàn toàn sát thương hiện tại (Ngọc Hân không mất máu).
    - Lựa chọn 1: Mục tiêu nhận 1 sát thương từ Ngọc Hân, sau đó rút số bài bằng lượng máu đã mất (`maxHp - hp`).
    - Lựa chọn 2: Mục tiêu mất 1 HP và thu lấy lá bài vừa bỏ của Ngọc Hân.
  - Khi từ chối: Nhận sát thương ban đầu bình thường.

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/NgocHanCongChuaQA.test.js`.
