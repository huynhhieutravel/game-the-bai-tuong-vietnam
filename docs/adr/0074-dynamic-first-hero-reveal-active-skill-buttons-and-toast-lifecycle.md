# ADR 0074: Cơ Chế Mở Tướng Đầu Tiên Trở Thành Tướng Chính, Nút Kỹ Năng Chủ Động Trên ActionBar & Vòng Đời Toast Banner Tự Hủy

## 1. Trạng Thái
Đã chấp thuận (Accepted) & Triển khai thực tế.

## 2. Ngữ Cảnh & Vấn Đề
Qua phản hồi và hình ảnh người dùng cung cấp trong trận đấu thực tế (Phe Hà: Nguyên Phi Ỷ Lan & Công chúa An Tư):
1. **Lỗi lật đúp 2 tướng:** Người chơi bấm lật Tướng 2 (Công chúa An Tư) thì cả 2 tướng cùng bị lật mở. Ban đầu giao diện đã cố định "Chính Ẩn" / "Phó Ẩn", trong khi quy tắc Quốc Chiến chuẩn là: ban đầu cả 2 tướng đều là Tướng Ẩn (chưa phân định Chính - Phó). Tướng nào được người chơi hoặc bot mở đầu tiên thì tướng đó **tự động trở thành Tướng Chính** (`mainHeroId` & slot 0). Tướng còn lại trở thành **Tướng Phó** (`subHeroId` & slot 1) và **phải tiếp tục úp**, tuyệt đối không được lật cả hai!
2. **Thiếu nút Kỹ Năng Chủ Động trên ActionBar:** Công chúa An Tư có kỹ năng chủ động *Hòa Thân* (`hoa_than_an_tu`: dùng lá bài chất ♦ Rô như [Lạc Bất Tư Thục] trong Pha Hành động). Dù người chơi đang ở Pha Hành động và trên tay có lá bài Rô (♦A Chém), thanh ActionBar chỉ có duy nhất nút `Kết Thúc`, nút `Hòa Thân` hoàn toàn biến mất.
3. **Banner thông báo lỗi thời bị treo vĩnh viễn:** Banner thông báo (Toast) bị đông cứng trên màn hình (ví dụ: `⚠️ Đến Pha Bỏ Bài: Hãy chọn 2 lá bài...` vẫn nằm trên đầu màn hình ngay cả khi đã sang lượt người khác dùng Dã Man; hoặc thông báo `👁️ Bạn đã lộ diện tướng...` không tự biến mất), che khuất tầm nhìn và gây rối loạn thông tin.

## 3. Các Quyết Định Kỹ Thuật

### 3.1. Cơ Chế Mở Tướng Đơn & Hoán Đổi Tướng Mở Đầu Tiên Thành Tướng Chính
- **Khởi tạo tướng:** Ban đầu, 2 tướng ẩn được gán nhãn trung tính trên giao diện `MyHeroBar.jsx`: `TƯỚNG 1` và `TƯỚNG 2` (không gán cứng `CHÍNH ẨN` / `PHÓ ẨN` khi cả 2 chưa lộ diện).
- **Hoán đổi nguyên tử trong `HeroRegistry.revealPlayerHero`:**
  - Nếu cả 2 tướng đều đang úp (`!revealedHeroes[0] && !revealedHeroes[1]`):
    - Nếu bấm mở tướng ở slot 1: Hệ thống hoán đổi vị trí của tướng slot 1 lên slot 0 (`mainHeroId`), và chuyển tướng slot 0 xuống slot 1 (`subHeroId`).
    - Sau khi hoán đổi, hệ thống **chỉ lật duy nhất slot 0 (`revealedHeroes = [true, false]`)**. Slot 1 (Tướng Phó) tiếp tục giữ nguyên trạng thái úp mặt (`false`).
  - Giới tính nhân vật (`player.gender`) lập tức cập nhật theo Tướng Chính vừa được lật mở đầu tiên.
  - Loại bỏ hoàn toàn đoạn gọi đúp lật tướng trong `DispatcherV4`.

