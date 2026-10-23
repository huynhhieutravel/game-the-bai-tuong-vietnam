# ADR 0036: Thiết Kế & Kiểm Định Tướng Nguyễn Bặc — Bình Loạn & Khai Quốc

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Định Quốc Công Nguyễn Bặc, khai quốc công thần số một dưới triều Đinh, người cùng Vạn Thắng Vương Đinh Bộ Lĩnh bình định 12 sứ quân dựng nên cơ nghiệp nước Đại Cồ Việt. Trong Việt Sát v4, ông thuộc phe 🟢 Sơn và sở hữu hai kỹ năng đặc thù:
1. **Bình Loạn (`binh_loan`)**: Cho phép biến đổi 2 lá bài bất kỳ cùng chất thành một đòn [Loạn Tiễn] ảo càn quét toàn bàn đấu.
2. **Khai Quốc (`khai_quoc`)**: Chúa Công Kỹ giúp mở rộng giới hạn dự trữ quân nhu (Max Hand Size) ở Pha Bỏ bài thêm +2 lá với mỗi đồng minh phe Sơn còn sống.

## Quyết định Kỹ thuật
1. **Bình Loạn (`binh_loan` - Virtual Trick Conversion):**
   - Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
   - Yêu cầu kiểm tra bắt buộc: 2 lá bài chọn bỏ phải **cùng chất** (`cardA.suit === cardB.suit`).
   - Nếu 2 lá bài khác chất hoặc không đủ 2 lá bài, hệ thống từ chối hành động và giữ nguyên bài trên tay.
   - Hỗ trợ cả kích hoạt trực tiếp (`cardIds: [id1, id2]`) và tương tác qua Modal (`ASK_BINH_LOAN`) với hỗ trợ hủy/skip an toàn.
   - Khi phát động thành công, 2 lá bài được đưa vào `discardPile` và kích hoạt hiệu ứng `TrickRules.playArrowRain` (tất cả người chơi khác phải đáp trả bằng [Né] hoặc chịu 1 sát thương).

2. **Khai Quốc (`khai_quoc` - Lord Max Hand Bonus):**
   - Tích hợp tại Pha Bỏ bài (`_runPhaseDiscard` trong `StateMachine.js`) và bộ kiểm tra bất biến `GameInvariants.assertDiscardLimit`.
   - Giới hạn bài tay hiệu dụng:
     $$\text{EffectiveMaxHand} = \text{baseMaxHand (HP)} + 2 \times \text{allySonCount}$$
   - Chuẩn hóa điều kiện đếm đồng minh phe Sơn hỗ trợ cả nhãn `'son'` và `'Sơn'`.

## Hệ quả & Kiểm định
- Đã tạo test suite độc lập: `shared/engine_v4/__tests__/heroes/NguyenBacQA.test.js` kiểm tra 7/7 kịch bản:
  - Thuộc tính HeroRegistry phe Sơn (4 HP, Bình Loạn, Khai Quốc).
  - Trực tiếp: Bỏ 2 lá bài cùng chất Cơ phát động Loạn Tiễn.
  - Trực tiếp: Chặn phát động nếu 2 lá bài khác chất.
  - Modal: Chọn 2 lá cùng chất Bích phát động Loạn Tiễn.
  - Modal: Chọn Hủy (skip) an toàn.
  - Khai Quốc: Tăng +2 giới hạn bài tay với 1 đồng minh Sơn.
  - Khai Quốc: Tăng +4 giới hạn bài tay với 2 đồng minh Sơn (giữ 8 bài không vi phạm Invariants).
- 100% test cases đã vượt qua.
