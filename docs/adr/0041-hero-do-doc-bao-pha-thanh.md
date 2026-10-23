# ADR 0041: Thiết Kế & Kiểm Định Tướng Đô Đốc Bảo — Kỹ Năng Phá Thành

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Đô đốc Nguyễn Văn Bảo (Đô đốc Bảo), danh tướng thủy quân dũng lược thời Tây Sơn, một trong những cánh quân chủ lực trong đại thắng Kỷ Dậu (1789) quét sạch 29 vạn quân Mãn Thanh xâm lược. Trong Việt Sát v4, ông thuộc phe 🟢 Sơn với kỹ năng công phá thành trì kiệt xuất **Phá Thành** (`pha_thanh`).

## Quyết định Kỹ thuật
1. **Phá Thành — Pha Rút bài (`pha_thanh` Draw Phase Judgement):**
   - Sự kiện kích hoạt: `DRAW_PHASE` tại lượt của Đô Đốc Bảo.
   - Khi phát động, hệ thống mở frame lựa chọn `ASK_PHA_THANH`.
   - **Lựa chọn phán xét thu bài (`doJudge: true`):**
     - Đô Đốc Bảo lật 1 lá bài phán xét từ đỉnh bộ bài rút (`drawCardFromDeck`).
     - Thu nhận lá bài đó trực tiếp vào bài trên tay (`player.hand.push(judgeCard)`).
     - Đặt cờ bỏ qua giai đoạn rút bài thông thường (`skipDrawPhase = true`).
     - Xác định màu sắc của lá bài phán xét (Đỏ: Cơ/Rô; Đen: Bích/Chuồn) và thiết lập màu đối lập vào cờ trạng thái:
       $$\text{phaThanhOppositeColor} = (\text{isRed} ? \text{'black'} : \text{'red'})$$
     - Tiến thẳng vào Pha Ra bài (`PHASES.ACTION`).
   - **Lựa chọn từ chối (`isCancelOrSkip: true`):** Đô Đốc Bảo rút 2 lá bài bình thường từ bộ bài rút và tiến vào Pha Ra bài.

2. **Phá Thành — Quyết Đấu bài khác màu (`pha_thanh` Action Phase Duel):**
   - Trong Pha Ra bài (`PHASES.ACTION`), Đô Đốc Bảo có thể sử dụng bất kỳ lá bài nào có màu sắc trùng với `phaThanhOppositeColor` (khác màu với lá phán xét thu được) để sử dụng như một lá cẩm nang [Quyết Đấu].
   - Hệ thống từ chối hành động nếu người chơi cố tình sử dụng lá bài cùng màu với lá phán xét.
   - Cẩm nang Quyết Đấu ảo được giải quyết đầy đủ theo quy chuẩn (chuỗi ASK_NEGATE -> ASK_SLASH_DUEL).

## Hệ quả & Kiểm định
- Đã tạo test suite độc lập: `shared/engine_v4/__tests__/heroes/DoDocBaoQA.test.js` kiểm tra 6/6 kịch bản:
  - Thuộc tính HeroRegistry phe Sơn (4 HP, Phá Thành).
  - Pha Rút bài đẩy frame ASK_PHA_THANH.
  - Phản hồi phán xét: Thu lá phán xét, gán opposite color, bỏ qua rút 2 bài.
  - Phản hồi bỏ qua phán xét: Rút 2 bài bình thường.
  - Pha Ra bài: Dùng bài khác màu làm Quyết Đấu thành công (mở chuỗi Quyết Đấu).
  - Pha Ra bài: Chặn dùng bài cùng màu làm Quyết Đấu.
- 100% test cases đã vượt qua.
