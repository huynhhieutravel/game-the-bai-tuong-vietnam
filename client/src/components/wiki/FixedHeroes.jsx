import React, { useState } from 'react';
import '../WikiPage.css';

const FIXED_HEROES_DATA = [
  {
    name: "Lạc Long Quân",
    faction: "Lạc",
    image: "/images/heroes/lac_lac-long-quan.png",
    issue: "Đại tu toàn diện Logic Kỹ Năng & AI Bot & Khắc phục Màn hình Đỏ",
    fix: "- **Logic Kỹ Năng [Bọc Trăm Trứng]**: Cập nhật hàm `canUse` để chặn lỗi người chơi dùng chủ động vô hạn lần sau khi đã hết lượt đánh [Chém].\n- **Logic Kỹ Năng [Thủy Tổ]**: Xử lý triệt để Bot AI biết tự động bỏ bài để hồi máu/cứu đồng minh phe Lạc, đồng thời biết tự dùng Đào/Chém khi được kích hoạt năng lực chọn bài.\n- **Lỗi Mismatch Dữ liệu [Bọc Trăm Trứng]**: Đồng bộ payload UI gửi lên (`cardId` thay vì `cardIndexSelected`) để Engine nhận diện lá bài được dùng để đánh giùm.\n- **Khắc phục Màn hình Đỏ**: Bổ sung Modal `AskBocTramTrungDodgeModal` còn thiếu. Dùng Optional Chaining `gameState?.players?.[0]` để triệt tiêu lỗi trắng màn hình lúc khởi tạo GameView.\n- **Lỗi Spam Click Queue**: Fix lỗi người chơi bấm nhiều lần nút kỹ năng [Bọc Trăm Trứng] khiến Bot phải đánh giùm liên tiếp 3 lá bài liền nhau, bằng cách chặn đứng ở hàm xác thực Engine.\n- **Nâng cấp Modals Kỹ năng chéo (Cross-skill Interaction)**: Hỗ trợ đồng minh Thần Trụ Trời dùng bài Đỏ làm Chém (Khai Thiên), Sơn Tinh dùng Né làm Chém (Dời Núi), và Nguyễn Bặc dùng bài Đỏ làm Né (Nam Dược) ngay trên giao diện Bọc Trăm Trứng."
  },
  {
    name: "Thánh Gióng",
    faction: "Lạc",
    image: "/images/heroes/lac_thanh-giong.png",
    issue: "Sửa lỗi Engine lọt bypass isSkip & Hoàn thiện logic Tre Ngà, Thiết Mã",
    fix: "- **Lỗi Bypass isSkip [Tre Ngà]**: Khắc phục lỗi cực kỳ hiểm hóc khiến kỹ năng Tre Ngà không gây mất máu khi mục tiêu bấm Hủy (không có thẻ bài/không muốn bỏ bài). Lý do là event 'ask_tre_nga_discard' lọt vào bypass isSkip trong Dispatcher, khiến luồng xử lý bị return sớm thay vì ép buộc nhận sát thương.\n- **Truyền Reference Payload [Tre Ngà]**: Sửa logic để gán cờ `unavoidable = true` trên cùng một payload object với sự kiện gốc `EVENT_DO_ASK_DODGE`. Việc truyền reference này buộc `CombatHandler` hiểu rằng nạn nhân đã bị khóa Né, phải trực tiếp nhảy vào trừ máu mà không yêu cầu đánh bài Né nữa.\n- **Tầm Đánh [Thiết Mã]**: Đảm bảo kỹ năng Thiết Mã tự động -1 khoảng cách tấn công trong Core hệ thống `rangeSystem.js`.\n- **Unit Tests**: Toàn bộ Unit test của Thánh Gióng nay đã pass 100%."
  },
  {
    name: "Đinh Bộ Lĩnh",
    faction: "Sơn",
    image: "/images/heroes/son_dinh-bo-linh.png",
    issue: "Sửa lỗi tịt ngòi kỹ năng Uy Chấn do mất cờ nhận diện",
    fix: "- **Lỗi Payload [Uy Chấn]**: Khắc phục lỗi kỹ năng Uy Chấn không thể kích hoạt khi bị mất máu bởi lá [Chém] từ người dùng [Mượn Đao Giết Người]. Nguyên nhân do luồng của `borrow_sword` trong Dispatcher đã quên gán cờ `reason: 'chem'` cho `EVENT_DAMAGE`.\n- **Chuẩn Hóa Event Payload**: Cập nhật cả `EVENT_DAMAGE` và `EVENT_ASK_DODGE` để đảm bảo tương thích 100% với trigger `POST_DAMAGE` của Uy Chấn.\n- **Verification**: Đã review kỹ Modal UI và Bot AI, mọi logic giao tiếp đều hoàn hảo."
  },
  {
    name: "Nguyễn Bặc",
    faction: "Sơn",
    image: "/images/heroes/son_nguyen-bac.png",
    issue: "Sửa lỗ hổng bảo mật kỹ năng Bình Loạn và dạy Bot AI",
    fix: "- **Bịt Lỗ Hổng [Bình Loạn]**: Sửa lỗi Core Engine không xác thực (validate) 2 lá bài do client gửi lên. Giờ đây Engine đã kiểm tra nghiêm ngặt bắt buộc 2 lá bài dùng để Bình Loạn phải hoàn toàn \"cùng chất\" (same suit), tránh các hacker tấn công bằng payload giả.\n- **Dạy Bot AI [Bình Loạn]**: Lập trình thêm não cho Bot, giúp Bot biết dùng `Bình Loạn` để bắn Loạn Tiễn bằng cách ghép bài trên tay. Bot cũng thông minh đánh giá rủi ro `shouldPlayAoE` để không lỡ tay thảm sát đồng đội phe Sơn."
  },
  {
    name: "Đinh Điền",
    faction: "Sơn",
    image: "/images/heroes/son_dinh-dien.png",
    issue: "Chuẩn hóa kỹ năng Định Quốc và nâng cấp AI Phạt Tội",
    fix: "- **Dạy Bot AI [Phạt Tội]**: Bot Đinh Điền giờ đây đã biết chớp thời cơ dùng Phạt Tội (giật sét) lên đối thủ mỗi khi né thành công.\n- **Chuẩn hóa [Định Quốc]**: Khắc phục lỗi mâu thuẫn giữa mô tả kỹ năng và code. Engine và UI giờ đây chỉ cho phép đồng đội ném đúng lá [Né] hoặc [Sấm Sét] cho Đinh Điền (thay vì thẻ rác bất kỳ), và loại bỏ hiệu ứng hồi máu sai lệch so với bản gốc."
  },
  {
    name: "Nguyễn Xí",
    faction: "Sơn",
    image: "/images/heroes/son_nguyen-xi.png",
    issue: "Kiểm tra toàn diện kỹ năng Phá Quân",
    fix: "- **UI Phản Ứng**: Đã cập nhật giao diện (UI) để hỗ trợ hiển thị bộ đếm số lượng bài yêu cầu (reqDodges và reqSlashes) một cách tường minh cho người chơi khi bị Nguyễn Xí nhắm mục tiêu.\n- **Bot AI (Native Support)**: Đã kiểm tra và xác nhận Bot AI có khả năng tự động xử lý và cống nạp 2 lá Né hoặc 2 lá Chém liên tiếp khi bị ép, không xảy ra tình trạng kẹt game."
  }
];

