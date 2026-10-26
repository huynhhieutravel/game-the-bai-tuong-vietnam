import React, { useState } from 'react';
import { getSuitEmoji } from 'shared/constants/cardTypes';
import { getFullPlayerName } from 'shared/utils/playerHelpers';

export function DuongQuanModal({ req, gameState, onConfirm }) {
  const me = gameState?.players?.find(p => p.id === req.responderId) ||
             gameState?.players?.find(p => p.id === req.sourceId) ||
             gameState?.players?.[0];

  const validTargets = (req.validTargets && req.validTargets.length > 0)
    ? (gameState?.players || []).filter(p => req.validTargets.includes(p.id) && p.isAlive)
    : (gameState?.players || []).filter(p => p.id !== me?.id && p.isAlive);

  // Equipments that can be discarded for Option 2 (from hand or equipped)
  const myEquips = [
    ...(me?.hand ? me.hand.filter(c => c.type === 'equip' || c.type === 'EQUIP') : []),
    ...(me?.equipment ? (Array.isArray(me.equipment) ? me.equipment.filter(Boolean) : Object.values(me.equipment).filter(Boolean)) : [])
  ];

  const reqType = req?.type;
  const isOpt1 = reqType === 'ask_duong_quan_1' || (reqType === 'ask_duong_quan' && gameState?.currentPhase === 'BEGIN');
  const isOpt3 = reqType === 'ask_duong_quan_3' || (reqType === 'ask_duong_quan' && gameState?.currentPhase === 'DISCARD');

  const [selectedTarget, setSelectedTarget] = useState(validTargets[0]?.id !== undefined ? String(validTargets[0].id) : '');
  const [selectedEquip, setSelectedEquip] = useState(myEquips[0]?.id !== undefined ? String(myEquips[0].id) : '');

  // Render Option 1: Giai đoạn bắt đầu (Begin Phase)
  if (isOpt1) {
    return (
      <div style={{ textAlign: 'center', minWidth: '360px', maxWidth: '440px', padding: '10px' }}>
        <div style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#10b981', fontWeight: 'bold' }}>
          ⚡ DƯỠNG QUÂN (Pha Bắt Đầu)
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          Bạn có muốn <strong>bỏ qua Pha Phán xét và Pha Rút bài</strong> để lập tức tung đòn <strong>[Chém]</strong> không giới hạn cự ly vào 1 mục tiêu?
        </div>

        <div style={{ marginBottom: '16px', textAlign: 'left' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
            Chọn mục tiêu Chém:
          </label>
          <select 
            value={selectedTarget} 
            onChange={e => setSelectedTarget(e.target.value)} 
            style={{ padding: '8px 10px', width: '100%', borderRadius: '4px', background: '#1f2937', color: 'white', border: '1px solid #374151', fontSize: '0.9rem' }}
          >
            <option value="">-- Chọn mục tiêu --</option>
            {validTargets.map(p => (
              <option key={p.id} value={p.id}>
                {getFullPlayerName(p, me?.id)} ({p.hp}/{p.maxHp} HP)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-action secondary" 
            style={{ flex: 1 }} 
            onClick={() => onConfirm({ doUse: false })}
          >
            Bỏ qua (Rút bài)
          </button>
          <button 
            className="btn-action success" 
            style={{ flex: 1.2, fontWeight: 'bold' }} 
            disabled={!selectedTarget} 
            onClick={() => onConfirm({ doUse: true, targetId: parseInt(selectedTarget, 10) })}
          >
            ⚡ Xác nhận Chém
          </button>
        </div>
      </div>
    );
  }

  // Render Option 3: Giai đoạn bỏ bài (Discard Phase)
  if (isOpt3) {
    return (
      <div style={{ textAlign: 'center', minWidth: '360px', maxWidth: '440px', padding: '10px' }}>
        <div style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#10b981', fontWeight: 'bold' }}>
          ⚡ DƯỠNG QUÂN (Pha Bỏ Bài)
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          Bạn có muốn <strong>tự lật úp mặt tướng</strong> để <strong>bỏ qua Pha Bỏ bài</strong> và Chém không giới hạn cự ly vào 1 mục tiêu?
        </div>

        <div style={{ marginBottom: '16px', textAlign: 'left' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
            Chọn mục tiêu Chém:
          </label>
          <select 
            value={selectedTarget} 
            onChange={e => setSelectedTarget(e.target.value)} 
            style={{ padding: '8px 10px', width: '100%', borderRadius: '4px', background: '#1f2937', color: 'white', border: '1px solid #374151', fontSize: '0.9rem' }}
          >
            <option value="">-- Chọn mục tiêu --</option>
            {validTargets.map(p => (
              <option key={p.id} value={p.id}>
                {getFullPlayerName(p, me?.id)} ({p.hp}/{p.maxHp} HP)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-action secondary" 
            style={{ flex: 1 }} 
            onClick={() => onConfirm({ doUse: false })}
          >
            Bỏ qua (Bỏ bài)
          </button>
          <button 
            className="btn-action success" 
            style={{ flex: 1.2, fontWeight: 'bold' }} 
            disabled={!selectedTarget} 
            onClick={() => onConfirm({ doUse: true, targetId: parseInt(selectedTarget, 10) })}
          >
            ⚡ Lật úp & Chém
          </button>
        </div>
      </div>
    );
  }

  // Render Option 2: Giai đoạn ra bài (Action Phase)
  return (
    <div style={{ textAlign: 'center', minWidth: '360px', maxWidth: '440px', padding: '10px' }}>
      <div style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#10b981', fontWeight: 'bold' }}>
        ⚡ DƯỠNG QUÂN (Pha Ra Bài)
      </div>
      <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
        Bỏ 1 trang bị để Chém không giới hạn cự ly.<br/>
        <span style={{ color: '#f87171', fontSize: '0.8rem' }}>⚠️ Lưu ý: Pha Ra bài sẽ kết thúc ngay sau đòn Chém này!</span>
      </div>

      <div style={{ marginBottom: '12px', textAlign: 'left' }}>
        <label style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
          Chọn Trang bị để bỏ:
        </label>
        <select 
          value={selectedEquip} 
          onChange={e => setSelectedEquip(e.target.value)} 
          style={{ padding: '8px 10px', width: '100%', borderRadius: '4px', background: '#1f2937', color: 'white', border: '1px solid #374151', fontSize: '0.9rem' }}
        >
          <option value="">-- Chọn Trang Bị --</option>
          {myEquips.map(eq => (
            <option key={eq.id} value={eq.id}>
              {eq.name} ({getSuitEmoji(eq.suit)}{eq.rank})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px', textAlign: 'left' }}>
        <label style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
          Chọn mục tiêu Chém:
        </label>
        <select 
          value={selectedTarget} 
          onChange={e => setSelectedTarget(e.target.value)} 
          style={{ padding: '8px 10px', width: '100%', borderRadius: '4px', background: '#1f2937', color: 'white', border: '1px solid #374151', fontSize: '0.9rem' }}
        >
          <option value="">-- Chọn mục tiêu --</option>
          {validTargets.map(p => (
            <option key={p.id} value={p.id}>
              {getFullPlayerName(p, me?.id)} ({p.hp}/{p.maxHp} HP)
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          className="btn-action secondary" 
          style={{ flex: 1 }} 
          onClick={() => onConfirm({ canceled: true })}
        >
          Hủy bỏ
        </button>
        <button 
          className="btn-action success" 
          style={{ flex: 1.2, fontWeight: 'bold' }} 
          disabled={!selectedTarget || !selectedEquip} 
          onClick={() => onConfirm({ targetId: parseInt(selectedTarget, 10), cardId: selectedEquip, doUse: true })}
        >
          ⚡ Chém & Kết thúc
        </button>
      </div>
    </div>
  );
}
