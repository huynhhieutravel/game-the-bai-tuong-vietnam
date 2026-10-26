# ADR 0067: Tạm Dừng Client Watchdog Auto-Skip Để Phục Vụ Thực Chiến & Sửa Lỗi Render

## Bối cảnh (Context)
1. **Lỗi cưỡng chế Bỏ lượt (Auto-Skip):**
   - Trước đây, hệ thống được trang bị bộ đếm Watchdog Timer 15 giây trong [ModalContainer.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/ModalContainer.jsx).
   - Khi người chơi thực chiến đang đọc bài, suy nghĩ hoặc thao tác, đồng hồ đếm ngược 15s tự động gửi payload `canceled: true` qua `handleResponseAction`. Hậu quả là người chơi bị bỏ qua các phản hồi sống còn (như [Né], [Chém], [Đào] cứu mạng), dẫn đến mất máu và thua oan uổng.
2. **Lỗi React Render Crash:**
   - Trong `setTimeLeft((prev) => { ... })`, code gọi trực tiếp `handleResponseAction(...)`, hàm này lại gọi `setGameState` trong `GameProvider` trong lúc React đang thực thi updater function.
   - Điều này kích hoạt lỗi đỏ nghiêm trọng trên Console:
     `Cannot update a component ('GameProvider') while rendering a different component ('ModalContainer')`.

## Quyết định & Thực thi (Decisions & Implementation)
1. **Tạm dừng hoàn toàn cơ chế cưỡng chế Auto-Skip:**
   - Đã loại bỏ lệnh gọi `handleResponseAction` khi timer chạm mốc 0.
   - Khi đồng hồ đếm ngược từ 15s về 0s, hệ thống dừng lại ở `0s (Chờ thao tác)` và **giữ nguyên modal**, chờ người chơi tương tác bấm nút chủ động mà không bao giờ tự ý bỏ lượt của người chơi.
2. **Khắc phục triệt để lỗi React setState:**
   - Không còn bất kỳ tác vụ phụ (side-effect) nào chạy bên trong hàm updater của `setTimeLeft`, loại bỏ 100% nguy cơ xảy ra lỗi `Cannot update a component ('GameProvider') while rendering a different component ('ModalContainer')`.
3. **Bảo tồn huy hiệu Timeline Request:**
   - Huy hiệu `⏳ {timeLeft}s` vẫn hiển thị ở góc trên bên phải để người chơi theo dõi thời gian của yêu cầu, chuyển màu xám khi hết 15s để báo hiệu trạng thái chờ.

## Kết quả kiểm định (Verification)
- Toàn bộ **77/77 test suites (667 tests)** đạt 100% Pass.
- Test case `does not auto-skip when 15s timer expires` trong [modals.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/modals.test.jsx) xác thực khi hết 15s, `mockRespond` không bao giờ bị kích hoạt tự động.
- Build web asset và compile Xcode `App.app` thành công với zero errors.
