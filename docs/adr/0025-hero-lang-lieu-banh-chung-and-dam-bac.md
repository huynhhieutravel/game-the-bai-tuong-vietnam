# ADR 0025: Thiết Kế & Quy Chuẩn Kỹ Năng Lang Liêu (Bánh Chưng & Đạm Bạc)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Lang Liêu (hoàng tử thứ mười tám của Hùng Vương thứ sáu, người sáng tạo ra Bánh Chưng, Bánh Giầy biểu trưng cho Trời và Đất) là danh tướng thuần hậu của phe 🟢 LẠC (Thục) với lượng máu chuẩn 3 HP (Nam). Vị tướng này mang lối chơi phán đoán, kiểm soát chu kỳ vận hành của bộ bài và khả năng phòng thủ tuyệt đối khi rơi vào thế cạn kiệt tài nguyên:
1. **Bánh Chưng (Quan Tinh - Reactive / Turn Skill)**: Đầu lượt (Pha Bắt đầu - BEGIN Phase), Lang Liêu được xem $X = \min(\text{alivePlayersCount}, 5)$ lá bài trên đỉnh chồng bài rút. Sau đó, tùy ý sắp xếp số bài này lên đỉnh hoặc đặt xuống đáy bộ bài rút theo thứ tự mong muốn.
2. **Đạm Bạc (Frugal Simplicity - Lock Skill)**: Khi trên tay Lang Liêu hoàn toàn không có bài (0 lá bài trên tay), Lang Liêu miễn nhiễm tuyệt đối, không thể bị chọn làm mục tiêu của [Chém] (Slash) hoặc [Quyết Đấu] (Duel).

## Quyết định Thiết kế (Decisions)

### 1. Bánh Chưng — Kiểm Soát & Sắp Xếp Chồng Bài Rút
- **Trigger**: Kích hoạt tại sự kiện `BEGIN_PHASE` thông qua `globalHeroRegistry.dispatchTrigger('BEGIN_PHASE', { sourceId: player.id }, state)`.
- **Số lượng bài xem**:
  $$X = \min(\text{alivePlayersCount}, 5)$$
  Tự động kiểm tra `state.drawPile.length`. Nếu không đủ $X$ lá bài, lập tức kích hoạt `state.recycleDiscardPile()` để bảo đảm an toàn dữ liệu, chống crash.
- **Priority Stack Frame**:
  - Pushes frame `{ type: 'ASK_BANH_CHUNG', sourceId, targetId, currentActorId, context: { viewedCards, viewCount } }`.
- **Dispatcher & Phản ứng**:
  - Người chơi hoặc AI (`BotBrain`) trả về payload `{ type: 'ACTION_REACT', deckTop: [...], deckBottom: [...] }` hoặc `orderedCards`.
  - Dispatcher cắt bỏ $X$ lá bài đã xem khỏi `drawPile`, sau đó ghép `[...deckBottomReversed, ...drawPile, ...deckTopReversed]`.
  - Khi rút bài ở các pha tiếp theo (Pha Phán xét, Pha Rút bài), các lá bài xếp trên `deckTop` sẽ lần lượt được rút ra trước tiên một cách chuẩn xác.
- **Tự động chuyển pha**:
  - Sau khi người chơi giải quyết xong frame `ASK_BANH_CHUNG` ở pha Bắt đầu và priority stack trống, `StateMachine` tự động gọi `_completeBeginPhase()` để chuyển tuần tự sang Pha Phán xét (`PHASES.JUDGE`) rồi Pha Rút bài (`PHASES.DRAW`).

### 2. Đạm Bạc — Khi Không Có Bài Miễn Nhiễm Chém & Quyết Đấu
- **Ràng buộc [Chém]**:
  - `CombatRules.playSlash`: Ném lỗi `[CombatRules] Lang Liêu đang kích hoạt [Đạm Bạc] (hết bài trên tay), không thể bị Chém!` nếu cố ý tấn công.
  - `RangeSystem.getValidSlashTargets`: Tự động loại trừ người chơi có kỹ năng `dam_bac` khi `(!target.hand || target.hand.length === 0)`.
  - `TargetResolverV4.js` (`validateTargetPayload` & `getAvailableTargets`): Loại trừ Lang Liêu khỏi danh sách mục tiêu có thể chọn của [Chém].
- **Ràng buộc [Quyết Đấu]**:
  - `TrickRules.playTrick`: Ném lỗi `[TrickRules] Lang Liêu đang kích hoạt [Đạm Bạc] (hết bài trên tay), không thể bị Quyết Đấu!` khi thi triển cẩm nang [Quyết Đấu] vào mục tiêu.
  - `TargetResolverV4.js` (`getTargetingDefinition` -> `case 'quyet-dau'`): Bộ lọc mục tiêu tự động loại trừ Lang Liêu khi hết bài tay.
- **Phạm vi bảo hộ**:
  - Kỹ năng chỉ bảo vệ trước [Chém] và [Quyết Đấu]. Các cẩm nang hoặc chiêu thức khác như [Cướp Bài], [Quá Hà Tách Cầu], [Nam Man Xâm Nhập], [Vạn Tiễn Quy Tâm], [Hỏa Công] vẫn tác dụng bình thường lên Lang Liêu.

## Hệ Quả (Consequences)
- Lang Liêu có thể bảo vệ bản thân và đồng đội bằng cách xếp các lá bài có lợi lên đỉnh trước lượt rút hoặc chuyển các lá bài phán xét nguy hiểm (Sấm Sét, Hỗn Loạn) xuống đáy.
- Lối chơi "làm rỗng bài tay" của Lang Liêu tạo ra thế phòng ngự khó chịu, buộc kẻ địch phải dùng Cẩm Nang phá trang bị hoặc sát thương gián tiếp thay vì Chém trực diện.
