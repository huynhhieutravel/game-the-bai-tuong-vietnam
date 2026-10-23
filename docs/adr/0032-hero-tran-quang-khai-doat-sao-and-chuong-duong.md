# ADR 0032: Thiết Kế & Kiểm Định Tướng Trần Quang Khải — Đoạt Sáo & Chương Dương

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Trần Quang Khải là bậc đại công thần tiết chế thời Trần, lập nên chiến công oanh liệt đánh tan giặc Nguyên Mông tại bến Chương Dương và cướp giáo giặc tại Hàm Tử quan (*"Đoạt sáo Chương Dương độ / Cầm Hồ Hàm Tử quan"*). Trong Việt Sát v4, ông thuộc phe 🔴 Việt và sở hữu bộ đôi kỹ năng phòng ngự cơ động kinh điển: **Đoạt Sáo** (tích trữ binh lực cuối lượt) và **Chương Dương** (chuyển hóa trang bị thành Hóa Giải).

## Quyết định Kỹ thuật
1. **Đoạt Sáo (`doat_sao` - Reactive `END_PHASE`):**
   - Kích hoạt tại Pha Kết thúc (`PHASES.END`) khi stack ưu tiên trống.
   - Khi kích hoạt (`doUse: true`):
     - Lật mặt tướng (`isFaceUp = !isFaceUp`, `isFlipped = !isFaceUp`).
     - Rút ngay 4 lá bài từ chồng bài rút (`state.drawCards(playerId, 4)`).
     - Đẩy frame tương tác `ASK_DOAT_SAO_DISCARD` yêu cầu chọn 1 lá bài trên tay:
       - Nếu lá bài chọn là bài Trang bị (Vũ khí, Giáp, Ngựa tấn công, Ngựa phòng thủ): Tự động mặc trực tiếp vào ô trang bị tương ứng (`equipment[slot] = card`). Nếu thay thế trang bị cũ, trang bị cũ vào `discardPile` và kích hoạt hiệu ứng tháo đồ (Bạch Ngân hồi 1 HP, `ON_EQUIP_LOST`).
       - Nếu lá bài chọn là bài cơ bản hoặc cẩm nang: Đưa vào `discardPile`.
     - Sau khi giải quyết xong `ASK_DOAT_SAO_DISCARD`, hệ thống tự động hoàn tất Pha Kết thúc và chuyển lượt sang người chơi tiếp theo (`stateMachine.nextTurn()`).
2. **Chương Dương (`chuong_duong` - Reaction Skill trong `ASK_NEGATE`):**
   - Khi bất kỳ cẩm nang nào được thi triển và phát động chuỗi hỏi Hóa Giải (`ASK_NEGATE`), Trần Quang Khải có quyền tháo bất kỳ lá bài Trang bị nào trên người (vũ khí, giáp, tọa kỵ) để sử dụng như một lá [Hóa Giải] (Vô Giải Khả Kích).
   - Trang bị tháo ra chuyển vào `discardPile`, đồng thời kích hoạt trọn vẹn các sự kiện liên quan đến việc rời người (ví dụ: Giáp Bạch Ngân hồi 1 HP).

## Hệ quả & Kiểm định
- Đã kiểm định hoàn tất qua bộ test suite Vitest: `shared/engine_v4/__tests__/heroes/TranQuangKhaiQA.test.js` (6/6 bài test vượt qua 100%).
- Đã đồng bộ chuyển lượt tự động tại `PHASES.END` trong `DispatcherV4.js` khi stack làm rỗng sau Đoạt Sáo.
