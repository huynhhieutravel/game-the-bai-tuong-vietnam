# 0008. Khôi Phục Cơ Chế Xiềng Xích, Sát Thương Lôi Hỏa Liên Hoàn & Cẩm Nang Trì Hoãn

- **Status:** Accepted
- **Date:** 2026-10-23

## Ngữ Cảnh (Context)
Trong quá trình hiện đại hóa Engine v4, một số cơ chế cẩm nang chiến thuật phức tạp từ GDD (`docs/01_Gameplay_Rules.md`, `docs/03_Trick_Cards.md`) bị thiếu hoặc chưa đồng bộ với kiến trúc `PriorityStack` và bất biến bảo toàn thẻ bài (`Card Conservation Invariant`):
1. **Xiềng Xích (Iron Chains) & Rèn Lại (Reforge):** Xiềng Xích vừa có thể dùng để khóa/mở xích 1–2 người chơi, vừa có thể "Rèn Lại" (bỏ bài rút 1 lá mới) mà không kích hoạt chuỗi Hóa Giải (`ASK_NEGATE`).
2. **Sát Thương Lôi Hỏa Liên Hoàn (Chained Elemental Damage):** Khi người chơi bị khóa xích (`isChained === true`) nhận sát thương nguyên tố (Lôi / Hỏa), xích bị phá giải (`isChained = false`) và sát thương phải lập tức lan truyền sang tất cả người chơi đang bị khóa xích khác trên bàn.
3. **Cẩm Nang Trì Hoãn (Delayed Tricks - Hỗn Loạn & Sấm Sét):** Các lá bài này không kích hoạt ngay mà được đặt vào `judgementArea` của mục tiêu, chờ đến Giai đoạn Phán Xét (`JUDGE`) để lật bài xác định kết quả. Đồng thời, việc chuyển giao thẻ bài từ tay vào khu phán xét phải tuyệt đối tuân thủ Invariant bảo toàn, tránh lỗi nhân đôi thẻ bài vào `discardPile`.

## Quyết Định (Decision)

### 1. ⛓️ Xiềng Xích & Rèn Lại (Iron Chains & Reforge)
- **Rèn Lại (`reforge`):** Trong `TrickRules.playTrick`, nếu người chơi chọn `extraArgs.reforge = true` hoặc không chọn mục tiêu nào (`targets.length === 0`), lá bài lập tức được đưa vào `discardPile` và người chơi rút ngay 1 lá bài mới từ `drawPile`. Hành động này **không** mở khung ưu tiên Hóa Giải (`ASK_NEGATE`).
- **Khóa / Tháo Xích:** Khi chọn mục tiêu, sau khi vượt qua chuỗi Hóa Giải, `TrickRules._executeTrickEffect` đảo ngược trạng thái `target.isChained = !target.isChained` cho từng mục tiêu hợp lệ.

### 2. ⚡ Sát Thương Lôi Hỏa Liên Hoàn (Chained Elemental Damage)
- Trong `CombatRules.applyDamage(state, sourceId, targetId, damageAmount, reason, isChainedPropagation = false)`:
  - Nếu `reason` thuộc loại nguyên tố (`'lightning'`, `'fire'`, `'flame'`, hoặc bắt đầu bằng `'elemental'`) và mục tiêu ban đầu có `target.isChained === true`:
    - Mục tiêu lập tức được mở xích: `target.isChained = false`.
    - Nếu đây là cú đánh gốc (`!isChainedPropagation`), hệ thống tìm tất cả người chơi còn sống khác có `isChained === true`.
    - Lan truyền sát thương cùng loại và cùng lượng sát thương đến từng người này với cờ `isChainedPropagation = true`.
    - Cờ này bảo vệ hệ thống tuyệt đối khỏi đệ quy vô hạn hoặc lặp vòng tròn.

### 3. ⏳ Cẩm Nang Trì Hoãn & Bảo Toàn Thẻ Bài (Delayed Tricks & Invariant)
- **Quy trình Di Chuyển Thẻ Bài:**
  - Trong `TrickRules.playTrick`: Cẩm nang trì hoãn (`isDelayed`) được phát hiện trước khi gọi `discardFromHand`. Thẻ bài được chuyển **trực tiếp** từ `hand` của người chơi sang `target.judgementArea` mà **không** đưa vào `discardPile`.
  - Điều này giải quyết triệt để lỗi nhân đôi thẻ bài (từ 106 lên 107–110 lá) trong các ván đấu dài.
- **Tái Chế Chồng Bài Rút An Toàn (`drawCardFromDeck`):**
  - Thêm phương thức `recycleDiscardPile()` và `drawCardFromDeck()` vào `GameState.js`.
  - Khi rút bài phán xét cho Bát Quái, Thần Giáp, Sấm Sét hay Hỗn Loạn, nếu `drawPile` cạn bài, hệ thống tự động xào lại `discardPile` mà không ném ngoại lệ `undefined`.
- **Giai đoạn Phán Xét (`StateMachine._runPhaseJudge` & `TrickRules.resolveJudgementPhase`):**
  - Lấy lần lượt các lá bài trong `judgementArea` theo thứ tự LIFO (vào sau phán xét trước).
  - **Sấm Sét (`sam_set`):** Lật bài phán xét. Nếu là chất Bích (♠) từ 2 đến 9, nổ 3 sát thương lôi (`'lightning'`), lá bài đi vào `discardPile`, và sát thương tự động kích hoạt lan truyền liên hoàn. Nếu không nổ, lá bài chuyển sang `judgementArea` của người sống sót kế tiếp theo chiều kim đồng hồ.
  - **Hỗn Loạn (`hon_loan` - Binh Lương Thốn Đoạn):** Lật bài phán xét và đưa cẩm nang vào `discardPile`. Nếu phán xét **không phải Cơ (♥)**, đặt cờ tạm thời `player.temporaryFlags.skipActionPhase = true`. Trong `StateMachine._runPhaseDraw`, cờ này khiến lượt chơi nhảy cóc thẳng từ Giai đoạn Rút Bài sang Giai đoạn Bỏ Bài (`DISCARD`), vô hiệu hóa hoàn toàn Giai đoạn Ra Bài của người chơi.

## Hệ Quả (Consequences)
1. **Kiểm thử Đạt Chuẩn 100%:**
   - Bộ kiểm thử chuyên biệt `ChainedAndDelayedTricks.test.js` (7/7 tests) và toàn bộ 20 test suite (135/135 tests) chạy thành công không một lỗi lầm.
2. **Đại Giả Lập 1.000 Trận Vượt Qua Tuyệt Đối:**
   - 1.000/1.000 trận mô phỏng hoàn thành hợp lệ trong 0.37 giây.
   - 0 lỗi vi phạm Invariant bảo toàn bài, 0 biệt lệ chưa bắt, 0 treo vòng lặp.
