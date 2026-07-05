import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function KhoanDanModal({ req, gameState, onConfirm }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const alivePlayers = gameState.players.filter(p => p.isAlive);

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🕊️ KHOAN DÂN
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bạn vừa nhận {req.amount} sát thương! Chọn 1 người chơi để họ rút bài cho đến khi đầy tay (tối đa 5 lá).
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
        {alivePlayers.map(p => {
           const toDraw = Math.max(0, Math.min(p.maxHp, 5) - p.hand.length);
           return (
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
               <span>Rút +{toDraw} lá</span>
             </div>
           );
        })}
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Bỏ Qua
        </button>
        <button 
           className="btn-action success" style={{ flex: 1 }} 
           disabled={selectedTarget === null}
           onClick={() => onConfirm({ doUse: true, targetId: selectedTarget })}
        >
          Khoan Dân
        </button>
      </div>
    </div>
  );
}
