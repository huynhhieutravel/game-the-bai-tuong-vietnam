# Lịch Sử Sửa Lỗi (Bug History Log)

Tài liệu này ghi nhận lại toàn bộ các lỗi nghiêm trọng (Critical Bugs) đã phát sinh trong quá trình phát triển/chơi thử nghiệm, nguyên nhân gốc rễ (Root Cause) cực kỳ lắt léo ở tầng Core Engine, và cách khắc phục để giúp quản lý vòng đời phát triển dự án.

## Chuyên đề: Nhóm Lỗi Đánh [Chém] Liên Tục (Infinite Slash Bug)

Hai lỗi dưới đây có chung một biểu hiện là người chơi có thể đánh [Chém] liên tục vô hạn, nhưng nguyên nhân (Root Cause) lại xuất phát từ 2 tầng hoàn toàn khác nhau (Core Engine và UI).

### Phần 1: Lỗi Core Engine gây Crash ngầm (Lỗi số 1)
* **Triệu chứng:** Người chơi đánh lá [Chém] nhưng không bị mất bài trên tay. Đối thủ vẫn mất máu/Né bình thường. Đánh xong lại bấm [Chém] được tiếp tục vô hạn lần trong cùng một lượt.
* **Nguyên nhân bề mặt:** Tưởng do logic đếm giới hạn đánh Chém (biến `attackCountThisTurn`) bị sai hoặc không được lưu.
* **Nguyên nhân gốc rễ (Root Cause):**
  * Khi người chơi đánh [Chém], đối thủ (Bot) phản hồi bằng lá [Né]. Hành động Né kích hoạt cơ chế duyệt tìm các Kỹ năng ẩn phản ứng (Hook `ON_USE_CARD` / `ON_DODGE`).
  * Hệ thống quét qua một người chơi khác (VD: Tiên Dung) có kỹ năng `Duyên Tiên` (Kích hoạt khi dùng bài). Kỹ năng này kiểm tra xem người chơi đó lộ mặt chưa bằng hàm `isPlayerRevealed`.
  * **TUY NHIÊN**, hàm `isPlayerRevealed` bị THIẾU lệnh `import` trong file `SkillRegistry.js`!
  * **Hậu quả:** Engine Game **bị crash (văng lỗi ReferenceError) ngầm ở mức code** giữa chừng lúc đang xử lý vòng lặp Dispatcher. Vì Engine crash, sự kiện không bao giờ hoàn tất để xuất ra React State mới (`gameState`). UI không nhận được trạng thái cập nhật, không xóa lá bài trên tay, và không lưu số lần đã Chém. Trạng thái Game vĩnh viễn kẹt ở lúc chưa đánh lá bài đó.
* **Cách fix:** Bổ sung `import { isPlayerRevealed }` vào `SkillRegistry.js`. (Bài học: Cần đảm bảo không có Exception nào xảy ra bên trong Game Engine, nếu không React State sẽ không được đồng bộ).

### Phần 2: Ảo giác UI - Khóa tương tác lá bài (Lỗi số 11)
* **Triệu chứng:** Người chơi vẫn bấm được vào lá [Chém] nhiều lần dù đã hết số lần đánh trong lượt. Mặc dù hệ thống core từ chối (ghi log lỗi), nhưng UI không hiển thị trạng thái bị khóa, khiến người chơi tưởng mình đánh được nhưng không có gì xảy ra.
* **Nguyên nhân gốc rễ:** Hàm render bài trên tay trong `App.jsx` chưa kiểm tra điều kiện `canPlayCard` để disable các lá bài không hợp lệ. Do đó nút bấm vẫn mở, người chơi bấm vào vẫn kích hoạt `ACTION_PLAY_CARD` gửi xuống backend. Backend từ chối và trả về state y nguyên, tạo ra cảm giác "đánh nhưng bị kẹt".
* **Cách fix:** Import `canPlayCard` vào `App.jsx`, thêm class `unplayable` để làm mờ lá bài, hiển thị con trỏ `not-allowed`, và chặn sự kiện `onClick` đối với các lá bài không thỏa mãn điều kiện.

---

## 10. Lỗi nhảy lượt khi Kết Thúc làm đè kỹ năng cuối lượt (An Bang, Dưỡng Quân)

## 2. Lỗi Bot Đinh Điền (Phạt Tội) bắt Game hỏi nhầm người gây Treo (Deadlock)
* **Triệu chứng:** Khi Đinh Điền bị tấn công và dùng lá [Né], game đột nhiên đứng hình "Người chơi 3 đang chờ...". Kẻ tấn công không nhận được cửa sổ chọn lựa.
* **Nguyên nhân gốc rễ:**
  * Kỹ năng `Phạt Tội` của Đinh Điền quy định: Khi né thành công, ép kẻ tấn công đưa ra lựa chọn (Mất 1 máu hoặc cho Đinh Điền rút 1 lá).
  * Trong `Dispatcher.js`, sự kiện `ON_DODGE` lại chỉ truyền payload là `sourceId = Kẻ Vừa Né (Đinh Điền)`. Do không biết ai là kẻ tấn công, Kỹ năng `Phạt Tội` vô tình tạo ra một `ask_phat_toi` và gửi nó cho... chính Đinh Điền.
  * Bot Đinh Điền nhận được câu hỏi `ask_phat_toi`, nhưng Bot AI chưa được dạy cách trả lời câu hỏi này -> Bot im lặng -> Game treo vĩnh viễn chờ Bot.
* **Cách fix:**
  * Sửa Payload của Hook `ON_DODGE` trong `Dispatcher.js`, truyền thêm `attackerId` (Lấy từ sự kiện đánh bài trước đó).
  * Cập nhật Kỹ năng `Phạt Tội` để gắn `targetId = attackerId` cho câu hỏi, giúp UI Game chuyển giao diện hiển thị về đúng màn hình của Kẻ Tấn Công (Người thật).

