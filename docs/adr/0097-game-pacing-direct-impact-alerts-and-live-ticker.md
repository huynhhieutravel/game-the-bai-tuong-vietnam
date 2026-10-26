# ADR 0097: Điều Khiển Nhịp Độ Trận Đấu, Cảnh Báo Tác Động Trực Tiếp & Ticker Diễn Biến Chiến Trận

## 1. Trạng thái (Status)
**ĐÃ CHẤP NHẬN & TRIỂN KHAI (ACCEPTED & IMPLEMENTED)**

---

## 2. Bối cảnh & Vấn đề Cốt Lõi (Context & Problem Statement)
Người chơi phản hồi về trải nghiệm thi đấu:
> *"Trải nghiệm chơi tệ quá, khi vừa bị cướp bài hay các phần, không thấy hiện gì lên?! Chỉ thấy mất bài! Và nhịp game nhanh quá chưa đọc được gì! Có cách nào cải thiện trải nghiệm chơi, nhịp chậm và có thông báo tốt hơn các sự kiện? /grill-with-docs"*

Qua phân tích và vòng phỏng vấn Grill Frontier, hệ thống đã chỉ ra 3 nguyên nhân gốc rễ (Root Causes):
1. **Lỗi Xóa Đè Toast Khi Có Yêu Cầu Phản Hồi (`waitingForResponse`)**:
   - Khi một Bot cướp bài của Người chơi, engine đẩy log vào `toastQueue` với thời lượng ngắn (1.1s).
   - Nhưng chỉ 400ms - 500ms sau, bot khác ra chiêu hoặc xuất hiện yêu cầu phản hồi (`gameState.waitingForResponse`), hiệu ứng `useEffect` lập tức gọi `setPhaseBanner(null)` và `setToastQueue([])`.
   - Kết quả: Banner thông báo bị xóa sổ ngay tức khắc, người chơi chưa kịp đọc chữ nào thì bài trên tay đã bị giảm đi mà không hiểu vì sao!
2. **Thiếu Thông Tin Thẻ Bài Bị Mất (Hidden Information Gap)**:
   - Trong `TrickRules.resolveSteal` và `resolveDismantle`, log chỉ ghi chung chung: `🤏 Bot 1 đã cướp 1 lá bài (trên tay) của Bạn.`
   - Người chơi không biết mình vừa mất lá Chém, lá Né hay lá Đào quan trọng, làm suy giảm nghiêm trọng khả năng tính toán chiến thuật.
3. **Nhịp Độ Trận Đấu Quá Nhanh (Aggressive Bot AI Pacing)**:
   - Trong `BotRunnerV4`, các timeout của Bot được cấu hình quá ngắn (Action 700ms, Reaction 600ms, Draw 300ms). Với 3 Bot cùng bàn, một vòng lượt trôi qua chỉ trong 2-3 giây, người chơi không kịp đọc hiểu lá bài hay phân tích nước đi của đối thủ.
4. **Không Có Dải Theo Dõi Diễn Biến (Live Action Ticker) Trên Desktop**:
   - Trên màn hình lớn, nếu không chủ động mở Modal Nhật ký thì bàn cờ hoàn toàn trống trải, người chơi không thể nắm bắt được đối thủ vừa rút bài hay trang bị món gì.

---

## 3. Quyết định Kiến trúc & Giải pháp (Decisions & Solutions)

### 3.1. Hệ Thống Pacing Động & Tùy Chọn Tốc Độ Trận Đấu (Game Pacing Architecture)
- Cấu hình `BOT_PACE_CONFIG` trong `BotRunnerV4.js`:
  + `🐢 Chậm (Slow)`: Action 1800ms, Reaction 1200ms, Draw 600ms, Discard 700ms, End 500ms, Draft 800ms. Thích hợp cho người mới làm quen hoặc muốn quan sát chi tiết.
  + `⚖️ Chuẩn (Normal)` *(Mặc định mới)*: Action 1300ms, Reaction 900ms, Draw 450ms, Discard 500ms, End 400ms, Draft 500ms. Tạo nhịp thở thư thả, rõ ràng cho từng lượt đấu.
  + `⚡ Nhanh (Fast)`: Action 700ms, Reaction 600ms, Draw 300ms, Discard 400ms, End 300ms, Draft 500ms. Phục vụ chế độ tốc chiến và môi trường tự động hóa unit test (`NODE_ENV === 'test'`).
