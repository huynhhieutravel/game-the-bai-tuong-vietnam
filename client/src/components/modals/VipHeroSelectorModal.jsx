import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';
import { HEROES } from '../../data/gameData';


export function VipHeroSelectorModal({ draftSelection, me, onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Lạc', 'Sơn', 'Hà', 'Thủy'
  const [searchTerm, setSearchTerm] = useState('');

  let availableHeroes = [...HEROES];

  // Filter by tab
  if (activeTab !== 'All') {
      availableHeroes = availableHeroes.filter(h => h.faction === activeTab);
  }

  // Filter by search term
  if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      availableHeroes = availableHeroes.filter(h => h.name.toLowerCase().includes(term));
  }

  // Sort available heroes by faction so they are grouped nicely
  availableHeroes.sort((a, b) => a.faction.localeCompare(b.faction));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ background: '#1f2937', padding: '25px', borderRadius: '12px', border: '2px solid #fbbf24', width: '90%', maxWidth: '1000px', maxHeight: '90%', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: '#fbbf24', textAlign: 'center', marginBottom: '15px' }}>⭐ VIP: Chọn Tướng Bất Kỳ ⭐</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', gap: '5px' }}>
                {['All', 'Lạc', 'Sơn', 'Hà', 'Thủy'].map(tab => (
                   <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)}
                      style={{
                         padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                         background: activeTab === tab ? '#fbbf24' : '#374151',
                         color: activeTab === tab ? '#000' : '#fff',
                         fontWeight: activeTab === tab ? 'bold' : 'normal'
                      }}
                   >
                      {tab === 'All' ? 'Tất cả' : tab}
                   </button>
                ))}
             </div>
             <input 
                type="text" 
                placeholder="Tìm kiếm tướng..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #4b5563', background: '#111827', color: 'white', minWidth: '200px' }}
             />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', overflowY: 'auto', padding: '10px 0', flex: 1 }}>
            {availableHeroes.length > 0 ? availableHeroes.map(hero => (
                <div 
                    key={hero.id}
                    onClick={() => onSelect(hero.id)}
                    style={{
                        width: '150px', cursor: 'pointer', border: draftSelection.includes(hero.id) ? '3px solid #10b981' : '2px solid #374151', borderRadius: '8px', overflow: 'hidden', transition: 'transform 0.2s', flexShrink: 0,
                        boxShadow: draftSelection.includes(hero.id) ? '0 0 15px rgba(16, 185, 129, 0.5)' : 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                    {hero.image ? (
                        <img src={`/images/heroes/${hero.image}`} alt={hero.name} style={{ width: '100%', height: '210px', objectFit: 'fill' }} />
                    ) : (
                        <div style={{ height: '210px', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <span style={{ fontSize: '2rem' }}>{hero.emoji || '❓'}</span>
                            <span style={{ color: 'white', marginTop: '10px' }}>{hero.name}</span>
                        </div>
                    )}
                    <div style={{ background: '#111827', color: 'white', textAlign: 'center', padding: '5px', fontSize: '0.9rem' }}>
                        {hero.name} ({hero.faction})
                    </div>
                </div>
            )) : (
                <div style={{ color: 'gray', padding: '50px' }}>Không tìm thấy tướng nào phù hợp</div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button className="btn-action secondary" onClick={onClose}>Đóng Lại</button>
          </div>
       </div>
    </div>
  );
}