## 3. Lỗi Phá Quân / Phạt Tội nhảy Hook sai mục tiêu (Nhảy ké)
* **Triệu chứng:** Kẻ địch đánh Chém lẫn nhau, nhưng tướng của mình (Trần Hưng Đạo / Đinh Điền) tự nhiên bay vào kích hoạt skill tước bài hoặc bắt người ta mất máu.
* **Nguyên nhân gốc rễ:** Hook `ON_USE_CARD` và `ON_DODGE` khi quét qua danh sách người chơi, không kiểm tra xem người sở hữu kỹ năng có thực sự là người vừa thực hiện hành động đó không (thiếu dòng lệnh `if (playerId !== sourceId) return false;`).
* **Cách fix:** Đặt "ổ khóa" chặn Hook lại, chỉ kích hoạt nếu `playerId` trùng khớp với người gây ra sự kiện.

## 4. Bot AI làm treo game khi chủ động dùng kỹ năng (VD: Tuệ Tĩnh dùng Diệu Dược)
* **Triệu chứng:** Tới lượt Tuệ Tĩnh, Bot kích hoạt Diệu Dược cứu đồng đội. Game đứng hình ngay lập tức ở trạng thái "Người chơi 2 đang suy nghĩ...".
* **Nguyên nhân gốc rễ:**
  * Khi AI kích hoạt skill, Game sinh ra một Request (VD: `ask_dieu_duoc`). Lúc này UI nhảy sang bước hiển thị màn hình chọn lựa dựa vào trường `targetId` trong Request.
  * Nhưng Kỹ năng không đính kèm `targetId` vào Request. UI không biết mở Popup cho ai, dẫn đến Event Loop dừng lại, vòng lặp không được giải quyết tiếp.
* **Cách fix:** Cập nhật lõi `App.jsx`, thêm logic Fallback thông minh: `targetId = req.targetId || req.sourceId || req.playerId`. Mọi request nếu quên ghi đích đến sẽ tự động hỏi ngược lại người khởi tạo skill.

## 5. Vắc-xin chống treo Game toàn cầu (Universal AI Fallback)
* **Mô tả bối cảnh:** Quá nhiều lỗi làm treo (Deadlock) Game do Bot AI nhận được các Yêu cầu (Request) lạ mà chưa có logic code sẵn.
* **Giải pháp vĩnh cửu:** 
  * Cài cắm một cơ chế "Universal Fallback" vào Lõi Tư duy của Bot (`botLogic.js`). Bất cứ khi nào Bot nhận một `req.type` mà nó không hiểu (chưa lập trình kịp), thay vì câm nín làm sập Game, Bot sẽ **tự động thét lên Console (cảnh báo Developer) và trả về lệnh Hủy/Bỏ qua (Cancel)**.
  * Việc này đảm bảo Event Loop của Game luôn được đẩy về phía trước. Lỗi logic (nếu có) chỉ làm Bot đánh dở đi, chứ không phá hỏng hoàn toàn trải nghiệm chơi của 8 người.

## 6. Sửa lỗi kịch bản Reference Error từ IIFE và Reducer DrawCards
* **Triệu chứng:** Game crash ngầm khi khởi tạo và kích hoạt Skill có sử dụng closure hoặc Effect phức tạp như DrawCards, làm vỡ Event Loop.
* **Nguyên nhân:** Cấu trúc IIFE cũ bị viết sai (truyền thiếu tham số) và hàm `Reducer.drawCards` thay đổi State bất hợp pháp dẫn tới ReferenceError và Side-effects ngoài ý muốn, làm hỏng LIFO Dispatcher của ReactionStack.
* **Cách fix:** Viết lại `SkillRegistry.js`, xóa toàn bộ IIFE lồng nhau, chuẩn hóa việc sử dụng `dispatcher.applyEffect(Effects.DrawCardEffect(...))` thay cho Reducer thủ công.

## 7. Lỗi Log giả làm tưởng chém vô hạn (Ghost Slash Bug)
* **Triệu chứng:** Người chơi click lá [Chém] nhiều lần. Mỗi lần đều hiện Log "Người chơi 1 đánh [Chém] lên Người chơi 2" nhưng thực tế không ai mất máu, bài vẫn nằm trên tay, cứ click là hiện Log như kiểu có Liên Nỏ chém vô hạn.
* **Nguyên nhân gốc rễ:** Trong `Dispatcher.js` ở `EVENT_ACTION_PLAY_CARD`, hàm ghi Log (`this.addLog(...)`) lại được gọi TRƯỚC KHI gọi hàm kiểm tra tính hợp lệ (`canPlayCard`). Do lần đầu chém đã hết lượt (attackCountThisTurn = 1), lần chém tiếp theo `canPlayCard` trả về `false` và ngắt hàm (return) -> Lá bài không được đánh ra, nhưng Log thì ĐÃ ĐƯỢC IN RA rồi, tạo cảm giác như bị lỗi chém vô hạn.
* **Cách fix:** Di chuyển khối lệnh ghi Log xuống BÊN DƯỚI dòng kiểm tra `validation.valid`. Chỉ ghi log khi bài thực sự đã thỏa mãn điều kiện và được đánh ra.

## 8. Lỗi Đứng Hình/Treo Game Kín (Infinite Loop) do Bot dùng Tiên Phong
* **Triệu chứng:** Game bị đứng (freeze) vào lượt của Bot có kỹ năng Tiên Phong (VD: Nguyễn Lữ). UI bị liệt nhưng Console thì báo loop liên tục: `EVENT_ACTION_USE_SKILL` -> `EVENT_TRIGGER_SKILL_ASK` -> `EVENT_ACTION_REACT` -> `EVENT_ACTION_SKILL_RESPONSE`.
* **Nguyên nhân gốc rễ:**
  * Kỹ năng `Tiên Phong` của Bot trong `BotLogic.js` quyết định dùng kỹ năng nhưng **không kiểm tra xem có kẻ địch nào trên sân hay không**. Nó gọi `ACTION_USE_SKILL`.
  * Trong Game, `getAlivePlayers` vô tình loại bỏ Người Chơi thật (Human - id: 0). Do đó Bot nhìn quanh không thấy ai (vì những Bot khác là phe ẩn hoặc cùng phe).
  * Game hỏi Bot "Dùng Tiên Phong lên ai?", Bot trả về `cancel` (Hủy) do không có target.
  * Kỹ năng `Tiên Phong` xử lý lệnh Hủy bằng cách tắt Event, nhưng **không đánh dấu cờ `tienPhongUsedThisTurn = true`**.
  * React render lại màn hình -> Đến lượt của Bot -> Bot thấy `!tienPhongUsedThisTurn` -> Lại dùng kỹ năng Tiên Phong -> Lại Hủy -> Lại render... tạo thành Loop vô cực khiến Game treo ngay lập tức.
