# ADR 0060: Kiến Trúc Giao Diện Di Động Cockpit & Tái Cấu Trúc Toàn Diện UX/UI Màn Hình Ngang

## Trạng thái
Đã chấp thuận (Accepted — Người dùng đã phê duyệt "đồng ý hết")

## Bối cảnh (Context)
Khi chuyển đổi nền tảng sang ứng dụng di động (iOS / Android) với màn hình xoay ngang (Landscape độ cao $390\text{px} - 430\text{px}$), giao diện kế thừa từ nền tảng máy tính (Desktop) bộc lộ các nhược điểm nghiêm trọng ảnh hưởng trực tiếp đến trải nghiệm người chơi:

1. **Màn hình chính (MainMenu / Lobby):** Bố cục 1 cột dọc kích thước cố định làm tiêu đề `VIỆT SÁT` bị đẩy tràn lên mép trên, văn bản phiên bản đè trực tiếp lên nút bấm và nút hành động quá khổ, thiếu tính thẩm mỹ của một tựa game chiến thuật.
2. **Màn chọn tướng (DraftScreen):** 5 thẻ bài tướng vật lý bị nén ngang xuống còn ~110px mỗi thẻ, khiến toàn bộ văn bản kỹ năng và lore trên thẻ bài bị thu nhỏ đến mức không thể đọc được. Nút Chế độ Test và Chốt Danh Sách xếp dọc lệch lạc, thiếu cân xứng.
3. **Bàn đấu & Thẻ bài (GameView & PlayerHand):**
   - Thanh thông tin người chơi (`??? ???`, HP, Phe, Trang bị, Kỹ năng, Kết thúc) trải dài chiếm trọn 30% diện tích ngay giữa màn hình, chia cắt chiến trường thành 2 nửa và tạo khoảng đen vô nghĩa.
   - Thẻ bài trên tay bị lỗi tràn văn bản phù hiệu: Thẻ có tên dài như `Ngựa Chiến (-1)` bị cắt cụt hai đầu chỉ còn hiển thị `a Chiến`. Thẻ bài quá cao che lấp không gian trận đấu.

## Quyết định Đề xuất (Proposed Decision)

### 1. Phân Rã Bố Cục Bàn Đấu Theo Mô Hình Cockpit (Mobile Battlefield Cockpit)
- **Hero Dock (Góc dưới trái):** Gom cụm 2 thẻ tướng (Chính/Phó), thanh HP, huy hiệu Phe phái và 4 ô trang bị vào một khối thống nhất nhỏ gọn ở góc trái, giải phóng 100% khoảng không giữa màn hình.
- **Hand Fan (Mép đáy ở giữa):** Khay bài trên tay xòe cung cân đối, chiều cao tối ưu, áp dụng hiệu ứng nâng thẻ khi chạm. Tên thẻ bài hiển thị rõ ràng, co giãn chữ linh hoạt (Fluid Typography), triệt tiêu hoàn toàn lỗi cắt cụt chữ `Ngựa Chiến (-1)`.
- **Action Hub (Góc dưới phải):** Cụm nút bấm [Kỹ Năng], [Lật Tướng], và [⏭️ Kết Thúc Lượt] đặt tại vị trí công thái học thuận tiện nhất cho ngón cái tay phải.
- **Arena Field (Nửa trên):** Chiến trường rộng rãi cho các thẻ bài xuất kích và các đối thủ bố trí hình cánh cung với thanh HP rõ ràng.

### 2. Cải Tổ Màn Chọn Tướng (DraftScreen Master-Detail Inspection)
- Thiết lập cơ chế **Hero Inspector**: Khi người chơi chạm vào bất kỳ thẻ tướng nào, một bảng chi tiết toàn cảnh (hoặc khung xem trước lớn) sẽ hiện ra với phông chữ lớn, sắc nét, trình bày chi tiết Tên Tướng, Máu, Phe và toàn bộ Kỹ Năng.
- Dàn đều các nút chức năng (`⭐ Tự Chọn Tướng Test Mode` và `Chốt Danh Sách`) thành thanh Action Bar đối xứng ở đáy màn hình.

### 3. Tối Ưu Màn Hình Chính (MainMenu Landscape Split)
- Chuyển sang bố cục 2 cột ngang:
  - Cột trái: Phù hiệu trống đồng Đông Sơn, Logo VIỆT SÁT ánh kim và phụ đề Quốc Chiến.
  - Cột phải: Bảng điều khiển chọn số người chơi (- 4 +) và các nút bấm vào trận cân đối, thanh thoát.

## Hệ quả (Consequences)
- **Tích cực:** Giao diện đạt chuẩn game mobile cao cấp (tương đương Tam Quốc Sát Mobile / Hearthstone), công thái học hoàn hảo cho thao tác hai tay trên điện thoại, phông chữ to rõ, không còn lỗi hiển thị hay tràn chữ.
- **Rủi ro & Kiểm soát:** Cần cập nhật các file CSS và component React tương ứng theo chỉ định của người dùng, đảm bảo giữ vững 580 test cases và pipeline giả lập 1.000 trận.
