# 🎴 GAME DESIGN DOCUMENT (GDD) - VIỆT SÁT (Bản Hoàn Chỉnh)
# Bối cảnh: Lịch sử & Thần thoại Việt Nam
# Dựa trên core mechanics của Tam Quốc Sát

---

## 1. TỔNG QUAN GAME
- **Thể loại:** Thẻ bài chiến thuật ẩn danh (Hidden Role Card Game)
- **Số người chơi:** 5 - 8 người
- **Mục tiêu:** Sinh tồn và hoàn thành nhiệm vụ của phe phái mình.

---

## 2. HỆ THỐNG PHE PHÁI (IDENTITY)
Đầu game, mỗi người nhận 1 thân phận bí mật (trừ Chủ Công phải lật bài):
- 👑 **Vua (Chủ Công):** Tiêu diệt toàn bộ Phản Tặc và Nội Gián.
- 🛡️ **Trung Thần:** Bảo vệ Vua. Thắng khi Vua thắng.
- 🥷 **Phản Tặc:** Tiêu diệt Vua.
- 🎭 **Nội Gián:** Kẻ hai mặt. Phải là người sống sót cuối cùng (giết hết Phản Tặc, Trung Thần, và đối đầu 1v1 giết Vua cuối cùng).

---

## 3. CƠ CHẾ LƯỢT CHƠI (6 GIAI ĐOẠN)
*Khác với bản nháp cũ, game thực tế có 6 giai đoạn để các kỹ năng tướng có thể can thiệp.*

1. **Giai đoạn Bắt đầu:** Kích hoạt kỹ năng đầu lượt.
2. **Giai đoạn Phán xét:** Xử lý các lá bài trì hoãn (Sấm Sét, Hỗn Loạn) trước mặt. Rút 1 lá phán xét xem chất/số.
3. **Giai đoạn Rút bài:** Rút 2 lá từ chồng bài.
4. **Giai đoạn Ra bài:** 
   - Dùng bài Cẩm Nang, Trang Bị (không giới hạn).
   - **Tối đa 1 lá CHÉM mỗi lượt.**
5. **Giai đoạn Bỏ bài:** Nếu số bài trên tay > HP hiện tại, phải bỏ bớt cho bằng HP.
6. **Giai đoạn Kết thúc:** Kích hoạt kỹ năng cuối lượt.

---

## 4. HỆ THỐNG TẦM ĐÁNH (RANGE) — Rất Quan Trọng!
- Người chơi ngồi thành vòng tròn. Khoảng cách = số người ở giữa + 1.
- Tầm tay không = 1 (chỉ chém được người ngồi ngay cạnh).
- Cần **Vũ khí** để đánh xa hơn.
- Cần **Ngựa -1** để kéo gần khoảng cách tấn công.
- Cần **Ngựa +1** để đẩy lùi khoảng cách phòng thủ (kẻ địch khó chém mình hơn).

---

## 5. CƠ CHẾ HẤP HỐI (DYING)
- Khi HP ≤ 0, người chơi chưa chết ngay mà vào trạng thái **Hấp Hối**.
- Bắt đầu từ người đó và đi vòng quanh bàn, bất kỳ ai cũng có thể dùng lá **Đào (Thuốc)** để cứu.
- Nếu không ai cứu, người chơi **Tử trận** (bỏ hết bài, kiểm tra điều kiện thắng của game).

---

## 6. HỆ THỐNG THẺ BÀI (~103 lá)
Mỗi lá bài đều có **Chất** (♥️, ♦️, ♣️, ♠️) và **Số** (A-K) dùng cho Phán xét và kỹ năng.

### 6.1 Bài Cơ Bản
| Tên thẻ | Tương đương TQS | Hiệu ứng |
|---------|-----------------|----------|
| **Chém** | Sát | Gây 1 sát thương trong tầm. Chỉ 1 lá/lượt. |
| **Né** | Thiểm | Tránh 1 lá Chém. |
| **Đào (Thuốc)** | Đào | Hồi 1 HP (hoặc cứu người hấp hối). |
| **Rượu** | Tửu | +1 sát thương cho lá Chém tiếp theo HOẶC tự cứu mình khi hấp hối. |