* **Cách fix:** 
  * Cập nhật `BotLogic.js`, chỉ gửi lệnh dùng Tiên Phong nếu `enemies.length > 0`.
  * Sửa hàm `getAlivePlayers` để bao gồm cả Người Chơi (Human), giúp Bot có thể dùng kỹ năng lên Người Chơi một cách chính xác.

## 9. Lỗi Treo Game Vô Tận khi dùng Cướp Bài (Hoặc Phá Bài) lên Bot
* **Triệu chứng:** Người chơi dùng lá [Cướp Bài] lên một con Bot. Vòng hỏi Hóa Giải (ask_negate) được kích hoạt để hỏi Bot xem có Hóa Giải không. Game bị treo hoàn toàn, Console báo "Unhandled request type: ask_negate" và chạy vòng lặp vô hạn `EVENT_ACTION_SKILL_RESPONSE`.
* **Nguyên nhân gốc rễ:**
  * Khối Fallback của Bot AI bắt được câu hỏi `ask_negate` lạ lẫm, bèn tự động trả về lệnh Hủy (Bỏ qua). Tuy nhiên, khối Fallback này được lập trình để trả về `ACTION_SKILL_RESPONSE`.
  * Do định dạng sai, Engine Game không dịch được payload Hủy đó để kết thúc Event. Lệnh Hủy bị rớt đài, Game đinh ninh Bot chưa trả lời nên tiếp tục hỏi lại `ask_negate`, tạo vòng lặp vô hạn.
  * Ngoài ra, trong `App.jsx`, Fallback cho biến `targetId` ưu tiên trường `req.targetId`. Đối với các sự kiện đánh theo vòng (như Hóa Giải, Đào), điều này làm App luôn hỏi người Bị nhắm đến ban đầu, thay vì người Tiếp theo trong danh sách đợi (`req.askQueue[0]`), gây lặp lại lệnh hỏi sai người.
* **Cách fix:**
  * Đồng bộ tất cả các hành động Phản Hồi Bị Động (như Hóa Giải, Chọn Bài Cho Cướp/Phá) trong `botLogic.js` thành định dạng chuẩn `ACTION_REACT`.
  * Bổ sung các loại Event vòng tròn (`ask_negate`, `ask_peach`, `save`) vào nhánh lệnh ưu tiên sử dụng `req.askQueue[0]` bên trong `App.jsx` để đảm bảo Game gửi câu hỏi cho đúng người theo lượt.

## 10. Ảo giác UI - Hiển thị nhầm tên thành "Ai đó" thay vì "Bạn"
* **Triệu chứng:** Khi game thông báo người chơi đang bị nhắm mục tiêu bởi một lá bài, thay vì hiển thị "Bạn", game lại hiển thị tên Tướng, hoặc "Ai đó".
* **Nguyên nhân gốc rễ:** Component UI `App.jsx` thiết lập chuỗi `targetName` chỉ dựa trên thông tin tướng của `targetId`, thiếu bước kiểm tra định danh `req.targetId === me.id`.
* **Cách fix:** Thêm toán tử 3 ngôi kiểm tra ID người chơi vào quá trình render Modal để thay thế thành chuỗi "Bạn".

## 11. Trải nghiệm UX - Khó chọn mục tiêu cho Mượn Đao và Bọc Trăm Trứng
* **Triệu chứng:** Mượn Đao yêu cầu 2 mục tiêu (Người cho mượn và Nạn nhân) nhưng nạn nhân không sáng viền đỏ. Bọc Trăm Trứng yêu cầu chọn Kẻ Địch để đồng minh Lạc chém giùm, nhưng Kẻ Địch không có viền báo hiệu bấm được.
* **Nguyên nhân gốc rễ:** Biến style `outline` trong `App.jsx` hoàn toàn phụ thuộc vào danh sách `validTargets`. Nhưng `validTargets` chỉ chứa danh sách mục tiêu hợp lệ của Bước 1 (Ví dụ: Chỉ chứa người có Vũ khí cho Mượn Đao). UI bị mù ở Bước 2.
* **Cách fix:** Viết lại toàn bộ hàm xác định `outline` cho thẻ Tướng trong `App.jsx`. Thêm các ngoại lệ cho phép ép viền đỏ (danger) nếu game đang ở Bước 2 của Mượn Đao (đã có `selectedTargetA`) hoặc khi đang kích hoạt cờ `activeSkill === 'Bọc Trăm Trứng'`.

## 12. Lỗi Ảo Giác "Tự Động Chơi" Ở Giai Đoạn Rút Bài (Draw Phase)
* **Triệu chứng:** Tới lượt của người chơi (Player 0), game thỉnh thoảng tự động rút 2 lá bài rồi đẩy sang Giai đoạn Đánh Bài (Play Phase) mà không cho phép người chơi sử dụng kỹ năng đầu lượt. Người chơi tưởng game bị lỗi tự chơi dùm mình.
* **Nguyên nhân gốc rễ:** Trong `Dispatcher.js`, giai đoạn `EVENT_PHASE_DRAW` sẽ tạm dừng game và gán `waitingForResponse = { type: 'draw_phase' }`. Tuy nhiên, bên giao diện UI `App.jsx`, không có bất kỳ khối lệnh nào lắng nghe và render modal cho `draw_phase`! Do UI bị "mù", nó không hiện nút bấm nào, dẫn tới một số hook của hệ thống (như BotLogic hoặc thẻ skill) vô tình rớt qua và đẩy game đi tiếp.
* **Cách fix:** Bổ sung modal xử lý `draw_phase` vào `App.jsx`, hiển thị nút "✔️ Rút Bài" cho người chơi và đảm bảo payload `ACTION_DRAW_CARDS` được gửi đi chính xác để tiếp tục tiến trình game.

