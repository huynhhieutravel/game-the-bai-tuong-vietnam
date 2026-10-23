import React, { useState } from 'react';
import { getSuitEmoji } from 'shared/constants/cardTypes';

export function XaThanModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === req.responderId);
  const equipmentCards = me?.equipment ? Object.values(me.equipment).filter(Boolean) : [];
  const validCards = [...(me?.hand || []), ...equipmentCards];

  const validTargets = (req.validTargets || []).map(id => gameState.players.find(p => p.id === id)).filter(Boolean);
  const [selectedCardId, setSelectedCardId] = useState(validCards[0]?.id ?? null);
  const [selectedTargetId, setSelectedTargetId] = useState(validTargets[0]?.id ?? null);

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#ec4899', fontWeight: 'bold' }}>
        🌸 XẢ THÂN
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Khi bị [Chém], bạn có thể bỏ 1 lá bài để chuyển hướng cú [Chém] này sang người chơi khác trong tầm công kích.
      </div>
      
      {validTargets.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ textAlign: 'left', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>Chuyển hướng Chém sang:</div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', justifyContent: 'center' }}>
            {validTargets.map(target => (
              <div 
                key={target.id}
                onClick={() => setSelectedTargetId(target.id)}
                style={{ 
                  padding: '5px 12px',
                  border: selectedTargetId === target.id ? '2px solid var(--color-gold)' : '1px solid #374151',
                  borderRadius: '4px',
                  background: selectedTargetId === target.id ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
                  cursor: 'pointer',
                  fontWeight: selectedTargetId === target.id ? 'bold' : 'normal'
                }}
              >
                {target.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>Chọn 1 lá bài để bỏ:</div>
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
        {validCards.length === 0 && <div style={{color: 'gray'}}>Không có lá bài nào trên người!</div>}
        {validCards.map((c, i) => {
           return (
             <div 
               key={c.id || `xathan-${i}`} 
               onClick={() => setSelectedCardId(c.id)}
               style={{ 
                 padding: '5px 10px', border: selectedCardId === c.id ? '2px solid var(--color-gold)' : '1px solid #374151',
                 borderRadius: '4px', background: selectedCardId === c.id ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
                 cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center'
               }}
             >
               <div style={{ fontSize: '0.75rem', color: c.suit === 'heart' || c.suit === 'diamond' || c.suit === 'Cơ' || c.suit === 'Rô' ? '#ef4444' : '#d1d5db' }}>{getSuitEmoji(c.suit)}{c.rank}</div>
               <div style={{ fontSize: '0.85rem' }}>{c.name}</div>
             </div>
           );
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ canceled: true })}>
          Bỏ qua
        </button>
        <button 
          className="btn-action success" 
          style={{ flex: 1, opacity: !selectedCardId || (validTargets.length > 0 && selectedTargetId === null) ? 0.5 : 1, cursor: !selectedCardId ? 'not-allowed' : 'pointer' }} 
          disabled={!selectedCardId || (validTargets.length > 0 && selectedTargetId === null)}
          onClick={() => {
            if (selectedCardId && (selectedTargetId !== null || validTargets.length === 0)) {
              onConfirm({ doUse: true, cardId: selectedCardId, targetId: selectedTargetId });
            }
          }}
        >
          Xác Nhận
        </button>
      </div>
    </div>
  );
}
