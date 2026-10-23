# ADR 0019: Thiết Kế & Quy Chuẩn Kỹ Năng Sơn Tinh (Dời Núi — Sơn Thần Phòng Thủ & Song Chiêu Chém - Né)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Sơn Tinh (Tản Viên Sơn Thánh) là danh tướng phòng thủ kiên cố bậc nhất của phe 🟢 LẠC (Thục) với lượng máu 4 HP (Nam). Danh tướng này sở hữu kỹ năng cốt lõi:
- **Dời Núi (Mountain Moving)**:
  1. **Cự Ly Phòng Thủ**: Khoảng cách từ tất cả người chơi khác tính đến Sơn Tinh luôn được tăng thêm 1 (+1 cự ly phòng thủ bẩm sinh khi Sơn Tinh đã lộ diện).
  2. **Song Chiêu Công - Thủ (Chuyển Hóa Chém $\leftrightarrow$ Né)**:
     - Trong pha Hành động hoặc khi có yêu cầu ra [Chém] (như trong Quyết Đấu, phản hồi Dã Man): Sơn Tinh có thể sử dụng bất kỳ lá [Né] nào như một lá [Chém].
     - Khi bị tấn công bởi [Chém] hoặc Cẩm Nang gây sát thương yêu cầu [Né] (như Loạn Tiễn): Sơn Tinh có thể sử dụng bất kỳ lá [Chém] nào như một lá [Né].

## Quyết định Thiết kế (Decisions)

### 1. Cự Ly Phòng Thủ Dời Núi (+1 Defensive Distance)
- Kỹ năng được tích hợp tại `RangeSystem.js` (`calculateDistance`):
  - Khi mục tiêu là Sơn Tinh và Sơn Tinh đã lộ diện (`revealedHeroes[target.id] === true`): cự ly phòng thủ tự động tăng thêm 1.
  - Khi Sơn Tinh chưa lộ diện (`revealedHeroes[target.id] === false`): kỹ năng ẩn mình, cự ly phòng thủ chưa được kích hoạt.
- **Cộng dồn**: Khi Sơn Tinh trang bị thêm `Ngựa Thần (+1)`, tổng cự ly phòng thủ của Sơn Tinh là +2.
- **Khắc phục tầm tấn công của kẻ địch**: Kẻ địch ở vị trí liền kề (khoảng cách gốc 1) muốn Chém Sơn Tinh phải có vũ khí tầm $\ge 2$ hoặc trang bị `Ngựa Chiến (-1)`.

### 2. Sử Dụng [Chém] Như [Né] Khi Bị Tấn Công (Defense)
- Tích hợp tại `CombatRules.respondDodge`:
  - Cho phép người chơi sở hữu kỹ năng `doi_nui` dùng lá bài có `type === 'slash'` hoặc `name === 'Chém'` / `slug === 'chem'` để phản hồi đòn [Né].
  - Áp dụng bình đẳng khi đối phó với [Chém] đơn thể lẫn các Cẩm Nang đa mục tiêu như [Loạn Tiễn].
- Tích hợp tại `DispatcherV4.js`:
  - Trong khung phản ứng `ASK_DODGE`, nếu người chơi bấm "Phản ứng" mà không chọn bài cụ thể (`doReact: true`), hệ thống ưu tiên tìm lá [Né]; nếu không có Né sẽ tự động tìm lá [Chém] hợp lệ để né đòn.

### 3. Sử Dụng [Né] Như [Chém] Trong Tấn Công (Offense & Duels)
- Tích hợp tại `CombatRules.playSlash`:
  - Chấp nhận lá bài có `type === 'dodge'` hoặc `name === 'Né'` / `slug === 'ne'` khi người dùng có kỹ năng `doi_nui`.
- Tích hợp tại `TargetResolverV4.js`:
  - `getTargetingDefinition`: Nhận diện lá [Né] của Sơn Tinh chuyển đổi thành slug `'chem'` và cung cấp bộ lọc mục tiêu hợp lệ trong tầm đánh (`getValidSlashTargets`).
  - `canPlayCard`: Xác nhận lá [Né] có thể được đánh ra như [Chém] trong pha Hành Động (áp dụng đầy đủ giới hạn 1 Chém/lượt trừ khi có Liên Nỏ).
- Tích hợp tại `TrickRules.respondDuel` & `DispatcherV4._handleReactAction`:
  - Trong `ASK_SLASH_DUEL` (Quyết Đấu) và `ASK_SLASH_RESPONSE` (Dã Man): Sơn Tinh có thể đánh lá [Né] để phản hồi đòn Chém.

### 4. BotBrain & Trí Tuệ Nhân Tạo
- `BotBrain.decideReaction`:
  - Khi dính `ASK_DODGE`: Bot Sơn Tinh ưu tiên né bằng lá [Né] thật; nếu cạn Né sẽ dùng lá [Chém] để né.
  - Khi dính `ASK_SLASH_DUEL` hoặc `ASK_SLASH_RESPONSE`: Bot ưu tiên dùng Chém; nếu cạn Chém sẽ dùng Né.
- `BotBrain.decideAction`:
  - Trong pha Hành động, nếu Bot Sơn Tinh chưa dùng Chém trong lượt và không có lá Chém trên tay, Bot sẽ quét bài [Né] và dùng như Chém để tấn công kẻ địch trong tầm.

## Hệ Quả (Consequences)
- Sơn Tinh có sức sống vô cùng bền bỉ nhờ khả năng tận dụng toàn bộ kho bài Chém và Né của mình vào cả tấn công lẫn phòng ngự.
- Cự ly phòng thủ +1 buộc đối phương phải tìm kiếm vũ khí hoặc Ngựa Chiến trước khi có thể đe dọa Sơn Tinh.