## 13. Lỗi Ghi Đè Kỹ Năng Bị Động Biến Thành Tự Sát (Mượn Đao vs Bọc Trăm Trứng)
* **Triệu chứng:** Khi người chơi bị nhắm mục tiêu bởi **Mượn Đao Giết Người** (ép phải chém kẻ khác) và bấm nút sử dụng **Bọc Trăm Trứng (Gọi Lạc)** để nhờ đồng minh Lạc chém hộ. Kỹ năng không kích hoạt, thay vào đó người chơi lập tức bị tước vũ khí và mất máu.
* **Nguyên nhân gốc rễ:** 
  * Nút "Bọc Trăm Trứng" trên UI gửi lên một payload đặc biệt: `{ callBocTramTrung: true }`.
  * Hàm `handleResponseAction` trong `App.jsx` có cơ chế kiểm tra "Bỏ qua" (`isSkip`). Cơ chế này đánh giá rằng nếu payload không chứa thẻ bài nào (`!payload.cardId`) và không có cờ `doReact === true` thì đây là một hành động Bỏ qua (Skip).
  * Payload `{ callBocTramTrung: true }` bị dính bẫy `isSkip`, khiến nó bị chuyển đổi thành phản hồi `ACTION_REACT` với `data = null`.
  * Game nhận được `isSkip`, liền trừng phạt Nạn nhân Mượn Đao bằng cách tước vũ khí và ép ăn đòn. Kỹ năng Bọc Trăm Trứng bị triệt tiêu hoàn toàn.
* **Cách fix:** Viết đè (Intercept) lệnh kiểm tra trong `handleResponseAction` tại `App.jsx`. Nếu phát hiện payload có cờ `callBocTramTrung` hoặc `doTienPhat`, bắt buộc bỏ qua luồng `isSkip` và dispatch sự kiện sang chuẩn xác định `ACTION_SKILL_RESPONSE`.


## 14. Lỗi Đen Màn Hình (Crash) Khi Dùng Các Thẻ Chọn Mục Tiêu (Cướp Bài, Phá Bài...)
* **Triệu chứng:** Khi người chơi bấm vào lá Cướp Bài hoặc Phá Bài trên tay, game ngay lập tức văng ra màn hình đen kèm lỗi `Uncaught ReferenceError: validTargets is not defined`.
* **Nguyên nhân gốc rễ:** 
  * Đây là một tác dụng phụ (side-effect) từ đợt sửa lỗi hiển thị viền đỏ mục tiêu cho Mượn Đao ở phiên bản trước. 
  * Trong khối lệnh Render vẽ viền thẻ Tướng (thuộc hàm `outline` của `opponents.map` tại `App.jsx`), có đoạn mã kiểm tra biến `validTargets.some(...)`. Tuy nhiên, mảng `validTargets` chỉ được định nghĩa cục bộ bên trong các thẻ Modal đặc thù (Bọc Trăm Trứng, Điêu Thuyền...) chứ không hề tồn tại ở phạm vi cấp cao (Root Render Scope) của `App.jsx`. Việc gọi nó ra dẫn tới crash ứng dụng.
* **Cách fix:** Gỡ bỏ hoàn toàn phép kiểm tra `validTargets.some(...)` bên trong hàm vẽ `outline` của Tướng. Thay vào đó, thiết lập viền báo hiệu an toàn dựa trên `selectingTarget && opp.isAlive` và các thẻ ngoại lệ cụ thể (như Mượn Đao hay Bọc Trăm Trứng) vốn đã được định nghĩa rõ ràng State ở cấp cao.


## 15. Lỗi Hết Máu (0 HP) Vẫn Sống Dậy Đánh Tiếp (Bypass Cấp Cứu)
* **Triệu chứng:** Khi người chơi hoặc Bot bị trừ hết Sinh Lực (HP = 0) do một số nguyên nhân như Thua [Quyết Đấu] hoặc bị trúng Kỹ năng sát thương (như Thất Trảm Sớ, Phá Thành, Dưỡng Quân), họ không bị chết, cũng không hiện bảng Cấp Cứu xin Đào, mà vẫn sống nhăn răng ở mức 0/X máu và tiếp tục đánh tới tấp ở các lượt sau.
* **Nguyên nhân gốc rễ:**
  * Lỗi này xảy ra do sự lách luật (bypass) trong hệ thống Dispatcher. Khi giải quyết thua Quyết Đấu hoặc Sát thương từ Kỹ năng, Code đã gọi trực tiếp hàm applyEffect(DamageEffect) để trừ máu luôn.
  * Vì hàm applyEffect là hàm cấp thấp nhất (chỉ thao tác cộng trừ số liệu), nó hoàn toàn bỏ qua bước đưa EVENT_DAMAGE (Sự kiện Chịu Sát Thương) lên trên Stack. Do không có EVENT này, vòng lặp Game không bao giờ kiểm tra được ngưỡng tử vong EVENT_DYING -> Sự kiện Chết và Cấp Cứu Đào bị đóng băng.
* **Cách fix:** 
  * Đối với các Sát thương phổ thông như [Quyết Đấu] (trong Dispatcher.js), chuyển từ applyEffect trực tiếp sang lệnh reactionStack.push({ type: 'EVENT_DAMAGE' }) để hệ thống tự phân giải sát thương và chết theo đúng luồng sự kiện.
  * Đối với Sát thương Kỹ năng (trong SkillRegistry.js như Thất Trảm Sớ, Phá Thành, Dưỡng Quân), do yêu cầu cần trừ máu tức thì, tôi đã giữ nguyên lệnh applyEffect, nhưng cắm thêm một mồi kiểm tra hp <= 0 ngay sau đó. Nếu hết máu, sẽ đẩy thủ công EVENT_DYING lên Stack để ép người chơi vào trạng thái Hấp Hối.

