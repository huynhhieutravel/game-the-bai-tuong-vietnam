import React, { useState } from 'react';
import { getHeroNameStr } from 'shared/utils/playerHelpers';

export function DamBacModal({ req, gameState, onConfirm }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  
  const validTargets = gameState.players.filter(p => p.isAlive);

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🍚 ĐẠM BẠC
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        {req.message || 'Chọn 1 người để họ rút 2 lá bài.'}
      </div>
      
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
             <span>({p.hand.length} lá)</span>
           </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          className="btn-action danger" 
          style={{ flex: 1 }} 
          onClick={() => onConfirm({ doUse: false })}
        >
          Bỏ qua
        </button>
        <button 
          className="btn-action success" 
          style={{ flex: 1, opacity: selectedTarget !== null ? 1 : 0.5 }} 
          disabled={selectedTarget === null}
          onClick={() => onConfirm({ doUse: true, targets: [selectedTarget] })}
        >
          Xác nhận
        </button>
      </div>
    </div>
  );
}
