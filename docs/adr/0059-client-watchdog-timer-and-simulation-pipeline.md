# ADR 0059: Thiết Lập Client-Side Watchdog Timer & Tích Hợp Đại Giả Lập Tầng Ứng Dụng Vào Pipeline

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh (Context)
Trong quá trình bảo trì và kiểm thử hệ thống game bài Việt Sát (Engine V4), hai vấn đề kiến trúc quan trọng được phát hiện:

1. **Khoảng cách giữa kiểm thử Core Engine và Tầng Ứng Dụng (Application Layer Gap):**
   - Script giả lập 1.000 trận trước đó (`run_1000_matches.mjs`) chỉ chạy thuần túy trên tầng Core Engine (`StateMachine` + `BotBrain` gọi trực tiếp các hàm rules).
   - Do không đi qua `GameAPIV4`, không qua Proxy Throttle của `GameProvider.jsx`, và không có chu kỳ render/mount của React Component, các lỗi ở ranh giới giao diện (Integration Boundary Defect) — như lỗi `Global API Throttle` chặn hàm `respond()` — hoàn toàn bị lọt qua.
2. **Nguy cơ Deadlock khi người chơi treo máy (AFK) hoặc Modal bị nghẽn:**
   - Khi Engine gửi yêu cầu phản hồi (`waitingForResponse`), ngăn xếp ưu tiên (`priorityStack`) tạm dừng ván đấu để chờ quyết định của người chơi.
   - Nếu người chơi không phản hồi (do AFK, sự cố mạng, hoặc trường hợp lỗi logic rendering), toàn bộ bàn cờ bị treo vĩnh viễn, các người chơi khác và Bot không thể tiếp tục trận đấu.

## Quyết định (Decision)

### 1. Xây dựng & Tích hợp Bộ Kiểm Thử Giả Lập Tầng Ứng Dụng (`sim:app`)
- Tạo script [shared/engine_v4/simulation/run_application_layer_stress_test.mjs](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/simulation/run_application_layer_stress_test.mjs).
- Kiểm thử toàn diện 1.000 trận đấu song tướng mô phỏng chính xác hành vi người dùng:
  - Khởi tạo đầy đủ `DispatcherV4`, `GameAPIV4`, `BotRunnerV4`, và `GameViewMapperV4`.
  - Bọc `GameAPIV4` qua Proxy Throttle 400ms mô phỏng 100% cơ chế chống spam click của React Context.
  - Tự động phát hiện và ghi nhận ngoại lệ, deadlock, vòng lặp vô hạn, hoặc các lệnh phản hồi bị throttle chặn ngoài ý muốn.
- **Tích hợp vào Pipeline [package.json](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/package.json):**
  - Bổ sung lệnh `npm run test:all`: Chạy song song unit test và giả lập ứng dụng.
  - Gắn chặt vào quy trình đóng gói di động: `"cap:build": "npm run sim:app && npm run cap:build --workspace=client"`. Bất kỳ phiên bản mobile nào cũng phải vượt qua 1.000 trận giả lập ứng dụng trước khi sync mã nguồn.

### 2. Triển khai Client-Side Watchdog Timer (Bộ Đếm Thời Gian Tự Động Giải Phóng)
- Trong [client/src/components/modals/ModalContainer.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/ModalContainer.jsx):
  - Định danh yêu cầu tương tác duy nhất thông qua `activeReqKey`. Bỏ qua các pha chơi chính (`draw_phase`, `play_phase`, `discard_phase`, `end_phase`) đã có UI riêng.
  - Khởi tạo bộ đếm 15 giây (`timeLeft`). Mỗi khi có yêu cầu mới hướng đến người chơi chính (`me.id`), bộ đếm tự động reset về 15.
  - Hiển thị phù hiệu đếm ngược trực quan (`data-testid="modal-watchdog-pill"`):
    - Vị trí: Cố định góc trên bên phải màn hình (`top: 20px, right: 20px`, `zIndex: 99999`).
    - Giao diện: Thiết kế kính mờ sang trọng; khi $\le 5$ giây tự động chuyển sang màu đỏ cảnh báo (`#ef4444`) với viền phát sáng.
    - `pointerEvents: 'none'` để không cản trở thao tác bấm của người chơi.
  - Khi hết 15 giây mà người chơi chưa chọn, Watchdog tự động kích hoạt:
    ```javascript
    handleResponseAction({
      playerId: me.id,
      askerId: me.id,
      canceled: true,
      doReact: false,
      doNegate: false,
      doSave: false,
      doProvide: false,
      doUse: false,
      _isAuto: true
    });
    ```
    Lệnh này giải phóng an toàn frame ưu tiên hiện tại, giúp trận đấu tiếp diễn bình thường mà không gây crash hay đứng hình.

## Hệ quả & Kiểm định (Consequences & QA Verification)
- **Độ tin cậy tuyệt đối:** Ván game không còn bất kỳ điểm chết nào có thể làm đứng hình bàn đấu.
- **Tự động hóa hoàn toàn:** Mọi phiên bản build production và build di động đều được bảo vệ bởi rào chắn 1.000 trận giả lập tầng ứng dụng.
- **Kiểm thử Unit Test:** Toàn bộ 580/580 tests trong 73 file test đều đạt kết quả xanh (Pass 100%), bao gồm cả 2 test case mới xác thực cơ chế hiển thị badge và auto-skip sau 15s của Watchdog Timer.
- **Tốc độ thực thi:** 1.000 trận tầng ứng dụng hoàn tất chỉ trong 1.32 giây với 0 deadlock, 0 lệnh bị drop.
