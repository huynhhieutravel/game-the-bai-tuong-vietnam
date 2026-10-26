# ADR 0092: Bọc Trăm Trứng Active Slash and Draft-to-Hand Click Bleed-Through Guard

## 1. Context & Motivation
Người chơi phát hiện 2 vấn đề quan trọng trong trải nghiệm ván đấu và luật chơi:
1. **Lá bài (như Dã Man) bị nhấc lên ngay khi vừa vào trận:** Khi người chơi vừa hoàn tất giai đoạn chọn tướng (Draft Screen) và chuyển vào bàn chơi, lá bài thứ 3 trên tay (ví dụ lá Dã Man) bị nhấc cao lên (`translateY(-20px)`). Khi người chơi di chuột ra ngoài lá bài, nó vẫn không chịu hạ xuống.
2. **Logic Kỹ năng Chúa công [Bọc Trăm Trứng] (Lạc Long Quân):**
   - Lạc Long Quân muốn chủ động dùng [Bọc Trăm Trứng] để Chém người khác trong lượt thì không có nút trên giao diện.
   - Khi yêu cầu đồng minh phe Lạc ra bài giùm (Chém hoặc Né) mà họ từ chối, Lạc Long Quân phải giữ quyền tự mình dùng lá bài tương ứng trên tay (không bị mất lượt Chém, không bị nhận sát thương oan khi trên tay còn lá Né).

## 2. Root Cause Analysis
1. **Lỗi Click Bleed-Through từ DraftScreen sang PlayerHand:**
   - Nút `[⚔️ Chốt 2 Tướng Đã Chọn]` ở màn hình Draft nằm ở chính giữa mép dưới màn hình (`bottom: 3%`).
   - Khi người chơi click nút này, component cha đổi `phase` từ `PHASES.DRAFT` sang game bàn chơi ngay lập tức.
   - Trình duyệt kích hoạt chuỗi sự kiện `pointerdown` -> `pointerup` -> `click`. Vì DraftScreen unmount ngay trong lúc click, sự kiện click rơi xuyên thấu (bleed-through) vào phần tử DOM vừa xuất hiện ở đúng tọa độ đó: Lá bài thứ 3 trong `PlayerHand`.
   - Kết quả: `handleCardClick(2)` bị kích hoạt ngầm, đưa lá Dã Man vào `targetSession`. Khi nằm trong `targetSession`, component `PlayerHand` gán class CSS `selected` (`transform: translateY(-20px)`).
   - Vì lá bài đang ở trạng thái **Được Chọn (Selected)** chứ không phải `:hover`, việc di chuột ra ngoài hoàn toàn không làm nó hạ xuống.
2. **Thiếu sót trong triển khai Bọc Trăm Trứng:**
   - [Bọc Trăm Trứng] ban đầu chỉ được cấu hình là kỹ năng bị động phản đòn (`passive`), không có trong danh sách kỹ năng chủ động của `ActionBar`.
   - Engine chưa xử lý luồng chủ động Chém kẻ địch thông qua đồng minh phe Lạc (tương tự Kích Tướng của Lưu Bị trong Tam Quốc Sát).
   - Khi đồng minh từ chối ra bài (Né hoặc Chém), hệ thống chưa có nhánh hồi lại quyền tự quyết cho Chúa công Lạc Long Quân.

## 3. Decision & Technical Implementation

### A. Triệt tiêu hoàn toàn Click Bleed-Through
1. **Event Propagation Trap tại DraftScreen ([client/src/components/game/DraftScreen.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/DraftScreen.jsx)):**
   - Trong `handleDraftConfirm(e)`, gọi `e.preventDefault()` và `e.stopPropagation()`.
2. **Transient Click Guard tại GameView ([client/src/components/game/GameView.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/GameView.jsx)):**
   - Bổ sung `clickGuardUntilRef`. Khi chuyển phase từ `PHASES.DRAFT` sang trận đấu, kích hoạt thời gian bảo vệ 450ms.
   - Đồng thời cưỡng chế reset: `setTargetSession(null)` và `setActiveSkill(null)`.
