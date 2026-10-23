# ADR 0031: Thiết Kế & Kiểm Định Tướng Lý Thường Kiệt — Nam Quốc Sơn Hà & Tiên Phát (Chúa Công Hệ Việt)

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Lý Thường Kiệt là vị danh tướng hiển hách của lịch sử Đại Việt thời Lý, tác giả của bản tuyên ngôn độc lập đầu tiên *Nam Quốc Sơn Hà*. Trong Việt Sát v4, ông giữ cương vị Chúa Công Phe 🔴 Việt (Lord Hero), sở hữu bộ kỹ năng kết hợp giữa phản đòn thu hồi tài nguyên chiến lược và khả năng kêu gọi toàn thể tướng lĩnh phe Việt hộ vệ.

## Quyết định Kỹ thuật
1. **Nam Quốc Sơn Hà (`nam_quoc_son_ha` - Reactive `ON_DAMAGED`):**
   - Kích hoạt mỗi khi Lý Thường Kiệt nhận sát thương từ bất kỳ nguồn nào.
   - Khi được kích hoạt (`doUse: true`):
     - Rút ngay 1 lá bài từ chồng bài rút (`drawCards(player.id, 1)`).
     - Kiểm tra lá bài gây sát thương (`context.damageCard`). Nếu lá bài này là bài vật lý tồn tại trong chồng bài bỏ (`discardPile`), thu hồi lá bài này trực tiếp về bài tay của Lý Thường Kiệt.
     - Nếu sát thương đến từ hiệu ứng ảo hoặc không có lá bài trong discardPile, vẫn rút 1 lá bài từ bộ bài an toàn mà không phát sinh lỗi.
2. **Tiên Phát (`tien_phat` - Chúa Công Kỹ - Reactive Skill):**
   - Kích hoạt khi Lý Thường Kiệt là mục tiêu của [Chém] và đang ở trạng thái cần đánh ra lá [Né] (`ASK_DODGE`).
   - Lý Thường Kiệt có quyền phát động `doTienPhat: true`, đưa yêu cầu `ASK_TIEN_PHAT` vào đỉnh stack.
   - Hệ thống tạo hàng đợi ưu tiên gồm tất cả các đồng minh còn sống thuộc phe Việt (`faction === 'viet'`).
   - Lần lượt truy vấn từng đồng minh:
     - Nếu đồng minh đánh ra lá [Né] (`doProvide: true`), lá Né bị bỏ vào `discardPile`, đòn Chém bị hóa giải và Lý Thường Kiệt không nhận bất kỳ sát thương nào.
     - Nếu đồng minh từ chối hoặc hết bài Né, quyền cứu viện tự động chuyển sang đồng minh Việt tiếp theo.
     - Nếu tất cả đồng minh từ chối, frame `ASK_TIEN_PHAT` được giải phóng, quyền quyết định tự đánh lá [Né] quay trở lại cho Lý Thường Kiệt.

## Hệ quả & Kiểm định
- Đã kiểm định hoàn tất qua bộ test suite Vitest: `shared/engine_v4/__tests__/heroes/LyThuongKietQA.test.js` (7/7 test cases vượt qua 100%).
- Đã tích hợp fallback AI an toàn trong `run_1000_matches.mjs` và `HeadlessRunner.js` cho `ASK_NAM_QUOC_SON_HA` và `ASK_TIEN_PHAT`.
