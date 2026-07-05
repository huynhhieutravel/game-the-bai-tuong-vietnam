import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr } from '../../utils/playerHelpers';

export function HoaThanModal({ req, gameState, onConfirm }) {
  const [targetA, setTargetA] = useState(null);
  const [targetB, setTargetB] = useState(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  
  const me = gameState.players[req.sourceId];
  const validTargets = gameState.players.filter(p => p.id !== me.id && p.isAlive && (p.heroes?.[0]?.gender === 'Nam' || p.heroes?.[1]?.gender === 'Nam' || p.gender === 'Nam'));

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        💃 HÒA THÂN
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bỏ 1 lá bài trên tay, chỉ định 2 tướng Nam Quyết Đấu với nhau.
      </div>
      
      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>1. Chọn bài để bỏ:</div>
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
        {me.hand.map((c, i) => (
           <div 
             key={i} 
             onClick={() => setSelectedCardIdx(i)}
             style={{ 
               padding: '5px 10px', border: selectedCardIdx === i ? '2px solid var(--color-gold)' : '1px solid #374151',
               borderRadius: '4px', background: selectedCardIdx === i ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
               cursor: 'pointer', whiteSpace: 'nowrap'
             }}
           >
             {c.name}
           </div>
        ))}
      </div>

      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>2. Chọn người khiêu chiến (A):</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        {validTargets.map(p => (
           <button 
             key={p.id} 
             className={`btn-action ${targetA === p.id ? 'primary' : 'secondary'}`}
             disabled={targetB === p.id}
             onClick={() => setTargetA(p.id)}
           >
             {p.name}
           </button>
        ))}
      </div>
      
      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>3. Chọn người bị Quyết Đấu (B):</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
        {validTargets.map(p => (
           <button 
             key={p.id} 
             className={`btn-action ${targetB === p.id ? 'primary' : 'secondary'}`}
             disabled={targetA === p.id}
             onClick={() => setTargetB(p.id)}
           >
             {p.name}
           </button>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ canceled: true })}>
          Hủy Bỏ
        </button>
        <button 
           className="btn-action success" style={{ flex: 1 }} 
           disabled={targetA === null || targetB === null || selectedCardIdx === null}
           onClick={() => onConfirm({ targetA, targetB, cardIndex: selectedCardIdx })}
        >
          Kích hoạt
        </button>
      </div>
    </div>
  );
}
