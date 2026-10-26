import React, { useState } from 'react';
import { getHeroNameStr } from 'shared/utils/playerHelpers';
import { CARD_SUBTYPES, getSuitEmoji } from 'shared/constants/cardTypes';
import { getCardSubType } from 'shared/data/gameData';

export function TienPhongModal({ req, gameState, onConfirm }) {
  const [costType, setCostType] = useState(null); // 'hp' or 'weapon'
  const [selectedWeaponId, setSelectedWeaponId] = useState(null);
  
  const me = gameState.players.find(p => p.id === req.sourceId);
  const target = gameState.players.find(p => p.id === req.targetId);
  
  // Quét vũ khí từ trang bị
  const equippedWeapon = me?.equipment?.weapon || (Array.isArray(me?.equipment) ? me.equipment.find(eq => eq && getCardSubType(eq) === CARD_SUBTYPES.EQUIP_WEAPON) : null);

  // Quét vũ khí từ bài trên tay
  const handWeapons = (me?.hand || []).filter(c => {
    if (!c) return false;
    const subType = getCardSubType(c);
    return subType === CARD_SUBTYPES.EQUIP_WEAPON || c.type === 'weapon' || c.subtype === 'equip_weapon' || c.subType === 'equip_weapon';
  });

  const availableWeapons = [
    ...(equippedWeapon ? [{ ...equippedWeapon, isEquipped: true }] : []),
    ...handWeapons.map(c => ({ ...c, isEquipped: false }))
  ];

  const hasWeapon = availableWeapons.length > 0;
  const canPayHp = me?.hp > 1;
  const activeWeaponId = selectedWeaponId || (availableWeapons.length > 0 ? availableWeapons[0].id : null);

  const handleConfirm = () => {
     onConfirm({ 
       doUse: true, 
       costType, 
       cardId: costType === 'weapon' ? activeWeaponId : undefined,
       targetId: req.targetId 
     });
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>
        ⚔️ TIÊN PHONG
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Bạn sẽ gây 1 sát thương cho <strong>{target?.name}</strong>.<br/> Chọn chi phí để phát động:
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
           onClick={() => {
             setCostType('weapon');
             if (!selectedWeaponId && availableWeapons.length > 0) {
               setSelectedWeaponId(availableWeapons[0].id);
             }
           }}
        >
          🗡️ Bỏ 1 Vũ Khí
        </button>
      </div>

      {costType === 'weapon' && availableWeapons.length > 0 && (
        <div style={{ marginBottom: '15px', textAlign: 'left' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)', marginBottom: '6px' }}>
            {availableWeapons.length > 1 ? 'Chọn lá vũ khí muốn bỏ:' : 'Vũ khí sẽ bỏ:'}
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {availableWeapons.map((w) => {
              const isSelected = activeWeaponId === w.id;
              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWeaponId(w.id)}
                  style={{
                    padding: '6px 10px',
                    border: isSelected ? '2px solid var(--color-gold)' : '1px solid #374151',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(212, 168, 67, 0.25)' : '#1f2937',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ color: w.color === 'red' ? '#ef4444' : '#f1f5f9' }}>
                    {getSuitEmoji(w.suit)}{w.rank || ''}
                  </span>
                  <span>{w.name}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    ({w.isEquipped ? 'Trang bị' : 'Trên tay'})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Hủy Bỏ
        </button>
        <button 
          className="btn-action success" 
          style={{ flex: 1 }} 
          disabled={!costType || (costType === 'weapon' && !activeWeaponId)} 
          onClick={handleConfirm}
        >
          Xác Nhận
        </button>
      </div>
    </div>
  );
}
