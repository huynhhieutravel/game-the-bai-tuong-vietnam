import React, { useState } from 'react';
import { getHeroNameStr } from 'shared/utils/playerHelpers';
import { CARD_SUBTYPES } from 'shared/constants/cardTypes';
import { getCardSubType } from 'shared/data/gameData';

export function TienPhongModal({ req, gameState, onConfirm }) {
  const [costType, setCostType] = useState(null); // 'hp' or 'weapon'
  
  const me = gameState.players.find(p => p.id === req.sourceId);
  const target = gameState.players.find(p => p.id === req.targetId);
  
  const hasWeapon = me.equipment.some(eq => eq !== null && getCardSubType(eq) === CARD_SUBTYPES.EQUIP_WEAPON);
  const canPayHp = me.hp > 1;

  const handleConfirm = () => {
     onConfirm({ doUse: true, costType, targetId: req.targetId });
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        ⚔️ TIÊN PHONG
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bạn sẽ gây 1 sát thương cho <strong>{target.name}</strong>.<br/> Chọn chi phí để phát động:
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button 
           className={`btn-action ${costType === 'hp' ? 'success' : 'secondary'}`} 
           style={{ flex: 1, opacity: canPayHp ? 1 : 0.5 }}
           disabled={!canPayHp}
           onClick={() => setCostType('hp')}
        >
          🩸 Mất 1 HP
        </button>
        <button 
           className={`btn-action ${costType === 'weapon' ? 'success' : 'secondary'}`} 
           style={{ flex: 1, opacity: hasWeapon ? 1 : 0.5 }}
           disabled={!hasWeapon}
           onClick={() => setCostType('weapon')}
        >
          🗡️ Bỏ 1 Vũ Khí
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Hủy Bỏ
        </button>
        <button className="btn-action success" style={{ flex: 1 }} disabled={!costType} onClick={handleConfirm}>
          Xác Nhận
        </button>
      </div>
    </div>
  );
}
