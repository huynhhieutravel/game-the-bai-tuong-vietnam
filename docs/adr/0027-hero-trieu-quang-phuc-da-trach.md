# ADR 0027: Thiết Kế & Quy Chuẩn Kỹ Năng Triệu Quang Phục (Dạ Trạch)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Triệu Quang Phục (Dạ Trạch Vương, danh tướng kế tục Lý Nam Đế lập căn cứ kháng chiến tại đầm Dạ Trạch) là khai quốc công thần kiệt xuất của phe 🔴 VIỆT (Ngụy) với lượng máu chuẩn 4 HP (Nam). Vị tướng này mang lối chơi du kích kỳ tài, chuyển hóa thế rút bài bị động thành thế tấn công tước đoạt tài nguyên kẻ địch:
1. **Dạ Trạch (Night Swamp - Reactive / Turn Skill)**: Trong giai đoạn Rút bài (Pha Rút bài - DRAW Phase), Triệu Quang Phục có thể từ bỏ việc rút 2 lá bài thông thường từ bộ bài rút, thay vào đó chọn cướp ngẫu nhiên 1 lá bài trên tay của tối đa 2 người chơi khác trên bàn đấu.

## Quyết định Thiết kế (Decisions)

### 1. Dạ Trạch — Cướp Bài Thay Thế Rút Bài
- **Trigger**: Kích hoạt tại sự kiện `DRAW_PHASE` thông qua `globalHeroRegistry.dispatchTrigger('DRAW_PHASE', { sourceId: player.id }, state)`.
- **Điều kiện phát động**:
  - Chỉ kích hoạt khi có ít nhất 1 đối thủ còn sống sở hữu bài trên tay (`opponentsWithCards.length > 0`). Nếu toàn bộ người chơi khác đều không có bài trên tay, kỹ năng tự động bỏ qua để tiến hành rút 2 lá bài bình thường từ chồng bài rút (`drawPile`).
- **Priority Stack Frame**:
  - Pushes frame `{ type: 'ASK_DA_TRACH', sourceId, targetId, currentActorId, priorityQueue: [sourceId] }`.
- **Xử lý phản hồi (DispatcherV4)**:
  - Nếu người chơi chọn kích hoạt (`doUse: true`) và cung cấp danh sách mục tiêu (`targets`):
    - Đặt cờ tạm thời `player.temporaryFlags.skipDrawPhase = true`.
    - Duyệt qua tối đa 2 mục tiêu hợp lệ (`data.targets.slice(0, 2)`): lấy ngẫu nhiên 1 lá bài từ tay mục tiêu (`target.hand.pop()`) và đưa vào tay Triệu Quang Phục (`player.hand.push(...)`).
  - Nếu người chơi từ chối/bỏ qua (`isCancelOrSkip` / `doUse: false`):
    - Không gán cờ `skipDrawPhase`.
- **Tự động chuyển tiếp pha**:
  - Khi priority stack trống và pha hiện tại là `PHASES.DRAW`, gọi `this.stateMachine._completeDrawPhase()`.
  - Nếu `skipDrawPhase` là `true`: Ghi log bỏ qua rút bài và xóa cờ, chuyển thẳng sang Pha Ra bài (`PHASES.ACTION`).
  - Nếu `skipDrawPhase` không bật: Triệu Quang Phục rút 2 lá bài bình thường từ bộ bài rút và chuyển tiếp sang Pha Ra bài.
- **Hỗ trợ AI (BotBrain)**:
  - Tự động lọc các đối thủ không phải đồng minh còn bài trên tay, chọn tối đa 2 mục tiêu để cướp bài thay vì rút thường.

## Hệ Quả (Consequences)
- Triệu Quang Phục trở thành khắc tinh lớn của những vị tướng dựa dẫm vào tích trữ bài trên tay.
- Việc cướp bài làm giảm số lượng bài của 2 kẻ thù cùng lúc, vừa tăng tài nguyên cho bản thân, vừa triệt tiêu khả năng phòng thủ của đối phương trước khi bước vào Pha Ra bài.
