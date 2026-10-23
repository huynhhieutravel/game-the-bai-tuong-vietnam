# ADR 0050: QA Tướng Nguyễn Chích (nguyen_chich) — Nghệ An Kế & Hiến Kế

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Nguyễn Chích (`nguyen_chich`) — Phe 🔵 HÀ.
- **Máu:** 4 HP / 4 Max HP. Giới tính: Nam.
- **Kỹ năng:**
  1. **Nghệ An Kế (`nghe_an_ke`):** Tỏa Định Kỹ: Bạn không thể trở thành mục tiêu của [Cướp Bài] và [Hỗn Loạn].
  2. **Hiến Kế (`hien_ke`):** Sau khi bạn mất lá bài cuối cùng trên tay, bạn có thể rút 1 lá bài.

## 2. Thiết kế Cơ chế & Ràng buộc
- **Nghệ An Kế:**
  - Tỏa định kỹ: Luôn có hiệu lực.
  - Tích hợp tại:
    - `TargetResolverV4.getValidTargetsForCard`: Loại bỏ Nguyễn Chích khỏi danh sách mục tiêu hợp lệ khi sử dụng [Cướp Bài] (`cuop-bai`) hoặc [Hỗn Loạn] (`hon-loan`).
    - `TrickRules.playTrick` & `TrickRules._playDelayedTrick`: Quăng lỗi `[Nghệ An Kế] không thể trở thành mục tiêu của [Cướp Bài] / [Hỗn Loạn]` nếu có ai cố tình nhắm vào Nguyễn Chích.
- **Hiến Kế:**
  - Phản ứng kỹ: Tự động kích hoạt khi số lượng bài trên tay của Nguyễn Chích giảm về 0 sau khi mất lá bài cuối cùng (`ON_LOSE_LAST_HAND` hoặc `discardFromHand`).
  - Bao gồm các trường hợp:
    - Bị đối phương tước bài cuối cùng (`TrickRules.playDismantle`).
    - Đánh hoặc bỏ lá bài cuối cùng trên tay (`GameState.discardFromHand`).
  - Hiệu ứng: Lập tức rút 1 lá bài mới từ bộ bài rút (`state.drawCards(ownerId, 1)`).

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/NguyenChichQA.test.js`.
