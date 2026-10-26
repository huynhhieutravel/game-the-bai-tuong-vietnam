# ADR 0077: Mổ Xẻ Điểm Mù Của Kiểm Thử Mô Phỏng Headless & Thiết Lập Hệ Thống Chốt Chặn Bất Biến Đa Tầng (Root Cause Analysis of Headless Simulation Blind Spots & Multi-Tier Invariant Gates)

## Bối Cảnh (Context)
Trong quá trình phát triển và kiểm thử Việt Sát v4, hệ thống kiểm thử tự động đã được đầu tư rất mạnh mẽ:
- Hơn **82 test suites với hơn 704 unit tests** được viết bằng Vitest.
- Bộ mô phỏng chiến đấu Headless (`run_application_layer_stress_test.mjs`) chạy tới **1.000 trận đấu tự động liên tục**, xử lý hơn 70.000 actions và 87.000 responses mà không phát sinh bất kỳ lỗi crash hay deadlock nào.

Tuy nhiên, khi người dùng vào chơi thực chiến trên giao diện web/app, hàng loạt lỗi nghiêm trọng vẫn xuất hiện:
1. **Mất nút bấm kỹ năng Chủ Động:** Người chơi không thấy nút kỹ năng chủ động của các tướng (như *Hòa Thân*, *Diệu Dược*, *Bình Loạn*...) trên thanh thao tác [ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx).
2. **Liệt kỹ năng do lệch bí danh (Alias Desync):** Kỹ năng *Nỏ Thần* của Cao Lỗ trong [gameData.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/data/gameData.js) mang ID `no-than`, nhưng engine logic lại đăng ký `no_than_cao_lo`, dẫn đến `hasSkill` trả về `false`.
3. **Bỏ sót 6 Tỏa Định Kỹ:** [HeroRegistry.isLockSkill](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/heroes/HeroRegistry.js) chỉ chứa 7 kỹ năng, bỏ sót *Nghệ An Kế*, *Nhiếp Chính*, *Hộ Chủ*, *Uy Chấn*, *Khai Quốc*, *Phá Quân*.

Câu hỏi mang tính phản biện sâu sắc được đặt ra:
> *"Tại sao kiểm thử mô phỏng 1.000 trận và hàng trăm unit tests trước đây lại không thể phát hiện ra các lỗi này?"*

---

## 5 Điểm Mù Cốt Tử Của Kiểm Thử Mô Phỏng (The 5 Critical Blind Spots)

### 1. Điểm Mù 1 — Headless Simulation Hoàn Toàn Tách Biệt Khỏi React DOM (DOM/UI Blindness)
- **Bản chất:** Bộ mô phỏng `run_application_layer_stress_test.mjs` chạy thuần trong môi trường Node.js headless thông qua `GameAPIV4` và `BotBrain.js`.
- **Hệ quả:** Bot AI tương tác với game bằng cách gọi trực tiếp các hàm logic backend (`gameAPI.useSkill('lan_sau')`). Bot **hoàn toàn không thông qua React Virtual DOM**, không bấm vào các thẻ HTML `<button>`, và không chạy qua logic lọc của component [ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx).
- **Điểm mù:** Dù [ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx) bị viết sai điều kiện lọc (`s.type === 'ACTIVE'` trong khi dữ liệu ViewModel trả về `'CHỦ ĐỘNG'`) làm biến mất 100% nút bấm của người chơi, Bot trong headless simulation vẫn kích hoạt kỹ năng ầm ầm qua API. Mô phỏng pass 1.000/1.000 trận nhưng người chơi thật thì không có nút để bấm.

### 2. Điểm Mù 2 — Nghịch Lý "Tự Dập Lửa Âm Thầm" Của Universal AI Fallback (Silent Masking Paradox)
- **Bản chất:** Để đảm bảo 1.000 trận test không bị crash hoặc kẹt game giữa chừng, kiến trúc Bot AI được trang bị `Universal AI Fallback`:
  ```javascript
  // Trong BotBrain / BotRunner:
  try {
    handleSpecialSkillResponse();
  } catch (err) {
    // Tự động bỏ qua lỗi để tránh treo ván đấu
    respond({ canceled: true });
  }
  ```
