// @ts-nocheck
import React from 'react';
import { getFullPlayerName } from 'shared/utils/playerHelpers';
import { getSuitEmoji } from 'shared/constants/cardTypes';
import { CardSelector } from './CardSelector';
import { getEffectiveSuit, getEffectiveColor } from 'shared/engine_v4/heroes/HeroRegistry.js';

export function HoaCongDiscardModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === (req.responderId ?? req.sourceId ?? (typeof window !== 'undefined' ? window.playerId : 0))) || gameState.players[0];
  const target = gameState.players.find(p => p.id === req.targetId);

  const revealedCard = req.revealedCard;
  const revSuit = revealedCard ? (getEffectiveSuit(target, revealedCard) || revealedCard.suit) : null;
  const suitEmoji = revSuit ? getSuitEmoji(revSuit) : (revealedCard ? getSuitEmoji(revealedCard.suit) : '');
  const suitText = revealedCard ? `${revealedCard.name || ''} ${suitEmoji}${revealedCard.rank || ''}` : '';

  // Chỉ những lá bài cùng chất hiệu dụng (effective suit) mới hợp lệ để bỏ
  const validCards = (me.hand || []).map((c, idx) => ({ ...c, idx })).filter(c => {
    if (!revealedCard || !revSuit) return true;
    const mySuit = getEffectiveSuit(me, c) || c.suit;
    return mySuit && mySuit.toString().toLowerCase() === revSuit.toString().toLowerCase();
  });

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#ef4444', fontWeight: 'bold' }}>
        🔥 HỎA CÔNG - KÍCH HỎA
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        {target?.name} đã để lộ lá bài: <strong style={{ color: revealedCard?.color === 'red' ? '#ef4444' : '#9ca3af' }}>[{suitText}]</strong><br/>
        Bạn có muốn bỏ 1 lá bài <strong>cùng chất {suitEmoji}</strong> để gây 1 sát thương Hỏa không?
      </div>

      <CardSelector 
        validCards={validCards}
        confirmText="🔥 Bỏ bài kích hỏa"
        cancelText="⏭️ Bỏ qua"
        onSelect={(idx) => onConfirm({ doReact: true, cardId: me.hand[idx].id, card: me.hand[idx] })}
        onCancel={() => onConfirm({ doReact: false })}
      />
    </div>
  );
}
