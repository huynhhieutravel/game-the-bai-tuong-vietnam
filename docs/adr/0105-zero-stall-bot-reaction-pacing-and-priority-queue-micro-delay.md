# ADR 0105: Triệt Tiêu Độ Trễ 5-6 Giây — Tối Ưu Hóa Micro-Delay Hàng Đợi Ưu Tiên & Nhịp Độ Chuyển Phase Bot AI

## 1. Trạng Thái (Status)
**ĐÃ CHẤP NHẬN & TRIỂN KHAI (ACCEPTED & IMPLEMENTED)**

---

## 2. Bối Cảnh & Vấn Đề Cốt Lõi (Context & Problem Statement)
Người chơi phản hồi về trải nghiệm thi đấu:
> *"Tại sao dùng xong chờ 5-6 giây mới tới lượt? Bị kẹt đâu nữa à? Từ xích đến diệu dược, đến Định Quốc dùng... QA toàn diện đi, nhiều sự kiện cũng tự nhiên bị lâu, nhiều lắm."*

Qua điều tra sâu và rà soát toàn bộ vòng đời tương tác của Engine v4 và Application Layer (`DispatcherV4`, `BotRunnerV4`, `TrickRules`), chúng tôi phát hiện **3 nguyên nhân gốc rễ (Root Causes)** gây ra tình trạng đứng hình 5-6 giây sau mỗi sự kiện:

### Nguyên nhân 1: BotRunner Áp Dụng 900ms Trì Hoãn Tuyệt Đối Cho Cả Những Lần Bỏ Qua / Không Thể Phản Hồi
- Trong `BotRunnerV4.js`, khi có bất kỳ `PriorityFrame` nào đang chờ (`ASK_NEGATE`, `ASK_PEACH`, `ASK_DODGE`, `ASK_SLASH_RESPONSE`, `ASK_DINH_QUOC`, `ASK_BOC_TRAM_TRUNG_SLASH`...):
- `BotRunnerV4` vô điều kiện đặt bộ đếm giờ `setTimeout(..., this.getDelay('reaction'))` với nhịp độ chuẩn là **900ms**.
- **Kịch bản chuỗi Hóa Giải (`ASK_NEGATE`):** Khi một lá cẩm nang đơn thể (như Xiềng Xích, Quyết Đấu, Cướp Bài, Diệu Dược) được đánh ra bàn:
  + Cả 4 người chơi đều được đưa vào hàng đợi `priorityQueue`.
  + Người chơi thật (Player 0) nếu không có Hóa Giải sẽ tự động bỏ qua qua `useEffect` (0ms).
  + Bot 1 không có lá Hóa Giải $\rightarrow$ ngồi chờ **900ms** mới gửi lệnh bỏ qua (`cancel`).
  + Bot 2 không có lá Hóa Giải $\rightarrow$ tiếp tục ngồi chờ **900ms** mới gửi lệnh bỏ qua.
  + Bot 3 không có lá Hóa Giải $\rightarrow$ tiếp tục ngồi chờ **900ms** mới gửi lệnh bỏ qua.
  + **Tổng thời gian đứng hình chết (Dead lag):** $900ms \times 3 = \mathbf{2,700ms}$ (2.7 giây) chỉ để bàn chơi xác nhận "không ai có Hóa Giải"!
- **Kịch bản Cứu Đào khi hấp hối (`ASK_PEACH`):** Nếu một người chơi bị đánh về 0 HP, cả 3 bot lần lượt chờ 900ms = **2.7s** chỉ để báo không có Đào. Nếu nạn nhân bị âm máu (-1 HP), chuỗi lặp lại vòng 2 = **5.4 giây** đứng hình!

### Nguyên nhân 2: Lãng Phí Thời Gian Khi Bot Đã Hết Bài / Không Có Bài Cần Bỏ
- Trong pha Ra bài (`ACTION` phase), sau khi Bot đã đánh hết bài hoặc quyết định dừng, Bot vẫn chờ đủ **1,300ms** mới gọi `endPhase`.
- Vào pha Bỏ bài (`DISCARD` phase), nếu số bài trên tay đã $\le$ HP (`excess <= 0`), Bot vẫn ngồi chờ tiếp **500ms** mới gọi `endPhase`.
- Vào pha Kết thúc (`END` phase), Bot tiếp tục chờ **400ms** mới chuyển lượt sang người chơi tiếp theo.
- **Tổng thời gian chết chuyển lượt:** $1,300ms + 500ms + 400ms = \mathbf{2,200ms}$ (2.2 giây) trống rỗng!

### Nguyên nhân 3: Lỗi Đồng Bộ Trạng Thái Xiềng Xích (`p.chained` vs `p.isChained`)
- Trong `BotBrain.js` (dòng 522, 777, 826, 1240), mã nguồn kiểm tra `p.chained` thay vì `p.isChained`.
- Do `p.chained` luôn là `undefined`, Bot Chử Đồng Tử (Tiên Duyên) luôn coi đối thủ là "chưa bị xích" (`!p.chained === true`), dẫn đến việc liên tục tìm cách xích lại các mục tiêu đã bị xích, gây ra hàng loạt chuỗi kiểm tra Hóa Giải thừa thãi.

