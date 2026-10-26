# ADR 0079: Hệ Thống Hóa Giải Cẩm Nang Trì Hoãn & Khóa Thao Tác Thẻ Bài Phản Ứng Trong Lượt (Delayed Trick Negate Window & Reaction Card Safety)

## Bối Cảnh (Context)
Trong quá trình trải nghiệm thực chiến của người chơi, hai lỗi logic nghiêm trọng liên quan đến cẩm nang [Hỗn Loạn] (`hon_loan`) và lá bài [Hóa Giải] (`hoa_giai`) đã được phát hiện:

1. **Lỗi 1 — Bị Hỗn Loạn nhưng người cầm lá Hóa Giải không được hỏi:**
   - Khi một người chơi sử dụng [Hỗn Loạn] lên đối thủ, hoặc khi một người chơi bước vào Pha Phán Xét của [Hỗn Loạn], dù trên tay người chơi (hoặc đồng minh) đang có lá [Hóa Giải] (hoặc kỹ năng *Linh Giám* của Rùa Vàng, *Chương Dương* của Trần Quang Khải), hệ thống hoàn toàn không mở cửa sổ hỏi Hóa Giải (`ASK_NEGATE`).
   - Kết quả: Lá Hỗn Loạn được đặt thẳng vào khu phán xét hoặc tự động lật bài phán xét, tước bỏ hoàn toàn năng lực phản kháng của người chơi.

2. **Lỗi 2 — Lá Hóa Giải tự sử dụng "kiểu dùng bỏ" trong Pha Hành Động:**
   - Trong Pha Hành Động (`PHASES.ACTION`), khi người chơi nhấp vào lá [Hóa Giải] trên tay, hệ thống vẫn hiển thị nút "Dùng" (hoặc tự động kích hoạt phiên sử dụng).
   - Khi bấm Dùng, lệnh `PLAY_CARD` gửi lên `DispatcherV4.js`. Do thiếu nhánh kiểm tra, lệnh rơi vào nhánh `default`: tự động trừ lá bài trên tay đưa vào chồng bài bỏ (`discardPile`) và ghi log `[08:18:52] Bạn sử dụng [Hóa Giải].` mà hoàn toàn không có bất kỳ hiệu ứng nào.
   - Thẻ bài quý giá bị vứt bỏ như rác một cách vô nghĩa.

---

## Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis)

1. **Về Cẩm Nang Trì Hoãn ([TrickRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/TrickRules.js)):**
   - *Khi thi triển:* Nhánh `isDelayed` nhảy thẳng vào hàm `_playDelayedTrick()`, chỉ thực hiện thao tác chuyển bài từ tay vào `target.judgementArea` mà bỏ qua hoàn toàn hàm `_startNegateChain()`.
   - *Khi phán xét (`resolveJudgementPhase`):* Hàm dùng vòng lặp đồng bộ `while`, lập tức rút bài `state.drawCardFromDeck()` và kiểm tra đổi phán xét (`ASK_CHANGE_JUDGE`), hoàn toàn bỏ quên cửa sổ `Judgement Negate Window` đã được quy định trong ADR 0005.

2. **Về Thẻ Bài Phản Ứng ([GameViewMapperV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/GameViewMapperV4.js) & [DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js)):**
   - Trong `GameViewMapperV4.js`, bộ tính toán `isPlayable` chỉ chặn lá `Né` (`card.name === 'Né'`), bỏ sót lá `Hóa Giải`. Do đó trên ViewModel lá Hóa Giải mang `isPlayable = true`.
   - Trong `useCardInteraction.js`, khi `targetingDef.type === 'none'`, hook coi lá bài là auto-cast và mở session sử dụng.
   - Trong `DispatcherV4.js`, nhánh `default` của `_handlePlayCard` thực thi `this.state.discardFromHand(sourceId, [card.id])`, gây mất bài âm thầm.

---

## Quyết Định Thiết Kế (Architectural Decisions)

