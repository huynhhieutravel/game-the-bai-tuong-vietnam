# ⚔️ 06. CHẾ ĐỘ QUỐC CHIẾN (CHỌN TƯỚNG KÉP)

Chế độ Quốc Chiến (National War) là chế độ mà người chơi không được chia sẵn vai trò (Vua, Phản Tặc...) từ đầu. Thay vào đó, **Phe phái của bạn được quyết định bởi 2 vị Tướng mà bạn chọn.**

## 1. Giai đoạn Khởi tạo (Drafting Phase)
- Đầu ván đấu, mỗi người chơi được chia ngẫu nhiên **5 lá Tướng** lật úp.
- Tất cả người chơi có **30 giây** để chọn ra đúng **2 thẻ Tướng CÙNG PHE (cùng màu)**.
- Khi người chơi đã tick đủ 2 thẻ hợp lệ, nút **[Hoàn Thành]** sẽ sáng lên để chốt lựa chọn.
- Nếu hết 30 giây mà người chơi vẫn chưa chọn xong, hệ thống sẽ tự động chọn ngẫu nhiên 2 thẻ cùng phe cho họ.
- *(Lưu ý thuật toán: Với 20 Tướng chia đều 4 phe, mỗi người nhận 5 thẻ thì chắc chắn 100% sẽ luôn có ít nhất 1 cặp cùng phe).*

## 2. Đặc điểm Tướng Kép (Dual Heroes)
Khi một người chơi điều khiển 2 vị tướng cùng lúc, các thông số sẽ được tính toán như sau:

### A. Lượng Máu Tối Đa (Max HP)
- **Công thức:** Lấy tổng số Máu của 2 tướng cộng lại, chia đôi, và **làm tròn xuống**.
- **Ví dụ 1:** Thánh Gióng (4) + Âu Cơ (3) = 7 -> Chia đôi = 3.5 -> Máu tối đa là **3**.
- **Ví dụ 2:** Lê Lợi (4) + Lê Lai (4) = 8 -> Chia đôi = 4 -> Máu tối đa là **4**.

### B. Kỹ Năng (Skills)
- Người chơi sẽ sở hữu **TOÀN BỘ** kỹ năng của cả 2 Tướng đã chọn. 
- *(Ví dụ: Vừa có thể dùng [Thiết Mã] của Thánh Gióng, vừa có thể dùng [Trăm Trứng] của Âu Cơ).*

### C. Cơ chế Cặp Đôi Hoàn Hảo (Perfect Pair) - *Sắp ra mắt*
- Nếu người chơi may mắn hoặc cố tình chọn đúng 2 vị tướng có liên kết lịch sử/thần thoại mật thiết với nhau, họ sẽ được kích hoạt trạng thái "Cặp Đôi Hoàn Hảo".
- **Phần thưởng:** Max HP của người chơi sẽ được **Cộng thêm 1 (+1 HP)**.
- **Ví dụ các cặp đôi dự kiến:**
  - *Sơn Tinh & Thủy Tinh* (Oan gia ngõ hẹp)
  - *Lê Lợi & Lê Lai* (Chúa tôi đồng sinh tử)
  - *Nguyễn Trãi & Nguyễn Thị Lộ* (Nỗi oan Lệ Chi Viên)

## 3. Điều kiện Thắng
- Toàn bộ những người không cùng Phe với bạn phải bị tiêu diệt. 
- Trò chơi kết thúc khi trên bàn chỉ còn duy nhất những người chơi thuộc CÙNG MỘT PHE. (Nếu bạn chết nhưng đồng đội cùng phe vẫn sống và dọn dẹp phần còn lại, bạn vẫn được tính là chiến thắng).

## 4. Cơ Chế Dã Tâm (Careerist)
Cơ chế **Dã Tâm** là luật để cân bằng game, chống lại việc một Phe ngẫu nhiên có quá đông người chơi áp đảo các phe khác.

### 4.1. Điều kiện trở thành Dã Tâm
Khi một người chơi Lật Tướng (Reveal), nếu số lượng người chơi **cùng phe** (đã lật) cộng với chính họ vượt quá **một nửa tổng số người chơi**, người này sẽ bị thoái hóa thành **Dã Tâm**.
* **Công thức:** `K + 1 > N / 2` (Trong đó K là số người cùng phe đã lật, N là tổng số người chơi ban đầu).
* Ví dụ: Ván đấu có 4 người (N=4, N/2=2). Nếu trên bàn đã có 2 người lật phe LẠC. Khi người thứ 3 lật lên cũng là phe LẠC (2 + 1 > 2) -> Người thứ 3 trở thành **🐺 Dã Tâm**.

### 4.2. Luật Thắng của Dã Tâm
- **Tách khỏi Phe gốc:** Khi thành Dã Tâm, người chơi không còn thuộc Phe gốc nữa. (VD: LẠC -> DÃ TÂM).
- **Mục tiêu tàn sát:** Dã Tâm được xem như một Phe độc lập và chỉ chiến thắng khi **tất cả người chơi khác (bao gồm cả Dã Tâm khác) đều chết**. Họ là kẻ thù chung của toàn bộ bàn cờ.
