# ADR 0024: Thiết Kế & Quy Chuẩn Kỹ Năng Tiên Dung (Duyên Tiên & Tiên Duyên)

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua quy trình QA Hero Việt Sát.

## Bối cảnh (Context)
Công Chúa Tiên Dung (con gái Hùng Vương thứ ba, phu nhân của Chử Đồng Tử) là nữ tướng ưu tú của phe 🟢 LẠC (Thục) với lượng máu chuẩn 3 HP (Nữ). Danh tướng này nắm giữ năng lực điều khiển cẩm nang thiên bẩm:
1. **Duyên Tiên (Fairy Fate - Reactive Skill)**: Mỗi khi sử dụng một lá Cẩm Nang thường (Non-delayed Trick), Tiên Dung được rút ngay 1 lá bài từ bộ bài rút.
2. **Tiên Duyên (Immortal Grace - Lock Skill)**:
   - **Vô Hạn Cự Ly Cẩm Nang**: Tiên Dung sử dụng Cẩm Nang không bị giới hạn bởi khoảng cách (ví dụ [Cướp Bài], [Binh Lương Thốn Đoạn] có thể thi triển lên mục tiêu ở bất kỳ vị trí nào trên bàn cờ).
   - **Cự Ly Phòng Thủ Khác Giới**: Khoảng cách từ tất cả người chơi Nam (khác giới tính) tính đến Tiên Dung luôn được tăng thêm 1 (+1 cự ly phòng thủ bẩm sinh trước phái mạnh).

## Quyết định Thiết kế (Decisions)

### 1. Duyên Tiên — Rút Bài Khi Chơi Cẩm Nang Thường
- Tích hợp tại Trigger `ON_TRICK_PLAYED` trong `TrickRules.playTrick`:
  - Mỗi khi Tiên Dung đánh ra một lá Cẩm nang không phải Cẩm nang trì hoãn:
    - Trigger `ON_TRICK_PLAYED` kích hoạt ngay lập tức.
    - Tiên Dung rút 1 lá bài từ `drawPile` vào bài trên tay (`state.drawCards(0, 1)`).
  - **Không áp dụng cho Cẩm nang Trì hoãn**: Khi đặt [Sấm Sét], [Hỗn Loạn], [Binh Lương] vào khu vực phán xét, trigger này không kích hoạt.
  - **Dồn lá bài với Vô Trung Sinh Hữu**: Khi chơi [Vô Trung Sinh Hữu], Tiên Dung rút 1 lá ngay khi kích hoạt (Duyên Tiên) và rút thêm 2 lá khi cẩm nang có hiệu lực $\rightarrow$ Thu về tổng cộng 3 lá bài.

### 2. Tiên Duyên — Vô Hạn Cự Ly Thi Triển Cẩm Nang
- Tích hợp tại `TargetResolverV4.js` (`getTargetingDefinition`):
  - Khi xác định danh sách mục tiêu hợp lệ cho [Cướp Bài] (`cuop-bai`) và [Binh Lương Thốn Đoạn] (`binh-luong`):
  - Người chơi sở hữu `tien_duyen_khoang_cach` được miễn trừ điều kiện `dist <= 1`, cho phép nhắm tới bất kỳ mục tiêu hợp lệ nào trên toàn bàn đấu.

### 3. Tiên Duyên — Cự Ly Phòng Thủ Trước Người Khác Giới
- Tích hợp tại `RangeSystem.js` (`calculateDistance`):
  - Khi Tiên Dung là mục tiêu (`target`) và đã lộ diện danh tính (`revealedHeroes[target.id] === true`):
  - Nếu người tấn công (`source`) có `gender !== target.gender` (cụ thể là Nam $\rightarrow$ Nữ): cự ly phòng thủ tự động tăng thêm 1 (`defenseModifier += 1`).
  - Người cùng giới (Nữ) tính khoảng cách đến Tiên Dung không bị ảnh hưởng bởi kỹ năng này.

## Hệ Quả (Consequences)
- Tiên Dung trở thành "cỗ máy cẩm nang" có khả năng xoay vòng bài liên tục và kiểm soát các mục tiêu ở xa với Cướp Bài toàn bản đồ.
- Cự ly phòng thủ +1 trước đối thủ Nam giúp Tiên Dung trụ vững trước các đòn Chém cận chiến của đại đa số tướng trong game.
