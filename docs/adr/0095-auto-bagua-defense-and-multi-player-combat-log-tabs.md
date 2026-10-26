# ADR 0095: Tự Động Phán Xét Bát Quái Trận & Bổ Sung Tab Lọc Nhật Ký Theo Từng Người Chơi

## 1. Trạng thái (Status)
**ĐÃ CHẤP NHẬN & TRIỂN KHAI (ACCEPTED & IMPLEMENTED)**

## 2. Bối cảnh & Vấn đề (Context & Problem)
Trong quá trình chơi thử nghiệm thực tế (Playtesting):
1. **Trải nghiệm Bát Quái Trận (Bagua Formation / Divine Armor)**:
   - Khi người chơi trang bị Bát Quái (hoặc có nội tại Thần Giáp của Thần Kim Quy) bị đối thủ [Chém] hoặc dính [Loạn Tiễn], hệ thống hiện modal bắt người chơi phải chọn: Dùng Bát Quái, hay Đánh lá Né trên tay, hay Kích hoạt Bọc Trăm Trứng / Tiên Phát / Hộ Giá.
   - Theo chuẩn cơ chế Tam Quốc Sát: Bát Quái Trận là phòng thủ hoàn toàn miễn phí, không tốn tài nguyên. Không có bất kỳ người chơi nào muốn hy sinh lá bài hoặc tiêu tốn lượt kỹ năng của đồng minh trước khi thử phán xét Bát Quái.
   - Việc bắt người chơi chọn thủ công gây nhầm lẫn tâm lý ("tại sao tôi có Bát Quái mà lại hỏi dùng Bọc Trăm Trứng?").
2. **Kiểm tra Log Trận Đấu (Combat Log Inspection)**:
   - Trước đây trong Modal Nhật Ký chỉ có 2 tab cố định: `[Tất cả]` và `[Cá nhân]`.
   - Khi trận đấu diễn ra nhanh, người chơi muốn điều tra lỗi hoặc hành vi của một đối thủ cụ thể (ví dụ: Người chơi 2, Người chơi 3, Người chơi 4) thì phải đọc lướt qua toàn bộ nhật ký rất rối mắt.

## 3. Quyết định Kiến trúc & Giải pháp (Decisions & Solutions)

### 3.1. Tự Động Kích Hoạt Phán Xét Bát Quái (Auto-Bagua Defense)
1. **Luồng UX & Client Hooks**:
   - Trong `DodgeModal.jsx` (và nhánh `Loạn Tiễn` trong `ModalContainer.jsx`):
     - Xác định `canBagua = hasBagua && req.baguaAvailable !== false`.
     - Nếu `canBagua === true`:
       - Tự động gọi `onConfirm({ doBagua: true })` qua `useEffect` (kèm `autoBaguaAttemptKeyRef` để đảm bảo idempotent, không gọi lặp).
       - Hiển thị màn hình phán xét động: `☯️ Đang tự động phán xét [Bát Quái Trận]... (Đỏ = Né thành công, Đen = Cần đánh lá Né)`.
       - Không render các nút thủ công hay form chọn bài Né / Bọc Trăm Trứng ở bước này.
2. **Xử lý Phán Xét trong Engine (`CombatRules.respondDodge`)**:
   - Nếu rút ra bài **ĐỎ**:
     - Tăng `dodgesProvided += 1`.
     - Log: `☯️ [Bát Quái / Thần Giáp] Phán xét ĐỎ... né thành công cú Chém / [Loạn Tiễn] nhờ [Bát Quái]!`.
     - Pop frame khỏi `priorityStack` -> Modal tự động đóng ngay lập tức, không tốn tài nguyên hay bài trên tay.
   - Nếu rút ra bài **ĐEN**:
     - Log: `☯️ [Bát Quái / Thần Giáp] Phán xét ĐEN... Thất bại, cần tự đánh lá [Né] từ trên tay.`.
     - Đặt `frame.context.baguaAttempted = true`.
     - Frame giữ lại trên stack và mapper gửi về `baguaAvailable = false` -> `canBagua` trở thành `false`.
     - Modal re-render và hiển thị cảnh báo đỏ: `❌ Bát Quái phán xét ĐEN (Thất bại)! Bạn bắt buộc phải dùng [Né] hoặc kỹ năng.`.
     - Lúc này mới cung cấp form chọn lá Né trên tay, nút kích hoạt `[Bọc Trăm Trứng]`, `[Tiên Phát]`, `[Hộ Giá]`, hoặc `[Chịu đấm]`.

### 3.2. Bổ Sung Tab Lọc Nhật Ký Theo Từng Người Chơi (Multi-Player Combat Log Tabs)
1. **Thanh Tab Cuộn Ngang (`game-log-tabs`)**:
   - Bổ sung cấu trúc tab động gồm:
     - `Tất cả` (`logTab === 'all'`)
     - `Cá nhân` (`logTab === 'personal'`)
     - Các tab riêng biệt cho từng người chơi: `Người chơi 2`, `Người chơi 3`, `Người chơi 4`... (`logTab === player.id`).
   - Hỗ trợ cuộn ngang mượt mà (`overflowX: 'auto', whiteSpace: 'nowrap'`).
2. **Logic Lọc Đa Chiều (`filteredLogs`)**:
   - Khi chọn tab của một người chơi `targetPlayer`:
     - Khớp theo metadata: `log.turnPlayerId === targetPlayer.id || log.sourceId === targetPlayer.id || log.targetId === targetPlayer.id || log.playerId === targetPlayer.id`.
     - Khớp theo text: Chứa `targetPlayer.name`, `Người chơi ${targetPlayer.id + 1}`, hoặc tên các vị tướng sở hữu (`targetPlayer.heroes[].name`).
   - Hiển thị empty message phù hợp cho từng tab nếu người chơi đó chưa có nhật ký.

## 4. Kiểm Thử & Đảm Bảo Chất Lượng (QA & Verification)
- Tạo test suite chuyên biệt: `shared/engine_v4/__tests__/application/AutoBaguaAndPlayerLogTabsQA.test.js` (3/3 tests pass).
- Toàn bộ 106 test files (920 tests) pass 100%.
- Bundle Vite client build thành công trong 479ms.
