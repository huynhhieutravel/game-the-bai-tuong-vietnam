import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function DaTrachModal({ req, gameState, onConfirm }) {
  const [selectedTargets, setSelectedTargets] = useState([]);
  const alivePlayers = gameState.players.filter(p => p.isAlive && p.id !== req.sourceId && p.hand.length > 0);

  const toggleTarget = (id) => {
    if (selectedTargets.includes(id)) {
      setSelectedTargets(selectedTargets.filter(t => t !== id));
    } else if (selectedTargets.length < 2) {
      setSelectedTargets([...selectedTargets, id]);
    }
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🦇 DẠ TRẠCH
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Chọn tối đa 2 mục tiêu để rút ngẫu nhiên 1 lá bài trên tay mỗi người. Nếu bỏ qua, bạn sẽ bốc 2 lá từ nọc như bình thường.
      </div>
      
      {alivePlayers.length === 0 ? (
         <div style={{ color: '#ef4444', marginBottom: '15px' }}>Không có người chơi nào có bài trên tay!</div>
      ) : (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
           {alivePlayers.map(p => (
             <div 
               key={p.id} 
               onClick={() => toggleTarget(p.id)}
               style={{ 
                 padding: '8px', border: selectedTargets.includes(p.id) ? '2px solid var(--color-gold)' : '1px solid #374151',
                 borderRadius: '4px', background: selectedTargets.includes(p.id) ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
                 cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
               }}
             >
               <span>{p.name} {getHeroNameStr(p)}</span>
               <span>🃏 {p.hand.length}</span>
             </div>
           ))}
         </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Bỏ Qua
        </button>
        <button 
           className="btn-action success" style={{ flex: 1 }} 
           disabled={selectedTargets.length === 0}
           onClick={() => onConfirm({ doUse: true, targets: selectedTargets })}
        >
          Rút Trộm
        </button>
      </div>
    </div>
  );
}
