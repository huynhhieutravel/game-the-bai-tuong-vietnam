# 📊 MA TRẬN KIỂM KÊ KỸ NĂNG TƯỚNG (HERO SKILL INVENTORY MATRIX)

> **Tài liệu kiểm định & bảo toàn chất lượng v4**  
> Mọi kỹ năng chuyển giao sang Lõi Engine v4 phải được đối chiếu và vượt qua 100% tiêu chí dưới đây mới được xem là hoàn tất.

---

## 1. Hệ 🟢 LẠC (Thục)

| Tướng | HP/Giới | Kỹ Năng | Phân Loại | Trigger / Giai Đoạn | Cơ Chế & Edge Cases Cần Lưu Ý | Trạng Thái QA |
|---|---|---|---|---|---|---|
| **Lạc Long Quân** | 4 HP / Nam | **Thủy Tổ** | Chủ động | Action Phase | Cho bài đồng minh; cho $\ge 2$ bài được dùng 1 Bài Cơ Bản miễn phí. | ✅ QA Pass (v4 Module & Tested) |
| | | **Bọc Trăm Trứng** | Chủ Công | Bị động / Hỏi | Khi cần Chém, tướng Lạc có thể chém giùm. UI cần highlight 2 bước chọn mục tiêu. | ✅ QA Pass (v4 Module & Tested) |
| **Thánh Gióng** | 4 HP / Nam | **Thiết Mã** | Tỏa Định | Thường trực | Khoảng cách đến người khác luôn -1. | ✅ QA Pass (v4 Module & Tested) |
| | | **Tre Ngà** | Kích hoạt | On Slash Target | Khóa kỹ năng đối thủ; phán xét buộc bỏ bài cùng chất nếu không thì cấm Né. | ✅ QA Pass (v4 Module & Tested) |
| **Sơn Tinh** | 4 HP / Nam | **Dời Núi** | Chuyển hóa | Action/Reaction | Chém $\leftrightarrow$ Né linh hoạt. | ✅ QA Pass (v4 Module & Tested) |
| **Chử Đồng Tử** | 3 HP / Nam | **Tiên Duyên** | Chuyển hóa | Action Phase | Bài ♣ chuyển hóa thành Thiết Tác Liên Hoàn. | ✅ QA Pass (v4 Module & Tested) |
| | | **Hóa Tiên** | Hạn Định | On Dying | 1 lần/ván: Hấp hối bỏ hết bài/trang bị, hồi đầy 3 HP, rút 3 bài. | ✅ QA Pass (v4 Module & Tested) |
| **Tiên Dung** | 3 HP / Nữ | **Duyên Tiên** | Phản ứng | On Trick Played | Dùng Cẩm Nang Thường $\to$ rút 1 bài. Tránh bug ReferenceError khi kiểm tra trạng thái lộ mặt. | ✅ QA Pass (v4 Module & Tested) |
| | | **Tiên Duyên** | Tỏa Định | Thường trực | Dùng Cẩm Nang không bị giới hạn cự ly. | ✅ QA Pass (v4 Module & Tested) |
| **Cao Lỗ (Lạc)** | 4 HP / Nam | **Nỏ Thần** | Kích hoạt | On Slash | Tầm đánh bằng Rank lá bài; tay $\ge$ địch cấm Né; HP $\le$ địch +1 sát thương. | ✅ QA Pass (v4 Module & Tested) |
| **Lang Liêu** | 3 HP / Nam | **Bánh Chưng** | Kích hoạt | Begin Phase | Xem X bài đầu chồng rút (tối đa 5), xếp lại đầu/cuối. | ✅ QA Pass (v4 Module & Tested) |
| | | **Đạm Bạc** | Tỏa Định | Thường trực | Hết bài trên tay $\to$ miễn nhiễm Chém và Quyết Đấu. | ✅ QA Pass (v4 Module & Tested) |
| **Thần Trụ Trời** | 4 HP / Nam | **Khai Thiên** | Chuyển hóa | Action Phase | Mọi bài Đỏ xem như lá [Chém]. | ✅ QA Pass (v4 Module & Tested) |
| **Rùa Vàng** | 3 HP / Vô tính | **Thần Giáp** | Tỏa Định | On Need Dodge | Chưa có Giáp $\to$ tự động có Bát Quái Trận (phán xét Đỏ = Né). | ✅ QA Pass (v4 Module & Tested) |
| | | **Thần Hỏa** | Chuyển hóa | Action Phase | Bài Đỏ trên tay dùng như Hỏa Công. | ✅ QA Pass (v4 Module & Tested) |
| | | **Linh Giám** | Chuyển hóa | Reaction Stack | Bài Đen trên tay dùng như Hóa Giải. | ✅ QA Pass (v4 Module & Tested) |

