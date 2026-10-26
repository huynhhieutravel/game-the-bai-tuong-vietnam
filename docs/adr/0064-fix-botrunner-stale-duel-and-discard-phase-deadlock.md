# ADR 0064: Triệt Tiêu Lỗi Race Condition Đọ Chém Quyết Đấu & Deadlock Pha Bỏ Bài Của Bot

## Trạng thái
Đã chấp thuận & Triển khai thành công (Accepted & Implemented)

## Bối cảnh (Context)
Trong trận đấu thực tế (kiểm tra trên trình duyệt và thiết bị iPhone 15 Pro Max), trò chơi thỉnh thoảng bị "đứng hình" (treo lượt tại `Chờ đối thủ... Chờ P2`). Kiểm tra Console DevTools ghi nhận 2 chuỗi lỗi nghiêm trọng xuất hiện đồng thời:
1. `[DispatcherV4] Error dispatching action ACTION_REACT: Error: [TrickRules] Không phải lượt đọ Chém của người chơi 3!` tại `TrickRules.respondDuel` -> `BotRunnerV4.js:104`.
2. `[DispatcherV4] Error dispatching action ACTION_END_PHASE: Error: [StateMachine] Không thể kết thúc Pha Hành động khi đang ở pha DISCARD` tại `StateMachine.endActionPhase` -> `BotRunnerV4.js:170`.

## Phân tích Nguyên nhân Gốc Rễ (Root Cause Analysis)

### 1. Cuộc Đua Bất Đồng Bộ Trong Phản Hồi PriorityFrame (`BotRunnerV4`)
- Khi một khung ưu tiên (như `ASK_NEGATE` trong Quyết Đấu) xuất hiện, `BotRunnerV4` lập lịch hẹn giờ 600ms (`setTimeout`) cho Bot đang chờ (ví dụ bot `actorId = 3`).
- Trong khoảng 600ms đó, người chơi hoặc hệ thống đã phản hồi khiến `ASK_NEGATE` được pop khỏi ngăn xếp, và `ASK_SLASH_DUEL` được đẩy lên đỉnh ngăn xếp với người cần đọ Chém là Người chơi 0 (`currentResponderId: 0`).
- Khi timer 600ms của bot 3 điểm hỏa, `BotRunnerV4` lấy `latestFrame` từ đỉnh stack (lúc này là `ASK_SLASH_DUEL`) nhưng **không kiểm tra `expectedActorId === actor.id`**, dẫn đến bot 3 gửi yêu cầu `respondDuel` thay cho Người chơi 0.
- `TrickRules.respondDuel` chặn lại và ném lỗi `Không phải lượt đọ Chém của người chơi 3!`. Khi rơi vào khối `catch (err)`, BotRunner tiếp tục cố gắng gửi lại `canceled: true` cho cùng bot 3, tạo ra lỗi kép.

### 2. Lạc Pha Giữa Action Phase và Discard Phase (`BotRunnerV4` & `StateMachine`)
- Khi bot ở Pha Hành động (`ACTION`), BotRunner đặt timer 700ms để quyết định đánh bài.
- Trước khi timer 700ms kịp chạy, pha hành động đã kết thúc và chuyển sang Pha Bỏ bài (`DISCARD`).
- Khi timer 700ms chạy, callback không kiểm tra lại `latestPhase === 'ACTION'`, khiến `BotBrain.decideAction` trả về null và BotRunner mù quáng gọi `gameAPI.endPhase(currentTurnId)`.
- `DispatcherV4._handleEndPhase` gọi `StateMachine.endActionPhase()`. Tuy nhiên `StateMachine` ném ngoại lệ: `Không thể kết thúc Pha Hành động khi đang ở pha DISCARD`.

### 3. Kẹt Bế Tắc Vĩnh Viễn Trong Pha Bỏ Bài Của Bot
- Trong `BotRunnerV4`: khi ở pha `DISCARD`, nếu số bài trên tay của bot nhỏ hơn hoặc bằng HP (`excess <= 0`), khối lệnh `if (excess > 0)` bị bỏ qua và BotRunner hoàn toàn **không thực hiện bất kỳ hành động nào**.
- Trong `DispatcherV4`: khi `priorityStack.isEmpty()` sau các phản hồi trong pha `DISCARD`, hệ thống thiếu nhánh gọi `this.stateMachine._checkDiscardLimit(turnPlayer)`.
- Kết quả: Game đứng yên vô tận ở pha `DISCARD` với 0 lá bài cần bỏ, bot không hành động và lượt không bao giờ chuyển tiếp (`Chờ P2`).

## Quyết định Thiết kế (Decisions)

### 1. Nâng cấp Bộ Lọc Khung Hợp Lệ Trong `BotRunnerV4`
- Thêm cơ chế `_clearTimer()` để triệt tiêu mọi timer phản hồi cũ khi có cập nhật trạng thái mới.
- Trong callback phản hồi, xác thực nghiêm ngặt:
  ```javascript
  const expectedActorId = latestFrame.context?.currentResponderId ?? 
                          latestFrame.currentActorId ?? 
                          latestFrame.priorityQueue?.[0] ?? 
                          latestFrame.targetId;
  if (expectedActorId !== actor.id) {
    this.isProcessing = false;
    return; // Hủy bỏ ngay lập tức nếu frame không còn chờ bot này
  }
  ```
- Trong callback hành động: kiểm tra `latestPhase === 'ACTION'`. Nếu game đã sang pha khác thì lập tức thoát, không gọi `endPhase()`.
- Xử lý trọn vẹn Pha Bỏ bài (`DISCARD`): nếu `requiredCards > 0 && type === 'ASK_DISCARD'` thì gọi `discardCards()`, ngược lại (khi không cần bỏ bài) thì gọi `endPhase(currentTurnId)` để chuyển lượt sang `END`.

### 2. Phòng Tuyến Chặn Lỗi Lạc Nhịp Tại `DispatcherV4` & `StateMachine`
- Trong `DispatcherV4._handleReact`: bổ sung chốt kiểm tra cho `ASK_SLASH_DUEL`, `ASK_SLASH_RESPONSE`, và `ASK_DODGE`. Nếu nhận được phản hồi từ người chơi không trùng khớp với người đang được chờ, ghi nhận cảnh báo và an toàn bỏ qua thay vì để vỡ luồng xử lý.
- Trong `DispatcherV4._handleEndPhase`: kiểm tra pha hiện tại. Nếu đang ở `DISCARD`, gọi `_checkDiscardLimit(player)`. Nếu đang ở `END`, gọi `nextTurn()`.
- Trong `DispatcherV4` hậu phản hồi: khi `priorityStack.isEmpty()` trong pha `DISCARD`, tự động kích hoạt `this.stateMachine._checkDiscardLimit(turnPlayer)` để giải phóng pha nếu điều kiện bỏ bài đã thỏa mãn.
- Trong `StateMachine.endActionPhase`: nếu game đã ở pha `DISCARD` hoặc `END`, tiến hành chuyển pha an toàn thay vì ném ngoại lệ dừng game.

## Kết quả Đạt được (Results)
- Chạy stress test 1.000 trận tầng ứng dụng qua Dispatcher (`run_application_layer_stress_test.mjs`): **1000/1000 trận hoàn thành, 0 Lỗi Deadlock / 0 Lỗi Ngoại Lệ**.
- 76/76 file test Vitest (663/663 tests) đều xanh.
- Đã build và đồng bộ lên thiết bị thử nghiệm iPhone thành công.
