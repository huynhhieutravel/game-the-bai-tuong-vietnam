import React, { useState } from 'react';
import { getSuitEmoji } from 'shared/constants/cardTypes';
import { getFullPlayerName, getHeroNameStr } from 'shared/utils/playerHelpers';

export function VanDonModal({ req, gameState, onConfirm }) {
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);

  const me = gameState?.players?.find(p => p.id === (req.responderId ?? req.sourceId));
  const isInitiator = me?.id === req.sourceId;
  const opponentId = isInitiator ? req.targetId : req.sourceId;
  const opponent = gameState?.players?.find(p => p.id === opponentId);
  const handCards = me?.hand || [];

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#f59e0b', fontWeight: 'bold' }}>
        🌊 VÂN ĐỒN (Đấu Điểm)
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        {isInitiator ? (
          <span>
            Bạn phát động Đấu Điểm với <strong>{getFullPlayerName(opponent, me?.id)}</strong> ({getHeroNameStr(opponent)})!
            <br />
            Thắng: Thêm 1 lần [Chém] vô hạn cự ly và chọn 2 mục tiêu.
            <br />
            Thua/Hòa: Bị cấm [Chém] lượt này.
          </span>
        ) : (
          <span>
            <strong>{getFullPlayerName(opponent, me?.id)}</strong> ({getHeroNameStr(opponent)}) phát động Đấu Điểm với bạn!
            <br />
            Chọn 1 lá bài trên tay để đọ điểm (Lá bài có điểm cao hơn sẽ thắng).
          </span>
        )}
      </div>

      <div style={{ textAlign: 'left', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>
        Chọn lá bài để Đấu Điểm:
      </div>
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
        {handCards.length === 0 && <div style={{ color: 'gray' }}>Không có bài trên tay!</div>}
        {handCards.map((c, i) => (
          <div
            key={c.id || i}
            onClick={() => setSelectedCardIdx(i)}
            style={{
              padding: '6px 10px',
              border: selectedCardIdx === i ? '2px solid var(--color-gold)' : '1px solid #374151',
              borderRadius: '6px',
              background: selectedCardIdx === i ? 'rgba(212, 168, 67, 0.25)' : '#1f2937',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: c.color === 'red' ? '#ef4444' : '#f1f5f9' }}>
              {getSuitEmoji(c.suit)}{c.rank}
            </div>
            <div style={{ fontSize: '0.85rem' }}>{c.name}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        {isInitiator ? (
          <button
            className="btn-action secondary"
            style={{ flex: 1 }}
            onClick={() => onConfirm({ canceled: true })}
          >
            Hủy Đấu
          </button>
        ) : (
          <button
            className="btn-action secondary"
            style={{ flex: 1 }}
            disabled={handCards.length === 0}
            onClick={() => {
              const card = handCards[0];
              onConfirm({
                canceled: false,
                cardId: card?.id,
                cardIndex: 0
              });
            }}
          >
            Ra Lá Đầu
          </button>
        )}
        <button
          className="btn-action success"
          style={{ flex: 1 }}
          disabled={selectedCardIdx === null || handCards.length === 0}
          onClick={() => {
            const card = handCards[selectedCardIdx];
            onConfirm({
              canceled: false,
              cardId: card?.id,
              cardIndex: selectedCardIdx
            });
          }}
        >
          ⚔️ Đấu Điểm
        </button>
      </div>
    </div>
  );
}
