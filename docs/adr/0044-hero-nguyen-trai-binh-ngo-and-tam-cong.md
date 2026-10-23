# ADR 0044: Chuẩn Hóa Cơ Chế Tướng Nguyễn Trãi — Bình Ngô & Tâm Công

## 1. Bối cảnh & Hiện trạng
Nguyễn Trãi (`nguyen_trai`) là Đại Thi Hào - Quân Sư Lỗi Lạc thuộc **Phe 🔵 HÀ**, sở hữu 3 HP và 2 kỹ năng:
1. **Bình Ngô (`binh_ngo`):** Phản ứng kích hoạt tại Pha Rút bài (`PHASES.DRAW`). Cho phép Nguyễn Trãi rút thêm 1 lá bài từ bộ bài rút, nâng tổng số bài rút trong lượt lên 3 lá (`drawCardCount = 3`).
2. **Tâm Công (`tam_cong`):** Kỹ năng công tâm chủ động trong Pha Ra bài (`PHASES.ACTION`). Nguyễn Trãi chỉ định một tướng khác chọn 1 chất bài (Cơ, Rô, Bích, Tép / Chuồn). Người đó thu lấy 1 lá bài từ tay Nguyễn Trãi và mở ra. Nếu chất bài không khớp với dự đoán, mục tiêu phải chịu 1 điểm sát thương do Nguyễn Trãi gây ra. Giới hạn 1 lần mỗi lượt (`usedThisTurn`).

## 2. Quyết định Kỹ thuật
- **Bình Ngô:**
  - Hook vào trigger `DRAW_PHASE` trong `StateMachine._runPhaseDraw`.
  - Cờ `ctx.owner.temporaryFlags.drawCardCount = 3` được thiết lập, đảm bảo `state.drawCards(player.id, 3)` được thực hiện chính xác và an toàn.
- **Tâm Công:**
  - Kiểm tra điều kiện: Nguyễn Trãi phải có ít nhất 1 lá bài trên tay (`hand.length > 0`) và chưa dùng Tâm Công trong lượt (`!usedThisTurn`).
  - Đẩy PriorityFrame `ASK_SUIT` với `sourceId: nguyenTrai.id` và `targetId: target.id`.
  - Khi mục tiêu phản hồi qua `ACTION_REACT`:
    - Rút ngẫu nhiên 1 lá bài từ tay Nguyễn Trãi chuyển sang tay mục tiêu.
    - So sánh `chosenSuit` với `card.suit`.
    - Nếu khác chất: ghi log và gọi `CombatRules.applyDamage(state, sourceId, targetId, 1, 'tam_cong')`.
    - Nếu trùng chất: ghi log an toàn và không gây sát thương.

## 3. Hệ quả & Ràng buộc
- Đảm bảo tính toán đúng chuẩn chất bài (hỗ trợ cả ký hiệu Unicode `♥, ♦, ♠, ♣` và tên tiếng Anh `heart, diamond, spade, club`).
- Chặn kích hoạt khi Nguyễn Trãi hết bài trên tay hoặc lạm dụng nhiều lần trong lượt.
