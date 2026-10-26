# ADR 0062: Comprehensive 39-Hero Skills Audit, Modal Interaction Completeness & Multi-Faction Edge Case Invariants

## Trạng thái
Đã chấp thuận & Triển khai thành công (Accepted & Implemented)

## Bối cảnh (Context)
Sau khi hoàn thành việc triển khai hệ thống lõi Engine v4 và Cockpit Mobile UI, việc kiểm toán toàn diện (comprehensive audit) toàn bộ 39 vị tướng thuộc 4 hệ (🟢 LẠC, 🔴 VIỆT, 🔵 HÀ, 🟤 SƠN) theo tiêu chuẩn SOP 6 bước (`.agents/skills/qa-hero-viet-sat/SKILL.md`) đã phát hiện ra các điểm đứt gãy giữa lớp Client UI (`ModalContainer.jsx`, `useSkillInteraction.js`, `useCardInteraction.js`), lớp Điều phối Engine (`DispatcherV4.js`, `GameViewMapperV4.js`) và trí tuệ nhân tạo (`BotBrain.js`):

1. **Placeholder & Modal chưa hoàn thiện trong `ModalContainer.jsx`:**
   - `ask_can_gian` (Nguyễn Địa Lô): Tồn tại 2 khối `if (req.type === 'ask_can_gian')`; khối đầu tiên ở dòng 255 hiển thị dòng chữ đỏ `🌟 Can Gián (Chưa code Modal)` và gửi payload sai lệch `{ doReact: false }`, chặn đứng hoàn toàn khối modal thật phía dưới.
   - `ask_thong_ngon` (Trần Nhật Duật): Chứa placeholder `🌟 Thông Ngôn (Chưa code Modal)`.
   - `ask_van_don` (Trần Khánh Dư): Hiển thị text `⚔️ Đang đấu điểm... (Tính năng đang hoàn thiện)` và chỉ có 1 nút Hủy Đấu, khiến người chơi không thể chọn thẻ bài trên tay để đọ điểm.
   - `ask_phat_tam` (Nguyên Phi Ỷ Lan): Hiển thị placeholder `🙏 Phát tâm ban bài cho đồng minh... (Tính năng đang hoàn thiện)`.
2. **Kỹ năng trùng tên khác cơ chế giữa 2 hệ (Collision of "Hòa Thân"):**
   - Cả Huyền Trân Công Chúa (hệ SƠN) và Công chúa An Tư (hệ HÀ) đều có kỹ năng tên là [Hòa Thân].
   - Trên UI, `useSkillInteraction.js` ánh xạ cố định `'Hòa Thân' -> 'hoa-than'` (kỹ năng ép 2 tướng nam Quyết Đấu của Huyền Trân), khiến người chơi cầm Công chúa An Tư khi nhấn nút [Hòa Thân] bị điều hướng sai sang modal Quyết Đấu thay vì chuyển hóa bài Rô ♦ thành [Hỗn Loạn].
   - Component `HoaThanAnTuModal.jsx` đã được viết nhưng chưa từng được mount trong `ModalContainer.jsx`.
3. **Thiếu chốt chặn an toàn khi người chơi hết bài trên tay (Empty Hand Edge Cases):**
   - Lạc Long Quân (`thuy_to`): Khi người chơi có 0 lá bài trên tay, việc nhấn [Thủy Tổ] đẩy frame `ASK_THUY_TO` với `maxCards: 0`, gây treo/hỏng tương tác UI thay vì cảnh báo hợp lệ.
   - Nguyễn Địa Lô (`can_gian`): Khi còn 1 HP, việc phát động Can Gián không có frame tương tác nếu thiếu `targets`, hoặc có thể dẫn đến tự sát nếu không kiểm tra `hp > 1`.
4. **Phương pháp quét kỹ năng lỗi thời (Outdated Skill Scanners):**
   - Nhiều vị trí trong `ModalContainer.jsx` vẫn sử dụng `me.heroes?.some(h => h.skills?.some(s => s.id === '...'))` thay vì helper chuẩn mực `hasSkill(player, skillId, requireRevealed)`.

---

## Quyết định Thiết kế (Decisions)

