import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from 'shared/utils/playerHelpers';

import { CardSelector } from './CardSelector';
import { hasSkill, hasSkillEvenIfHidden } from 'shared/engine/gameState';

export function DodgeModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === (typeof window !== 'undefined' ? window.playerId : 0)) || gameState.players[0];
  const source = gameState.players.find(p => p.id === req.sourceId);
  
  const hasPassiveBagua = hasSkill(me, 'than-giap') && !me.equipment.some(c => c.name === 'Bát Quái' || c.name === 'Hắc Thuẫn');
  const hasBagua = hasPassiveBagua || me.equipment.some(e => e.name === 'Bát Quái');
  const canBagua = hasBagua && req.baguaAvailable !== false;
  
  const hasDoiNui = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'doi-nui');
  const hasThinhChinh = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'thinh-chinh');
  
  const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
     if (c.name === 'Né') return true;
     if (hasDoiNui && c.name === 'Chém') return true;
     if (hasThinhChinh && c.color === 'black') return true;
     return false;
  }).map(c => ({
     ...c,
     virtualReason: c.name === 'Chém' && hasDoiNui ? 'Dời Núi' : (c.name !== 'Né' && hasThinhChinh && c.color === 'black' ? 'Nhiếp Chính' : null)
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
            req.reqDodges > 1 ? <span style={{ color: '#ef4444' }}>[Phá Quân] Yêu cầu: Bạn cần đánh ra {req.reqDodges} lá [Né] để tránh đòn.</span> : "Chọn 1 lá [Né] trên tay để tránh đòn."
        )}
      </div>


      <CardSelector 
        validCards={validCards}
        confirmText="💨 Đánh Né"
        cancelText="😤 Chịu đấm"
        onSelect={(idx) => {
           const c = me.hand[idx];
            if (c.name === 'Chém' && hasDoiNui) {
              onConfirm({ doReact: true, virtualCardName: 'Né', activeSkill: 'doi-nui', cardIndexSelected: idx, cardId: c.id });
            } else if (c.name !== 'Né' && c.color === 'black' && hasThinhChinh) {
              onConfirm({ doReact: true, virtualCardName: 'Né', activeSkill: 'thinh-chinh', cardIndexSelected: idx, cardId: c.id });
            } else {
              onConfirm({ doReact: true, cardIndexSelected: idx, cardId: c.id });
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
            {hasSkill(me, 'ho-gia') && me.isLord && (
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
