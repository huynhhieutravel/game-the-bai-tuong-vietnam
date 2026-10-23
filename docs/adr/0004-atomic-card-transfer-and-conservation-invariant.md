# 0004. Bất Biến Bảo Toàn Bài & Cơ Chế Chuyển Bài Nguyên Tử (Atomic Card Transfer)

- **Status:** Accepted
- **Date:** 2026-10-23

## Ngữ Cảnh (Context)
Trong quá trình chạy giả lập 1.000 trận và kiểm thử tương tác thực tế với trang bị (Vũ khí, Phòng cụ, Ngựa), xuất hiện lỗi rò rỉ và nhân bản thẻ bài: khi người chơi trang bị một lá bài từ tay (như `Rìu Đá`, `Ngựa Chiến`), lá bài vừa được gán vào `player.equipment` vừa bị đẩy xuống `discardPile`, khiến tổng số thẻ bài trong ván chơi tăng lên, vi phạm bất biến bảo toàn bài (Card Conservation Invariant: tổng số bài luôn cố định là 106 lá). Đồng thời, việc thiếu chuẩn hóa giữa phân loại bài `CARD_SUBTYPES` (`equip_weapon`, `equip_mount_atk`...) và các ô trang bị (`weapon`, `horse_attack`...) khiến `Dispatcher` rơi vào nhánh xử lý mặc định (bỏ bài thay vì trang bị).

## Quyết Định (Decision)
1. **Bất Biến Bảo Toàn Bài (Card Conservation Invariant):** Mọi lá bài trong trận đấu chỉ thuộc duy nhất một trong 6 Vùng Thẻ (Card Zones: `drawPile`, `discardPile`, `hand`, `equipment`, `judgementArea`, `exile`). Tổng số bài giữa các vùng luôn là hằng số bất biến (106 lá).
2. **Chuyển Bài Nguyên Tử (Atomic Card Transfer):** Di chuyển thẻ bài giữa các vùng phải thực hiện nguyên tử. Khi trang bị một lá bài từ `hand`, bài được rút khỏi tay và đưa thẳng vào ô trang bị tương ứng mà không được chạm vào `discardPile`. Chỉ khi một trang bị mới đè lên trang bị cũ cùng slot, trang bị cũ mới được chuyển xuống `discardPile`.
3. **Chuẩn Hóa Ô Trang Bị (Equipment Slot Normalization):** Ánh xạ chuẩn hóa 1-1 giữa `CARD_SUBTYPES` và `equipment` của người chơi:
   - `equip_weapon` ➔ `player.equipment.weapon`
   - `equip_armor` ➔ `player.equipment.armor`
   - `equip_mount_atk` ➔ `player.equipment.horse_attack`
   - `equip_mount_def` ➔ `player.equipment.horse_defense`
4. **Bảo Toàn Bất Biến Cẩm Nang Trì Hoãn (Judgement Invariant):** Khi sử dụng cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn), lá bài được chuyển trực tiếp từ `hand` sang `judgementArea` của mục tiêu, không đi qua `discardPile` cho đến khi phán xét được giải quyết xong.

## Hệ Quả (Consequences)
- Triệt tiêu 100% lỗi nhân bản thẻ bài (card duplication) và rò rỉ thẻ bài (card leak).
- Giữ vững tính toàn vẹn trạng thái cho cả Headless Engine v4, React UI Client, và Server Authoritative trong tương lai.
