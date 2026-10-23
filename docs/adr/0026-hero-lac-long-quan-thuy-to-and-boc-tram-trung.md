# ADR 0026: Thiết Kế & Quy Chuẩn Kỹ Năng Lạc Long Quân (Thủy Tổ & Bọc Trăm Trứng)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Lạc Long Quân (Đức Thủy Tổ, con trai Kinh Dương Vương, vị Quốc Tổ tối cao của dân tộc Việt Nam) là **Chúa Công (Lãnh Tụ Phe)** của hệ 🟢 LẠC (Thục) với lượng máu cơ bản 4 HP (Nam). Danh tướng nắm giữ vai trò thủ lĩnh thống lĩnh toàn quân với 2 kỹ năng trụ cột:
1. **Thủy Tổ (Ancestral Benevolence - Active Skill)**: Trong pha Hành động, Lạc Long Quân có thể giao các lá bài trên tay cho đồng minh. Nếu trao từ 2 lá bài trở lên trong một lượt phát động, Lạc Long Quân được lập tức sử dụng một lá Bài Cơ Bản ([Chém], [Đào], hoặc [Rượu]) hoàn toàn miễn phí.
2. **Bọc Trăm Trứng (Egg Sack Legacy - Lord Skill / Reactive)**: Chúa Công Kỹ của phe Lạc:
   - Khi Lạc Long Quân cần đánh ra [Né] (đỡ Chém): có thể kêu gọi toàn bộ tướng đồng minh thuộc phe Lạc trên bàn đấu ra [Né] giùm mình.
   - Khi Lạc Long Quân cần đánh ra [Chém] (trong Quyết Đấu hoặc chịu ảnh hưởng của Nam Man Xâm Nhập): có thể kêu gọi đồng minh phe Lạc ra [Chém] giùm mình.

## Quyết định Thiết kế (Decisions)

### 1. Thủy Tổ — Trao Bài Đồng Minh & Thưởng Bài Cơ Bản
- **Kích hoạt**:
  - Gửi action `ACTION_USE_SKILL` với `skillId: 'thuy_to'` trong Pha Ra Bài (`PHASES.ACTION`).
  - Dispatcher đẩy frame `ASK_THUY_TO` với `context: { reason: 'thuy_to', maxCards: player.hand.length }`.
- **Chuyển giao bài nguyên tử (Atomic Transfer)**:
  - Lạc Long Quân chọn đồng minh nhận (`selectedAlly`) và danh sách bài gửi (`selectedCardIds`).
  - Toàn bộ bài được cắt an toàn khỏi tay Lạc Long Quân và bổ sung vào bài tay đồng minh mà không qua trung gian Discard Pile, bảo toàn tổng lượng bài trên bàn (`GameInvariants`).
- **Phần thưởng khi cho $\ge 2$ lá bài**:
  - Nếu `transferredCards.length >= 2`, hệ thống tự động đẩy tiếp frame `ASK_THUY_TO_BONUS`.
  - Lạc Long Quân chọn 1 trong 3 hiệu ứng Bài Cơ Bản ảo miễn phí (`virtualCardName`):
    - **[Đào]**: Hồi phục 1 HP nếu máu chưa đạt `maxHp` (`player.hp += 1`).
    - **[Rượu]**: Kích hoạt trạng thái say rượu (`player.temporaryFlags.wineActive = true`), tăng +1 sát thương cho cú Chém tiếp theo.
    - **[Chém]**: Kích hoạt đòn Chém ảo không tốn bài tay (`CombatRules.playSlash(state, playerId, targetId, { name: 'Chém', virtual: true })`), buộc mục tiêu phải đáp trả [Né].

### 2. Bọc Trăm Trứng — Chúa Công Kỹ Tương Trợ Toàn Phe
- **Cơ chế kêu gọi đồng minh (Lord Call)**:
  - Khi xuất hiện yêu cầu Né (`ASK_DODGE`), Lạc Long Quân có thể chọn `callBocTramTrung: true`.
  - Hệ thống quét danh sách tất cả đồng minh còn sống thuộc phe Lạc (`p.faction === 'lac' && p.id !== llq.id`).
  - Đẩy frame `ASK_BOC_TRAM_TRUNG_DODGE` với hàng đợi ưu tiên `priorityQueue: allies.map(a => a.id)`.
- **Ủy quyền đỡ đòn & chuỗi chuyển tiếp (Queue Cascade)**:
  - Đồng minh đầu tiên trong hàng đợi nhận yêu cầu.
  - Nếu đồng minh chọn cung cấp [Né] (`doProvide: true`, `cardId`):
    - Lá [Né] của đồng minh bị bỏ xuống Discard Pile.
    - Frame `ASK_BOC_TRAM_TRUNG_DODGE` và `ASK_DODGE` lập tức được giải phóng thành công, Lạc Long Quân an toàn không mất máu.
  - Nếu đồng minh từ chối (`doProvide: false` / `skip`):
    - Hàng đợi tự động dịch chuyển sang đồng minh phe Lạc tiếp theo (`frame.context.allyIndex++`).
    - Nếu tất cả đồng minh đều từ chối, frame Bọc Trăm Trứng đóng lại, quyền quyết định trả lại cho Lạc Long Quân (tự đánh Né từ tay/kỹ năng riêng hoặc chịu sát thương).
- **Hỗ trợ Chém giùm trong Quyết Đấu (`ASK_BOC_TRAM_TRUNG_SLASH`)**:
  - Khi Lạc Long Quân bị Quyết Đấu, đồng minh phe Lạc có thể ném lá [Chém] giùm. Khi đồng minh đánh Chém, lượt Quyết Đấu chuyển ngược lại cho kẻ khiêu chiến mà Lạc Long Quân không tốn bài.

## Hệ Quả (Consequences)
- Lạc Long Quân là vị tướng hạt nhân, liên kết chặt chẽ sức mạnh của toàn bộ phe Lạc.
- Khả năng tiếp tế bài và sử dụng Đào/Chém miễn phí của Thủy Tổ mang lại nguồn lực khổng lồ cho đồng đội.
- Bọc Trăm Trứng biến Lạc Long Quân thành một Chúa Công cực kỳ kiên cố khi có các đồng minh Lạc bên cạnh bảo bọc.
