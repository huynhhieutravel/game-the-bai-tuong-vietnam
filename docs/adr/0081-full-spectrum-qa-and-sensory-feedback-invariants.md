# ADR 0081: Kiểm Định Giác Quan Toàn Diện (Full-Spectrum Sensory QA), Bất Biến Nhận Diện Trạng Thái & Tiêu Diệt Lỗi Trùng Lặp Giao Diện

## Trạng Thái
Đã chấp thuận (Accepted) — Triển khai ngày 25/10/2026

## Bối Cảnh (Context)
Dù hệ thống kiểm thử tự động đã đạt 91/91 test suites và các đợt giả lập 1.000 trận qua Dispatcher/PriorityStack đều hoàn thành với 0 exception, người chơi trải nghiệm thực tế vẫn phản ánh 4 vấn đề gây ức chế tâm lý nghiêm trọng:
1. **Trùng lặp mô tả kỹ năng:** Modal soi tướng hiển thị 2 khung kỹ năng "Nhiếp Chính [TỎA ĐỊNH]" giống hệt nhau của Tô Hiến Thành.
2. **Mất dấu người chơi đã tử trận:** Khi người chơi chết, thẻ bài vẫn giữ nguyên viền màu và độ sáng, chỉ hiển thị `0/4` HP nhỏ xíu, khiến người chơi không phân biệt được ai còn sống để tấn công hay tính khoảng cách.
3. **Kết thúc game trong im lặng:** Khi ván đấu kết thúc (`gameOver = true`), màn hình chỉ hiện 1 dòng chữ nhỏ trên navbar, không có màn hình tổng kết (Scoreboard), không có cúp vinh danh, không có nút Chơi Lại hay Về Menu.
4. **Hạ gục đối thủ được thưởng bài không có phản hồi:** Cơ chế thưởng rút 2 lá khi hạ địch và phạt bỏ hết bài khi ngộ sát đồng minh chạy đúng trong Engine và có ghi vào Log, nhưng hoàn toàn không có Toast hay Banner hiển thị giữa màn hình, khiến người chơi cảm giác sự kiện không xảy ra.

### Phân Tích Điểm Mù (Root Cause Analysis)
- **Điểm mù logic vs giác quan (Logic vs Sensory Gap):** Headless tests chỉ kiểm tra `player.isAlive === false` hoặc `player.hand.length += 2` trong RAM. Chúng không đo lường được liệu **mắt người chơi có nhìn thấy và não người chơi có nhận thức được** biến cố vừa diễn ra hay không.
- **Thiếu chốt chặn chống trùng lặp tại tầng hiển thị (Presentation Deduplication Gap):** Khi một tướng được khai báo thêm alias hoặc contract mapping ở tầng Engine, nếu tầng UI Mapper chỉ `.map()` đơn thuần mà không lọc theo định danh độc bản (`id` / `name`), giao diện sẽ nhân bản thẻ kỹ năng trước mắt người dùng.

---

## Quyết Định Kiến Trúc (Decisions)

### 1. Thiết Lập Bất Biến Nhận Diện Tử Trận (Death State Visual Invariant)
- **Quy tắc:** Bất kỳ người chơi nào tử trận (`isDead = player.isAlive === false || (player.hp <= 0 && player.isAlive !== true)`):
  - **Trên bàn cờ đối thủ ([PlayerBoard.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/PlayerBoard.jsx)):**
    - Thẻ phe lập tức chuyển thành huy hiệu màu đỏ đậm: `💀 TỬ TRẬN`.
    - Phủ một con dấu mộc nghiêng (Death Stamp) `💀 TỬ TRẬN` dập chéo xuyên qua khung 2 thẻ tướng (chính & phó) trên nền tối làm mờ.
    - Toàn bộ khung avatar chuyển sang thang độ xám (grayscale 70%, opacity 0.55).
  - **Trên thanh điều khiển bản thân ([MyHeroBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/MyHeroBar.jsx)):**
    - Thẻ phe chuyển thành `💀 TỬ TRẬN`.
    - Phủ toàn bộ dock tướng bằng overlay `💀 BẠN ĐÃ TỬ TRẬN` và thang độ xám.

