# ADR 0023: Thiết Kế & Quy Chuẩn Kỹ Năng Chử Đồng Tử (Hóa Tiên & Tiên Duyên)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Chử Đồng Tử là vị thánh trong Tứ Bất Tử Việt Nam, thuộc phe 🟢 LẠC (Thục) với lượng máu chuẩn 3 HP (Nam). Nhân vật mang khả năng hồi sinh thần kỳ và liên kết trận địa:
1. **Tiên Duyên (Immortal Bond - Active Skill)**: Có thể sử dụng bất kỳ lá bài chất ♣ (Nhép / Club) nào như cẩm nang [Thiết Tác Liên Hoàn / Xiềng Xích] (hoặc chọn Rèn Lại để rút bài).
2. **Hóa Tiên (Ascension - Limited Skill / Hạn Định Kỹ)**: Khi rơi vào trạng thái Hấp hối (`hp <= 0`): Bỏ toàn bộ bài trên tay, trang bị và cẩm nang phán xét, hồi phục đầy đủ 3 HP và rút 3 lá bài mới (chỉ kích hoạt duy nhất 1 lần trong cả trận đấu).

## Quyết định Thiết kế (Decisions)

### 1. Hóa Tiên — Hạn Định Kỹ Thoát Chết Thần Kỳ (Dying Trigger)
- Tích hợp tại Trigger `ON_DYING` trong `CombatRules.enterDyingState`:
  - Khi Chử Đồng Tử nhận sát thương chí tử khiến `hp <= 0`:
    - Hệ thống kiểm tra điều kiện tần suất `frequency: 'limited'` qua `SkillContract`. Nếu chưa sử dụng (`!usage?.usedThisGame`):
    - Đánh dấu kỹ năng đã dùng vĩnh viễn trong trận (`usedThisGame = true`).
    - Vứt bỏ toàn bộ bài trên tay (`hand = []`).
    - Tháo dỡ toàn bộ trang bị đưa vào `discardPile` (`equipment[slot] = null`).
    - Dọn sạch toàn bộ cẩm nang trì hoãn trong khu vực phán xét (`judgementArea = []`).
    - Hồi phục lượng máu về tối đa (`hp = 3`).
    - Rút ngay 3 lá bài mới từ đầu bộ bài rút (`state.drawCards(0, 3)`).
    - Ngăn chặn hoặc pop khung `ASK_PEACH` (thoát chết tức thì mà không cần xin Đào từ bất kỳ ai).
  - Nếu bị đưa về trạng thái Hấp hối lần thứ hai trong trận, kỹ năng không còn khả dụng và Chử Đồng Tử phải đối mặt với nguy cơ tử trận thông thường.

### 2. Tiên Duyên — Biến Đổi Bài ♣ Thành [Xiềng Xích]
- Tích hợp tại `TargetResolverV4.js` (`getTargetingDefinition`) và `DispatcherV4.js`:
  - Cho phép người chơi sử dụng bất kỳ lá bài chất ♣ (Club) nào trên tay:
    - **Xiềng Xích mục tiêu:** Khóa xích hoặc tháo xích 1 đến 2 người chơi trên bàn cờ.
    - **Rèn Lại (Reforge):** Vứt bỏ lá bài ♣ để rút 1 lá bài mới từ đỉnh bộ bài rút mà không mở vòng hỏi Hóa Giải.

## Hệ Quả (Consequences)
- Chử Đồng Tử sở hữu "mạng sống thứ hai" nguyên vẹn, buộc đối thủ phải tiêu diệt hai lần mới có thể loại bỏ khỏi trận đấu.
- Khả năng tạo Xiềng Xích dồi dào từ chất ♣ phối hợp tuyệt vời với các đòn đánh nguyên tố lửa của Rùa Vàng hoặc sấm sét của toàn bàn.
