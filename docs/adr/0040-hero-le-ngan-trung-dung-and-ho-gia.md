# ADR 0040: Thiết Kế & Kiểm Định Tướng Lê Ngân — Trung Dũng & Hộ Giá

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Đại tướng Lê Ngân, khai quốc công thần triều Hậu Lê, người cùng Lê Lợi vào sinh ra tử trong cuộc kháng chiến chống quân Minh, sau giữ chức Nhập nội Đại tư mã phụ chính thời vua Lê Thái Tông. Trong Việt Sát v4, ông thuộc phe 🟢 Sơn và sở hữu hai kỹ năng biến ảo và kiên trung:
1. **Trung Dũng (`trung_dung`)**: Úp 1 lá bài trên tay để sử dụng như bất kỳ lá bài nào (Chém, Đào, Rượu, Cẩm nang...).
2. **Hộ Giá (`ho_gia`)**: Cấm nghi ngờ Trung Dũng (lá bài úp luôn có hiệu lực tuyệt đối); tuy nhiên khi máu rơi về 1 HP, các kỹ năng khác (Trung Dũng) sẽ bị vô hiệu hóa hoàn toàn.

## Quyết định Kỹ thuật
1. **Trung Dũng (`trung_dung` - Virtual Face-Down Card Play):**
   - Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
   - Giới hạn: Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.trung_dung.usedThisTurn = true`).
   - Hỗ trợ cả kích hoạt trực tiếp và qua Modal tương tác (`ASK_TRUNG_DUNG`).
   - Tham số: `virtualCardName` (hoặc `cardName`) và `cardId`.
   - Cơ chế bài úp: Không hủy bài trước khi chuyển vào `_handlePlayCard`, đảm bảo `_handlePlayCard` nhận diện đầy đủ thông tin lá bài và truyền cờ `{ asSlash: true }` khi tuyên bố dùng như [Chém].

2. **Hộ Giá (`ho_gia` - Unquestionable Trick & Low HP Lock):**
   - Tỏa định bất biến: Không người chơi nào có thể lật bài hay nghi ngờ lá bài do Trung Dũng phát động.
   - Cơ chế ngắt mạch nguy kịch: Khi lượng máu hiện tại của Lê Ngân rơi xuống $\le 1$ HP (`player.hp <= 1`), hệ thống lập tức khóa và chặn đứng kỹ năng Trung Dũng (`throw new Error('[Hộ Giá] Khi còn 1 HP, kỹ năng Trung Dũng bị vô hiệu hóa!')`).

## Hệ quả & Kiểm định
- Đã tạo test suite độc lập: `shared/engine_v4/__tests__/heroes/LeNganQA.test.js` kiểm tra 7/7 kịch bản:
  - Thuộc tính HeroRegistry phe Sơn (3 HP, Trung Dũng, Hộ Giá).
  - Trực tiếp: Úp bài dùng như [Đào] hồi 1 HP thành công.
  - Trực tiếp: Úp bài dùng như [Chém] tấn công mục tiêu (mở frame ASK_DODGE).
  - Modal: ASK_TRUNG_DUNG chọn lá bài và virtualCardName thành công.
  - Ràng buộc Một lượt 1 lần.
  - Hộ Giá: Khi HP = 1, kỹ năng Trung Dũng bị vô hiệu hóa.
  - Modal: Khi HP = 1, phản hồi bị hủy an toàn mà không làm mất bài.
- 100% test cases đã vượt qua.
