# 0009. Khôi Phục Cẩm Nang Mượn Đao Giết Người, Cướp/Tước Đa Vùng & Miễn Nhiễm Hắc Thuẫn

- **Status:** Accepted
- **Date:** 2026-10-23

## Ngữ Cảnh (Context)
Trong tiến trình chuyển đổi sang Engine v4 và chuẩn hóa 106 lá bài chính thức (`shared/data/gameData.js`), một số luật tương tác chuyên sâu giữa cẩm nang và trang bị từ GDD (`docs/01_Gameplay_Rules.md`, `docs/03_Cards_Deck.md`, `docs/04_Equipment_System.md`) còn bị khuyết hoặc giới hạn:
1. **Cẩm Nang [Mượn Đao Giết Người] (`muon_dao`):** Đã có Modal UI (`BorrowSwordModal.jsx`) và lá bài trong bộ bài nhưng Engine v4 chưa có luồng điều phối xử lý khung ưu tiên `ASK_BORROW_SLASH`.
2. **Cướp Bài (`cuop_bai`) & Tước Bài (`tuoc_bai`) bị bó hẹp:** Trước đây hai lá bài này chỉ trích xuất từ trên tay (`target.hand`). Theo luật chuẩn, người chơi có quyền cướp hoặc tước trang bị (Vũ khí, Giáp, Ngựa) hoặc cẩm nang trong khu phán xét (`judgementArea`) của mục tiêu (ví dụ giải cứu đồng đội khỏi Hỗn Loạn / Sấm Sét).
3. **Giáp Hắc Thuẫn (`black_shield`):** Cần nhận diện chính xác tên lá bài tiếng Việt (`Hắc Thuẫn`) và các biến thể ID để miễn nhiễm tuyệt đối với mọi lá Chém màu Đen (♠, ♣).
4. **Giới Hạn [Rượu] khi Hấp Hối:** Rượu chỉ được phép dùng để tự cứu chính bản thân người chơi khi rơi vào trạng thái hấp hối (`hp <= 0`), cấm tuyệt đối việc dùng Rượu cứu người khác (phải dùng Đào).

## Quyết Định (Decision)

### 1. 🗡️ Cẩm Nang Mượn Đao Giết Người (Borrow Sword)
- Trong `TrickRules.playBorrowSword`:
  - Kiểm tra điều kiện tiên quyết: Mục tiêu A phải có trang bị vũ khí (`targetA.equipment?.weapon`).
  - Kiểm tra tầm đánh: Mục tiêu B phải nằm trong phạm vi công kích của mục tiêu A (`RangeSystem.canAttack(state, targetAId, targetBId)`).
  - Đẩy Frame `ASK_BORROW_SLASH` vào `priorityStack` hướng đến mục tiêu A.
- Trong `TrickRules.respondBorrowSlash`:
  - Nếu mục tiêu A đồng ý xuất `Chém`: Khởi động chu kỳ Chém thông thường lên mục tiêu B (`CombatRules.playSlash`).
  - Nếu mục tiêu A từ chối hoặc không có `Chém`: Vũ khí trang bị của mục tiêu A lập tức bị tháo ra và chuyển giao vào tay của người dùng cẩm nang (`borrower.hand.push(weaponCard)`).
- Tích hợp `DispatcherV4` và ánh xạ `GameViewMapperV4` sang cấu trúc `req = { type: 'ask_slash', reason: 'muon-dao', borrowerId, targetId }` để tương thích 100% với `BorrowSwordModal.jsx` trên Frontend.

### 2. 🤏 Cướp Bài & 💥 Tước Bài Đa Vùng (Multi-Zone Steal & Dismantle)
- Nâng cấp `TrickRules._executeTrickEffect` cho `cuop_bai` và `tuoc_bai`:
  - Hỗ trợ tham số `extraArgs.targetCardId` để chỉ định chính xác lá bài cần cướp/tước.
  - Tự động quét theo thứ tự ưu tiên: Bài trên tay (`hand`) ➔ Bài trang bị (`equipment`: weapon, armor, horse_attack, horse_defense) ➔ Cẩm nang trì hoãn (`judgementArea`).
  - **Tương tác đặc biệt với Bạch Ngân:** Nếu giáp Bạch Ngân bị Cướp hoặc Tước, mục tiêu lập tức được hồi 1 HP theo đúng hiệu ứng bị động rời người chơi.

### 3. 🛡️ Miễn Nhiễm Giáp Hắc Thuẫn & Giới Hạn Rượu
- Trong `CombatRules.playSlash`:
  - Mở rộng regex/name matching cho `Hắc Thuẫn`: Chấp nhận cả `targetArmor.name === 'Hắc Thuẫn'` lẫn `hac_thuan`, `black_shield`.
  - Miễn nhiễm hoàn toàn với mọi lá Chém có chất Bích (♠), Nhép (♣) hoặc `color === 'black'`. Không mở khung hỏi Né.
- Trong `CombatRules.respondPeach`:
  - Kiểm tra nếu lá bài cứu hộ là `Rượu` (`wine`), bắt buộc `rescuerId === dyingPlayer.id`. Nếu cố tình dùng Rượu cứu người khác, ném ngoại lệ cấm hành động.

## Hệ Quả (Consequences)
- 21/21 file kiểm thử Vitest đạt 100% (144/144 tests green), bao gồm 9 test chuyên sâu mới tại `BorrowSwordAndMultiZone.test.js`.
- Mô phỏng 1.000 trận đấu Song Tướng Engine v4 hoàn thành trong 0.31s với 0 ngoại lệ, 0 lỗi vi phạm Invariant.
