# ADR 0090: VIP Hero Selector — Dual Mode Quick Selection and Dossier Inspection

## 1. Context & Motivation
Trong màn hình tuyển chọn tướng VIP (`VipHeroSelectorModal`), người chơi phản ánh:
- Phải nhấp vào từng thẻ tướng để mở popup hồ sơ kỹ năng (Dossier Popup), sau đó mới có thể bấm nút tuyển mộ/chọn bên trong popup đó.
- Đối với những người chơi kỳ cựu hoặc đã thuộc lòng danh tướng và bộ kỹ năng, quy trình 2 bước này gây phiền toái, mất thời gian và giảm nhịp độ trận đấu.
- Người dùng yêu cầu: Có thể chọn nhanh ngay trên thẻ danh tướng (hoặc có nút Chọn trực tiếp), đồng thời vẫn giữ nút "Soi 🔍" để mở xem chi tiết kỹ năng cho ai cần đọc.

## 2. Decision & Architecture
Triển khai cơ chế tương tác **Dual-Mode Selection** (Song hành Chọn Nhanh & Soi Chi Tiết) trực tiếp trên từng thẻ danh tướng trong [VipHeroSelectorModal.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/modals/VipHeroSelectorModal.jsx):

1. **Chọn Nhanh Tức Thì (Quick Select)**:
   - Thân thẻ bài (ảnh tướng & toàn bộ card container): Kích hoạt `onSelect(hero.id)` ngay khi người chơi nhấp chuột/chạm tay.
   - Nút hành động trực tiếp tại chân thẻ bài:
     - Trạng thái chưa chọn: Nút `Chọn ✓` với gradient xanh ngọc/xanh lá cao cấp, click vào là chọn ngay.
     - Trạng thái đã chọn: Huy hiệu `✓ ĐÃ CHỌN` phát sáng xanh ngọc trên ảnh, chân thẻ chuyển thành nút `Bỏ ✕` (màu đỏ nhẹ), click vào là hủy chọn ngay lập tức.
2. **Soi Chi Tiết Kỹ Năng (Inspection Dossier)**:
   - Nút `Soi 🔍` chuyên biệt bên cạnh nút Chọn tại chân thẻ bài.
   - Sử dụng `e.stopPropagation()` để ngăn việc chọn nhanh, mở popup hồ sơ danh tướng (ảnh lớn, bio lịch sử, bảng kỹ năng chi tiết với mô tả chiêu thức).
   - Trong popup hồ sơ chi tiết vẫn giữ nút `👑 Tuyển Mộ Tướng Này` / `🚫 Bỏ Chọn Tướng Này`.
3. **Quy Tắc Tuyển Mộ Cùng Phe (Faction Invariant)**:
   - Khi đã chọn tướng thứ nhất, các tướng khác phe tự động hiển thị nhãn `Khác phe`, bị vô hiệu hóa chọn nhanh (`disabled`, `cursor: not-allowed`, `opacity: 0.38`), ngăn ngừa vi phạm luật Quốc Chiến.
   - Khi đã chọn đủ 2 tướng, các tướng còn lại hiển thị nhãn `Đủ 2` (disabled).

## 3. Verification & QA
- Cập nhật bộ test QA [VipHeroSelectorModalQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/VipHeroSelectorModalQA.test.jsx) với 8 bài kiểm thử:
  1. Hiển thị đúng 3 cột và 4 tab phe (Lạc, Việt, Hà, Sơn).
  2. Bấm nút "Chọn ✓" gọi ngay `onSelect` mà không mở dossier.
  3. Nhấp trực tiếp vào thân thẻ bài gọi ngay `onSelect`.
  4. Bấm nút "Soi 🔍" mở hồ sơ chi tiết kỹ năng.
  5. Bấm "Tuyển Mộ Tướng Này" trong dossier gọi `onSelect` và đóng dossier.
  6. Tướng đã chọn hiển thị badge `✓ ĐÃ CHỌN` và nút `Bỏ ✕`.
  7. Khóa chọn tướng khác phe (`Khác phe` và disabled).
  8. Lọc tab phe hoạt động chính xác.
- Toàn bộ 21/21 test files (213/213 tests) client components pass 100%. Production build Vite thành công trong 588ms.