3. **Card Interaction Filter ([client/src/components/game/hooks/useCardInteraction.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/hooks/useCardInteraction.js)):**
   - Cả `handleCardClick` và `handleUnplayableClick` đều kiểm tra `clickGuardUntilRef`. Mọi cú click trong 450ms đầu sau khi chuyển cảnh đều bị hủy bỏ an toàn.

### B. Hoàn thiện Kỹ năng Chúa công [Bọc Trăm Trứng]
1. **Metadata Tướng ([shared/engine_v4/heroes/lac/index.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/heroes/lac/index.js)):**
   - Cập nhật `boc_tram_trung` thành `type: 'active'` để hệ thống nhận diện đây là kỹ năng có thể chủ động kích hoạt.
2. **Giao diện ActionBar ([client/src/components/game/ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx)):**
   - Thêm `'boc_tram_trung'` vào danh sách `activeNormIds`.
   - Tính toán trạng thái kích hoạt: Nút sáng lên khi Lạc Long Quân đang trong pha Hành Động, còn lượt Chém (`slashCount === 0` hoặc có trang bị đặc thù), và có ít nhất 1 đồng minh phe Lạc còn sống.
   - Hiển thị lý do vô hiệu hóa rõ ràng qua tooltip nếu chưa đủ điều kiện.
3. **Dispatcher & Engine Combat Rules ([shared/engine_v4/application/DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js) & [shared/engine_v4/rules/CombatRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/CombatRules.js)):**
   - Trong `_handleSkill`: Tiếp nhận `skillId: 'boc_tram_trung'` cùng `targetId`. Kiểm tra tầm đánh và đẩy frame `ASK_BOC_TRAM_TRUNG_SLASH` với cờ `isInitiatedAttack: true`.
   - **Tự động Minh Khai:** Khi đồng minh ra bài giùm, Lạc Long Quân tự động được hiển lộ danh tính Chúa công (`_ensureHeroRevealedForSkill`).
   - **Khi đồng minh Chém giùm thành công:** Lạc Long Quân tăng `slashCount` lên 1 và thực hiện phát động đòn Chém lên mục tiêu.
   - **Quyền bảo lưu khi bị từ chối:**
     - Nếu tất cả đồng minh phe Lạc từ chối ra lá Chém giùm: Frame kết thúc, `slashCount` của Lạc Long Quân **KHÔNG BỊ TĂNG** (`slashCount = 0`), cho phép Lạc Long Quân tự mình đánh lá [Chém] trên tay.
     - Khi Lạc Long Quân bị tấn công (bị Chém, Quyết Đấu, Nam Man) và đồng minh từ chối ra Né/Chém giùm: Đánh dấu `bocTramTrungFailed = true` và hoàn trả quyền phản hồi cho Lạc Long Quân để tự đánh lá Né/Chém trên tay mình.

## 4. Verification & QA Hardening
- **Engine QA ([shared/engine_v4/__tests__/heroes/LacLongQuanQA.test.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/__tests__/heroes/LacLongQuanQA.test.js)):**
  - Case 2.5: Chủ động phát động Bọc Trăm Trứng, đồng minh Chém giùm thành công.
  - Case 2.6: Đồng minh Lạc từ chối Chém -> Lạc Long Quân KHÔNG bị mất lượt Chém và vẫn tự Chém được.
  - Case 2.7: Bị Chém, đồng minh từ chối Né giùm -> Lạc Long Quân vẫn giữ quyền tự dùng lá [Né] trên tay để đỡ đòn.
  - Kết quả: **12/12 tests PASS 100%**.
- **Client UI Contract QA ([client/src/components/__tests__/ActionBarHeroSkillsContractQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/ActionBarHeroSkillsContractQA.test.jsx)):**
  - **24/24 tests PASS 100%**.
- **Full Suite Regression:**
  - 81/81 test files (692/692 tests) engine pass 100%.
  - 21/21 test files (213/213 tests) client pass 100%.
  - Production build Vite hoàn tất không lỗi.