## 16. Lỗi Bọc Trăm Trứng không nhận diện được Kỹ Năng và Spam Invalid PlayCard
* **Triệu chứng:** Người chơi kích hoạt **Bọc Trăm Trứng** và nhấn vào Kẻ Địch, nhưng không có hiệu ứng gì xảy ra. Thay vào đó, console ngầm báo Invalid PlayCard hàng chục lần. Nếu Đồng minh Bot không có bài [Chém] để trợ giúp, Game sẽ bị kẹt vĩnh viễn (Deadlock).
* **Nguyên nhân bề mặt:** Người chơi báo click vào kẻ địch rồi nhưng game chẳng thông báo gì, đồng minh cũng im re.
* **Nguyên nhân gốc rễ (Root Cause):**
  * Đây là **hai lỗi lồng vào nhau**: 
  * **Lỗi UI:** Khi người chơi lỡ tay đang Chọn lá bài [Chém] trên tay, rồi nhấn kích hoạt kỹ năng **Bọc Trăm Trứng**, UI không xóa cờ selectedCard = null. Kết quả là khi click vào Kẻ Địch, UI ưu tiên việc dùng lá bài đang chọn thay vì dùng kỹ năng. Hệ thống gửi lệnh đánh lá [Chém] xuống (nhưng lại đang trong trạng thái chờ xử lý kỹ năng nên bị từ chối), sinh ra lỗi spam Invalid PlayCard.
  * **Lỗi Core Engine:** Khi Bot đồng minh từ chối chém giúp (do không có bài [Chém]), Dispatcher đẩy tín hiệu ask_boc_tram_trung_slash vào Engine với cờ doProvide: false. Tuy nhiên, tên Event bị regex tự động cắt ghép nhầm thành boc-tram-trung-slash thay vì boc-tram-trung. Do không tìm thấy ID kỹ năng nào khớp tên đó trong SkillRegistry, Dispatcher lặng lẽ bỏ qua (fallthrough) mà không clear cờ waitingForResponse. Bot AI thấy waitingForResponse chưa xong, lại tiếp tục gửi phản hồi từ chối vô hạn lần mỗi 200ms tạo thành infinite loop ngầm.
* **Cách fix:** 
  * **UI:** Bổ sung lệnh setSelectedCard(null) khi kích hoạt Bọc Trăm Trứng (trong hàm toggleSkill).
  * **Core Engine:** Override lại thủ công logic lấy skillName = boc-tram-trung cho riêng event ask_boc_tram_trung_slash trong Dispatcher.js.

## 17. Lỗi Bỏ lọt Phản đòn (Bát Quái, Tiên Phát) & Bọc Trăm Trứng (Mượn Đao)
* **Triệu chứng:** Người chơi dùng thành công các kỹ năng Đỡ đòn bằng thẻ Ảo (Bát Quái ra [Né], Tiên Phát giúp [Né], hoặc Bọc Trăm Trứng giúp [Chém] chống Mượn Đao) nhưng game vẫn báo không đánh lá bài nào, dẫn tới việc bị dính sát thương hoặc tự động nộp vũ khí (bị cướp bởi Mượn Đao).
* **Nguyên nhân gốc rễ (Root Cause):**
  * **Core Engine (Dispatcher):** Khi một sự kiện trả về phản hồi là `doReact: true` (đánh bài) nhưng không đính kèm `cardId` (do là bài ảo sinh ra từ kỹ năng), vòng lặp của Dispatcher vội vã đánh giá biến `isSkip = !data || !data.cardId`. Điều này khiến mọi loại Thẻ Ảo đều bị quy chụp thành hành động "Bỏ qua/Chịu đòn". 
  * **Bọc Trăm Trứng:** Khi dùng Bọc Trăm Trứng để chống Mượn Đao/Nam Man, Kỹ năng lại Dispatch một hành động Tấn công mới (`PlayCardAction`) thay vì dispatch lệnh trả lời (`ACTION_SKILL_RESPONSE`) cho đòn đánh gốc. Việc này tạo ra một Stack Sát thương mới hoàn toàn và bỏ qua hoàn toàn yêu cầu Mượn Đao cũ, khiến Mượn Đao không được phản hồi và tự động cướp vũ khí của người chơi.
* **Cách fix:** 
  * **Dispatcher.js:** Cập nhật công thức tính `isSkip = !data || (!data.cardId && !data.virtualCardName)`.
  * **SkillRegistry.js:** Thêm nhánh phân loại vào Bọc Trăm Trứng. Nếu `req.originalReq` tồn tại (bị động phòng thủ), chuyển hóa lệnh thành `ACTION_SKILL_RESPONSE` để phản hồi chuẩn xác cho Mượn Đao.

## 18. Lỗi Trắng Màn Hình (Crash App.jsx) khi trúng Nam Man/Vạn Tiễn
* **Triệu chứng:** Game văng lỗi trắng màn hình hiển thị `Uncaught TypeError: Cannot read properties of undefined (reading 'name')` tại file App.jsx khi người chơi chịu tác động của Nam Man Mãnh Thú hoặc Vạn Tiễn Tề Phát.
* **Nguyên nhân gốc rễ (Root Cause):**
  * Trong Middleware của `App.jsx`, để hỗ trợ UI cũ, khi `req.type` là `ask_slash` (Nam Man) hoặc `ask_dodge` (Vạn Tiễn), hệ thống sẽ map nó thành `req.type = 'aoe_trick'`. Tuy nhiên, cơ chế engine mới (Phase 5) của các thẻ này chỉ gửi kèm `sourceCardId` chứ không gửi cả cục object `card`.
  * Kết quả là `req.card` bị `undefined`. Ngay khi giao diện UI render chuỗi `<div style="...">⚠️ Trúng {req.card.name}!</div>`, React ném lỗi TypeError gây sập toàn bộ ứng dụng vì không đọc được property `name`.
* **Cách fix:** 
  * Sửa an toàn tuyệt đối tại cụm render UI (App.jsx) bằng Optional Chaining và Fallback: `<div style="...">⚠️ Trúng {req.card?.name || 'Cẩm nang'}!</div>`. 
  * Sửa lỗi giao diện ngớ ngẩn: "(Lạc Long Quân) đang dùng [Cướp Bài]..." (Xưng tên Tướng khi bản thân mình tung chiêu) -> Chuyển thành "Bạn đang dùng...". Tách "(Tướng Ẩn)" thành "(Tướng Ẩn 2)", "(Tướng Ẩn 3)" để phân biệt rõ người chơi khi chưa lật bài.


