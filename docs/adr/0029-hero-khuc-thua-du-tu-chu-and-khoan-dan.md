# ADR 0029: Thiết Kế & Quy Chuẩn Kỹ Năng Khúc Thừa Dụ (Tự Chủ & Khoan Dân)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Khúc Thừa Dụ (Tiết Độ Sứ đầu tiên giành quyền tự chủ cho đất Việt, mở ra kỷ nguyên độc lập tự chủ) là vị lãnh tụ đức độ mưu lược của phe 🔴 VIỆT (Ngụy) với lượng máu cơ bản 3 HP (Nam). Danh tướng nắm giữ 2 kỹ năng phối hợp giữa đấu trí quyền mưu và cứu trợ muôn dân:
1. **Tự Chủ (Autonomy - Active / Turn Skill)**: Trong pha Ra bài, Khúc Thừa Dụ có thể phát động đấu điểm (so sánh rank lá bài) với một người chơi khác có lượng máu hiện tại cao hơn mình. Nếu Khúc Thừa Dụ thắng, đối phương bị ép dùng [Chém] tấn công một người chơi khác do Khúc Thừa Dụ chỉ định. Nếu Khúc Thừa Dụ thua hoặc hòa, đối phương sẽ Chém thẳng vào Khúc Thừa Dụ.
2. **Khoan Dân (Benevolent Relief - Reactive Skill)**: Sau mỗi khi Khúc Thừa Dụ nhận sát thương, có thể chỉ định 1 người chơi (bản thân hoặc đồng minh) rút bài từ bộ bài cho đến khi số lượng bài trên tay bằng với giới hạn máu (maxHp, tối đa 5 lá).

## Quyết định Thiết kế (Decisions)

### 1. Tự Chủ — Đấu Điểm Quyền Mưu
- **Kích hoạt**:
  - Gửi action `ACTION_USE_SKILL` với `skillId: 'tu_chu'` trong Pha Ra Bài (`PHASES.ACTION`).
  - Dispatcher đẩy frame `ASK_TU_CHU`.
- **Quy tắc đấu điểm (Point Duel)**:
  - Khúc Thừa Dụ nộp 1 lá bài tay (`myCard`) và mục tiêu nộp 1 lá bài tay (`oppCard`). Cả 2 lá bài đều bị loại bỏ vào `discardPile`.
  - Quy đổi rank bài theo chuẩn (2-10, J=11, Q=12, K=13, A=1 hoặc 14 tùy chuẩn; ở đây `rankToNumber` xử lý chính xác).
  - **Nếu Khúc Thừa Dụ thắng điểm (`myRank > oppRank`)**:
    - Mục tiêu bị ép tung ra một đòn [Chém] ảo (`{ name: 'Chém', virtual: true }`) lên một người chơi khác trên bàn đấu (`CombatRules.playSlash(state, target.id, other.id, ...)`).
  - **Nếu Khúc Thừa Dụ thua hoặc hòa (`myRank <= oppRank`)**:
    - Mục tiêu lập tức dùng cú Chém ảo phản công thẳng vào Khúc Thừa Dụ (`CombatRules.playSlash(state, target.id, playerId, ...)`).

### 2. Khoan Dân — Bù Đắp Tài Nguyên Sau Tổn Thương
- **Trigger**: Kích hoạt tại sự kiện `ON_DAMAGED` thông qua `globalHeroRegistry.dispatchTrigger('ON_DAMAGED', ctx, state)`.
- **Priority Stack Frame**:
  - Pushes frame `{ type: 'ASK_KHOAN_DAN', sourceId, targetId, currentActorId, priorityQueue: [sourceId] }`.
- **Tính toán số lượng bài rút (Deficit Calculation)**:
  $$\text{targetCap} = \min(5, \text{chosen.maxHp})$$
  $$\text{deficit} = \max(0, \text{targetCap} - \text{chosen.hand.length})$$
  - Nếu `deficit > 0`, người chơi được chọn rút ngay `deficit` lá bài từ bộ bài rút (`drawPile`).
  - Hỗ trợ linh hoạt: Khúc Thừa Dụ có thể chọn chính mình để hồi phục bài sau khi mất máu, hoặc chọn đồng minh đang cạn kiệt bài để cấp tốc tái thiết sức mạnh.

## Hệ Quả (Consequences)
- Khúc Thừa Dụ tạo ra sự răn đe mạnh mẽ: kẻ địch tấn công Khúc Thừa Dụ sẽ vô tình kích hoạt Khoan Dân giúp phe Việt nạp đầy bài tay.
- Tự Chủ là công cụ ép các tướng đối phương có máu cao tự tàn sát lẫn nhau nếu Khúc Thừa Dụ nắm giữ bài điểm cao (K, Q).
