import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';

import { CardSelector } from './CardSelector';

export function DodgeModal({ req, gameState, onConfirm }) {
  const me = gameState.players[0];
  const source = gameState.players[req.sourceId];
  
  const hasPassiveBagua = me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'than-giap')) && !me.equipment.some(c => c.name === 'Bát Quái' || c.name === 'Hắc Thuẫn');
  const hasBagua = hasPassiveBagua || me.equipment.some(e => e.name === 'Bát Quái');
  const canBagua = hasBagua && req.baguaAvailable !== false;
  
  const hasDoiNui = me.heroes?.some((h, i) => me.revealedHeroes?.[i] && h.skills?.some(s => s.id === 'doi-nui'));
  const hasThinhChinh = me.heroes?.some((h, i) => me.revealedHeroes?.[i] && h.skills?.some(s => s.id === 'thinh-chinh'));
  
  const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
     if (c.name === 'Né') return true;
     if (hasDoiNui && c.name === 'Chém') return true;
     if (hasThinhChinh && c.color === 'black') return true;
     return false;
  }).map(c => ({
     ...c,
     virtualReason: c.name === 'Chém' && hasDoiNui ? 'Dời Núi' : (c.name !== 'Né' && hasThinhChinh && c.color === 'black' ? 'Thính Chính' : null)
  }));

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-red-light)' }}>
        ⚔️ Bạn bị {getFullPlayerName(source, me.id)} tấn công!
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        {req.baguaAvailable === false && hasBagua ? (
            <span style={{ color: '#ef4444' }}>Bát Quái đã thất bại! Bạn bắt buộc phải dùng [Né].</span>
        ) : (
            "Chọn 1 lá [Né] trên tay để tránh đòn."
        )}
      </div>


      <CardSelector 
        validCards={validCards}
        confirmText="💨 Đánh Né"
        cancelText="😤 Chịu đấm"
        onSelect={(idx) => {
           const c = me.hand[idx];
           if (c.name === 'Chém' && hasDoiNui) {
              onConfirm({ doReact: true, virtualCardName: 'Né', activeSkill: 'Dời Núi', cardIndexSelected: idx });
           } else if (c.name !== 'Né' && hasThinhChinh && c.color === 'black') {
              onConfirm({ doReact: true, virtualCardName: 'Né', activeSkill: 'Thính Chính', cardIndexSelected: idx });
           } else {
              onConfirm({ doReact: true, cardIndexSelected: idx });
           }
        }}
        onCancel={() => onConfirm({ doReact: false })}
        extraButtons={
          <>
            {canBagua && (
              <button className="btn-action" style={{ backgroundColor: '#8b5cf6', color: '#fff', flex: '1 1 100%' }} onClick={() => onConfirm({ doBagua: true })}>
                ☯️ Dùng Bát Quái
              </button>
            )}
            {me.heroes?.some((h, i) => h.id === 'ly-thuong-kiet') && me.isLord && (
              <button className="btn-action" style={{ backgroundColor: '#ec4899', color: '#fff', flex: '1 1 100%' }} onClick={() => onConfirm({ doTienPhat: true })}>
                👑 Kích Hoạt Tiên Phát
              </button>
            )}
            {me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'ho-gia')) && me.isLord && (
              <button className="btn-action" style={{ backgroundColor: '#f59e0b', color: '#fff', flex: '1 1 100%' }} onClick={() => onConfirm({ doHoGia: true })}>
                👑 Kích Hoạt Hộ Giá
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
