import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function KhoiNghiaModal({ req, onConfirm }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        🔥 KHỞI NGHĨA
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Rút ít hơn 1 lá bài (chỉ bốc 1 lá). Trong lượt này, [Chém] và [Quyết Đấu] của bạn gây thêm 1 điểm sát thương!
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Bỏ Qua (Bốc 2)
        </button>
        <button className="btn-action success" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: true })}>
          Khởi Nghĩa (Bốc 1)
        </button>
      </div>
    </div>
  );
}