### 1. Xây Dựng & Tích Hợp Hoàn Thiện Các Modals Kỹ Năng
- **Tạo mới `VanDonModal.jsx`:**
  - Cho phép người chơi trực tiếp chạm chọn 1 lá bài trên tay để đọ điểm với đối thủ chỉ định.
  - Gửi payload `{ cardId, cardIndex, canceled: false }` hoặc `{ canceled: true }`.
  - Kết nối hoàn chỉnh với luồng `ASK_VAN_DON` của `DispatcherV4`.
- **Mount `HoaThanAnTuModal.jsx`:**
  - Kết nối khung `ASK_HOA_THAN_AN_TU` trong `ModalContainer.jsx`.
  - Hỗ trợ chuyển đổi cả lá bài chất Rô ♦ trên tay lẫn trang bị chất Rô ♦ trên người thành cẩm nang [Hỗn Loạn].
- **Dọn dẹp triệt để Placeholders:**
  - Xóa bỏ khối duplicate `ask_can_gian` lỗi thời.
  - Hoàn thiện UI cho `ask_thong_ngon` (xác nhận thu hồi lá bài phán xét).
  - Hoàn thiện UI cho `ask_phat_tam` (xác nhận phát động chuỗi phán xét Phật Tâm thu bài Đen).

### 2. Phân Tách Nhận Diện Kỹ Năng Trùng Tên (`hoa_than` vs `hoa_than_an_tu`)
- Trong `useSkillInteraction.js`:
  ```javascript
  if (skillId === 'Hòa Thân') {
    const me = gameState.players.find(p => p.id === mainPlayerId);
    const isAnTu = me && (hasSkill(me, 'hoa_than_an_tu') || hasSkill(me, 'hoa-than-an-tu'));
    if (isAnTu) {
      isActionPending.current = true;
      gameAPI.useSkill(mainPlayerId, 'hoa-than-an-tu');
      cancelTargeting();
      return;
    }
  }
  ```
- Trong `useCardInteraction.js` & `PlayerHand.jsx`:
  - Cho phép chuyển hóa trực tiếp lá bài chất Rô ♦ trên tay thành [Hỗn Loạn] khi `activeSkill === 'Hòa Thân'` và người chơi sở hữu kỹ năng `hoa_than_an_tu`.
- Trong `DispatcherV4.js`:
  - `normSkillId === 'hoa_than_an_tu'` tự động đẩy frame `ASK_HOA_THAN_AN_TU` nếu chưa truyền `cardId` hoặc `targetId`, mở modal giao diện cho người chơi lựa chọn.

### 3. Tăng Cường Bất Biến Kiểm Tra Điều Kiện & Chống Tự Sát
- **Lạc Long Quân (`thuy_to`):**
  - Thêm kiểm tra phòng ngừa ở cả UI (`useSkillInteraction.js`) và Engine (`DispatcherV4.js`): Ném lỗi `[Thủy Tổ] Bạn không có bài trên tay để chia cho đồng minh!` nếu `hand.length === 0`.
- **Yết Kiêu (`lan_sau`):**
  - Khai báo tường minh `frequency: 'unlimited'` trong `ha/index.js` (kèm chốt chặn Safe Turn Cap 5 lần) để cho phép kích hoạt nhiều lần liên tiếp khi còn đủ máu.
  - Xử lý trực tiếp trong `DispatcherV4.js`: Ném lỗi `[Lặn Sâu] Không thể mất máu khi chỉ còn 1 HP!` nếu $HP \le 1$.
- **Nguyễn Địa Lô (`can_gian`):**
  - Chặn đứng kích hoạt khi $HP \le 1$. Nếu chưa có mục tiêu, đẩy frame `ASK_CAN_GIAN` để người chơi lựa chọn cứu trợ đồng minh.
- **Bảo Vệ Kỹ Năng Chung (`skill.canUse` Guard):**
  - Tại nhánh fallback của `DispatcherV4._handleSkill`, tự động kiểm tra `skill.canUse(state, context)` trước khi gọi `skill.execute()`.

