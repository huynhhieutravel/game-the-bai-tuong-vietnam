# ADR 0021: Thiết Kế & Quy Chuẩn Kỹ Năng Thần Trụ Trời (Khai Thiên — Chuyển Hóa Toàn Diện Bài Đỏ Thành Chém)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Thần Trụ Trời là vị thần sáng lập trời đất của thần thoại Việt Nam, thuộc phe 🟢 LẠC (Thục) với lượng máu chuẩn 4 HP (Nam). Vị tướng này mang lối chơi công kích không ngừng nghỉ qua kỹ năng cốt lõi:
- **Khai Thiên (Heaven Creation - Active Skill)**:
  - Thần Trụ Trời có thể sử dụng hoặc đánh ra bất kỳ lá bài màu ĐỎ nào (chất Cơ ♥ hoặc chất Rô ♦) như một lá bài [Chém] (tương tự Quan Vũ - Vũ Thánh trong Tam Quốc Sát).

## Quyết định Thiết kế (Decisions)

### 1. Phạm Vi Áp Dụng Của Bài Đỏ Trong Tấn Công
- Kỹ năng được tích hợp tại `TargetResolverV4.js` (`getTargetingDefinition` & `canPlayCard`):
  - Bất kỳ lá bài nào có `color === 'red'` (hoặc `suit` thuộc `heart/diamond/♥/♦`) bao gồm: lá Cơ bản (Đào, Né, Rượu), lá Cẩm Nang (Vô Trung Sinh Hữu, Hỏa Công, Hồi Xuân), hoặc lá Trang Bị (Bát Quái, Ngựa Thần) đều có thể được chơi như một lá [Chém].
  - Áp dụng đầy đủ giới hạn 1 Chém/lượt trong Pha Hành Động trừ khi Thần Trụ Trời có vũ khí `Liên Nỏ`.
  - Tầm công kích hiệu dụng vẫn tuân thủ các quy tắc cự ly (vũ khí, ngựa, khoảng cách) thông thường.

### 2. Thuộc Tính Màu Sắc & Khắc Chế Giáp (Red Slash Invariant)
- Tích hợp tại `CombatRules.playSlash`:
  - Lá bài Đỏ đánh ra mang thuộc tính màu ĐỎ (`effectiveColor = 'red'`).
  - **Khắc chế Hắc Thuẫn**: Giáp [Hắc Thuẫn] chỉ miễn nhiễm với các lá Chém màu ĐEN (♠, ♣). Do đó, toàn bộ các đòn Chém tạo ra từ Khai Thiên đều xuyên qua Hắc Thuẫn và buộc đối phương phải dùng [Né] hoặc chịu sát thương.

### 3. Phản Ứng Trong Quyết Đấu & Dã Man
- Tích hợp tại `DispatcherV4.js` (`_handleReactAction`) & `TrickRules.js`:
  - Khi dính [Quyết Đấu] (`ASK_SLASH_DUEL`): Thần Trụ Trời có thể vứt bỏ 1 lá bài Đỏ bất kỳ từ trên tay để phản hồi đòn Chém.
  - Khi dính [Dã Man Xâm Nhập] (`ASK_SLASH_RESPONSE`): Thần Trụ Trời có thể vứt bỏ 1 lá bài Đỏ bất kỳ để chống đỡ đợt công kích.

### 4. Trí Tuệ Nhân Tạo Bot (Bot Brain v4)
- `BotBrain.decideAction`:
  - Khi bot chưa Chém trong lượt và không có lá Chém thật, bot sẽ quét các lá bài Đỏ trên tay (ưu tiên Né Đỏ, Rượu Đỏ, Cẩm nang Đỏ và bảo lưu Đào Đỏ để cứu mạng) để tấn công kẻ thù trong tầm.
- `BotBrain.decideReaction`:
  - Trong Quyết Đấu và Dã Man, nếu hết Chém thật, bot tự động dùng bài Đỏ để phòng vệ.

## Hệ Quả (Consequences)
- Thần Trụ Trời sở hữu nguồn cung cấp Chém dồi dào bậc nhất (khoảng 50% bộ bài), cực kỳ nguy hiểm trong các màn đọ sức Quyết Đấu tay đôi và khắc chế cứng người chơi trang bị Hắc Thuẫn.
