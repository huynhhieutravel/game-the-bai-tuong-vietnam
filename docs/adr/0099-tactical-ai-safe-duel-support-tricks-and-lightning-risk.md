# ADR 0099: Nâng Cấp Trí Tuệ Chiến Thuật Cẩm Nang Bot AI (Safe Duel, Support Tricks & Risk Management)

## 1. Trạng thái (Status)
**ĐÃ CHẤP NHẬN & TRIỂN KHAI (ACCEPTED & IMPLEMENTED)**

---

## 2. Bối cảnh & Vấn đề Cốt Lõi (Context & Problem Statement)
Người chơi tiếp tục phản ánh về các hành vi phi logic và tự sát của Bot AI:
> *"1- AI BOT vẫn còn tệ quá.*
> *Ví dụ đang không có lá chém nào trên bài, nhưng vẫn dùng Quyết Đấu. Nên ít ra có 1 lá bài Chém trên tay mới dùng.*
> *Hoặc đối thủ đang không có lá bài nào trên tay mới dùng.*
> *hoặc nâng cấp sao đó cho quy tắc AI phù hợp hơn nữa với các phần /grill-with-docs"*

Qua quy trình phỏng vấn `/grill-with-docs` (kết hợp `grilling` và `domain-modeling`), hệ thống phát hiện các lỗ hổng chiến thuật sau:
1. **Quyết Đấu Tự Sát (Suicidal Duel Issue)**:
   - Trong `BotBrain._decideTrickAction` và kỹ năng `Phá Thành` của Đô Đốc Bảo, Bot kiểm tra mục tiêu rồi tung ra ngay mà không đếm số lượng lá [Chém] dự trữ của bản thân.
   - Khi Bot có 0 lá Chém và đối thủ có bài trên tay: Đối thủ chỉ cần đáp 1 lá [Chém] là Bot mất 1 HP. Bot tự gây sát thương lên chính mình.
2. **Sắp Xếp Thứ Tự Giữa Quyết Đấu Và Chém Chưa Hợp Lý (Sequencing Flaw)**:
   - Khi có 1 lá Chém và 1 lá Quyết Đấu, Bot có thể lãng phí lá Chém duy nhất vào Quyết Đấu với đối thủ nhiều bài dẫn đến thua cuộc, thay vì giữ Chém để tấn công trực diện an toàn.
3. **Cắm Sấm Sét Thiếu Tính Toán (Blind Lightning Risk)**:
   - Bot cứ có lá [Sấm Sét] là cắm vào khu phán xét của bản thân, ngay cả khi đang hấp hối 1-2 HP và không có tướng can thiệp bài phán xét, dẫn tới nguy cơ nổ 3 sát thương tự sát ngớ ngẩn.
4. **Cướp Bài / Tước Bài Chưa Biết Cứu Viện Đồng Minh**:
   - Bot chỉ dùng Cướp/Tước bài lên kẻ địch. Khi đồng minh bị dán Sấm Sét, Hỗn Loạn hay Binh Lương, Bot không biết cách dùng Cướp/Tước bài để gỡ bùa hại cho đồng đội.
5. **Hỏa Công Chưa Tận Dụng Hiệu Ứng Xiềng Xích**:
   - Khi có kẻ địch bị Xiềng Xích (`chained: true`), Hỏa Công không được ưu tiên dồn vào mục tiêu này để gây phản ứng sát thương lửa dây chuyền.

---

## 3. Quyết định Kiến trúc & Giải pháp (Decisions & Solutions)

### 3.1. Giao thức Quyết Đấu An Toàn & Đòn Trừng Phạt (Safe Duel & Punish Protocol)
- Thêm helper tập trung `BotBrain.getAvailableSlashes(bot, excludeCardId)` và `getAvailableSlashCount(bot, excludeCardId)`:
  + Thống kê lá Chém thật trong tay.
  + Thống kê bài chuyển hóa thành Chém (kỹ năng `doi_nui` của Sơn Tinh, `khai_thien` của Thánh Gióng).
  + Tự động loại trừ lá bài đang dùng (ví dụ chính lá Quyết Đấu hoặc lá bài bỏ ra cho Phá Thành).
- **2 Quy tắc bắt buộc khi dùng Quyết Đấu**:
  1. **Đòn Trừng Phạt 100% (Guaranteed Punish)**: Nếu đối thủ có 0 lá bài trên tay (`targetHandCount === 0`) và không có kỹ năng miễn nhiễm/phản đòn, Bot được phép Quyết Đấu ngay cả khi Bot có 0 Chém vì chắc chắn gây 1 sát thương miễn phí.
  2. **Quyết Đấu An Toàn (Safe Duel Constraint)**: Nếu đối thủ có từ $\ge 1$ bài trên tay:
     - Bot **BẮT BUỘC** phải có ít nhất 1 nguồn Chém dự trữ (`availableSlashCount >= 1`).
     - Tuyệt đối **CẤM** Quyết Đấu khi Bot có 0 nguồn Chém.
     - Khi Bot chỉ có 1 Chém: Không đấu với kẻ địch có $\ge 2$ bài hoặc khi Bot đang hấp hối ($\le 1$ HP).

