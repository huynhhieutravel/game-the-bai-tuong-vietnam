# ADR 0106: Ràng Buộc Luật Mở Tướng Theo Lượt & Chuẩn Hóa Nhịp Độ Trận Đấu Vừa Phải (Turn-Bound Hero Reveal & Moderate Game Pacing)

## 1. Bối cảnh & Vấn đề (Context & Problem Statement)

Trong quá trình trải nghiệm game thực tế của người chơi, hai vấn đề lớn đã được phát hiện và phản ánh:
1. **Lỗi Vi Phạm Luật Quốc Chiến Về Lật Tướng (Turn Violation in Hero Reveal):**
   - **Hiện tượng:** Trong lượt của người chơi khác (ví dụ: Bot 1, Bot 2, Bot 3 đang hành động), người chơi chính (Bạn) vẫn có thể nhấp vào nút **"Lật"** trên Avatar của hai tướng úp trong `MyHeroBar.jsx` và lật ngửa tướng ra bất cứ lúc nào.
   - **Nguyên nhân gốc rễ:** 
     - Giao diện `MyHeroBar.jsx` không kiểm tra trạng thái lượt hay khung sự kiện chờ, nút "Lật" luôn ở trạng thái enabled không điều kiện.
     - Hàm `handleRevealClick` trong `GameView.jsx` gọi trực tiếp `gameAPI.revealHero(mainPlayerId, heroIndex)`.
     - Handler `_handleRevealHero` trong tầng ứng dụng `DispatcherV4.js` thực thi ngay lập tức lệnh lật tướng mà không kiểm tra xem có phải lượt của người chơi hay không, và không kiểm tra có sự kiện/phản hồi nào đang chờ người chơi này hay không.
   - **Luật Quốc Chiến chuẩn (Tam Quốc Sát / Việt Sát):**
     - Người chơi **CHỈ ĐƯỢC CHỦ ĐỘNG** mở tướng trong các giai đoạn trong lượt của chính mình (Đầu lượt, Rút bài, Ra bài, Bỏ bài).
     - Ngoài lượt của mình, người chơi **TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý MỞ TƯỚNG BẤT KỲ**, trừ phi có sự kiện kích hoạt hoặc khung ưu tiên đang yêu cầu người chơi phản hồi (ví dụ: bị Chém hỏi Né `ASK_DODGE`, sắp chết hỏi Đào `ASK_PEACH`, cẩm nang hỏi Hóa Giải `ASK_NEGATE`, chịu sát thương kích hoạt kỹ năng phản hồi).
2. **Cân Bằng Lại Nhịp Độ Trận Đấu (Game Pacing Recalibration):**
   - Sau khi tối ưu loại bỏ điểm nghẽn 2.7s - 5.4s ở ADR 0105, mức delay 50ms ở một số phản hồi tự động bỏ qua (pass) tạo cảm giác hơi quá nhanh hoặc giật mắt.
   - Người chơi yêu cầu: *"Không cần lâu nhưng nhịp cũng vừa phải, chỉ là điểm nghẽn đừng lâu quá."*
   - Cần một nhịp độ vừa vặn: Đủ thời gian cho mắt người theo dõi chỉ số và đường đi của lượt, nhưng không tạo ra bất kỳ khoảng lặng/đóng băng gây ức chế nào.

---

## 2. Quyết định Thiết kế (Design Decisions)

### 2.1. Kiến Trúc Bảo Vệ 3 Tầng Cho Quy Tắc Lật Tướng (3-Tier Hero Reveal Guard)

Hệ thống thiết lập 3 tầng chốt chặn nghiêm ngặt:
1. **Tầng Giao Diện UI (`MyHeroBar.jsx`):**
   - Tính toán điều kiện lật tướng:
     ```javascript
     const currentTurnId = gameState?.currentTurnPlayerId ?? gameState?.currentPlayerIndex;
     const isMyTurn = currentTurnId !== undefined && currentTurnId !== null ? currentTurnId === me?.id : true;
     const hasWaitingResponse = Boolean(
       gameState?.waitingForResponse && (
         gameState.waitingForResponse.responderId === me?.id ||
         gameState.waitingForResponse.targetId === me?.id ||
         (Array.isArray(gameState.waitingForResponse.askQueue) && gameState.waitingForResponse.askQueue.includes(me?.id))
       )
     );
     const canRevealHero = isMyTurn || hasWaitingResponse;
     ```
   - Nút "Lật" được gán thuộc tính `disabled={!canRevealHero}` (nút tự động mờ đi 50% opacity, con trỏ chuột chuyển `not-allowed` theo CSS có sẵn `.btn-action:disabled`, tuyệt đối tuân thủ quy tắc CSS is locked).
   - Tooltip nút cập nhật tương ứng:
     - Khi bị khóa: `"Chỉ có thể mở tướng trong lượt của bạn hoặc khi có sự kiện kích hoạt"`.
     - Khi khả dụng: `"Lật mở tướng này làm Tướng Chính"` hoặc `"Lật mở Phó Tướng"`.
   - Hàm `onClick` có chốt chặn sớm: `if (!canRevealHero) return;`.

