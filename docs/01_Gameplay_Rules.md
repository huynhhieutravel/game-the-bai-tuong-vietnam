# 📜 01. LUẬT CHƠI CỐT LÕI (GAMEPLAY RULES)

## 1. Cơ Chế Lượt Chơi (6 Giai Đoạn)
Mỗi lượt của người chơi bắt buộc phải trải qua 6 giai đoạn sau (để các kỹ năng tướng có thể can thiệp đúng lúc):

1. **Giai đoạn Bắt đầu (Begin Phase):** 
   - Kích hoạt các kỹ năng có mô tả "Ở đầu lượt của bạn...".
2. **Giai đoạn Phán xét (Judge Phase):** 
   - Xử lý các lá bài trì hoãn (như Sấm Sét, Hỗn Loạn) đang đặt trước mặt. 
   - Rút 1 lá từ chồng bài phán xét (xem chất/số). Lá đặt sau cùng sẽ phán xét trước.
3. **Giai đoạn Rút bài (Draw Phase):** 
   - Rút mặc định 2 lá từ chồng bài chung.
4. **Giai đoạn Ra bài (Action Phase):** 
   - Dùng bài Cẩm Nang, Trang Bị (không giới hạn số lượng).
   - **QUY TẮC VÀNG: Tối đa 1 lá CHÉM mỗi lượt** (trừ khi có trang bị/kỹ năng đặc biệt).
5. **Giai đoạn Bỏ bài (Discard Phase):** 
   - Cuối pha ra bài, nếu số bài trên tay > số HP hiện tại, phải tự chọn và vứt bớt bài cho đến khi bằng số HP.
6. **Giai đoạn Kết thúc (End Phase):** 
   - Kích hoạt các kỹ năng có mô tả "Ở cuối lượt của bạn...".

---

## 2. Hệ Thống Phán Xét (Judgement)
- Mỗi lá bài trong game đều có **Chất** (♥️, ♦️, ♣️, ♠️) và **Số** (A đến K).
- Khi có yêu cầu Phán Xét (do bài Hỗn Loạn, Sấm Sét, hoặc Giáp Bát Quái, Kỹ năng Tướng), người chơi lật lá bài trên cùng của bộ bài chung.
- Chất và Số của lá bài đó sẽ quyết định kết quả thành công hay thất bại.
- *Ví dụ:* Giáp Bát Quái phán xét ra Đỏ (♥️ hoặc ♦️) thì tính là Né thành công.

---

## 3. Hệ Thống Tầm Đánh (Range System) - Cực Kỳ Quan Trọng!
- Người chơi ngồi thành vòng tròn.
- **Khoảng cách (Distance)** = số người ngồi giữa 2 người (chọn đường ngắn nhất) + 1.
  *Ví dụ:* A ngồi cạnh B → Khoảng cách là 1. A cách B một người (C) → Khoảng cách là 2.
- **Tầm đánh tay không** = 1 (chỉ có thể đánh người ngồi ngay cạnh trái/phải).
- Nếu muốn dùng lá CHÉM với người ở khoảng cách 2, bạn BẮT BUỘC phải có Vũ khí Tầm 2 trở lên, hoặc có Ngựa -1.

---

## 4. Cơ Chế Hấp Hối (Dying) & Cứu Mạng
- Khi HP bị trừ xuống **0 hoặc âm**, người chơi chưa chết ngay mà rơi vào trạng thái **Hấp Hối**.
- Bắt đầu từ chính người đó, vòng theo chiều kim đồng hồ, hệ thống sẽ hỏi **TẤT CẢ** mọi người: *"Có muốn dùng lá ĐÀO để cứu không?"*
- Nếu có người dùng Đào (hoặc chính người đó tự dùng Đào/Rượu), HP tăng lên. Khi HP > 0, thoát khỏi Hấp Hối.
- Nếu hỏi hết một vòng không ai cứu (hoặc số Đào không đủ kéo HP > 0) → **Tử Trận**.
- Khi Tử Trận: Vứt bỏ toàn bộ bài trên tay và trang bị. Kiểm tra xem game đã kết thúc chưa.

---

## 5. Chế Độ Quốc Chiến (Luật Cơ Bản)
Game áp dụng thể thức Quốc Chiến (National War).
- **Hệ (Affinity):** Không được định sẵn. Hệ của bạn dựa vào Tướng bạn chọn đầu game. Tướng thuộc hệ nào, bạn thuộc Hệ đó. (Có 4 Hệ: Lạc, Sơn, Hà, Việt).
- **Ẩn Tướng:** Đầu trận, toàn bộ người chơi đều bị úp Tướng (Tướng Ẩn). Bạn không biết hệ của đối phương.
- **Lật Tướng:** Một người chơi sẽ lộ diện danh tính thật (isRevealed = true) khi:
  - Bị mất máu (nhận sát thương).
  - Tự động dùng lá bài tấn công (VD: đánh lá [Chém]).
- **Chiến Thắng:** Trò chơi kết thúc khi trên bàn **chỉ còn những người sống sót thuộc cùng một Hệ**. (Tất cả những kẻ khác hệ đều chết).

---

## 6. Cơ Chế Dã Tâm (Careerist)
Đây là luật để cân bằng game, đề phòng trường hợp một hệ có quá đông thành viên.
- Nếu một người chơi **Lật Tướng**, và tính cả họ, số lượng người chơi **đã lật** của hệ đó vượt quá **N/2** (Một nửa tổng số người chơi ban đầu).
- Người này lập tức bị thoái hóa thành **🐺 Dã Tâm**. (Ví dụ: Game 4 người, 2 người hệ Lạc đã lật. Người thứ 3 hệ Lạc lật lên sẽ thành Dã Tâm).
- **Luật Thắng Dã Tâm:** Người chơi Dã Tâm không còn chung hệ với ai. Họ được xem như một thế lực Độc lập và chỉ chiến thắng khi **tự tay tiêu diệt toàn bộ người chơi khác trên bàn** (kể cả những Dã tâm khác).
