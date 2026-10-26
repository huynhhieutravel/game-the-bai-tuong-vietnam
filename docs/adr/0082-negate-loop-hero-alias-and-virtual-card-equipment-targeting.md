# ADR 0082: Xử lý Vòng Lặp Hóa Giải, Xung Đột Bí Danh Tiên Duyên và Mục Tiêu Bài Ảo Hỏa Công từ Trang Bị

## 1. Bối cảnh & Hiện tượng (Context & Symptoms)
Trong quá trình chơi thử nghiệm thực tế (dựa trên 3 ảnh màn hình người dùng cung cấp), người chơi gặp 3 hiện tượng nghiêm trọng:
1. **Hiện tượng 1 (Hóa Giải lặp lại):** Người chơi vừa ấn dùng [Hóa Giải] xong thì ngay lập tức màn hình lại hiện pop-up: *"Ai đó vừa dùng [Hóa Giải] vô hiệu hóa lá [Quyết Đấu]. Bạn có muốn dùng [Hóa Giải] để phục hồi nó không?"* kèm lá bài `[♦ 6 Đào (Linh Giám)]`.
2. **Hiện tượng 2 (Tiên Duyên bị chặn):** Khi bấm nút kỹ năng [Tiên Duyên], console báo lỗi: `[DispatcherV4] Error dispatching action ACTION_USE_SKILL: Error: [Tiên Duyên (Cự ly)] Không đủ điều kiện để kích hoạt!`.
3. **Hiện tượng 3 (Không dùng được Hỏa Công):** Người chơi có Tướng Rùa Vàng (`Thần Hỏa`: "Có thể dùng một lá Đỏ trên tay như [Hỏa Công]"), nhưng khi có lá đỏ trên tay lại không thể chọn mục tiêu đối thủ trên bàn để thi triển Hỏa Công.

---

## 2. Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 2.1. Hiện tượng 1: Vòng lặp Hóa Giải (Negate Chain Self-Prompt)
- **Tầng Engine:** Trong `TrickRules.respondNegate`, khi một người chơi `rescuerId` sử dụng Hóa Giải, engine thực hiện tạo lại hàng đợi ưu tiên cho vòng hỏi tiếp theo:
  ```javascript
  for (let i = 0; i < alivePlayers.length; i++) {
    const idx = (pIdx + i) % alivePlayers.length;
    frame.priorityQueue.push(alivePlayers[idx].id);
  }
  ```
  Vòng lặp bắt đầu từ `i = 0`, dẫn đến `priorityQueue[0]` chính là `rescuerId`. Engine lập tức set `currentActorId = rescuerId` và gửi yêu cầu hỏi chính người vừa đánh Hóa Giải xem có muốn tự hóa giải lá bài của mình hay không!
- **Tầng Hiển Thị (Linh Giám & Màu bài):** `globalHeroRegistry.getEffectiveColor` trước đây gặp lỗi kiểm tra đối số đa hình (`arg1.name !== undefined` khớp với `player.name`), khiến hàm fallback về `'black'` cho lá bài `♦ 6 Đào`. Điều này làm `ask_negate` trên modal nhận nhầm lá `♦ 6 Đào` là bài Đen, kích hoạt quyền thay thế bài của kỹ năng ẩn [Linh Giám].

### 2.2. Hiện tượng 2: Xung đột Bí danh Tiên Duyên (Skill Name Substring Collision)
- Hai Tướng trong phe Lạc cùng sở hữu kỹ năng có chữ "Tiên Duyên":
  - **Tiên Dung:** Kỹ năng Tỏa Định Cự Ly `tien_duyen_khoang_cach` (Tên hiển thị: `'Tiên Duyên (Cự ly)'`).
  - **Chử Đồng Tử:** Kỹ năng Chuyển Đổi Chủ Động `tien_duyen_chu_dong_tu` (Tên hiển thị: `'Tiên Duyên'`).
- Trong `HeroRegistry.registerSkill`, việc gán bí danh từ `GAME_DATA_HEROES` sử dụng biểu thức so khớp con:
  `gs.name.includes(skillContract.name) || skillContract.name.includes(gs.name)`.
  Do chuỗi `'Tiên Duyên (Cự ly)'.includes('Tiên Duyên')` luôn bằng `true`, kỹ năng Tỏa Định của Tiên Dung đã vô tình đè lên kỹ năng chủ động của Chử Đồng Tử trong bảng tra cứu `_skills['tien-duyen-active']` và `_skills['Tiên Duyên']`. Khi người chơi bấm nút, Dispatcher gọi nhầm vào kỹ năng Tỏa Định và ném lỗi điều kiện kích hoạt.

