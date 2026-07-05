import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr } from '../../utils/playerHelpers';

export function DuongQuanModal({ req, gameState, onConfirm }) {
  const me = gameState.players[req.sourceId];
  const validTargets = gameState.players.filter(p => p.id !== me.id && p.isAlive);
  
  // Equipments that can be discarded for Option 2
  const myEquips = me.equipment ? Object.values(me.equipment).filter(c => c !== null) : [];

  const [opt1, setOpt1] = useState(false);
  const [opt1Target, setOpt1Target] = useState('');
  
  const [opt2, setOpt2] = useState(false);
  const [opt2Target, setOpt2Target] = useState('');
  const [opt2Equip, setOpt2Equip] = useState('');
  
  const [opt3, setOpt3] = useState(false);
  const [opt3Target, setOpt3Target] = useState('');

  const handleConfirm = () => {
      const choices = [];
      if (opt1) choices.push({ type: 'opt1', targetId: parseInt(opt1Target) });
      if (opt2) choices.push({ type: 'opt2', targetId: parseInt(opt2Target), equipId: opt2Equip });
      if (opt3) choices.push({ type: 'opt3', targetId: parseInt(opt3Target) });
      
      onConfirm({ doUse: choices.length > 0, choices });
  };

  const isConfirmDisabled = () => {
      if (!opt1 && !opt2 && !opt3) return false; // Can confirm without using skill
      if (opt1 && !opt1Target) return true;
      if (opt2 && (!opt2Target || !opt2Equip)) return true;
      if (opt3 && !opt3Target) return true;
      return false;
  };

  return (
    <div style={{ textAlign: 'left', minWidth: '400px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>
        💪 DƯỠNG QUÂN
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px', textAlign: 'center' }}>
        Chọn 1 hoặc nhiều lựa chọn để đổi lấy lá [Chém] ảo không cự ly!
      </div>
      
      {/* Lựa chọn 1 */}
      <div style={{ padding: '10px', border: '1px solid #374151', borderRadius: '4px', marginBottom: '10px', background: opt1 ? 'rgba(212, 168, 67, 0.1)' : 'transparent' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-gold)' }}>
              <input type="checkbox" checked={opt1} onChange={e => setOpt1(e.target.checked)} style={{ marginRight: '10px' }} />
              1. Bỏ qua Rút Bài & Phán Xét
          </label>
          {opt1 && (
              <div style={{ marginTop: '10px', paddingLeft: '25px' }}>
                  <select value={opt1Target} onChange={e => setOpt1Target(e.target.value)} style={{ padding: '5px', width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151' }}>
                      <option value="">-- Chọn mục tiêu [Chém] --</option>
                      {validTargets.map(p => <option key={p.id} value={p.id}>{p.name} {getHeroNameStr(p)}</option>)}
                  </select>
              </div>
          )}
      </div>

      {/* Lựa chọn 2 */}
      <div style={{ padding: '10px', border: '1px solid #374151', borderRadius: '4px', marginBottom: '10px', background: opt2 ? 'rgba(212, 168, 67, 0.1)' : 'transparent', opacity: myEquips.length === 0 ? 0.5 : 1 }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: myEquips.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: 'var(--color-gold)' }}>
              <input type="checkbox" disabled={myEquips.length === 0} checked={opt2} onChange={e => setOpt2(e.target.checked)} style={{ marginRight: '10px' }} />
              2. Bỏ qua Hành Động & Bỏ 1 Trang Bị
          </label>
          {opt2 && (
              <div style={{ marginTop: '10px', paddingLeft: '25px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <select value={opt2Equip} onChange={e => setOpt2Equip(e.target.value)} style={{ padding: '5px', width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151' }}>
                      <option value="">-- Chọn Trang Bị để bỏ --</option>
                      {myEquips.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.suit}{eq.rank})</option>)}
                  </select>
                  <select value={opt2Target} onChange={e => setOpt2Target(e.target.value)} style={{ padding: '5px', width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151' }}>
                      <option value="">-- Chọn mục tiêu [Chém] --</option>
                      {validTargets.map(p => <option key={p.id} value={p.id}>{p.name} {getHeroNameStr(p)}</option>)}
                  </select>
              </div>
          )}
      </div>

      {/* Lựa chọn 3 */}
      <div style={{ padding: '10px', border: '1px solid #374151', borderRadius: '4px', marginBottom: '15px', background: opt3 ? 'rgba(212, 168, 67, 0.1)' : 'transparent' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-gold)' }}>
              <input type="checkbox" checked={opt3} onChange={e => setOpt3(e.target.checked)} style={{ marginRight: '10px' }} />
              3. Bỏ qua Bỏ Bài & Lật Mặt Tướng
          </label>
          {opt3 && (
              <div style={{ marginTop: '10px', paddingLeft: '25px' }}>
                  <select value={opt3Target} onChange={e => setOpt3Target(e.target.value)} style={{ padding: '5px', width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151' }}>
                      <option value="">-- Chọn mục tiêu [Chém] --</option>
                      {validTargets.map(p => <option key={p.id} value={p.id}>{p.name} {getHeroNameStr(p)}</option>)}
                  </select>
              </div>
          )}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ doUse: false })}>
          Bỏ Qua Dưỡng Quân
        </button>
        <button className="btn-action success" style={{ flex: 1 }} disabled={isConfirmDisabled()} onClick={handleConfirm}>
          Xác Nhận
        </button>
      </div>
    </div>
  );
}
