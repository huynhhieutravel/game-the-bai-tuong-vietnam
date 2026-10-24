# ADR 0061: BotAI Tactical Intelligence, Active/Conversion Hero Skills & Strict Target Invariants

## Trạng thái
Đã chấp thuận & Triển khai thành công (Accepted & Implemented)

## Bối cảnh (Context)
Trong hệ thống Quốc Chiến Việt Sát Engine v4, bot AI đóng vai trò thiết yếu để đảm bảo trận đấu vận hành mượt mà, thử nghiệm tự động quy mô lớn (Stress Test 1.000 trận) và cung cấp trải nghiệm thử thách cho người chơi thật. Tuy nhiên, qua quá trình kiểm thử chuyên sâu tầng ứng dụng (`DispatcherV4`, `BotBrain`, `BotRunnerV4`, `HeadlessRunner`), một số khiếm khuyết mang tính hệ thống đã được phát hiện:

1. **Thiếu nhận diện & kích hoạt kỹ năng tướng chủ động/chuyển đổi:**
   - Bot không tự động hiển lộ (proactive reveal) các tướng sở hữu kỹ năng chủ động trong pha hành động (như Yết Kiêu `lan_sau`, Khúc Thừa Dụ `tu_chu`, Nguyễn Phi Ỷ Lan `thinh_chinh`, Rùa Vàng `than_hoa`, Lạc Long Quân `thuy_to`, Trần Quang Khải `chuong_duong`).
   - Bot bỏ qua hoàn toàn việc kích hoạt các kỹ năng chủ động dẫn đến lối chơi thụ động, nghèo nàn và không phản ánh đúng thiết kế tướng.
2. **Xung đột định tuyến bài ảo (Virtual Card Collision):**
   - Trong `DispatcherV4._handlePlayCard`, việc phân loại dựa trên `cardType === 'slash'` khiến các lá bài Đỏ hoặc bài Trang bị chuyển đổi thành `Đào` (Nguyễn Phi Ỷ Lan `thinh_chinh`) hoặc `Hỏa Công` (Rùa Vàng `than_hoa`) bị nhầm lẫn thành hành động `Chém`. Do bot tự nhắm vào bản thân để hồi máu (`targetId === bot.id`), hệ thống gọi `CombatRules.playSlash` lên chính mình dẫn đến ngoại lệ `Khoảng cách: 0, Tầm đánh: 1`.
3. **Phản hồi sai lệch và hủy vô căn cứ trong BotRunnerV4:**
   - `BotRunnerV4._pollAndRespond` định nghĩa điều kiện `isCanceled` quá hạn chế (chỉ kiểm tra các trường card tiêu chuẩn), khiến các phản hồi dạng cờ logic (`doJudge: true` của Phá Thành, `doUse: true` của Dưỡng Quân, `option: 'slash'` của Mượn Đao) bị coi là hủy bỏ (`canceled: true`).
4. **Đột biến Slug cẩm nang trong TargetResolverV4:**
   - `getTargetingDefinition` định nghĩa `isVirtual = Boolean(cardNameOrId && physicalCard && cardNameOrId !== physicalCard.id)`. Khi truyền tên bài vật lý (`card.name`), biểu thức này luôn trả về `true`, khiến mọi lá bài của tướng sở hữu kỹ năng chuyển đổi (như Rùa Vàng, Chử Đồng Tử) bị ép slug sang cẩm nang khác (`hoa-cong`, `xieng-xich`), làm hỏng cẩm nang nhiều bước (`Mượn Đao`) và các cẩm nang thường khác.
5. **Thiếu tôn trọng các bất biến mục tiêu (Target Invariants):**
   - Kỹ năng Tỏa định của Lang Liêu (`dam_bac` - không thể bị Chém/Quyết đấu khi hết bài) và Nguyễn Chích (`nghe_an_ke` - miễn nhiễm Cướp Bài và Hỗn Loạn) không được kiểm tra đồng bộ trong các phản hồi/kỹ năng chuyển hướng (`ASK_XA_THAN`, `ASK_DUONG_QUAN`, `hoa_than_an_tu`), dẫn đến các cảnh báo ngoại lệ mục tiêu không hợp lệ.

## Quyết định Thiết kế (Decisions)

### 1. Kiến Trúc Bộ Não AI Đa Tầng (BotBrain Multi-Phase Decision Engine)
- **Chính sách Chủ Động Hiển Lộ Tướng (Proactive Hero Reveal Policy):**
  - Bot tự động phát hiện và hiển lộ tướng có kỹ năng chuyển đổi/chủ động ngay đầu pha hành động: `lan_sau`, `tu_chu`, `thinh_chinh`, `than_hoa`, `thuy_to`, `chuong_duong`, `linh_giam`, `duong_quan`, `trung_dung`.