---

## 3. Quyết Định Kiến Trúc & Giải Pháp (Decisions & Solutions)

### 3.1. Cơ Chế Phản Hồi Nhanh Thông Minh (Smart Micro-Delay Reaction)
Trong `BotRunnerV4.js`:
- Trước khi lập lịch hẹn giờ cho `frame`, chạy thử một bước đánh giá nhanh không tác dụng phụ:
  ```javascript
  const quickReaction = BotBrain.decideReaction(gameState, actor.id, frame);
  ```
- Nếu xác định Bot không có lá bài hợp lệ hoặc sẽ bỏ qua (`isCanceled === true`):
  + Thay vì ngồi chờ đủ 900ms, lập tức phản hồi với **Micro-delay 50ms** (`reactionDelay = 50`).
  + **50ms** là khoảng thời gian lý tưởng: đủ cho React cập nhật render 3 frame mượt mà không giật lag, đồng thời người chơi cảm nhận sự kiện được giải quyết tức thì.
  + Với 3 bot cùng bỏ qua: $50ms \times 3 = \mathbf{150ms}$ (thay vì 2,700ms)!
- Nếu Bot **có bài và quyết định kích hoạt** (ra Hóa Giải, tung Đào cứu mạng, tung Né, lật Bát Quái):
  + Giữ nguyên thời gian chờ chiến thuật đầy đủ **900ms** (`this.getDelay('reaction')`) để tạo cảm giác suy nghĩ tự nhiên và kịp hiển thị hiệu ứng hình ảnh cho người chơi quan sát.
- Với khung hiển thị kết quả phán xét (`ASK_JUDGEMENT_RESULT`): Giảm độ trễ xác nhận xuống **150ms** vì kết quả đã được hiển thị hoạt ảnh trước đó.

### 3.2. Rút Ngắn Độ Trễ Chuyển Pha Trống (Zero-Wait Phase Transitions)
- **Pha Hành Động (`ACTION`):** Nếu `BotBrain.decideAction` trả về không còn lá bài/kỹ năng nào để đánh, thời gian kết thúc pha giảm từ 1,300ms xuống còn **300ms** (`Math.min(300, actionDelay)`).
- **Pha Bỏ Bài (`DISCARD`):** Nếu `excess <= 0` (số bài trên tay đã hợp lệ), thời gian kết thúc pha giảm từ 500ms xuống còn **100ms** (`Math.min(100, discardDelay)`).
- **Pha Kết Thúc (`END`):** Rút ngắn thời gian dọn dẹp và chuyển lượt sang người chơi tiếp theo xuống còn **80ms** (`Math.min(80, endDelay)`).

### 3.3. Chuẩn Hóa Kiểm Tra Trạng Thái Xiềng Xích
- Cập nhật toàn bộ các điểm kiểm tra trong `BotBrain.js` (dòng 522, 777, 826, 1240) sang chuẩn `(p.isChained || p.chained)`.
- Giúp Bot nhận diện chính xác ai đang bị xích để kích hoạt combo Hỏa Công lan truyền và không đánh Xiềng Xích lặp lại lên người đã bị xích.

### 3.4. Hỗ Trợ Cờ `skipNegate` Trong `TrickRules.playTrick`
- Bổ sung kiểm tra `if (extraArgs?.skipNegate)` ngay tại đầu hàm `playTrick` để cho phép các kỹ năng đặc biệt hoặc hiệu ứng cưỡng chế bỏ qua vòng Hóa Giải khi được chỉ định rõ.

---

## 4. Kết Quả Kiểm Thử & Kiểm Định QA (Verification & QA Results)

1. **Unit Test Suite:**
   - Đã chạy toàn bộ 112 file test (`npx vitest run`), vượt qua **969/969 bài test (100% PASS)** trong 7.84 giây.
   - `ApplicationAdapter.test.js`, `DinhDienQA.test.js`, `TrickRules.test.js` hoạt động hoàn hảo với micro-delay 50ms.
2. **Đại Giả Lập Ứng Dụng (DispatcherV4 & BotRunnerV4):**
   - Chạy 1,000 trận đấu đa luồng (`npm run sim:app`): **1,000/1,000 trận thành công hợp lệ**, 0 Deadlock, 0 lỗi Exception.
   - Xử lý thành công 83,542 hành động và 118,085 phản hồi ngăn xếp.
3. **Đại Giả Lập Core Engine:**
   - Chạy 1,000 trận core engine (`npm run sim:core`): **1,000/1,000 trận thành công**, 0 lỗi Invariant.
4. **Hiệu Suất Trải Nghiệm Người Chơi:**
   - Thời gian chờ chuỗi Hóa Giải khi không ai có bài: Giảm từ **2.7 giây $\rightarrow$ 0.15 giây** (Nhanh hơn 18 lần).
   - Thời gian chuyển lượt của Bot khi không có bài: Giảm từ **2.2 giây $\rightarrow$ 0.48 giây**.
   - Triệt tiêu hoàn toàn cảm giác "bị đứng hình 5-6 giây" khi thi triển Xiềng Xích, Diệu Dược hoặc chuyển lượt.
