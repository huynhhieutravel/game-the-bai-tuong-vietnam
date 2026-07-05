import React, { useState } from 'react';
import '../WikiPage.css';

const FIXED_HEROES_DATA = [
  {
    name: "Lạc Long Quân",
    faction: "Lạc",
    image: "/images/heroes/lac_lac-long-quan.png",
    issue: "Đại tu toàn diện Logic Kỹ Năng & AI Bot & Khắc phục Màn hình Đỏ",
    fix: "- **1. Logic Engine**: Sửa lỗi Bọc Trăm Trứng bị kẹt hàng đợi khi có người từ chối.\n- **2. Mismatch Dữ liệu**: Đồng bộ payload UI gửi lên (`cardId` thay vì `cardIndexSelected`) để Engine nhận diện.\n- **3. UI / Màn hình Đỏ**: Bổ sung Modal `AskBocTramTrungDodgeModal` còn thiếu. Dùng Optional Chaining `gameState?.players?.[0]` để triệt tiêu lỗi trắng màn hình lúc khởi tạo.\n- **4. AI (Bot)**: Bot đã biết vứt bài dùng Thủy Tổ, dùng Đào/Chém khi được thưởng, và biết quăng Né/Chém để đỡ đạn cứu Lạc Long Quân."
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
