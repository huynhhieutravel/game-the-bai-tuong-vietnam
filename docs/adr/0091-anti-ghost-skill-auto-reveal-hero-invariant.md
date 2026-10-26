# ADR 0091: Anti-Ghost-Skill and Mandatory Auto-Reveal Hero Invariant

## 1. Context & Motivation
Người chơi báo cáo một lỗi nghiêm trọng về tính minh bạch và luật chơi trong ván đấu:
- Người chơi 4 đang trong trạng thái hoàn toàn ẩn (`[CHÍNH ẨN] [PHÓ ẨN]`).
- Người chơi 1 (Bạn) sử dụng Vạn Tiễn Tề Phát. Khi Người chơi 4 nhận sát thương, Người chơi 4 bỏ lá bài [Đào] để kích hoạt kỹ năng **[Hiền Hậu]** của Ngọc Hân Công Chúa.
- Kỹ năng [Hiền Hậu] ngăn toàn bộ sát thương cho Người chơi 4, đồng thời bắt Người chơi 1 mất 1 HP và thu lấy lá Đào.
- **Hành vi sai lệch:** Người chơi 1 bị trừ máu nhưng trên bàn chơi Người chơi 4 vẫn tiếp tục úp kín 2 tướng, không có bất kỳ thông tin nào cho biết tướng nào vừa ra chiêu, gây cảm giác "tự dưng bị mất máu lén lút" và vi phạm luật cơ bản của chế độ Quốc Chiến (Tam Quốc Sát / Việt Sát).

## 2. Root Cause Analysis
1. Trong `CombatRules.applyDamage`, engine kiểm tra khả năng phản kích của Hiền Hậu ngay cả khi tướng đang úp (`target.skills?.includes('hien_hau')`) và đẩy frame tương tác `ASK_HIEN_HAU` vào `priorityStack`.
2. Khi Người chơi 4 (Bot hoặc người chơi) chọn kích hoạt Hiền Hậu, nhánh `case 'ASK_HIEN_HAU'` trong `DispatcherV4.js` thực hiện trừ HP đối thủ và chuyển lá bài Đào, nhưng **quên gọi hàm `this.heroRegistry.revealPlayerHero`**.
3. Do `revealedHeroes: [false, false]`, `GameViewMapperV4` tiếp tục che giấu danh tính người chơi thành `CHÍNH ẨN / PHÓ ẨN` để bảo mật sương mù chiến tranh.
4. Điều này dẫn đến hiện tượng **"Tướng bóng ma" (Ghost Hero Skill)**: Dùng kỹ năng có sức ảnh hưởng trực tiếp đến trận đấu mà không bị lộ diện danh tính và phe phái.

## 3. Decision & Architecture: The Auto-Reveal Invariant
Thiết lập nguyên tắc bất biến chuẩn Quốc Chiến: **Mọi kỹ năng (chủ động trong lượt, chuyển hóa lá bài, hoặc phản hồi phòng ngự/phản kích) khi phát động BẮT BUỘC phải tự động MINH KHAI (lật mở mặt tướng) ngay lập tức**.

Triển khai tại `DispatcherV4.js`:
1. **Helper `_ensureHeroRevealedForSkill(player, skillId, skillDisplayName)`**:
   - Sử dụng `getHeroIndexForSkill(player, skillId)` để định vị tướng (Chính tướng = index 0, Phó tướng = index 1).
   - Nếu `!player.revealedHeroes[heroIdx]`, tự động gọi `this.heroRegistry.revealPlayerHero(this.state, player, heroIdx, skillDisplayName)`.
   - Cập nhật state `revealedHeroes[heroIdx] = true`, tính toán lại phe phái công khai (`player.revealedKingdom = hero.kingdom`), và phát thông báo hệ thống qua game log:
     `👁️ [Người chơi X] phát động kỹ năng [Tên Kỹ Năng], tự động hiển lộ chân dung [Tên Tướng] (Phe Y)!`
2. **Bảo vệ toàn diện mọi ngả đường phát động kỹ năng**:
   - Phản hồi sát thương: `case 'ASK_HIEN_HAU'` (Ngọc Hân Công Chúa).
   - Kỹ năng chủ động: `_handleSkill` (toàn bộ các tướng phát động kỹ năng khi đến lượt).
   - Chuyển hóa bài: `_handlePlayCard` khi `data.virtualCard` được khai triển từ các kỹ năng (`doi_nui`, `khai_thien`, `pha_thanh`, `ky_tap`, `hoa_than_an_tu`, `tien_duyen_chu_dong_tu`, `than_hoa`, v.v.).
   - Toàn bộ các frame phản hồi trong `_handleReact`:
     - `ASK_HAU_VIEN` (Hậu Viện)
     - `ASK_BOC_TRAM_TRUNG_DODGE` / `ASK_BOC_TRAM_TRUNG_SLASH` (Bách Trâm Trúng)
     - `ASK_TIEN_PHAT` (Tiên Phát)
     - `ASK_BANH_CHUNG` (Bánh Chưng)
     - `ASK_DUONG_QUAN_*` (Dưỡng Quân)
     - `ASK_DIEU_DUOC` (Điều Dược)
     - `ASK_HOA_THAN` (Hỏa Thần)
     - `ASK_CAN_QUYET` (Can Quyết)

## 4. Verification & QA Hardening
1. **[shared/engine_v4/__tests__/heroes/NgocHanCongChuaQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/heroes/NgocHanCongChuaQA.test.js)**:
   - Thêm test case xác nhận khi Ngọc Hân Công Chúa đang úp `[false, false]` nhận sát thương và kích hoạt Hiền Hậu:
     - `p2.revealedHeroes[0]` lập tức thành `true`.
     - `p2.revealedKingdom` cập nhật chuẩn `'Hà'`.
     - Toàn bộ 5/5 test cases của Ngọc Hân Công Chúa PASS.
2. **[shared/engine_v4/__tests__/application/AutoRevealOnSkillTriggerQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/application/AutoRevealOnSkillTriggerQA.test.js)**:
   - Xây dựng 3 kịch bản QA bất biến độc lập:
     - Kịch bản 1: Kích hoạt Hiền Hậu (phản đòn) khi tướng đang úp -> tự động mở tướng và hiện phe Hà.
     - Kịch bản 2: Dùng kỹ năng chuyển hóa bài Dời Núi (Sơn Tinh) khi đang úp -> tự động mở tướng và hiện phe Lạc.
     - Kịch bản 3: Kích hoạt kỹ năng chủ động Lặn Sâu (Yết Kiêu) khi đang úp -> tự động mở tướng.
   - Toàn bộ 3/3 test cases PASS.
3. **Regression Testing**:
   - `npx vitest run shared/engine_v4/`: 81/81 test files (689/689 tests) PASS 100%.
   - `npx vitest run client/src/components/`: 21/21 test files (213/213 tests) PASS 100%.
   - Production bundle build: Vite build thành công trong 591ms.
