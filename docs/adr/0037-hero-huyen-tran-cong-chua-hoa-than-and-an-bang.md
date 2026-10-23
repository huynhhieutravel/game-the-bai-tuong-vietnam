# ADR 0037: Thiết Kế & Kiểm Định Tướng Huyền Trân Công Chúa — Hòa Thân & An Bang

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Công chúa Huyền Trân, vị công chúa nhà Trần vì đại cuộc quốc gia xã tắc đã lên đường hòa thân sang Chiêm Thành, đem lại hai châu Ô, Lý mở rộng bờ cõi cho non sông Đại Việt mà không tốn một mũi tên hòn đạn. Trong Việt Sát v4, nàng thuộc phe 🟢 Sơn với hai kỹ năng tài tình:
1. **Hòa Thân (`hoa_than_huyen_tran`)**: Trong Pha Ra bài, mỗi lượt 1 lần, bỏ 1 lá bài trên tay để ép 2 tướng Nam bất kỳ trên bàn cờ phải phát động Quyết Đấu với nhau.
2. **An Bang (`an_bang`)**: Khi kết thúc lượt đi của mình (Pha Kết thúc - END Phase), Huyền Trân tự động rút 1 lá bài từ bộ bài rút.

## Quyết định Kỹ thuật
1. **Hòa Thân (`hoa_than_huyen_tran` - Active Trick Provocation):**
   - Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
   - Giới hạn: Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.hoa_than.usedThisTurn = true`).
   - Ràng buộc mục tiêu nghiêm ngặt:
     - Phải chọn đúng 2 tướng khác nhau còn sống (`targetA.id !== targetB.id`).
     - Cả 2 mục tiêu bắt buộc phải là **tướng Nam** (`targetA.gender === 'male' && targetB.gender === 'male'`). Nếu có tướng nữ, hệ thống từ chối phát động.
   - Khi thỏa mãn, bỏ 1 lá bài trên tay vào `discardPile` và kích hoạt hiệu ứng cẩm nang `TrickRules.playDuel(state, targetA, targetB, { name: 'Quyết Đấu', virtual: true })`.
   - Tiến trình giải quyết tuân thủ quy chuẩn Cẩm nang: mở vòng hỏi Hóa Giải (`ASK_NEGATE`), sau đó người bị thách đấu (targetB) phải phản hồi Chém qua frame `ASK_SLASH_DUEL`.

2. **An Bang (`an_bang` - End Phase Draw Trigger):**
   - Kích hoạt tại Pha Kết thúc (`_runPhaseEnd` / `END_PHASE`).
   - Bộ lọc kiểm tra: `filter: (ctx) => ctx.ownerId === ctx.actorId`.
   - Huyền Trân rút 1 lá bài từ chồng bài rút (`drawPile`), gia tăng nguồn tài nguyên dự trữ cho các lượt tiếp theo. Chống nhảy ké khi kết thúc lượt của đối thủ.

## Hệ quả & Kiểm định
- Đã tạo test suite độc lập: `shared/engine_v4/__tests__/heroes/HuyenTranCongChuaQA.test.js` kiểm tra 8/8 kịch bản:
  - Thuộc tính HeroRegistry phe Sơn (3 HP, Nữ, Hòa Thân, An Bang).
  - Trực tiếp: Bỏ 1 bài ép 2 tướng Nam Quyết Đấu thành công (chuỗi ASK_NEGATE -> ASK_SLASH_DUEL).
  - Trực tiếp: Chặn nếu có tướng Nữ tham gia Quyết Đấu.
  - Trực tiếp: Ràng buộc Mỗi lượt 1 lần.
  - Modal: ASK_HOA_THAN phản hồi chọn 2 mục tiêu Nam và bỏ bài thành công.
  - Modal: Chọn Hủy (skip) an toàn.
  - An Bang: Cuối lượt tự động rút 1 bài.
  - An Bang: Chống nhảy ké ở lượt người khác.
- 100% test cases đã vượt qua.
