import React, { useState } from 'react';
import { getFullPlayerName } from 'shared/utils/playerHelpers';
import { getSuitEmoji } from 'shared/constants/cardTypes';

export function HienHauModal({ req, gameState, onConfirm }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  
  const me = gameState.players.find(p => p.id === req.responderId);

  const validTargets = gameState.players.filter(p => {
    if (p.id === me.id) return false;
    if (!p.isAlive) return false;
    return true;
  });

  const validCards = me.hand.filter(c => {
    // Quốc Sắc converts Spade (Bích) to Heart (Cơ)
    const s = c.suit?.toLowerCase() || '';
    return s === 'heart' || s === 'cơ' || s === 'spade' || s === 'bích' || c.suit === '♥' || c.suit === '♠';
  });

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#ec4899', fontWeight: 'bold' }}>
        🌸 HIỀN HẬU
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bỏ 1 lá bài ♥ trên tay để ngăn sát thương, sau đó chọn 1 tướng khác và kích hoạt hiệu ứng.
      </div>
      
      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>1. Chọn 1 lá bài ♥ (Bích tính là Cơ):</div>
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
        {validCards.length === 0 && <div style={{color: 'gray'}}>Không có lá bài phù hợp!</div>}
        {validCards.map((c, i) => {
           return (
             <div 
               key={c.id || `card-${i}`} 
               onClick={() => setSelectedCardId(c.id)}
               style={{ 
                 padding: '5px 10px', border: selectedCardId === c.id ? '2px solid var(--color-gold)' : '1px solid #374151',
                 borderRadius: '4px', background: selectedCardId === c.id ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
                 cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center'
               }}
             >
               <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>{getSuitEmoji(c.suit)}{c.rank}</div>
               <div style={{ fontSize: '0.85rem' }}>{c.name}</div>
             </div>
           );
        })}
      </div>

      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>2. Chọn 1 tướng khác:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', maxHeight: '150px', overflowY: 'auto' }}>
        {validTargets.length === 0 && <div style={{color: 'gray'}}>Không có mục tiêu nào!</div>}
        {validTargets.map((p, i) => (
           <div 
             key={p.id !== undefined ? p.id : `target-${i}`} 
             onClick={() => setSelectedTarget(p.id)}
             style={{ 
               padding: '8px', border: selectedTarget === p.id ? '2px solid var(--color-gold)' : '1px solid #374151',
               borderRadius: '4px', background: selectedTarget === p.id ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
               cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
             }}
           >
             <span>{getFullPlayerName(p, me.id)}</span>
             <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>HP: {p.hp}/{p.maxHp}</span>
           </div>
        ))}
      </div>
      
      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>3. Chọn hiệu ứng (Xác nhận):</div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-action success" 
            style={{ flex: 1, opacity: (selectedTarget === null || !selectedCardId) ? 0.5 : 1, cursor: (selectedTarget === null || !selectedCardId) ? 'not-allowed' : 'pointer' }} 
            disabled={selectedTarget === null || !selectedCardId}
            onClick={() => {
              if (selectedTarget !== null && selectedCardId) {
                onConfirm({ doUse: true, targetId: selectedTarget, cardId: selectedCardId, option: 1 });
              }
            }}
          >
            Nhận 1 ST & Rút bài
          </button>
          <button 
            className="btn-action success" 
            style={{ flex: 1, opacity: (selectedTarget === null || !selectedCardId) ? 0.5 : 1, cursor: (selectedTarget === null || !selectedCardId) ? 'not-allowed' : 'pointer' }} 
            disabled={selectedTarget === null || !selectedCardId}
            onClick={() => {
              if (selectedTarget !== null && selectedCardId) {
                onConfirm({ doUse: true, targetId: selectedTarget, cardId: selectedCardId, option: 2 });
              }
            }}
          >
            Mất 1 HP & Thu lá bài bỏ
          </button>
        </div>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ canceled: true })}>
          Bỏ qua
        </button>
      </div>
    </div>
  );
}
