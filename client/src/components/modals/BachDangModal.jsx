import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function BachDangModal({ req, gameState, onConfirm }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const me = gameState.players[0];

  const toggleCard = (idx) => {
     if (selectedCards.includes(idx)) {
         setSelectedCards(selectedCards.filter(i => i !== idx));
     } else {
         setSelectedCards([...selectedCards, idx]);
     }
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#3b82f6', fontWeight: 'bold' }}>🌊 BẠCH ĐẰNG</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Chọn bài để bỏ, sau đó rút bài tương ứng. (Bỏ hết bài trên tay rút thêm 1)</div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
        {me.hand.map((c, idx) => {
           const isSelected = selectedCards.includes(idx);
           return (
             <div 
               key={idx} 
               onClick={() => toggleCard(idx)}
               style={{ 
                 padding: '6px', borderRadius: '4px', border: `2px solid ${isSelected ? '#ef4444' : '#374151'}`, 
                 background: isSelected ? 'rgba(239, 68, 68, 0.2)' : '#1f2937', cursor: 'pointer'
               }}
             >
               <div style={{ fontSize: '0.7rem', color: c.color === 'red' ? '#ef4444' : 'white' }}>{c.suit} {c.rank}</div>
               <div style={{ fontSize: '0.85rem', color: 'white' }}>{c.name}</div>
             </div>
           );
        })}
        {me.hand.length === 0 && <div style={{ fontSize: '0.8rem', color: 'gray' }}>Tay không còn bài</div>}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button className="btn-action success" onClick={() => onConfirm({ cardIndexes: selectedCards })}>
            {selectedCards.length === 0 ? 'Không bỏ lá nào' : `Bỏ ${selectedCards.length} lá`}
          </button>
          <button className="btn-action secondary" onClick={() => onConfirm({ canceled: true })}>Hủy</button>
      </div>
    </div>
  );
}
