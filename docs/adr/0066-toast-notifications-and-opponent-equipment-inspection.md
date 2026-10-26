# ADR 0066: Toast Notifications & Opponent Equipment Inspection (Hồ Sơ & Trang Bị Đối Thủ)

## Context
Trong phiên bản trước:
1. **Thông báo trò chơi (Phase Banner):**
   - Khi có sự kiện quan trọng (mất sinh lực, lộ diện tướng như `👁️ Bạn đã lộ diện tướng [Nguyễn Trãi] (Phe Hà)!`, hiệu ứng khu phán xét), hệ thống render một đoạn text vàng khổng lồ (font size `1.8rem`) lơ lửng ngay chính giữa bàn cờ (`top: 50%; left: 50%`) không viền, không nền.
   - Text này che kín khu vực trung tâm bàn chơi, che bài đối thủ và bài trên tay, gây khó chịu cho người chơi trên thiết bị di động.
2. **Khu vực Trang bị Đối thủ:**
   - Trên thanh thông tin người chơi đối thủ (`PlayerBoard.jsx`), khu vực trang bị chỉ gồm các ô mini 21px. Khi người chơi chạm vào đối thủ hoặc ô trang bị, hệ thống chỉ mở modal "Xem Tướng" chứa 2 thẻ tướng (hoặc Tướng Ẩn).
   - Modal hoàn toàn không có thông tin trang bị (Vũ khí, Phòng cụ, Ngựa công, Ngựa thủ) hay khu vực Phán xét. Người chơi không có cách nào xem được chi tiết trang bị của đối thủ (tên bài, chất/số, tầm bắn, hiệu ứng đặc biệt).

## Decisions & Implementation

### 1. Nâng cấp Hệ Thống Thông Báo: Toast Pill Popup (.game-toast-popup)
- **Vị trí hiển thị:** Chuyển từ giữa màn hình lên phía trên cùng (`top: 48px` landscape, `top: 42px` mobile), nằm gọn gàng bên dưới thanh menu trạng thái, không đè lên bất kỳ khu vực chiến thuật nào.
- **Thiết kế Glassmorphism chuẩn cao cấp:**
  - Viền mạ vàng tinh tế (`1.5px solid rgba(212, 168, 67, 0.85)`), bo góc viên thuốc capsule (`border-radius: 30px`).
  - Nền gradient tối sang trọng (`rgba(15, 23, 42, 0.96)` -> `rgba(30, 41, 59, 0.96)`) kèm hiệu ứng mờ kính `backdrop-filter: blur(12px)`.
  - Icon phân loại sinh động (`👁️` Lộ diện, `🩸` Sát thương, `⚔️` Chiến đấu, `⚖️` Phán xét, `📜` Nhật ký).
  - Nút đóng nhanh `✕` hình tròn giúp người chơi có thể chủ động tắt ngay lập tức.
  - Tự động đóng êm ái sau 2.8s với `toastTimerRef` quản lý dọn dẹp bộ đếm an toàn.

### 2. Hồ Sơ Người Chơi Phân Tab (Player Dossier Modal with Segmented Tabs)
- Chuyển đổi modal "Xem Tướng" thành **Hồ Sơ Toàn Diện Người Chơi** gồm 2 Tab điều hướng:
  1. **[ 🎴 Võ Tướng (N) ]**: Hiển thị thẻ tướng (Chính tướng / Phó tướng), chân dung, phe phái, sinh lực và danh sách toàn bộ kỹ năng (Chủ động, Bị động, Khóa, v.v.).
  2. **[ ⚔️ Trang Bị & Phán Xét (N) ]**: Hiển thị bảng tổng hợp chi tiết:
     - **Vũ Khí**: Tên bài, Chất/Số, Tầm bắn cơ bản & tầm vũ khí (🎯 Tầm: X), hiệu ứng đặc biệt, hỗ trợ chạm phóng to.
     - **Phòng Cụ**: Tên bài, Chất/Số, hiệu ứng hộ thân (Bát Quái, Nhân Vương...), hỗ trợ chạm phóng to.
     - **Ngựa Công (-1)**: Tên bài, Chất/Số, cự ly công kích.
     - **Ngựa Thủ (+1)**: Tên bài, Chất/Số, cự ly phòng ngự.
     - **Khu Vực Phán Xét**: Liệt kê các lá Cẩm nang Trì hoãn (Lạc Bất Tư Thục, Binh Lương Liền Đoán, Sấm Sét...) kèm mô tả luật phán xét.
- **Cải tiến tương tác ở PlayerBoard.jsx:**
  - Khi người chơi chạm vào thanh trang bị đối thủ (`.opponent-equipment-row`) hoặc bất kỳ ô trang bị nào, sự kiện chạm tự động kích hoạt `setHeroPopup({ ...player, initialTab: 'equipment' })` với `e.stopPropagation()`.
  - Nhờ đó, người chơi chạm vào trang bị đối thủ sẽ mở ngay tab Trang Bị & Phán Xét mà không bị hiện nhầm tab Võ tướng.

## Verification
- Toàn bộ 77 test suites (667 unit tests) đạt 100% Pass.
- 4 unit tests mới chuyên biệt trong `EquipmentInspectionAndToastQA.test.jsx` kiểm thử toàn diện tương tác chạm ô trang bị, mở modal phân tab, và tắt/bật popup thông báo.
- Chạy giả lập 1.000 trận tầng ứng dụng qua Dispatcher đạt 0 lỗi / 0 deadlock.
- Build web asset và sync sang iOS Capacitor thành công, binary `App.app` đã compile & code sign hoàn tất sẵn sàng trên thiết bị.
