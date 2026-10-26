// @ts-check
import React, { useState } from 'react';
import { CardSelector } from './CardSelector';
import { getFullPlayerName } from 'shared/utils/playerHelpers';

/**
 * Modal Dâng Bài Cho Đinh Điền (Kỹ năng Định Quốc - Phe Sơn)
 * @param {{ req: any, gameState: any, me: any, onConfirm: (payload: any) => void }} props
 */
export function DinhQuocModal({ req, gameState, me, onConfirm }) {
  const dinhDien = gameState.players.find(p => p.id === req.sourceId) || { name: 'Định Quốc Công Đinh Điền' };
  const dinhDienName = getFullPlayerName(dinhDien, me?.id);

  const validCards = (me?.hand || [])
    .map((c, idx) => ({ ...c, idx }))
    .filter(c => c.name === 'Né' || c.type === 'dodge' || c.name === 'Sấm Sét' || c.idKey === 'sam_set');

  return (
    <div style={{ textAlign: 'center', minWidth: '320px', maxWidth: '420px' }}>
      <div style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--color-gold)', fontWeight: 'bold' }}>
        👑 KÊU GỌI ĐỊNH QUỐC
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
        Đồng minh <strong style={{ color: '#fef08a' }}>{dinhDienName}</strong> phát động kỹ năng <strong style={{ color: 'var(--color-gold)' }}>[Định Quốc]</strong>, kêu gọi bạn dâng tặng 1 lá <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>[Né]</span> hoặc <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>[Sấm Sét]</span>!
      </div>

      <CardSelector
        validCards={validCards}
        confirmText="Dâng Bài"
        cancelText="Từ Chối"
        onSelect={(selectedIdx) => {
          const card = validCards.find(c => c.idx === selectedIdx);
          if (card) {
            onConfirm({ doReact: true, cardId: card.id, cardIndex: card.idx });
          }
        }}
        onCancel={() => onConfirm({ doReact: false, cancel: true })}
      />
    </div>
  );
}
export default DinhQuocModal;
