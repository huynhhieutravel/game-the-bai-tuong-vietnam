import React from 'react';
import { CARD_SUBTYPES, getCardSubType } from '../../data/gameData';
import { getCardBg } from '../../utils/cardStyles';

// @ts-check
/** 
 * @typedef {import('../../engine/types/view/PlayerViewModel').PlayerViewModel} PlayerViewModel
 * @typedef {import('../../engine/types/view/GameViewModel').GameViewModel} GameViewModel
 * 
 * @typedef {Object} PlayerBoardProps
 * @property {PlayerViewModel} player
 * @property {GameViewModel} gameState
 * @property {PlayerViewModel} me
 * @property {boolean} isCurrentTurn
 * @property {any} targetSession
 * @property {Function} handleTargetClick
 * @property {Function} setHeroPopup
 * @property {Function} setCardPopup
 * @property {string} [className]
 * @property {React.CSSProperties} [style]
 * 
 * @param {PlayerBoardProps} props 
 */
export function PlayerBoard({ 
    player, 
    gameState, 
    me,
    isCurrentTurn,
    targetSession,
    handleTargetClick,
    setHeroPopup,
    setCardPopup,
    className,
    style
}) {
    const isTargetable = targetSession?.validTargets.includes(player.id);
    const isSelected = targetSession?.selectedTargets.includes(player.id);

    return (
        <div
            className={`player-zone ${isCurrentTurn ? 'is-current-turn' : ''} ${!player.isAlive ? 'dead' : ''} ${className || ''}`}
            style={{
              ...style,
              cursor: isTargetable ? 'crosshair' : 'default',
              outline: isSelected ? '3px solid var(--color-gold)' : (isTargetable ? '3px dashed #ef4444' : 'none'),
              outlineOffset: '4px',
              borderRadius: 'var(--radius-lg)'
            }}
            onClick={() => {
              if (isTargetable) {
                handleTargetClick(player.id);
              } else if (player.isRevealed) {
                setHeroPopup(player);
              }
            }}
          >
            {(() => {
               if (!isTargetable) return null;
               
               let rng = me.attackRange;
               const virtualName = targetSession.virtualCardName || targetSession.card?.name;
               
               if (virtualName === 'Chém' || virtualName === null) {
                  const hasNoThanOrThuyTo = me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'no-than' || s.id === 'thuy-to'));
                  // Note: rankToNumber will need to be imported or handled
                  if (hasNoThanOrThuyTo && targetSession.card) {
                      const rankMap = { 'A': 1, 'J': 11, 'Q': 12, 'K': 13 };
                      const r = rankMap[targetSession.card.rank] || parseInt(targetSession.card.rank, 10);
                      rng = Math.max(rng, r);
                  }
               }
               return (
                 <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', zIndex: 10, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                   ⚔️ Tầm đánh: {rng} 🛡️ Khoảng cách: {player.distanceFromMe}
                 </div>
               );
            })()}
            <div className="player-name">
              {player.name}
              {isCurrentTurn && ' 🎯'}
            </div>
            {(() => {
              /** @type {import('react').CSSProperties & { '--color-border'?: string }} */
              const heroCardStyle = {
                position: 'relative',
                '--color-border': player.isRevealed ? (player.isDaTam ? '#9ca3af' : (player.faction === 'Lạc' ? '#10b981' : player.faction === 'Sơn' ? '#b45309' : player.faction === 'Hà' ? '#3b82f6' : '#ef4444')) : 'var(--color-border)'
              };
              return (
                <div className={`hero-card ${!player.isAlive ? 'dead' : ''} ${!player.isRevealed ? 'hidden' : ''} ${player.isFlipped ? 'flipped' : ''}`} style={heroCardStyle}>
              
              {player.isSilenced && (
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2.5rem', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '50%', zIndex: 10, filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Kỹ năng bị khóa!">
                   🔒
                 </div>
              )}
              {player.isChained && (
                 <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 12, pointerEvents: 'none' }} title="Bị Xích!">
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(45deg)', fontSize: '3.5rem', filter: 'drop-shadow(0 0 5px rgba(0,0,0,1))', opacity: 0.9 }}>⛓️</div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '3.5rem', filter: 'drop-shadow(0 0 5px rgba(0,0,0,1))', opacity: 0.9 }}>⛓️</div>
                 </div>
              )}
              
              {/* Judgement Area */}
              <div className="judgement-area">
                {player.judgementArea && player.judgementArea.map((card, i) => (
                  <div key={i} className="judgement-item" title={card.name}>
                    {card.emoji}
                  </div>
                ))}
              </div>

              <div className="hero-portrait" style={{ display: 'flex', width: '100%' }}>
                {/* TƯỚNG 1 */}
                <div className="hero-tooltip-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                  {!player.revealedHeroes?.[0] ? (
                     <div style={{ fontSize: '1.5rem' }}>🕵️</div>
                  ) : (
                    <>
                      {player.heroes?.[0]?.image ? <img src={`/images/heroes/${player.heroes?.[0]?.image}`} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} /> : (player.heroes?.[0]?.emoji || '🕵️')}
                      <div className="hero-tooltip-content" style={{ bottom: '110%', width: '220px' }}>
                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-gold)' }}>{player.heroes?.[0]?.name}</h4>
                        {player.heroes?.[0]?.skills?.map((skill, idx) => (
                          <div key={idx} style={{ marginBottom: '4px', fontSize: '0.75rem', lineHeight: '1.2', textAlign: 'left' }}>
                            <strong style={{ color: 'var(--color-gold-light)' }}>{skill.name}:</strong> {skill.desc}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                {/* TƯỚNG 2 */}
                <div className="hero-tooltip-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!player.revealedHeroes?.[1] ? (
                     <div style={{ fontSize: '1.5rem' }}>🕵️</div>
                  ) : (
                    <>
                      {player.heroes?.[1]?.image ? <img src={`/images/heroes/${player.heroes?.[1]?.image}`} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} /> : (player.heroes?.[1]?.emoji || '🕵️')}
                      <div className="hero-tooltip-content" style={{ bottom: '110%', width: '220px' }}>
                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-gold)' }}>{player.heroes?.[1]?.name}</h4>
                        {player.heroes?.[1]?.skills?.map((skill, idx) => (
                          <div key={idx} style={{ marginBottom: '4px', fontSize: '0.75rem', lineHeight: '1.2', textAlign: 'left' }}>
                            <strong style={{ color: 'var(--color-gold-light)' }}>{skill.name}:</strong> {skill.desc}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="hero-info">
                <div className="hero-name" style={{ fontSize: '0.65rem' }}>
                   {!player.isRevealed ? 'Tướng Ẩn' : `${player.revealedHeroes?.[0] ? player.heroes?.[0]?.name : '???'} & ${player.revealedHeroes?.[1] ? player.heroes?.[1]?.name : '???'}`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', margin: '4px 0' }}>
                  {!player.isRevealed ? (
                    <div style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '4px', background: '#4b5563', color: 'white', fontWeight: 'bold' }}>
                      🕵️ HỆ ẨN
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '4px', background: player.isDaTam ? '#9ca3af' : (player.faction === 'Lạc' ? '#10b981' : player.faction === 'Sơn' ? '#b45309' : player.faction === 'Hà' ? '#3b82f6' : '#ef4444'), color: 'white', fontWeight: 'bold' }}>
                        {player.isDaTam ? '🐺 DÃ TÂM' : `PHE ${player.faction.toUpperCase()}`}
                      </div>
                      {(
                        <div style={{ fontSize: '0.55rem', color: (me.faction === player.faction && !me.isDaTam && !player.isDaTam) ? '#10b981' : '#ef4444', fontWeight: 'bold', textShadow: '0 0 2px black', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px' }}>
                          {(me.faction === player.faction && !me.isDaTam && !player.isDaTam) ? '🤝 ĐỒNG MINH' : '⚔️ KẺ THÙ'}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="hero-hp">
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                    {Array.from({ length: player.maxHp }).map((_, i) => (
                      <span key={i} className={`hp-pip ${i >= player.hp ? 'lost' : ''}`} />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'white', fontWeight: 'bold', marginTop: '2px', background: 'rgba(0,0,0,0.5)', padding: '0 6px', borderRadius: '4px', display: 'inline-block' }}>{player.hp}/{player.maxHp} HP</div>
                  {player.drankWine && <span style={{ marginLeft: '4px', fontSize: '0.9rem', filter: 'drop-shadow(0 0 4px red)' }}>🍷</span>}
                </div>
              </div>
              </div>
            );
            })()}
            <div className="hand-count" style={{ display: 'flex', gap: '8px', justifyContent: 'center', fontSize: '0.85rem' }}>
              <span title="Số bài trên tay">🎴 ×{player.hand.length}</span>
              <span title="Tầm đánh của người này">⚔️ {player.attackRange}</span>
              <span title="Khoảng cách từ bạn đến người này">📍 {player.distanceFromMe}</span>
            </div>
            {player.equipment?.length > 0 && (
              <div className="equipment-area">
                {[
                  { type: CARD_SUBTYPES.EQUIP_WEAPON, icon: '⚔️', title: 'Vũ khí' },
                  { type: CARD_SUBTYPES.EQUIP_ARMOR, icon: '🛡️', title: 'Phòng cụ' },
                  { type: CARD_SUBTYPES.EQUIP_MOUNT_ATK, icon: '🐎', title: 'Ngựa công (-1)' },
                  { type: CARD_SUBTYPES.EQUIP_MOUNT_DEF, icon: '🐴', title: 'Ngựa thủ (+1)' }
                ].map((slot, i) => {
                  const eqCard = player.equipment.find(c => getCardSubType(c) === slot.type);
                  const bgImage = eqCard ? getCardBg(eqCard.name) : null;
                  return (
                    <div key={i} className={`equip-slot ${eqCard ? 'equipped' : 'empty'}`} title={eqCard ? `${eqCard.name}: ${eqCard.desc}` : slot.title} style={{ ...(bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--color-gold)' } : {}), cursor: eqCard ? 'pointer' : 'default' }} onClick={() => { if (eqCard) setCardPopup(eqCard) }}>
                      {eqCard ? (
                        <>
                          <div style={{ fontSize: '0.5rem', color: eqCard.color === 'red' ? '#ef4444' : '#f1f5f9', textShadow: '0 0 4px rgba(0,0,0,1)', background: bgImage ? 'rgba(0,0,0,0.5)' : 'transparent', borderRadius: '2px', padding: '1px 3px', position: 'absolute', top: '2px', left: '2px', fontWeight: 'bold' }}>
                            {eqCard.suit}{eqCard.rank}
                          </div>
                          {!bgImage && (
                            <div style={{ fontSize: '0.55rem', textAlign: 'center', color: '#f1f5f9', marginTop: '10px' }}>{eqCard.name}</div>
                          )}
                        </>
                      ) : (
                        <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>{slot.icon}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
    );
}
