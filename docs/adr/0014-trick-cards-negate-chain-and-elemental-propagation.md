# ADR 0014: Hệ Thống Cẩm Nang, Chuỗi Hóa Giải Đơn Thể & Truyền Sát Thương Xiềng Xích

## Trạng thái
Đã chấp thuận (Accepted) — Đã đồng thuận qua phiên `/grill-with-docs`.

## Bối cảnh (Context)
Trong hệ thống thẻ bài Việt Sát v4, nhóm **Thẻ Bài Cẩm Nang (Trick Cards)** gồm 11 loại chiến thuật (35 lá bài trong bộ bài chuẩn 106 lá). Để chuẩn hóa toàn diện từ v3 sang v4 và bảo đảm tính cân bằng logic chuẩn Tam Quốc Sát:
1. **Chuỗi Hóa Giải (Negate Chain)**: Cần làm rõ phạm vi áp dụng của lá bài [Hóa Giải]. Nếu cho phép Hóa Giải thông thường hủy cả một cẩm nang toàn bàn (như Loạn Tiễn, Dã Man) thì quá mạnh và phá vỡ cấu trúc luật (chỉ có lá Hóa Giải Vương / Vô Giải Vương mới có quyền năng hủy toàn bàn).
2. **Cẩm nang Trì hoãn Binh Lương Thốn Đoạn (Starvation)**: Bộ bài chuẩn 106 lá hiện giữ nguyên 2 loại cẩm nang trì hoãn thực tế là Sấm Sét và Hỗn Loạn. Tuy nhiên, Engine cần có logic sẵn sàng 100% để xử lý Binh Lương Thốn Đoạn khi các Tướng biến đổi bài hoặc các bản mở rộng đưa vào.
3. **Xiềng Xích & Sát thương Nguyên tố (Elemental Propagation)**: Cơ chế Hỏa Công, Sấm Sét tương tác với trạng thái Xích đòi hỏi xử lý nguyên tử: truyền sát thương, tháo xích đồng loạt, và kích hoạt độc lập trang bị phòng thủ (Bạch Ngân).
4. **Mượn Đao Giết Người (Borrow Sword)**: Phân định rạch ròi giữa cú Chém chủ động trong lượt và cú Chém thụ động do bị cẩm nang ép buộc.
5. **Quyết Đấu (Duel)**: Bảo đảm bất biến sát thương cơ bản và không bị lạm dụng bởi cờ Rượu.

## Quyết định Thiết kế (Decisions)

### 1. Nguyên Tắc Hóa Giải Đơn Thể (Single-target Negation Only)
- Lá [Hóa Giải] thông thường **CHỈ CÓ THỂ HÓA GIẢI ĐƠN THỂ**:
  - Với cẩm nang đơn mục tiêu (`Quyết Đấu`, `Cướp Bài`, `Tước Bài`, `Mượn Đao`, `Hỏa Công`): Hóa Giải bảo vệ mục tiêu duy nhất của lá bài.
  - Với cẩm nang toàn bàn (`Loạn Tiễn`, `Dã Man`, `Hồi Xuân`): **Không có cửa sổ hủy toàn bàn**. Cẩm nang được kích hoạt lập tức; khi hiệu ứng giải quyết đến từng cá nhân mục tiêu, mục tiêu đó (hoặc đồng minh) có quyền sử dụng [Hóa Giải] để vô hiệu hóa tác động cho **riêng cá nhân mục tiêu đó**.
  - Với cẩm nang trì hoãn (`Sấm Sét`, `Hỗn Loạn`, `Binh Lương Thốn Đoạn`): Hóa Giải trong Pha Phán xét hủy bỏ cẩm nang đang xét của cá nhân đó.

### 2. Tích Hợp Binh Lương Thốn Đoạn Vào Engine v4
- Định nghĩa đầy đủ trong `TrickRules.js`, `TargetResolverV4.js` và `StateMachine.js`:
  - Đặt vào khu phán xét của mục tiêu có khoảng cách $\le 1$.
  - Pha Phán xét: Lật 1 lá bài từ drawPile. Nếu là chất Nhép (♣) $\rightarrow$ thoát nạn; nếu là bất kỳ chất nào khác $\rightarrow$ gán `skipDrawPhase = true` (bỏ qua Pha Rút bài).

### 3. Truyền Sát Thương Xiềng Xích & Tháo Xích Nguyên Tử
- Khi nhận sát thương nguyên tố (`fire`, `lightning`), nếu nạn nhân đang bị Xích (`isChained = true`):
  - Tự động tháo xích cho nạn nhân (`isChained = false`).
  - Truyền nguyên vẹn lượng sát thương sang toàn bộ người chơi khác đang bị Xích theo chuỗi đệ quy an toàn.
  - Mỗi nạn nhân trong chuỗi đều được tháo xích và kích hoạt độc lập hiệu ứng giảm thương của trang bị cá nhân (ví dụ: giáp Bạch Ngân giảm mọi sát thương dồn xuống 1).

### 4. Cú Chém Ép Buộc Từ Mượn Đao (Passive Forced Slash)
- Cú Chém do Mượn Đao ép buộc được gắn cờ `isRedirected: true`.
- Cú Chém này **không tiêu tốn và không bị giới hạn** bởi hạn mức 1 Chém/lượt của người bị ép (kể cả khi họ đã Chém trong lượt hoặc lúc đó đang là lượt của người khác).

### 5. Bất Biến Sát Thương Quyết Đấu (Duel Non-wine Invariant)
- Sát thương Quyết Đấu gây ra cho bên thua cuộc là 1 điểm sát thương thuộc tính `duel`.
- Cờ [Rượu] (`wineActive`) tuyệt đối không tăng sát thương cho Quyết Đấu và không bị tiêu hao bởi Quyết Đấu.

## Hệ Quả (Consequences)
- Đóng đinh và thống nhất 100% ngữ nghĩa của Cẩm Nang giữa Engine, Bot AI và Giao diện người dùng (UI).
- Đảm bảo độ sâu chiến thuật cao nhất của Tam Quốc Sát: người chơi có thể giữ Hóa Giải để cứu đồng minh trong Loạn Tiễn hoặc Dã Man một cách chuẩn xác.
- Duy trì 0 lỗi Invariant trên toàn bộ hệ thống kiểm thử Vitest và bộ đại giả lập 1.000 trận đấu.
