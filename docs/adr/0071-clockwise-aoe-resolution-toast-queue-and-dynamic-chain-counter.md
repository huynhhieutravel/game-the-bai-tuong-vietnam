# ADR 0071: Clockwise AOE Resolution, Toast Notification Queue, and Dynamic Multi-Target Counter

## 1. Bối cảnh & Vấn đề (Context & Problems)
1. **Thông báo kết quả thiếu sót cho các mục tiêu tiếp theo:**
   - Khi đánh cẩm nang toàn bàn (như [Loạn Tiễn]), nếu người chơi đầu tiên né thành công và các người chơi kế tiếp nhận sát thương, chỉ người đầu tiên hiển thị pop-up Toast banner. Các người chơi kế tiếp nhận sát thương không bật Toast thông báo mà chỉ ghi nhận âm thầm trong Log.
   - **Nguyên nhân cốt lõi:**
     - Bộ lọc log trong `GameView.jsx` chỉ kiểm tra `text.includes("mất") && text.includes("sinh lực")`. Trong khi đó, hàm xử lý sát thương `CombatRules.applyDamage` ghi log theo mẫu: `${target.name} nhận ${amount} điểm sát thương (${reason})`. Do không chứa từ khóa `"mất"`, các thông báo mất máu thông thường bị bỏ sót hoàn toàn.
     - Khi nhiều sự kiện diễn ra nhanh, cơ chế hiển thị Toast đơn lẻ (`setPhaseBanner`) bị ghi đè tức thì bởi sự kiện sau, khiến người chơi không kịp thấy các thông tin diễn biến tiếp theo.
2. **Thứ tự giải quyết cẩm nang toàn bàn (AOE) bị ngược chiều kim đồng hồ:**
   - Trong Tam Quốc Sát / Việt Sát, mọi hiệu ứng toàn bàn (Loạn Tiễn, Dã Man, Đào Viên) bắt buộc phải giải quyết tuần tự theo chiều kim đồng hồ từ người tiếp theo của người ra bài ($P_1 \rightarrow P_2 \rightarrow P_3 \rightarrow P_4$).
   - Tuy nhiên, trong engine v4, khi Player 1 (id: 0) đánh Loạn Tiễn, người chơi 4 giải quyết đầu tiên, rồi mới tới người chơi 3, sau đó là người chơi 2 ($P_4 \rightarrow P_3 \rightarrow P_2$).
   - **Nguyên nhân cốt lõi:** `priorityStack` là cấu trúc ngăn xếp LIFO (Last-In-First-Out). Khi hàm `_executeTrickEffect` lặp qua danh sách mục tiêu `[P2, P3, P4]` và đẩy thẳng vào stack, $P_4$ nằm ở đỉnh stack (`peek()`), do đó $P_4$ bị pop và giải quyết trước tiên.
3. **Thanh thông báo Xiềng Xích bị cứng nhắc số lượng mục tiêu (0 - 2):**
   - Khi sử dụng thẻ bài có mục tiêu kép như [Xiềng Xích] (chọn 0 đến 2 mục tiêu), thông báo trên banner cố định là `[Xiềng Xích]: 🎯 CHỌN 0 - 2 MỤC TIÊU! 🎯`.
   - Người chơi tưởng `0 - 2` là tỷ số đếm `(0/2)` và thắc mắc tại sao khi đã nhấp chọn 1 hoặc 2 người chơi trên bàn thì con số vẫn không thay đổi.
   - Nút xác nhận chỉ mang nhãn chung chung `Xác Nhận Xích` hoặc `Rèn Lại (Bỏ 1)`.

## 2. Giải pháp thực thi (Solutions)

### 2.1. Hàng Đợi Thông Báo Toast Tuần Tự (Toast Notification Queue)
1. **Mở rộng bộ quét log sự kiện:**
   - Bổ sung điều kiện kiểm tra `text.includes("sát thương")` để bắt trọn vẹn mọi sự kiện trừ máu từ Chém, Cẩm nang và Kỹ năng.
   - Gắn biểu tượng cảm xúc trực quan: `🩸` (Sát thương), `💖` (Hồi máu), `💨` (Né thành công), `💥` (Tước bài), `🤏` (Cướp bài), `🛡️` (Hóa giải), `⚡` (Cẩm nang hiệu lực).
