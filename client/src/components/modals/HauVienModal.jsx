import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr } from 'shared/utils/playerHelpers';

export function HauVienModal({ req, gameState, onConfirm }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  
  const me = gameState.players.find(p => p.id === req.sourceId);
  const targets = req.targets.map(tId => gameState.players.find(p => p.id === tId)).filter(p => p && p.isAlive);

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🤝 HẬU VIỆN
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bạn có kỹ năng Hậu Viện. Bạn có muốn nhường lá [Đào] này cho đồng minh để rút 1 lá bài không?
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
        {targets.map(p => (
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
             <span>HP: {p.hp}/{p.maxHp}</span>
           </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-action secondary" style={{ flex: 1 }} onClick={() => onConfirm({ doReact: false })}>
          Dùng Cho Mình
        </button>
        <button 
           className="btn-action success" style={{ flex: 1 }} 
           disabled={selectedTarget === null}
           onClick={() => onConfirm({ doReact: true, targetId: selectedTarget })}
        >
          Nhường Đào
        </button>
      </div>
    </div>
  );
}
