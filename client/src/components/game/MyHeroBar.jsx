import { getSuitEmoji } from 'shared/constants/cardTypes';
// @ts-check
import React from 'react';
import { CARD_SUBTYPES, getCardSubType } from 'shared/data/gameData';
import { getPlayerFaction } from 'shared/engine_v4/application/index.js';
import { getCardBg } from 'shared/utils/cardStyles';
import { WeaponIcon, ArmorIcon, MountAtkIcon, MountDefIcon, HpHeartIcon } from '../common/GameIcons';
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
 * @property {Function} setHeroPopup
 * @property {Function} setCardPopup
 * @property {any} targetSession
 * @property {Function} handleTargetClick
 * @property {string} [animationClass]
 * 
 * @param {MyHeroBarProps} props
 */
export default function MyHeroBar(props) {
    const { me, gameState, activePhase, handleRevealClick, actionBar, playerHand, setHeroPopup, setCardPopup, targetSession, handleTargetClick, animationClass } = props;
    
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
        <div className={`my-hero-bar cockpit-layout ${animationClass || ''}`}>
           
           {/* ZONE 1: HERO DOCK CONTAINER (Góc dưới trái) */}
           <div className="my-hero-dock-container">
               {/* 1. Header trên cùng: Phe badge, Ẩn badge, HP Hearts 4/4 */}
               <div className="my-hero-dock-header">
                   <div className="my-hero-dock-badges">
                       <div className={`my-hero-faction-tag ${me.isDaTam ? 'datam' : (getPlayerFaction(me) === 'Lạc' ? 'lac' : getPlayerFaction(me) === 'Sơn' ? 'son' : getPlayerFaction(me) === 'Hà' ? 'ha' : 'default')}`}>
                         {me.isDaTam ? '🐺 DÃ TÂM' : `PHE ${getPlayerFaction(me)?.toUpperCase()}`}
                       </div>
                       {!me.isRevealed && (
                         <div className="my-hero-faction-tag unrevealed">
                           🕵️ ẨN
                         </div>
                       )}
                   </div>

                   <div className="my-hero-hp-bar">
                     <div className="my-hero-hp-hearts">
                       {Array.from({ length: me.maxHp }).map((_, i) => (
                         <HpHeartIcon key={i} size={15} lost={i >= me.hp} />
                       ))}
                     </div>
                     <span className="my-hero-hp-text">
                       {me.hp}/{me.maxHp}
                     </span>
                     {me.drankWine && <span className="my-hero-wine-status">🍷 Say</span>}
                   </div>
               </div>

               {/* 2. Khung thẻ Tướng bự hơn */}
               <div className="my-hero-dock">
                   <div className="my-hero-dock-body">
                       {/* Avatars */}
                       <div className="my-hero-avatars">
                           {/* Avatar 1 */}
                           <div className={`my-hero-avatar-card ${isTargetable ? 'targetable' : ''} ${isSelected ? 'selected' : ''}`} onClick={onAvatarClick}>
                               <div className="judgement-area my-hero-judgement-area" style={{ display: 'flex', gap: '4px', position: 'absolute', top: '4px', left: '4px', zIndex: 15 }}>
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
                                         padding: '1px 3px',
                                         fontSize: '0.75rem',
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
                                 <div className="my-hero-reveal-overlay" onClick={(e) => { e.stopPropagation(); setHeroPopup(me); }}>
                                   <button className="btn-action warning my-hero-reveal-btn" onClick={(e) => { e.stopPropagation(); handleRevealClick(0); }}>Lật</button>
                                   <button className="btn-action secondary my-hero-view-btn" onClick={(e) => { e.stopPropagation(); setHeroPopup(me); }}>Xem</button>
                                 </div>
                               )}
                           </div>

                           {/* Avatar 2 */}
                           <div className={`my-hero-avatar-card ${isTargetable ? 'targetable' : ''} ${isSelected ? 'selected' : ''}`} onClick={onAvatarClick}>
                               {me.heroes?.[1]?.image ? <img src={`/images/heroes/${me.heroes?.[1].image}`} className="my-hero-avatar-img" /> : <div className="my-hero-avatar-emoji">{(me.heroes?.[1]?.emoji || '')}</div>}
                               {me.revealedHeroes && !me.revealedHeroes[1] && (
                                 <div className="my-hero-reveal-overlay" onClick={(e) => { e.stopPropagation(); setHeroPopup(me); }}>
                                   <button className="btn-action warning my-hero-reveal-btn" onClick={(e) => { e.stopPropagation(); handleRevealClick(1); }}>Lật</button>
                                   <button className="btn-action secondary my-hero-view-btn" onClick={(e) => { e.stopPropagation(); setHeroPopup(me); }}>Xem</button>
                                 </div>
                               )}
                           </div>
                       </div>
                   </div>
               </div>
           </div>

           {/* ZONE 2: HAND FAN + EQUIPMENT (Chính giữa đáy) */}
           <div className="my-hero-hand-zone">
               <div className="my-hero-hand-wrapper">
                   {/* 4 ô trang bị dàn ngang 1 hàng bên trên thẻ bài */}
                   <div className="my-hero-equipment-area my-hero-equipment-row">
                     {[
                       { type: CARD_SUBTYPES.EQUIP_WEAPON, icon: <WeaponIcon size={20} />, title: 'Vũ khí' },
                       { type: CARD_SUBTYPES.EQUIP_ARMOR, icon: <ArmorIcon size={20} />, title: 'Phòng cụ' },
                       { type: CARD_SUBTYPES.EQUIP_MOUNT_ATK, icon: <MountAtkIcon size={20} />, title: 'Ngựa công (-1)' },
                       { type: CARD_SUBTYPES.EQUIP_MOUNT_DEF, icon: <MountDefIcon size={20} />, title: 'Ngựa thủ (+1)' }
                     ].map((slot, i) => {
                       const eqCard = me.equipment?.find(c => getCardSubType(c) === slot.type);
                       const bgImage = eqCard ? getCardBg(eqCard.name) : null;
                       return (
                         <div 
                           key={i} 
                           className={`my-hero-equip-slot ${eqCard ? 'equipped' : 'empty'}`} 
                           title={eqCard ? `${eqCard.name}: ${eqCard.desc} (Nhấn để phóng to)` : slot.title} 
                           style={{ ...(bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1.5px solid var(--color-gold)' } : {}) }} 
                           onClick={(e) => { e.stopPropagation(); if (eqCard) setCardPopup(eqCard); }}
                         >
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

                   {playerHand}
               </div>
           </div>

           {/* ZONE 3: ACTION HUB (Góc dưới phải) */}
           <div className="my-hero-action-hub">
               <div className="my-hero-action-buttons">
                   {actionBar}
               </div>
           </div>

        </div>
    );
}
