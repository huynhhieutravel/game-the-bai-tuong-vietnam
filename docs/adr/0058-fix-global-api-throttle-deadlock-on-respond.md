# ADR 0058: Khắc Phục Lỗi Deadlock Đứng Hình Do Global API Throttle & Kiểm Định Toàn Diện Chuỗi Phản Hồi Engine V4

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh (Context)
Người dùng báo cáo khi đang trong trận đấu, sau khi sử dụng cẩm nang (ví dụ: [Quyết Đấu], [Xiềng Xích], [Tước Bài]), trò chơi bị **đứng hình hoàn toàn** và Console DevTools ghi nhận cảnh báo:
`[Global API Throttle] Đã chặn lệnh gọi trùng lặp tới gameAPI.respond()` tại `client:525`.

## Nguyên nhân gốc rễ & Các điểm nghẽn tiềm ẩn (Root Cause & Deep QA Analysis)

1. **Cơ chế Throttle toàn cục nhầm lẫn giữa Action và Reaction:**
   Trong [client/src/contexts/GameProvider.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/contexts/GameProvider.jsx), Proxy của `useGameAPI()` sử dụng biến cờ module-level `isSubmittingGlobal` để chống click đúp spam (khóa 400ms).
2. **Quy trình kích hoạt chuỗi Hóa Giải (Negate Chain):**
   - Khi người chơi dùng một lá Cẩm nang (Trick), Engine V4 gọi `_startNegateChain` và đẩy Frame `ASK_NEGATE` vào `priorityStack`.
   - Vòng ưu tiên hỏi bắt đầu từ chính người chơi vừa đánh lá bài (`sourceId`).
   - React UI cập nhật `gameState.waitingForResponse = { type: 'ask_negate', responderId: 0 }`.
   - [client/src/components/modals/ModalContainer.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/ModalContainer.jsx) có `useEffect` tự động bỏ qua nếu người chơi không có lá Hóa Giải:
     `gameAPI.respond({ playerId: mainPlayerId, doNegate: false });`
   - Cuộc gọi này diễn ra trong vòng ~5-15ms sau khi người chơi bấm nút dùng bài, trong khi `isSubmittingGlobal` vẫn đang bật `true`.
   - Vì payload phản hồi thiếu cờ `_isAuto: true`, Proxy coi đây là một cuộc gọi "click spam" và **hủy bỏ hoàn toàn** cuộc gọi `gameAPI.respond()`.
   - Engine V4 vĩnh viễn ở trạng thái chờ câu trả lời của người chơi cho `ASK_NEGATE`. Không có sự kiện nào tiếp tục được xử lý, khiến toàn bộ bàn cờ bị đóng băng.
3. **Lỗ hổng xử lý phản hồi của Bot (BotRunnerV4):**
   - Trong [shared/engine_v4/application/BotRunnerV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/BotRunnerV4.js), `chosenCard` chỉ kiểm tra `reaction.dodgeCard` và `reaction.peachCard` mà bỏ sót `reaction.slashCard` và `reaction.negateCard`. Do đó, khi Bot tham gia Quyết Đấu (`ASK_SLASH_DUEL`) hoặc có bài Hóa Giải (`ASK_NEGATE`), Bot luôn gửi `canceled: true` và không thể đánh trả dù có bài trên tay.
   - **Treo game khi Bot trong hàng đợi tử trận:** Nếu một Bot trong `priorityQueue` tử trận trước khi tới lượt phản hồi, `currentActor.isAlive === false` khiến Bot không gửi phản hồi, bỏ rơi frame trên đỉnh `priorityStack`.
4. **Lỗ hổng truy cập `req.dyingId` trong `ModalContainer.jsx`:**
   - Trong `ask_peach`, mã nguồn đọc `req.dyingId` thay vì `req.dyingPlayerId ?? req.dyingId ?? req.targetId`. Khi đối thủ hấp hối, `gameState.players[req.dyingId]` trả về `undefined`, dẫn đến lỗi nghiêm trọng `TypeError: Cannot read properties of undefined (reading 'hp')` làm crash màn hình React.

## Quyết định (Decision)

1. **Miễn nhiễm hoàn toàn cho `gameAPI.respond()` ([GameProvider.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/contexts/GameProvider.jsx)):**
   - Trong `GameProvider.jsx`, `respond` là hàm phản hồi trạng thái chờ (`waitingForResponse`) của StateMachine. Nó không bao giờ được phép bị chặn bởi throttle của các hành động chủ động (`useCard`, `useSkill`, `endPhase`).
   - Bất kể `isSubmittingGlobal` đang ở trạng thái nào, nếu `propKey === 'respond'`, Proxy lập tức chuyển tiếp gọi thực thi ngay lập tức.
2. **Giải phóng cờ Throttle ngay khi Engine phát State mới:**
   - Trong `dispatcher.subscribe((engineState) => ...)`, reset `isSubmittingGlobal = false` ngay lập tức. Khi Engine đã xử lý xong và render state mới, người chơi được phép thực hiện hành động hợp lệ tiếp theo mà không phải chịu độ trễ nhân tạo.
3. **Thêm cờ `_isAuto: true` cho `ModalContainer.jsx`:**
   - Bổ sung `_isAuto: true` vào hàm auto-skip `ask_negate` trong `ModalContainer.jsx`.
4. **Nâng cấp toàn diện cho BotRunnerV4 ([BotRunnerV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/BotRunnerV4.js)):**
   - Hỗ trợ đầy đủ `slashCard`, `negateCard`, `cardId`.
   - Bổ sung cơ chế **Dead Actor Auto-Pass**: Nếu actor trong hàng đợi ưu tiên đã tử trận (`!currentActor.isAlive`), tự động phản hồi `canceled: true` để giải phóng frame, loại bỏ nguy cơ deadlock.
   - Fallback `currentActorId`: Luôn suy diễn qua `frame.currentActorId ?? frame.priorityQueue?.[0] ?? frame.targetId`.
5. **Crash-proof helper `findPlayer` trong ModalContainer ([ModalContainer.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/ModalContainer.jsx)):**
   - Thay thế các truy cập thô `gameState.players[...]` bằng `findPlayer(id)`.
   - Sửa `ask_peach` để đọc `req.dyingPlayerId ?? req.dyingId ?? req.targetId` và fallback an toàn cho `hp`.

## Hệ quả & Kiểm thử (Consequences & QA Verification)
- Khắc phục triệt để hiện tượng đứng hình khi dùng Cẩm nang ([Quyết Đấu], [Xiềng Xích], [Tước Bài], v.v.).
- 100% test pass (578/578 tests across 73 test files).
- Production build sạch 0 warning/error.
- Kiểm thử giả lập 1.000 trận đấu song tướng Engine V4 không có bất kỳ lỗi invariant nào.
- Kiểm thử thực tế trên Chrome DevTools xác nhận không còn bất kỳ warning `[Global API Throttle]` nào, popup Hóa Giải hiển thị chính xác khi người chơi có bài, và khi bấm Bỏ qua bàn đấu tiếp tục mượt mà.