### 1. Cửa Sổ Hóa Giải Cẩm Nang Trì Hoãn 2 Giai Đoạn (Two-Phase Delayed Trick Negate Window)
- **Hàm thẩm định nhanh (`hasAnyNegatePlayer`):** Kiểm tra tức thì xem trên toàn bàn đấu có người chơi nào còn sống sở hữu lá bài [Hóa Giải] trên tay, hoặc có bài Đen với *Linh Giám*, hoặc có trang bị với *Chương Dương* hay không. Nếu không ai có, hệ thống không mở frame thừa để giữ nhịp độ trận đấu và tối ưu hiệu năng.
- **Giai đoạn 1 (Khi Thi Triển):** Trong `TrickRules._playDelayedTrick`, nếu `hasAnyNegatePlayer` là `true`, mở vòng hỏi `_startNegateChain` với `{ isDelayedTrick: true, delayedTargetId: targetId }`. Nếu bị Hóa Giải, lá bài rơi vào `discardPile`, không được đặt vào khu phán xét.
- **Giai đoạn 2 (Pha Phán Xét):** Trong `TrickRules.resolveJudgementPhase`, trước khi rút bài phán xét, nếu `hasAnyNegatePlayer` là `true`, đẩy frame `ASK_NEGATE` với `{ isJudgementNegate: true, delayedCard }`. Vòng hỏi mở theo chiều kim đồng hồ bắt đầu từ chính người bị phán xét. Nếu Hóa Giải thành công, cẩm nang rơi vào `discardPile`, người chơi không bị phán xét và không mất lượt.

### 2. Thiết Lập 3 Tầng Chốt Chặn Bất Biến Khóa Thao Tác Thẻ Phản Ứng
- **Tầng 1 (ViewModel - [GameViewMapperV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/GameViewMapperV4.js)):** Gán cố định `isPlayable = false` và `unplayableReason = 'Lá [Hóa Giải] chỉ có thể sử dụng khi phản ứng cẩm nang'` cho lá Hóa Giải trong Pha Hành Động.
- **Tầng 2 (Tương Tác Client - [useCardInteraction.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/hooks/useCardInteraction.js)):** Chặn nhấp chuột vào lá Hóa Giải / Né khi không có kỹ năng chuyển hóa chủ động, đồng thời thông báo cảnh báo qua toast/log.
- **Tầng 3 (Thực Thi Core - [DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js)):** Ném ngoại lệ `throw new Error(...)` nếu nhận lệnh `PLAY_CARD` với lá Hóa Giải / Né trong Pha Hành Động, triệt tiêu hoàn toàn nguy cơ tự ý bỏ bài vào bãi rác.

### 3. Đồng Bộ Giao Diện Modal Hóa Giải ([ModalContainer.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/ModalContainer.jsx))
- Khi `req.isJudgementNegate` kích hoạt, thông điệp hiển thị trang trọng và chính xác:
  `⚖️ Sắp phán xét cẩm nang trì hoãn [Tên Cẩm Nang] cho [Tên Người Chơi]. Bạn có muốn dùng [Hóa Giải] để vô hiệu hóa không?`

### 4. Xử Lý Toàn Diện Binh Lương Thốn Đoạn & Tiệt Trừ Auto-Discard
- **Binh Lương Thốn Đoạn ([DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js)):** Bổ sung nhánh xử lý cẩm nang Binh Lương Thốn Đoạn (`cardName === 'Binh Lương Thốn Đoạn' || cardName === 'Binh Lương' || card.idKey === 'binh_luong'`), tích hợp kiểm tra cự ly $\le 1$ và hỗ trợ kỹ năng cự ly vô hạn của Tiên Dung (`tien_duyen_khoang_cach`).
- **Triệt Tiêu Nhánh Fallback Vứt Bài:** Thay thế toàn bộ logic auto-discard trong nhánh mặc định của `_handlePlayCard` bằng lệnh `throw new Error(...)` minh bạch. Không một lá bài nào của người chơi bị âm thầm vứt bỏ nữa.
- **Hóa Giải Đòn Diện Rộng Cá Nhân (Personal AOE Negate):** Khi trúng đòn [Nam Man Xâm Nhập] hoặc [Vạn Tiễn Quy Tâm], cho phép người chơi sử dụng lá [Hóa Giải] (hoặc Linh Giám với bài Đen) trên [ModalContainer.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/ModalContainer.jsx) để tự bảo vệ bản thân, vô hiệu hóa sát thương cho riêng mình.

---

