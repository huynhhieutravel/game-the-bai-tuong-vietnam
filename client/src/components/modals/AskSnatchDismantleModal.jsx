import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from '../../utils/playerHelpers';


export function AskSnatchDismantleModal({ req, gameState, onConfirm, isSnatch }) {
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  
  const target = gameState.players.find(p => p.id === req.targetId);
  if (!target) return null;

  const handleSelectCard = (cardId, zone) => {
      setSelectedCardId(cardId);
      setSelectedZone(zone);
  };

  const handleConfirm = () => {
      console.log(`[DEBUG_UI_MODAL] Confirm clicked! selectedCardId:`, selectedCardId, `zone:`, selectedZone);
      onConfirm({ cardId: selectedCardId, zone: selectedZone });
  };

  return (
    <div style={{ textAlign: 'center', minWidth: '400px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: isSnatch ? '#3b82f6' : '#ef4444', fontWeight: 'bold' }}>
        {isSnatch ? '🖐️ CƯỚP BÀI (THUẬN THỦ DẮT DÊ)' : '🔥 TƯỚC BÀI (QUÁ HÀ NHỊP CẦU)'}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Chọn 1 lá bài của <strong>{getFullPlayerName(target, req.sourceId)}</strong> để {isSnatch ? 'cướp lấy' : 'phá hủy'}.
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
         {/* Bài trên tay */}
         {target.hand && target.hand.length > 0 && (
            <div style={{ border: '1px solid #444', padding: '10px', width: '100%' }}>
               <div style={{ marginBottom: '5px', color: '#a8a29e' }}>Bài trên tay ({target.hand.length} lá)</div>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                  {target.hand.map((c, idx) => (
                     <button 
                       key={'hand' + idx} 
                       className={`btn-action ${selectedCardId === c.id ? 'primary' : 'secondary'}`}
                       onClick={() => handleSelectCard(c.id, 'hand')}
                       style={{ padding: '5px 10px' }}
                     >
                       Lá bài úp {idx + 1}
                     </button>
                  ))}
               </div>
            </div>
         )}
         
         {/* Trang bị */}
         {target.equipment && target.equipment.length > 0 && (
            <div style={{ border: '1px solid #444', padding: '10px', width: '100%' }}>
               <div style={{ marginBottom: '5px', color: '#a8a29e' }}>Trang bị</div>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                  {target.equipment.map(c => (
                     <button 
                       key={c.id} 
                       className={`btn-action ${selectedCardId === c.id ? 'primary' : 'secondary'}`}
                       onClick={() => handleSelectCard(c.id, 'equip')}
                       style={{ padding: '5px 10px', borderColor: selectedCardId === c.id ? '' : '#3b82f6', color: selectedCardId === c.id ? '' : '#60a5fa' }}
                     >
                       {c.name}
                     </button>
                  ))}
               </div>
            </div>
         )}
         
         {/* Phán xét */}
         {target.judgementArea && target.judgementArea.length > 0 && (
            <div style={{ border: '1px solid #444', padding: '10px', width: '100%' }}>
               <div style={{ marginBottom: '5px', color: '#a8a29e' }}>Khu vực Phán Xét</div>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                  {target.judgementArea.map(c => (
                     <button 
                       key={c.id} 
                       className={`btn-action ${selectedCardId === c.id ? 'primary' : 'secondary'}`}
                       onClick={() => handleSelectCard(c.id, 'judge')}
                       style={{ padding: '5px 10px', borderColor: selectedCardId === c.id ? '' : '#ec4899', color: selectedCardId === c.id ? '' : '#f472b6' }}
                     >
                       {c.name}
                     </button>
                  ))}
               </div>
            </div>
         )}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
         <button className="btn-action secondary" onClick={() => onConfirm({})}>Bỏ qua</button>
         <button className="btn-action primary" disabled={!selectedCardId} onClick={handleConfirm}>
            {isSnatch ? 'Cướp lấy' : 'Phá hủy'}
         </button>
      </div>
    </div>
  );
}
