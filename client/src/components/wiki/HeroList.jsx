import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HEROES } from '../../data/gameData';
import { EXPANSION_HEROES } from '../../data/expansionHeroes';

export default function HeroList() {
  const [activeTab, setActiveTab] = useState('lac');
  const [searchQuery, setSearchQuery] = useState('');

  const factions = [
    { key: 'lac', name: 'Lạc', color: '#10b981' },
    { key: 'son', name: 'Sơn', color: '#b45309' },
    { key: 'ha', name: 'Hà', color: '#3b82f6' },
    { key: 'viet', name: 'Việt', color: '#ef4444' }
  ];

  // Map to quickly find active heroes by name
  const activeHeroesMap = {};
  HEROES.forEach(hero => {
    // Normalize string to match (e.g. handle Yết Kiêu)
    const normName = hero.name.trim();
    activeHeroesMap[normName] = hero;
  });

  const visibleFactions = searchQuery.trim() !== '' ? factions : factions.filter(f => f.key === activeTab);

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', margin: '0 0 10px 0' }}>({Object.keys(activeHeroesMap).length}/{Object.values(EXPANSION_HEROES).flat().length}) 🦸 Danh sách Tướng</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Những tướng đã được kích hoạt (có màu) là có thể chơi được. Những tướng màu xám đang trong quá trình phát triển.
          </p>
        </div>
        
        <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
          <input 
            type="text" 
            placeholder="🔍 Nhập tên tướng để tìm kiếm..." 
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
            onClick={() => { setActiveTab(f.key); setSearchQuery(''); }}
            style={{
              padding: '10px 20px',
              background: activeTab === f.key ? f.color : 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: activeTab === f.key ? `1px solid ${f.color}` : '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              opacity: searchQuery.trim() !== '' ? 0.5 : 1
            }}
          >
            ({
              EXPANSION_HEROES[f.key].filter(h => {
                let searchName = h.name.includes('(') ? h.name.split('(')[0].trim() : h.name;
                return activeHeroesMap[searchName] || activeHeroesMap[h.name];
              }).length
            }/{EXPANSION_HEROES[f.key].length}) Hệ {f.name}
          </button>
        ))}
      </div>

      {visibleFactions.map(faction => {
        
        const sortedHeroes = [...EXPANSION_HEROES[faction.key]]
          .filter(h => {
             const searchLower = searchQuery.toLowerCase().trim();
             if (!searchLower) return true;
             // Search in expansion hero name or active hero name
             let searchName = h.name;
             if (searchName.includes('(')) searchName = searchName.split('(')[0].trim();
             const activeHero = activeHeroesMap[searchName] || activeHeroesMap[h.name];
             
             if (h.name.toLowerCase().includes(searchLower)) return true;
             if (activeHero && activeHero.name.toLowerCase().includes(searchLower)) return true;
             return false;
          })
          .sort((a, b) => {
            let searchA = a.name.includes('(') ? a.name.split('(')[0].trim() : a.name;
            let searchB = b.name.includes('(') ? b.name.split('(')[0].trim() : b.name;
            const isAActive = !!(activeHeroesMap[searchA] || activeHeroesMap[a.name]);
            const isBActive = !!(activeHeroesMap[searchB] || activeHeroesMap[b.name]);
            if (isAActive && !isBActive) return -1;
            if (!isAActive && isBActive) return 1;
            return a.stt - b.stt;
          });

        if (sortedHeroes.length === 0) return null;

        return (
        <div key={faction.key} style={{ marginBottom: '40px' }}>
          <h2 style={{ color: faction.color, borderBottom: `1px solid ${faction.color}`, paddingBottom: '10px', marginBottom: '20px' }}>
            Hệ {faction.name}
          </h2>
          <div className="wiki-grid">
            {sortedHeroes.map(expHero => {
              // Yết Kiêu (phiên bản cận chiến) -> just Yết Kiêu for matching if needed, or exact match
              let searchName = expHero.name;
              if (searchName.includes('(')) {
                searchName = searchName.split('(')[0].trim();
              }
              
              const activeHero = activeHeroesMap[searchName] || activeHeroesMap[expHero.name];

              if (activeHero) {
                // Render ACTIVE hero card
                return (
                  <div key={expHero.stt} className="wiki-card hero-wiki-card">
                    <div className="hero-header">
                      <span className="hero-emoji">
                        {activeHero.image ? (
                          <img src={`/images/heroes/${activeHero.image}`} alt={activeHero.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          activeHero.emoji || '❓'
                        )}
                      </span>
                      <div className="hero-title">
                        <h3>{activeHero.name}</h3>
                        <div className="hero-tags">
                          <span className={`tag faction-${activeHero.faction.toLowerCase()}`}>{activeHero.faction}</span>
                          <span className="tag hp">❤️ {activeHero.maxHp}</span>
                          <span className="tag gender">{activeHero.gender}</span>
                        </div>
                      </div>
                    </div>
                    <p className="hero-bio">"{activeHero.bio}"</p>
                    
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                      <Link to={`/wiki/heroes/${activeHero.id}`} className="btn-action primary" style={{ textDecoration: 'none', display: 'block' }}>
                        Xem Chi Tiết Kỹ Năng
                      </Link>
                    </div>
                  </div>
                );
              } else {
                // Render INACTIVE hero card
                return (
                  <div key={expHero.stt} className="wiki-card hero-wiki-card" style={{ filter: 'grayscale(100%)', opacity: 0.5, border: '1px solid #444' }}>
                    <div className="hero-header">
                      <span className="hero-emoji" style={{ opacity: 0.2 }}>❓</span>
                      <div className="hero-title">
                        <h3 style={{ color: '#888' }}>{expHero.name}</h3>
                        <div className="hero-tags">
                          <span className="tag" style={{ background: '#333', color: '#888' }}>{faction.name}</span>
                        </div>
                      </div>
                    </div>
                    <p className="hero-bio" style={{ color: '#666', fontStyle: 'italic' }}>"{expHero.note}"</p>
                    
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                      <div className="btn-action" style={{ background: '#333', color: '#666', cursor: 'not-allowed', display: 'block', padding: '10px', borderRadius: '4px' }}>
                        Chưa Cập Nhật
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}
