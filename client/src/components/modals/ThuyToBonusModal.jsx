// @ts-nocheck
import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function ThuyToBonusModal({ req, gameState, onConfirm }) {
   const [selectedAction, setSelectedAction] = useState('Chém');
   const [targetId, setTargetId] = useState('');
   
   const me = gameState.players[0];
   
   // Dùng try-catch để an toàn khi canAttack chưa load đúng
   let allOtherPlayers = gameState.players.filter(p => p.id !== 0 && p.isAlive);
   if (selectedAction === 'Chém') {
       allOtherPlayers = allOtherPlayers.filter(p => {
           try {
               // Check distance & range
               const dist = p.distanceFromMe;
               const range = me.attackRange;
               return dist <= range;
           } catch(e) { return true; }
       });
   }
   
   return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#3b82f6', fontWeight: 'bold' }}>
        🌊 THỦY TỔ (THƯỞNG)
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bạn vừa giao từ 2 lá trở lên. Bạn được quyền đánh ngay 1 Bài Cơ Bản!
      </div>
      
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
         <button className={`btn-action ${selectedAction === 'Chém' ? 'primary' : 'secondary'}`} onClick={() => { setSelectedAction('Chém'); setTargetId(''); }}>⚔️ Chém</button>
         <button className={`btn-action ${selectedAction === 'Đào' ? 'primary' : 'secondary'}`} onClick={() => setSelectedAction('Đào')}>🍑 Đào</button>
         <button className={`btn-action ${selectedAction === 'Rượu' ? 'primary' : 'secondary'}`} onClick={() => setSelectedAction('Rượu')}>🍶 Rượu</button>
      </div>
      
      {selectedAction === 'Chém' && (
         <div style={{ marginBottom: '15px' }}>
           <select 
              value={targetId} 
              onChange={e => setTargetId(parseInt(e.target.value))}
              style={{ padding: '8px', borderRadius: '4px', background: '#1f2937', color: 'white', border: '1px solid #374151', width: '100%' }}
           >
             <option value="" disabled>-- Chọn Mục Tiêu --</option>
             {allOtherPlayers.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} {getHeroNameStr(a)}
                </option>
             ))}
           </select>
         </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
           className="btn-action danger" 
           style={{ flex: 1 }} 
           onClick={() => onConfirm({ canceled: true })}
        >
          Bỏ Qua
        </button>
        <button 
           className="btn-action success" 
           style={{ flex: 1 }} 
           disabled={selectedAction === 'Chém' && targetId === ''}
           onClick={() => onConfirm({ virtualCardName: selectedAction, targetId: selectedAction === 'Chém' ? parseInt(targetId) : null })}
        >
          Sử dụng
        </button>
      </div>
    </div>
   );
}
