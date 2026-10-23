# ADR 0016: Hệ Thống Phòng Cụ (Giáp), Phán Xét Bát Quái, Miễn Nhiễm Hắc Thuẫn & Bạch Ngân Hộ Mệnh

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua phiên `/grill-with-docs`.

## Bối cảnh (Context)
Trong hệ thống Trang Bị của Việt Sát Engine v4, phân hệ **Phòng Cụ (Giáp / Armor)** bảo vệ người chơi trước các nguồn sát thương và đòn công kích. Phân hệ bao gồm 3 loại giáp tiêu chuẩn:
1. **Bát Quái (Eight Trigrams)**: Phán xét biến chất Đỏ thành lá [Né]. Cần làm rõ phạm vi phán xét (có áp dụng cho cẩm nang Loạn Tiễn không, tương tác với đòn Chém yêu cầu 2 Né của Nguyễn Xí thế nào, và giới hạn 1 lần phán xét / yêu cầu Né).
2. **Hắc Thuẫn (Renwang Shield)**: Miễn nhiễm với đòn [Chém] màu Đen. Cần làm rõ bất biến: Hắc Thuẫn KHÔNG chặn Chém Đỏ, KHÔNG chặn đọ Chém trong Quyết Đấu, KHÔNG chặn Dã Man / Loạn Tiễn / Hỏa Công, nhưng chặn được các đòn Chém ảo (Virtual Slash) bắt nguồn từ bài màu Đen.
3. **Bạch Ngân (Silver Lion)**: Cơ chế kép bảo vệ và hồi sinh: khóa trần mọi sát thương đơn lẻ dồn $\ge 2$ xuống còn tối đa 1 HP; và hồi 1 HP khi giáp rời khỏi người (thay thế, cướp, tước, hoặc tháo bằng kỹ năng).
4. **Tương tác Kỹ năng Tướng**: Rùa Vàng sở hữu `Thần Giáp` (tương đương Bát Quái bẩm sinh khi không mặc giáp). Cần bảo đảm bất biến khi Rùa Vàng trang bị một giáp vật lý (Hắc Thuẫn, Bạch Ngân), giáp vật lý sẽ thay thế và có hiệu lực trực tiếp.

## Quyết định Thiết kế (Decisions)

### 1. Danh Mục Phòng Cụ & Phân Loại
Ba loại giáp tiêu chuẩn trong hệ thống:
- `Bát Quái` (`bat_quai`, `bat-quai`): Thuộc tính subtype `equip_armor`. Cung cấp khả năng phán xét Né miễn phí.
- `Hắc Thuẫn` (`hac_thuan`, `hac-thuan`, `black_shield`): Thuộc tính subtype `equip_armor`. Miễn nhiễm 100% Chém Đen.
- `Bạch Ngân` (`bach_ngan`, `bach-ngan`): Thuộc tính subtype `equip_armor`. Khóa trần sát thương dồn = 1 và hồi 1 HP khi rời người.

### 2. Quy Tắc Phán Xét Bát Quái (Bagua Rules)
- **Phạm vi kích hoạt**: Áp dụng cho mọi khung `ASK_DODGE`, bao gồm:
  - Đòn [Chém] của đối thủ (`reason: 'slash'`).
  - Đòn cẩm nang [Loạn Tiễn] toàn bàn (`reason: 'van-tien'`).
- **Giới hạn phán xét**: Bát Quái chỉ được phán xét tối đa 1 lần cho mỗi lượt yêu cầu Né (`baguaAttempted: true`).
- **Xử lý kết quả**:
  - Lật ra lá bài màu Đỏ (♥️, ♦️) $\rightarrow$ thành công, tính là 1 lá [Né] (`dodgesProvided += 1`). Nếu đủ yêu cầu, né thành công.
  - Lật ra lá bài màu Đen (♠️, ♣️) $\rightarrow$ thất bại, người chơi vẫn giữ nguyên quyền đánh lá [Né] từ trên tay.
  - Khi gặp đòn Chém bắt 2 Né (Nguyễn Xí - Phá Quân): Bát Quái phán xét Đỏ thành công tính 1 Né, người chơi đánh thêm 1 Né từ tay để đủ 2 Né né thành công.

### 3. Ranh Giới Miễn Nhiễm Của Hắc Thuẫn (Black Shield Invariants)
- Hắc Thuẫn kích hoạt tại `CombatRules.playSlash` khi kiểm tra đòn Chém hướng vào chủ nhân:
  - Nếu lá Chém có màu Đen (`color === 'black'` hoặc `suit === 'spade' | 'club'`), đòn Chém bị triệt tiêu hoàn toàn (`success: false, reason: 'ARMOR_IMMUNE'`), không mở cửa sổ Né.
  - Hắc Thuẫn **KHÔNG CÓ TÁC DỤNG** đối với: đòn Chém màu Đỏ, trận [Quyết Đấu] (kể cả khi đối phương ra Chém đen trong Duel), [Dã Man], [Loạn Tiễn], [Hỏa Công] hay [Sấm Sét].
  - Khi đối phương dùng kỹ năng chuyển hóa một lá bài Đen thành lá Chém, Hắc Thuẫn vẫn nhận diện màu Đen thực tế và chặn đứng đòn Chém.

### 4. Cơ Chế Kép Của Giáp Bạch Ngân (Silver Lion Dual Mechanics)
- **Khóa trần sát thương $\ge 2$**: Trong `CombatRules.applyDamage`, bất kỳ nguồn sát thương nào $> 1$ (Sấm Sét 3 HP, Chém kèm Rượu 2 HP, Quạt Sắt mục tiêu hết bài 2 HP) đều bị giảm xuống còn đúng 1 HP.
- **Hồi máu khi rời người**: Bất cứ khi nào Bạch Ngân rời khỏi ô `equipment.armor` (do bị Tước Bài, Cướp Bài, tháo bỏ bằng kỹ năng như Chương Dương của Trần Quang Khải, hoặc bị thay thế bởi giáp mới):
  - Chủ nhân được hồi phục ngay 1 HP (`hp = Math.min(maxHp, hp + 1)`).
  - Kích hoạt sự kiện `ON_EQUIP_LOST`.

### 5. Bất Biến Ô Giáp & Giáp Bẩm Sinh Của Tướng
- Mỗi người chơi chỉ sở hữu tối đa 1 ô `equipment.armor`. Trang bị giáp mới sẽ lập tức chuyển giáp cũ vào `discardPile` và kích hoạt `ON_EQUIP_LOST`.
- Kỹ năng `Thần Giáp` của Rùa Vàng chỉ có hiệu lực khi `equipment.armor === null`. Nếu Rùa Vàng trang bị giáp vật lý (Hắc Thuẫn hoặc Bạch Ngân), giáp vật lý sẽ thay thế Thần Giáp và hoạt động độc lập.

## Hệ Quả (Consequences)
- Đóng đinh ranh giới bảo vệ của 3 bộ giáp, ngăn chặn hoàn toàn các tranh cãi về việc Bát Quái có né được Loạn Tiễn hay Hắc Thuẫn có chặn được Dã Man / Duel hay không.
- Giữ vững 0 lỗi Invariant trên toàn hệ thống kiểm thử Vitest và bộ đại giả lập 1.000 trận đấu.
