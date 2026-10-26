# ADR 0100: Chuẩn Hóa Kỹ Năng Bọc Trăm Trứng (Chỉ Dành Cho [Chém] - Triệt Tiêu Nhánh Né Giùm)

## 1. Bối cảnh & Vấn đề (Context & Problem)
- Trong Tam Quốc Sát / Việt Sát:
  - **Lạc Long Quân (Bọc Trăm Trứng - Phe Lạc)**: Tương ứng với kỹ năng **Kích Tướng** của Lưu Bị (Thục). Kỹ năng Chúa công này **CHỈ** được dùng cho lá **[CHÉM]** (chủ động gọi đồng minh Lạc Chém kẻ địch trong tầm, hoặc bị động gọi đồng minh Lạc Chém thay khi gặp Quyết Đấu, Dã Man Xâm Nhập, Mượn Đao Diệt Địch).
  - **Lý Thường Kiệt (Tiên Phát - Phe Việt)**: Mới là kỹ năng tương ứng với **Hộ Giá** của Tào Tháo (Ngụy), dùng cho lá **[NÉ]** (kêu gọi đồng minh Việt Né đỡ đòn giùm).
- **Vấn đề phát sinh:**
  - Codebase trước đây từng gộp nhầm cơ chế Né giùm vào Lạc Long Quân:
    - Trong `DodgeModal.jsx`, khi Lạc Long Quân bị Chém hoặc chịu Loạn Tiễn, giao diện hiển thị nút `🐉 Kích Hoạt Bọc Trăm Trứng`.
    - Khi bấm, client gửi `{ callBocTramTrung: true }` vào `CombatRules.respondDodge`, đẩy frame `ASK_BOC_TRAM_TRUNG_DODGE` hỏi đồng minh Lạc Né giùm.
  - Điều này hoàn toàn sai lệch với thiết kế chuẩn của thẻ bài và làm biến chất kỹ năng Chúa công phe Lạc, gây nhầm lẫn với Tiên Phát của Lý Thường Kiệt.

---

## 2. Quyết định Kiến trúc (Architectural Decision)
1. **Triệt tiêu toàn bộ nhánh Né giùm của Bọc Trăm Trứng:**
   - **Giao diện Client (`DodgeModal.jsx` & `ModalContainer.jsx`):**
     - Xóa bỏ nút `🐉 Kích Hoạt Bọc Trăm Trứng` khỏi `DodgeModal.jsx`. Khi Lạc Long Quân bị Chém, Lạc Long Quân phải tự sử dụng lá Né của chính mình (hoặc nhận sát thương/quay Bát Quái).
     - Gỡ bỏ import và nhánh render `ask_boc_tram_trung_dodge` trong `ModalContainer.jsx`.
   - **Quy tắc Chiến đấu Engine (`CombatRules.js` & `DispatcherV4.js`):**
     - Xóa bỏ hoàn toàn nhánh `if (options.callBocTramTrung)` trong `CombatRules.respondDodge`.
     - Xóa method `CombatRules.respondBocTramTrungDodge`.
     - Xóa case `ASK_BOC_TRAM_TRUNG_DODGE` trong `DispatcherV4.js`.
   - **View Mapper & Bot Brain (`GameViewMapperV4.js` & `BotBrain.js`):**
     - Xóa frame mapping `ASK_BOC_TRAM_TRUNG_DODGE -> ask_boc_tram_trung_dodge`.
     - Xóa case xử lý `ASK_BOC_TRAM_TRUNG_DODGE` trong trí tuệ nhân tạo `BotBrain.js`.
   - **Simulation (`HeadlessRunner.js` & `run_1000_matches.mjs`):**
     - Xóa bỏ kiểm tra `ASK_BOC_TRAM_TRUNG_DODGE`.

2. **Bảo tồn 100% chức năng Bọc Trăm Trứng cho lá [Chém]:**
   - **Chủ động trong lượt (`ACTION_USE_SKILL` -> `boc_tram_trung`):**
     - Lạc Long Quân chọn 1 kẻ địch trong tầm đánh, đẩy frame `ASK_BOC_TRAM_TRUNG_SLASH` hỏi đồng minh Lạc Chém giùm. Nếu có đồng minh Chém, đòn Chém tính vào số lần Chém trong lượt của Lạc Long Quân (`turnStats.slashCount++`). Nếu đồng minh từ chối, Lạc Long Quân không mất lượt Chém tự thân.
   - **Bị động phòng thủ khi cần [Chém] (`TrickRules.respondDuel`, `TrickRules.respondSlashResponse`):**
     - Trong Quyết Đấu hoặc Dã Man Xâm Nhập, Lạc Long Quân được quyền gửi `{ callBocTramTrung: true }` để gọi đồng minh Lạc Chém giùm qua `ASK_BOC_TRAM_TRUNG_SLASH`.

3. **Cập nhật hệ thống QA & Tài liệu:**
   - Cập nhật mô tả kỹ năng `boc_tram_trung` trong `shared/engine_v4/heroes/lac/index.js` (loại bỏ `(hoặc Né)`).
   - Cập nhật toàn bộ các bài unit test liên quan (`LacLongQuanQA.test.js`, `NationalWarLordSkillsAndJudgement.test.js`, `BotBrainTacticalQA.test.js`, `ViewModelContractGuard.test.js`, `UXUIRecentFeaturesQA.test.jsx`, `RevealRewardsQA.test.js`).
   - Cập nhật `GLOSSARY.md` mục 14 và 28.

---

## 3. Hệ quả & Kết quả Kiểm định (Consequences & Validation)
- **Chuẩn hóa Luật Game:** Phân định rạch ròi 100% giữa **Lạc Long Quân (Bọc Trăm Trứng - Chém)** và **Lý Thường Kiệt (Tiên Phát - Né)**.
- **Loại bỏ Hoàn toàn Bug UI:** Người chơi khi cầm Lạc Long Quân bị Chém sẽ không bao giờ thấy nút Bọc Trăm Trứng xuất hiện trong cửa sổ Né nữa.
- **Chất lượng Kiểm định:**
  - Toàn bộ 110/110 file test pass hoàn toàn (940/940 tests passed).
  - Client build thành công 0 lỗi.