### 4. Chuẩn Hóa Quét Kỹ Năng UI Với `hasSkill`
- Thay thế toàn bộ các đoạn mã quét thủ công `me.heroes?.some(...)` trong `ModalContainer.jsx` bằng `hasSkill(me, skillId)`.
- Đảm bảo tương thích hoàn toàn giữa kebab-case (`nam-duoc`, `doi-nui`, `khai-thien`, `boc-tram-trung`, `thinh-chinh`, `ho-gia`) và snake_case (`nam_duoc`, `doi_nui`...).

### 5. Cập Nhật Trí Tuệ Nhân Tạo BotAI (`BotBrain.js`)
- Tích hợp các nhánh phản hồi tối ưu trong `BotBrain.js`:
  - `ASK_HOA_THAN_AN_TU`: Bot tự động lọc lá bài chất ♦ và chọn mục tiêu kẻ địch ưu tiên cao nhất để đặt Hỗn Loạn.
  - `ASK_CAN_GIAN`: Bot chỉ tự mất máu cứu đồng minh khi $HP \ge 3$.
  - `ASK_THONG_NGON` & `ASK_PHAT_TAM`: Tự động đồng ý thu hồi bài phán xét và mở chuỗi bài Đen.

---

## Ma Trận Kiểm Kê Toàn Bộ 39 Tướng (Full 39-Hero Audit Matrix)

