# ADR 0055: QA Tướng Nguyễn Địa Lô (nguyen_dia_lo) — Hộ Chủ & Can Gián

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Nguyễn Địa Lô (`nguyen_dia_lo`) — Phe 🔵 HÀ.
- **Máu:** 4 HP / 4 Max HP. Giới tính: Nam.
- **Kỹ năng:**
  1. **Hộ Chủ (`ho_chu`):** Khi bạn rơi vào trạng thái Hấp hối (`ON_DYING`), lật lá bài trên cùng của chồng bài rút và đặt lên tướng của bạn, gọi là "Trung". Nếu điểm số của lá bài này khác với tất cả các lá "Trung" đã có, bạn hồi phục đến 1 điểm Sinh lực. Nếu trùng điểm số, bỏ lá bài đó vào chồng bài bỏ. Khi trên tướng của bạn có "Trung", giới hạn trữ bài bằng số lá "Trung".
  2. **Can Gián (`can_gian`):** Khi một tướng bị bỏ hoặc bị thu lấy bài trên tay, bạn có thể mất 1 điểm Sinh lực (chỉ dùng khi HP > 1). Nếu làm vậy, tướng đó rút 2 lá bài.

## 2. Thiết kế Cơ chế & Ràng buộc
- **Hộ Chủ:**
  - Kích hoạt khi hấp hối (`ON_DYING`): Mở frame `ASK_HO_CHU`.
  - Phản hồi lật lá bài từ đỉnh `drawPile`:
    - Nếu rank khác với mọi lá trong `trungCards`: Thêm lá bài vào `trungCards`, hồi phục máu về 1 HP (`hp = Math.max(1, hp)`), hóa giải nguy cơ tử vong.
    - Nếu trùng rank: Đưa lá bài vào `discardPile`, không hồi máu và tiếp tục vòng hấp hối.
  - Tích hợp Max Hand: Khi có `trungCards`, giới hạn bài tay tối đa được tính bằng $\max(\text{HP}, \text{trungCards.length})$.
- **Can Gián:**
  - Chủ động / phản ứng kỹ: Tiêu hao 1 điểm Sinh lực của Nguyễn Địa Lô (`hp -= 1`) để giúp tướng mục tiêu rút 2 lá bài từ bộ bài rút.
  - Chốt an toàn: Tuyệt đối chặn không cho kích hoạt khi Nguyễn Địa Lô chỉ còn 1 HP (`hp <= 1`).

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/NguyenDiaLoQA.test.js`.