## 19. Lỗi Danh Xưng UI (Tự gọi tên mình bằng Tên Tướng / Tướng Ẩn chung chung)
* **Triệu chứng:** Khi người chơi tự tung chiêu, bảng Hóa Giải vẫn thông báo '(Tên Tướng) đang dùng...' thay vì 'Bạn đang dùng...'. Ngoài ra, tất cả người chơi chưa lật bài đều bị gom chung thành '(Tướng Ẩn)' khiến không thể phân biệt ai đang ra đòn.
* **Nguyên nhân gốc rễ:** Hàm `getHeroNameStr()` dùng chung cho toàn bộ giao diện không kiểm tra ID của người xem (Viewer) so với ID của người tung chiêu (Actor). Thêm vào đó, trường hợp chưa có Tướng nào lật lên bị trả về một chuỗi cứng `(Tướng Ẩn)`.
* **Cách fix:** 
  * Cập nhật `getHeroNameStr()` để cộng thêm `Player ID + 1` vào thông báo tướng ẩn: `(Tướng Ẩn 2)`, `(Tướng Ẩn 3)`...
  * Cập nhật các Modal trong `App.jsx` để chủ động thay `sourceName = 'Bạn'` nếu `req.sourceId === me.id`.


## 20. Lỗi AI Kẹt Vòng Lặp Liên Tục Tung Chém (Infinite Invalid PlayCard)
* **Triệu chứng:** Game bị đứng hình và giật lag, console báo đỏ spam liên tục `Invalid PlayCard: Không thỏa mãn điều kiện dùng bài`.
* **Nguyên nhân gốc rễ:** Hệ thống AI cũ dùng `hasAttackedThisTurn` để kiểm tra, nhưng Core Engine mới dùng `attackCountThisTurn`. AI liên tục cho rằng mình chưa chém nên spam gửi lệnh lên và bị Engine từ chối liên tục trong cùng 1 tick.
* **Cách fix:** Đổi `bot.hasAttackedThisTurn` thành `(bot.attackCountThisTurn || 0) < limit` trong `botLogic.js`.


## 22. Lỗ Hổng AI Deadlock Toàn Diện (Cướp/Tước/Binh Lương/Vũ Khí)
* **Triệu chứng:** Game thỉnh thoảng đứng hình khi đến lượt AI tung Cẩm nang. Console rác đỏ `Invalid Targets for PlayCard`.
* **Nguyên nhân gốc rễ:** Lệch pha Validate giữa `botLogic.js` và `CardRegistry.js`. Ví dụ: Cướp bài bắt buộc khoảng cách <= 1, nhưng AI lại dùng hàm `canAttack` (có cộng dồn tầm vũ khí thành 3). AI ném lệnh lên Dispatcher, Dispatcher vứt bỏ ngầm vì sai luật -> AI ném lại lệnh đó lần nữa = Vòng lặp tử thần.
* **Cách fix:** 
  - Add logic `getDistance(gameState, bot.id, target.id) <= 1` cho Cướp Bài và Binh Lương.
  - Bắt AI check `hand.length > 0` hoặc có bài trang bị trước khi ném Cướp/Tước bài.
  - Sửa lỗi `eq.subType` thành `getCardSubType(eq)` để AI nhận biết được Vũ khí và dùng chiêu Tiên Phong.

## 23. Lỗi Lộ Tướng Ẩn & "Ma Ấn" Bọc Trăm Trứng
* **Triệu chứng:** Người chơi có thể nhấp chọn kỹ năng **Bọc Trăm Trứng** ngay cả khi không có đồng minh Lạc nào trên bàn cờ lộ diện (Các đối thủ đều đang là Tướng Ẩn). Gây ra tình trạng rò rỉ thông tin (Info Leak), người chơi tự nhiên biết được có một đối thủ đang ẩn mang quốc tịch Lạc.
* **Nguyên nhân gốc rễ:** Hàm `getPlayerFaction` trong file `gameState.js` cố tình bỏ qua điều kiện kiểm tra `isPlayerRevealed` (so với hàm gốc trong `index.js`), với ý định để Bọc Trăm Trứng gọi được Tướng Lạc Ẩn. Nhưng điều này vô tình khiến UI của người chơi nhận tín hiệu "Có đồng minh Lạc" ngầm -> bật Nút Kỹ Năng sáng lên.
* **Cách fix:** Đồng bộ hóa logic `getPlayerFaction` trong `gameState.js` sao cho tuyệt đối tuân thủ `isPlayerRevealed`. Nếu Tướng chưa lật, bắt buộc trả về `'Ẩn'`. Kỹ năng Bọc Trăm Trứng sẽ không thể click bừa nếu không có đồng minh lật mặt.

## 24. Lỗi Danh Xưng UI - Bảng Hóa Giải (Lạc Long Quân và Thánh Gióng đang dùng)
* **Triệu chứng:** Bảng thông báo Hóa Giải hiện dòng chữ *"Lạc Long Quân và Thánh Gióng đang dùng [Cẩm nang]... Bạn có muốn Hóa Giải không?"* thay vì dùng danh xưng *"Bạn đang dùng... "* khi người chơi tự đánh lá bài đó ra.
* **Nguyên nhân gốc rễ:** Trong `App.jsx`, hệ thống phân biệt "Bạn" bằng lệnh check `req.sourceId === me.id`. Do khác biệt kiểu dữ liệu (String vs Number) giữa Dữ liệu Dispatcher truyền lên và ID cục bộ, phép so sánh === luôn trả về sai.
* **Cách fix:** Chuyển đổi an toàn về chuỗi qua `String(req.sourceId) === String(me.id)`. Cập nhật cho tất cả modal Hóa Giải và Vạn Tiễn / Nam Man liên quan.

### Bug #24: Lỗi hiển thị Tên trong ngoặc tròn ở Pop-up Hóa Giải và Crash Tâm Công
**Triệu chứng:**
1. Khi có sự kiện dùng Cẩm Nang, Pop-up hỏi [Hóa Giải] hiển thị tên người dùng bị bọc trong ngoặc tròn, ví dụ: `(Khúc Thừa Dụ & Triệu Quang Phục) đang dùng [Cướp Bài] lên Bạn`. Rất vô duyên về mặt ngữ pháp.
2. Ngay sau khi người chơi bấm "Bỏ qua" ở Hóa Giải (khi AI đang xử lý lượt Cướp Bài), Game văng màn hình đỏ (Error Boundary) với lỗi `TypeError: Cannot read properties of undefined (reading 'name')` tại `SkillRegistry.js:306`.

