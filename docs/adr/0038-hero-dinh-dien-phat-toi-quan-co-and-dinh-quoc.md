# ADR 0038: Thiết Kế & Kiểm Định Tướng Đinh Điền — Phạt Tội, Quân Cơ & Định Quốc

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Ngoại giáp Đinh Điền, bậc trung liệt công thần cùng Nguyễn Bặc hết lòng phò tá nhà Đinh, tận trung báo quốc. Trong Việt Sát v4, ông thuộc phe 🟢 Sơn và sở hữu bộ ba kỹ năng phòng thủ phản công và can thiệp vận mệnh:
1. **Phạt Tội (`phat_toi_dinh_dien`)**: Khi Đinh Điền Né thành công một đòn Chém, kẻ tấn công phải chịu 1 sát thương hoặc Đinh Điền được rút 1 lá bài quân nhu.
2. **Quân Cơ (`quan_co`)**: Khi có phán xét cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn), Đinh Điền có thể đánh ra một lá bài màu Đen từ bài tay để thay thế lá bài phán xét trước khi hiệu lực diễn ra.
3. **Định Quốc (`dinh_quoc`)**: Chúa Công Kỹ cho phép các tướng phe Sơn dâng tặng lá bài [Né] hoặc [Sấm Sét] cho Đinh Điền.

## Quyết định Kỹ thuật
1. **Phạt Tội (`phat_toi_dinh_dien` - Reactive Counter):**
   - Kích hoạt tại sự kiện `ON_DODGE_SUCCESS`.
   - Bộ lọc kiểm tra: `filter: (ctx) => ctx.ownerId === ctx.targetId && (ctx.actorId !== undefined || ctx.sourceId !== undefined)`.
   - Lựa chọn xử lý:
     - Mặc định hoặc trừng phạt: Trừ 1 HP của kẻ tấn công (`attacker.hp -= 1`), kiểm tra hấp hối nếu HP <= 0 (`CombatRules.enterDyingState`).
     - Lựa chọn rút bài (`choice: 'draw'`): Đinh Điền rút 1 lá bài từ chồng bài rút (`drawPile`).

2. **Quân Cơ (`quan_co` - Judgement Intercept with Black Cards):**
   - Tích hợp tại quy trình giải quyết Cẩm nang trì hoãn (`TrickRules.respondChangeJudge`).
   - Ràng buộc bài đánh ra: Bắt buộc là **bài màu Đen** (`color === 'black'` hoặc chất Bích/Chuồn). Nếu dùng bài Đỏ, hệ thống từ chối hành động với thông báo lỗi rõ ràng.

3. **Định Quốc (`dinh_quoc` - Lord Gift / Tribute):**
   - Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
   - Hỗ trợ cả 2 chiều:
     - Chiều 1 (Chủ động dâng bài): Đồng minh phe Sơn chọn lá bài [Né] hoặc [Sấm Sét] trên tay để chuyển nhượng sang bài tay của Đinh Điền.
     - Chiều 2 (Kêu gọi dâng bài): Đinh Điền phát động mở Modal `ASK_DINH_QUOC`, tuần tự hỏi các đồng minh phe Sơn còn sống dâng bài.

## Hệ quả & Kiểm định
- Đã tạo test suite độc lập: `shared/engine_v4/__tests__/heroes/DinhDienQA.test.js` kiểm tra 11/11 kịch bản:
  - Thuộc tính HeroRegistry phe Sơn (3 HP, Phạt Tội, Quân Cơ, Định Quốc).
  - Phạt Tội: Trừ 1 HP kẻ tấn công khi Né thành công.
  - Phạt Tội: Rút 1 bài khi chọn 'draw'.
  - Phạt Tội: Chống nhảy ké khi người khác Né.
  - Quân Cơ: Dùng bài Đen (Bích) thay thế phán xét thành công.
  - Quân Cơ: Chặn dùng bài Đỏ thay thế phán xét.
  - Định Quốc: Đồng minh Sơn dâng lá [Né] trực tiếp.
  - Định Quốc: Đồng minh Sơn dâng lá [Sấm Sét] trực tiếp.
  - Định Quốc: Chặn dâng bài không hợp lệ (Chém/Đào).
  - Định Quốc: Chặn tướng khác phe (phe Việt) dâng bài.
  - Định Quốc: Modal ASK_DINH_QUOC kêu gọi và dâng bài thành công.
- 100% test cases đã vượt qua.
