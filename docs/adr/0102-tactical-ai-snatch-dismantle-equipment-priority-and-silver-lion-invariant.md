# ADR 0102: Nâng Cấp Trí Tuệ Bot AI Cho Cướp Bài & Tước Bài (Ma Trận Định Giá Trang Bị, Bất Biến Bạch Ngân Sư Tử & Giao Thức Bóc Vỏ Bọc Phòng Thủ)

## 1. Bối cảnh & Vấn đề (Context & Problem)
- **Vấn đề người chơi phản ánh:**
  - Bot AI sử dụng **Cướp Bài (Thuận Thủ Khiên Dương)** và **Tước Bài (Quá Hà Chiết Kiều)** rất kém hiệu quả: thay vì hủy/cướp trang bị nguy hiểm của đối phương (như Bát Quái Trận, Chu Cát Liên Nỏ), Bot lại tự động rút bài trên tay ngẫu nhiên một cách lãng phí.
- **Nguyên nhân cốt lõi (Root Cause):**
  1. **Lỗi ngắt mạch truyền tin trong `BotRunnerV4`:** Khi Bot phát lệnh `PLAY_CARD` với lá Cướp/Tước, `BotRunnerV4.js` chỉ truyền `{ virtualCardName, asSlash, asChain }` mà quên đóng gói `targetCardId: action.targetCardId`. Khi Engine không nhận được `targetCardId`, `TrickRules.resolveSteal` và `resolveDismantle` rơi vào nhánh mặc định: rút 1 lá bài trên tay nạn nhân (`target.hand.pop()`)!
  2. **Thuật toán Bot thiếu chiều sâu chiến thuật:**
     - Chưa có thang điểm ưu tiên trang bị (Threat Scoring): Bát Quái Trận né 50% vs Chu Cát Liên Nỏ xả Chém vô hạn vs Ngựa thủ +1.
     - Phạm sai lầm ngớ ngẩn khi Tước Bài lên `Bạch Ngân Sư Tử` của kẻ địch đang bị thương (khiến kẻ địch được hồi 1 HP miễn phí).
     - Không nhận biết cơ hội dồn sát thương khi kẻ địch chỉ còn 1 bài tay (rất có thể là Né/Đào) để bóc vỏ bọc phòng thủ trước khi tung đòn Chém kết liễu.

---

## 2. Quyết định Kiến trúc & Thiết kế Chiến thuật (Architectural Decisions)

Được chuẩn hóa thông qua quy trình **/grill-with-docs** gồm 5 trụ cột:

### 2.1. Nối Lại Mạch Truyền Tin Kỹ Thuật (Data Flow Integration - Q5)
- Trong `BotRunnerV4.js`: Khi phát lệnh `PLAY_CARD`, truyền đầy đủ `targetCardId: action.targetCardId` và `zone: action.zone` vào `gameAPI.playCard()`.
- Trong `HeadlessRunner.js`, `run_1000_matches.mjs`, và `run_application_layer_stress_test.mjs`: Đóng gói `targetCardId` vào `extraArgs` của `TrickRules.playTrick()`.
- Đảm bảo Engine thực thi chính xác lá bài mà Bot đã chủ đích chọn.

### 2.2. Ma Trận Định Giá Trang Bị Của Kẻ Địch (Offensive Priority Matrix - Q1)
Bot chấm điểm các trang bị của kẻ địch theo thang điểm đe dọa:
1. **Bát Quái Trận (Điểm 100):** Giáp né 50% miễn phí không tốn bài tay. Ưu tiên phá/cướp số 1 để mở đường cho sát thương phe ta.
2. **Chu Cát Liên Nỏ (Điểm 95 - 110):** Vũ khí xả Chém vô hạn. Nếu là Cướp Bài và Bot chưa có Liên Nỏ, ưu tiên tối đa (110 điểm) để cướp về tay Bot. Nếu là Tước Bài, ưu tiên 95 điểm để tước vũ khí nguy hiểm nhất của địch.
3. **Vũ khí công kích khác (Điểm 75):** Cổ Đĩnh Đao, Phương Thiên Kích, Thanh Long Đao.
4. **Ngựa thủ (+1 Distance) (Điểm 70):** Cản trở tầm đánh của phe ta, phá để mở tầm đánh.
5. **Ngựa công (-1 Distance) (Điểm 50):** Giúp địch áp sát, phá để giảm áp lực lên đồng minh.

### 2.3. Bất Biến Bạch Ngân Sư Tử (Silver Lion Invariant - Q2)
- Trang bị `Bạch Ngân Sư Tử` khi rời khỏi người khiến chủ nhân hồi 1 HP.
- **Khi Tước Bài (Hủy):** Tuyệt đối **CẤM** tước Bạch Ngân của kẻ địch nếu kẻ địch đang bị thương (`target.hp < target.maxHp`), tránh hành vi "giúp địch hồi máu". Chỉ được phép tước nếu kẻ địch đang đầy máu (`target.hp >= target.maxHp`).
- **Khi Cướp Bài:** Chỉ cướp nếu kẻ địch đầy máu, hoặc bản thân Bot đang bị thương và chưa có giáp (`!bot.equipment?.armor && bot.hp < bot.maxHp`).

### 2.4. Giao Thức Bóc Vỏ Bọc Phòng Thủ (Lethal Hand-Stripping Protocol - Q3)
- Khi kẻ địch còn ít máu (`target.hp <= 2`), chỉ còn đúng **1 lá bài trên tay**, và Bot đang có sẵn [Chém] trong tầm đánh:
  - Lá bài duy nhất của địch rất có thể là lá [Né] hoặc [Đào].
  - Bot **ưu tiên giật lá bài trên tay** (`zone: 'hand'`) thay vì cướp trang bị, nhằm bóc sạch lớp phòng thủ cuối cùng trước khi tung đòn Chém kết liễu 100% trúng đích.

### 2.5. Phân Hóa Rạch Ròi Cướp (Snatch) vs Hủy (Dismantle) (Q4)
- **Cướp Bài:** Mang tính cướp tài nguyên về cho Bot. Nếu địch có nhiều bài tay ($\ge 4$) nhưng trang bị điểm thấp, Bot ưu tiên cướp bài tay để tăng quân số bài.
- **Tước Bài:** Mang tính triệt hạ mối nguy cơ. Ưu tiên phá hủy giáp né $\rightarrow$ vũ khí liên nỏ $\rightarrow$ ngựa thủ.
- **Cứu viện đồng minh:** Cả hai kỹ năng đều ưu tiên tuyệt đối gỡ cẩm nang phán xét độc hại (Sấm Sét $\rightarrow$ Hỗn Loạn $\rightarrow$ Binh Lương) trên người đồng minh hoặc bản thân.

---

## 3. Kết Quả Kiểm Định (Validation)
- Bổ sung 5 test case kiểm thử toàn diện trong `shared/engine_v4/__tests__/ai/BotBrainTacticalTricksAndSafeDuelQA.test.js`:
  - Test 9: Ưu tiên Bát Quái Trận khi Tước Bài.
  - Test 10: Ưu tiên cướp Chu Cát Liên Nỏ khi Bot chưa có Nỏ.
  - Test 11: Cấm tước Bạch Ngân Sư Tử khi địch bị thương.
  - Test 12: Cho phép tước Bạch Ngân Sư Tử khi địch đầy máu.
  - Test 13: Bóc vỏ bọc phòng thủ khi địch 1 HP chỉ còn 1 bài tay.
- Toàn bộ **110/110 test files (946/946 tests)** pass 100%.
- Client Vite build thành công 0 lỗi.
