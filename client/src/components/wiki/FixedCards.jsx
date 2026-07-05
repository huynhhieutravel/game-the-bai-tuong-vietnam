import React, { useState } from 'react';
import '../WikiPage.css';

const FIXED_CARDS_DATA = [
  {
    name: 'Xiềng Xích',
    type: 'Cẩm Nang',
    issue: 'Người chơi không thể tự click chọn bản thân để tháo/xích. Thông báo hiển thị "Hãy chọn 1 mục tiêu" gây nhầm lẫn (do Xiềng xích cho chọn 0-2 người). Viền đỏ báo hiệu mục tiêu hợp lệ bị mờ nhạt.',
    fix: 'Đã cập nhật lại MyHeroBar để khung Avatar nhận thao tác Target. Tối ưu câu thông báo linh hoạt dựa theo thông số của lá bài. Chỉnh viền đỏ thành nét đứt nổi bật (crosshair cursor).'
  }
];

export default function FixedCards() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCards = FIXED_CARDS_DATA.filter(card => {
    const matchSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        card.issue.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        card.fix.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', margin: '0 0 10px 0' }}>✅ Lá Bài Đã Fix Lỗi</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Danh sách các Lá bài / Cẩm nang đã được xử lý triệt để các Bug Logic & AI.
          </p>
        </div>
        
        <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
          <input 
            type="text" 
            placeholder="🔍 Nhập tên bài hoặc lỗi..." 
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

      <div className="wiki-grid">
        {filteredCards.map((card, idx) => (
          <div key={idx} className="wiki-card hero-wiki-card">
            <div className="hero-header">
              <span className="hero-emoji" style={{ fontSize: '3rem', width: '60px', textAlign: 'center' }}>
                🃏
              </span>
              <div className="hero-title">
                <h3>{card.name}</h3>
                <div className="hero-tags">
                  <span className={`tag`}>{card.type}</span>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ color: '#ef4444', marginBottom: '5px' }}>🔴 {card.issue}</h4>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {card.fix}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {filteredCards.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          Không tìm thấy Lá bài nào khớp với từ khóa "{searchQuery}"
        </div>
      )}
    </div>
  );
}