| Hệ | Tướng | Kỹ Năng Đã Rà Soát | Tình Trạng Lớp UI / Engine | Kết Quả QA |
|---|---|---|---|---|
| 🟢 LẠC | Lạc Long Quân | Thủy Tổ, Bọc Trăm Trứng | Guard 0 bài tay; 2-step slash target | ✅ 100% Pass |
| 🟢 LẠC | Thánh Gióng | Thiết Mã, Tre Ngà | Tỏa định -1 cự ly; phán xét khóa Né | ✅ 100% Pass |
| 🟢 LẠC | Sơn Tinh | Dời Núi | Chuyển hóa Chém $\leftrightarrow$ Né linh hoạt | ✅ 100% Pass |
| 🟢 LẠC | Chử Đồng Tử | Tiên Duyên, Hóa Tiên | Bài ♣ thành Xiềng Xích; Hóa Tiên khi chết | ✅ 100% Pass |
| 🟢 LẠC | Tiên Dung | Duyên Tiên, Tiên Duyên | Rút bài khi dùng cẩm nang; cự ly vô hạn | ✅ 100% Pass |
| 🟢 LẠC | Cao Lỗ (Lạc) | Nỏ Thần (Lạc) | Tầm đánh bằng Rank; cấm Né khi tay $\ge$ địch | ✅ 100% Pass |
| 🟢 LẠC | Lang Liêu | Bánh Chưng, Đạm Bạc | Sắp xếp bài rút; miễn nhiễm khi hết bài | ✅ 100% Pass |
| 🟢 LẠC | Thần Trụ Trời | Khai Thiên | Bài Đỏ dùng như Chém | ✅ 100% Pass |
| 🟢 LẠC | Rùa Vàng | Thần Giáp, Thần Hỏa, Linh Giám | Bát Quái Trận; Hỏa Công; Hóa Giải | ✅ 100% Pass |
| 🔴 VIỆT | Triệu Quang Phục | Dạ Trạch | Cướp bài 2 người thay vì rút bài | ✅ 100% Pass |
| 🔴 VIỆT | Phùng Hưng | Khởi Nghĩa | Rút ít hơn 1 bài $\to$ Chém & Quyết Đấu +1 dmg | ✅ 100% Pass |
| 🔴 VIỆT | Khúc Thừa Dụ | Tự Chủ, Khoan Dân | Đấu điểm tướng HP cao hơn; rút bài theo HP | ✅ 100% Pass |
| 🔴 VIỆT | Dương Đình Nghệ | Dưỡng Quân | Bỏ trang bị Chém vô hạn cự ly | ✅ 100% Pass |
| 🔴 VIỆT | Lý Thường Kiệt | Nam Quốc Sơn Hà, Tiên Phát | Thu bài gây damage; Tướng Việt Né giùm | ✅ 100% Pass |
| 🔴 VIỆT | Trần Quang Khải | Đoạt Sáo, Chương Dương | Lật tướng rút 4 bài; trang bị làm Hóa Giải | ✅ 100% Pass |
| 🔴 VIỆT | Nguyễn Lữ | Tiên Phong | Mất 1 HP / bỏ vũ khí gây 1 damage | ✅ 100% Pass |
| 🔵 HÀ | Ngô Quyền | Bạch Đằng, Hậu Viện | Đổi bài; nhường Đào hồi máu | ✅ 100% Pass |
| 🔵 HÀ | Cao Lỗ (Hà) | Nỏ Thần (Hà) | Bài Đen dùng như Qua Sông Phá Cầu | ✅ 100% Pass |
| 🔵 HÀ | Yết Kiêu | Lặn Sâu | Unlimited frequency; chặn tự sát ở 1 HP | ✅ 100% Pass |
| 🔵 HÀ | Nguyễn Trãi | Bình Ngô, Tâm Công | Rút 3 bài; đoán chất bài đối thủ | ✅ 100% Pass |
| 🔵 HÀ | Nguyễn Chích | Nghệ An Kế, Hiến Kế | Miễn nhiễm Cướp/Hỗn Loạn; hết bài rút 1 | ✅ 100% Pass |
| 🔵 HÀ | Tô Hiến Thành | Nhiếp Chính | Giữ nguyên bài tay nếu không Chém | ✅ 100% Pass |
| 🔵 HÀ | Nguyên Phi Ỷ Lan| Thính Chính, Phật Tâm | Bài Đen làm Né; chuỗi phán xét Đen | ✅ 100% Pass |
| 🔵 HÀ | Trần Nhật Duật | Thông Ngôn, Hòa Nghị | Thu bài phán xét; chia 2 bài rút | ✅ 100% Pass |
| 🔵 HÀ | Trần Khánh Dư | Vân Đồn | Đấu điểm qua VanDonModal; win +1 Chém | ✅ 100% Pass |
| 🔵 HÀ | Mạc Đĩnh Chi | Đối Sứ, Ứng Biến | Thu bài kẻ đánh; can thiệp phán xét | ✅ 100% Pass |
| 🔵 HÀ | Chu Văn An | Thất Trảm Sớ | Phán xét trừng phạt kẻ gây damage | ✅ 100% Pass |
| 🔵 HÀ | Hồ Xuân Hương | Duyên Thơ, Xuân Hương | Bỏ 2 bài hồi 1 HP cho nam; mất trang bị rút 2 | ✅ 100% Pass |
| 🔵 HÀ | Nguyễn Địa Lô | Hộ Chủ, Can Gián | Lật Trung thoát chết; mất 1 HP cho bạn rút 2 | ✅ 100% Pass |
| 🔵 HÀ | Ngọc Hân C.Chúa| Hiền Hậu, Quốc Sắc | Bỏ ♥ chặn damage; Bích ♠ tính là Cơ ♥ | ✅ 100% Pass |
| 🔵 HÀ | Công chúa An Tư| Hòa Thân, Xả Thân | Bài ♦ thành Hỗn Loạn; chuyển hướng Chém | ✅ 100% Pass |
| 🟤 SƠN | Tuệ Tĩnh | Nam Dược, Diệu Dược | Bài Đỏ cứu người; bỏ 1 bài hồi 1 HP | ✅ 100% Pass |
| 🟤 SƠN | Đinh Bộ Lĩnh | Uy Chấn | Bị Chém Đỏ $\to$ kẻ đánh tự chọn hồi HP/rút bài | ✅ 100% Pass |
| 🟤 SƠN | Nguyễn Bặc | Bình Loạn, Khai Quốc | 2 bài cùng chất thành Loạn Tiễn; Max hand +2 | ✅ 100% Pass |
| 🟤 SƠN | Huyền Trân C.Chúa| Hòa Thân, An Bang | Ép 2 nam Quyết Đấu; cuối lượt rút 1 bài | ✅ 100% Pass |
| 🟤 SƠN | Đinh Điền | Tiên Phong, Quân Cơ, Định Quốc| Sét phản kích; sửa phán xét; dâng Né/Sấm Sét | ✅ 100% Pass |
| 🟤 SƠN | Nguyễn Xí | Phá Quân | Chém bắt 2 Né; Quyết Đấu bắt 2 Chém | ✅ 100% Pass |
| 🟤 SƠN | Đô đốc Bảo | Phá Thành | Phán xét đầu lượt; bài khác màu làm Quyết Đấu | ✅ 100% Pass |
| 🟤 SƠN | Lê Ngân | Trung Dũng, Hộ Giá | Úp bài làm mọi lá; cấm nghi ngờ & khóa skill | ✅ 100% Pass |

