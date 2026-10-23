// @ts-nocheck
import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from 'shared/utils/playerHelpers';

import { CardSelector } from './CardSelector';

import { hasSkill, hasSkillEvenIfHidden } from 'shared/engine/gameState';

export function TienPhatModal({ req, gameState, onConfirm }) {
  const targetPlayerId = req.responderId ?? req.currentActorId ?? (typeof window !== 'undefined' ? window.playerId : 0);
  const me = gameState.players.find(p => p.id === targetPlayerId) || gameState.players[0];
  const source = gameState.players.find(p => p.id === req.sourceId); // Ly Thuong Kiet
  
  const hasDoiNui = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'doi-nui');
  const hasThinhChinh = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'thinh-chinh');

  const validCards = (me.hand || []).map((c, idx) => ({ ...c, idx })).filter(c => {
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
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#ec4899', fontWeight: 'bold' }}>
        👑 KÍCH HOẠT TIÊN PHÁT
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Chủ công <strong>{getFullPlayerName(source, me.id)}</strong> đang gọi trợ giúp! <br/> Bạn có muốn đánh 1 lá [Né] thay Chủ công không?
      </div>

      <CardSelector 
        validCards={validCards}
        confirmText="💨 Đánh Né giúp"
        cancelText="⏭️ Bỏ qua"
        onSelect={(idx) => {
          const c = me.hand[idx];
          if (c.name === 'Chém' && hasDoiNui) {
            onConfirm({ doReact: true, cardId: c.id, virtualCardName: 'Né', activeSkill: 'doi-nui', dodgeCard: c });
          } else if (c.name !== 'Né' && c.color === 'black' && hasThinhChinh) {
            onConfirm({ doReact: true, cardId: c.id, virtualCardName: 'Né', activeSkill: 'thinh-chinh', dodgeCard: c });
          } else {
            onConfirm({ doReact: true, cardId: c.id, dodgeCard: c });
          }
        }}
        onCancel={() => onConfirm({ doReact: false })}
      />
    </div>
  );
}
