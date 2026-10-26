# ADR 0096: Tái Cấu Trúc Toàn Diện UX/UI Popup Kết Thúc Trận (Landscape Game Over Cockpit)

## 1. Trạng thái (Status)
**ĐÃ CHẤP NHẬN & TRIỂN KHAI (ACCEPTED & IMPLEMENTED)**

## 2. Bối cảnh & Vấn đề UX/UI Cũ (Context & Problem)
Khi trận đấu kết thúc trên màn hình Mobile Landscape (chiều cao hẹp ~440px trên iPhone 16 Pro Max 956x440):
1. **Lỗi Tràn Màn Hình & Che Mất Người Chơi (Vertical Layout Overflow)**:
   - Popup cũ xếp 1 cột dọc quá cao (Header to tướng + Banner phe thắng + List người chơi + Footer hành động).
   - Chiều cao modal vượt quá 480px trong khi màn hình chỉ cao 440px.
   - Hậu quả: Footer đè lấp danh sách người chơi, ván đấu 4 người nhưng chỉ thấy được 2 người (Người chơi 3 và Người chơi 4 bị biến mất hoàn toàn).
2. **Lỗi Chuỗi Tên Tướng Nối Xích Kỳ Quặc**:
   - Ở khối "Phe Phái Chiến Thắng", hệ thống nối tên toàn bộ các vị tướng của phe thắng bằng dấu `&`:
     `Dương Đình Nghệ & Phùng Hưng & Triệu Quang Phục & Nguyễn Lữ`
   - Gây cảm giác rối mắt, không nhận biết được đâu là người chơi nào.
3. **Lỗi Lặp Từ Ngớ Ngẩn `Bạn (Bạn)`**:
   - Tên người chơi là `"Bạn"`, nhưng code lại render `${p.name} (Bạn)` dẫn đến hiển thị `Bạn (Bạn)`.
4. **Mất Dấu Điều Khiển Khi "Xem Lại Bàn Đấu"**:
   - Khi người chơi bấm "Xem Lại Bàn Đấu", modal ẩn đi nhưng trên bàn cờ không có thanh công cụ nổi bật để người chơi mở lại bảng kết quả hoặc chơi ván mới mà phải tìm nút nhỏ ở thanh top-bar.

## 3. Quyết định Kiến trúc & Giải pháp (Decisions & Solutions)

### 3.1. Chuyển Đổi Sang Bố Cục 2 Cột Landscape Chuẩn Esports (2-Column Split Cockpit)
- Modal Card có kích thước chuẩn: `width: 95vw, maxWidth: 820px, maxHeight: 92vh (~400px)`.
- **Cột Trái (320px - Kết Quả & Hành Động)**:
  + Biểu tượng vinh danh: `🏆` hoặc `💀`.
  + Tiêu đề lớn: `ĐẠI THẮNG QUANG VINH!` hoặc `BẠN ĐÃ THẤT THỦ`.
  + Khối "Phe Phái Chiến Thắng":
    * Badge phe chuẩn màu: `PHE VIỆT`, `PHE LẠC`, `DÃ TÂM`...
    * Liệt kê người chiến thắng rõ ràng, phân định từng cá nhân và tướng.
  + Nhóm nút hành động ở đáy cột trái:
    * Nút chính to: `[🔄 Chơi Lại Ván Mới]` (Gradient vàng kim nổi bật).
    * Hàng nút phụ: `[📜 Xem Lại Bàn Đấu]` và `[🏠 Về Menu Chính]`.
- **Cột Phải (Bảng Vàng Danh Sách Người Chơi)**:
  + Hiển thị đầy đủ 100% tất cả người chơi trong trận (kể cả 4, 6 hay 8 người chơi).
  + Mỗi người chơi là một Card thông tin sắc nét:
    * Badge phe tương phản cao.
    * Tên người chơi: Xóa bỏ hoàn toàn lỗi `Bạn (Bạn)`, hiển thị đúng `Bạn`.
    * Tên cặp Tướng đã lộ diện.
    * Sinh lực: `❤️ 4/4` hoặc `💀 Tử trận`.
    * Kết quả: `🏆 Thắng` hoặc `Thất thủ`.
  + Có thanh cuộn dọc mượt mà (`overflowY: auto`), không bao giờ bị đè lấp bởi footer.

### 3.2. Floating Action Toolbar Khi Tạm Ẩn Modal
- Trong `GameView.jsx`: Khi người chơi bấm "Xem Lại Bàn Đấu" (`isGameOverModalDismissed = true`), ở đáy bàn cờ hiển thị thanh công cụ nổi mềm mại (Floating Action Pill):
  `[🏆 Mở Bảng Kết Quả] [🔄 Chơi Lại Ván Mới]`
- Cho phép người chơi tự do quan sát bàn cờ rồi mở lại kết quả hoặc chơi lại bất kỳ lúc nào một cách trực quan.

## 4. Kiểm Thử & Đảm Bảo Chất Lượng (QA Verification)
- Unit test mới: `client/src/components/__tests__/GameOverModalUXUIQA.test.jsx` (4/4 tests pass).
- Toàn bộ 107/107 test files (924 tests) pass 100%.
- Production Build Vite thành công.
