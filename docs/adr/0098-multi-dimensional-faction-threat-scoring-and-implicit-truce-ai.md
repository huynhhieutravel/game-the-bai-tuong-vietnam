# ADR 0098: Hệ Thống Chấm Điểm Đe Dọa Đa Chiều & Liên Minh Ngầm Chống Phe Áp Đảo (Faction Threat Scoring & Implicit Truce AI)

## 1. Trạng thái (Status)
**ĐÃ CHẤP NHẬN & TRIỂN KHAI (ACCEPTED & IMPLEMENTED)**

---

## 2. Bối cảnh & Vấn đề Cốt Lõi (Context & Problem Statement)
Người chơi phản ánh về hành vi vô lý của Bot AI trong trận đấu thể thức Quốc Chiến:
> *"AI Bot quá tệ, ví dụ có 3 phe trên bàn.*
> *Phe A là tôi (Phe Lạc - 1 người)*
> *Phe B là bot 2 (Phe Việt - 1 người)*
> *Phe C là bot 3 và 4 (Phe Hà - 2 người, có Phó Ấn)*
> *Vậy nó phải cố gắng tạm hòa hoãn với tôi và đánh phe C chứ?*
> *Sao giờ cứ dồn đánh tôi? Bot AI tệ thế? Nâng cấp lại đi /grill-with-docs"*

### Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis):
1. **Thiếu Ý Thức Cán Cân Quân Số Phe Phái (Blind to Faction Power Balance)**:
   - Logic cũ trong `BotBrain.js` hoàn toàn không có cơ chế đếm số thành viên còn sống theo từng phe.
   - Bot không phân biệt được đối thủ thuộc phe chiếm đa số áp đảo bàn cờ ($\ge 2$ thành viên) hay thuộc phe thiểu số đơn độc (1 thành viên).
2. **Lỗi Sắp Xếp Mục Tiêu Thô Sơ & Thiên Vị Người Chơi Chính (`Player 0`)**:
   - `BotBrain._sortTargetsByPriority` chỉ dùng: `knownEnemies.sort((a, b) => a.hp - b.hp)`.
   - Khi Bạn (Player 0, 3 HP), Bot 3 (3 HP), Bot 4 (3 HP) đều có cùng lượng máu, hàm `sort()` của JavaScript giữ nguyên thứ tự ban đầu của mảng.
   - Vì Bạn là Player 0 (`mainPlayerId = 0`), Bạn luôn luôn đứng đầu mảng `validTargets` $\rightarrow$ Bot 2 luôn luôn chọn Bạn làm mục tiêu số 1 để đánh [Chém] và [Cẩm Nang], bất chấp Phe Hà có 2 người đang chiếm ưu thế tuyệt đối!
3. **Thiếu Khái Niệm Liên Minh Ngầm (Absence of Implicit Truce)**:
   - Trong thể thức Quốc Chiến của Tam Quốc Sát, khi một phe lộ diện đông quân số, các phe đơn độc buộc phải tạm ngưng bắn nhau để tập trung kiềm chế phe áp đảo, nếu không phe áp đảo sẽ nghiền nát tất cả.

---

## 3. Quyết định Kiến trúc & Giải pháp (Decisions & Solutions)

### 3.1. Nhận Diện Phe Áp Đảo (Dominant Faction Detection)
- Trong `BotBrain.calculateThreatScore(bot, target, state)`:
  + Quét danh sách người chơi còn sống (`state.getAlivePlayers()`).
  + Đếm số thành viên đã lộ diện theo từng phe (loại trừ `isDaTam`).
  + Xác định phe dẫn đầu quân số: nếu `maxFactionSize >= 2`, phe đó trở thành `dominantFaction`.

### 3.2. Giao Thức Liên Minh Ngầm Chống Phe Áp Đảo (Anti-Dominant Faction Implicit Truce)
- Khi trên bàn cờ tồn tại `dominantFaction`:
  + **Mục tiêu thuộc Phe Áp Đảo**: Nhận điểm đe dọa cực cao:
    $$\text{Bonus} = +100 + (\text{targetFactionSize} \times 25)$$
  + **Mục tiêu thuộc Phe Thiểu Số Đơn Độc** (khi Bot cũng thuộc phe thiểu số đơn độc):
    - Tự động kích hoạt **Liên Minh Ngầm (Implicit Truce)**:
    - Áp dụng hình phạt **-80 điểm đe dọa** nếu mục tiêu còn nhiều máu (`target.hp > 1`).
    - **Ngoại lệ dứt điểm**: Nếu mục tiêu phe thiểu số chỉ còn 1 HP hấp hối, hình phạt -80 được dỡ bỏ và áp dụng thưởng dứt điểm (+50 điểm) để dọn bàn nếu thuận tiện.