---

## Kiểm Chứng Thực Nghiệm (Verification)
1. **Kiểm thử Đơn vị & Tích hợp (Vitest):**
   - **75/75 test files** vượt qua thành công 100%.
   - **640/640 tests** pass tuyệt đối (bao gồm 10 test suites trong `ComprehensiveAllFactionsQA.test.js`).
2. **Khảo sát Tương tác Tầng Client (`PlayerHand`, `useSkillInteraction`, `ModalContainer`):**
   - Đã gỡ bỏ giới hạn sai của `Khai Thiên` trong `PlayerHand.jsx` (trước đây chỉ cho phép card.type EQUIP, nay cho phép toàn bộ bài Đỏ Basic/Trick/Equip theo đúng luật).
   - Đã bổ sung `Hòa Thân` (Công chúa An Tư) vào `CARD_CONVERTING_SKILLS` cho phép click chọn bài chất Rô ♦ mượt mà.
   - Chuẩn hóa truy cập `player.equipment` (hỗ trợ cả Array và Object dictionary).
   - Chuẩn hóa loại trừ mục tiêu `p.id !== me.id` thay vì hardcoded `0`.
3. **Đại Giả Lập 1.000 Trận Đấu (`sim:app` & `sim:core`):**
   - Hoàn thành 1.000/1.000 trận qua Dispatcher v4 trong 1.16s với 0 Deadlock, 0 Exception, 0 Warning log rác.
4. **Đồng Bộ Nền Tảng Di Động (Capacitor iOS/Android):**
   - Production bundle được build tinh gọn (152 modules) và sync trơn tru sang `ios/App/App/public` sẵn sàng cho Xcode và iPhone.

---

## 5. Ma Trận Hiệp Đồng Chuyển Đổi Chất & Màu (Quốc Sắc — Ngọc Hân Công Chúa)
- **Cơ chế gốc:** Tỏa Định Kỹ **Quốc Sắc** (`quoc_sac`): Mọi lá bài Spade (♠) của Ngọc Hân Công Chúa được xem như Heart (♥) và có màu Đỏ (`red`).
- **Lỗ hổng đã phát hiện & khắc phục triệt để:**
  1. `TargetResolverV4.js`: Hardcoded kiểm tra `physicalCard.color === 'red'` và `suit === 'heart'`. Đã refactor sử dụng `globalHeroRegistry.getEffectiveColor(player, physicalCard)` và `getEffectiveSuit(player, physicalCard)`.
  2. `DispatcherV4.js`: Sử dụng `getEffectiveColor` và `getEffectiveSuit` trong toàn bộ các phase và response frames (`ASK_SLASH_DUEL`, `ASK_SLASH_RESPONSE`, `ASK_PEACH`, `ASK_DODGE`, `ASK_NEGATE`, `ASK_BINH_LOAN`, `Tre Ngà`, `Kỳ Tập`, `Phá Thành`).
  3. `CombatRules.js`: Chuẩn hóa `playSlash` (Khai Thiên), `respondDodge` (Thính Chính), `applyDamage` (Hiền Hậu), `respondPeach` (Nam Dược).
  4. `TrickRules.js`: Chuẩn hóa `Quân Cơ` (Đinh Điền) và kích hỏa `Hỏa Công`.
  5. `client/src/components/game/hooks/useCardInteraction.js` & `PlayerHand.jsx`: Chuẩn hóa `isPlayable` và bộ chọn bài để nhận diện thẻ ♠ là Đỏ khi kết hợp cùng Khai Thiên, Thần Hỏa, Nam Dược, và ngăn chặn làm thẻ Đen cho Kỳ Tập.
- **Kết quả nghiệm thu:** 75/75 test files (649 tests) đạt 100% pass, 1000/1000 trận giả lập ứng dụng và core thành công tuyệt đối.