2. **Cơ chế Hàng đợi Toast (Toast Queue):**
   - Thay thế việc ghi đè trực tiếp bằng `toastQueue` (hàng đợi tối đa 6 thông báo liên tiếp).
   - Mỗi thông báo được hiển thị đầy đủ trong 1.8s - 2.6s. Khi thông báo trước hết hạn (hoặc người chơi chạm đóng), thông báo kế tiếp tự động xuất hiện. Mọi biến cố của từng người chơi đều được truyền tải rõ ràng tới mắt người dùng.

### 2.2. Chuẩn Hóa Giải Quyết Theo Chiều Kim Đồng Hồ (Clockwise AOE Resolution)
1. **Bộ sinh mục tiêu theo chiều kim đồng hồ ([TrickRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/TrickRules.js)):**
   - Triển khai hàm `TrickRules.getClockwiseTargets(state, sourceId, includeSelf)`: Duyệt danh sách người chơi còn sống bắt đầu từ vị trí `(sourceIdx + 1) % alive.length`.
   - Áp dụng cho `playArrowRain`, `playBarbarian`, `playPeachGarden`.
2. **Đảo chiều nạp ngăn xếp LIFO (Reverse Push on Stack):**
   - Trong `_executeTrickEffect`, khi nạp các frame `ASK_DODGE` (Loạn Tiễn) hoặc `ASK_SLASH_RESPONSE` (Dã Man), danh sách mục tiêu được đảo ngược trước khi push (`[...targets].reverse()`).
   - Kết quả: Mục tiêu kề cận người ra bài theo chiều kim đồng hồ luôn nằm ở đỉnh stack (`peek()`), đảm bảo thứ tự giải quyết chuẩn xác $P_{next} \rightarrow P_{next+1} \rightarrow \dots$.
3. **Chính xác hóa nội dung log né đòn ([CombatRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/CombatRules.js)):**
   - Khi né Loạn Tiễn, hệ thống ghi rõ: `${target.name} đã né thành công [Loạn Tiễn]!` thay vì nhầm thành `cú Chém`.

### 2.3. Bộ Đếm Mục Tiêu Động Đa Vị Trí (Dynamic Multi-Target Counter)
1. **Banner thông báo động ([GameView.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/GameView.jsx) & [useTargeting.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/hooks/useTargeting.js)):**
   - Khi chọn mục tiêu cho thẻ bài nhiều mục tiêu (Xiềng Xích, Tiên Duyên), thông báo tự động cập nhật thời gian thực theo số lượng đã chọn:
     - 0 mục tiêu: `[Xiềng Xích]: Đã chọn 0/2 mục tiêu (Bấm "Rèn Lại" nếu không khóa ai)`
     - 1 mục tiêu: `[Xiềng Xích]: Đã chọn 1/2 mục tiêu`
     - 2 mục tiêu: `[Xiềng Xích]: Đã chọn 2/2 mục tiêu (Đã đủ)`
2. **Nút xác nhận thích ứng ([ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx)):**
   - Nút hành động hiển thị rõ ràng:
     - Khi chưa chọn ai: `Rèn Lại (Bỏ 1)`
     - Khi đã chọn: `Khóa Xích (1/2)` hoặc `Khóa Xích (2/2)`.
3. **Huy hiệu thanh điều hướng trên cùng:**
   - Hiển thị trực quan: `🎯 Đã chọn 1/2` hoặc `🎯 Đã chọn 2/2`.

## 3. Kiểm chứng (Verification)
1. **Unit Test Bộ Ba Tính Năng:**
   - Tạo mới test suite [ClockwiseAOEAndXiengXichCounterQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/ClockwiseAOEAndXiengXichCounterQA.test.jsx) kiểm thử thứ tự giải quyết kim đồng hồ và mô tả né đòn chính xác.
   - Chạy toàn bộ **80 test suites (677 tests)**: **100% Pass**.
2. **Đại Giả Lập Headless Stress Test:**
   - Chạy `npm run sim:app` 1.000 trận đấu: 0 lỗi, 0 deadlock.
3. **Đóng gói Đa nền tảng:**
   - Chạy `npm run cap:build` thành công.
