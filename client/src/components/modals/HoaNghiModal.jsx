import React, { useState, useEffect } from 'react';
import { getHeroNameStr } from 'shared/utils/playerHelpers';

export default function HoaNghiModal({ req, me, gameState, onConfirm }) {
   const [distribution, setDistribution] = useState({});
   const [activeReceiver, setActiveReceiver] = useState(me.id);

   // By default, assign all drawn cards to self
   useEffect(() => {
       if (req && req.drawnCards) {
           const initialDist = {};
           req.drawnCards.forEach(c => {
               initialDist[c.id] = me.id; // give to self by default
           });
           setDistribution(initialDist);
       }
   }, [req, me]);

   const handleCardClick = (cardId) => {
       setDistribution(prev => ({...prev, [cardId]: activeReceiver}));
   };

   const handleSubmit = () => {
       const distArray = [];
       Object.keys(distribution).forEach(cardId => {
           if (distribution[cardId] !== null) { // null = discarded
               distArray.push({ cardId, targetId: distribution[cardId] });
           }
       });
       onConfirm({ doProvide: true, distribution: distArray });
   };

   const alivePlayers = gameState.players.filter(p => p.isAlive);

   return (
      <div style={{ textAlign: 'left', minWidth: '400px' }}>
          <div style={{ fontSize: '1.3rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>🕊️ HÒA NGHỊ</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '20px', textAlign: 'center' }}>
              Bạn vừa mất máu và rút được {req.drawnCards?.length} lá bài.<br/>Chọn người nhận, sau đó bấm vào lá bài để phân phát.
          </div>
          
          {/* Vùng chọn người nhận */}
          <div style={{ padding: '10px', border: '1px solid #374151', borderRadius: '4px', marginBottom: '15px', background: 'rgba(16, 185, 129, 0.1)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-gold)', marginBottom: '8px', fontWeight: 'bold' }}>1. Chọn Người Nhận:</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'thin' }}>
                  <div 
                     onClick={() => setActiveReceiver(null)}
                     style={{
                         flexShrink: 0,
                         padding: '6px 12px', borderRadius: '20px', whiteSpace: 'nowrap', cursor: 'pointer',
                         border: activeReceiver === null ? '2px solid #ef4444' : '1px solid #374151',
                         background: activeReceiver === null ? 'rgba(239, 68, 68, 0.2)' : '#1f2937',
                         color: activeReceiver === null ? '#ef4444' : 'var(--color-text-secondary)'
                     }}
                  >
                     Bỏ bài (Không nhận)
                  </div>
                  {alivePlayers.map(p => (
                     <div 
                        key={p.id}
                        onClick={() => setActiveReceiver(p.id)}
                        style={{
                            flexShrink: 0,
                            padding: '6px 12px', borderRadius: '20px', whiteSpace: 'nowrap', cursor: 'pointer',
                            border: activeReceiver === p.id ? '2px solid var(--color-gold)' : '1px solid #374151',
                            background: activeReceiver === p.id ? 'rgba(212, 168, 67, 0.2)' : '#1f2937',
                            color: activeReceiver === p.id ? 'white' : 'var(--color-text-secondary)'
                        }}
                     >
                        {p.id === me.id ? 'Bản thân' : `${p.name} ${getHeroNameStr(p)}`}
                     </div>
                  ))}
              </div>
          </div>
          
          {/* Vùng chọn lá bài */}
          <div style={{ padding: '10px', border: '1px solid #374151', borderRadius: '4px', marginBottom: '20px', background: 'rgba(16, 185, 129, 0.1)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-gold)', marginBottom: '15px', fontWeight: 'bold' }}>2. Nhấn vào bài để giao:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                  {req.drawnCards?.map(c => {
                      const suitColor = (c.suit === 'heart' || c.suit === 'diamond') ? '#ef4444' : 'white';
                      const suitIcon = c.suit === 'heart' ? '♥' : c.suit === 'diamond' ? '♦' : c.suit === 'spade' ? '♠' : '♣';
                      const assignedTo = distribution[c.id];
                      const assignedPlayer = assignedTo !== null && assignedTo !== undefined ? gameState.players.find(p => p.id === assignedTo) : null;
                      
                      let assignedLabel = 'Bỏ đi';
                      let assignedColor = '#ef4444';
                      let assignedBorder = '#ef4444';
                      if (assignedPlayer) {
                          assignedLabel = assignedPlayer.id === me.id ? 'Bản thân' : assignedPlayer.name;
                          assignedColor = '#10b981';
                          assignedBorder = '#10b981';
                      }

                      return (
                          <div 
                             key={c.id} 
                             onClick={() => handleCardClick(c.id)}
                             style={{ 
                                 width: '100px', height: '130px', background: '#1f2937', 
                                 borderRadius: '8px', border: `2px solid ${assignedBorder}`,
                                 display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                 justifyContent: 'center', cursor: 'pointer', position: 'relative',
                                 boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'transform 0.1s'
                             }}
                             onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                             onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                              <div style={{ color: suitColor, fontSize: '1.5rem', marginBottom: '5px' }}>{suitIcon}</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center', padding: '0 5px' }}>{c.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{c.rank}</div>
                              
                              {/* Badge người nhận */}
                              <div style={{ 
                                  position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)',
                                  background: assignedColor, color: 'white', padding: '3px 10px', 
                                  borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                              }}>
                                  {assignedLabel}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '10px' }}>
              <button className="btn-action danger" style={{ flex: 1 }} onClick={() => onConfirm({ canceled: true })}>Bỏ qua hết</button>
              <button className="btn-action success" style={{ flex: 1 }} onClick={handleSubmit}>Xác Nhận</button>
          </div>
      </div>
   );
}
