import React from 'react';
import { getFullPlayerName } from 'shared/utils/playerHelpers';

export function HoaTienModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === req.responderId);

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#10b981', fontWeight: 'bold' }}>
        🌟 HÓA TIÊN
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bạn đang trong trạng thái Hấp hối! Bạn có muốn phát động [Hóa Tiên] không?<br/>
        (Bỏ toàn bộ bài, đưa tướng về trạng thái ban đầu, hồi phục Sinh lực đến 3 và rút 3 lá bài)
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
           className="btn-action danger" 
           style={{ flex: 1 }} 
           onClick={() => onConfirm({ doReact: false })}
        >
          Từ chối
        </button>
        <button 
           className="btn-action success" 
           style={{ flex: 1 }} 
           onClick={() => onConfirm({ doReact: true, skillId: 'hoa-tien' })}
        >
          Kích hoạt
        </button>
      </div>
    </div>
  );
}
