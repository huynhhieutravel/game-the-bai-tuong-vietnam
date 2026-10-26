# ADR 0089: Triệt Tiêu Lỗi Infinite Hover Jitter Loop Trong CSS & Chuẩn Hóa Draft Timer 60 Giây

## 1. Bối cảnh & Vấn đề (Context & Problem)
1. **Lỗi Rung Giật Thẻ Bài Đầu Tiên (Infinite Hover Jitter Loop)**:
   - Khi người chơi vừa hoàn tất giai đoạn chọn tướng (Draft) và nhấn nút "Chốt 2 Tướng Đã Chọn", màn hình chuyển sang bàn chơi (`GameView`).
   - Tọa độ ngón tay / con trỏ chuột vô tình rơi trúng ngay mép trái của tấm thẻ bài đầu tiên (`♠ A Né` - lá bài unplayable khi đang ở lượt tấn công).
   - Trong CSS trước đây, quy tắc `.hand-cards .card:hover` khai báo `margin-left: 10px; margin-right: 10px;`.
   - **Cơ chế lỗi**:
     1. Con trỏ chạm mép thẻ bài ➡️ kích hoạt `:hover`.
     2. `margin-left: 10px` làm thẻ bài dịch chuyển sang phải 10px trong document flow.
     3. Vừa dịch sang phải, con trỏ chuột đứng yên rơi ra ngoài biên của thẻ ➡️ mất `:hover`.
     4. Mất `:hover` ➡️ thẻ bài trở về `margin: 0` và thụt lùi lại sang trái 10px.
     5. Thụt lùi lại ➡️ con trỏ lại rơi vào trong thẻ bài ➡️ lại kích hoạt `:hover`.
     6. Chu kỳ lặp lại liên tục ở tần số 60 FPS, khiến lá bài rung giật bần bật liên hồi (Infinite Hover Oscillation/Jitter).
   - Ngoài ra, animation `pulse-primary` trên nút hành động có `transform: scale(1.05)` trong khi `:hover` tắt animation (`animation: none`), tạo nguy cơ co giãn kích thước mép nút tương tự.
2. **Thời Gian Chọn Tướng Quá Nhanh (Draft Timer)**:
   - Thời gian đếm ngược 30 giây trước đây quá ngắn khi người chơi cần mở bảng xem thông tin kỹ năng chi tiết của các danh tướng VIP.

---

## 2. Quyết định Kỹ thuật (Architectural Decisions)

### 2.1. Cấm Tuyệt Đối Thay Đổi Margin / Padding / Kích Thước Trong `:hover`
- **Nguyên tắc vàng CSS**: Mọi hiệu ứng tương tác `:hover` trên các phần tử tương tác (như thẻ bài, nút bấm, avatar) CHỈ ĐƯỢC PHÉP sử dụng thuộc tính Composite (`transform`, `opacity`) hoặc Paint (`background-color`, `border-color`, `box-shadow`).
- Tuyệt đối KHÔNG thay đổi các thuộc tính Layout Box Model (`margin`, `padding`, `width`, `height`, `top`, `left`, `right`, `bottom`) khi `:hover` vì sẽ làm dịch chuyển Hit Box thực tế của phần tử ra khỏi con trỏ.

### 2.2. Vô Hiệu Hóa Hover Cho Thẻ Bài Không Dùng Được (`.card.unplayable`)
- Khai báo rõ ràng với độ ưu tiên cao:
  ```css
  .hand-cards .card.unplayable:hover {
    transform: none !important;
    box-shadow: none !important;
    cursor: not-allowed !important;
  }
  ```
- Lá bài không dùng được (như lá Né khi đang ở lượt tấn công) sẽ không bao giờ bị kích hoạt transform hay rung giật.

### 2.3. Tối Ưu Animation `@keyframes pulse-primary`
- Loại bỏ `transform: scale(1.05)` trong animation lặp của nút bấm. Chỉ sử dụng hiệu ứng phát sáng hào quang màu vàng kim (`box-shadow` và `background-color`).
- Đảm bảo kích thước vật lý của nút bấm không bao giờ co giãn gây giật con trỏ chuột ở biên.

### 2.4. Chuẩn Hóa Thời Gian Chọn Tướng 60 Giây
- Nâng `draftTimer` từ 30 giây lên 60 giây trong [DraftScreen.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/DraftScreen.jsx).

---

## 3. Kết quả Kiểm thử (Verification)
- Đã audit toàn bộ 3 file CSS trong dự án (`index.css`, `MyHeroBar.css`, `WikiPage.css`): **100% CLEAN** — không còn bất kỳ rule `:hover` nào làm thay đổi layout box model.
- Test suite [HoverJitterPreventionQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/HoverJitterPreventionQA.test.jsx) chạy độc lập và tự động hóa kiểm định: **PASS 100%**.
- Toàn bộ 21 test files client components (**209/209 tests PASS 100%**).
- Production build `npm run build`: Hoàn thành trong 520ms, 0 lỗi.
