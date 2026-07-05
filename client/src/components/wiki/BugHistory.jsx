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
    title: "Lỗi UI Pop-up Hóa Giải hiển thị không rõ ràng",
    labels: ["Lỗi UI", "UX", "Sai Tên Hiển Thị"],
    symptom: "UI Pop-up hỏi có muốn Hóa Giải không nhưng hiển thị không rõ ràng, mất tên người dùng (hiện 'Ai đó'), và tự động hiện pop-up ngay cả khi người chơi không có lá Hóa Giải thật trên tay.",
    cause: "Hệ thống tự động kích hoạt Modal Hóa Giải vì người chơi có kỹ năng ẩn (ví dụ: Linh Giám) cho phép dùng bài màu đen làm Hóa Giải. Tuy nhiên giao diện không giải thích điều này khiến người chơi bối rối. Ngoài ra quên gán `req.lastNegaterId` vào Dispatcher khi một người đánh Hóa Giải. Lỗi log hiện đầy đủ tên tướng gây rối rắm.",
    fix: "- **Logic Engine**: Nhét `req.lastNegaterId = playerId` vào Dispatcher.\n- **UI Modal**: Thêm dòng chữ giải thích rõ ràng vào Modal Hóa Giải: '(Bạn không có [Hóa Giải], nhưng có thể dùng kỹ năng ẩn của Tướng hoặc Trang bị để Hóa Giải!)'.\n- **Log Game**: Định dạng lại tên hiển thị trên Log bằng cách bỏ tên Tướng, tự động tính toán góc nhìn của người chơi để thêm nhãn **(Đồng Minh)** hoặc **(Kẻ Thù)**.",
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