---

## 2. Hệ 🔴 VIỆT (Nguỵ)

| Tướng | HP/Giới | Kỹ Năng | Phân Loại | Trigger / Giai Đoạn | Cơ Chế & Edge Cases Cần Lưu Ý | Trạng Thái QA |
|---|---|---|---|---|---|---|
| **Triệu Quang Phục** | 4 HP / Nam | **Dạ Trạch** | Kích hoạt | Draw Phase | Bỏ rút bài $\to$ cướp ngẫu nhiên 1 bài tay của tối đa 2 người khác. | ✅ QA Pass (v4 Module & Tested) |
| **Phùng Hưng** | 4 HP / Nam | **Khởi Nghĩa** | Kích hoạt | Draw Phase | Rút ít hơn 1 bài $\to$ Chém & Quyết Đấu lượt này +1 sát thương. | ✅ QA Pass (v4 Module & Tested) |
| **Khúc Thừa Dụ** | 3 HP / Nam | **Tự Chủ** | Chủ động | Action Phase | Đọ điểm với người HP cao hơn; thắng bắt họ chém người khác, thua bị họ chém. | ✅ QA Pass (v4 Module & Tested) |
| | | **Khoan Dân** | Bị động | On Damaged | Nhận 1 damage $\to$ chọn 1 người rút bài bằng MaxHP (tối đa 5). | ✅ QA Pass (v4 Module & Tested) |
| **Dương Đình Nghệ** | 4 HP / Nam | **Dưỡng Quân** | Kích hoạt | Turn Lifecycle | Bỏ các pha (Judge, Draw, Play, Discard) để đổi lấy các cú Chém không giới hạn cự ly. | ✅ QA Pass (v4 Module & Tested) |
| **Lý Thường Kiệt** | 4 HP / Nam | **Nam Quốc Sơn Hà** | Bị động | On Damaged | Nhận damage $\to$ rút 1 bài và thu lấy lá bài gây sát thương. | ✅ QA Pass (v4 Module & Tested) |
| | | **Tiên Phát** | Chủ Công | On Need Dodge | Tướng Việt có thể Né giùm. | ✅ QA Pass (v4 Module & Tested) |
| **Trần Quang Khải** | 4 HP / Nam | **Đoạt Sáo** | Kích hoạt | End Phase | Lật mặt tướng, rút 4 bài; bỏ 1 bài (nếu là trang bị được dùng luôn). | ✅ QA Pass (v4 Module & Tested) |
| | | **Chương Dương** | Chuyển hóa | Reaction / Flip | Dùng trang bị như Hóa Giải; lật mặt trước $\to$ di chuyển 1 bài trên bàn. | ✅ QA Pass (v4 Module & Tested) |
| **Nguyễn Lữ** | 4 HP / Nam | **Tiên Phong** | Chủ động | Action Phase | Mất 1 HP hoặc bỏ vũ khí $\to$ gây 1 damage lên người trong tầm. Auto-flag chặn bot loop. | ✅ QA Pass (v4 Module & Tested) |

---

## 3. Hệ 🔵 HÀ (Ngô)

