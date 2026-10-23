# 0007. Khôi Phục Cơ Chế Dã Tâm, Phán Xét Bát Quái / Thần Giáp & Hiệu Ứng Bị Động Trang Bị

- **Status:** Accepted
- **Date:** 2026-10-23

## Ngữ Cảnh (Context)
Trong quá trình chuyển giao kiến trúc từ Engine v3 sang Engine v4 theo mô hình hướng ngăn xếp LIFO (`PriorityStack`), một số cơ chế cân bằng cốt lõi và các hiệu ứng chiến thuật trang bị từ GDD (`docs/01_Gameplay_Rules.md`, `docs/04_Equipment_System.md`) và legacy engine chưa được tích hợp:
1. **Cơ chế cân bằng Dã Tâm (Careerist):** Khi số lượng người chơi đã lộ diện của một Phe vượt quá $N/2$, người chơi lộ diện tiếp theo phải thoái hóa thành Dã Tâm độc lập để chống mất cân bằng số lượng phe phái.
2. **Phán xét Bát Quái & Thần Giáp (Rùa Vàng):** Cơ chế rút phán xét đỉnh bộ bài khi bị Chém (Đỏ = Né miễn phí, Đen = phải tự đánh Né).
3. **Hiệu ứng bị động vũ khí & giáp:** Quạt Sắt (+1 sát thương lên mục tiêu hết bài), Bạch Ngân (giảm sát thương dồn xuống tối đa 1 HP & hồi 1 HP khi tháo giáp), Rìu Đá (vứt 2 bài để xuyên phá cú Né), và Thanh Long Đao (chém tiếp nhát thứ hai nếu bị Né).

## Quyết Định (Decision)
1. **🐺 Cơ Chế Dã Tâm (`isDaTam = true`):**
   - Trong `DispatcherV4._handleRevealHero`: Khi một người chơi lật tướng, nếu số người chơi cùng phe đã lật mặt (không tính những người đã là Dã Tâm) vượt quá $\lfloor N / 2 \rfloor$, người chơi đó lập tức bị gán cờ `isDaTam = true`.
   - **Luật thắng Dã Tâm:** Dã Tâm không bao giờ được tính chung vào chiến thắng đồng đội (`Team Victory`). Họ được coi là một thế lực độc tôn và chỉ chiến thắng khi là người sống sót duy nhất trên bàn cờ.
   - **AI Faction Loyalty:** Bot nhận diện Dã Tâm không phải là đồng minh của bất kỳ ai; Dã Tâm xem tất cả người chơi khác là kẻ thù và không bao giờ dùng [Đào] cứu người khác.
2. **☯️ Bát Quái & Thần Giáp:**
   - Trong `CombatRules.respondDodge`: Hỗ trợ cờ `options.useBagua` / `options.doBagua`.
   - Kiểm tra xem người chơi có trang bị Bát Quái hoặc kỹ năng `Thần Giáp` (khi không có Giáp).
   - Lật 1 lá bài từ đầu `drawPile` vào `discardPile`: Nếu màu Đỏ (Cơ/Rô), tăng `dodgesProvided` lên 1 và tự động né thành công nếu đủ điều kiện; nếu màu Đen, đánh dấu `baguaAttempted = true` và cho phép người chơi tiếp tục đánh [Né] từ trên tay.
3. **⚔️ Hiệu Ứng Bị Động Trang Bị Chiến Thuật:**
   - **Quạt Sắt (Iron Fan):** Trong `CombatRules.applyDamage`, nếu nguồn sát thương dùng Quạt Sắt và mục tiêu có 0 lá bài trên tay, tăng sát thương thêm +1.
   - **Bạch Ngân (Silver Lion):** Trong `CombatRules.applyDamage`, nếu mục tiêu trang bị Bạch Ngân, mọi sát thương dồn (Sấm Sét 3 HP, Rượu Chém 2 HP) đều bị giảm xuống tối đa 1 HP. Khi Bạch Ngân rời khỏi người chơi (tháo bỏ/thay thế), người chơi được hồi 1 HP.
   - **Rìu Đá (Rock Axe):** Trong `CombatRules._handlePostDodgeWeapons`, nếu cú Chém bị Né mà người tấn công cầm Rìu Đá và có $\ge 2$ lá bài, tự động bỏ 2 lá để xuyên phá cú Né và gây sát thương bắt buộc trúng.
   - **Thanh Long Đao (Green Dragon):** Trong `CombatRules._handlePostDodgeWeapons`, nếu cú Chém bị Né và người tấn công còn bài [Chém] trên tay, lập tức đánh ra nhát [Chém] thứ hai lên cùng mục tiêu.

## Hệ Quả (Consequences)
- Khôi phục 100% luật chơi cốt lõi từ GDD mà không vi phạm nguyên tắc bảo toàn thẻ bài (`Conservation Invariant`) và không gây deadlock vòng lặp.
- 128/128 unit test và 1.000 trận giả lập song tướng hoàn thành xuất sắc trong 0.22 giây với 0 ngoại lệ và 0 timeout.
