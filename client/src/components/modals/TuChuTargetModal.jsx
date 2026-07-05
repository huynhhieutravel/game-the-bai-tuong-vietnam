import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr } from '../../utils/playerHelpers';

export function TuChuTargetModal({ req, gameState, onConfirm }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  
  const duelTarget = gameState.players[req.duelTargetId];
  
  // Các mục tiêu nằm trong tầm đánh của duelTarget (không bao gồm chính họ)
  const duelTargetAtkRange = duelTarget.attackRange;
  const validTargets = gameState.players.filter(p => {
      if (!p.isAlive || p.id === duelTarget.id) return false;
      return duelTarget.distances[p.id] <= duelTargetAtkRange;
  });

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        ⚔️ TỰ CHỦ (Chọn Mục Tiêu)
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bạn đã thắng Đấu Điểm! Chọn 1 tướng trong tầm đánh của <strong>{duelTarget.name}</strong> để ép họ gây sát thương.
      </div>
      
      {validTargets.length === 0 ? (
          <div style={{ fontSize: '0.9rem', color: 'var(--color-red-light)', marginBottom: '15px' }}>
              Không có tướng nào nằm trong tầm đánh của {duelTarget.name}.
          </div>
      ) : (
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
                 <span>Khoảng cách: {duelTarget.distances[p.id]}/{duelTargetAtkRange}</span>
               </div>
            ))}
          </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          className="btn-action danger" 
          style={{ flex: 1 }} 
          onClick={() => onConfirm({ canceled: true })}
        >
          Hủy bỏ
        </button>
        <button 
          className="btn-action success" 
          style={{ flex: 1, opacity: selectedTarget !== null ? 1 : 0.5 }} 
          disabled={selectedTarget === null}
          onClick={() => onConfirm({ targetId: selectedTarget })}
        >
          Xác nhận
        </button>
      </div>
    </div>
  );
}
