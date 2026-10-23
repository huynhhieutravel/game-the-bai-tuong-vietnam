// @ts-nocheck
import React from 'react';
import { getFullPlayerName } from 'shared/utils/playerHelpers';
import { CardSelector } from './CardSelector';

export function HoaCongRevealModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === (req.responderId ?? req.targetId ?? (typeof window !== 'undefined' ? window.playerId : 0))) || gameState.players[0];
  const source = gameState.players.find(p => p.id === req.sourceId);

  const validCards = (me.hand || []).map((c, idx) => ({ ...c, idx }));

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#f97316', fontWeight: 'bold' }}>
        🔥 HỎA CÔNG
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        <strong>{getFullPlayerName(source, me.id)}</strong> dùng [Hỏa Công] lên bạn!<br/>
        Hãy chọn 1 lá bài trên tay để để lộ cho đối phương xem:
      </div>

      <CardSelector 
        validCards={validCards}
        confirmText="👁️ Để lộ bài"
        cancelText="Tự động chọn"
        onSelect={(idx) => onConfirm({ doReact: true, cardId: me.hand[idx].id, card: me.hand[idx] })}
        onCancel={() => onConfirm({ doReact: false })}
      />
    </div>
  );
}
