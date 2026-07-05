import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function ThuyToModal({ req, gameState, onConfirm }) {
  const [selectedAlly, setSelectedAlly] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  
  const me = gameState.players[0];
  const maxCards = req.maxCards;
  
  // Lọc ra đồng minh đã lộ diện (hoặc đồng minh Dã Tâm nếu mình là Dã Tâm)
  const myFaction = me.isDaTam ? 'DaTam' : (me.heroes?.[0]?.faction || me.hero?.faction);
  const allies = gameState.players.filter(p => {
     if (p.id === 0) return false;
     if (!p.isAlive) return false;
     if (req.targetsUsed?.includes(p.id)) return false; // Đã giao bài trong lượt này rồi
     
     // Thủy Tổ có thể giao bài cho BẤT KỲ NGƯỜI CHƠI NÀO (theo gameData: "mỗi người chơi mỗi lượt một lần, bạn có thể giao cho họ...")
     // Tuy nhiên, logic thường thấy là giao cho đồng minh. Nhưng theo mô tả chính xác: "mỗi người chơi"
     // Vậy không cần check faction hay lộ diện!
     return true;
  });
  
  const toggleCard = (idx) => {
     if (selectedCards.includes(idx)) {
         setSelectedCards(selectedCards.filter(i => i !== idx));
     } else {
         if (selectedCards.length < maxCards) {
             setSelectedCards([...selectedCards, idx]);
         }
     }
  };
  
  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#3b82f6', fontWeight: 'bold' }}>
        🌊 THỦY TỔ
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Chọn 1 người chơi và giao tùy ý số lá bài. Lần đầu giao {'>='} 2 lá bài sẽ được xem như đánh 1 Bài Cơ Bản.
      </div>
      
      {allies.length === 0 ? (
         <div style={{ color: '#ef4444', marginBottom: '15px' }}>Không có mục tiêu hợp lệ!</div>
      ) : (
         <div style={{ marginBottom: '15px' }}>
           <select 
              value={selectedAlly !== null ? selectedAlly : ''} 
              onChange={e => setSelectedAlly(parseInt(e.target.value))}
              style={{ padding: '8px', borderRadius: '4px', background: '#1f2937', color: 'white', border: '1px solid #374151', width: '100%' }}
           >
             <option value="" disabled>-- Chọn Người Chơi --</option>
             {allies.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} {getHeroNameStr(a)}
                </option>
             ))}
           </select>
         </div>
      )}
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
        {me.hand.map((c, idx) => {
           const isSelected = selectedCards.includes(idx);
           return (
             <div 
               key={idx} 
               onClick={() => toggleCard(idx)}
               style={{ 
                 padding: '6px', borderRadius: '4px', border: `2px solid ${isSelected ? '#10b981' : '#374151'}`, 
                 background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#1f2937', cursor: 'pointer',
                 opacity: (!isSelected && selectedCards.length >= maxCards) ? 0.5 : 1
               }}
             >
               <div style={{ fontSize: '0.7rem', color: c.color === 'red' ? '#ef4444' : 'white' }}>{c.suit} {c.rank}</div>
               <div style={{ fontSize: '0.85rem' }}>{c.name}</div>
             </div>
           );
        })}
        {me.hand.length === 0 && <div style={{ fontSize: '0.8rem', color: 'gray' }}>Tay không còn bài</div>}
      </div>
      
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
           style={{ flex: 1 }} 
           disabled={selectedAlly === null || selectedCards.length === 0}
           onClick={() => onConfirm({ selectedAlly, selectedCards })}
        >
          Giao Bài
        </button>
      </div>
    </div>
  );
}
