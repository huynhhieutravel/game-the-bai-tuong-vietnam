import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function BinhLoanModal({ req, gameState, onConfirm }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const me = gameState.players[req.sourceId];

  const handleCardClick = (idx) => {
      if (selectedCards.includes(idx)) {
          setSelectedCards(selectedCards.filter(i => i !== idx));
      } else {
          if (selectedCards.length < 2) {
              setSelectedCards([...selectedCards, idx]);
          } else {
              setSelectedCards([selectedCards[1], idx]); // keep last 2
          }
      }
  };
  
  const isSameSuit = selectedCards.length === 2 && me.hand[selectedCards[0]]?.suit === me.hand[selectedCards[1]]?.suit;

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🏹 BÌNH LOẠN
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bỏ 2 lá bài cùng chất để dùng như Loạn Tiễn.
      </div>
      
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
        {me.hand.map((c, i) => (
           <div 
             key={i} 
             onClick={() => handleCardClick(i)}
             style={{ 
               padding: '5px 10px', border: selectedCards.includes(i) ? '2px solid var(--color-gold)' : '1px solid #374151',
               borderRadius: '4px', background: selectedCards.includes(i) ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
               cursor: 'pointer', whiteSpace: 'nowrap'
             }}
           >
             <div style={{ fontSize: '0.75rem', color: c.color === 'red' ? '#ef4444' : '#f1f5f9' }}>{c.suit}{c.rank}</div>
             <div>{c.name}</div>
           </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ canceled: true })}>
          Hủy
        </button>
        <button 
           className="btn-action success" style={{ flex: 1 }} 
           disabled={!isSameSuit}
           onClick={() => onConfirm({ cardIndexes: selectedCards })}
        >
          Phát Động
        </button>
      </div>
    </div>
  );
}