- **Hệ quả:** Khi một kỹ năng bị lỗi lệch ID (như `no-than` vs `no_than_cao_lo`), hoặc modal tương tác không khớp cấu trúc, Bot không quăng lỗi ra màn hình (throw error). Thay vào đó, Bot âm thầm chọn hủy (`canceled: true`), rồi quay sang đánh 1 lá Chém thường hoặc Bỏ Lượt (End Turn).
- **Điểm mù:** Ván đấu vẫn kết thúc suôn sẻ từ lượt 1 đến lượt cuối mà không có exception nào. Bộ test tự hào báo cáo "1000/1000 trận thành công!", nhưng thực chất một số kỹ năng đã bị **thoái hóa âm thầm (Silent Degradation)** thành vô dụng mà không ai hay biết.

### 3. Điểm Mù 3 — Thiên Kiến Xác Nhận Trong Unit Test (Confirmation Bias & Echo Chamber)
- **Bản chất:** Kỹ sư viết logic cho tướng nào thì thường tự tay viết Unit Test cho tướng đó (ví dụ: `CaoLoQA.test.js`).
- **Hệ quả:** Kỹ sư biết rõ ID nội bộ trong file handler của mình là `no_than_cao_lo`, nên trong test case họ gọi thẳng:
  ```javascript
  expect(HeroRegistry.hasSkill(caoLoPlayer, 'no_than_cao_lo')).toBe(true);
  ```
  Test pass 100% với màu xanh rực rỡ.
- **Điểm mù:** Không ai viết test kiểm tra xem nếu tầng UI hoặc file config bên ngoài truyền vào `no-than` thì hàm có nhận diện được không. Unit test đã kiểm tra rất tốt "tính đúng đắn bên trong logic của người viết", nhưng hoàn toàn bỏ quên "hợp đồng giao tiếp giữa các tầng" (Cross-Layer Contract Divergence).

### 4. Điểm Mù 4 — Thiếu Kiểm Thử Bất Biến Toàn Cục (Missing Global Invariant Auditing)
- **Bản chất:** Các test suite trước đây kiểm tra từng tướng riêng lẻ, phân tán trong nhiều file test khác nhau.
- **Hệ quả:** Không có một bài test nào chạy một vòng quét toán học bao trùm toàn bộ không gian trạng thái:
  $$\forall H \in \text{HEROES}, \forall S \in H.\text{skills} \implies \text{hasSkill}(H, S.\text{id}) = \text{true} \land \text{isLockSkill}(S.\text{id}) = (S.\text{type} == \text{'lock'})$$
- **Điểm mù:** Khi thêm một tướng mới hoặc đổi tên kỹ năng trong `gameData.js`, nếu không có bài test bất biến toàn cục, sự lệch pha sẽ âm thầm tích tụ mà không hề kích hoạt chuông cảnh báo nào. Minh chứng rõ nhất: ngay khi chúng ta viết file test bất biến [audit_39_heroes.mjs](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/audit_39_heroes.mjs), 14 lỗi lệch chuẩn của 39 tướng đã lập tức bị tóm gọn trong 0.2 giây.

### 5. Điểm Mù 5 — Kiến Trúc Dữ Liệu Phân Mảnh Không Có Type Schema (Split-Brain Architecture)
- **Bản chất:** Dự án duy trì 3 nguồn dữ liệu song song nhưng thiếu cơ chế Type Checking / Schema Validator tại thời điểm build:
  1. `gameData.js`: Định nghĩa dữ liệu thẻ bài, tướng, kỹ năng phục vụ UI (thường dùng kebab-case và tiếng Việt).
  2. `HeroRegistry.js`: Định nghĩa logic thực thi kỹ năng của Engine (thường dùng snake_case và tiếng Anh).
  3. `SkillDescriptions.js`: Chứa văn bản mô tả kỹ năng.
