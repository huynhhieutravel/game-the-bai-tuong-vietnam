import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr } from '../../utils/playerHelpers';

export function ChuongDuongModal({ req, gameState, onConfirm }) {
  const [selectedReceiver, setSelectedReceiver] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  
  const me = gameState.players[req.sourceId];
  const target = gameState.players[req.targetId];
  
  // Lấy các mục tiêu hợp lệ để nhận bài (có thể là bất kỳ ai, kể cả Trần Quang Khải, trừ target)
  const validReceivers = gameState.players.filter(p => p.id !== target.id && p.isAlive);
  
  const targetCards = [
      ...target.hand.map(c => ({ ...c, zone: 'hand', label: 'Bí mật (Trên tay)' })),
      ...target.equipment.filter(e => e !== null).map(e => ({ ...e, zone: 'equipment', label: `${e.name} (Trang bị)` }))
  ];

  const handleConfirm = () => {
      onConfirm({ doUse: true, receiverId: parseInt(selectedReceiver), cardId: selectedCardId });
  };

  return (
    <div style={{ textAlign: 'left', minWidth: '400px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>
        ⭐ CHƯƠNG DƯƠNG
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px', textAlign: 'center' }}>
        Ép <strong>{target.name}</strong> chuyển 1 lá bài cho người khác!
      </div>
      
      <div style={{ padding: '10px', border: '1px solid #374151', borderRadius: '4px', marginBottom: '10px', background: 'rgba(212, 168, 67, 0.1)' }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-gold)' }}>
              1. Chọn lá bài của {target.name}:
          </div>
          <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} style={{ padding: '5px', width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151' }}>
              <option value="">-- Chọn bài --</option>
              {targetCards.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
      </div>

      <div style={{ padding: '10px', border: '1px solid #374151', borderRadius: '4px', marginBottom: '15px', background: 'rgba(212, 168, 67, 0.1)' }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-gold)' }}>
              2. Chọn người nhận:
          </div>
          <select value={selectedReceiver} onChange={e => setSelectedReceiver(e.target.value)} style={{ padding: '5px', width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151' }}>
              <option value="">-- Chọn người nhận --</option>
              {validReceivers.map(p => <option key={p.id} value={p.id}>{p.name} {getHeroNameStr(p)}</option>)}
          </select>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Bỏ Qua
        </button>
        <button className="btn-action success" style={{ flex: 1 }} disabled={!selectedCardId || !selectedReceiver} onClick={handleConfirm}>
          Xác Nhận
        </button>
      </div>
    </div>
  );
}
