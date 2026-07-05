import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function NamQuocSonHaModal({ req, onConfirm }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        📜 NAM QUỐC SƠN HÀ
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bạn vừa nhận sát thương! Bạn có muốn rút 1 lá bài, rồi thu lấy lá bài gây sát thương đó (nếu có)?
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Bỏ Qua
        </button>
        <button className="btn-action success" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: true })}>
          Sử dụng
        </button>
      </div>
    </div>
  );
}