### 6.2 Bài Cẩm Nang (Mưu lược)
| Tên thẻ | Hiệu ứng |
|---------|----------|
| **Hóa Giải** | Vô hiệu hóa BẤT KỲ lá cẩm nang nào. Có thể dùng Hóa Giải để chống Hóa Giải. |
| **Quyết Đấu** | 1v1: Hai bên thay phiên ra Chém, ai không có Chém sẽ mất 1 HP. |
| **Cướp Bài** | Lấy 1 lá của người khác (khoảng cách 1). |
| **Tước Bài** | Bỏ 1 lá của người khác (bất kỳ khoảng cách). |
| **Mượn Đao** | Ép người A chém B, nếu không chém phải đưa vũ khí cho bạn. |
| **Loạn Tiễn** | AOE: Tất cả phải ra **Né**, không ra mất 1 HP. |
| **Dã Man** | AOE: Tất cả phải ra **Chém**, không ra mất 1 HP. |
| **Hồi Xuân** | AOE: Tất cả người chơi hồi 1 HP. |
| **Sấm Sét** | (Trì hoãn) Đầu lượt phán xét: Nếu rút trúng Bích ♠️ 2-9 → nổ mất 3 HP. Khác → truyền cho người kế. |
| **Hỗn Loạn** | (Trì hoãn) Đầu lượt phán xét: Nếu KHÔNG phải Cơ ♥️ → mất Giai đoạn Ra bài. |

### 6.3 Bài Trang Bị
| Tên thẻ | Loại | Hiệu ứng |
|---------|------|----------|
| **Liên Nỏ** | Vũ khí (Tầm 1) | Không giới hạn số lượng Chém/lượt. |
| **Thanh Long Đao** | Vũ khí (Tầm 3) | Chém bị Né → Được Chém tiếp mục tiêu đó. |
| **Rìu Quán Thạch** | Vũ khí (Tầm 3) | Chém bị Né → Bỏ 2 bài để xuyên giáp bắt buộc trúng. |
| **Bát Quái** | Giáp | Khi cần Né → Phán xét: Nếu Đỏ (♥️, ♦️) = Tự động Né. |
| **Hắc Thuẫn** | Giáp | Miễn nhiễm mọi lá Chém màu Đen (♠️, ♣️). |
| **Ngựa Chiến (-1)**| Thú cưỡi | Giảm khoảng cách từ mình đến người khác đi 1. |
| **Ngựa Thần (+1)**| Thú cưỡi | Tăng khoảng cách từ người khác đến mình thêm 1. |

---

## 7. HỆ THỐNG TƯỚNG VÀ 4 PHE PHÁI (VIỆT SÁT)

Trò chơi sử dụng 4 phe phái thuần Việt để phục vụ các cơ chế tương tác (ví dụ Chủ Công buff phe, kỹ năng buff đồng minh phe):

1. **LẠC (Thần Thoại / Cổ Đại):** Các vị thần, truyền thuyết (Thánh Gióng, Sơn Tinh, Thủy Tinh). Thường có máu cao, kỹ năng kiểm soát siêu nhiên.
2. **TIỀN (Tiền Triều):** Các cuộc khởi nghĩa sơ khai và các triều đại đầu (Hai Bà Trưng, Ngô Quyền, Đinh Bộ Lĩnh, Lý Thường Kiệt). Kỹ năng bùng nổ, đánh nhanh thắng nhanh.
3. **TRẦN (Hào khí Đông A):** Triều đại nhà Trần (Trần Hưng Đạo, Phạm Ngũ Lão). Kỹ năng thiên về phòng thủ phản công, liên kết đội hình.
4. **LÊ (Khởi Nghĩa Lam Sơn / Hậu Lê):** Triều đại nhà Lê (Lê Lợi, Nguyễn Trãi). Kỹ năng mưu mẹo, chiến thuật, du kích.

*(Chi tiết bộ kỹ năng tướng xem tại `docs/02_Heroes_List.md`)*
