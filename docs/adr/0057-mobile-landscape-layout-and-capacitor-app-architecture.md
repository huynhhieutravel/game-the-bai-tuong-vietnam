# ADR 0057: Kiến Trúc Ứng Dụng Di Động Mặc Định Giao Diện Ngang (Mobile Landscape & Capacitor App Shell)

## 1. Bối cảnh (Context)
Trò chơi thẻ bài chiến thuật Việt Sát (phiên bản v4) được xây dựng trên nền tảng web (React + Vite). Trong quá trình phát triển, mục tiêu mở rộng sang thiết bị di động (Android & iOS) đã được đặt ra. 

Qua kiểm thử giả lập trên kích thước thực tế của điện thoại xoay ngang (iPhone & Android Landscape: $844 \times 390\text{px}$ đến $932 \times 430\text{px}$), phát hiện các hạn chế của giao diện máy tính khi đưa xuống điện thoại:
- Màn hình chọn tướng (Draft Screen): Chiều cao thẻ bài $364\text{px}$ vượt quá chiều cao màn hình ngang ($390\text{px}$), buộc người chơi phải cuộn trang.
- Bàn đấu (Game Board): Cột thông tin bên phải chiếm tới $33\%$ chiều ngang, làm chồng bài rút trung tâm bị đè lấn lên avatar của đối thủ số 3.
- Chưa có khoảng đệm an toàn (`safe-area-inset`) khiến nút bấm ở mép có nguy cơ bị che khuất bởi tai thỏ (Notch) hoặc Dynamic Island.

## 2. Quyết định Kiến trúc (Decisions)

### D1: Công nghệ đóng gói Native App — Capacitor
- Sử dụng **Capacitor** (`@capacitor/core`, `@capacitor/cli`) làm vỏ bọc ứng dụng lai (Hybrid App Shell).
- Lý do chọn:
  1. Tương thích trực tiếp 100% với cấu trúc mã nguồn React + Vite hiện có, không đòi hỏi viết lại tầng giao diện như React Native / Flutter.
  2. Hiệu năng render WebGL/CSS GPU-accelerated 60fps trên Native WebView hiện đại.
  3. Dễ dàng xuất project sang Android Studio (APK/AAB) và Xcode (IPA).

### D2: Khóa cứng hướng màn hình ngang (Landscape-Only Lock)
- Khóa toàn diện hướng hiển thị của ứng dụng ở chế độ xoay ngang (`landscape`), tương đồng với các tựa game thẻ bài chuẩn quốc tế (*Tam Quốc Sát Mobile, Hearthstone, Yu-Gi-Oh! Master Duel*).
- Hỗ trợ cả 2 chiều xoay ngang: `landscape-primary` và `landscape-secondary` để người chơi cắm sạc hoặc tai nghe bên trái/phải đều thuận tiện.

### D3: Tái cấu trúc Bố cục Màn hình Chọn Tướng (Draft Screen Landscape)
- Tỉ lệ thẻ bài được tính toán theo độ cao khung nhìn: chiều cao thẻ tối ưu $\approx 180\text{px} - 210\text{px}$, chiều rộng $\approx 130\text{px} - 150\text{px}$.
- Toàn bộ 5 lá bài được xếp thẳng trên **1 hàng ngang duy nhất** (`flex-direction: row; flex-wrap: nowrap`), hiển thị trọn vẹn cả tiêu đề, đồng hồ đếm ngược và nút "Chốt Danh Sách" ngay trong 1 màn hình mà **hoàn toàn không cần cuộn trang**.

### D4: Tái cấu trúc Bàn Đấu (In-Game Board Landscape)
- **Dải đối thủ mép trên (Top Opponents Rail):** Dàn đều 3 đối thủ sang 3 vị trí với khoảng cách thông thoáng.
- **Khu vực Trung tâm:** Đặt bộ bài rút (Draw Pile) và bài bỏ (Discard Pile) ở vị trí riêng biệt không đè lên avatar người chơi.
- **Khu vực Bản thân (Bottom Hero & Hand Area):** Rút gọn cột thông tin thành thanh trạng thái mini tinh giản, giải phóng tối đa diện tích cho 2 vị tướng và dải bài trên tay.
- **Vùng an toàn (Safe Area Insets):** Tích hợp `viewport-fit=cover` và `env(safe-area-inset-*)` để tự động né tránh tai thỏ và camera nốt ruồi.

## 3. Hệ quả (Consequences)
- **Tích cực:** Trải nghiệm chơi game trên điện thoại trở nên cao cấp, chuẩn game mobile thương mại, thao tác ngón tay cái thuận tiện, không còn hiện tượng tràn viền hay đè lớp.
- **Duy trì:** Giữ nguyên 100% logic StateMachine, Event Engine v4 và khả năng chạy song song trên trình duyệt Web lẫn Native Mobile App.
