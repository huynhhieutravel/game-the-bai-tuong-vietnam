import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function TrungDungModal({ req, gameState, onConfirm }) {
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  const [virtualName, setVirtualName] = useState(null);
  const [targetId, setTargetId] = useState(null);
  
  const me = gameState.players[req.sourceId];
  const validTargets = gameState.players.filter(p => p.id !== me.id && p.isAlive);
  
  // Basic cards to bluff as
  const bluffOptions = ['Chém', 'Đào', 'Tước Bài', 'Cướp Bài', 'Loạn Tiễn', 'Dã Man'];

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🤥 TRUNG DŨNG (Nghi Binh)
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Úp 1 lá bài trên tay và dùng như 1 lá bài khác. Kẻ thù có thể nghi ngờ!
      </div>
      
      <div style={{ textAlign: 'left', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>1. Chọn bài giấu:</div>
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
        {me.hand.map((c, i) => (
           <div 
             key={i} 
             onClick={() => setSelectedCardIdx(i)}
             style={{ 
               padding: '5px', border: selectedCardIdx === i ? '2px solid var(--color-gold)' : '1px solid #374151',
               cursor: 'pointer'
             }}
           >
             {c.name}
           </div>
        ))}
      </div>

      <div style={{ textAlign: 'left', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>2. Tuyên bố nó là:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
        {bluffOptions.map(name => (
           <button 
             key={name} 
             className={`btn-action ${virtualName === name ? 'primary' : 'secondary'}`}
             onClick={() => setVirtualName(name)}
           >
             {name}
           </button>
        ))}
      </div>
      
      {['Chém', 'Tước Bài', 'Cướp Bài'].includes(virtualName) && (
        <>
          <div style={{ textAlign: 'left', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>3. Mục tiêu:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {validTargets.map(p => (
               <button 
                 key={p.id} 
                 className={`btn-action ${targetId === p.id ? 'primary' : 'secondary'}`}
                 onClick={() => setTargetId(p.id)}
               >
                 {p.name}
               </button>
            ))}
          </div>
        </>
      )}
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ canceled: true })}>Hủy</button>
        <button 
           className="btn-action success" style={{ flex: 1 }} 
           disabled={selectedCardIdx === null || virtualName === null || (['Chém', 'Tước Bài', 'Cướp Bài'].includes(virtualName) && targetId === null)}
           onClick={() => onConfirm({ cardIndex: selectedCardIdx, virtualCardName: virtualName, targetId: targetId })}
        >
          Tuyên Bố
        </button>
      </div>
    </div>
  );
}