## Kiểm Định & Kết Quả (Verification)
1. **Bộ Test Suite Mới ([ChaosAndNegateQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/rules/ChaosAndNegateQA.test.js)):**
   - Đạt **10/10 tests PASS (100%)**:
     - Test 1: Hóa Giải cẩm nang Hỗn Loạn khi đối thủ vừa thi triển thành công.
     - Test 2: Bỏ qua Hóa Giải khi thi triển thì cẩm nang vào khu phán xét an toàn.
     - Test 3: Hóa Giải phán xét Hỗn Loạn trong Pha Phán Xét, giải trừ hoàn toàn hình phạt.
     - Test 4: Lá Hóa Giải mang `isPlayable = false` trên ViewModel trong Pha Hành Động.
     - Test 5: Dispatcher từ chối lệnh `PLAY_CARD` lá Hóa Giải trong Pha Hành Động.
     - Test 6: Dispatcher xử lý chuẩn xác [Binh Lương Thốn Đoạn], mở cửa sổ Hóa Giải và đưa vào khu phán xét.
     - Test 7: Phán xét Binh Lương Thốn Đoạn: không phải Nhép (♣) thì bị mất Pha Rút Bài (`skipDrawPhase = true`).
     - Test 8: Nhánh fallback ném lỗi chuẩn xác, tuyệt đối không tự tiện vứt bài của người chơi.
     - Test 9: Trúng Dã Man, dùng lá Hóa Giải tự cứu mình, không mất máu và không mất Chém.
     - Test 10: Trúng Vạn Tiễn, dùng lá Hóa Giải tự cứu mình, không mất máu và không mất Né.

### 4. Sửa lỗi Quyết Đấu (ASK_SLASH_DUEL) bị đứng hình khi Bot/Người 4 đánh Chém (Falsy 0 Bug)
- **Triệu chứng:** Người chơi 0 dùng [Quyết Đấu] lên Người chơi 4. Người chơi 4 đánh ra [Chém]. Sau đó trận đấu đứng yên hoàn toàn ("im luôn"), không hiển thị pop-up hỏi người chơi 0 đánh Chém hay dùng kỹ năng Khai Thiên / Dời Núi.
- **Nguyên nhân cốt lõi:**
  1. Trong JavaScript, `0` là giá trị falsy.
  2. Tại `GameViewMapperV4.js` trước đây:
     ```javascript
     responderId: frame.currentActorId || frame.context?.currentResponderId || frame.targetId
     ```
     Khi Người chơi 4 (id = 3) đánh Chém, engine chuyển lượt phản ứng lại cho Người chơi 0 (`currentActorId = 0`, `currentResponderId = 0`).
     Biểu thức `0 || 0 || 3` trả về **3** thay vì `0`!
     Hậu quả: `vm.waitingForResponse.responderId` bị gán là **3**.
  3. Tại `ModalContainer.jsx`:
     `if (req.type === 'ask_slash' && req.reason === 'quyet-dau' && req.responderId === me.id)`
     Vì `req.responderId` là 3 còn `me.id` là 0, điều kiện sai -> **Modal không bao giờ xuất hiện cho Người chơi 0**.
  4. BotRunner thấy `waitingForResponse` trỏ tới người chơi 0 (vì BotRunner dùng `??`), mà Người chơi 0 là người thật (`isBot: false`) nên bot không đánh hộ -> Hệ thống deadlock vĩnh viễn.
- **Giải pháp:**
  1. Chuyển toàn bộ toán tử logic `||` sang nullish coalescing `??` trong `GameViewMapperV4.js` cho tất cả các frame phản ứng: `ASK_SLASH_DUEL`, `ASK_SLASH_RESPONSE`, `ASK_HAU_VIEN`, `ASK_WEAPON_SKILL`, `ASK_DISMANTLE`, `ASK_SNATCH`.
  2. Đặt `responderId: currentResponder` phía sau `...frame.context` để đảm bảo không bao giờ bị ghi đè thuộc tính cũ từ context.
  3. Bổ sung thông tin đối thủ rõ ràng trên `ModalContainer.jsx`: `⚡ Quyết Đấu với ${opponentName}!`.
  4. Chuẩn hóa tên kỹ năng cho cả dạng snake_case (`doi_nui`, `khai_thien`) và kebab-case (`doi-nui`, `khai-thien`).
  5. Thêm alias `RESPOND_ACTION` cho DispatcherV4 để tương thích hoàn toàn cả hai chuẩn action type.

---

## Kết quả Kiểm Thử & Nghiệm Thu
1. **Kiểm thử tự động chuyên sâu (`ChaosAndNegateQA.test.js`):**
   - Đạt **12/12 test cases** (bao gồm Test 11 & Test 12 cho Quyết Đấu và phản ứng kỹ năng Khai Thiên).
2. **Hệ Thống Test Toàn Dự Án:**
   - **87/87 test suites passed**.
   - **765/765 unit & integration tests passed (100%)**.
   - **Chạy 200 ván mô phỏng bot ngẫu nhiên:** 0 lỗi exception, 0 deadlock.
