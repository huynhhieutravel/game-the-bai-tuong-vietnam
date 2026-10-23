# ADR 0028: Thiết Kế & Quy Chuẩn Kỹ Năng Phùng Hưng (Khởi Nghĩa)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Phùng Hưng (Bố Cái Đại Vương, lãnh tụ cuộc khởi nghĩa chống đô hộ nhà Đường, biểu tượng sức mạnh tay không đả hổ) là dũng tướng công phá hàng đầu của phe 🔴 VIỆT (Ngụy) với lượng máu cơ bản 4 HP (Nam). Vị tướng này mang lối chơi tấn công cuồng bạo, hy sinh lợi thế bài để đổi lấy hỏa lực tiêu diệt mục tiêu:
1. **Khởi Nghĩa (Uprising - Reactive / Turn Skill)**: Trong giai đoạn Rút bài (Pha Rút bài - DRAW Phase), Phùng Hưng có thể chọn rút ít hơn 1 lá bài (chỉ rút 1 lá bài thay vì 2 lá mặc định). Đổi lại, trong toàn bộ lượt chơi đó, mọi đòn đánh [Chém] (Slash) và [Quyết Đấu] (Duel) do Phùng Hưng thực hiện đều được cộng thêm 1 điểm sát thương (`bonusDamage = 1`).

## Quyết định Thiết kế (Decisions)

### 1. Khởi Nghĩa — Rút Ít Bài Đổi Tăng Sát Thương
- **Trigger**: Kích hoạt tại sự kiện `DRAW_PHASE` thông qua `globalHeroRegistry.dispatchTrigger('DRAW_PHASE', { sourceId: player.id }, state)`.
- **Priority Stack Frame**:
  - Pushes frame `{ type: 'ASK_KHOI_NGHIA', sourceId, targetId, currentActorId, priorityQueue: [sourceId] }`.
- **Xử lý phản hồi (DispatcherV4)**:
  - Nếu người chơi chọn kích hoạt (`doUse: true`):
    - Đặt cờ tạm thời `player.temporaryFlags.drawCardCount = 1`.
    - Đặt cờ tạm thời `player.temporaryFlags.bonusDamage = 1`.
    - Khi `_completeDrawPhase()` được gọi, số lượng bài rút thực tế là `drawCardCount` (1 lá).
  - Nếu người chơi từ chối/bỏ qua (`isCancelOrSkip` / `doUse: false`):
    - Không gán cờ `drawCardCount` và `bonusDamage`. Phùng Hưng rút 2 lá bài thông thường.

### 2. Tác động của bonusDamage lên Chiến Đấu & Cẩm Nang
- **Đối với [Chém] (`CombatRules.playSlash`)**:
  - Lượng sát thương tính toán ban đầu:
    $$\text{damageAmount} = (\text{wineActive} ? 2 : 1) + \text{bonusDamage}$$
  - Cú Chém của Phùng Hưng khi có Khởi Nghĩa gây tối thiểu 2 điểm sát thương. Nếu kết hợp thêm [Rượu] (Wine), sát thương bộc phá lên tới 3 điểm máu trong 1 đòn đánh.
- **Đối với [Quyết Đấu] (`TrickRules.respondDuel`)**:
  - Khi Phùng Hưng chiến thắng trong một trận Quyết Đấu (đối phương không còn Chém để phản hồi):
    $$\text{damageAmount} = 1 + (\text{winner.temporaryFlags.bonusDamage} || 0)$$
  - Kẻ thua cuộc phải nhận 2 điểm sát thương.
- **Dọn dẹp cờ (Cleanup)**:
  - Cờ `bonusDamage` thuộc `player.temporaryFlags` và tự động được reset về `{}` khi bắt đầu lượt mới (`StateMachine.startTurn`).

### 3. Hỗ trợ AI (BotBrain)
- Bot Phùng Hưng tự động quét bài trên tay: nếu sở hữu ít nhất 1 lá [Chém] hoặc [Quyết Đấu], Bot sẽ ưu tiên kích hoạt Khởi Nghĩa (`doUse: true`) để kết liễu hoặc gây áp lực máu lên kẻ thù.

## Hệ Quả (Consequences)
- Phùng Hưng trở thành mũi nhọn sát thương áp đảo ngay từ đầu trận.
- Khả năng đe dọa 2 sát thương khiến đối thủ buộc phải tiêu tốn [Né] hoặc [Chém], tạo tiền đề cho đồng đội dứt điểm.
