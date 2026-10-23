import { getSuitEmoji } from 'shared/constants/cardTypes';
import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from 'shared/utils/playerHelpers';
import { hasSkill, hasSkillEvenIfHidden } from 'shared/engine/gameState';


export function AskBocTramTrungSlashModal({ req, gameState, onConfirm }) {
   const me = gameState.players.find(p => p.id === (req.responderId ?? req.currentActorId ?? (typeof window !== 'undefined' ? window.playerId : 0))) || gameState.players[0];
   const llq = gameState.players.find(p => p.id === req.sourceId);
   const target = req.targetId ? gameState.players.find(p => p.id === req.targetId) : null;
   
   const [selectedCardIdx, setSelectedCardIdx] = useState(null);
   const expectedCard = 'Chém';
   
   const hasDoiNui = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'doi-nui');
   const hasKhaiThien = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'khai-thien');
   const isQuyetDau = req.originalReq?.reason === 'quyet-dau';
   
   const slashes = me.hand.map((c, i) => ({...c, index: i})).filter(c => {
       if (c.name === 'Chém') return true;
       if (hasDoiNui && c.name === 'Né') return true;
       if (hasKhaiThien && c.color === 'red') return true;
       return false;
   }).map(c => ({
      ...c,
      virtualReason: c.name !== expectedCard ? (
         (hasDoiNui && c.name === 'Né') ? 'Dời Núi' :
         (hasKhaiThien && c.color === 'red') ? 'Khai Thiên' : null
      ) : null
   }));
   
   return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🐉 BỌC TRĂM TRỨNG
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        {req.isDefensive ? (
           <>{llq.name} đang gọi đồng minh giúp đỡ để đánh ra 1 [Chém] phòng thủ!</>
        ) : (
           <>{llq.name} muốn chém {target?.name}. Bạn có muốn đánh [Chém] thay không?</>
        )}
      </div>
      
      {slashes.length === 0 ? (
         <div style={{ color: '#ef4444', marginBottom: '15px' }}>Bạn không có lá [Chém] nào!</div>
      ) : (
         <div style={{ marginBottom: '15px' }}>
           <select 
              value={selectedCardIdx !== null ? selectedCardIdx : ''} 
              onChange={e => setSelectedCardIdx(parseInt(e.target.value))}
              style={{ padding: '8px', borderRadius: '4px', background: '#1f2937', color: 'white', border: '1px solid #374151', width: '100%' }}
           >
             <option value="" disabled>-- Chọn lá Chém --</option>
             {slashes.map(c => (
                <option key={c.index} value={c.index}>{c.name} {getSuitEmoji(c.suit)}{c.rank} {c.virtualReason ? `(${c.virtualReason})` : ''}</option>
             ))}
           </select>
         </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
           className="btn-action danger" 
           style={{ flex: 1 }} 
           onClick={() => onConfirm({ doProvide: false })}
        >
          Từ chối
        </button>
        <button 
           className="btn-action success" 
           style={{ flex: 1 }} 
           disabled={selectedCardIdx === null}
           onClick={() => {
              const idx = selectedCardIdx;
              const c = me.hand[idx];
              if (c.name !== expectedCard) {
                  let activeSkill = 'khai-thien';
                  if (c.name === 'Né' && isQuyetDau && hasDoiNui) activeSkill = 'doi-nui';
                  onConfirm({ doProvide: true, virtualCardName: expectedCard, activeSkill, cardIndexSelected: idx, cardId: c.id });
              } else {
                  onConfirm({ doProvide: true, cardIndexSelected: idx, cardId: c.id });
              }
           }}
        >
          Giúp đỡ
        </button>
      </div>
    </div>
   );
}