### 2. Thiết Lập Modal Vinh Danh & Bảng Điểm Kết Thúc Trận ([GameOverModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/GameOverModal.jsx))
- Khi `gameState.gameOver === true`:
  - Tự động hiển thị modal toàn màn hình vinh danh phe chiến thắng kèm hiệu ứng cúp vàng 🏆.
  - Hiển thị bảng tổng kết (Scoreboard) tất cả người chơi: Tên, Cặp tướng, Phe phái, Trạng thái (Sống sót 👑 / Tử trận 💀), và Kết quả (Thắng / Bại).
  - Cung cấp 3 nút hành động dứt khoát:
    1. `🔄 Chơi Lại Ván Mới`: Khởi tạo lại trận đấu tức thì.
    2. `📜 Xem Lại Bàn Đấu`: Cho phép tạm ẩn modal để quan sát chiến trường; trên thanh header luôn có nút `🏆 Kết Quả` để người chơi mở lại bảng bất kỳ lúc nào.
    3. `🏠 Về Menu Chính`: Quay về sảnh chờ.

### 3. Thiết Lập Leo Thang Phản Hồi Giác Quan (Sensory Toast Escalation)
- Hệ thống log watcher trong [GameView.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/GameView.jsx) bắt buộc phải lắng nghe và kích hoạt Toast banner nổi bật giữa màn hình đối với 4 sự kiện bước ngoặt:
  - 🎁 `LẬP CÔNG! ... được thưởng rút 2 lá bài!` (Toast thưởng diệt địch).
  - 💀 `[Người chơi X] ĐÃ TỬ TRẬN!` (Toast thông báo tử vong).
  - ⚠️ `ÁC MỘNG / NGỘ SÁT! ... phải bỏ toàn bộ bài!` (Toast cảnh báo phạt ngộ sát).
  - 🏆 `TRÒ CHƠI KẾT THÚC! ... giành chiến thắng!` (Toast chiến thắng).

### 4. Hệ Thống 4 Lớp Phòng Ngự Chống Trùng Lặp Kỹ Năng (4-Layer Skill Deduplication Defense)
- **Lớp 1 (Engine Source):** Loại bỏ toàn bộ alias trùng lặp trong thư mục `shared/engine_v4/heroes/`.
- **Lớp 2 (View Mapper):** [GameViewMapperV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/GameViewMapperV4.js) lọc deduplicate theo `s.id` và `s.name` trước khi đóng gói `PlayerViewModel`.
- **Lớp 3 (Client Presentation):** Cả 4 vị trí render danh sách kỹ năng trên giao diện ([ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx), [GameView.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/GameView.jsx), [DraftScreen.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/DraftScreen.jsx), [HeroDetail.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/wiki/HeroDetail.jsx)) đều trang bị bộ lọc deduplicate phòng vệ.
- **Lớp 4 (Mandatory Build Audit Gate):** [audit_39_heroes.mjs](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/audit_39_heroes.mjs) quét ma trận 39 vị tướng trong cả `gameData.js` và `HeroRegistry.js`. Nếu phát hiện bất kỳ kỹ năng nào trùng lặp, bài test sẽ ném lỗi và dừng ngay toàn bộ pipeline build.

---

## Hệ Quả & Giá Trị Mang Lại (Consequences)
- Trải nghiệm thị giác và tâm lý thi đấu của người chơi được nâng lên tầm cao mới: rõ ràng, dứt khoát, kịch tính và có đầy đủ phản hồi phản xạ.
- Chấm dứt vĩnh viễn các lỗi "game im lìm", "chết không ai biết", "thưởng không ai hay", "trùng lặp mô tả kỹ năng".
- Hệ thống kiểm thử tự động bổ sung thêm chiều kích kiểm định giác quan (Sensory Feedback), không chỉ dừng lại ở tính đúng đắn của dữ liệu thô trong RAM.
