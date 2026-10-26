# ADR 0076: Rà Soát Toàn Diện 39 Vị Tướng, Đồng Bộ Định Danh Kỹ Năng & Hoàn Thiện Danh Mục Tỏa Định Kỹ (Comprehensive 39 Heroes Grill, Disambiguation Aliases & Lock Skill Normalization)

## Bối Cảnh (Context)
Theo yêu cầu kiểm thử chất lượng toàn diện (`/grill-with-docs` & `/goal`) trên toàn bộ 39 vị tướng thuộc 4 phe (Lạc, Việt, Hà, Sơn) trong dự án Việt Sát v4, hệ thống đã tiến hành đợt rà soát chuyên sâu theo 6 khu vực bắt buộc của quy chuẩn SOP `QA Hero Việt Sát`:
1. Khu vực Cấu hình & Dữ liệu (Registry Data)
2. Khu vực Logic Kỹ Năng Cốt Lõi (Skill Handlers)
3. Khu vực Luồng Sự Kiện (Dispatcher & Event Hooks)
4. Khu vực UI / Client (Frontend & Modals)
5. Khu vực Trí Tuệ Nhân Tạo (AI / BotBrain & BotRunner)
6. Khu vực Edge Cases & Unit Tests

### Hai Lỗ Hổng Tiềm Ẩn Được Khám Phá:
1. **Lỗ Hổng Thiếu Sót Danh Mục Tỏa Định Kỹ (`isLockSkill`):**
   Trong [HeroRegistry.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/heroes/HeroRegistry.js), hàm `isLockSkill` ban đầu chỉ bọc 7 kỹ năng (`thiet_ma`, `no_than_cao_lo`, `tien_duyen_khoang_cach`, `dam_bac`, `than_giap`, `ho_gia`, `quoc_sac`). Hàng loạt kỹ năng mang bản chất Tỏa Định Kỹ (`type: 'lock'`) của các tướng khác bị bỏ sót:
   - `nghe_an_ke` (Nguyễn Chích - Nghệ An Kế)
   - `nhiep_chinh` / `nhiep_chinh_to_hien_thanh` (Tô Hiến Thành - Nhiếp Chính)
   - `ho_chu` (Nguyễn Địa Lô - Hộ Chủ)
   - `uy_chan` (Đinh Bộ Lĩnh - Uy Chấn)
   - `khai_quoc` (Nguyễn Bặc - Khai Quốc)
   - `pha_quan_nguyen_xi` / `pha_quan` (Nguyễn Xí - Phá Quân)

   *Hậu quả thực tế:* Khi tướng chịu hiệu ứng khống chế của *Tre Ngà* (Thánh Gióng: `player.temporaryFlags.skillsSuppressed = true`) hoặc khi Lê Ngân còn 1 HP (*Hộ Giá*), quy tắc bảo vệ Tỏa Định Kỹ `!this.isLockSkill(skillId)` bị vô hiệu hóa nhầm lẫn đối với các tướng trên, làm mất đi các hiệu ứng bất biến cốt lõi của nhân vật.

2. **Lỗ Hổng Đứt Gãy Do Định Danh Phân Biệt (Disambiguation ID Desync):**
   Trong các file khai báo tướng (ví dụ: `lac/index.js`, `son/index.js`, `viet/index.js`), một số kỹ năng được đặt ID mở rộng kèm tên tướng để tránh xung đột (như `no_than_cao_lo`, `pha_quan_nguyen_xi`, `phat_toi_dinh_dien`, `tien_phong_nguyen_lu`, `hoa_than_huyen_tran`), trong khi `gameData.js`, ViewModel và các tương tác UI lại truyền vào ID rút gọn (`no-than`, `pha-quan`, `phat-toi`, `tien-phong`, `hoa-than`).
   
   *Hậu quả thực tế:* `hasSkill(player, 'no-than')` trả về `false` dù người chơi đang điều khiển Cao Lỗ.

---

## Quyết Định Thiết Kế (Decision)

### 1. Đồng Bộ Bảng Ánh Xạ Biến Thể Kỹ Năng ([translationHelper.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/utils/translationHelper.js))
Bổ sung đầy đủ tất cả các bí danh phân biệt vào `CANONICAL_SKILL_NAME_TO_ID`:
- `no than cao lo` $\rightarrow$ `no_than`
- `pha quan nguyen xi` $\rightarrow$ `pha_quan`
- `phat toi dinh dien` $\rightarrow$ `phat_toi`
- `tien phong nguyen lu` $\rightarrow$ `tien_phong`
- `hoa than huyen tran` $\rightarrow$ `hoa_than`
- `tien duyen chu dong tu`, `tien duyen active` $\rightarrow$ `tien_duyen`
- `tien duyen passive`, `tien duyen khoang cach` $\rightarrow$ `tien_duyen_khoang_cach`
- `nhiep chinh to hien thanh` $\rightarrow$ `nhiep_chinh`

Nhờ đó, `normalizeSkillId(x)` luôn chuyển đổi nhất quán mọi biến thể về định danh chuẩn.

### 2. Nâng Cấp Bộ Soi Kỹ Năng Đa Tầng ([HeroRegistry.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/heroes/HeroRegistry.js))
- Trong `hasSkill(player, skillId, requireRevealed)` và `getHeroIndexForSkill(player, skillId)`:
  Sử dụng hàm đối soát linh hoạt:
  ```javascript
  const canonical = normalizeSkillId(skillId);
  const matchSkill = s => {
    const sid = s.id || s;
    return sid === skillId || sid === normalized || sid === kebab || normalizeSkillId(sid) === canonical;
  };
  ```
  Giờ đây, dù gọi bằng ID rút gọn (`no-than`), ID mở rộng (`no_than_cao_lo`), hay tên tiếng Việt (`Nỏ Thần`), hệ thống luôn trả về `true`.

- Trong `isLockSkill(skillId)`:
  Bổ sung trọn vẹn toàn bộ 16 định danh Tỏa Định Kỹ, đồng thời hỗ trợ tra cứu chéo qua `normalizeSkillId(skillId)`.

---

## Kết Quả Kiểm Thử (Verification & QA Results)
1. **Kiểm Tra Rà Soát Tự Động Toàn Bộ 39 Tướng:**
   - Kịch bản: [shared/engine_v4/__tests__/audit_39_heroes.mjs](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/audit_39_heroes.mjs)
   - Kết quả: **39/39 Vị Tướng đạt chuẩn 100%**, 0 lỗi mismatch HP, 0 lỗi faction, 0 lỗi thiếu mô tả, 0 lỗi lock skills.
2. **Bộ Test Suite Hệ Thống:**
   - Chạy `npm test`: **82 test files passed, 704 tests passed, 0 failures**.
3. **Mô Phỏng Thực Chiến (Stress Test & Fuzzing):**
   - `npm run sim:app`: 1.000 trận giả lập hoàn thành không có deadlock hay ngoại lệ.
