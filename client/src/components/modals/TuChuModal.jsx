import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function TuChuModal({ req, gameState, onConfirm }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  
  const me = gameState.players[req.sourceId];
  const validTargets = gameState.players.filter(p => p.id !== me.id && p.isAlive && p.hp > me.hp && p.hand.length > 0);

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        ⚔️ TỰ CHỦ (Đấu Điểm)
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Chọn 1 tướng có HP cao hơn bạn và 1 lá bài trên tay để Đấu Điểm.
      </div>
      
      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>1. Chọn mục tiêu:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
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
             <span>{p.name} {getHeroNameStr(p)}</span>
             <span>HP: {p.hp} | 🃏 {p.hand.length}</span>
           </div>
        ))}
      </div>

      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>2. Chọn bài Đấu Điểm:</div>
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
        {me.hand.map((c, i) => (
           <div 
             key={i} 
             onClick={() => setSelectedCardIdx(i)}
             style={{ 
               padding: '5px 10px', border: selectedCardIdx === i ? '2px solid var(--color-gold)' : '1px solid #374151',
               borderRadius: '4px', background: selectedCardIdx === i ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
               cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center'
             }}
           >
             <div style={{ fontSize: '0.75rem', color: c.color === 'red' ? '#ef4444' : '#f1f5f9' }}>{c.suit}{c.rank}</div>
             <div style={{ fontSize: '0.85rem' }}>{c.name}</div>
           </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Hủy Bỏ
        </button>
        <button 
           className="btn-action success" style={{ flex: 1 }} 
           disabled={selectedTarget === null || selectedCardIdx === null}
           onClick={() => onConfirm({ doUse: true, targetId: selectedTarget, cardIdx: selectedCardIdx })}
        >
          Bắt Đầu Đấu Điểm
        </button>
      </div>
    </div>
  );
}