**Nguyên nhân:**
1. **Lỗi ngoặc tròn:** Hàm `getHeroNameStr` được thiết kế gốc là để render tên Tướng bên cạnh tên Người chơi ở Avatar UI (VD: Người chơi 2 (Khúc Thừa Dụ)). Khi dùng trực tiếp hàm này vào trong câu thông báo Modal, nó bê nguyên cả ngoặc vào câu.
2. **Lỗi Crash Tâm Công:** Khi Hóa Giải bị bỏ qua, AI tiếp tục chuỗi xử lý và kích hoạt kỹ năng **[Tâm Công]**. Tại `onReact` của Tâm Công, code dùng `player.hand.length` để random Index, nhưng lại lấy bài mở ra từ tay của `target.hand[randomIndex]`. Nếu Target ít bài hơn Player, Index sẽ bị lệch và trả về `undefined`, gây Crash khi lấy thuộc tính `.name` của `revealedCard`.

**Giải pháp:**
1. Viết thêm hàm `getHeroNameOnlyStr` trong `App.jsx` chuyên để lấy tên Tướng thuần túy (không có ngoặc). Thay thế toàn bộ các chỗ render tên trong Modal, Pop-up và log về dùng hàm này.
2. Sửa lại Logic **[Tâm Công]**: Sửa `target.hand[randomIndex]` thành `player.hand[randomIndex]` (Bởi vì Tâm Công là Target chọn chất, Player mở bài trên tay Player). Thêm điều kiện chặn an toàn `if (player.hand.length === 0)` để ngưng kỹ năng không gây Crash.

### Bug #25: Bọc Trăm Trứng (Lạc Long Quân) phế võ công trong Quyết Đấu / Mượn Đao
**Triệu chứng:**
1. Trong một lượt bị Quyết Đấu hoặc Mượn Đao (yêu cầu đánh ra lá Chém), nếu Lạc Long Quân kích hoạt "Bọc Trăm Trứng" nhờ đồng minh phe Lạc đánh hộ nhưng đồng minh từ chối, game sẽ lập tức phán Lạc Long Quân thua Quyết Đấu (mất máu) mà không thèm cho Lạc Long Quân tự đánh ra lá Chém trên tay.
2. Ngay cả khi đồng minh phe Lạc đồng ý giúp và vứt lá Chém ra, Lạc Long Quân vẫn bị xử thua Quyết Đấu và lá Chém của đồng minh trở nên vô hiệu.

**Nguyên nhân:**
1. **Mất quyền tự đánh:** Khi kích hoạt Gọi Lạc trong các sự kiện phòng vệ (bị Quyết Đấu, Mượn Đao, bị Chém), Dispatcher thiết lập sai cờ `isDefensive: req.type === "aoe_trick"`. Do đó, Quyết Đấu bị hiểu lầm là hành động Tấn công chủ động (`isDefensive = false`). Khi đồng minh từ chối, Game xóa bỏ luôn sự kiện Quyết Đấu (vì tưởng là đánh trượt) khiến lượt phản hồi bị hủy, đẩy Lạc Long Quân vào trạng thái tự thua Quyết Đấu (chuyển sang bước trừ máu).
2. **Đồng minh giúp vô hiệu:** Khi đồng minh đồng ý đánh hộ lá Chém, code lại tạo ra event trả lời là `EVENT_ACTION_SKILL_RESPONSE`. Tuy nhiên, Quyết Đấu và Mượn Đao là các Event dạng gốc của game (nativeTypes), chúng đòi hỏi event trả lời phải là `EVENT_ACTION_REACT`. Vì lệch pha tín hiệu, Dispatcher không nhận ra lá Chém đó là để phản hồi cho Quyết Đấu, dẫn đến vứt bỏ lá Chém và xử thua.

**Giải pháp:**
1. Đã sửa lại cờ nhận diện trong `Dispatcher.js`: Ép buộc mọi lời gọi Bọc Trăm Trứng sinh ra từ việc phản hồi sự kiện (reaction) đều mặc định là `isDefensive = true`. Khi đồng minh từ chối, game sẽ khôi phục lại bảng hỏi Chém của Quyết Đấu để Lạc Long Quân tự đánh.
2. Sửa lại luồng gửi tín hiệu đánh hộ trong `SkillRegistry.js` (`boc-tram-trung`): Nếu đây là phản hồi phòng vệ (`isDefensive`), lệnh đánh ra lá Chém sẽ được gán Type chuẩn là `EVENT_ACTION_REACT` kèm dữ liệu `playerId` của chính Lạc Long Quân, giúp Hệ thống ghi nhận thành công phản hồi của đồng minh.

### Bug #26: Lỗi Bát Quái mù màu và Sấm Sét tịt ngòi
**Triệu chứng:**
1. Đánh bài lên đối thủ có trang bị Bát Quái, đối thủ vẫn mất máu mà không thấy thông báo gì trên UI. Dưới console ẩn có thông báo rút được bài Đỏ (ví dụ ♥ 2) nhưng hệ thống lại phán xét là Đen và bắt tự đánh Né.

**Nguyên nhân:**
1. **Lỗi 'Giấu Log':** Hệ thống chỉ dùng `console.log` để thông báo kết quả phán xét thay vì dùng hàm `addLog` của game, khiến người chơi không thấy gì trên UI. 
2. **Lỗi 'Mù màu':** Hệ thống dùng chữ (ví dụ: `suit === 'heart'`) để so sánh màu bài đỏ, trong khi thực tế bộ bài lại lưu chất bằng ký hiệu Unicode (ví dụ: `suit === '♥'`). Do đó, mọi lá bài Đỏ lật ra đều bị coi là sai và xử lý như lá bài Đen.

**Giải pháp:**
1. Đổi `console.log` thành `this.addLog` trong `EVENT_JUDGE`. 
2. Đồng bộ toàn bộ logic kiểm tra chất sang hệ ký hiệu Unicode (`♥`, `♦`, `♠`, `♣`).

### Bug #27: Lỗi Vòng lặp Vô hạn (Infinite Loop) khi Bot phản hồi Vũ khí
**Triệu chứng:**
1. Khi người chơi Né thành công đòn Chém của Bot (có trang bị Thanh Long Đao), game bị đứng hình và giật lag hoàn toàn. Màn hình console báo cảnh báo spam liên tục lỗi `ReactAction phớt lờ do sai đối tượng`.

