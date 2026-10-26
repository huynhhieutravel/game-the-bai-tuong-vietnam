# ADR 0088: Chuẩn Hóa Quy Tắc Đấu Điểm (Two-Phase Point Duel) & Sửa Lỗi Tiên Phong Bỏ Vũ Khí Trên Tay

## Trạng Thái
Đã Chấp Nhận & Triển Khai (Accepted & Implemented)

## Bối Cảnh & Vấn Đề (Context & Problem)
Qua trải nghiệm trận đấu thực tế và ảnh chụp màn hình do người dùng cung cấp:
1. **Lỗi Tiên Phong (Nguyễn Lữ):**
   - Modal [TienPhongModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/TienPhongModal.jsx) bị disable nút "Bỏ 1 Vũ Khí" dù trên tay người chơi đang cầm lá `Thanh Long Đao ♦3` là một lá bài Vũ Khí hợp lệ.
   - Nguyên nhân: [TienPhongModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/TienPhongModal.jsx) chỉ kiểm tra `me.equipment` mà hoàn toàn bỏ qua `me.hand`. Đồng thời tại [DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js), nhánh `if (data.costType === 'weapon' && player.equipment?.weapon)` chỉ kiểm tra trang bị; nếu người chơi bỏ vũ khí trên tay thì bị rơi vào nhánh `else: player.hp -= 1` (bị trừ máu thay vì bỏ vũ khí).
2. **Lỗi Đấu Điểm (Point Duel — Trần Khánh Dư / Khúc Thừa Dụ):**
   - Khi Bot 3 (Trần Khánh Dư) phát động kỹ năng Vân Đồn đấu điểm với Người chơi 0 (Human), game tự động lấy lá bài đầu tiên trên tay của Người chơi 0 (`Hóa Giải 8`) đem ra đọ với lá `Tước Bài Q` của bot mà không hề hiển thị Modal hoặc cho người chơi chọn bài.
   - Nguyên nhân: [DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js) khi tạo frame `ASK_VAN_DON` chỉ đặt `priorityQueue: [playerId]` (chỉ có người phát động). Khi người phát động phản hồi, code lập tức lấy `const oppCard = target.hand[0]` và `priorityStack.pop()` kết thúc luôn, tước đoạt quyền lựa chọn của đối thủ. Tương tự, `ASK_TU_CHU` tự ý `target.hand.pop()`.

## Quy Tắc Đấu Điểm Chuẩn (Canonical Point Duel Rules)
1. **Lựa chọn người chơi tham gia:** Xác định người phát động (`sourceId`) và mục tiêu (`targetId`) (hoặc danh sách người chơi tham gia nếu có nhiều hơn 2 người).
2. **Chọn bài bí mật (Phase 1):** Mỗi người chơi tham gia lần lượt chọn 1 lá bài trên tay mình. Lá bài được lưu giữ kín trong `frame.context.chosenCards[playerId]` và chưa lộ ra cho đối phương.
   - Nếu là Human: Hiển thị Modal ([VanDonModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/VanDonModal.jsx)) hiển thị rõ đối thủ phát động và cho phép click chọn lá bài trên tay.
   - Nếu là Bot: [BotBrain.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/ai/BotBrain.js) lựa chọn lá bài có rank cao nhất.
3. **Lộ bài cùng lúc & Vào Chồng Bài Bỏ (Phase 2):**
   - Khi tất cả người tham gia đã chọn bài xong, frame được giải phóng (`pop`).
   - Cả 2 lá bài lộ ra cùng lúc và di chuyển trực tiếp vào `discardPile` thông qua `this.state.moveCard(card.id, { type: 'hand', playerId }, { type: 'discardPile' })`.
   - **Đặc biệt:** Quá trình này **không tính là bỏ bài** (không kích hoạt các kỹ năng/hiệu ứng bị ép discard như Hiến Kế).
4. **Phán xét Thắng / Thua / Hòa:**
   - So sánh rank quy đổi (`rankToNumber`):
     - `myRank > oppRank`: Người phát động Thắng.
     - `myRank < oppRank`: Người bị thách đấu Thắng (Người phát động Thua).
     - `myRank === oppRank`: **Cả hai không thắng và không thua (HÒA)**.
   - Với kỹ năng Vân Đồn (Trần Khánh Dư): Luật quy định *"Nếu thắng: được đánh thêm 1 Chém vô hạn cự ly và chọn 2 mục tiêu. Nếu không thắng: bị cấm Chém trong lượt này"*. Do đó khi Hòa, Trần Khánh Dư không được tính là thắng $\rightarrow$ bị cấm Chém.

## Các Thay Đổi Chi Tiết (Implementation Details)
1. **[TienPhongModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/TienPhongModal.jsx):**
   - Quét cả vũ khí đang trang bị (`me.equipment?.weapon`) và toàn bộ vũ khí trên tay (`me.hand.filter(isWeapon)`).
   - Nút "Bỏ 1 Vũ Khí" bật sáng ngay khi có vũ khí trên tay hoặc trang bị.
   - Hiển thị danh sách các lá vũ khí cho người chơi click chọn nếu có nhiều hơn 1 lá, gửi kèm `cardId`.
2. **[DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js):**
   - `ASK_TIEN_PHONG` & trigger `tien_phong`: Hỗ trợ bỏ vũ khí từ trang bị (gỡ đồ + `ON_EQUIP_LOST`) hoặc từ tay (`discardFromHand`). Tuyệt đối không trừ HP khi người chơi đã chọn bỏ vũ khí.
   - `ASK_VAN_DON`: Đẩy `priorityQueue: [playerId, validTarget]`. Người thứ 1 chọn bài $\rightarrow$ lưu vào `chosenCards`, gọi `nextActor()`. Người thứ 2 chọn bài $\rightarrow$ lộ bài cùng lúc, chuyển bài bằng `moveCard`, so sánh rank và xử lý trường hợp Hòa.
   - `ASK_TU_CHU`: Chuyển bài sang `discardPile` bằng `moveCard`, xử lý Hòa an toàn không ai bị ép Chém.
3. **[VanDonModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/VanDonModal.jsx):**
   - Phân biệt vai trò `isInitiator = me.id === req.sourceId`.
   - Nếu là người bị thách đấu (`me.id === req.targetId`), hiển thị đối thủ là `req.sourceId` và thông điệp: *"[Đối thủ] phát động Đấu Điểm với bạn! Chọn 1 lá bài trên tay để đọ điểm..."*.
4. **[BotBrain.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/ai/BotBrain.js):**
   - Bot nhận diện cả vũ khí trên tay để dùng Tiên Phong mà không mất máu.
   - Bot tự động phản hồi lá bài cao nhất khi là đối thủ bị thách đấu đấu điểm.

## Kết Quả Kiểm Thử (Verification & QA)
- 100/100 test files (892/892 tests) pass 100%.
- Bộ test QA mới [TienPhongAndPointDuelQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/heroes/TienPhongAndPointDuelQA.test.js) & [TienPhongAndVanDonModalQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/TienPhongAndVanDonModalQA.test.jsx) pass 100%.
- Chạy stress test 100 trận tầng ứng dụng qua Dispatcher: 100/100 trận thành công, 0 lỗi, 0 deadlock.
