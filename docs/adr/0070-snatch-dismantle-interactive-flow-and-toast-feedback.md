# ADR 0070: Interactive Snatch & Dismantle Flow, Combat/Trick Toast Feeds, and Discard Guidance

## 1. Bối cảnh & Vấn đề (Context & Problems)
1. **Trải nghiệm chơi bị ngắt quãng và "im bặt" sau khi dùng Cẩm nang:**
   - Khi người chơi dùng lá bài [Tước Bài] hoặc [Cướp Bài], hệ thống ở v4 tự động bốc ngẫu nhiên 1 lá trên tay của mục tiêu một cách âm thầm mà không hiển thị pop-up tương tác chọn bài (như đã có ở v3).
   - Sau khi cẩm nang thi triển, không có thông báo kết quả nổi bật (ai đã tước lá gì, cẩm nang có hiệu lực hay bị hóa giải, né thành công hay trúng đòn).
   - Người chơi bị bối rối không biết hành động vừa rồi đã hoàn tất hay chưa, đối thủ có dùng Hóa Giải hay không, và vì sao lại không thể Chém hay ăn Đào tiếp theo ("Mỗi lượt chỉ được đánh 1 lá Chém", "Máu đã đầy").
2. **Kẹt nhận diện trong Pha Bỏ Bài (Discard Phase):**
   - Khi bước vào Pha Bỏ Bài, giao diện chỉ hiển thị banner cảnh báo nhỏ và nút [Bỏ Bài (0/1)] bị mờ (disabled), người chơi không nhận được lời nhắc rõ ràng về việc cần chọn các lá bài trên tay để kích hoạt nút bỏ bài.

## 2. Giải pháp thực thi (Solutions)

### 2.1. Tái Tích Hợp Popup Chọn Bài Tương Tác (Interactive Snatch & Dismantle Flow)
1. **Quy chuẩn kiến trúc:**
   - Trong [TrickRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/TrickRules.js), bóc tách 2 hàm hạt nhân `resolveSteal` và `resolveDismantle`.
   - Khi cẩm nang `cuop_bai` hoặc `tuoc_bai` được kích hoạt với cờ `extraArgs?.interactive === true`:
     - Thay vì bốc bài tự động, Engine đẩy frame `ASK_SNATCH` hoặc `ASK_DISMANTLE` vào `priorityStack` với `sourceId` (người ra bài), `targetId` (mục tiêu).
   - [GameViewMapperV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/GameViewMapperV4.js) ánh xạ frame này thành `waitingForResponse` loại `ask_snatch` hoặc `ask_dismantle`.
   - [AskSnatchDismantleModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/AskSnatchDismantleModal.jsx) hiển thị hộp thoại trực quan cho người chơi chọn:
     - Các lá bài úp trên tay của mục tiêu (Hand cards - úp mặt bảo mật).
     - Các trang bị mục tiêu đang đeo (Vũ khí, Giáp, Ngựa).
     - Các cẩm nang trì hoãn trong khu phán xét của mục tiêu (Sấm Sét, Hỗn Loạn).
   - Chuẩn hóa cấu trúc trang bị (`equipment` dạng object hoặc array) trong modal để tuyệt đối không phát sinh crash màn hình.
2. **Bảo toàn tính headless cho Bot và Unit Test:**
   - [GameAPIV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/GameAPIV4.js): Tự động truyền cờ `interactive: true` cho người chơi thật (`!player.isBot`) khi gọi `playCard` hoặc `useSkill` (`Kỳ Tập`).
   - Bot AI ([BotBrain.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/ai/BotBrain.js)): Nếu rơi vào frame tương tác, tự động tính toán mục tiêu tối ưu (ưu tiên phá giáp, vũ khí, cẩm nang phán xét nguy hiểm rồi tới bài trên tay).
   - Các unit test và bộ giả lập headless 1.000 trận tiếp tục vận hành mượt mà không cần can thiệp UI.

### 2.2. Hệ Thống Thông Báo Toast Chiến Thuật Nổi Bật (Combat & Trick Toast Feeds)
1. Mở rộng bộ quét log sự kiện trong [GameView.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/GameView.jsx) để bắt kịp tức thì các khoảnh khắc then chốt và bắn Toast Banner ở vị trí trung tâm tầm nhìn người chơi:
   - **Tước bài thành công:** `💥 [Tên] đã tước 1 lá bài của [Mục tiêu]!`
   - **Cướp bài thành công:** `🤏 [Tên] đã cướp 1 lá bài của [Mục tiêu]!`
   - **Hóa Giải thành công:** `🛡️ [Tên] sử dụng [Hóa Giải] vô hiệu hóa cẩm nang!`
   - **Cẩm nang có hiệu lực:** `⚡ Cẩm nang [Tên cẩm nang] có hiệu lực!`
   - **Né Chém thành công:** `💨 [Tên] đã né thành công cú Chém!`

### 2.3. Hướng Dẫn & Hiệu Ứng Trực Quan Pha Bỏ Bài (Discard Guidance & Glowing Highlight)
1. **Thông báo chuyển pha:**
   - Trong `GameView.jsx`, khi người chơi chính bước vào `PHASES.DISCARD` với số bài cần bỏ $> 0$, một Toast Banner cảnh báo màu vàng lập tức xuất hiện:
     `⚠️ Đến Pha Bỏ Bài: Hãy chọn ${amount} lá bài trên tay rồi bấm [Bỏ Bài]!`
2. **Hiệu ứng phát sáng khu vực bài trên tay:**
   - Trong [PlayerHand.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/PlayerHand.jsx), khi `needsDiscard` đang tích cực, khu vực bài trên tay tự động kích hoạt viền phát sáng đỏ hổ phách (`boxShadow: 0 0 15px rgba(239, 68, 68, 0.45)`), chỉ dẫn trực giác người chơi chạm chọn bài để loại bỏ.

## 3. Kiểm chứng (Verification)
1. **Unit Test Toàn Diện:**
   - Viết mới test suite [client/src/components/__tests__/SnatchDismantleAndToastQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/SnatchDismantleAndToastQA.test.jsx) kiểm thử trọn vẹn luồng tương tác `ASK_DISMANTLE`, `ASK_SNATCH` và giải quyết của Bot.
   - Chạy toàn bộ **79 test suites (674 tests)** trên toàn bộ dự án: **100% Pass**.
2. **Đại Giả Lập Tầng Ứng Dụng (Application Layer Stress Test):**
   - Chạy `npm run sim:app` mô phỏng 1.000 trận đấu qua `DispatcherV4` với hơn 174.000 hành động & phản hồi: **1000/1000 trận hoàn thành xuất sắc, 0 deadlock, 0 lỗi logic**.
3. **Đóng Gói Ứng Dụng Đa Nền Tảng:**
   - Chạy `npm run cap:build` thành công, đồng bộ đầy đủ bundle vào thư mục Native Android và iOS.
