# ADR 0047: QA Tướng Hồ Xuân Hương (ho_xuan_huong) — Duyên Thơ & Xuân Hương

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Hồ Xuân Hương (`ho_xuan_huong`) — Phe 🔵 HÀ.
- **Máu:** 3 HP / 3 Max HP. Giới tính: Nữ.
- **Kỹ năng:**
  1. **Duyên Thơ (`duyen_tho`):** Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể bỏ 2 lá bài trên tay. Sau đó, bạn và một tướng Nam đã bị thương mỗi người hồi phục 1 điểm Sinh lực.
  2. **Xuân Hương (`xuan_huong`):** Sau khi bạn mất 1 lá bài ở khu Trang bị (`ON_EQUIP_LOST`), bạn có thể rút 2 lá bài.

## 2. Thiết kế Cơ chế & Ràng buộc
- **Duyên Thơ:**
  - Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - Giới hạn: Mỗi lượt chỉ sử dụng 1 lần (`usedThisTurn = true`).
  - Chi phí: Bỏ 2 lá bài từ tay vào chồng bài bỏ (`discardPile`).
  - Hiệu ứng hồi phục song phương:
    - Hồ Xuân Hương hồi 1 HP nếu đang bị thương (`hp < maxHp`).
    - Tướng Nam chỉ định hồi 1 HP nếu đang bị thương (`target.gender === 'male' && target.hp < target.maxHp`).
- **Xuân Hương:**
  - Phản ứng kỹ (`reactive trigger`): Lắng nghe sự kiện `ON_EQUIP_LOST`.
  - Điều kiện: Chỉ kích hoạt khi chính Hồ Xuân Hương là chủ thể bị mất trang bị (`ctx.ownerId === ctx.targetId`).
  - Hiệu ứng: Tự động rút 2 lá bài từ bộ bài rút (`drawPile`).

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/HoXuanHuongQA.test.js`.