| Tướng | HP/Giới | Kỹ Năng | Phân Loại | Trigger / Giai Đoạn | Cơ Chế & Edge Cases Cần Lưu Ý | Trạng Thái QA |
|---|---|---|---|---|---|---|
| **Ngô Quyền** | 4 HP / Nam | **Bạch Đằng** | Chủ động | Action Phase | Đổi X bài lấy X bài mới; nếu bỏ hết tay $\to$ rút thêm 1. | ✅ QA Pass (v4 Module & Tested) |
| | | **Hậu Viện** | Chủ Công | Bị động | Tướng Hà ăn Đào có thể nhường cho Ngô Quyền hồi máu và rút 1 bài. | ✅ QA Pass (v4 Module & Tested) |
| **Cao Lỗ (Hà)** | 4 HP / Nam | **Nỏ Thần** | Chuyển hóa | Action Phase | Dùng bài Đen như lá [Qua Sông Phá Cầu]. | ✅ QA Pass (v4 Module & Tested) |
| **Yết Kiêu** | 4 HP / Nam | **Lặn Sâu** | Chủ động | Action Phase | Tự mất 1 HP $\to$ rút 2 bài. | ✅ QA Pass (v4 Module & Tested) |
| **Nguyễn Trãi** | 3 HP / Nam | **Bình Ngô** | Bị động | Draw Phase | Rút thêm 1 bài (tổng 3 lá). | ✅ QA Pass (v4 Module & Tested) |
| | | **Tâm Công** | Chủ động | Action Phase | Đoán chất bài đối thủ; đoán sai họ bị 1 sát thương. | ✅ QA Pass (v4 Module & Tested) |
| **Nguyễn Chích** | 4 HP / Nam | **Nghệ An Kế** | Tỏa Định | Thường trực | Miễn nhiễm Cướp Bài và Hỗn Loạn. | ✅ QA Pass (v4 Module & Tested) |
| **Tô Hiến Thành** | 3 HP / Nam | **Nhiếp Chính** | Bị động | Discard Phase | Nếu không Chém trong Action Phase $\to$ bỏ qua Discard Phase (giữ toàn bộ bài tay). | ✅ QA Pass (v4 Module & Tested) |
| **Nguyên Phi Ỷ Lan**| 3 HP / Nữ | **Nhiếp Chính** | Chuyển hóa | On Need Dodge | Bài Đen trên tay dùng như Né. | ✅ QA Pass (v4 Module & Tested) |
| | | **Phật Tâm** | Kích hoạt | Begin Phase | Phán xét bài Đen $\to$ rút tiếp và thu toàn bộ bài Đen. | ✅ QA Pass (v4 Module & Tested) |
| **Trần Nhật Duật** | 3 HP / Nam | **Thông Ngôn** | Bị động | On Judged | Thu lấy lá phán xét của mình sau khi có hiệu lực. | ✅ QA Pass (v4 Module & Tested) |
| | | **Hòa Nghị** | Bị động | On Damaged | Nhận 1 damage $\to$ xem 2 bài đầu chồng rút, chia cho người chơi tùy ý. | ✅ QA Pass (v4 Module & Tested) |
| **Trần Khánh Dư** | 4 HP / Nam | **Vân Đồn** | Chủ động | Action Phase | Đọ điểm; thắng được thêm 1 Chém vô hạn cự ly + thêm 1 mục tiêu; thua bị cấm Chém. | ✅ QA Pass (v4 Module & Tested) |
| **Mạc Đĩnh Chi** | 3 HP / Nam | **Đối Sứ** | Bị động | On Damaged | Nhận damage $\to$ rút 1 bài từ kẻ gây sát thương. | ✅ QA Pass (v4 Module & Tested) |
| | | **Ứng Biến** | Phản ứng | Before Judge | Đánh bài tay thay thế bài phán xét trước khi có hiệu lực. | ✅ QA Pass (v4 Module & Tested) |
| **Chu Văn An** | 3 HP / Nam | **Thất Trảm Sớ**| Bị động | On Damaged | Phán xét không phải ♥ $\to$ kẻ gây damage phải bỏ 2 bài hoặc nhận 1 damage. | ✅ QA Pass (v4 Module & Tested) |
| **Hồ Xuân Hương** | 3 HP / Nữ | **Duyên Thơ** | Chủ động | Action Phase | Bỏ 2 bài $\to$ hồi 1 HP cho mình và 1 tướng Nam bị thương. | ✅ QA Pass (v4 Module & Tested) |
| | | **Xuân Hương** | Bị động | On Equip Lost | Mất 1 trang bị $\to$ rút 2 bài. | ✅ QA Pass (v4 Module & Tested) |
| **Nguyễn Địa Lô** | 4 HP / Nam | **Hộ Chủ** | Tỏa Định | On Dying | Lật bài đặt "Trung"; khác điểm với các lá cũ thì thoát chết lên 1 HP; Max hand = số Trung. | ✅ QA Pass (v4 Module & Tested) |
| | | **Xả Thân** | Kích hoạt | On Discard/Steal| Người khác bị mất bài tay $\to$ chịu mất 1 HP cho họ rút 2 bài. | ✅ QA Pass (v4 Module & Tested) |
| **Ngọc Hân C.Chúa**| 3 HP / Nữ | **Hiền Hậu** | Phản ứng | On Damaged | Bỏ 1 lá ♥ để chặn damage, ép người khác nhận 1 damage/mất 1 HP. | ✅ QA Pass (v4 Module & Tested) |
| | | **Quốc Sắc** | Tỏa Định | Thường trực | Mọi lá bài ♠ của mình được xem như ♥. | ✅ QA Pass (v4 Module & Tested) |
| **Công chúa An Tư**| 3 HP / Nữ | **Hòa Thân** | Chuyển hóa | Action Phase | Bài ♦ dùng như Hỗn Loạn (Lạc Bất Tư Thục). | ✅ QA Pass (v4 Module & Tested) |
| | | **Xả Thân** | Phản ứng | On Targeted Slash| Bị Chém $\to$ bỏ 1 bài chuyển hướng Chém sang người khác trong tầm. | ✅ QA Pass (v4 Module & Tested) |

