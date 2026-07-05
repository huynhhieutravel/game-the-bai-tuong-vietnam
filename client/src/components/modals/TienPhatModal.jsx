// @ts-nocheck
import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';

import { CardSelector } from './CardSelector';

export function TienPhatModal({ req, gameState, onConfirm }) {
  const me = gameState.players[req.targetId];
  const source = gameState.players[req.sourceId]; // Ly Thuong Kiet
  
  const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => c.name === 'Né');

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
        onSelect={(idx) => onConfirm({ doReact: true })}
        onCancel={() => onConfirm({ doReact: false })}
      />
    </div>
  );
}
