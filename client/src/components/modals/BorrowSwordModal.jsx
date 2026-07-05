import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function BorrowSwordModal({ req, gameState, onConfirm }) {
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  
  const me = gameState.players[0];
  const borrower = gameState.players[req.borrowerId];
  const targetB = gameState.players[req.targetBId];
  
  // Dời Núi (Né -> Chém)
  const hasDoiNui = me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'doi-nui'));
  const hasKhaiThien = me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'khai-thien'));
  const canBocTramTrung = !req.bocTramTrungFailed && me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'boc-tram-trung')) && 
                          gameState.players.some(p => p.id !== me.id && p.isAlive && getPlayerFaction(p) === 'Lạc');

  const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
     if (c.name === 'Chém') return true;
     if (hasDoiNui && c.name === 'Né') return true;
     if (hasKhaiThien && c.color === 'red') return true;
     return false;
  });

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-gold)' }}>
        🗡️ Mượn Đao!
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        {borrower.name} ép bạn phải chém {targetB.name}!<br/>
        Nếu không chém, bạn sẽ phải giao vũ khí của mình cho {borrower.name}.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
        {validCards.map(c => {
           const isSelected = selectedCardIdx === c.idx;
           const isDoiNui = c.name === 'Né';
           const isKhaiThien = c.name !== 'Chém' && c.name !== 'Né';
           return (
             <div 
               key={c.idx} 
               onClick={() => setSelectedCardIdx(isSelected ? null : c.idx)}
               style={{ 
                 padding: '6px', borderRadius: '4px', border: `2px solid ${isSelected ? '#10b981' : '#374151'}`, 
                 background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#1f2937', cursor: 'pointer'
               }}
             >
               <div style={{ fontSize: '0.7rem', color: c.color === 'red' ? '#ef4444' : 'white' }}>{c.suit} {c.rank}</div>
               <div style={{ fontSize: '0.85rem' }}>
                  {c.name} 
                  {isDoiNui && <span style={{fontSize: '0.6rem', color: 'gold'}}><br/>(Dời Núi)</span>}
                  {isKhaiThien && <span style={{fontSize: '0.6rem', color: 'gold'}}><br/>(Khai Thiên)</span>}
               </div>
             </div>
           );
        })}
        {validCards.length === 0 && <div style={{ fontSize: '0.8rem', color: 'gray' }}>Không có bài hợp lệ</div>}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
           className="btn-action primary" 
           style={{ flex: 1 }} 
           disabled={selectedCardIdx === null}
           onClick={() => {
              const c = me.hand[selectedCardIdx];
              let activeSkill = null;
              let virtualCardName = 'Chém';
              if (c.name === 'Né') activeSkill = 'Dời Núi';
              else if (c.name !== 'Chém') activeSkill = 'Khai Thiên';
              
              onConfirm({ doReact: true, virtualCardName, activeSkill, cardIndexSelected: selectedCardIdx });
           }}
        >
          ⚔️ Đánh Chém
        </button>
        {canBocTramTrung && (
          <button className="btn-action success" style={{ flex: '1 1 100%' }} onClick={() => onConfirm({ callBocTramTrung: true })}>
            🐉 Bọc Trăm Trứng (Gọi Lạc)
          </button>
        )}
        <button 
           className="btn-action danger" 
           style={{ flex: 1 }} 
           onClick={() => onConfirm({ doReact: false })}
        >
          🏳️ Giao Vũ Khí
        </button>
      </div>
    </div>
  );
}