### 3.3. Ma Trận Chấm Điểm Đe Dọa Đa Chiều (Multi-Dimensional Threat Matrix)
Thay thế hoàn toàn cơ chế sort `a.hp - b.hp` cũ bằng ma trận tính toán 6 chiều:
1. **Thế lực Quốc Chiến**:
   + Phe Áp Đảo: $+100 + \text{size} \times 25$.
   + Phe yếu thế tạm hòa hoãn: $-80$ (khi HP > 1).
   + Đã lộ diện bình thường: $+30$.
2. **Chức vị & Thưởng Cắm Cờ**:
   + Chúa công (`isLord`) hoặc sở hữu Phó Ấn (`hasViceSeal` / `isViceGeneral`): $+25$.
3. **Ngưỡng Máu Dứt Điểm (Finishing Opportunism)**:
   + HP = 1: $+50$.
   + HP = 2: $+20$.
   + HP $\ge$ 4: $-10$.
4. **Tài Nguyên Bài Trên Tay**:
   + Mỗi lá bài trên tay mục tiêu: $+4$ điểm/lá.
5. **Năng Lực Tác Chiến & Trang Bị**:
   + Trang bị Vũ khí: $+12$.
   + Trang bị Ngựa công: $+8$.
   + Trang bị Áo giáp phòng thủ: $-8$.
6. **Khoảng Cách Cự Ly**:
   + Trừ 6 điểm cho mỗi khoảng cách: $- \text{dist} \times 6$.

### 3.4. Thống Nhất Định Tuyến Cẩm Nang & Kỹ Năng Chủ Động
- Toàn bộ cẩm nang đơn mục tiêu (`Quyết Đấu`, `Cướp Bài`, `Tước Bài`, `Hỏa Công`, `Hỗn Loạn`, `Mượn Đao`) và kỹ năng chọn mục tiêu (`Hòa Thân`, `Tâm Công`, `Vân Đồn`, `Tiên Duyên`, `Hiền Hậu`) đều sử dụng chung `_sortTargetsByPriority(bot, candidates, state)`.
- Đảm bảo Bot không bao giờ "Chém phe Hà nhưng lại dùng Cướp bài / Quyết đấu lên Bạn".

### 3.5. Giao Thức Tướng Dã Tâm (Careerist / Lone Wolf Protocol)
- Kể cả khi Bot là Tướng Dã Tâm (`isDaTam = true`), Bot vẫn tuân thủ nguyên tắc cân bằng thế lực:
  + Dã Tâm nhận biết Phe Hà đang có 2 người áp đảo, do đó vẫn tập trung diệt Phe Hà trước để đưa trận đấu về thế cờ tàn solo 1v1.

---

## 4. Kiểm Thử & Xác Nhận Chất Lượng (Verification & QA)
- Đã tạo test suite chuyên biệt: [FactionThreatAndImplicitTruceQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/ai/FactionThreatAndImplicitTruceQA.test.js):
  1. **Tái hiện chuẩn 100% tình huống thực tế của User**: P0 Bạn (Lạc, 3 HP), P1 Bot 2 (Việt, 3 HP có vũ khí Tầm 3), P2 Bot 3 (Hà, 3 HP), P3 Bot 4 (Hà, 3 HP có Phó Ấn).
     - Kết quả: Bot 2 chỉ nhắm vào P2 hoặc P3 (Phe Hà), **tuyệt đối KHÔNG nhắm vào Bạn (P0)**!
  2. **Cẩm nang đơn mục tiêu**: Quyết Đấu, Cướp Bài, Tước Bài đều chuyển hướng sang Phe Hà.
  3. **Ngoại lệ dứt điểm khi HP = 1**: Hoạt động chính xác.
  4. **Phá vỡ thế áp đảo (1v1v1)**: Khi Phe Hà chỉ còn 1 người, gỡ bỏ liên minh ngầm và trở về tính điểm đe dọa thông thường.
  5. **Tướng Dã Tâm (Lone Wolf)**: Bot Dã Tâm vẫn ưu tiên diệt Phe Áp Đảo trước.
- Toàn bộ 109 test files (934 tests) và build client đều PASS 100%.

---

## 5. Kết Luận & Tác Động (Consequences & Impact)
- Trí tuệ Bot AI được nâng cấp vượt bậc, loại bỏ triệt để hành vi "đánh ngốc nghếch dồn người chơi" thiếu logic.
- Trải nghiệm Quốc Chiến chân thực, sâu sắc, phản ánh đúng tính chiến thuật liên minh và đấu trí giữa các thế lực.
