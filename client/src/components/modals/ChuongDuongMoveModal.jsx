import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function ChuongDuongMoveModal({ req, gameState, onConfirm }) {
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null); // 'equip' or 'judge'
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  
  const allCards = [];
  gameState.players.forEach(p => {
      p.equipment.forEach(eq => allCards.push({ ...eq, ownerId: p.id, zone: 'equip' }));
      if (p.judgementArea) {
          p.judgementArea.forEach(j => allCards.push({ ...j, ownerId: p.id, zone: 'judge' }));
      }
  });

  const handleSelectCard = (card) => {
      setSelectedCardId(card.name); // Using name as ID for simplicity
      setSelectedSourceId(card.ownerId);
      setSelectedZone(card.zone);
      setSelectedTargetId(null);
  };
  
  const handleSelectTarget = (pId) => {
      setSelectedTargetId(pId);
  };

  const handleConfirm = () => {
      const card = allCards.find(c => c.name === selectedCardId && c.ownerId === selectedSourceId);
      onConfirm({ doMove: true, fromPlayerId: selectedSourceId, toPlayerId: selectedTargetId, zone: selectedZone, cardMoved: card });
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '400px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#ec4899', fontWeight: 'bold' }}>
        🔄 KÍCH HOẠT CHƯƠNG DƯƠNG
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Chọn 1 lá Trang Bị hoặc Phán Xét trên sân, sau đó chọn người chơi để chuyển lá bài đó tới.
      </div>
      
      {!selectedCardId ? (
          <div>
             <div style={{ marginBottom: '10px' }}>Bước 1: Chọn bài trên bàn</div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                {allCards.length === 0 && <div style={{ color: 'gray' }}>Không có bài nào trên bàn.</div>}
                {allCards.map(c => (
                   <button 
                     key={c.ownerId + c.name} 
                     className="btn-action" 
                     onClick={() => handleSelectCard(c)}
                     style={{ fontSize: '0.8rem', padding: '5px' }}
                   >
                     {getFullPlayerName(gameState.players[c.ownerId], req.sourceId)}: {c.name} ({c.zone === 'equip' ? 'Trang Bị' : 'Phán Xét'})
                   </button>
                ))}
             </div>
             <div style={{ marginTop: '15px' }}>
                <button className="btn-action secondary" onClick={() => onConfirm({ doMove: false })}>Bỏ qua</button>
             </div>
          </div>
      ) : (
          <div>
             <div style={{ marginBottom: '10px' }}>
                Bước 2: Chuyển [<strong>{selectedCardId}</strong>] cho ai?
             </div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                {gameState.players.filter(p => p.isAlive).map(p => (
                   <button 
                     key={p.id} 
                     className={`btn-action ${selectedTargetId === p.id ? 'primary' : 'secondary'}`}
                     onClick={() => handleSelectTarget(p.id)}
                     style={{ fontSize: '0.8rem', padding: '5px' }}
                   >
                     {getFullPlayerName(p, req.sourceId)}
                   </button>
                ))}
             </div>
             <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center' }}>
                 <button className="btn-action secondary" onClick={() => setSelectedCardId(null)}>Quay lại</button>
                 <button className="btn-action success" disabled={selectedTargetId === null} onClick={handleConfirm}>Xác nhận di chuyển</button>
             </div>
          </div>
      )}
    </div>
  );
}
