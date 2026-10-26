# ADR 0094: PriorityFrame Wait Guard, Dying Target Protection & Turn 1 Draw Phase Lifecycle

## 1. Context & Motivation
Người chơi phát hiện 3 hiện tượng bất thường khi chơi chế độ Quốc Chiến:
1. **Bị chém liên tục & Bot đánh bài khi đang chờ cứu viện:**
   - Người chơi 3 (Bot - Nguyễn Bặc & Lê Ngân) dùng [Loạn Tiễn] khiến Người chơi 4 rơi vào trạng thái Hấp Hối (HP: -1).
   - Hệ thống chuyển quyền dùng Đào sang Bạn (Human P0). Nhưng Bạn chưa kịp thao tác, Bot 3 đã lập tức đánh tiếp 1 lá [Chém] lên Người chơi 4, khiến HP của P4 giảm tiếp xuống -2, rồi Bot 3 kết thúc lượt.
2. **Nhiều bài và giới hạn bài không bị bỏ khi hết lượt:**
   - Bot 3 có tới 6 lá bài trên tay, nhưng khi kết thúc lượt không bị bắt buộc bỏ bài.
3. **Mất giai đoạn rút bài của Lượt 1:**
   - Khi bắt đầu ván đấu, Người chơi 0 (Bạn) là người đi đầu tiên nhưng không được rút 2 lá bài của Giai đoạn Rút bài (Draw Phase), chỉ có 4 lá ban đầu + 2 lá thưởng Tiên Phong cắm cờ + 1 lá thưởng Âm Dương lẻ sinh lực = 7 lá bài.

## 2. Root Cause Analysis
1. **Thiếu lệnh dừng (`return`) khi frame chờ Human trong `BotRunnerV4.js`:**
   - Khi có frame trên `priorityStack` (ví dụ `ASK_PEACH`), `BotRunnerV4` kiểm tra `actor = state.players.find(p => p.id === frame.currentActorId)`.
   - Nếu `actor` là người chơi Người (`!actor.isBot`), điều kiện `if (actor && actor.isBot)` bị bỏ qua và code **rơi tự do xuống Section 3: Xử lý Lượt Hành Động của Bot**.
   - Tại Section 3, Bot 3 thấy đang là lượt của mình và phase là `ACTION`, nên lập tức chạy `BotBrain.decideAction`, chọn mục tiêu có máu thấp nhất (chính là P4 đang hấp hối) và phát động tiếp lệnh [Chém].
2. **Thiếu bảo vệ mục tiêu Hấp Hối trong `CombatRules.js` & `TrickRules.js`:**
   - `playSlash` và `playTrick` chỉ kiểm tra `isAlive`, không kiểm tra `target.hp <= 0`. Do đó, người chơi đang trong cửa sổ cứu viện tiếp tục bị chọn làm mục tiêu tấn công.
3. **Bỏ qua Discard Limit do Stack bẩn khi kết thúc pha:**
   - Do Bot 3 thực hiện hành vi trái luật (đánh Chém khi đang hỏi Đào), một frame `ASK_PEACH` mới bị chồng lên.
   - Khi Bot 3 hết bài và gọi `endPhase`, `StateMachine._runPhaseDiscard()` thấy `!state.priorityStack.isEmpty()` nên bỏ qua `_checkDiscardLimit`.
   - Sau đó trong pha `DISCARD`, Bot thấy frame trên đỉnh không phải `ASK_DISCARD` nên gọi tiếp `endPhase` sang `END`, lách qua hoàn toàn khâu bỏ bài và giữ nguyên 6 lá trên tay.
4. **Nhảy cóc giai đoạn khởi tạo Lượt 1 trong `gameSetupV4.js`:**
   - Tại `gameSetupV4.js`, sau khi chia 4 lá bài ban đầu cho mỗi người, hệ thống gán trực tiếp `v4GameState.currentPhase = PHASES.ACTION` thay vì khởi động lượt chơi qua `StateMachine.startTurn(0)`.
   - Do đó, Lượt 1 hoàn toàn bỏ qua Pha Bắt đầu, Pha Phán xét và đặc biệt là **Pha Rút bài (Draw Phase)** của Người chơi 0.

## 3. Decision & Architecture
1. **Bảo vệ PriorityFrame trong `BotRunnerV4.js`:**
   - Nếu `frame` đang tồn tại trên `priorityStack` hoặc `waitingForResponse`:
     - Nếu `actor.isBot`: khởi tạo timer xử lý phản hồi và `return`.
     - Nếu `!actor.isBot` (người chơi Người hoặc đang chờ): `return;` lập tức, **tuyệt đối không để luồng thực thi rơi xuống Section 3**.
   - Tại timer của pha `ACTION`: bổ sung điều kiện bảo vệ `if (latestPhase !== 'ACTION' || !latestState.priorityStack.isEmpty() || latestState.waitingForResponse) return;`.
   - Tại timer của pha `DISCARD`: chỉ kết thúc pha khi `excess <= 0 && (!currentFrame || currentFrame.type !== 'ASK_DISCARD')`. Nếu còn bài thừa hoặc frame khác, không được tự ý gọi `endPhase`.
2. **Chặn tấn công mục tiêu đang Hấp Hối (`hp <= 0`):**
   - Trong `CombatRules.playSlash`: ném lỗi `Mục tiêu đang trong trạng thái Hấp Hối (HP: ${target.hp}), không thể tấn công!`.
   - Trong `TrickRules.playTrick`: chặn các cẩm nang đơn mục tiêu nhắm vào người chơi có `target.hp <= 0`.
   - Trong `RangeSystem.getValidSlashTargets` & `BotBrain._sortTargetsByPriority`: loại trừ người chơi có `hp <= 0` khỏi danh sách mục tiêu tấn công hợp lệ.
3. **Chuẩn hóa vòng đời Lượt 1 trong `gameSetupV4.js`:**
   - Thay thế việc gán cứng `currentPhase = PHASES.ACTION` bằng lệnh gọi:
     ```javascript
     const stateMachine = new StateMachine(v4GameState);
     stateMachine.startTurn(0);
     ```
   - Người chơi 0 được vận hành đầy đủ 6 pha vòng đời chuẩn: Pha Bắt đầu -> Pha Phán xét -> Pha Rút bài (rút 2 lá bài và ghi log chuẩn) -> Pha Ra bài.

## 4. Verification & QA Hardening
1. **Bộ Test Suite Mới:** `shared/engine_v4/__tests__/application/PriorityFrameDyingTargetAndTurn1DrawQA.test.js`:
   - Test 1: BotRunner không được thực hiện Turn Action khi PriorityFrame đang chờ Human P0.
   - Test 2: `CombatRules.playSlash` và `TrickRules.playTrick` từ chối tấn công mục tiêu đang hấp hối (`hp <= 0`).
   - Test 3: Lượt 1 của trận đấu sau Draft kích hoạt đúng Pha Rút bài, người chơi 0 nhận đủ 4 lá ban đầu + 2 lá rút bài lượt 1 = 6 lá.
   - Test 4: Bot trong Pha Bỏ bài không thể gọi `endPhase` khi bài trên tay vượt quá Max Hand.
2. **Regression Testing Toàn Diện:**
   - 105/105 test files PASS 100% (917/917 tests).
   - Bao gồm 200 trận đấu bot ngẫu nhiên gắn Tướng & Kỹ năng chạy thành công với 0 lỗi exception, 0 deadlock.
   - Client production build thành công trong 473ms.