2. **Tầng Điều Khiển Client Controller (`GameView.jsx`):**
   - Trong `handleRevealClick(heroIndex)`:
     - Kiểm tra nếu `!isMyTurn && !hasWaitingResponse`:
       - Hiển thị Toast Banner cảnh báo: `showPhaseBanner("⚠️ Bạn chỉ có thể mở tướng trong lượt của mình hoặc khi có sự kiện kích hoạt!")`.
       - Dừng ngay thao tác, không gửi request xuống Engine.

3. **Tầng Ứng Dụng Engine (`DispatcherV4.js` & `GameAPIV4.js`):**
   - `GameAPIV4.revealHero`: Tự động gắn cờ `isPlayerAction: true`.
   - `DispatcherV4._handleRevealHero`:
     - Nếu `isPlayerAction && !force && !isMyTurn && !hasActiveFrame && !hasActiveWaiting`:
       - Log cảnh báo warning và ghi nhật ký trận đấu `⚠️ Không thể mở tướng khi chưa tới lượt và không có sự kiện kích hoạt!`.
       - Từ chối thực thi lật tướng.
     - Vẫn cho phép các unit test cấp thấp của engine chạy mô phỏng trực tiếp nếu không phải hành động người chơi chủ động hoặc khi có cờ `force: true`.

---

### 2.2. Chuẩn Hóa Nhịp Độ Trận Đấu Vừa Phải (Moderate Pacing Calibration)

Bảng cấu hình `BOT_PACE_CONFIG` được tinh chỉnh để đạt "điểm rơi" hoàn hảo:
```javascript
const BOT_PACE_CONFIG = {
  slow: {
    action: 1500,
    reaction: 1200,
    draw: 700,
    discard: 800,
    end: 600,
    draft: 500,
    passReaction: 350,
    idleAction: 700,
    idleDiscard: 350,
    idleEnd: 250
  },
  normal: { // Tốc độ mặc định - Nhịp vừa phải, triệt tiêu điểm nghẽn
    action: 1100,
    reaction: 800,
    draw: 450,
    discard: 500,
    end: 400,
    draft: 500,
    passReaction: 200, // 200ms khi bỏ qua/không có bài (3 bot = 600ms, vừa mắt nhìn, không nghẽn 2.7s - 5.4s)
    idleAction: 500,   // 500ms khi hết bài trong Action (nửa giây nhịp thở tự nhiên)
    idleDiscard: 250,  // 250ms khi không cần bỏ bài
    idleEnd: 200       // 200ms dọn dẹp chuyển lượt
  },
  fast: { // Tốc độ nhanh (dành cho test)
    action: 700,
    reaction: 600,
    draw: 300,
    discard: 400,
    end: 300,
    draft: 500,
    passReaction: 100,
    idleAction: 300,
    idleDiscard: 150,
    idleEnd: 100
  }
};
```

- **Khi 3 Bot liên tiếp bỏ qua phản hồi (Pass):** Tổng thời gian là $3 \times 200ms = 600ms$. Mắt người chơi thấy rõ vệt sáng chuyển từ Bot 1 $\to$ Bot 2 $\to$ Bot 3, nhịp chơi trôi mượt mà, không bị khựng đơ 5.4 giây, cũng không bị biến mất như ảo ảnh (50ms).
- **Khi Bot hết bài trong Action Phase:** Dừng lại đúng 500ms (`idleAction`) tạo cảm giác quan sát bàn đấu tự nhiên trước khi kết thúc pha.
- **Khi Bot không cần bỏ bài:** Dừng lại 250ms (`idleDiscard`).

---

## 3. Kết quả & Đảm bảo Chất lượng (Results & Verification)

1. **Vitest Suite:** 112/112 files test vượt qua (970/970 tests passed), bao gồm test đặc thù `Test 11` trong `RevealRewardsQA.test.js` kiểm chứng tính toàn vẹn của việc chặn mở tướng ngoài lượt.
2. **Simulation Stress Test:** Vượt qua đại giả lập 1,000 trận tầng ứng dụng và 1,000 trận core engine với 0 deadlock, 0 desync.
3. **Tuân thủ quy tắc CSS:** Toàn bộ hiệu ứng disable được xử lý thông qua thuộc tính HTML `disabled` nguyên bản kết hợp CSS `.btn-action:disabled` đã tồn tại, tuyệt đối không chỉnh sửa file `.css` hay inline styling.