---

## 4. Hệ 🟤 SƠN (Quần Hùng)

| Tướng | HP/Giới | Kỹ Năng | Phân Loại | Trigger / Giai Đoạn | Cơ Chế & Edge Cases Cần Lưu Ý | Trạng Thái QA |
|---|---|---|---|---|---|---|
| **Tuệ Tĩnh** | 3 HP / Nam | **Nam Dược** | Chuyển hóa | Reaction (Ngoài lượt)| Bài Đỏ dùng như Đào để cứu người hấp hối. | ✅ QA Pass (v4 Module & Tested) |
| | | **Diệu Dược** | Chủ động | Action Phase | Bỏ 1 bài $\to$ hồi 1 HP cho 1 tướng. Yêu cầu đính kèm targetId rõ ràng. | ✅ QA Pass (v4 Module & Tested) |
| **Đinh Bộ Lĩnh** | 6 HP / Nam | **Uy Chấn** | Tỏa Định | On Red Slash Hit| Bị Chém Đỏ gây damage $\to$ kẻ đánh tự chọn hồi 1 HP hoặc rút 1 bài. | ✅ QA Pass (v4 Module & Tested) |
| **Nguyễn Bặc** | 4 HP / Nam | **Bình Loạn** | Chuyển hóa | Action Phase | 2 bài cùng chất dùng như Loạn Tiễn (Vạn Tiễn Tề Phát). | ✅ QA Pass (v4 Module & Tested) |
| | | **Khai Quốc** | Chủ Công / Tỏa Định| Thường trực | Max hand + 2 × (số tướng Sơn). | ✅ QA Pass (v4 Module & Tested) |
| **Huyền Trân C.Chúa**| 3 HP / Nữ | **Hòa Thân** | Chủ động | Action Phase | Bỏ 1 bài $\to$ ép 2 tướng Nam Quyết Đấu với nhau. | ✅ QA Pass (v4 Module & Tested) |
| | | **An Bang** | Kích hoạt | End Phase | Rút 1 bài cuối lượt. Chú ý không bị đè bởi lượt kế tiếp. | ✅ QA Pass (v4 Module & Tested) |
| **Đinh Điền** | 3 HP / Nam | **Tiên Phong** | Phản ứng | On Dodge Success| Né xong phán xét ♠/♣ gây sát thương sét. Lọc đúng attackerId, không hỏi nhầm. | ✅ QA Pass (v4 Module & Tested) |
| | | **Quân Cơ** | Phản ứng | Before Judge | Đánh bài Đen thay thế bài phán xét. | ✅ QA Pass (v4 Module & Tested) |
| | | **Định Quốc** | Chủ Công | Action Phase | Tướng Sơn có thể đưa Né hoặc Sấm Sét cho Đinh Điền. | ✅ QA Pass (v4 Module & Tested) |
| **Nguyễn Xí** | 5 HP / Nam | **Phá Quân** | Tỏa Định | On Slash / Duel | Chém bắt đối thủ dùng 2 Né; Quyết Đấu bắt đối thủ dùng 2 Chém mỗi lượt đọ. Chặn lỗi nhảy ké! | ✅ QA Pass (v4 Module & Tested) |
| **Đô đốc Bảo** | 4 HP / Nam | **Phá Thành** | Kích hoạt | Draw Phase | Bỏ rút bài $\to$ phán xét lấy lá đó; dùng bài khác màu như Quyết Đấu. | ✅ QA Pass (v4 Module & Tested) |
| **Lê Ngân** | 3 HP / Nam | **Trung Dũng** | Kích hoạt | Action Phase | Úp 1 bài dùng như bất kỳ lá nào; người khác nghi ngờ $\to$ kiểm tra thật/giả. | ✅ QA Pass (v4 Module & Tested) |
| | | **Hộ Giá** | Tỏa Định | Thường trực | Cấm nghi ngờ Trung Dũng; khi còn 1 HP các kỹ năng khác bị khóa. | ✅ QA Pass (v4 Module & Tested) |
