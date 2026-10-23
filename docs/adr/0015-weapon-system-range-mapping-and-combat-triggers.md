# ADR 0015: Hệ Thống Vũ Khí, Ánh Xạ Tầm Đánh & Cửa Sổ Kích Hoạt Chiến Đấu

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua phiên `/grill-with-docs`.

## Bối cảnh (Context)
Trong hệ thống Trang Bị (Equipment) của Việt Sát Engine v4, phân hệ **Vũ Khí (Weapons)** đóng vai trò quyết định cự ly công kích và khả năng mở rộng chiến thuật cho các đòn [Chém].
Nhằm chuẩn hóa toàn bộ các loại vũ khí từ v3 sang v4 theo chuẩn Tam Quốc Sát:
1. **Bảng tra cứu Tầm đánh (`WEAPON_RANGE_MAP`)**: Các lá bài rút từ bộ bài (Deck) hoặc tạo bởi kỹ năng biến đổi bài có thể chưa có sẵn thuộc tính `range`. Engine cần có bảng tra cứu cố định theo tên/slug vũ khí để đảm bảo tầm đánh luôn chính xác và không bị rớt về tầm mặc định (1).
2. **Cửa sổ phản ứng sau khi Né (Post-Dodge Trigger)**: Cần làm rõ tương tác của `Thanh Long Đao` (đánh tiếp lá Chém khác không giới hạn lượt) và `Rìu Đá` (bỏ 2 bài để cưỡng chế đòn Chém trúng đích).
3. **Cửa sổ kích hoạt trước khi Né (Pre-Dodge Trigger)**: `Song Kiếm` kích hoạt ngay khi Chém mục tiêu khác giới tính (ép bỏ bài hoặc cho rút bài) trước khi mục tiêu được quyền dùng [Né]. `Phương Thiên Kích` kiểm tra điều kiện lá bài duy nhất trên tay ngay tại khâu chọn mục tiêu (`TargetResolverV4`) để quét tối đa 3 mục tiêu.
4. **Hiệu ứng Biến đổi Sát thương (Damage Modifiers)**: `Quạt Sắt (Cổ Đĩnh Đao)` cộng thêm +1 sát thương khi mục tiêu trống bài trên tay; `Kỳ Lân Cung` bắn hạ Ngựa phòng thủ/tấn công khi gây sát thương.
5. **Bất biến Ô trang bị & Tước/Mất vũ khí**: Mỗi người chơi chỉ được trang bị tối đa 1 vũ khí (`single weapon slot`). Khi mất vũ khí, tầm đánh trở về mặc định = 1 ngay lập tức.

## Quyết định Thiết kế (Decisions)

### 1. Bảng Tra Cứu Tầm Đánh Chuẩn Hóa (`WEAPON_RANGE_MAP`)
Trong `RangeSystem.js`, định nghĩa bảng tra cứu tầm đánh cho toàn bộ vũ khí:
- **Liên Nỏ (`lien_no`, `lien-no`)**: Tầm đánh = 1 (Vô hạn số lần Chém trong Pha Hành Động).
- **Song Kiếm (`song_kiem`, `song-kiem`)**: Tầm đánh = 2 (Ép đối phương khác giới bỏ bài hoặc cho rút bài).
- **Quạt Sắt / Cổ Đĩnh Đao (`quat_sat`, `quat-sat`, `co_dinh_dao`)**: Tầm đánh = 2 (+1 sát thương khi mục tiêu hết bài trên tay).
- **Thanh Long Đao (`thanh_long_dao`, `thanh-long-dao`)**: Tầm đánh = 3 (Chém bị Né $\rightarrow$ đánh tiếp Chém khác).
- **Rìu Đá / Quán Thạch Phủ (`riu_da`, `riu-da`)**: Tầm đánh = 3 (Chém bị Né $\rightarrow$ bỏ 2 bài xuyên giáp bắt buộc trúng).
- **Phương Thiên Kích (`phuong_thien_kich`, `phuong-thien-kich`)**: Tầm đánh = 4 (Chém lá duy nhất trên tay $\rightarrow$ quét 3 mục tiêu).
- **Kỳ Lân Cung (`ky_lan_cung`, `ky-lan-cung`)**: Tầm đánh = 5 (Gây sát thương $\rightarrow$ bắn hạ 1 ngựa của mục tiêu).