**Nguyên nhân:**
1. Máy chủ (Dispatcher) gửi yêu cầu `ask_weapon_skill` cho Bot (người tấn công) để hỏi có muốn dùng vũ khí chém tiếp không. Bot không biết dùng skill này nên trả lời lệnh `cancel` (Bỏ qua). 
2. Tuy nhiên, hàm kiểm tra nhân thân của Máy chủ lại thiết lập `expectedPlayerId` bằng `targetId` (tức là người bị chém) thay vì `responderId` (người phản hồi). Hậu quả là Máy chủ từ chối lệnh của Bot vì sai ID, vòng lặp chờ xử lý không được giải phóng, gây hỏi đi hỏi lại hàng vạn lần gây tràn bộ nhớ.

**Giải pháp:**
1. Sửa lại hàm kiểm tra nhân thân trong `EVENT_ACTION_REACT` của Dispatcher, ưu tiên lấy `responderId` (nếu có) trước `targetId`. 
2. Dạy Bot cách xử lý `ask_weapon_skill` cho Thanh Long Đao (Tự động vung đao chém tiếp nếu còn bài Chém trên tay).

### Bug #28: Chớp tắt Modal Cứu Người (ask_peach) và Đánh Né (ask_dodge) do ẩn Tướng
**Triệu chứng:**
1. Người chơi có Đào (hoặc Rượu) và muốn Cứu đồng minh (hoặc uống Rượu lúc hấp hối), nhưng Modal Vừa hiện ra thì lập tức bị ẩn đi (Chớp tắt), khiến người chơi mất lượt cứu/bị chém chết.
2. Người chơi bị tấn công và có tướng sở hữu kỹ năng Dời Núi (đánh Chém thay Né) nhưng không thể bấm nút để đánh Né (Modal cũng bị chớp tắt).

**Nguyên nhân:**
1. Các kỹ năng tự động biến đổi quân bài (Dời Núi, Khai Thiên, Nam Dược, Linh Giám, Chương Dương) được gắn logic kiểm tra xem người chơi **Đã lật tướng hay chưa?** (`me.revealedHeroes[i]`). 
2. Nếu Tướng chưa lật, các kỹ năng này bị khoá, làm cho hệ thống hiểu lầm người chơi "Không còn quân bài hợp lệ nào" (`validCards.length === 0`).
3. Trong `App.jsx`, hiệu ứng `useEffect` kiểm tra nếu `validCards` rỗng, nó sẽ tự động thay người chơi nhấn Bỏ Qua (Skip) ngay sau lượt render đầu tiên, dẫn tới hiện tượng Modal chớp tắt.

**Giải pháp:**
1. Gỡ bỏ ràng buộc bắt buộc lật tướng (`me.revealedHeroes[i]`) đối với các kỹ năng phản hồi bị động trong hàm kiểm tra `validCards` tại `App.jsx`, giúp hiển thị các tuỳ chọn kỹ năng ở bất kỳ hoàn cảnh nào.
2. Tại hàm `handleResponseAction`, chèn thêm logic tự động Lật Tướng ngay trước khi gửi kết quả về Dispatcher nếu người chơi quyết định kích hoạt bài Vô danh/Virtual nhờ Kỹ năng. (Dispatcher ghi nhận hợp lệ và cập nhật state Lật Tướng cùng lúc).

### Bug #29: Lỗi Đột Tử (Uống rượu cứu mạng nhưng vẫn chết)
**Triệu chứng:**
1. Người chơi bị chém mất 2 máu (do đối thủ uống Rượu trước khi chém), khiến HP giảm từ `1` xuống `-1`.
2. Bảng cứu mạng hiện lên, người chơi nhấn uống `Rượu` để hồi máu.
3. Người chơi bị xử chết ngay lập tức mà không được hỏi thêm lần 2 (dù đáng lý ra phải hồi từ `-1` lên `0` và tiếp tục được hỏi xin Đào từ đồng minh).

**Nguyên nhân:**
1. Lỗi tham chiếu trạng thái cũ (Stale State) trong `Dispatcher.js`. 
2. Hàm `applyEffect` tạo ra một đối tượng State hoàn toàn mới (Immutability pattern của Redux) để cập nhật máu. Tuy nhiên, logic kiểm tra `hp <= 0` bên dưới lại đang sử dụng biến `dyingPlayer` được query từ TRƯỚC khi `applyEffect` diễn ra.
3. Hậu quả là dù người chơi đã hồi 1 máu (lên `0`), biến `dyingPlayer.hp` vẫn mang giá trị `-1`. Game đánh giá người chơi vẫn đang chết và lặp lại vòng lặp `ask_peach`. Vì người chơi vừa xài hết Rượu nên không còn bài để cứu, dẫn đến bị Auto-Skip và chết oan.

**Giải pháp:**
1. Cập nhật biến `updatedDyingPlayer` bằng cách query lại từ `this.state.players` NGAY SAU KHI hàm `applyEffect` thực thi, đảm bảo đọc được giá trị HP mới nhất.

### Bug #30: Bot AI "quên" cách cứu mình và đồng đội bằng Rượu & Nam Dược
**Triệu chứng:**
Khi AI rơi vào trạng thái hấp hối (hoặc đồng minh hấp hối), chúng chỉ biết dùng `Đào` để cứu. Nếu có `Rượu` hoặc kỹ năng `Nam Dược` (dùng bài Đỏ thay Đào), chúng hoàn toàn ngó lơ và cam chịu cái chết.

**Nguyên nhân:**
Trong hệ thống Bot AI (`ai/botLogic.js`), logic xử lý vòng lặp `ask_peach` (cầu cứu) chỉ được lập trình để quét tìm duy nhất lá `Đào`. Nó bị thiếu sót hoàn toàn nhánh logic kiểm tra `Rượu` (khi cứu chính mình) và `Nam Dược` (chuyển đổi bài Đỏ thành Đào).

**Giải pháp:**
1. Bổ sung ưu tiên kiểm tra `Rượu` nếu Bot đang tự cứu chính mình (`isSelf === true`).
2. Bổ sung kiểm tra kỹ năng `nam-duoc` và trạng thái `isOutsideTurn`. Nếu thỏa mãn, Bot sẽ dùng lá bài màu Đỏ đầu tiên tìm thấy trên tay và gửi `virtualCardName: 'Đào'` lên Máy Chủ để cứu mạng.
