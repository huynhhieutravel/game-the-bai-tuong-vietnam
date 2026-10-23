# ADR 0034: Thiết Kế & Kiểm Định Tướng Tuệ Tĩnh — Nam Dược & Diệu Dược

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Đại danh y Tuệ Tĩnh (Thiền sư Tuệ Tĩnh), vị thánh thuốc Nam với phương châm vĩ đại "Nam dược trị Nam nhân", là bậc lương y lỗi lạc trong lịch sử dân tộc. Trong Việt Sát v4, Tuệ Tĩnh thuộc phe 🟢 Sơn với vai trò cứu tế kiệt xuất, sở hữu 2 kỹ năng danh y trứ danh:
1. **Nam Dược (`nam_duoc`)**: Có thể dùng bất kỳ lá bài Đỏ nào làm lá [Đào] để cứu người hấp hối ngoài lượt của mình.
2. **Diệu Dược (`dieu_duoc`)**: Trong lượt đi (Pha ra bài), mỗi lượt 1 lần, bỏ 1 lá bài trên tay để hồi 1 HP cho một người chơi bất kỳ chưa đầy máu (bao gồm bản thân hoặc đồng minh).

## Quyết định Kỹ thuật
1. **Nam Dược (`nam_duoc` - Passive Reaction):**
   - Tích hợp tại `CombatRules.respondPeach` và `DispatcherV4` trong pha xử lý hấp hối (`ASK_PEACH`).
   - **Ràng buộc nghiêm ngặt:** Chỉ có hiệu lực khi Tuệ Tĩnh ở **ngoài lượt** của bản thân (`state.currentTurnPlayerId !== rescuerId`).
   - Lá bài phản ứng được phép biến đổi là bất kỳ lá bài có màu đỏ (`card.color === 'red'` hoặc chất Cơ/Rô).
   - Nếu trong lượt của mình hoặc lá bài là màu Đen, hệ thống từ chối biến đổi và yêu cầu lá [Đào] thực sự.

2. **Diệu Dược (`dieu_duoc` - Active Skill):**
   - Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
   - Chi phí: Bỏ 1 lá bài trên tay (`options.cardId` / `cardIds`), đưa vào chồng bài bỏ (`discardPile`).
   - Giới hạn: Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.dieu_duoc.usedThisTurn = true`).
   - Mục tiêu: Bắt buộc mục tiêu chưa đầy Máu (`target.hp < target.maxHp`). Nếu mục tiêu đã đầy máu, hành động bị từ chối với thông báo lỗi.
   - Hỗ trợ cả kích hoạt trực tiếp và qua modal tương tác `ASK_DIEU_DUOC`.

## Hệ quả & Kiểm định
- Đã tạo test suite độc lập: `shared/engine_v4/__tests__/heroes/TueTinhQA.test.js` kiểm tra 6/6 kịch bản:
  - Thuộc tính HeroRegistry phe Sơn (3 HP, Nam Dược, Diệu Dược).
  - Nam Dược dùng Chém Đỏ cứu đồng minh ngoài lượt thành công.
  - Nam Dược chặn dùng bài Đen làm Đào.
  - Diệu Dược bỏ 1 bài hồi 1 HP cho đồng minh/bản thân.
  - Ràng buộc "Mỗi lượt 1 lần" của Diệu Dược.
  - Chặn Diệu Dược lên mục tiêu đã đầy Máu.
- 100% test cases đã vượt qua.
