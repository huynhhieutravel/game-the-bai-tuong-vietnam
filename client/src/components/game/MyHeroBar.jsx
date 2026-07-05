// @ts-check
import React from 'react';
import { CARD_SUBTYPES, getCardSubType } from '../../data/gameData';
import { getPlayerFaction } from '../../engine';

import { getCardBg } from '../../utils/cardStyles';

/**
 * @typedef {import('../../engine/types/view/PlayerViewModel').PlayerViewModel} PlayerViewModel
 * @typedef {import('../../engine/types/view/GameViewModel').GameViewModel} GameViewModel
 * 
 * @typedef {Object} MyHeroBarProps
 * @property {PlayerViewModel} me
 * @property {GameViewModel} gameState
 * @property {string} activePhase
 * @property {Function} handleRevealClick
 * @property {React.ReactNode} actionBar
 * @property {React.ReactNode} playerHand
 * @property {any} statusMessage
 * @property {Function} setHeroPopup
 * @property {Function} setCardPopup
 * @property {any} targetSession
 * @property {Function} handleTargetClick
 * 
 * @param {MyHeroBarProps} props
 */
export default function MyHeroBar(props) {
    const { me, gameState, activePhase, handleRevealClick, actionBar, playerHand, statusMessage, setHeroPopup, setCardPopup, targetSession, handleTargetClick } = props;
    
    const isTargetable = targetSession?.validTargets.includes(me.id);
    const isSelected = targetSession?.selectedTargets.includes(me.id);
    
    // Hàm phụ trợ để xử lý click lên avatar
    const onAvatarClick = (e) => {
        if (isTargetable && handleTargetClick) {
            handleTargetClick(me.id);
        } else {
            setHeroPopup(me);
        }
    };

    const bgAvatarStyle = {
        position: 'relative', width: '140px', height: '200px', background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-md)', 
        border: '2px solid var(--color-gold-dark)', overflow: 'hidden', cursor: isTargetable ? 'crosshair' : 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        outline: isSelected ? '3px solid var(--color-gold)' : (isTargetable ? '3px dashed #ef4444' : 'none'),
        outlineOffset: '2px'
    };

    return (
        <div className="my-hero-bar" style={{ display: 'flex', gap: '20px', alignItems: 'stretch', width: '100%' }}>
           
           {/* MAIN AREA (Left & Center) */}
           <div className="my-hero-main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* TOP ROW: Equipment and Action Buttons (Spans full width above avatars and hand) */}
              <div className="my-hero-top-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 15px', backdropFilter: 'blur(12px)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                  
                  {/* Equipment left side */}
                  <div className="equipment-area" style={{ display: 'flex', gap: '15px' }}>
                    {[
                      { type: CARD_SUBTYPES.EQUIP_WEAPON, icon: '⚔️', title: 'Vũ khí' },
                      { type: CARD_SUBTYPES.EQUIP_ARMOR, icon: '🛡️', title: 'Phòng cụ' },
                      { type: CARD_SUBTYPES.EQUIP_MOUNT_ATK, icon: '🐎', title: 'Ngựa công (-1)' },
                      { type: CARD_SUBTYPES.EQUIP_MOUNT_DEF, icon: '🐴', title: 'Ngựa thủ (+1)' }
                    ].map((slot, i) => {
                      const eqCard = me.equipment?.find(c => getCardSubType(c) === slot.type);
                      const bgImage = eqCard ? getCardBg(eqCard.name) : null;
                      return (
                        <div key={i} className={`equip-slot ${eqCard ? 'equipped' : 'empty'}`} title={eqCard ? `${eqCard.name}: ${eqCard.desc}` : slot.title} style={{ ...(bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--color-gold)' } : {}), cursor: eqCard ? 'pointer' : 'default', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { if (eqCard) setCardPopup(eqCard) }}>
                          {eqCard ? (
                            <>
                              <div style={{ fontSize: '0.5rem', color: eqCard.color === 'red' ? '#ef4444' : '#f1f5f9', textShadow: '0 0 4px rgba(0,0,0,1)', background: bgImage ? 'rgba(0,0,0,0.5)' : 'transparent', borderRadius: '2px', padding: '1px 3px', position: 'absolute', top: '2px', left: '2px', fontWeight: 'bold' }}>
                                {eqCard.suit}{eqCard.rank}
                              </div>
                              {!bgImage && (
                                <>
                                  <div style={{ fontSize: '1.4rem', marginTop: '2px' }}>{eqCard.emoji}</div>
                                  <div style={{ fontSize: '0.45rem', marginTop: '1px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.1' }}>{eqCard.name}</div>
                                </>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: '1.6rem' }}>{slot.icon}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Skills/Actions right side */}
                  <div className="action-buttons" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '10px', flex: 1 }}>
                      {actionBar}
                  </div>
              </div>

              {/* BOTTOM ROW: Avatars (Left) & Hand (Center) */}
              <div className="my-hero-bottom-row" style={{ display: 'flex', width: '100%', alignItems: 'flex-end', height: '200px' }}>
                  
                  {/* AVATARS (Left) */}
                  <div className="my-hero-avatars" style={{ display: 'flex', gap: '15px', zIndex: 10, flexShrink: 0 }}>
                      
                      {/* Avatar 1 */}
                      <div className="avatar-card" onClick={onAvatarClick} style={bgAvatarStyle}>
                          {/* Judgement Area for Me - Float on top of avatars */}
                          <div className="judgement-area" style={{ top: '-10px', left: '-10px', zIndex: 20 }}>
                            {me.judgementArea && me.judgementArea.map((card, i) => (
                              <div key={i} className="judgement-item" title={card.name} style={{ width: '24px', height: '24px', fontSize: '0.8rem' }}>
                                {card.emoji}
                              </div>
                            ))}
                          </div>
                          {me.isSilenced && (
                             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2.5rem', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '50%', zIndex: 10, filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Kỹ năng bị khóa!">
                               🔒
                             </div>
                          )}
                          {me.isChained && (
                             <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 12, pointerEvents: 'none' }} title="Bị Xích!">
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(45deg)', fontSize: '3.5rem', filter: 'drop-shadow(0 0 5px rgba(0,0,0,1))', opacity: 0.9 }}>⛓️</div>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '3.5rem', filter: 'drop-shadow(0 0 5px rgba(0,0,0,1))', opacity: 0.9 }}>⛓️</div>
                             </div>
                          )}
                          
                          {(me.heroes?.[0]?.image) ? <img src={`/images/heroes/${me.heroes?.[0]?.image}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} /> : <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2rem' }}>{(me.heroes?.[0]?.emoji)}</div>}
                          {me.revealedHeroes && !me.revealedHeroes[0] && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                              <button className="btn-action warning" onClick={(e) => { e.stopPropagation(); if(window.confirm('Lật tướng này?')) handleRevealClick(0); }} style={{ padding: '8px 16px', fontSize: '1rem', fontWeight: 'bold' }}>Lật</button>
                            </div>
                          )}
                      </div>

                      {/* Avatar 2 */}
                      <div className="avatar-card" onClick={onAvatarClick} style={bgAvatarStyle}>
                          {me.heroes?.[1]?.image ? <img src={`/images/heroes/${me.heroes?.[1].image}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} /> : <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2rem' }}>{(me.heroes?.[1]?.emoji || '')}</div>}
                          {me.revealedHeroes && !me.revealedHeroes[1] && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                              <button className="btn-action warning" onClick={(e) => { e.stopPropagation(); if(window.confirm('Lật tướng này?')) handleRevealClick(1); }} style={{ padding: '8px 16px', fontSize: '1rem', fontWeight: 'bold' }}>Lật</button>
                            </div>
                          )}
                      </div>
                  </div>

                  {/* CARDS HAND (Pushed to the right of avatars) */}
                  <div className="my-hero-bottom-hand" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', marginLeft: '30px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          {playerHand}
                          {statusMessage}
                      </div>
                  </div>
              </div>

           </div>

           {/* RIGHT: DETAILS (Large size based on green box) */}
           <div className="my-hero-right-details" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '350px', flexShrink: 0, background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px', backdropFilter: 'blur(12px)', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
              <div className="my-hero-name" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.3rem', color: 'var(--color-gold)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {!me.revealedHeroes?.[0] ? '???' : (me.heroes?.[0]?.name)}
                </div>
                <div style={{ fontSize: '1.3rem', color: 'var(--color-gold)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {!me.revealedHeroes?.[1] ? '???' : (me.heroes?.[1]?.name || '?')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', margin: '8px 0', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.9rem', padding: '5px 12px', borderRadius: '4px', background: me.isDaTam ? '#9ca3af' : (getPlayerFaction(me) === 'Lạc' ? '#10b981' : getPlayerFaction(me) === 'Sơn' ? '#b45309' : getPlayerFaction(me) === 'Hà' ? '#3b82f6' : '#ef4444'), color: 'white', fontWeight: 'bold' }}>
                  {me.isDaTam ? '🐺 DÃ TÂM' : `PHE ${getPlayerFaction(me)?.toUpperCase()}`}
                </div>
                {!me.isRevealed && (
                  <div style={{ fontSize: '0.9rem', padding: '5px 12px', borderRadius: '4px', background: '#4b5563', color: 'white', fontWeight: 'bold' }}>
                    🕵️ CHƯA LỘ DIỆN
                  </div>
                )}
              </div>
              <div className="my-hero-hp-bar" style={{ marginTop: '15px', display: 'flex', alignItems: 'center' }}>
                {Array.from({ length: me.maxHp }).map((_, i) => (
                  <span key={i} className={`hp-pip ${i >= me.hp ? 'lost' : ''}`} style={{ width: '20px', height: '20px', margin: '0 3px', borderRadius: '50%', background: i >= me.hp ? '#374151' : '#ef4444', boxShadow: i >= me.hp ? 'inset 0 2px 4px rgba(0,0,0,0.8)' : '0 0 5px #ef4444' }} />
                ))}
                <span style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginLeft: '10px', fontWeight: 'bold' }}>
                  {me.hp}/{me.maxHp}
                </span>
                {me.drankWine && <span style={{ marginLeft: '12px', fontSize: '1.2rem', color: '#ef4444', fontWeight: 'bold', textShadow: '0 0 5px red' }}>🍷 Say</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', fontSize: '1.05rem', color: 'var(--color-text-secondary)', background: 'rgba(0,0,0,0.5)', padding: '15px 18px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} title="Tầm đánh (quyết định khoảng cách tối đa có thể Chém)">
                  <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>⚔️ Tầm đánh:</span> 
                  <strong style={{ color: 'white', fontSize: '1.1rem' }}>{me.attackRange}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} title="Khoảng cách phòng vệ (người khác phải có Tầm đánh >= Khoảng cách này mới Chém được bạn)">
                  <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>🛡️ Khoảng cách:</span> 
                  <strong style={{ color: 'white', fontSize: '1.1rem' }}>+{me.equipment?.find(c => getCardSubType(c) === CARD_SUBTYPES.EQUIP_MOUNT_DEF) ? 1 : 0}</strong>
                </div>
              </div>
           </div>

        </div>
    );
}
