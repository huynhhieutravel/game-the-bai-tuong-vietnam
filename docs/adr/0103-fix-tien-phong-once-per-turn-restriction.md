# ADR 0103: Khắc Phục Lỗi Kỹ Năng Tiên Phong Kích Hoạt Nhiều Lần Trong Một Lượt (Once-Per-Turn Restriction)

## 1. Bối cảnh & Hiện tượng (Context & Bug Report)
- **Ảnh nhật ký trận đấu của người chơi:**
  - `[18:39:27] ⚡ [Tiên Phong] Người chơi 3 mất 1 HP, gây 1 sát thương lên Bạn!` -> Bạn hấp hối (0 HP), dùng [Đào] thoát chết lên 1 HP.
  - `[18:39:30] ⚡ [Tiên Phong] Người chơi 3 mất 1 HP, gây 1 sát thương lên Bạn!` -> Bạn nhận thêm 1 sát thương và tử trận.
- **Mô tả kỹ năng Tiên Phong (Nguyễn Lữ):**
  > "Trong giai đoạn Hành động, **mỗi lượt một lần**, bạn có thể chọn một: Mất 1 điểm Sinh lực; hoặc Bỏ 1 lá bài Vũ khí. Nếu làm vậy, gây 1 điểm sát thương lên một tướng khác trong phạm vi công kích của bạn."

## 2. Nguyên nhân cốt lõi (Root Cause)
1. **Thiếu đánh dấu `usedThisTurn` trong `DispatcherV4.js`:**
   - Khi nhận `ACTION_USE_SKILL` với `tien_phong` / `tien_phong_nguyen_lu`, `DispatcherV4` không kiểm tra `player.skillUsage.tien_phong.usedThisTurn` và sau khi gây sát thương cũng **không gán** `usedThisTurn = true`.
   - Khi giải quyết modal `ASK_TIEN_PHONG`, `DispatcherV4` cũng không cập nhật `player.skillUsage`.
2. **Thiếu điều kiện lọc trong bộ não Bot AI (`BotBrain.js`):**
   - Tại dòng 380, `BotBrain` chỉ kiểm tra xem Bot có kỹ năng `tien_phong` và còn máu hoặc vũ khí hay không (`hasWeapon || bot.hp > 1`).
   - Vì không kiểm tra `!bot.skillUsage?.tien_phong?.usedThisTurn`, sau khi mục tiêu ăn [Đào] thoát hấp hối và lượt vẫn ở Pha Hành Động của Bot, `BotBrain` kiểm tra thấy Bot vẫn còn $\ge 2$ HP $\rightarrow$ Bot lại lập tức phát động Tiên Phong lần 2 chỉ sau 3 giây!

## 3. Giải pháp triển khai (Solution)
1. **DispatcherV4.js:**
   - Trong nhánh `ACTION_USE_SKILL` (`normSkillId === 'tien_phong' || normSkillId === 'tien_phong_nguyen_lu'`):
     - Kiểm tra nếu `player.skillUsage?.tien_phong?.usedThisTurn || player.skillUsage?.tien_phong_nguyen_lu?.usedThisTurn` $\rightarrow$ ném lỗi `[Tiên Phong] Mỗi lượt chỉ được sử dụng 1 lần!`.
     - Sau khi trừ máu/vũ khí và gây sát thương, đánh dấu cờ:
       ```javascript
       player.skillUsage.tien_phong.usedThisTurn = true;
       player.skillUsage.tien_phong_nguyen_lu.usedThisTurn = true;
       ```
   - Trong case `ASK_TIEN_PHONG` khi người chơi xác nhận qua popup, cũng gán `usedThisTurn = true` cho cả 2 ID bí danh.
2. **BotBrain.js:**
   - Kiểm tra `const tienPhongUsed = Boolean(bot.skillUsage?.tien_phong?.usedThisTurn || bot.skillUsage?.tien_phong_nguyen_lu?.usedThisTurn);`
   - Chỉ cho phép Bot xem xét dùng Tiên Phong khi `!tienPhongUsed`.
3. **Headless Simulation Runner:**
   - Đánh dấu `usedThisTurn: true` trong `HeadlessRunner.js` và `run_1000_matches.mjs`.

## 4. Kết quả kiểm định (Validation)
- Bổ sung 2 test case trong [`NguyenLuQA.test.js`](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/heroes/NguyenLuQA.test.js):
  - Test 2.6: Kiểm tra nếu kích hoạt Tiên Phong lần 2 trong cùng lượt sẽ bị Dispatcher chặn lại với lỗi mỗi lượt 1 lần.
  - Test 2.7: Kiểm tra BotBrain sau khi dùng Tiên Phong lần 1 sẽ không bao giờ phát động Tiên Phong lần 2 trong cùng 1 lượt.
- Toàn bộ **110/110 test files (948/948 tests)** pass 100%.
- Client Vite build thành công không lỗi.
