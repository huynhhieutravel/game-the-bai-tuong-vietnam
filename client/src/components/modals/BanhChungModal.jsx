import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function BanhChungModal({ req, onConfirm }) {
  const [topCards, setTopCards] = useState(req.viewedCards || []);
  const [bottomCards, setBottomCards] = useState([]);

  const moveToBottom = (card, idx) => {
    const newTop = [...topCards];
    newTop.splice(idx, 1);
    setTopCards(newTop);
    setBottomCards([...bottomCards, card]);
  };

  const moveToTop = (card, idx) => {
    const newBottom = [...bottomCards];
    newBottom.splice(idx, 1);
    setBottomCards(newBottom);
    setTopCards([...topCards, card]);
  };
  
  const moveUp = (idx) => {
    if (idx === 0) return;
    const newTop = [...topCards];
    [newTop[idx - 1], newTop[idx]] = [newTop[idx], newTop[idx - 1]];
    setTopCards(newTop);
  };
  
  const moveDown = (idx) => {
    if (idx === topCards.length - 1) return;
    const newTop = [...topCards];
    [newTop[idx], newTop[idx + 1]] = [newTop[idx + 1], newTop[idx]];
    setTopCards(newTop);
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🍡 BÁNH CHƯNG
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Sắp xếp {req.viewCount} lá bài. Bạn có thể đẩy những lá không cần thiết xuống đáy chồng bài rút.
      </div>
      
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', textAlign: 'left', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', minWidth: '250px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>Nằm Trên Cùng (Thứ tự rút)</h4>
          <div style={{ fontSize: '0.75rem', color: 'gray', marginBottom: '4px' }}>(Lá trên cùng sẽ được rút đầu tiên)</div>
          {topCards.map((c, idx) => (
             <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-card)', padding: '6px', marginBottom: '4px', borderRadius: '4px', border: `1px solid ${c.color === 'red' ? 'var(--color-red-light)' : 'var(--color-text-primary)'}` }}>
               <span style={{ fontSize: '0.8rem', color: c.color === 'red' ? 'var(--color-red-light)' : 'white' }}>{c.suit} {c.rank} {c.name}</span>
               <div style={{ display: 'flex', gap: '4px' }}>
                 <button onClick={() => moveUp(idx)} disabled={idx===0} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>↑</button>
                 <button onClick={() => moveDown(idx)} disabled={idx===topCards.length-1} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>↓</button>
                 <button onClick={() => moveToBottom(c, idx)} style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#4b5563', color: 'white', border: 'none' }}>Đáy ⬇</button>
               </div>
             </div>
          ))}
          {topCards.length === 0 && <div style={{ fontSize: '0.8rem', color: 'gray', fontStyle: 'italic' }}>Không có lá nào</div>}
        </div>
        
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'gray', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>Bỏ Xuống Đáy</h4>
          {bottomCards.map((c, idx) => (
             <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-card)', padding: '6px', marginBottom: '4px', borderRadius: '4px', border: `1px dashed ${c.color === 'red' ? 'var(--color-red-light)' : 'var(--color-text-primary)'}` }}>
               <span style={{ fontSize: '0.8rem', color: c.color === 'red' ? 'var(--color-red-light)' : 'white', opacity: 0.7 }}>{c.suit} {c.rank} {c.name}</span>
               <button onClick={() => moveToTop(c, idx)} style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#10b981', color: 'white', border: 'none' }}>⬆ Lên Đầu</button>
             </div>
          ))}
          {bottomCards.length === 0 && <div style={{ fontSize: '0.8rem', color: 'gray', fontStyle: 'italic' }}>Không có lá nào</div>}
        </div>
      </div>
      
      <button className="btn-action success" style={{ marginTop: '20px', width: '100%', padding: '10px', fontSize: '1rem' }} onClick={() => onConfirm({ orderedCards: true, deckTop: topCards, deckBottom: bottomCards })}>
        ✅ XONG
      </button>
    </div>
  );
}