### 3.2. Hiển Thị Đầy Đủ Nút Kỹ Năng Chủ Động Trên ActionBar
- **Nguyên nhân cốt lõi:** `GameViewMapperV4.js` định dạng `skill.type` thành chuỗi tiếng Việt có dấu `'CHỦ ĐỘNG'`, trong khi `ActionBar.jsx` trước đó chỉ kiểm tra kiểu chuỗi tiếng Anh `s.type === 'ACTIVE' || s.type === 'ACTIVE_DEFENSIVE'`. Kết quả là toàn bộ kỹ năng chủ động hiển thị tiếng Việt bị loại trừ khỏi ActionBar!
- **Giải pháp:**
  - Chuẩn hóa bộ lọc `isActionSkill` trong `ActionBar.jsx` để chấp nhận:
    - `s.type === 'CHỦ ĐỘNG' || s.type === 'CHU DONG' || s.type === 'ACTIVE' || s.type === 'ACTIVE_DEFENSIVE'`
    - Hoặc nhận diện theo tên kỹ năng chủ động phổ biến: `Hòa Thân`, `Diệu Dược`, `Tự Chủ`, `Bình Loạn`, `Thủy Tổ`, `Duyên Thơ`...
  - Chuẩn hóa so sánh pha: `(gameState.phase || '').toLowerCase() === 'action'`, tránh lỗi lệch chữ hoa/thường (`ACTION` vs `action`).
  - Bổ sung trường `type: 'active'` cho `hoa-than-an-tu` trong `gameData.js`.

### 3.3. Xử Lý Triệt Để Vòng Đời Tự Hủy Của Toast Banner (Anti-Stale Toast Engine)
- **Nguyên nhân Toast bị treo vĩnh viễn:** Trong `GameView.jsx`, hàm `useEffect` kết hợp cả việc gán `phaseBanner` và tạo `setTimeout` rồi trả về `clearTimeout`. Khi `setPhaseBanner` kích hoạt, React re-render component khiến hàm cleanup chạy ngay lập tức và xóa timer trước khi nó kịp kích hoạt! Ở lần render tiếp theo, vì `phaseBanner` đã có giá trị nên effect return sớm $\rightarrow$ Banner bị kẹt vĩnh viễn.
- **Giải pháp:**
  - Tách thành 2 `useEffect` độc lập:
    1. *Effect 1 (Queue Consumer):* Chỉ phụ thuộc vào `toastQueue` và `phaseBanner`. Khi không có banner nào đang hiện và queue có thông báo, lấy phần tử đầu tiên ra gán vào `phaseBanner`.
    2. *Effect 2 (Auto-dismiss Timer):* Chỉ phụ thuộc vào chuỗi nội dung `phaseBanner?.message`. Khi có message mới, thiết lập `setTimeout(..., 2300)` để dọn dẹp banner. Timer chỉ bị hủy khi nội dung message thực sự thay đổi hoặc component unmount.
  - **Tự động xóa sạch khi có sự kiện/modal mới:**
    - Khi xuất hiện `gameState.waitingForResponse` (modal phản hồi như Dã Man, Bỏ Bài, Quyết Đấu, Né...), hệ thống tự động xóa sạch `phaseBanner` và dọn `toastQueue` để người chơi tập trung tương tác modal.
    - Khi thay đổi lượt hoặc khi pha chơi không còn là `PHASES.DISCARD`, thông báo chỉ dẫn bỏ bài tự động được thu hồi ngay lập tức.

## 4. Kết Quả Kiểm Thử & Thẩm Định
- **Unit & Integration Tests:** Toàn bộ 81 test files (683 tests) vượt qua 100%. Bộ test chuyên biệt `EquipmentDisplayAndHeroRevealRuleQA.test.jsx` thẩm định toàn diện:
  - Hoán đổi tướng đầu tiên thành Tướng Chính và giữ nguyên Tướng Phó úp mặt.
  - Hiển thị nút kỹ năng Hòa Thân trên ActionBar khi ở Pha Hành động và có bài Rô.
  - Vòng đời toast tự động hủy sau 2.3s và tự động dọn sạch khi có modal phản hồi.
- **Đại giả lập:** Chạy thành công 1.000 trận đấu liên tục (`npm run sim:app`) qua Dispatcher V4 với 0 lỗi ngoại lệ, 0 deadlock.
- **Build Production:** `npm run cap:build` biên dịch Vite và đồng bộ Capacitor sang Android/iOS thành công 100%.