- **Động Cơ Kỹ Năng Tấn Công & Chuyển Đổi:**
  - `lan_sau` (Yết Kiêu): Chủ động mất 1 HP để rút 2 bài mới khi HP dồi dào ($HP \ge 3$) hoặc khi $HP = 2$ nhưng tay bài cạn kiệt.
  - `tu_chu` (Khúc Thừa Dụ): Khi cầm bài điểm cao ($\text{rank} \ge 9$), chọn kẻ địch HP cao nhất để khiêu chiến đấu điểm, ép tạo thế gọng kìm.
  - `thinh_chinh` (Nguyễn Phi Ỷ Lan): Dùng bài Đỏ bất kỳ làm `Đào` để tự hồi phục sinh lực khi bị thương.
  - `than_hoa` (Rùa Vàng): Dùng bài Đỏ bất kỳ làm `Hỏa Công` thiêu đốt kẻ địch khi còn bài sẵn sàng để hy sinh.
  - `thuy_to` (Lạc Long Quân): Hiến tế 2 lá bài giá trị thấp nhất cho đồng minh thiếu bài để nhận bài cơ bản miễn phí.
  - `chuong_duong` (Trần Quang Khải): Dùng trang bị làm `Hóa Giải` bảo vệ bản thân và đồng minh khỏi các cẩm nang nguy hiểm.
- **Xử lý Đầy Đủ Phản Ứng Ngăn Xếp (Full Reaction Stack Mapping):**
  - Tích hợp quyết định chiến thuật tối ưu cho: `ASK_DUONG_QUAN_1`, `ASK_DUONG_QUAN_2`, `ASK_DUONG_QUAN_3`, `ASK_PHA_THANH`, `ASK_DUYEN_THO`, `ASK_DIEU_DUOC`, `ASK_HOA_THAN`, `ASK_BINH_LOAN`, `ASK_TIEN_PHONG`, `ASK_TRUNG_DUNG`, `ASK_XA_THAN`, `ASK_BORROW_SLASH`.
  - Tôn trọng cờ `vanDonLose` (thua đấu điểm Vân Đồn cấm xuất Chém) trong toàn bộ các nhánh chủ động và phản ứng.

### 2. Chuẩn Hóa Định Tuyến DispatcherV4 & Xử Lý Bài Ảo
- Trong `DispatcherV4._handlePlayCard`, kiểm tra chặt chẽ `isConvertedNonSlash = virtualCardName && virtualCardName !== 'Chém'`.
- Khi `virtualCardName` là `Đào`, `Hỏa Công`, `Xiềng Xích`, `Hỗn Loạn`, hành động bài được loại trừ tuyệt đối khỏi nhánh `CombatRules.playSlash`, ngăn chặn triệt để lỗi đánh Chém vào chính mình.
- Bọc đầy đủ metadata lá bài ảo (`{ ...card, name: virtualCardName, idKey: virtualSlug, virtual: true }`) khi chuyển giao sang các rule classes (`TrickRules.playIronChain`, `TrickRules.playFireAttack`, `TrickRules.playChaos`, `TrickRules.playDuel`).

### 3. Tinh Chỉnh TargetResolverV4 & Định Nghĩa isVirtual
- Sửa đổi định nghĩa `isVirtual`:
  $$\text{isVirtual} = \text{Boolean}(\text{cardNameOrId} \land \text{physicalCard} \land \text{cardNameOrId} \neq \text{physicalCard.id} \land \text{cardNameOrId} \neq \text{physicalCard.name})$$
- Loại bỏ hoàn toàn việc chuyển đổi slug tự động dựa trên `|| isVirtual` trong các kỹ năng chuyển đổi bài (`than_hoa`, `linh_giam`, `tien_duyen`, `ky_tap`). Slug chỉ được biến đổi khi người chơi chỉ định rõ ràng mục đích sử dụng.
- Tôn trọng miễn nhiễm Tỏa định kỹ của Nguyễn Chích (`nghe_an_ke`) và Lang Liêu (`dam_bac`) trên toàn bộ các bộ lọc mục tiêu `cuop-bai`, `hon-loan`, `quyet-dau`, `chem`.

### 4. Đồng Bộ Hóa Mô Phỏng Giữa HeadlessRunner & Application Layer
- Cập nhật `HeadlessRunner.js` để thực thi trực tiếp các hành động `action.type === 'USE_SKILL'` và nhận diện `virtualCardName`, loại bỏ hiện tượng kết thúc pha sớm dẫn đến hòa/timeout.
- Giữ vững tính bất biến dữ liệu giữa môi trường Server/Node.js và Client UI.

## Hệ Quả & Kiểm Chứng (Consequences & Verification)
- **Đại Giả Lập 1.000 Trận (Stress Test):**
  - Hoàn thành **1000/1000 trận** trong **1.16 giây**.
  - **Deadlock / Ngoại lệ bất thường:** **0**.
  - **Timeout (>1000 steps):** **0**.
  - Tương tác: 72.362 hành động, 90.395 phản hồi, 39.408 cẩm nang.
- **Vitest Suite Toàn Dự Án:**
  - **74/74 test files** vượt qua 100%.
  - **617/617 tests** chạy thành công trong 1.56 giây.
- **UX/UI & Tuân thủ Luật:**
  - Bot AI hành xử thông minh, tận dụng linh hoạt kỹ năng của 56 vị tướng mà không gây kẹt game hay vi phạm bất biến luật chơi.
  - Không thay đổi bất kỳ file CSS nào (CSS tuân thủ triệt để quy tắc Lock).