Mọi phương thức tính tầm đánh (`RangeSystem.getAttackRange`) ưu tiên: `card.range` $\rightarrow$ `WEAPON_RANGE_MAP[weaponName/idKey]` $\rightarrow$ mặc định 1.

### 2. Xử Lý Sau Khi Né (Post-Dodge Triggers)
- Khi mục tiêu né thành công một đòn Chém (bằng lá [Né] hoặc [Bát Quái]):
  - **Thanh Long Đao**: Nếu người tấn công còn bài Chém trên tay, hệ thống cho phép đánh tiếp 1 lá [Chém] nữa lên cùng mục tiêu. Cú Chém nối tiếp này là chuỗi liên hoàn, không bị chặn bởi giới hạn 1 Chém/lượt.
  - **Rìu Đá**: Nếu người tấn công có từ 2 lá bài trở lên (trên tay hoặc trang bị khác), người tấn công có thể bỏ 2 lá bài để xuyên giáp: cú Né bị hủy bỏ, mục tiêu nhận đủ sát thương của cú Chém ban đầu.

### 3. Xử Lý Trước Khi Né (Pre-Dodge Triggers)
- **Song Kiếm**: Kích hoạt tại `CombatRules.playSlash` ngay khi phát động Chém lên tướng khác giới tính (`male` $\leftrightarrow$ `female`). Nạn nhân phải bỏ 1 lá bài (ưu tiên bài trên tay, sau đó đến trang bị) HOẶC cho người chém rút 1 lá bài. Quá trình này hoàn tất trước khi nạn nhân được nhắc đánh lá [Né].
- **Phương Thiên Kích**: Kiểm tra nếu lá Chém là lá bài DUY NHẤT trên tay người tấn công (`hand.length === 1`). Khi đó `TargetResolverV4` cho phép chọn từ 1 đến 3 mục tiêu. Mỗi mục tiêu phải lần lượt phản hồi né độc lập.

### 4. Biến Đổi Sát Thương & Bắn Hạ Ngựa
- **Quạt Sắt**: Trong `CombatRules.applyDamage`, nếu đòn gây sát thương có nguồn gốc từ Chém và người tấn công trang bị Quạt Sắt, nếu nạn nhân không còn bài trên tay (`target.hand.length === 0`), tăng `amount += 1`.
- **Kỳ Lân Cung**: Trong `CombatRules.applyDamage`, khi Chém gây sát thương thành công, nếu nạn nhân có Ngựa phòng thủ (`horse_defense`), ngựa phòng thủ bị tiêu hủy vào `discardPile`; nếu không có ngựa phòng thủ nhưng có Ngựa tấn công (`horse_attack`), ngựa tấn công bị tiêu hủy. Kích hoạt trigger `ON_EQUIP_LOST`.

### 5. Bất Biến Thay Thế & Mất Vũ Khí
- Một người chơi chỉ sở hữu tối đa 1 vũ khí tại slot `equipment.weapon`.
- Khi trang bị vũ khí mới, vũ khí cũ bắt buộc phải đưa vào `discardPile` và kích hoạt trigger `ON_EQUIP_LOST`.
- Khi bị mất vũ khí (do Tước Bài, Cướp Bài, Mượn Đao, hoặc lắp vũ khí mới), tầm đánh lập tức trở về 1 (hoặc cự ly kỹ năng tướng nếu có). Mọi chuỗi liên hoàn (như Thanh Long Đao) lập tức chấm dứt nếu vũ khí rời khỏi người.

## Hệ Quả (Consequences)
- Chuẩn hóa toàn diện 7 loại vũ khí trong Engine v4, đồng bộ 100% giữa tài liệu `04_Equipment_System.md`, Engine logic và Giao diện UI.
- `RangeSystem` không bao giờ bị tính sai cự ly dù bài lấy từ bất kỳ nguồn dữ liệu nào.
- Đảm bảo 100% độ bao phủ kiểm thử trong bộ test suite `WeaponsQA.test.js`.
