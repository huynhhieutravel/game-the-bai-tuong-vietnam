# ADR 0104: Nâng Cấp Chính Sách Lật Tướng Chiến Thuật Cho Bot AI (Intelligent Bot Hero Reveal Policy)

## 1. Bối cảnh & Hiện tượng (Context & Problem)
- **Hiện tượng:** Người chơi báo cáo Bot (Người chơi 3) trong trận đấu không chịu mở tướng, để nguyên trạng thái `[CHÍNH ẨN]` và `[PHÓ ẨN]` suốt nhiều vòng đấu cho đến tận lúc người chơi khác tử trận, mặc dù Bot đã trang bị vũ khí, cầm nhiều bài và tham gia đánh bài.
- **Nguyên nhân cốt lõi trong code cũ:**
  - Trong `_decideHeroReveal` (`BotBrain.js`), Bot chỉ có 2 điều kiện lật Tướng Chính:
    1. Cắm cờ Tiên Phong đầu ván đấu (`!state.hasPioneerRewardClaimed`).
    2. Sở hữu kỹ năng chủ động bấm nút trong danh sách 29 kỹ năng fix cứng (`activeSkillIds`).
  - Khi Bot sở hữu các vị tướng thiên về Bị động, Phản ứng, Tỏa định, hoặc Tấn công thường (như *Hai Bà Trưng, Ngô Quyền, Trần Hưng Đạo, Phùng Hưng, Triệu Quang Phục, Lý Nam Đế, Bà Triệu, Yết Kiêu...*), và lượt cắm cờ Tiên Phong đã bị người khác lấy trước:
    $\rightarrow$ Cả 2 điều kiện đều `false`.
    $\rightarrow$ Bot không bao giờ lật Tướng Chính.
    $\rightarrow$ Do Tướng Chính chưa lật, Phó Tướng cũng vĩnh viễn không được lật.
    $\rightarrow$ Bot "núp lùm" suốt cả trận đấu, gây mất tự nhiên và làm hỏng trải nghiệm Quốc Chiến.

## 2. Quyết định Kiến trúc & Chiến thuật (Architecture & Tactical Decisions)

Nâng cấp hàm `_decideHeroReveal(state, bot)` trong [`BotBrain.js`](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/ai/BotBrain.js) thành hệ thống quyết định lật tướng đa chiều:

### A. Lật Tướng Chính (Slot 0):
1. **Tiên Phong Cắm Cờ:** Lật đầu tiên nhận 2 lá bài thưởng (giữ nguyên).
2. **Hội Quân Đồng Minh (Ally Reunion):** Khi trên bàn cờ có người cùng phe với Bot đã lộ diện (`isSameFaction(bot, p)` và `p.revealedHeroes?.some(Boolean)`):
   - Bot lập tức lật Tướng Chính để hội quân, ngăn chặn nguy cơ đồng minh đánh nhầm (Friendly Fire) và mở khóa các kỹ năng phối hợp phe.
3. **Mở Khóa Kỹ Năng Toàn Diện:** Kiểm tra bất kỳ kỹ năng nào của Tướng Chính hoặc Phó Tướng thay vì danh sách 29 skill cố định cũ.
4. **Sẵn Sàng Tấn Công (Combat Aggression):** Nếu Bot có lá [Chém] hoặc Cẩm nang công kích ([Quyết Đấu], [Hỏa Công], [Nam Man], [Vạn Tiễn], [Cướp Bài], [Tước Bài]) trong tay $\rightarrow$ lật Tướng Chính xuất kích.
5. **Sẵn Sàng Tham Chiến (Battle-Ready from Turn 2+):** Từ Vòng 2 trở đi hoặc khi đã lắp vũ khí trang bị / bài tay $\ge 3$ lá $\rightarrow$ tự giác lật Tướng Chính tham chiến.
6. **Ẩn Thân Chiến Thuật (Strategic Stealth Underdog):** Bot chỉ giữ ẩn Tướng Chính nếu đang rất yếu máu (HP $\le 2$) và phe địch đang áp đảo ($\ge 2$ kẻ địch đã lộ mặt) mà chưa thấy đồng minh đâu.

### B. Lật Phó Tướng (Slot 1) khi Tướng Chính đã lật:
1. **Thưởng Âm Dương Giao Hòa (Yin-Yang Harmony Bonus):** Nếu tổng máu gốc của 2 tướng là số lẻ (`(h1.hp + h2.hp) % 2 !== 0`) và chưa nhận thưởng $\rightarrow$ lật Phó Tướng ngay để rút 1 lá bài thưởng!
2. **Kích Hoạt Kỹ Năng Phó Tướng:** Lật Phó Tướng để kích hoạt toàn bộ kỹ năng của vị tướng thứ hai.
3. **Tham Chiến Toàn Lực:** Tự động lật Phó Tướng khi bước vào giai đoạn chiến đấu cao trào từ Round 2 trở đi hoặc khi máu giảm.

## 3. Kiểm định (Verification)
- Bổ sung 3 test cases trong [`BotBrainTacticalQA.test.js`](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/ai/BotBrainTacticalQA.test.js):
  - Test 3.4: Hội quân đồng minh (tự động lật khi thấy đồng minh cùng phe).
  - Test 3.5: Sẵn sàng tham chiến (lật khi có vũ khí / từ lượt 2).
  - Test 3.6: Âm Dương Giao Hòa (lật phó tướng nhận +1 bài thưởng khi tổng máu lẻ).
- 110/110 test files (951/951 tests) pass 100%.
- Client build Vite thành công không lỗi.
