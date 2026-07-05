import React, { useState } from 'react';
import '../WikiPage.css';

const FIXED_SYSTEMS_DATA = [];

export default function FixedSystems() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSystems = FIXED_SYSTEMS_DATA.filter(sys => {
    const matchSearch = sys.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        sys.issue.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        sys.fix.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', margin: '0 0 10px 0' }}>⚙️ Hệ Thống Đã Fix Lỗi</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Danh sách các lỗi liên quan đến Core Engine, UI Framework và Logic Tổng.
          </p>
        </div>
        
        <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
          <input 
            type="text" 
            placeholder="🔍 Nhập thành phần hoặc lỗi..." 
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
        {filteredSystems.map((sys, idx) => (
          <div key={idx} className="wiki-card hero-wiki-card">
            <div className="hero-header">
              <span className="hero-emoji" style={{ fontSize: '3rem', width: '60px', textAlign: 'center' }}>
                ⚙️
              </span>
              <div className="hero-title">
                <h3>{sys.name}</h3>
                <div className="hero-tags">
                  <span className={`tag`} style={{ background: '#3b82f6', color: 'white' }}>{sys.type}</span>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ color: '#ef4444', marginBottom: '5px' }}>🔴 {sys.issue}</h4>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {sys.fix}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {filteredSystems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          Không tìm thấy Lỗi hệ thống nào khớp với từ khóa "{searchQuery}"
        </div>
      )}
    </div>
  );
}
