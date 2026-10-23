# ADR 0054: QA Tướng Chu Văn An (chu_van_an) — Thất Trảm Sớ

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Chu Văn An (`chu_van_an`) — Phe 🔵 HÀ.
- **Máu:** 3 HP / 3 Max HP. Giới tính: Nam.
- **Kỹ năng:**
  1. **Thất Trảm Sớ (`that_tram_so`):** Sau khi nhận sát thương (`ON_DAMAGED`), bạn có thể tiến hành phán xét. Nếu kết quả không phải chất Cơ (♥), nguồn sát thương phải chọn một trong hai:
     - Lựa chọn 1: Bỏ 2 lá bài trên tay.
     - Lựa chọn 2: Nhận 1 điểm sát thương do bạn gây ra.

## 2. Thiết kế Cơ chế & Ràng buộc
- **Thất Trảm Sớ:**
  - Phản ứng kỹ (`reactive trigger`): Lắng nghe sự kiện `ON_DAMAGED`.
  - Điều kiện: Chu Văn An nhận sát thương từ một kẻ tấn công còn sống (`ctx.ownerId === ctx.targetId && ctx.actor?.isAlive`).
  - Phán xét:
    - Rút 1 lá bài từ đỉnh `drawPile` vào `discardPile`.
    - **Nếu là chất Cơ (♥):** Thất Trảm Sớ không phát huy hiệu lực (an toàn cho kẻ tấn công).
    - **Nếu KHÔNG phải chất Cơ (Bích ♠, Chuồn ♣, Rô ♦):** Mở frame phạt `ASK_THAT_TRAM_SO_PUNISH` cho kẻ tấn công.
  - Phạt kẻ tấn công:
    - Lựa chọn `discard`: Bỏ 2 lá bài trên tay vào chồng bài bỏ.
    - Lựa chọn `damage` (hoặc không đủ 2 bài để bỏ): Chịu 1 sát thương do Chu Văn An gây ra.

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/ChuVanAnQA.test.js`.
