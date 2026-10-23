# ADR 0030: Thiết Kế & Kiểm Định Tướng Dương Đình Nghệ — Kỹ Năng Dưỡng Quân (Shen Su)

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Dương Đình Nghệ là danh tướng thời tự chủ Việt Nam, nổi tiếng với việc nuôi 3.000 nghĩa tử (con nuôi) để xây dựng lực lượng hùng hậu đánh đuổi quân Nam Hán giành quyền tự chủ. Trong hệ thống Việt Sát v4, ông thuộc phe 🔴 Việt và sở hữu kỹ năng chủ lực **Dưỡng Quân** (cơ chế thần tốc tốc chiến - Shen Su), cho phép đánh đổi các giai đoạn của lượt hoặc trang bị/trạng thái mặt tướng để tung ra những đòn Chém bất ngờ không bị giới hạn bởi cự ly.

## Quyết định Kỹ thuật
1. **Chia tách Dưỡng Quân thành 3 hợp đồng cơ chế chuyên biệt:**
   - **Option 1 (`duong_quan_1` - Reactive `BEGIN_PHASE`):** Kích hoạt ở đầu lượt. Bỏ qua Giai đoạn Phán xét (`skipJudgePhase`) và Giai đoạn Rút bài (`skipDrawPhase`) để lập tức Chém 1 mục tiêu bất kỳ không tính cự ly (`infiniteRange: true`). Sau khi giải quyết phản hồi Né, tự động tiến vào Pha Ra bài (`PHASES.ACTION`).
   - **Option 2 (`duong_quan` - Active Skill trong Action Phase):** Bỏ 1 lá bài Trang bị (từ tay hoặc trên người) để Chém 1 mục tiêu bất kỳ vô hạn cự ly. Kết thúc ngay lập tức Pha Ra bài (`endActionAfterSlash = true`) và chuyển sang Pha Bỏ bài.
   - **Option 3 (`duong_quan_3` - Reactive `DISCARD_PHASE`):** Kích hoạt trong Pha Bỏ bài khi tướng đang ngửa (`isFaceUp === true`). Tự lật úp mặt tướng (`isFaceUp = false`) và bỏ qua Pha Bỏ bài (`skipDiscardPhase`) để Chém 1 mục tiêu bất kỳ vô hạn cự ly. Sau khi giải quyết phản hồi Né, hoàn tất lượt và chuyển sang người chơi tiếp theo.
2. **Quy tắc Chém Thần Tốc (Virtual Infinite Range Slash):**
   - Đòn Chém của Dưỡng Quân là đòn Chém ảo (virtual), không tiêu tốn bài tay.
   - Bỏ qua kiểm tra tầm đánh (`infiniteRange: true`), vô hiệu hóa ngựa phòng thủ (+1) của đối phương.
   - Không tính vào giới hạn 1 Chém/lượt của Pha Ra bài thông thường.
3. **Quản lý chuyển pha Hậu Phản Ứng (Post-reaction Transitions):**
   - Tích hợp bộ giải quyết chuyển pha tại cuối `_handleReact` trong `DispatcherV4`: khi `priorityStack` được làm rỗng sau chuỗi phản hồi Né/Sát thương, hệ thống kiểm tra cờ tạm của lượt hiện tại (`skipJudgePhase`, `endActionAfterSlash`, `skipDiscardPhase`) để kích hoạt đúng pha tiếp theo mà không gây deadlock.

## Hệ quả & Kiểm định
- Đã kiểm định hoàn tất qua bộ test suite Vitest: `shared/engine_v4/__tests__/heroes/DuongDinhNgheQA.test.js` (6/6 bài test vượt qua 100%).
- Đã tích hợp fallback AI an toàn trong `HeadlessRunner.js` và `run_1000_matches.mjs` cho các frame `ASK_DUONG_QUAN_1` và `ASK_DUONG_QUAN_3`.
