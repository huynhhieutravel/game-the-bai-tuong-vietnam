# ADR 0012: Phục Hồi Toàn Diện Kỹ Năng Chúa Công Quốc Chiến, Cửa Sổ Can Thiệp Phán Xét & Thưởng Phạt Đồng Minh

## Trạng thái
Đã chấp thuận (Accepted) & Đã triển khai hoàn tất (Implemented).

## Bối cảnh (Context)
Trong quá trình nâng cấp từ Engine v3 lên Engine v4, một số cơ chế đặc thù sâu sắc của luật Quốc Chiến (National War) và sự tương tác đồng minh của các Chúa Công / Tướng Phò Tá chưa được ánh xạ đầy đủ vào hệ thống StateMachine và PriorityStack v4:
1. **Phần thưởng hạ địch & Hình phạt ngộ sát Quốc Chiến (Kill Rewards & Friendly Fire)**:
   - Theo luật Quốc Chiến chuẩn: Tiêu diệt kẻ địch khác phe được thưởng số lá bài bằng số đồng minh đã lộ diện của nạn nhân + 1 (tối thiểu 2 lá). Tiêu diệt Dã Tâm được 1 lá.
   - Khi ngộ sát đồng minh cùng phe (cả hai đã lộ diện): Kẻ ngộ sát bị phạt tức thì vứt bỏ toàn bộ bài trên tay và toàn bộ trang bị.
2. **Kỹ năng Chúa Công & Hàng đợi Đồng minh (Lord Skills & Ally Teamwork)**:
   - **Lạc Long Quân (Bọc Trăm Trứng)**: Khi cần Né (bị Chém, Vạn Tiễn) hoặc cần Chém (trong Quyết Đấu, Dã Man), có quyền đẩy PriorityFrame kêu gọi đồng minh hệ Lạc ra bài thay thế theo thứ tự hàng đợi.
   - **Lý Thường Kiệt (Tiên Phát)**: Khi cần Né, kêu gọi đồng minh hệ Việt ra Né thay thế.
   - **Ngô Quyền (Hậu Viện)**: Khi đồng minh hệ Hà sử dụng lá [Đào], nếu Ngô Quyền đang bị thương, người đánh Đào được mở modal nhường quả Đào cho Ngô Quyền và nhận thưởng rút 1 lá bài.
   - **Đinh Điền (Quân Cơ & Định Quốc)**: Bổ sung đăng ký kỹ năng Quân Cơ (dùng bài đen đổi phán xét) và Định Quốc.
3. **Cửa Sổ Can Thiệp Phán Xét (Pre-Judgement Intercept Window)**:
   - Khi cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn) rút bài phán xét từ bộ bài, trước khi áp dụng kết quả, người chơi sở hữu kỹ năng can thiệp như Mạc Đĩnh Chi (`Ứng Biến`) hoặc Đinh Điền (`Quân Cơ`) được quyền đánh ra một lá bài hợp lệ từ trên tay để tráo đổi lá phán xét ban đầu.
4. **Tính toán Giới hạn Bài trên tay Động (Dynamic Max Hand Limit)**:
   - Khai Quốc của Nguyễn Bặc: Tăng +2 Max Hand cho mỗi đồng minh Sơn còn sống.
   - Hộ Chủ của Nguyễn Địa Lô: Giới hạn bài bằng số lá bài Trung.
   - `Invariants.js` và `StateMachine.js` phải tính toán đồng bộ `effectiveMaxHand`.

## Quyết định Thiết kế (Decisions)
1. **Quản lý PriorityFrame chuyên biệt**:
   - Thêm các frame: `ASK_CHANGE_JUDGE`, `ASK_HAU_VIEN`, `ASK_BOC_TRAM_TRUNG_DODGE`, `ASK_BOC_TRAM_TRUNG_SLASH`, `ASK_TIEN_PHAT`.
   - Các frame này duy trì hàng đợi `allies` hoặc `candidateIds` và `allyIndex` để duyệt lần lượt từng đồng minh/ứng viên mà không gây nghẽn PriorityStack.
2. **Xử lý Can Thiệp Phán Xét trong `TrickRules.js`**:
   - `resolveDelayedTrick`: Rút `judgeCard` từ `drawPile`. Kiểm tra danh sách người chơi còn sống có `ung_bien` hoặc `quan_co`. Nếu có, tạo frame `ASK_CHANGE_JUDGE`.
   - `respondChangeJudge`: Nếu người chơi đánh ra bài hợp lệ, đổi lá bài và gọi `_finalizeDelayedJudgement`. Nếu bỏ qua, chuyển sang ứng viên tiếp theo hoặc chốt lá bài ban đầu.
3. **DispatcherV4 & ACL Mapping (`GameViewMapperV4.js`)**:
   - `GameViewMapperV4.js` ánh xạ chính xác các frame mới thành payload UI chuẩn (`ask_change_judge`, `ask_hau_vien`, `ask_boc_tram_trung_dodge`, `ask_boc_tram_trung_slash`, `ask_tien_phat`).
   - `ModalContainer.jsx` render trực tiếp `AskChangeJudgeModal` và `HauVienModal` thay cho các placeholder cũ.
4. **Bảo toàn Invariants**:
   - Cập nhật `GameInvariants.assertDiscardLimit` nhận thêm tham số `state` để tính toán bonus đồng minh Sơn cho `khai_quoc` và `ho_chu`.
   - Bổ sung bảo toàn thẻ bài cho `judgeCard` và `delayedCard` trong mọi trường hợp giải phóng frame.

## Kết quả Đạt được (Consequences)
- **Kiểm định Unit/Integration**: 24/24 files, 169/169 tests Vitest đều PASS 100%.
- **Mô phỏng 1.000 trận đấu không đầu (Headless Simulation)**:
  - 1000/1000 trận hoàn thành hợp lệ (0 exception, 0 lỗi invariant).
  - Tỉ lệ thắng giữa 4 phe Quốc Chiến: Lạc (229), Việt (254), Hà (262), Sơn (243) — cực kỳ cân bằng.
  - Thời gian mô phỏng 1.000 trận đấu: chỉ 0.63 giây.
