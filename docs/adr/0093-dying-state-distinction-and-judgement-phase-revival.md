# ADR 0093: Dying State Distinction, Judgement Phase Revival, and Opponent Badge Relocation

## 1. Context & Motivation
Người chơi báo cáo 2 vấn đề lớn trong trải nghiệm giao diện và dòng chảy trạng thái trận đấu:
1. **Tên người chơi bị badge che khuất / cắt cụt:** Khi tướng lộ diện danh tính, huy hiệu Phe (`[LAC]`, `[DÃ TÂM]`, `[VIỆT]`) cùng biểu tượng quan hệ (`⚔️` / `🤝`) nằm chung hàng với tên người chơi, khiến tên bị co cụm thành `"Ngư..."` hoặc `"Người c..."`.
2. **Hiển thị nhầm trạng thái Tử Trận khi Hấp Hối & Đứng hình sau khi hồi phục từ Sấm Sét:**
   - Khi người chơi bị Sấm Sét nổ trúng trừ hết máu (HP = 0), giao diện lập tức hiển thị con dấu và nhãn `💀 TỬ TRẬN` thay vì `⚠️ HẤP HỐI`.
   - Khi người chơi dùng lá [Rượu] để tự cứu, sinh lực phục hồi lên 1 HP, nhưng trận đấu bị đóng băng ("đứng hình luôn") ở `Giai đoạn judgement`, không chuyển tiếp sang pha Rút bài / Hành động và người chơi không thể làm gì tiếp.

## 2. Root Cause Analysis
1. **Tên người chơi bị cắt cụt:**
   - Trong [client/src/components/game/PlayerBoard.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/PlayerBoard.jsx), phần tử `player-header-bar` sử dụng `justify-content: space-between`.
   - Chiều rộng của khung người chơi đối thủ trên giao diện di động khoảng 110px. Khi huy hiệu phe và biểu tượng đối đầu/đồng minh chiếm khoảng 60px, `player-name` chỉ còn lại khoảng 40px - 50px, dẫn đến việc chữ "Người chơi 2", "Người chơi 3" bị cắt ngắn thành "Ngư...", gây cảm giác huy hiệu đè lên che mất tên.
2. **Nhầm lẫn giữa Tử Trận và Hấp Hối:**
   - Tại `PlayerBoard.jsx` và `MyHeroBar.jsx`, biến `isDead` được định nghĩa sai:
     `const isDead = player.isAlive === false || (typeof player.hp === 'number' && player.hp <= 0);`
   - Theo luật Tam Quốc Sát / Việt Sát: Khi HP <= 0, người chơi bước vào trạng thái **HẤP HỐI (DYING)** để chờ cứu viện ([Đào]/[Rượu]). Chỉ khi hết vòng cứu viện mà không ai cứu, `CombatRules.handleDeath` mới được gọi và đặt `player.isAlive = false` (**TỬ TRẬN**). Việc gộp chung làm người chơi vừa cạn máu đã bị dán nhãn Tử Trận, sau đó uống Rượu thì "hồi sinh" bất thường.
3. **Đứng hình sau khi thoát Hấp hối trong Pha Phán Xét:**
   - Khi Sấm Sét nổ trong Pha Phán Xét (`PHASES.JUDGE`), sát thương đưa người chơi vào hấp hối và đẩy frame `ASK_PEACH` vào `priorityStack`.
   - Khi người chơi dùng [Rượu], `CombatRules.respondPeach` hồi máu lên 1 và `state.priorityStack.pop()`.
   - `priorityStack` trở nên rỗng (`isEmpty() === true`), nhưng trong `DispatcherV4._handleReact` ở nhánh `case 'ASK_PEACH'`, engine không gọi `this.stateMachine._completeJudgePhase()`.
   - Hậu quả: Trạng thái game bị kẹt vĩnh viễn ở `PHASES.JUDGE` dù khu phán xét đã giải quyết xong và không còn frame nào trên stack.

## 3. Decisions & Technical Implementation

