# ADR 0033: Thiết Kế & Kiểm Định Tướng Nguyễn Lữ — Kỹ Năng Tiên Phong

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Nguyễn Lữ là một trong ba thủ lĩnh kiệt xuất của phong trào khởi nghĩa Tây Sơn (Tây Sơn tam kiệt), nắm quyền cai quản vùng đất Gia Định phì nhiêu và sáng lập nên tuyệt kỹ miêu quyền độc đáo. Trong Việt Sát v4, ông thuộc phe 🔴 Việt và sở hữu kỹ năng chủ động uy lực **Tiên Phong** (`tien_phong_nguyen_lu`), cho phép đột phá tuyến phòng thủ của đối phương bằng cách đánh đổi máu hoặc vũ khí.

## Quyết định Kỹ thuật
1. **Tiên Phong (`tien_phong_nguyen_lu` - Active Skill):**
   - Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
   - Yêu cầu mục tiêu chỉ định bắt buộc phải nằm trong tầm công kích hiệu dụng (`RangeSystem.inSlashRange(player, target, alivePlayers)`). Nếu mục tiêu ở ngoài tầm, hành động bị từ chối với thông báo lỗi rõ ràng.
   - **Hai phương thức trả chi phí (Cost Alternatives):**
     - **Hy sinh máu (`costType: 'hp'`):** Nguyễn Lữ tự trừ 1 HP của bản thân (`player.hp -= 1`), sau đó gây trực tiếp 1 điểm sát thương (`CombatRules.applyDamage`) lên mục tiêu.
     - **Hy sinh vũ khí (`costType: 'weapon'`):** Nếu Nguyễn Lữ đang trang bị vũ khí, tháo bỏ vũ khí đưa vào `discardPile`, phát động sự kiện `ON_EQUIP_LOST` (cho phép các kỹ năng liên quan phản ứng), và gây trực tiếp 1 điểm sát thương lên mục tiêu mà không mất máu.
2. **Khung quyết định tương tác UI & Bot (Frame Interaction):**
   - Hỗ trợ cả hai chế độ:
     - Kích hoạt trực tiếp (kèm `costType` và `targetId`).
     - Kích hoạt mở modal quyết định (`ASK_TIEN_PHONG`), cho phép người chơi lựa chọn chi phí hoặc hủy bỏ (`isCancelOrSkip`) an toàn mà không làm gián đoạn tiến trình trận đấu.

## Hệ quả & Kiểm định
- Đã kiểm định hoàn tất qua bộ test suite Vitest: `shared/engine_v4/__tests__/heroes/NguyenLuQA.test.js` (6/6 bài test vượt qua 100%).
- Đã kiểm tra tính toàn vẹn của hệ thống tầm đánh `RangeSystem` và sự kiện `ON_EQUIP_LOST`.
