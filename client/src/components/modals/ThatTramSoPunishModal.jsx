// @ts-nocheck
import React, { useState } from 'react';
import { getSuitEmoji } from 'shared/constants/cardTypes';

export function ThatTramSoPunishModal({ req, gameState, onConfirm }) {
  const me = gameState?.players?.find(p => p.id === req.responderId) || gameState?.players?.[0];
  const [selectedCardIds, setSelectedCardIds] = useState([]);

  const hand = me?.hand || [];
  const canDiscard = hand.length >= 2;

  const toggleSelectCard = (cardId) => {
    setSelectedCardIds(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }
      if (prev.length < 2) {
        return [...prev, cardId];
      }
      // If 2 cards already selected, replace the earliest selected card
      return [prev[1], cardId];
    });
  };

  const handleDiscard = () => {
    if (selectedCardIds.length === 2) {
      onConfirm({
        option: 'discard',
        cardIds: selectedCardIds
      });
    }
  };

  const handleTakeDamage = () => {
    onConfirm({ option: 'damage' });
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '320px', maxWidth: '440px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#ef4444', fontWeight: 'bold' }}>
        ⚖️ HÌNH PHẠT THẤT TRẢM SỚ
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
        Chu Văn An phán xét không phải ♥. Bạn phải chọn một hình phạt:
      </div>

      {canDiscard ? (
        <>
          <div style={{ textAlign: 'left', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-gold)' }}>
            Chọn 2 lá bài trên tay bạn muốn bỏ ({selectedCardIds.length}/2):
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {hand.map((c, i) => {
              const cardId = c.id !== undefined ? c.id : i;
              const isSelected = selectedCardIds.includes(cardId);
              const isRed = c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦';
              return (
                <div
                  key={cardId}
                  onClick={() => toggleSelectCard(cardId)}
                  style={{
                    padding: '8px 10px',
                    border: isSelected ? '2px solid #10b981' : '1px solid #374151',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(16, 185, 129, 0.25)' : '#1f2937',
                    boxShadow: isSelected ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '58px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isRed ? '#ef4444' : '#f1f5f9' }}>
                    {getSuitEmoji(c.suit)} {c.rank}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: isSelected ? 'bold' : 'normal', marginTop: '2px' }}>
                    {c.name}
                  </div>
                  {isSelected && <span style={{ fontSize: '0.65rem', color: '#10b981', marginTop: '2px' }}>✓ Đã chọn</span>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '15px', fontStyle: 'italic' }}>
          (Trên tay không đủ 2 lá bài để chọn bỏ)
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'center' }}>
        <button
          className="btn-action danger"
          onClick={handleTakeDamage}
          style={{ flex: 1 }}
        >
          💥 Nhận 1 Sát Thương
        </button>

        {canDiscard && (
          <button
            className="btn-action success"
            disabled={selectedCardIds.length !== 2}
            onClick={handleDiscard}
            style={{ flex: 1, opacity: selectedCardIds.length === 2 ? 1 : 0.5 }}
          >
            🗑️ Bỏ 2 Lá Đã Chọn ({selectedCardIds.length}/2)
          </button>
        )}
      </div>
    </div>
  );
}