- **Giao diện điều khiển**:
  + **Top Bar**: Hiển thị nút badge tốc độ hiện tại (`🐢 Chậm`, `⚖️ Chuẩn`, `⚡ Nhanh`).
  + **In-Game Menu Modal**: Khối cài đặt trực quan gồm 3 nút chuyển đổi với nhãn thời gian và mô tả chức năng.
  + **Lưu trữ & Đồng bộ**: Lưu giá trị vào `localStorage ('viet_sat_game_pace')`, đồng bộ tức thì sang BotRunner thông qua `gameAPI.setBotPace(pace)`.

### 3.2. Banner Cảnh Báo Tác Động Trực Tiếp (Direct Impact Alert Banner)
- Tách biệt hoàn toàn khỏi `phaseBanner` và `toastQueue`:
  + Quản lý bởi state riêng `directImpactAlert` với timer 3.2 giây.
  + **Bất biến sống còn**: Khi `gameState.waitingForResponse` xuất hiện, `directImpactAlert` **tuyệt đối KHÔNG bị xóa đè**, bảo đảm người chơi luôn nhìn thấy cảnh báo nguyên nhân bị mất máu / mất bài.
- Nhận diện các sự kiện tác động trực tiếp lên Bạn:
  + Cướp bài / Tước bài trên tay hoặc trang bị.
  + Nhận sát thương / Mất sinh lực.
  + Bị đối thủ khiêu chiến [Quyết Đấu].
  + Bị dán cẩm nang trì hoãn vào Khu Phán Xét (Sấm Sét, Hỗn Loạn, Binh Lương).
- Thiết kế giao diện:
  + Banner nổi bật vị trí trung tâm bàn cờ với viền sáng kim sắc (`border: 2px solid #f59e0b`).
  + Hiệu ứng Gradient cảnh báo (`#b91c1c` cho nguy hiểm hoặc `#d97706` cho cảnh báo), bóng đổ phát sáng (`boxShadow: 0 0 30px rgba(245, 158, 11, 0.7)`).
  + Icon to trực quan, font chữ đậm nét và nút ✕ cho phép đóng thủ công.

### 3.3. Minh Bạch Thông Tin Lá Bài Bị Mất (Lost Card Feedback)
- Cập nhật `TrickRules.resolveSteal` và `TrickRules.resolveDismantle`:
  + Đính kèm metadata `{ type, victimId, thiefId, cardId, cardName, cardSuit, cardRank, fromZoneDesc }` vào `state.addLog()`.
- Hiển thị trên client:
  + Nếu nạn nhân là Bạn (`victimId === mainPlayerId`), Banner cảnh báo hiển thị đích danh tên lá bài cùng chất và số:
    `⚠️ [Bot 1] đã cướp lá [Chém ♠10] (trên tay) của Bạn!` hoặc `💥 [Bot 2] đã tước lá [Đào ♥7] (trên tay) của Bạn!`.

### 3.4. Dải Ticker Diễn Biến Thời Gian Thực Cho Toàn Bộ Thiết Bị (Live Combat Action Ticker)
- Thanh trạng thái `live-combat-ticker` đặt ngay dưới Header Bar:
  + Áp dụng cho cả **Desktop và Mobile** (thay vì chỉ mobile như trước).
  + Hiển thị 1-2 hành động mới nhất của các đối thủ với badge `MỚI NHẤT` màu vàng đồng.
  + Bán trong suốt (`backdropFilter: blur(8px)`), không che khuất bài trên tay hay khu vực đối thủ.
  + Nhấp vào Ticker mở ngay Modal Nhật ký chi tiết.

---

## 4. Kiểm Thử & Đảm Bảo Chất Lượng (QA Verification)
- Tạo test suite mới: `client/src/components/__tests__/PacingAndDirectImpactAlertQA.test.jsx`:
  + Test 1: Kiểm thử `BotRunnerV4` với đầy đủ 3 cấp độ `slow`, `normal`, `fast`.
  + Test 2: Kiểm thử `TrickRules` đính kèm metadata lá bài bị cướp / tước.
  + Test 3: Kiểm thử hiển thị Live Combat Ticker và nút điều chỉnh nhịp game trên Top Bar.
  + Test 4: Kiểm thử In-Game Menu modal chuyển đổi tốc độ, gọi `setBotPace` và lưu localStorage.
  + Test 5: Kiểm thử Direct Impact Alert hiển thị đích danh lá bài mất và không bị xóa bởi `waitingForResponse`.
- Kết quả test toàn diện: **108/108 test files (929 tests) PASS 100%**.
- Production Build Vite: Thành công 100%.
