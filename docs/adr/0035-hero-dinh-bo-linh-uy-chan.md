# ADR 0035: Thiết Kế & Kiểm Định Tướng Đinh Bộ Lĩnh — Kỹ Năng Uy Chấn

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Vạn Thắng Vương Đinh Bộ Lĩnh là vị anh hùng kiệt xuất dẹp loạn 12 sứ quân, thống nhất giang sơn lập nên nhà nước Đại Cồ Việt. Trong Việt Sát v4, ông thuộc phe 🟢 Sơn với lượng sinh lực khổng lồ (6 HP) và sở hữu kỹ năng Tỏa định uy nghiêm **Uy Chấn** (`uy_chan`).

## Quyết định Kỹ thuật
1. **Uy Chấn (`uy_chan` - Passive Lock Skill):**
   - Sự kiện kích hoạt: `ON_DAMAGED` khi Đinh Bộ Lĩnh nhận sát thương.
   - **Bộ lọc điều kiện nghiêm ngặt (`filter`):**
     - Đinh Bộ Lĩnh phải chính là mục tiêu nhận sát thương (`ctx.ownerId === ctx.targetId`).
     - Sát thương phải xuất phát từ một lá [Chém] (`type === 'slash'` hoặc `reason === 'slash'`).
     - Lá [Chém] gây sát thương phải mang màu Đỏ (`card.color === 'red'` hoặc chất Cơ/Rô).
     - Loại trừ hoàn toàn sát thương từ Chém Đen hoặc các lá Cẩm nang (Hỏa Công, Quyết Đấu, Loạn Tiễn, Sấm Sét).
   - **Quyền lựa chọn của kẻ tấn công:**
     - Kẻ tấn công được hưởng ân điển chọn: hồi 1 điểm HP hoặc rút 1 lá bài từ bộ bài rút.
     - Nếu kẻ tấn công đang bị thương (`attacker.hp < attacker.maxHp`) và chọn hồi máu (`choice: 'heal'`), hắn hồi 1 HP.
     - Nếu kẻ tấn công chọn rút bài (`choice: 'draw'`) hoặc đã đầy máu, hệ thống cho rút 1 lá bài.
     - Nếu kẻ tấn công không còn sống (chết do phản đam/sự kiện trước đó), không phát động.

## Hệ quả & Kiểm định
- Đã kiểm định hoàn tất qua bộ test suite Vitest: `shared/engine_v4/__tests__/heroes/DinhBoLinhQA.test.js` (7/7 bài test vượt qua 100%):
  - Thuộc tính HeroRegistry phe Sơn (6 HP, Uy Chấn).
  - Hồi 1 HP khi chọn 'heal'.
  - Rút 1 bài khi chọn 'draw'.
  - Tự động rút 1 bài khi đầy máu.
  - Chặn khi bị Chém Đen.
  - Chặn khi nhận sát thương từ Cẩm nang (Hỏa Công).
  - Chống nhảy ké khi người khác bị chém.
