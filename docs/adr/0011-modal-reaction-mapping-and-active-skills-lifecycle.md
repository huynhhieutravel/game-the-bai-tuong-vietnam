# 11. Chuẩn Hóa Ánh Xạ Modal Phản Hồi & Vòng Đời Kỹ Năng Chủ Động (Active Skills Lifecycle)

Date: 2026-10-23
Status: Accepted

## Bối cảnh (Context)
Trong kiến trúc Việt Sát v4, hệ thống Engine lõi quản lý các trạng thái chờ hành động thông qua `PriorityStack` (các Frame như `ASK_DODGE`, `ASK_PEACH`, `ASK_NEGATE`, `ASK_SLASH_DUEL`, `ASK_SLASH_RESPONSE`). Tuy nhiên, khi kết nối với giao diện người dùng React (`client/src/components/modals/ModalContainer.jsx`):
1. **Lệch Type & Reason:** Giao diện Modal yêu cầu cấu trúc cụ thể (ví dụ `type === 'ask_slash' && reason === 'quyet-dau'`, `reason === 'nam-man'`, `reason === 'van-tien'`). Việc ánh xạ nguyên bản `frame.type.toLowerCase()` khiến Modal Quyết Đấu và Dã Man bị biến thành `ask_slash_duel` / `ask_slash_response`, kích hoạt cảnh báo `[UI FALLBACK]` và ngăn cản người chơi tương tác.
2. **Khuyết thiếu Handler trong Dispatcher:** `DispatcherV4._handleReact` chưa hỗ trợ xử lý phản hồi cho `ASK_SLASH_DUEL` và `ASK_SLASH_RESPONSE`, làm mất chuỗi đối kháng trong Quyết Đấu và sát thương từ Dã Man.
3. **Phân tách Vũ Khí trong AOE:** Cẩm nang diện rộng như Loạn Tiễn (Vạn Tiễn Quy Tâm) bị nhầm lẫn với đòn Chém từ vũ khí khi mục tiêu né thành công (kích hoạt sai Rìu Đá hoặc Thanh Long Đao).
4. **Kỹ năng chủ động (Active Skills):** Các kỹ năng chủ động tương tác (`Diệu Dược`, `Hòa Thân`, `Bình Loạn`, `Trung Dũng`, `Thủy Tổ`, `Tự Chủ`) cần cơ chế mở Modal khi người chơi bấm nút trên `ActionBar`, đồng thời hỗ trợ chuyển hóa lá bài từ trang bị (như `Chương Dương` của Trần Quang Khải dùng trang bị làm Hóa Giải).

## Quyết định Kiến trúc (Decisions)

### 1. Chuẩn Hóa ViewModel Mapping (`GameViewMapperV4.js`)
- Ánh xạ rõ ràng `ASK_SLASH_DUEL` sang:
  ```javascript
  {
    type: 'ask_slash',
    reason: 'quyet-dau',
    trickType: 'duel',
    responderId: frame.currentActorId,
    duelTargetId: ...
  }
  ```
- Ánh xạ `ASK_SLASH_RESPONSE` sang:
  ```javascript
  {
    type: 'ask_slash',
    reason: frame.context?.reason || 'nam-man',
    trickType: frame.context?.trickType || 'barbarian',
    responderId: frame.currentActorId || frame.targetId
  }
  ```
- Gán `context.reason = 'van-tien'` và `context.trickType = 'arrow_rain'` trong `TrickRules.playArrowRain`.

### 2. Bộ Giải Quyết Thẻ Bài Đa Năng (`_resolveCard` trong `DispatcherV4.js`)
Cho phép trích xuất thẻ bài mục tiêu từ mọi định dạng payload của Modal:
`data.cardId`, `data.cardIndexSelected`, `data.cardIdx`, `data.cardIndex`, `data.negateCardIndex`, `data.negateEquipIndex`.

### 3. Phản Hồi Đối Kháng & Kỹ Năng Trang Bị
- `TrickRules.respondBarbarian`: Xử lý phòng thủ hoặc áp dụng sát thương Dã Man Xâm Nhập.
- `TrickRules.respondDuel`: Kết nối hoàn chỉnh vào `DispatcherV4._handleReact` để hoán đổi người phản hồi lượt Chém tiếp theo.
- `Chương Dương` (Trần Quang Khải): Cho phép tháo bỏ trang bị làm [Hóa Giải], tự động kích hoạt trigger `ON_EQUIP_LOST`.
- Ngăn chặn hiệu ứng phụ của vũ khí (`Rìu Đá`, `Thanh Long Đao`) can thiệp vào các đòn Né cẩm nang diện rộng `van-tien`.

### 4. Vòng Đời Kỹ Năng Chủ Động Mở Modal
Khi người chơi bấm kích hoạt kỹ năng chủ động từ `ActionBar`:
- `Diệu Dược`: Đẩy frame `ASK_DIEU_DUOC`, phản hồi bỏ 1 bài hồi 1 HP cho mục tiêu.
- `Hòa Thân`: Đẩy frame `ASK_HOA_THAN`, phản hồi bỏ 1 bài ép 2 tướng nam Quyết Đấu.
- `Bình Loạn`: Đẩy frame `ASK_BINH_LOAN`, phản hồi bỏ 2 bài cùng chất thành Loạn Tiễn.
- `Trung Dũng`: Đẩy frame `ASK_TRUNG_DUNG`, úp 1 bài tuyên bố chức năng ảo.
- `Thủy Tổ`: Đẩy frame `ASK_THUY_TO`, chuyển bài cho đồng minh; nếu $\ge 2$ bài, nhận thưởng frame `ASK_THUY_TO_BONUS` sử dụng 1 Bài Cơ Bản miễn phí.
- `Tự Chủ`: Đẩy frame `ASK_TU_CHU`, đấu điểm so sánh số bài với tướng có HP cao hơn.

## Hệ quả & Đánh giá (Consequences)
- **UI Hoàn toàn Khớp (0 UI Fallbacks):** `modals.test.jsx` vượt qua 100% 55 bài kiểm thử modal mà không ghi nhận bất kỳ cảnh báo `[UI FALLBACK]` nào.
- **Bảo toàn Test Suite:** 23/23 file test, 161/161 bài test xanh hoàn toàn.
- **Hiệu năng Đại Giả Lập:** 1.000 trận đấu headless bot hoàn tất trong 0.89s với 0 lỗi Invariant / Exception.
