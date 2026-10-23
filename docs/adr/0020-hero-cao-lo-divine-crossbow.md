# ADR 0020: Thiết Kế & Quy Chuẩn Kỹ Năng Cao Lỗ (Nỏ Thần — Tầm Đánh Theo Điểm, Khóa Né & Tăng Sát Thương)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Cao Lỗ là vị tướng xạ thủ cơ động và uy lực bậc nhất của phe 🟢 LẠC (Thục) với lượng máu chuẩn 4 HP (Nam). Danh tướng này nắm giữ vũ khí huyền thoại qua kỹ năng:
- **Nỏ Thần (Divine Crossbow - Lock Skill)**:
  1. **Tầm Đánh Bằng Điểm Số**: Tầm công kích hiệu dụng của lá bài [Chém] bằng đúng điểm số (rank) ghi trên lá bài đó (Rank 1 $\rightarrow$ Tầm 1, Rank 10 $\rightarrow$ Tầm 10, Rank 13 $\rightarrow$ Tầm 13).
  2. **Áp Đảo Bài Tay (Cấm Né)**: Khi Chém chỉ định mục tiêu, nếu số lượng bài trên tay của Cao Lỗ không ít hơn mục tiêu (`owner.hand.length >= target.hand.length`), đòn Chém trở thành không thể tránh né (`unavoidable = true`).
  3. **Khắc Khổ Nghịch Cảnh (Tăng Sát Thương)**: Nếu lượng máu hiện tại của Cao Lỗ không nhiều hơn mục tiêu (`owner.hp <= target.hp`), đòn Chém được cộng thêm +1 điểm sát thương (`damageAmount += 1`).

## Quyết định Thiết kế (Decisions)

### 1. Tầm Đánh Theo Điểm Số Lá Bài (Card Rank as Attack Range)
- Kỹ năng được tích hợp tại `RangeSystem.getAttackRange`:
  - Khi người chơi sở hữu kỹ năng `no_than_cao_lo` và lá bài sử dụng là lá [Chém] (`card.type === 'slash'` hoặc `card.name === 'Chém'` / `card.idKey === 'chem'`), tầm đánh được tính trực tiếp bằng `card.rank`.
  - Tầm đánh này áp dụng trực tiếp cho việc xác định danh sách mục tiêu hợp lệ trong `RangeSystem.getValidSlashTargets` và `BotBrain.decideAction`.
  - Do là Tỏa Định Kỹ, Cao Lỗ có thể tận dụng tầm bắn này ngay cả khi đang ẩn mình; khi đòn Chém được phát động thành công, Cao Lỗ sẽ tự động hiển lộ chân dung.

### 2. So Sánh Bài Tay Khóa [Né] (Hand Size Comparison)
- Tích hợp tại Trigger `ON_SLASH_TARGET`:
  - Được kích hoạt ngay sau khi lá Chém rời khỏi tay Cao Lỗ vào khu vực xử lý/bỏ bài.
  - So sánh số lượng bài trên tay hiện có: Nếu `owner.hand.length >= target.hand.length`, gắn cờ `unavoidable = true`.
  - Khi `unavoidable = true`, `CombatRules.playSlash` bỏ qua hoàn toàn việc đẩy khung `ASK_DODGE` vào `PriorityStack`, vô hiệu hóa cả lá [Né] trên tay lẫn phán xét [Bát Quái / Thần Giáp] của đối phương và áp dụng sát thương trực tiếp.

### 3. So Sánh Máu Tăng Sát Thương (HP Comparison Damage Boost)
- Tích hợp tại Trigger `ON_SLASH_TARGET`:
  - So sánh máu: Nếu `owner.hp <= target.hp`, tăng `slashEvent.damageAmount += 1`.
  - Mức sát thương này được lưu vào context của khung `ASK_DODGE` (nếu đối phương còn được phép Né), hoặc áp dụng trực tiếp (nếu đối phương bị khóa Né).
  - **Cộng dồn với Rượu**: Nếu trước đó Cao Lỗ đã uống [Rượu] (`wineActive = true`), mức sát thương là: 1 (gốc) + 1 (Rượu) + 1 (Nỏ Thần) = 3 điểm sát thương cực đại.

## Hệ Quả (Consequences)
- Cao Lỗ sở hữu tầm phủ chiến trường siêu việt mà không phụ thuộc vào vũ khí tầm xa, có thể tiêu diệt các tướng phòng thủ trốn ở cự ly xa chỉ với 1 lá bài Chém điểm cao.
- Kiểm soát bài tay và kiểm soát máu biến Cao Lỗ thành mối hiểm họa chết người trong các pha dồn sát thương kết liễu.
