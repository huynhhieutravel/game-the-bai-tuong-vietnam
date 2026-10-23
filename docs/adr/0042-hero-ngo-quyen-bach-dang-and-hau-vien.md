# ADR 0042: Chuẩn Hóa Cơ Chế Tướng Ngô Quyền — Bạch Đằng & Hậu Viện

## 1. Bối cảnh & Hiện trạng
Ngô Quyền (`ngo_quyen`) là Tiền Ngô Vương, bậc Chúa Công khai quốc thuộc **Phe 🔵 HÀ**, sở hữu 4 HP và 2 kỹ năng:
1. **Bạch Đằng (`bach_dang`):** Kỹ năng chủ động trong Pha Ra bài (`PHASES.ACTION`). Cho phép đổi bài linh hoạt: bỏ X lá bài trên tay để rút X lá bài mới. Đặc biệt, nếu người chơi quyết định bỏ sạch toàn bộ bài trên tay, hệ thống ban thưởng thêm +1 lá bài rút (`drawCards = count + 1`). Giới hạn sử dụng 1 lần mỗi lượt (`usedThisTurn`).
2. **Hậu Viện (`hau_vien`):** Chúa Công Kỹ của phe Hà. Khi một đồng minh thuộc phe Hà sử dụng [Đào] lên bản thân trong lượt, nếu họ có lượng HP lớn hơn Ngô Quyền hoặc Ngô Quyền đang bị thương, hệ thống sẽ mở khung phản hồi `ASK_HAU_VIEN` cho phép đồng minh nhường quả Đào đó cho Ngô Quyền hồi 1 HP, đổi lại đồng minh được rút thưởng 1 lá bài từ bộ bài.

## 2. Quyết định Kỹ thuật
- **Bạch Đằng:**
  - Hỗ trợ cả 2 phương thức kích hoạt:
    - Kích hoạt trực tiếp qua Dispatcher Action `ACTION_SKILL` với mảng `cardIds`: chỉ bỏ các lá được chọn và rút đúng số lượng tương ứng.
    - Kích hoạt qua nút đổi toàn bộ tay hoặc gọi skill không truyền `cardIds`: bỏ toàn bộ tay và nhận thưởng $N + 1$ lá bài.
  - Thiết lập cờ `usedThisTurn = true` trên `owner.skillUsage.bach_dang` và chặn kích hoạt lại trong cùng lượt.
- **Hậu Viện:**
  - Được kích hoạt tự động tại điểm đón cẩm nang [Đào] trong `DispatcherV4._handlePlayCard`.
  - Kiểm tra điều kiện đồng minh phe Hà: `player.faction === 'ha' || player.faction === 'Hà' || player.rawFaction === 'ha'`.
  - Quét xem có Chúa Công Ngô Quyền còn sống và đang mất máu (`hp < maxHp`) hay không. Nếu có, đẩy `ASK_HAU_VIEN`.
  - Khi đồng minh xác nhận nhường (`doReact: true`), Ngô Quyền hồi 1 HP và đồng minh lập tức rút 1 lá bài từ bộ bài.
  - Nếu từ chối hoặc bỏ qua, quả Đào giữ nguyên hiệu ứng hồi máu cho chính người sử dụng.

## 3. Hệ quả & Ràng buộc
- Đảm bảo tính toán chính xác số lượng bài rút khi bỏ một phần so với bỏ toàn bộ.
- Ngăn chặn triệt để hành vi lạm dụng Bạch Đằng nhiều lần trong một lượt.
- Tương thích 100% với PriorityStack và kiểm tra bất biến bảo toàn bài (Conservation Invariant).
