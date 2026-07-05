import React from 'react';
import { CARDS, TRICK_CARDS_INFO, EQUIP_CARDS_INFO } from '../../data/gameData';
import { getCardBg } from '../../utils/cardStyles';

const renderIcon = (name, emoji) => {
  const bg = getCardBg(name);
  if (bg) {
    return (
      <div 
        style={{ 
          width: '100px', height: '140px', 
          backgroundImage: `url(${bg})`, 
          backgroundSize: 'cover', backgroundPosition: 'center', 
          borderRadius: '8px', flexShrink: 0,
          border: '1px solid rgba(212, 168, 67, 0.3)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}
      />
    );
  }
  return <div className="list-icon">{emoji}</div>;
};

export function CardList() {
  return (
    <div className="wiki-grid-2col">
      <div className="wiki-card list-card">
        {renderIcon('Chém', '⚔️')}
        <div className="list-content">
          <h4>Chém (Sát)</h4>
          <p>Gây 1 sát thương cho 1 mục tiêu trong tầm đánh. Bị giới hạn 1 lá/lượt.</p>
        </div>
      </div>
      <div className="wiki-card list-card">
        {renderIcon('Né', '💨')}
        <div className="list-content">
          <h4>Né (Thiểm)</h4>
          <p>Tránh 1 lá Chém.</p>
        </div>
      </div>
      <div className="wiki-card list-card">
        {renderIcon('Đào', '🍑')}
        <div className="list-content">
          <h4>Đào (Thuốc)</h4>
          <p>Hồi 1 HP hoặc cứu người hấp hối. Không thể dùng khi đã đầy máu (trừ khi cứu người khác).</p>
        </div>
      </div>
      <div className="wiki-card list-card">
        {renderIcon('Rượu', '🍶')}
        <div className="list-content">
          <h4>Rượu (Tửu)</h4>
          <p>Trong lượt: +1 sát thương cho lá Chém tiếp theo. Khi Hấp hối: Tự dùng để cứu chính mình (+1 HP).</p>
        </div>
      </div>
    </div>
  );
}

export function TrickList() {
  const normalTricks = TRICK_CARDS_INFO.filter(c => !['Sấm Sét', 'Hỗn Loạn'].includes(c.name));
  const delayedTricks = TRICK_CARDS_INFO.filter(c => ['Sấm Sét', 'Hỗn Loạn'].includes(c.name));

  return (
    <div>
      <h3 style={{ color: '#3b82f6', marginBottom: '20px', borderBottom: '1px solid #3b82f6', paddingBottom: '10px' }}>⚡ Cẩm Nang Thường</h3>
      <div className="wiki-grid-2col" style={{ marginBottom: '40px' }}>
        {normalTricks.map((card, idx) => (
          <div key={idx} className="wiki-card list-card">
            {renderIcon(card.name, card.emoji)}
            <div className="list-content">
              <h4>{card.name}</h4>
              <p style={{ whiteSpace: 'pre-line' }}>{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ color: '#8b5cf6', marginBottom: '20px', borderBottom: '1px solid #8b5cf6', paddingBottom: '10px' }}>⏳ Cẩm Nang Trì Hoãn</h3>
      <div className="wiki-grid-2col">
        {delayedTricks.map((card, idx) => (
          <div key={idx} className="wiki-card list-card">
            {renderIcon(card.name, card.emoji)}
            <div className="list-content">
              <h4>{card.name}</h4>
              <p style={{ whiteSpace: 'pre-line' }}>{card.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EquipList() {
  const weapons = EQUIP_CARDS_INFO.filter(e => e.type === 'Vũ khí');
  const armors = EQUIP_CARDS_INFO.filter(e => e.type === 'Giáp');
  const mounts = EQUIP_CARDS_INFO.filter(e => e.type === 'Ngựa');

  const renderGrid = (items) => (
    <div className="wiki-grid-2col" style={{ marginBottom: '40px' }}>
      {items.map((eq, idx) => (
        <div key={idx} className="wiki-card list-card">
          {renderIcon(eq.name, eq.emoji)}
          <div className="list-content">
            <h4>{eq.name}</h4>
            <div className="equip-tags">
              <span className="tag type">{eq.type}</span>
              {eq.range && <span className="tag range">Tầm/Khoảng cách: {eq.range}</span>}
            </div>
            <p style={{ whiteSpace: 'pre-line' }}>{eq.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <h3 style={{ color: '#ef4444', marginBottom: '20px', borderBottom: '1px solid #ef4444', paddingBottom: '10px' }}>⚔️ Vũ Khí</h3>
      {renderGrid(weapons)}

      <h3 style={{ color: '#10b981', marginBottom: '20px', borderBottom: '1px solid #10b981', paddingBottom: '10px' }}>🛡️ Phòng Cụ (Giáp)</h3>
      {renderGrid(armors)}

      <h3 style={{ color: '#f59e0b', marginBottom: '20px', borderBottom: '1px solid #f59e0b', paddingBottom: '10px' }}>🐎 Tọa Kỵ (Ngựa)</h3>
      {renderGrid(mounts)}
    </div>
  );
}