export default function FixedHeroes() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const factions = [
    { key: 'All', name: 'Tất Cả', color: '#888' },
    { key: 'Lạc', name: 'Lạc', color: '#10b981' },
    { key: 'Sơn', name: 'Sơn', color: '#b45309' },
    { key: 'Hà', name: 'Hà', color: '#3b82f6' },
    { key: 'Việt', name: 'Việt', color: '#ef4444' }
  ];

  const filteredHeroes = FIXED_HEROES_DATA.filter(hero => {
    const matchTab = activeTab === 'All' || hero.faction === activeTab;
    const matchSearch = hero.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        hero.issue.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        hero.fix.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', margin: '0 0 10px 0' }}>✅ Tướng Đã Fix Lỗi</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Danh sách các Tướng đã được xử lý triệt để các Bug Logic & AI.
          </p>
        </div>
        
        <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
          <input 
            type="text" 
            placeholder="🔍 Nhập tên tướng hoặc lỗi..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 20px', 
              borderRadius: '8px', 
              border: '1px solid rgba(255,255,255,0.2)', 
              background: 'rgba(0,0,0,0.3)', 
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
        {factions.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveTab(f.key)}
            style={{
              padding: '10px 20px',
              background: activeTab === f.key ? f.color : 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: activeTab === f.key ? `1px solid ${f.color}` : '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
            }}
          >
            Hệ {f.name}
          </button>
        ))}
      </div>

      <div className="wiki-grid">
        {filteredHeroes.map((hero, idx) => (
          <div key={idx} className="wiki-card hero-wiki-card">
            <div className="hero-header">
              <span className="hero-emoji">
                <img src={hero.image} alt={hero.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '50%' }} />
              </span>
              <div className="hero-title">
                <h3>{hero.name}</h3>
                <div className="hero-tags">
                  <span className={`tag faction-${hero.faction.toLowerCase()}`}>{hero.faction}</span>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ color: '#ef4444', marginBottom: '5px' }}>🔴 {hero.issue}</h4>
              <p 
                style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}
                dangerouslySetInnerHTML={{ __html: hero.fix.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {filteredHeroes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          Không tìm thấy Tướng nào khớp với từ khóa "{searchQuery}"
        </div>
      )}
    </div>
  );
}
