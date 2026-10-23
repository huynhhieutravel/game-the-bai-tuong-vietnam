# 0005. Cửa Sổ Hóa Giải Phán Xét, Giới Hạn Combo An Toàn & Bỏ Bài Ưu Tiên Sinh Tồn

- **Status:** Accepted
- **Date:** 2026-10-23

## Ngữ Cảnh (Context)
Trong quá trình mở rộng Engine v4 lên chế độ Song Tướng (Dual Heroes) và củng cố toàn diện các pha trong vòng đời lượt chơi (Turn Lifecycle):
1. **Pha Phán xét (Judge Phase):** Cần quy tắc chuẩn hóa cách xử lý Cẩm nang Trì hoãn (`Sấm Sét`, `Hỗn Loạn`) với sự tham gia của mọi người chơi trên bàn thông qua cơ chế chuỗi Hóa Giải (`ASK_NEGATE`).
2. **Kỹ năng Song Tướng liên hoàn:** Việc kết hợp tự do 2 tướng cùng phe (ví dụ: Tiên Dung + Chử Đồng Tử) có thể tạo ra các chuỗi kích hoạt kỹ năng bị động liên tiếp. Cần một cơ chế an toàn cấp Engine ngăn chặn hoàn toàn nguy cơ lặp vô hạn (infinite recursion loop) làm tràn ngăn xếp hoặc đơ ứng dụng.
3. **Pha Bỏ bài (Discard Phase):** Khi số bài trên tay vượt quá lượng máu hiện tại, nếu Bot hoặc người chơi hết thời gian đếm ngược (timeout) bỏ bài ngẫu nhiên, họ có thể vô tình vứt bỏ các lá bài sinh tồn quý giá như [Đào], [Né], gây ức chế trải nghiệm.

## Quyết Định (Decision)
1. **Cửa Sổ Hóa Giải Phán Xét (Judgement Negate Window):** Trong Pha Phán xét, trước khi lật lá bài phán xét từ đầu chồng bài rút, Engine bắt buộc mở một vòng hỏi Hóa Giải theo chiều kim đồng hồ quanh bàn chơi. Nếu có người chơi sử dụng [Hóa Giải] (chuỗi Hóa Giải kết thúc bằng số lẻ), cẩm nang trì hoãn bị vô hiệu hóa và rơi thẳng xuống `discardPile` mà không lật bài phán xét.
2. **Giới Hạn Kích Hoạt An Toàn (Safe Turn Cap):** Mọi kỹ năng trong `SkillContract` được áp đặt giới hạn kích hoạt an toàn tối đa 5 lần trong một lượt chơi (`turnTriggerCount <= 5`). Khi đạt đến 5 lần, kỹ năng tạm dừng kích hoạt cho đến khi bắt đầu lượt mới, ngăn ngừa triệt để hiện tượng treo máy hoặc rò rỉ CPU do vòng lặp vô hạn.
3. **Thuật Toán Bỏ Bài Ưu Tiên Sinh Tồn (Survival-Priority Discard):** Cả Bot AI và cơ chế tự động bỏ bài khi hết giờ (Auto-Discard Timeout) đều tuân thủ bảng điểm ưu tiên giữ bài sinh tồn:
   - Giữ lại hàng đầu: `Đào` (100đ), `Rượu` (90đ)
   - Giữ lại hàng hai: `Né` (80đ), `Hóa Giải` (75đ)
   - Giữ lại hàng ba: `Trang bị` (50đ)
   - Bỏ trước tiên: `Chém` (30đ), `Cẩm nang khác` (20đ)

## Hệ Quả (Consequences)
- Đảm bảo tính cân bằng chiến thuật cao cấp: người chơi có thể phối hợp đồng minh dùng Hóa Giải giải cứu nhau khỏi cẩm nang trì hoãn.
- Bảo vệ Engine v4 chạy an toàn tuyệt đối 100%, không bao giờ gặp lỗi infinite loop kể cả khi người chơi kết hợp các cặp tướng có kỹ năng cộng hưởng mạnh nhất.
- Nâng cao đáng kể chất lượng AI của Bot và trải nghiệm chơi của người dùng khi gặp sự cố mạng/hết thời gian thao tác.
