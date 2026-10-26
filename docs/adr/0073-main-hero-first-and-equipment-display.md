# ADR 0073: Quy Tắc Mở Tướng Chính Đầu Tiên, Ràng Buộc Giới Tính Và Hiển Thị Trang Bị Trực Quan

## 1. Trạng Thái
Đã chấp thuận (Accepted) & Triển khai thực tế.

## 2. Ngữ Cảnh & Vấn Đề
Từ phản hồi thực tế của người dùng qua ảnh chụp giao diện:
1. **Ảnh 1, 2:** Trên bàn đấu đối thủ (`PlayerBoard.jsx`), slot trang bị khi đã trang bị Ngựa thủ (+1) chỉ hiển thị một ô xám đen với chữ `♣4`. Người chơi không nhận ra đó là trang bị gì, con ngựa gì, hay tên thẻ bài nào nếu không chủ động mở modal hồ sơ.
2. **Ảnh 3:** Console xuất hiện warning React style:
   `Updating a style property during rerender (background) when a conflicting property is set (backgroundSize) can lead to styling bugs...`
   Kèm theo debug log thừa `[DEBUG_UI_MODAL] Confirm clicked! AskSnatchDismantleModal.jsx:24`.
3. **Ảnh 4:** Trong Hồ Sơ Người Chơi 2: Tướng Chính vẫn là `TƯỚNG ẨN - Chưa lộ diện` nhưng Phó Tướng (`Hồ Xuân Hương`) lại lật mở trước. Theo luật Quốc Chiến, Tướng Chính bắt buộc phải là tướng được mở đầu tiên, và giới tính của nhân vật phải tuyệt đối thuộc về Tướng Chính.

## 3. Các Quyết Định Kỹ Thuật

### 3.1. Hiển Thị Trang Bị Trực Quan (PlayerBoard & GameView)
- **Biểu tượng trang bị trung tâm:** Giữ nguyên `slot.icon` (Kiếm, Khiên, Ngựa công, Ngựa thủ) màu vàng kim sáng bóng `var(--color-gold)` kèm bóng đổ đậm nét, giúp nhận diện loại trang bị ngay từ cái nhìn đầu tiên.
- **Huy hiệu chỉ số bổ trợ:** Đặt chỉ số `+1` (ngựa thủ) hoặc `-1` (ngựa công) tại góc trên bên trái.
- **Huy hiệu chất & số bài:** Đặt gọn gàng ở góc dưới bên phải với nền đen tương phản cao (`rgba(0,0,0,0.75)`).
- **Loại bỏ xung đột CSS Style:** Tách riêng `backgroundColor` và `backgroundImage`, không bao giờ dùng shorthand `background: ...` khi kết hợp với `backgroundSize: 'cover'`.
- **Dossier Modal:** Thumbnail trang bị luôn hiển thị icon slot to rõ rệt ở giữa card, xóa bỏ tình trạng hình nền mờ tối gây khó nhìn.

### 3.2. Quy Tắc Tướng Đầu Tiên Mở Bắt Buộc Là Tướng Chính
- **BotBrain:** Trong `_decideHeroReveal`: Khi bot chưa lật Tướng Chính (`!bot.revealedHeroes[0]`), bất kể bot muốn lấy thưởng Tiên Phong hay kích hoạt kỹ năng chủ động, bot bắt buộc phải trả về `heroIndex: 0` (Tướng Chính). Không bao giờ trả về `heroIndex: 1`. Chỉ khi Tướng Chính đã lộ diện (`revealedHeroes[0] === true`), bot mới được xét mở Phó Tướng.
- **DispatcherV4 & HeroRegistry:** Thêm guard check tự động: Nếu bất kỳ luồng nào (kể cả trigger kỹ năng) yêu cầu lật Phó Tướng (slot 1) trong khi Tướng Chính (slot 0) chưa mở, hệ thống tự động kích hoạt mở Tướng Chính trước.

### 3.3. Quy Tắc Giới Tính Bất Biến Thuộc Về Tướng Chính
- **Ràng buộc:** `player.gender = h1?.gender || 'male'` (với `h1` là Tướng Chính `heroes[0]`).
- Phó Tướng dù là Nữ (như Hồ Xuân Hương) hay Nam tuyệt đối không làm thay đổi giới tính nhân vật nếu Tướng Chính là Nam (và ngược lại).
- Hàm `getPlayerGender(player)` luôn phản ánh chính xác giới tính của Tướng Chính.

## 4. Kết Quả Kiểm Thử & Thẩm Định
- **Unit & Integration Tests:** Toàn bộ 81 test suites (682 tests) đạt tỷ lệ vượt qua 100%.
- **Đại giả lập:** Chạy thành công 1.000 trận đấu liên tục (`npm run sim:app`) qua Dispatcher V4 với 0 lỗi ngoại lệ, 0 deadlock.
- **Build Production:** `npm run cap:build` thành công 100%, đồng bộ trơn tru sang Android & iOS.