### 3.2. Trình Tự Tác Chiến Giữa Quyết Đấu Và Chém (Duel vs Slash Sequence)
- Khi Bot có cả Quyết Đấu và Chém:
  + Nếu có $\ge 2$ nguồn Chém: Quyết Đấu trước để tước Chém của đối thủ, sau đó dùng Chém tiếp theo để dồn sát thương cực đại.
  + Nếu chỉ có đúng 1 nguồn Chém và đối thủ có bài: Bot bỏ qua Quyết Đấu, chuyển sang đánh Chém trực diện an toàn (bị Né không mất máu). Giữ lá Quyết Đấu cho lượt sau hoặc đợi đối thủ hết bài.

### 3.3. Kiểm Soát Rủi Ro Đặt Sấm Sét (Self-Lightning Risk Management)
- Bot chỉ tự cắm [Sấm Sét] vào bản thân khi:
  1. Sinh lực còn dồi dào (`bot.hp >= 3`), HOẶC
  2. Có kỹ năng thay đổi phán xét (Nguyễn Bặc `hoan_dieu`, Lê Văn Duyệt `linh_giam`), HOẶC
  3. Phe ta đang bị dồn vào thế yếu tuyệt vọng (phe địch áp đảo quân số, cần tạo đột biến).
- Tuyệt đối không tự cắm Sấm Sét khi đang ít máu ($\le 2$ HP) trong điều kiện bình thường.

### 3.4. Cứu Viện Đồng Minh Với Cướp Bài & Tước Bài (Support Steal & Dismantle)
- Trong `BotBrain._decideTrickAction`:
  + Kiểm tra nếu có đồng minh (hoặc bản thân) đang có cẩm nang phán xét trong `judgementArea`, Bot ưu tiên nhắm vào đồng minh và chỉ định `targetCardId` là lá bùa hại đó để giải cứu.
- Trong `DispatcherV4.js`:
  + Chuyển tiếp `targetCardId: payload.targetCardId` vào `TrickRules.playDismantle` và `TrickRules.playSteal`.
- Trong `BotBrain.decideReaction` (`ASK_DISMANTLE` / `ASK_SNATCH`):
  + Nếu mục tiêu là đồng minh: Bóc bùa hại trong `judgementArea` trước tiên.
  + Nếu mục tiêu là kẻ địch: Bóc Giáp phòng thủ (Bát Quái Trận...) $\rightarrow$ Vũ khí $\rightarrow$ Ngựa thủ $\rightarrow$ Bài trên tay.

### 3.5. Tối Ưu Hóa Hỏa Công Với Mục Tiêu Xiềng Xích (Chained Fire Attack Synergy)
- Khi dùng [Hỏa Công] hoặc kỹ năng `Thần Hỏa`:
  + Bot yêu cầu có ít nhất 1 lá bài khác trên tay để sẵn sàng bỏ.
  + Ưu tiên lọc mục tiêu đang bị Xiềng Xích (`chained: true`) trước mục tiêu thường để kích hoạt chuỗi sát thương lửa dây chuyền.
  + Thêm $+15$ điểm đe dọa trong `calculateThreatScore` cho kẻ địch đang bị Xiềng Xích.

---

## 4. Kiểm Thử & Xác Nhận Chất Lượng (Verification & QA)
- Tạo test suite chuyên biệt: [BotBrainTacticalTricksAndSafeDuelQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/ai/BotBrainTacticalTricksAndSafeDuelQA.test.js):
  1. Bot 0 Chém và đối thủ có bài $\rightarrow$ Chặn đứng 100% Quyết Đấu (không tự sát).
  2. Bot 0 Chém nhưng đối thủ 0 bài $\rightarrow$ Kích hoạt Quyết Đấu trừng phạt.
  3. Bot 1 Chém và đối thủ 2 bài $\rightarrow$ Đánh Chém an toàn trước, giữ lại Quyết Đấu.
  4. Bot 2 Chém $\rightarrow$ Quyết Đấu ép bài đối thủ.
  5. Bot 2 HP $\rightarrow$ Không tự cắm Sấm Sét.
  6. Bot 3 HP $\rightarrow$ Tự cắm Sấm Sét an toàn.
  7. Đồng minh dính Sấm Sét $\rightarrow$ Bot dùng Tước Bài gỡ Sấm Sét cứu đồng minh.
  8. Hỏa Công $\rightarrow$ Ưu tiên nhắm vào mục tiêu bị Xiềng Xích.
- Toàn bộ 110 test files (942 tests) và build client đều PASS 100%.

---

## 5. Kết Luận & Tác Động (Consequences & Impact)
- Triệt tiêu hoàn toàn các pha xử lý ngớ ngẩn (tự Quyết Đấu khi không có Chém, tự cắm Sấm Sét tự sát).
- Bot AI biết tương trợ đồng minh, giải trừ bùa hại và phối hợp combo Xiềng Xích + Hỏa Công như những kỳ thủ cờ bàn thực thụ.
