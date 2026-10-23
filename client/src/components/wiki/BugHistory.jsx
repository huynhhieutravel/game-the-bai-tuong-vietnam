import React, { useState } from 'react';
import '../WikiPage.css';

const BUG_DATA = [
  {
    id: 1,
    title: "Lỗ Hổng Bất Đồng Bộ Dữ Liệu & Gọi Sai Tên Biến (Property Access Mismatch)",
    labels: ["Lỗi Core Engine", "Lỗi Cấu Trúc File", "Lỗi Logic"],
    symptom: "Game có những hành vi sai lệch ngầm so với luật thiết kế nhưng KHÔNG hề văng lỗi (crash) hay báo đỏ màn hình. Ví dụ (Triệu chứng phát hiện): Quy tắc Âm Dương Giao Hoà tự động kích hoạt phát thưởng bài cho mọi cặp tướng, bất kể tổng máu là chẵn hay lẻ.",
    cause: "Trong môi trường Javascript thuần (không có Type Check), việc truy xuất sai tên thuộc tính Object (ví dụ code gọi `hp` thay vì `maxHp` từ HeroRegistry) sẽ âm thầm trả về `undefined`. Khi các giá trị `undefined` này lọt vào các biểu thức toán học hoặc logic (vd: `(undefined + undefined) % 2 !== 0`), chúng bị biến thành `NaN` (Not a Number). Phép so sánh `NaN !== 0` luôn trả về `true`, khiến các nhánh logic if-else bị bẻ cong hoàn toàn một cách thầm lặng.",
    fix: "Đã khắc phục tận gốc ở quy mô kiến trúc (Bản cập nhật v3.1.1 - Static Type Safety). Thay vì dùng QA Runtime, dự án đã xây dựng Hàng rào kiểm tra tĩnh (Compile-time Guard) bằng JSDoc + `tsc --noEmit`. Các thực thể (Hero, PlayerState, Card) được tạo Type Schema riêng biệt. IDE (VSCode) sẽ báo lỗi đỏ ngay lập tức khi Lập trình viên gọi sai tên biến hoặc sai cấu trúc API. Áp dụng chính sách Zero Warnings (Không cảnh báo) để đảm bảo không một lỗi Undefined nào lọt được vào Runtime.",
    status: "Fixed"
  },
  {
    id: 2,
    title: "Tàn Dư 'God Component' Gây Xung Đột Hệ Thống (Mất Quyền Tự Quyết, Kẹt Discard, Trùng Timer)",
    labels: ["Lỗi Cấu Trúc File", "Lỗi Logic", "Lỗi UI", "Technical Debt"],
    symptom: "Game xuất hiện hàng loạt triệu chứng dị thường ở các giai đoạn khác nhau: 1. Giai đoạn Draft cho phép Human chọn tướng khác phe (vi phạm luật). 2. Các Modal hỏi Vô M懈u, Đào, Né... biến mất, hệ thống tự động 'Bỏ qua' nhanh như chớp khiến Human mất quyền tự quyết. 3. Game bị kẹt cứng (Soft-lock) ở giai đoạn Bỏ Bài (Discard Phase) vì nút vứt bài tàng hình.",
    cause: "Hậu quả (Technical Debt) của quá trình bóc tách Component khổng lồ `GameView.jsx`. Khi chia tách UI thành các mảnh nhỏ (như `DraftScreen.jsx`, `ModalContainer.jsx`), các logic cũ (Timer đếm ngược cũ, Khối `useEffect` đóng vai trò Auto-Responder tự động quét tay bài rồi skip, biến check `needsDiscard` dùng format cũ) BỊ QUÊN CHƯA XÓA trong `GameView.jsx`. Chúng chạy ngầm, chèn ép các Component mới, và lệch pha hoàn toàn với format Message của Engine mới (vd: `waitingForResponse = { type: 'discard_phase' }`).",
    fix: "Thực hiện đại phẫu 'Dọn rác' toàn diện Phase 1 & 2: \n1. Xóa sổ các khối `useEffect` (Auto-Responder & Duplicate Timers) trong `GameView.jsx` để trao trả 100% quyền sinh sát cho `ModalContainer`.\n2. Cập nhật `DraftScreen.jsx`: Khóa cứng UI (mờ đi) không cho click chọn tướng khác phe; cập nhật Timer Fallback thông minh (ưu tiên bốc cặp cùng phe).\n3. Nâng cấp logic `needsDiscard` để tương thích với Engine mới, giúp nút Bỏ bài hiện lên.\n4. Đắp tường lửa ở Server (`gameSetup.js`): Bổ sung xác thực qua `HeroRegistry` để chặn Hack gửi tướng sai phe.",
    status: "Fixed"
  },
  {
    id: 3,
    title: "Vòng Lặp Vô Hạn (Infinite Loop) Do Bất Đồng Bộ Payload Của Skill Kích Hoạt Vũ Khí",
    labels: ["Lỗi Engine", "Lỗi Cấu Trúc File", "Lỗi Logic", "Soft-lock"],
    symptom: "Game bị đứng hình hoàn toàn hoặc server bị sập do vướng vào vòng lặp vô hạn (Infinite Loop) ngay sau khi hỏi người chơi có muốn dùng Kỹ năng vũ khí (Thanh Long Đao, Rìu Đá, Song Kiếm, Quạt Sắt) hay không.",
    cause: "Hậu quả của việc tái cấu trúc (Refactoring) di chuyển logic xử lý kỹ năng vũ khí từ `cardEffects.js` sang `SkillRegistry/system.js`. Hàm `weapon-skill` bên trong `SkillRegistry` mong đợi nhận được `cardIds` để lấy thẻ bài, tuy nhiên Bot (AI) và UI của người chơi lại gửi `cardIndexes` theo format cũ. Vì lấy thẻ bài thất bại (`cardIds` là `undefined`), hàm tự động `return` sớm nhưng lại QUÊN xóa trạng thái `waitingForResponse`. Hệ quả là Engine bị kẹt cứng ở trạng thái chờ kỹ năng vũ khí, liên tục kích hoạt `tick()` nhưng không bao giờ thoát ra được.",
    fix: "Đã sửa lại hàm `weapon-skill` trong `skills/system.js` để linh hoạt hỗ trợ cả `cardIds` và `cardIndexes`. Bổ sung fallback ánh xạ tự động từ `payload.cardIndexes` sang id cụ thể. Đồng thời tích hợp lại logic xử lý 'Song Kiếm' vào hệ thống mới để dứt điểm triệt để lỗi vòng lặp này.",
    status: "Fixed"
  },
  {
    id: 4,
    title: "Lỗi Kẹt Cờ Trạng Thái (Synchronous Event Dispatch Reentrancy)",
    labels: ["Lỗi Engine", "Lỗi Logic", "Soft-lock", "Technical Debt"],
    symptom: "Game đứng cứng ngắc khi đánh Cướp Bài hoặc các lá bài yêu cầu vòng lặp phản hồi (Ask Negate). Bảng Console log dừng lại ở `[TRACE] EVENT_ACTION_REACT running for type: ask_negate` và Bot tiếp theo không bao giờ phản hồi.",
    cause: "Lỗi đệ quy đồng bộ trong Event Dispatch. Khi Bot 1 được hỏi có muốn dùng Hóa Giải không, `BotRunner` bật cờ `isProcessing = true`, đợi 800ms rồi gửi `dispatchAction('cancel')` lên Engine. Engine xử lý Đồng Bộ, loại Bot 1 khỏi hàng đợi và chuyển lượt hỏi sang Bot 2, đồng thời phát ngay tín hiệu `onStateUpdate`. Khổ nỗi, tín hiệu update này kích hoạt (Synchronous Reentrancy) đệ quy ngược lại `BotRunner`. Lúc này lệnh `isProcessing = false` của Bot 1 chưa kịp chạy, dẫn tới `BotRunner` lờ đi tín hiệu của Bot 2. Kết quả: Lượt hỏi Bot 2 trôi vào hư không, game chờ mãi mãi.",
    fix: "Đã khắc phục bằng cách dời lệnh `this.isProcessing = false` lên TRƯỚC lệnh `dispatchAction` trong `BotRunner.js`. Điều này cho phép `BotRunner` mở khóa cờ trước khi Engine kích hoạt chuỗi sự kiện đồng bộ đệ quy. Qua rà soát diện rộng (QA), chỉ có `BotRunner` dính lỗi này do sử dụng State Queue thủ công. Giao diện React miễn nhiễm do `setState` được gộp (Asynchronous Batching) an toàn.",
    status: "Fixed"
  },
  {
    id: 5,
    title: "Lỗi đếm sai phe dẫn đến nhận diện nhầm Dã Tâm",
    labels: ["Lỗi Engine", "Lỗi Logic", "Critical"],
    symptom: "Tính sai số lượng người cùng phe (Ví dụ: 2 người lật tướng Lạc trong bàn 4 người nhưng người thứ 2 lại bị hệ thống ép thành Dã Tâm dù chưa vượt quá nửa bàn).",
    cause: "Hệ thống bị 'tâm thần phân liệt' do dùng 3 cách đếm khác nhau. Trong Dispatcher.js, biến `getPlayerFaction` chạy ngầm trên Server trả về 'Lạc' cho mọi người (do server không khởi tạo data heroes), dẫn đến đếm gộp tất cả những người đã lật tướng thành phe Lạc. Cộng với việc đếm luôn cả người đang lật và dùng công thức sai.",
    fix: "Đồng bộ hóa 1 Nguồn Sự Thật (Single Source of Truth) bằng hàm `getFactionCount`. Gỡ bỏ filter thừa trong Dispatcher. Cập nhật `getPlayerFaction` để đọc trực tiếp `player.faction` trên server. Chuẩn hóa công thức ngưỡng thành `Math.floor(total / 2)`.",
    status: "Fixed"
  },
  {
    id: 6,
    title: "Lỗi Format Game Log, Invalid Date, Lộ Tên Tướng và Thiếu Giải Thích Kỹ Năng",
    labels: ["Lỗi UI", "UX", "Sai Tên Hiển Thị"],
    symptom: "1. Bảng Game Log hiển thị dòng `[Invalid Date]` hoặc các log rác như `[DRAW] 1 rút 2 lá bài`.\n2. Log Game sát thương không giải thích là do kỹ năng gì (vd: Sét đánh của Phạt Tội), làm người chơi hoang mang.\n3. Log Game hiện đầy đủ tên Tướng của đối thủ gây lộ liễu và rối rắm.",
    cause: "1. `Reducer.js` đẩy chuỗi String thuần thay vì Object `{timestamp}` vào `history`, và nhét ID gốc (0, 1) vào text thay vì người chơi.\n2. Lời thoại Log thiếu diễn giải nguyên nhân sát thương.\n3. Dùng trực tiếp tên Tướng để render lên Log.",
    fix: "- **Khắc phục Log Date & ID**: Đồng bộ đẩy Object vào `history`. Dịch ID thành `Người chơi X` trực tiếp trong Reducer.\n- **Minh Bạch Kỹ Năng**: Viết lại Log rõ ràng nguyên nhân: `bị Sét Đánh mất 2 Sinh Lực vì kỹ năng [Phạt Tội]`.\n- **Gọn gàng Tên Log**: Tự động tính toán góc nhìn của người chơi để thêm nhãn **(Đồng Minh)** / **(Kẻ Thù)** thay vì in tên Tướng.",
    status: "Fixed"
  },
  {
    id: 7,
    title: "Lỗi thẻ Rượu uống vào tự mất / Không tự bỏ qua",
    labels: ["Lỗi UI", "UX"],
    symptom: "Khi bấm vào lá Rượu, hệ thống yêu cầu xác nhận nhưng người chơi đổi ý bấm sang lá khác (như Né) thì thẻ Rượu vẫn bị kẹt ở trạng thái chọn. Cảm giác như nhấn vào tự nhiên thẻ bị mất kết nối.",
    cause: "Khi bấm sang lá bài không hợp lệ (unplayable), UI phớt lờ thao tác onClick. Thiếu cơ chế toggle để hủy bỏ (deselect) lá bài đang chọn.",
    fix: "Cập nhật `PlayerHand.jsx` và `useCardInteraction.js`: Cho phép bấm vào lá bài không hợp lệ để tự động hủy chọn lá bài hiện tại. Bấm lần thứ 2 vào cùng một lá bài cũng sẽ hủy chọn.",
    status: "Fixed"
  },
  {
    id: 8,
    title: "Lỗi nhấn nút Kết Thúc bị treo hoặc sai lượt",
    labels: ["Lỗi Engine"],
    symptom: "Lỗi phát sinh khi nhấn nút Kết Thúc lượt, thỉnh thoảng vòng lặp chuyển lượt không đúng người hoặc gây lỗi nội bộ.",
    cause: "Trong `PhaseHandler.js`, sự kiện `EVENT_NEXT_TURN` dùng `currentPlayerIndex` (số chỉ mục) để làm `targetId` truyền vào hiệu ứng `ResetTurnFlagsEffect`, dẫn đến reset nhầm ID. Hàm `findIndex` cũng kiểm tra nhầm `p.id === currentPlayerIndex`.",
    fix: "Sửa lại hàm `EVENT_NEXT_TURN` để lấy đúng ID của người chơi hiện tại thông qua `players[currentIdx].id`.",
    status: "Fixed"
  },
  {
    id: 9,
    title: "Lỗi Giới Tính trên Server (Backend) đánh hụt toàn bộ thẻ bài check Nam/Nữ",
    labels: ["Lỗi Engine", "Critical"],
    symptom: "Các thẻ bài như **Song Kiếm** (hoặc hiệu ứng bắt buộc phân biệt Nam/Nữ) hoạt động sai lệch hoặc đánh hụt trên Server.",
    cause: "Hàm `getPlayerGender()` cố gắng trỏ tới `player.heroes[0].gender`. Tuy nhiên, vì lý do tối ưu hóa mạng và bảo mật, danh sách `player.heroes` trên Server chỉ được cấp mảng rỗng `[{}, {}]` chứ không nạp toàn bộ cấu hình tướng. Do đó `gender` trên Server liên tục văng ra `undefined`.",
    fix: "1. Tại `EVENT_ACTION_REVEAL_HERO` trong `Dispatcher.js`, đóng cứng thuộc tính `player.gender = hero.gender` khi Tướng được lật.\n2. Nâng cấp `getPlayerGender()` để ưu tiên trả về `player.gender` (trên Server), nếu không có mới fallback về `heroes[0].gender` (trên Client).",
    status: "Fixed"
  },
  {
    id: 10,
    title: "Lỗi Đánh Tiếp Dù Có Người Đã Thắng (Game Over)",
    labels: ["Lỗi Engine", "Lỗi Logic", "Critical"],
    symptom: "Khi có người chơi chiến thắng (Game Over), Engine vẫn tiếp tục vòng lặp xử lý (Loop) khiến các tướng vẫn đánh nhau loạn xạ.",
    cause: "Vòng lặp `tick()` của Dispatcher không kiểm tra cờ `this.state.gameOver`, nên nó cứ tiếp tục lôi các Event còn sót trong hàng đợi ra xử lý.",
    fix: "**Ngắt Vòng Lặp**: Bổ sung cờ chặn `if (this.state.gameOver)` ngay đầu hàm `resolveEvent`, đồng thời quét sạch (clear) `reactionStack` và `actionQueue` để Engine chính thức 'nghỉ hưu' khi ván đấu kết thúc.",
    status: "Fixed"
  },
  {
    id: 11,
    title: "Khủng Hoảng Tàng Hình Modal (Multiplayer) & Lỗi Pop-up Hóa Giải",
    labels: ["Lỗi UI", "Critical", "UX"],
    symptom: "1. TẤT CẢ Pop-up (hỏi Né, Hóa Giải, Chọn Kỹ Năng...) hoàn toàn tàng hình và báo 'Lỗi hiển thị kỹ năng' nếu chơi chế độ Multiplayer (người chơi không phải Player 1).\n2. Pop-up hỏi Hóa Giải bị mất tên người dùng (hiện 'Ai đó'), và tự động hiện dù không có bài Hóa Giải thật trên tay.",
    cause: "1. Toàn bộ `ModalContainer.jsx` bị hardcode sai lầm kiểm tra `req.responderId === 0` thay vì ID thực tế của người chơi (`me.id`), và thiết lập sai điều kiện `!req.reason` khiến lệnh Đòi Né từ Chém bị chặn lại.\n2. Thiếu gán `req.lastNegaterId` vào Dispatcher. Modal Hóa Giải bị kích hoạt bởi kỹ năng ẩn nhưng không có text giải thích.",
    fix: "- **Khắc phục Khủng hoảng Modal**: Càn quét thay thế hàng loạt lệnh `req.responderId === 0` thành `req.responderId === me.id` trong `ModalContainer.jsx`. Nới lỏng điều kiện `ask_dodge` để chấp nhận `req.reason === 'chem'`.\n- **Sửa Modal Hóa Giải**: Thêm dòng chữ giải thích kỹ năng ẩn (như Linh Giám) vào Modal. Gán `req.lastNegaterId` vào Dispatcher.",
    status: "Fixed"
  },
  {
    id: 12,
    title: "Khủng Hoảng Mất Đồng Bộ Giao Diện & Engine (Lỗi Ngầm Quân Cơ, Khai Quốc, Thất Trảm Sớ)",
    labels: ["Lỗi Engine", "Lỗi UI", "Critical", "Deadlock"],
    symptom: "Game bị 'nuốt lệnh' (Deadlock) ở các tình huống sau:\n1. Đinh Điền bấm chọn bài đen để đổi Phán xét [Quân Cơ] nhưng game lờ đi, phán xét diễn ra bình thường.\n2. Nguyễn Bặc rút xong 2 thẻ từ [Khai Quốc], chọn bài đưa cho đồng minh nhưng thẻ bài không di chuyển, hệ thống kẹt.\n3. Chu Văn An mất máu chọn Phán xét [Thất Trảm Sớ], game không hiện ra phán xét mà bắt kẻ thù tự gánh hình phạt, thậm chí kẻ thù cũng không bấm nút hình phạt được.\n4. Nguyễn Nộn [Đoạt Sáo] chọn thẻ bỏ đi nhưng giao diện truyền sai ID.",
    cause: "Dữ liệu (Payload) truyền từ React Component (`ModalContainer.jsx`) không khớp với dữ liệu Engine (`SkillRegistry`) kỳ vọng. \n- **Quân Cơ**: UI truyền `cardIndexSelected`, nhưng Engine đòi `cardId`.\n- **Khai Quốc**: Truyền đủ data, nhưng Engine **bị quên chưa viết hàm `onReact`** để xử lý.\n- **Thất Trảm Sớ**: Code Engine bị viết sai logic (Bỏ qua bước Phán xét, nhảy thẳng vào bước Trừng phạt). Hơn nữa, Payload của UI truyền key `option`, trong khi Engine đòi key `discardCards`.",
    fix: "1. Cập nhật `ModalContainer.jsx` và thiết kế các Modal riêng biệt (như `KhaiQuocModal.jsx`) để ghim chặt `cardId` và `targetId` vào Payload trả về.\n2. Bổ sung hàm `onReact` cho Khai Quốc trong `reaction.js` để thực thi lệnh chuyển bài `MoveCardEffect`.\n3. Đập đi xây lại toàn bộ cấu trúc Logic của Thất Trảm Sớ trong `combat.js`: Chẻ làm 2 bước rõ rệt (Rút Phán Xét -> Nếu khác Cơ mới đẩy Modal Trừng Phạt).",
    status: "Fixed"
  },
  {
    id: 13,
    title: "Khủng Hoảng Truyền Sai ID Tiếng Việt & Đứt Gãy Logic Gọi Hội (Bọc Trăm Trứng, Tiên Phát, Hộ Giá)",
    labels: ["Lỗi Engine", "Lỗi UI", "Critical"],
    symptom: "Người chơi chịu sát thương oan uổng dù ĐÃ bấm kích hoạt các kỹ năng gọi đồng minh đỡ đòn thay (Bọc Trăm Trứng, Tiên Phát, Hộ Giá). Giao diện báo đồng minh đã giúp đỡ thành công (tốn bài), nhưng luồng xử lý chính vẫn đè đầu Chủ công ra trừ máu.",
    cause: "Lỗi bao gồm 3 tầng:\n1. Core Dispatcher vô ý ném các cờ đặc biệt (`callBocTramTrung`, `doTienPhat`) vào thùng rác vì tưởng lầm người chơi bấm Bỏ qua (isSkip) trong chuỗi các event Native (ask_slash, ask_dodge).\n2. Giao diện (Modal) truyền một loạt các ID dạng chuỗi tiếng Việt có dấu (`activeSkill: 'Tiên Phát'`, `'Hộ Giá'`, `'Kỳ Tập'`, `'Chương Dương'`, `'Dời Núi'`) thay vì chuỗi chuẩn `slug`.\n3. Kỹ năng Tiên Phát & Hộ Giá gọi nhầm hàm `dispatchAction({ type: 'ACTION_SKILL_RESPONSE' })` (Đẩy một Event trống vào Hàng đợi) thay vì gọi `resolveEvent({ type: 'EVENT_ACTION_REACT' })` (Trả lời trực tiếp cho Event đang chờ). Việc này khiến Engine tảng lờ thao tác của đồng minh.",
    fix: "Đã càn quét toàn bộ mã nguồn để loại bỏ hoàn toàn các chuỗi ID tiếng Việt (thay bằng `tien-phat`, `ho-gia`, `chuong-duong`...). Tái cấu trúc lại luồng xử lý của `EVENT_ACTION_REACT` trong Dispatcher để ưu tiên bẻ lái sang SkillRegistry khi bắt gặp các cờ gọi hội, trước khi chúng bị khối Native chặn lại. Thay thế hàm `dispatchAction` bằng `resolveEvent` tại các kỹ năng hỗ trợ.",
    status: "Fixed"
  },
  {
    id: 14,
    title: "Lỗi Đứt Gãy Kiến Trúc Engine Khiến Hàng Loạt Kỹ Năng Bị Tê Liệt (Thiết Mã, Tiên Duyên...)",
    labels: ["Lỗi Engine", "Lỗi Kiến Trúc", "Critical", "Lỗi Logic"],
    symptom: "Rất nhiều Kỹ năng nội tại (Passive Skills) của các tướng như Thiết Mã, Nghệ An Kế, Nỏ Thần, Tiên Duyên, Nhiếp Chính... hoàn toàn không có tác dụng trong game. Ví dụ: Bọc Trăm Trứng không nhận diện được tầm đánh Thiết Mã của Thánh Gióng; Bot AI không dùng Tiên Duyên.",
    cause: "Đây là một lỗi thiết kế kiến trúc ngầm rất lớn. Ở phía Engine Backend (State.js), thuộc tính `player.heroes` chưa bao giờ được khởi tạo và luôn là `undefined`. Trong khi đó, toàn bộ các file xử lý logic trong Engine (rangeSystem, turnSystem, botLogic...) lại đang kiểm tra kỹ năng bằng Optional Chaining: `player.heroes?.some(...)`. Vì Optional Chaining âm thầm nuốt lỗi và trả về `undefined`, mọi lượt kiểm tra Kỹ năng đều thất bại (false) mà không hề có bất kỳ cảnh báo lỗi Crash nào trên Console.",
    fix: "Đã tạo một helper `hasSkill(player, skillId)` dùng chung trong `gameState.js`. Helper này truy xuất trực tiếp vào `HeroRegistry` thông qua `mainHeroId` và `subHeroId`. Sau đó, thực hiện quét và Replace hàng loạt lệnh `player.heroes?.some` trên 6 file logic cốt lõi của Engine để sử dụng `hasSkill` mới. Khôi phục hoàn toàn sức mạnh của các Tướng.",
    status: "Fixed"
  },
  {
    id: 15,
    title: "Lỗi Hóa Giải Không Hiệu Lực Trên Quyết Đấu (Và Hóa Giải Khác)",
    labels: ["Lỗi UI", "Lỗi Logic", "Critical"],
    symptom: "Người chơi bị đối phương dùng Quyết Đấu hoặc Hóa Giải, người chơi rút bài Hóa Giải ra để chống lại, nhưng sau khi bấm Xác nhận, bài Hóa Giải mất đi mà sát thương vẫn nhận, như thể không hề có chuyện gì xảy ra.",
    cause: "Giao diện UI (`ModalContainer.jsx`) khi gửi tín hiệu phản hồi Hóa Giải về Engine đã truyền sai key `negateCardIndex` thay vì `cardId`. Engine Dispatcher lại dùng điều kiện khắt khe: nếu thiếu `data.cardId` và `data.virtualCardName`, nó sẽ mặc định gán cờ `isSkip = true` (Bỏ qua). Do đó, thao tác Hóa Giải của người chơi bị Engine coi như một cú bấm nút 'Bỏ qua'.",
    fix: "Lần trước sửa ModalContainer bị sót (chưa thực sự đẩy cardId). Đã sửa triệt để ở ModalContainer.jsx dòng 1079: Hóa Giải luôn gửi đầy đủ `cardId`, `negateCardId`, `negateCardIndex` (cho tay) và `equipId`, `negateEquipIndex` (cho trang bị), đồng thời gửi `virtualCardName: 'Hóa Giải'`. Phía Engine Dispatcher (dòng 693) cũng đã được cập nhật để đọc `equipId` và discard bài chính xác khi Hóa Giải thành công.",
    status: "Fixed"
  },
  {
    id: 16,
    title: "Lỗi 'Bấm nhưng không có tác dụng' - Tê Liệt Hàng Loạt Kỹ Năng Do Thiếu `skillId` & `cardId`",
    labels: ["Lỗi Engine", "Lỗi UI", "Critical"],
    symptom: "Rất nhiều Kỹ Năng Chủ Động (Tự Chủ, Tiên Phong, Binh Loạn...) và Phản Ứng (Uy Chấn, An Bang, Đoạt Sao, Bánh Chưng...) bị 'tê liệt'. Người chơi hoặc Bot bấm kích hoạt, giao diện đóng lại bình thường, nhưng sau đó không có bất cứ hiệu ứng (mất máu, rút bài, vứt bài) nào xảy ra. Ngoài ra, việc dùng Dời Núi / Thỉnh Chinh để Né cũng bị 'nuốt lệnh' tương tự.",
    cause: "Lỗi đứt gãy kết nối payload giữa UI và Engine. \n1. Ở phía Engine: Dispatcher đẩy sự kiện `EVENT_TRIGGER_SKILL_ASK` lên cho UI nhưng **quên đính kèm `skillId`** (cho gần 40 kỹ năng). Khi UI gửi lựa chọn về, Dispatcher không biết phản hồi này thuộc về kỹ năng nào nên đã tự động DROP (Bỏ qua).\n2. Ở phía UI: Các Modal (DodgeModal, BorrowSwordModal) khi gửi xác nhận Đánh bài ảo đã truyền thiếu `cardId` (chỉ truyền `cardIndexSelected`), khiến Dispatcher tưởng người chơi chọn 'Bỏ qua'.",
    fix: "Đã rà soát toàn bộ UI và hệ thống Engine:\n- **Phía Engine**: Thêm `skillId` vào tất cả các `payload: { request: { ... } }` bị thiếu trong `combat.js`, `reaction.js`, `PhaseHandler.js`, `turnSystem.js` và `system.js`.\n- **Phía UI**: Cập nhật `DodgeModal.jsx`, `BorrowSwordModal.jsx` đảm bảo gửi đầy đủ `cardId` về Engine. Hệ thống hiện đã thông suốt 100% từ Frontend xuống Backend.",
    status: "Fixed"
  }
];
export default function BugHistory() {
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const allLabels = Array.from(new Set(BUG_DATA.flatMap(bug => bug.labels)));

  const filteredBugs = BUG_DATA
    .filter(bug => filter === "All" || bug.labels.includes(filter))
    .filter(bug => 
       bug.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       bug.symptom.toLowerCase().includes(searchQuery.toLowerCase()) || 
       bug.cause.toLowerCase().includes(searchQuery.toLowerCase()) ||
       bug.fix.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.id - a.id);

  return (
    <div className="wiki-hero-detail" style={{ maxWidth: '100%', margin: '0', textAlign: 'left', lineHeight: '1.6' }}>
      <h1 style={{ color: 'var(--color-gold)', marginBottom: '10px', fontSize: '2rem' }}>🐛 Nhật Ký Fix Bugs (Bug History)</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', fontSize: '1.1rem' }}>
        Tài liệu ghi nhận lại toàn bộ các lỗi đã phát sinh trong quá trình phát triển, nguyên nhân gốc rễ (Root Cause) ở tầng Core Engine, và cách khắc phục.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="🔍 Tìm kiếm lỗi (triệu chứng, nguyên nhân, cách fix)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #4b5563', background: '#111827', color: 'white', fontSize: '1rem', outline: 'none' }}
        />
      </div>

      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
            className="btn-action"
            onClick={() => setFilter("All")}
            style={{ 
              padding: '8px 16px', 
              border: filter === 'All' ? '2px solid var(--color-gold)' : '1px solid #6b7280', 
              background: filter === 'All' ? 'var(--color-gold)' : '#374151',
              color: filter === 'All' ? '#000' : '#f9fafb',
              fontWeight: filter === 'All' ? 'bold' : 'normal'
            }}
        >
            Tất Cả
        </button>
        {allLabels.map(label => (
          <button 
            key={label}
            className="btn-action"
            onClick={() => setFilter(label)}
            style={{ 
              padding: '8px 16px', 
              border: filter === label ? '2px solid var(--color-gold)' : '1px solid #6b7280', 
              background: filter === label ? 'var(--color-gold)' : '#374151',
              color: filter === label ? '#000' : '#f9fafb',
              fontWeight: filter === label ? 'bold' : 'normal'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredBugs.map(bug => (
          <div key={bug.id} className="wiki-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: '1.4rem' }}>
                    <span style={{ color: '#ef4444', marginRight: '10px' }}>#{bug.id}</span>
                    {bug.title}
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {bug.labels.map(lbl => (
                        <span key={lbl} style={{ background: lbl.includes('Hệ Thống') || lbl.includes('Cải Tiến') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: lbl.includes('Hệ Thống') || lbl.includes('Cải Tiến') ? '#10b981' : '#ef4444', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {lbl}
                        </span>
                    ))}
                </div>
            </div>
            
            <div style={{ borderLeft: '4px solid #f59e0b', paddingLeft: '15px', background: 'rgba(245, 158, 11, 0.05)', padding: '15px', borderRadius: '0 8px 8px 0' }}>
                <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '5px' }}>Triệu chứng (Symptom):</strong>
                <span style={{ color: 'var(--color-text-primary)' }} dangerouslySetInnerHTML={{ __html: bug.symptom.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }}></span>
            </div>

            <div style={{ borderLeft: '4px solid #ef4444', paddingLeft: '15px', background: 'rgba(239, 68, 68, 0.05)', padding: '15px', borderRadius: '0 8px 8px 0' }}>
                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '5px' }}>Nguyên nhân gốc rễ (Root Cause):</strong>
                <span style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: bug.cause.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }}></span>
            </div>

            <div style={{ borderLeft: '4px solid #10b981', paddingLeft: '15px', background: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '0 8px 8px 0' }}>
                <strong style={{ color: '#10b981', display: 'block', marginBottom: '5px' }}>Cách Fix (Resolution):</strong>
                <span style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: bug.fix.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }}></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