- **Hệ quả & Điểm mù:** JavaScript thuần cho phép so sánh chuỗi tùy ý (`===`). Khi một bên dùng `ACTIVE` còn một bên dùng `CHỦ ĐỘNG`, hoặc một bên dùng `no-than` còn một bên dùng `no_than_cao_lo`, trình biên dịch không báo lỗi cú pháp. Đến khi chạy thật thì logic gãy vụn.

---

## Giải Pháp Kiến Trúc & Thiết Lập Hệ Thống Chốt Chặn Mới (The Solution & Mandatory Gates)

Để vĩnh viễn không để lọt các lỗi dạng này trong tương lai, hệ thống thiết lập 4 chốt chặn kiến trúc bắt buộc:

### Chốt Chặn 1: Đưa Kiểm Thử Bất Biến Toàn Diện Thành Điều Kiện Tiên Quyết (Mandatory Invariant Gate)
- Kịch bản [shared/engine_v4/__tests__/audit_39_heroes.mjs](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/audit_39_heroes.mjs) được tích hợp trực tiếp vào quy trình `npm test` và `pre-commit`.
- Tự động kiểm tra chéo ma trận 39 tướng x 3 nguồn dữ liệu:
  1. Mọi tướng trong `gameData.js` phải có mặt trong `HeroRegistry`.
  2. Mọi kỹ năng của tướng phải có hàm `hasSkill` trả về `true` ở cả 4 dạng: ID gốc, snake_case, kebab-case, và tên tiếng Việt.
  3. Mọi kỹ năng có type `lock` / `TỎA ĐỊNH` bắt buộc phải được `HeroRegistry.isLockSkill` nhận diện.
  4. Mọi thuộc tính HP, Faction, Gender phải khớp tuyệt đối giữa Engine và UI.
- **Quy tắc:** Chỉ cần 1 tướng có 1 cảnh báo lệch chuẩn, bài test sẽ đánh FAIL toàn bộ build.

### Chốt Chặn 2: Tầng Adapter Chuẩn Hóa Ngôn Ngữ Trung Tâm ([translationHelper.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/utils/translationHelper.js))
- Cấm tuyệt đối việc so sánh chuỗi thô kiểu `s.type === 'ACTIVE'` hoặc `player.faction === 'Hà'`.
- Mọi tầng UI, Bot, Engine bắt buộc phải gọi qua Helper:
  - `normalizeSkillType(s.type).isActive`
  - `isSameFaction(f1, f2)`
  - `normalizeSkillId(id)`
  - `isSameSuit(s1, s2)`

### Chốt Chặn 3: Component Contract Testing Cho Giao Diện Người Chơi
- Xây dựng bài kiểm thử giao diện tự động (UI Component Test):
  - Mock ViewModel của từng tướng có kỹ năng chủ động trong Pha Hành Động.
  - Xác nhận rằng [ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx) **bắt buộc phải render ra thẻ nút bấm với nhãn tương ứng**, không được để danh sách nút bị rỗng.

### Chốt Chặn 4: Kiểm Soát Thoái Hóa Âm Thầm Trong Simulation (Anti-Silent-Degradation Metric)
- Trong các bài test mô phỏng Headless (`run_application_layer_stress_test.mjs`), bổ sung bộ đếm `SkillExecutionMetrics`:
  - Thống kê tỷ lệ kích hoạt thành công của từng kỹ năng tướng trong 1.000 trận.
  - Nếu một tướng có kỹ năng chủ động hoặc phản ứng được bốc vào ván đấu mà tỷ lệ kích hoạt bằng **0%**, bộ mô phỏng sẽ đưa ra cảnh báo đỏ (Red Flag) về nguy cơ thoái hóa âm thầm (Silent Degradation).

---

## Trạng Thái & Cam Kết (Status & Commitment)
- **Trạng thái:** Đã áp dụng toàn diện từ phiên bản v4.
- **Cam kết:** Không bao giờ phụ thuộc đơn lẻ vào Headless Simulation. Một hệ thống game thẻ bài hoàn chỉnh bắt buộc phải được bảo vệ bởi bộ 3 chân kiềng: **Unit Logic Tests + Invariant Property Audits + UI Component Contract Tests**.
