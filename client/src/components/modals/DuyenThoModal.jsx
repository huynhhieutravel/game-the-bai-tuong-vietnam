// @ts-nocheck
import React, { useState } from 'react';
import { getSuitEmoji } from 'shared/constants/cardTypes';

export function DuyenThoModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === req.responderId);
  const [selectedIndexes, setSelectedIndexes] = useState([]);

  if (req.type !== 'ask_duyen_tho') return null;

  const validCards = me.hand.map((c, idx) => ({ ...c, idx }));

  const toggleSelect = (idx) => {
    if (selectedIndexes.includes(idx)) {
      setSelectedIndexes(selectedIndexes.filter(i => i !== idx));
    } else {
      if (selectedIndexes.length < 2) {
        setSelectedIndexes([...selectedIndexes, idx]);
      }
    }
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#ec4899', fontWeight: 'bold' }}>🌸 DUYÊN THƠ</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Chọn 2 lá bài trên tay để bỏ. Sau đó, cả bạn và tướng được chọn sẽ hồi 1 HP.
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
        {validCards.map(c => {
           const isSelected = selectedIndexes.includes(c.idx);
           return (
              <div 
                 key={c.idx}
                 onClick={() => toggleSelect(c.idx)}
                 style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: `2px solid ${isSelected ? '#10b981' : '#374151'}`,
                    background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#1f2937',
                    cursor: 'pointer',
                 }}
              >
                 <div style={{ fontSize: '0.7rem', color: c.color === 'red' ? '#ef4444' : 'white' }}>{getSuitEmoji(c.suit)} {c.rank}</div>
                 <div style={{ fontSize: '0.85rem' }}>
                    {c.name}
                 </div>
              </div>
           );
        })}
        {validCards.length < 2 && <div style={{ fontSize: '0.8rem', color: 'gray' }}>Không đủ 2 lá bài</div>}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
             className="btn-action success" 
             disabled={selectedIndexes.length !== 2}
             onClick={() => onConfirm({ targetId: req.targetId, cardIndexes: selectedIndexes })}
          >
             Bỏ 2 lá & Hồi HP
          </button>
          <button className="btn-action secondary" onClick={() => onConfirm({ canceled: true })}>Hủy</button>
      </div>
    </div>
  );
}