### A. Tái cấu trúc Vị trí Badge Phe Đối Thủ
- **Chuyển Badge Phe ra ngoài góc phải khung thẻ tướng:**
  - Định vị tại `position: 'absolute', top: '-8px', right: '3px', zIndex: 26` của `opponent-dual-hero-frame`. Vị trí này đối xứng hoàn hảo với Khu phán xét (`top: '-9px', left: '2px'`).
  - Toàn bộ thanh `player-header-bar` phía trên được giải phóng 100% chiều rộng cho `player.name`.
  - Tên người chơi ("Người chơi 2", "Người chơi 3", "Người chơi 4") hiển thị trọn vẹn, không bao giờ bị cắt cụt hay che khuất.

### B. Tách bạch Trạng thái Hấp Hối (Dying) và Tử Trận (Dead)
- Định nghĩa phân tách rõ ràng trong [PlayerBoard.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/PlayerBoard.jsx) và [MyHeroBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/MyHeroBar.jsx):
  ```javascript
  const isDead = player.isAlive === false;
  const isDying = player.isAlive !== false && typeof player.hp === 'number' && player.hp <= 0;
  ```
- **Khi `isDying` (Hấp hối):**
  - Badge trạng thái hiển thị: `⚠️ HẤP HỐI` (gradient cam/đỏ, viền vàng cam rực, hiệu ứng pulse).
  - Overlay trên thẻ tướng: Hiển thị con dấu cảnh báo `⚠️ HẤP HỐI` (đối thủ) hoặc `⚠️ BẠN ĐANG HẤP HỐI` (bản thân).
  - Bộ lọc ảnh tướng: Giữ màu hoặc cảnh báo nhẹ, tuyệt đối không áp dụng bộ lọc xám đen trắng tử trận (`grayscale`).
- **Khi `isDead` (Thực sự tử trận):**
  - Badge và overlay hiển thị chuẩn mực `💀 TỬ TRẬN` / `💀 BẠN ĐÃ TỬ TRẬN` kèm bộ lọc xám đen trắng.

### C. Cơ chế Hoàn tất Pha khi Thoát Hấp hối
- **DispatcherV4 ([shared/engine_v4/application/DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js)):**
  - Trong `case 'ASK_PEACH'`: Sau khi `CombatRules.respondPeach` thực thi và `priorityStack.isEmpty() === true`:
    ```javascript
    if (this.state.currentPhase === PHASES.JUDGE && this.state.priorityStack.isEmpty()) {
      this.stateMachine._completeJudgePhase();
    } else if (this.state.currentPhase === PHASES.DRAW && this.state.priorityStack.isEmpty()) {
      this.stateMachine._completeDrawPhase();
    } else if (this.state.currentPhase === PHASES.BEGIN && this.state.priorityStack.isEmpty()) {
      this.stateMachine._completeBeginPhase();
    }
    ```
- **StateMachine ([shared/engine_v4/core/StateMachine.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/core/StateMachine.js)):**
  - Trong `_completeJudgePhase()`, `_completeDrawPhase()`, `_completeBeginPhase()`: Nếu người chơi tử trận (`!player.isAlive`), tự động kích hoạt `this.nextTurn()` (nếu trận đấu chưa kết thúc) để tránh deadlock.
  - Khi người chơi được cứu sống trong Pha Phán Xét, `_completeJudgePhase()` tự động kiểm tra các cẩm nang còn lại hoặc chuyển mượt mà sang `_runPhaseDraw()` (rút bài) và `_runPhaseAction()` (pha hành động).

## 4. Verification & QA Hardening
1. **Unit Test Mới ([client/src/components/__tests__/DyingStateAndJudgementRevivalQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/DyingStateAndJudgementRevivalQA.test.jsx)):**
   - Test 1: PlayerBoard hiển thị `⚠️ HẤP HỐI` khi HP = 0, `isAlive = true`, không xuất hiện `TỬ TRẬN`, tên không bị cắt.
   - Test 2: MyHeroBar hiển thị `⚠️ BẠN ĐANG HẤP HỐI` khi HP = 0, `isAlive = true`.
   - Test 3: Bị nổ Sấm Sét HP = 0 ở pha JUDGE, dùng Rượu hồi phục 1 HP -> Dispatcher tự động chuyển pha từ JUDGE sang ACTION, hoàn toàn không bị đứng hình.
   - **3/3 tests PASS 100%**.
2. **Regression Testing:**
   - Client Component Tests: **22/22 test files (216/216 tests) PASS 100%**.
   - Engine Core Tests: **81/81 test files (692/692 tests) PASS 100%**.
   - Production bundle build: Vite build thành công không lỗi trong 477ms.
