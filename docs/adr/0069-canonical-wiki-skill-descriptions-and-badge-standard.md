# ADR 0069: Canonical Wiki Skill Descriptions SSOT and Vietnamese Skill Type Badges

## 1. Bối cảnh & Vấn đề (Context & Problems)
1. **Mô tả kỹ năng bị cắt ngắn trên bàn chơi:**
   - Khi người chơi mở Thẻ Tướng trên bàn chơi (hoặc trong Dossier/Draft Modal), một số kỹ năng hiển thị vắn tắt không đầy đủ (ví dụ: Cao Lỗ chỉ hiện một dòng tóm tắt ngắn về Nỏ Thần, làm mất các điều kiện: "Phạm vi công kích bằng điểm số lá bài", "Nếu số bài trên tay không ít hơn mục tiêu thì mục tiêu không thể Né", "Nếu HP không nhiều hơn mục tiêu thì sát thương +1").
   - **Nguyên nhân cốt lõi:** Trong `GameViewMapperV4.js` và `gameSetupV4.js`, chuỗi gán mô tả ưu tiên `skill.description || SkillDescriptions[skillId]...`. Khi lập trình viên viết logic hero trong `shared/engine_v4/heroes/`, họ thường ghi chú vắn tắt vào trường `description` của đối tượng skill. Logic `||` này vô tình khiến ghi chú vắn tắt của dev ghi đè và che khuất mô tả hoàn chỉnh chuẩn Wiki trong `SkillDescriptions.js`.
2. **Lo ngại thiếu sót kỹ năng tướng:**
   - Cần rà soát toàn diện xem có tướng nào bị thiếu kỹ năng so với Wiki (`shared/data/gameData.js`) và Game Design Document (`docs/02_Heroes_List.md`) hay không.
3. **Nhãn loại kỹ năng chưa được bản địa hóa:**
   - `skill.type` trong engine mang giá trị tiếng Anh (`lock`, `passive`, `active`, `limited`). Khi đưa lên UI, nhãn hiển thị trực tiếp chữ in hoa tiếng Anh (`LOCK`, `PASSIVE`, `ACTIVE`) thay vì ngôn ngữ game thẻ bài chuẩn (`TỎA ĐỊNH`, `BỊ ĐỘNG`, `CHỦ ĐỘNG`, `HẠN ĐỊNH`), và màu sắc badge chưa bao phủ đầy đủ `TỎA ĐỊNH` và `HẠN ĐỊNH`.

## 2. Giải pháp thực thi (Solutions)
1. **Khẳng định Single Source of Truth (SSOT):**
   - Wiki trong game (`HeroDetail.jsx`, `HeroList.jsx`) đọc trực tiếp 100% từ [shared/data/gameData.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/data/gameData.js).
   - [shared/data/SkillDescriptions.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/data/SkillDescriptions.js) lưu trữ đầy đủ 65 kỹ năng chuẩn hóa, khớp từng ký tự với Wiki/GDD.
   - Xử lý xung đột tên trùng: Hai tướng khác nhau có cùng tên kỹ năng "Hòa Thân" (Công chúa An Tư phe Hà và Huyền Trân Công Chúa phe Sơn) được định tuyến chính xác thông qua `skillId` (`hoa_than_an_tu` vs `hoa_than`).
2. **Đảo chiều ưu tiên giải quyết mô tả trong Engine & View Mapper:**
   - Trong [GameViewMapperV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/GameViewMapperV4.js) và [gameSetupV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/gameSetupV4.js): Ưu tiên `SkillDescriptions[skillId]` và `SkillDescriptions[realName]` lên trước `skill.description`.
   - Cập nhật [shared/engine_v4/heroes/lac/index.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/heroes/lac/index.js) để văn bản kỹ năng Nỏ Thần của Cao Lỗ trong code engine cũng là văn bản đầy đủ chuẩn Wiki.
3. **Chuẩn hóa Nhãn Loại Kỹ Năng Tiếng Việt (Skill Type Badge Standard):**
   - Trong `GameViewMapperV4.js`, tự động ánh xạ:
     - `lock` / `tỏa định` / `khóa` $\rightarrow$ `'TỎA ĐỊNH'`
     - `active` / `chủ động` $\rightarrow$ `'CHỦ ĐỘNG'`
     - `passive` / `reactive` / `bị động` $\rightarrow$ `'BỊ ĐỘNG'`
     - `limited` / `hạn định` $\rightarrow$ `'HẠN ĐỊNH'`
   - Trong [GameView.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/GameView.jsx): Gán màu badge chuẩn cho từng loại:
     - `'CHỦ ĐỘNG'`: `#3b82f6` (Xanh dương)
     - `'BỊ ĐỘNG'`: `#10b981` (Xanh lá)
     - `'TỎA ĐỊNH'` / `'KHÓA'`: `#ef4444` (Đỏ)
     - `'HẠN ĐỊNH'`: `#8b5cf6` (Tím)
4. **Cập nhật Bảng Thuật Ngữ [GLOSSARY.md](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/GLOSSARY.md):**
   - Bổ sung 2 định nghĩa trong Section 3: *Canonical Skill Description SSOT* và *Skill Type Badge Standard*.

## 3. Kiểm chứng (Verification)
- Kiểm tra toàn bộ 39 vị tướng trong engine: 38/39 tướng triển khai 100% kỹ năng, Tiên Dung triển khai cả 2 kỹ năng (Duyên Tiên + Tiên Duyên cự ly vô hạn). Các tướng có 1 kỹ năng (Cao Lỗ, Thần Trụ Trời, Phùng Hưng, Yết Kiêu...) đều khớp 100% với nguyên tác thẻ bài vật lý và GDD.
- Chạy toàn bộ 78 test suites (671 tests) với kết quả 100% Pass.
- Chạy kiểm thử giả lập 1,000 trận đấu headless stress test với `toViewModel` cho cả 4 người chơi trên 156,000+ bước chuyển đổi: 0 lỗi.
- Chạy `npm run cap:build` thành công.
