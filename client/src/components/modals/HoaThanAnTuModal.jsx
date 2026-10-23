import { getSuitEmoji } from 'shared/constants/cardTypes';
import React, { useState } from 'react';
import { getFullPlayerName } from 'shared/utils/playerHelpers';

export function HoaThanAnTuModal({ req, gameState, onConfirm }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  
  const me = gameState.players.find(p => p.id === req.sourceId);
  const validTargets = gameState.players.filter(p => p.id !== me.id && p.isAlive && (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Hỗn Loạn' || c.virtualName === 'hon-loan')));

  // Filter diamond cards from hand and equipment
  const validCards = [];
  me.hand.forEach((c, idx) => {
    if (c.suit === 'diamond' || c.suit === 'Rô') validCards.push({ ...c, originalIndex: idx, from: 'hand' });
  });
  if (me.equipment) {
    me.equipment.forEach((c, idx) => {
      if (c.suit === 'diamond' || c.suit === 'Rô') validCards.push({ ...c, originalIndex: idx, from: 'equip' });
    });
  }

  const handleSelectCard = (cardRef) => {
    // encode card reference to string for unique state
    setSelectedCardIdx(`${cardRef.from}_${cardRef.originalIndex}`);
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#3b82f6', fontWeight: 'bold' }}>
        🔷 HÒA THÂN
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Dùng 1 lá bài ♦ làm [Lạc Bất Tư Thục].
      </div>
      
      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>1. Chọn bài Rô (♦):</div>
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
        {validCards.length === 0 && <div style={{color: 'gray'}}>Không có lá bài ♦ nào!</div>}
        {validCards.map((c, i) => {
           const idStr = `${c.from}_${c.originalIndex}`;
           return (
             <div 
               key={i} 
               onClick={() => handleSelectCard(c)}
               style={{ 
                 padding: '5px 10px', border: selectedCardIdx === idStr ? '2px solid var(--color-gold)' : '1px solid #374151',
                 borderRadius: '4px', background: selectedCardIdx === idStr ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
                 cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center'
               }}
             >
               <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>{getSuitEmoji(c.suit)}{c.rank}</div>
               <div style={{ fontSize: '0.85rem' }}>{c.name} {c.from === 'equip' ? '(Trang bị)' : ''}</div>
             </div>
           );
        })}
      </div>

      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>2. Chọn mục tiêu:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', maxHeight: '150px', overflowY: 'auto' }}>
        {validTargets.length === 0 && <div style={{color: 'gray'}}>Không có mục tiêu hợp lệ!</div>}
        {validTargets.map(p => (
           <div 
             key={p.id} 
             onClick={() => setSelectedTarget(p.id)}
             style={{ 
               padding: '8px', border: selectedTarget === p.id ? '2px solid var(--color-gold)' : '1px solid #374151',
               borderRadius: '4px', background: selectedTarget === p.id ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
               cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
             }}
           >
             <span>{getFullPlayerName(p, me.id)}</span>
           </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ canceled: true })}>
          Hủy Bỏ
        </button>
        <button 
           className="btn-action success" style={{ flex: 1 }} 
           disabled={selectedTarget === null || selectedCardIdx === null}
           onClick={() => {
              const [from, idx] = selectedCardIdx.split('_');
              onConfirm({ targetId: selectedTarget, cardFrom: from, cardIndex: parseInt(idx, 10) });
           }}
        >
          Sử Dụng
        </button>
      </div>
    </div>
  );
}
