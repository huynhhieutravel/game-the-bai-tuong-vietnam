// @ts-nocheck
import React, { useState } from 'react';
import { CardSelector } from './CardSelector';

export function DoatSaoModal({ req, gameState, onConfirm }) {
  const me = gameState.players[req.sourceId];

  if (req.type === 'ask_doat_sao') {
      return (
        <div style={{ textAlign: 'center', minWidth: '350px' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
            📜 ĐOẠT SÁO
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
            Trong giai đoạn Kết thúc, bạn có muốn lật mặt tướng và rút 4 lá bài không?
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
              Bỏ qua
            </button>
            <button className="btn-action success" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: true })}>
              Đoạt Sáo
            </button>
          </div>
        </div>
      );
  }
  
  if (req.type === 'ask_doat_sao_discard') {
      const validCards = me.hand.map((c, idx) => ({ ...c, idx }));
      
      return (
        <div style={{ textAlign: 'center', minWidth: '350px' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
            📜 ĐOẠT SÁO (Bỏ bài)
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
            Hãy chọn 1 lá bài trên tay để bỏ. Nếu là Trang bị, bạn sẽ tự động sử dụng nó.
          </div>
          
          <CardSelector 
            validCards={validCards}
            confirmText="Bỏ lá này"
            cancelText="Bỏ qua"
            onSelect={(idx) => onConfirm({ cardId: me.hand[idx].id })}
            onCancel={() => {}} // Not allowed to cancel at this point
            disableCancel={true}
          />
        </div>
      );
  }

  return null;
}
