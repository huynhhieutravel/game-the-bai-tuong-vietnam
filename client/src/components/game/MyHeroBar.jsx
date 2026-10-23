import { getSuitEmoji } from 'shared/constants/cardTypes';
// @ts-check
import React from 'react';
import { CARD_SUBTYPES, getCardSubType } from 'shared/data/gameData';
import { getPlayerFaction } from 'shared/engine_v4/application/index.js';
import { getCardBg } from 'shared/utils/cardStyles';
import { WeaponIcon, ArmorIcon, MountAtkIcon, MountDefIcon, HpHeartIcon, RangeIcon, DistanceIcon } from '../common/GameIcons';
import './MyHeroBar.css';

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
 * @property {string} [animationClass]
 * 
 * @param {MyHeroBarProps} props
 */
export default function MyHeroBar(props) {
    const { me, gameState, activePhase, handleRevealClick, actionBar, playerHand, statusMessage, setHeroPopup, setCardPopup, targetSession, handleTargetClick, animationClass } = props;
    
    const isTargetable = targetSession?.validTargets.includes(me.id);
    const isSelected = targetSession?.selectedTargets.includes(me.id);
    
    const onAvatarClick = (e) => {
        if (e) e.stopPropagation();
        if (isTargetable && handleTargetClick) {
            handleTargetClick(me.id);
        } else {
            setHeroPopup(me);
        }
    };

    return (
        <div className={`my-hero-bar ${animationClass || ''}`}>
           
           {/* MAIN AREA (Left & Center) */}
           <div className="my-hero-main-area">
              
              {/* TOP ROW: Equipment and Action Buttons */}
              <div className="my-hero-top-actions">
                  
                  {/* Equipment left side */}
                  <div className="my-hero-equipment-area">
                    {[
                      { type: CARD_SUBTYPES.EQUIP_WEAPON, icon: <WeaponIcon size={28} />, title: 'Vũ khí' },
                      { type: CARD_SUBTYPES.EQUIP_ARMOR, icon: <ArmorIcon size={28} />, title: 'Phòng cụ' },
                      { type: CARD_SUBTYPES.EQUIP_MOUNT_ATK, icon: <MountAtkIcon size={28} />, title: 'Ngựa công (-1)' },
                      { type: CARD_SUBTYPES.EQUIP_MOUNT_DEF, icon: <MountDefIcon size={28} />, title: 'Ngựa thủ (+1)' }
                    ].map((slot, i) => {
                      const eqCard = me.equipment?.find(c => getCardSubType(c) === slot.type);
                      const bgImage = eqCard ? getCardBg(eqCard.name) : null;
                      return (
                        <div key={i} className={`my-hero-equip-slot ${eqCard ? 'equipped' : 'empty'}`} title={eqCard ? `${eqCard.name}: ${eqCard.desc}` : slot.title} style={{ ...(bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--color-gold)' } : {}) }} onClick={(e) => { e.stopPropagation(); if (eqCard) setCardPopup(eqCard) }}>
                          {eqCard ? (
                            <>
                              <div className={`my-hero-equip-badge ${eqCard.color === 'red' ? 'red' : ''} ${bgImage ? 'has-bg' : ''}`}>
                                {getSuitEmoji(eqCard.suit)}{eqCard.rank}
                              </div>
                              {!bgImage && (
                                <>
                                  <div className="my-hero-equip-emoji">{eqCard.emoji}</div>
                                  <div className="my-hero-equip-name">{eqCard.name}</div>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="my-hero-equip-icon-empty">{slot.icon}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Skills/Actions right side */}
                  <div className="my-hero-action-buttons">
                      {actionBar}
                  </div>
              </div>

              {/* BOTTOM ROW: Avatars (Left) & Hand (Center) */}
              <div className="my-hero-bottom-row">
                  
                  {/* AVATARS (Left) */}
                  <div className="my-hero-avatars">
                      
                      {/* Avatar 1 */}
                      <div className={`my-hero-avatar-card ${isTargetable ? 'targetable' : ''} ${isSelected ? 'selected' : ''}`} onClick={onAvatarClick}>
                          <div className="judgement-area my-hero-judgement-area" style={{ display: 'flex', gap: '4px', position: 'absolute', top: '6px', left: '6px', zIndex: 15 }}>
                            {me.judgementArea && me.judgementArea.map((card, i) => {
                              const icon = card.emoji || (card.name === 'Sấm Sét' ? '⚡' : card.name === 'Hỗn Loạn' ? '🌀' : '📜');
                              return (
                                <div 
                                  key={i} 
                                  className="judgement-item my-hero-judgement-item" 
                                  title={`${card.name}: Cẩm nang trì hoãn đang chờ phán xét`}
                                  style={{
                                    background: 'rgba(0, 0, 0, 0.8)',
                                    border: '1px solid #f59e0b',
                                    borderRadius: '4px',
                                    padding: '2px 5px',
                                    fontSize: '0.85rem',
                                    boxShadow: '0 0 6px rgba(245, 158, 11, 0.7)',
                                    cursor: 'help'
                                  }}
                                >
                                  {icon}
                                </div>
                              );
                            })}
                          </div>
                          {me.isSilenced && (
                             <div className="my-hero-silence-overlay" title="Kỹ năng bị khóa!">
                               🔒
                             </div>
                          )}
                          {me.isChained && (
                             <div className="my-hero-chain-overlay" title="Bị Xích!">
                                <div className="my-hero-chain-icon c1">⛓️</div>
                                <div className="my-hero-chain-icon c2">⛓️</div>
                             </div>
                          )}
                          
                          {(me.heroes?.[0]?.image) ? <img src={`/images/heroes/${me.heroes?.[0]?.image}`} className="my-hero-avatar-img" /> : <div className="my-hero-avatar-emoji">{(me.heroes?.[0]?.emoji)}</div>}
                          {me.revealedHeroes && !me.revealedHeroes[0] && (
                            <div className="my-hero-reveal-overlay">
                              <button className="btn-action warning my-hero-reveal-btn" onClick={(e) => { e.stopPropagation(); handleRevealClick(0); }}>Lật</button>
                            </div>
                          )}
                      </div>

                      {/* Avatar 2 */}
                      <div className={`my-hero-avatar-card ${isTargetable ? 'targetable' : ''} ${isSelected ? 'selected' : ''}`} onClick={onAvatarClick}>
                          {me.heroes?.[1]?.image ? <img src={`/images/heroes/${me.heroes?.[1].image}`} className="my-hero-avatar-img" /> : <div className="my-hero-avatar-emoji">{(me.heroes?.[1]?.emoji || '')}</div>}
                          {me.revealedHeroes && !me.revealedHeroes[1] && (
                            <div className="my-hero-reveal-overlay">
                              <button className="btn-action warning my-hero-reveal-btn" onClick={(e) => { e.stopPropagation(); handleRevealClick(1); }}>Lật</button>
                            </div>
                          )}
                      </div>
                  </div>

                  {/* CARDS HAND */}
                  <div className="my-hero-bottom-hand">
                      <div className="my-hero-hand-wrapper">
                          {playerHand}
                          {statusMessage}
                      </div>
                  </div>
              </div>

           </div>

           {/* RIGHT: DETAILS */}
           <div className="my-hero-right-details">
              <div className="my-hero-names-container">
                <div className="my-hero-name-text">
                  {!me.revealedHeroes?.[0] ? '???' : (me.heroes?.[0]?.name)}
                </div>
                <div className="my-hero-name-text">
                  {!me.revealedHeroes?.[1] ? '???' : (me.heroes?.[1]?.name || '?')}
                </div>
              </div>
              
              <div className="my-hero-faction-tags">
                <div className={`my-hero-faction-tag ${me.isDaTam ? 'datam' : (getPlayerFaction(me) === 'Lạc' ? 'lac' : getPlayerFaction(me) === 'Sơn' ? 'son' : getPlayerFaction(me) === 'Hà' ? 'ha' : 'default')}`}>
                  {me.isDaTam ? '🐺 DÃ TÂM' : `PHE ${getPlayerFaction(me)?.toUpperCase()}`}
                </div>
                {!me.isRevealed && (
                  <div className="my-hero-faction-tag unrevealed">
                    🕵️ CHƯA LỘ DIỆN
                  </div>
                )}
              </div>
              
              <div className="my-hero-hp-bar">
                <div className="my-hero-hp-hearts">
                  {Array.from({ length: me.maxHp }).map((_, i) => (
                    <HpHeartIcon key={i} size={18} lost={i >= me.hp} />
                  ))}
                </div>
                <span className="my-hero-hp-text">
                  {me.hp}/{me.maxHp} HP
                </span>
                {me.drankWine && <span className="my-hero-wine-status">🍷 Say</span>}
              </div>
              
              <div className="my-hero-stats-box">
                <div className="my-hero-stat-row" title="Tầm đánh (quyết định khoảng cách tối đa có thể Chém)">
                  <span className="my-hero-stat-label atk"><RangeIcon size={16} /> Tầm đánh:</span> 
                  <strong className="my-hero-stat-value">{me.attackRange}</strong>
                </div>
                <div className="my-hero-stat-row" title="Khoảng cách phòng vệ (người khác phải có Tầm đánh >= Khoảng cách này mới Chém được bạn)">
                  <span className="my-hero-stat-label def"><DistanceIcon size={16} /> Khoảng cách:</span> 
                  <strong className="my-hero-stat-value">+{me.equipment?.find(c => getCardSubType(c) === CARD_SUBTYPES.EQUIP_MOUNT_DEF) ? 1 : 0}</strong>
                </div>
              </div>


           </div>

        </div>
    );
}