### 2.3. Hiện tượng 3: Lỗi Phân Định Mục Tiêu Bài Ảo Hỏa Công từ Trang Bị (Virtual Equipment Targeting)
- Trong trường hợp của người chơi, bài trên tay gồm: `♣ 3 Hóa Giải`, `♠ 10 Né`, `♠ A Né`, và `♦ A Ngựa Thần (+1)`. Lá bài đỏ duy nhất trên tay là lá trang bị `♦ A Ngựa Thần (+1)`.
- Trong `TargetResolverV4.js`:
  ```javascript
  if (physicalCard && (physicalCard.type === 'equip' || physicalCard.type === 'EQUIP')) {
    return { type: 'self' };
  }
  ```
  Logic kiểm tra loại thẻ vật lý này được đặt ở đầu hàm, TRƯỚC KHI kiểm tra lá bài có đang được dùng như bài ảo (`isVirtual = true`, `virtualCardName = 'Hỏa Công'`) hay không!
- Hệ quả: Lá trang bị đỏ bị ép thành `{ type: 'self' }`, làm bộ lọc mục tiêu trên giao diện tính ra `validTargets = []` (không thể chọn bất kỳ đối thủ nào). Khi người chơi ấn xác nhận, payload gửi lên chứa mảng mục tiêu rỗng `[]`, khiến `TrickRules.playFireAttack` ném ngoại lệ: *"Vui lòng chọn mục tiêu để Hỏa Công!"*.

---

## 3. Các Giải pháp Đã Triển khai (Implemented Solutions)

1. **Chuẩn hóa Hàng đợi Chuỗi Hóa Giải (`TrickRules.js` & `ModalContainer.jsx`):**
   - Đã cập nhật `TrickRules.respondNegate`: Vòng lặp tái tạo `priorityQueue` bắt đầu từ `i = 1`, loại trừ hoàn toàn người vừa đánh Hóa Giải khỏi vòng tự hóa giải chính mình.
   - Bổ sung `frame.context.lastNegaterId = rescuerId;` để Client biết chính xác ai là người vừa thi triển Hóa Giải.
   - Thêm lớp phòng vệ tại [ModalContainer.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/ModalContainer.jsx): Nếu `req.lastNegaterId === mainPlayerId`, component chặn render modal và tự động kích hoạt `doNegate: false`.

2. **Khắc phục So khớp Kỹ năng & Xử lý Kỹ năng Tiên Duyên (`HeroRegistry.js`, `DispatcherV4.js`, `ActionBar.jsx`):**
   - Loại bỏ so khớp chuỗi con (`includes`). Ràng buộc việc ánh xạ bí danh kỹ năng theo đúng ID Tướng (`gh.id === heroModule.id`) hoặc so khớp tên chính xác (`===`). Ưu tiên kỹ năng chủ động hơn kỹ năng tỏa định khi map tên hiển thị.
   - Bổ sung bộ xử lý chuyển tiếp trong `DispatcherV4._handleSkill`: Khi kích hoạt `tien_duyen` hoặc `than_hoa`, tự động chuyển hướng thành lệnh `ACTION_PLAY_CARD` với `virtualCardName: 'Xiềng Xích'` hoặc `'Hỏa Công'`.
   - Cập nhật [ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx) cho phép chọn bài và bấm [Xiềng Xích] / [Rèn lại] trực tiếp mượt mà.

3. **Tách biệt Mục tiêu Bài Ảo & Bài Vật Lý (`TargetResolverV4.js`):**
   - Đưa việc kiểm tra `isVirtual` lên đầu hàm `getTargetingDefinition`. Nếu thẻ bài vật lý là Trang bị (`type === 'equip'`) nhưng đang được chuyển đổi thành bài ảo cẩm nang/cơ bản (như [Hỏa Công] từ `Thần Hỏa` hay [Chém] từ `Võ Thánh`), hệ thống phân giải mục tiêu theo đúng quy tắc của lá bài ảo thay vì ép về `{ type: 'self' }`.

4. **Sửa Lỗi Nhận Diện Màu Bài Hiệu Lực (`HeroRegistry.js`, `translationHelper.js`):**
   - `getEffectiveSuit` và `getEffectiveColor` hỗ trợ nhận diện đối số đa hình linh hoạt `(player, card)` hoặc `(card, player)` dựa trên thuộc tính đặc trưng của Player (`hp`, `heroes`, `hand`, `equipment`), đảm bảo lá bài `♦` luôn được trả về màu `'red'`.

---

## 4. Kiểm Thử & Kiểm Định (Verification & QA Results)
- **Kiểm thử Đơn vị (Unit Tests):** 100% qua (92/92 test suites, 824/824 tests passed).
- **Kiểm thử Toàn diện (QA Full):** `npm run qa:full` chạy qua toàn bộ 3 tầng kiểm thử hợp đồng ViewModel, ModalContainer integration và hybrid simulation không lỗi.
- **Đại Giả Lập 1.000 Trận Ứng Dụng (`npm run sim:app`):** Hoàn thành 1.000/1.000 trận qua `DispatcherV4` với 0 lỗi ngoại lệ, 0 deadlock.
