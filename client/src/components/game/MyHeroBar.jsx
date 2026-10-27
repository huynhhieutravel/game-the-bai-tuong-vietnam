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
    const isDead = me?.isAlive === false;
    const isDying = me?.isAlive !== false && typeof me?.hp === 'number' && me.hp <= 0;

    const currentTurnId = gameState?.currentTurnPlayerId ?? gameState?.currentPlayerIndex;
    const isMyTurn = currentTurnId !== undefined && currentTurnId !== null ? currentTurnId === me?.id : true;
    const hasWaitingResponse = Boolean(
      gameState?.waitingForResponse && (
        gameState.waitingForResponse.responderId === me?.id ||
        gameState.waitingForResponse.targetId === me?.id ||
        (Array.isArray(gameState.waitingForResponse.askQueue) && gameState.waitingForResponse.askQueue.includes(me?.id))
      )
    );
    const canRevealHero = isMyTurn || hasWaitingResponse;
    
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
               {/* 1. Khung trang bị: 4 ô trang bị dàn ngang 1 hàng TRÊN CÙNG (trên thanh HP) */}
               <div className="my-hero-equipment-area my-hero-equipment-row">
                 {[
                   { type: CARD_SUBTYPES.EQUIP_WEAPON, icon: <WeaponIcon size={18} />, title: 'Vũ khí' },
                   { type: CARD_SUBTYPES.EQUIP_ARMOR, icon: <ArmorIcon size={18} />, title: 'Phòng cụ' },
                   { type: CARD_SUBTYPES.EQUIP_MOUNT_ATK, icon: <MountAtkIcon size={18} />, title: 'Ngựa công (-1)' },
                   { type: CARD_SUBTYPES.EQUIP_MOUNT_DEF, icon: <MountDefIcon size={18} />, title: 'Ngựa thủ (+1)' }
                 ].map((slot, i) => {
                   const eqCard = Array.isArray(me.equipment)
                     ? me.equipment.find(c => getCardSubType(c) === slot.type)
                     : (me.equipment?.[slot.type] ||
                        me.equipment?.[slot.type.replace('equip_', '')] ||
                        (slot.type === CARD_SUBTYPES.EQUIP_MOUNT_DEF ? (me.equipment?.horse_defense || me.equipment?.mount_defense) : null) ||
                        (slot.type === CARD_SUBTYPES.EQUIP_MOUNT_ATK ? (me.equipment?.horse_attack || me.equipment?.mount_attack) : null));
                   const isHorse = slot.type === CARD_SUBTYPES.EQUIP_MOUNT_DEF || slot.type === CARD_SUBTYPES.EQUIP_MOUNT_ATK;
                   const isHorseDef = slot.type === CARD_SUBTYPES.EQUIP_MOUNT_DEF;
                   const bgImage = (!isHorse && eqCard) ? getCardBg(eqCard.name) : null;

                   if (isHorse && eqCard) {
                     return (
                       <div 
                         key={i} 
                         className="my-hero-equip-slot equipped horse-equipped" 
                         title={`${eqCard.name}: ${eqCard.desc || (isHorseDef ? 'Cự ly đối thủ đến bạn +1' : 'Tầm đánh đến đối thủ -1 cự ly')} (Nhấn để phóng to)`} 
                         style={{ 
                           background: isHorseDef 
                             ? 'radial-gradient(circle, rgba(14, 165, 233, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%)' 
                             : 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%)',
                           border: isHorseDef ? '1.5px solid #38bdf8' : '1.5px solid #ef4444',
                           boxShadow: isHorseDef ? '0 0 8px rgba(56, 189, 248, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)'
                         }}
                         onClick={(e) => { e.stopPropagation(); setCardPopup(eqCard); }}
                       >
                         <span style={{ 
                           display: 'flex', 
                           alignItems: 'center', 
                           justifyContent: 'center', 
                           width: '100%', 
                           height: '100%', 
                           filter: isHorseDef ? 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.8))' : 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))' 
                         }}>
                           {slot.icon}
                         </span>
                         <span 
                           className={`my-hero-equip-horse-val ${isHorseDef ? 'def' : 'atk'}`}
                           style={{ 
                             position: 'absolute', 
                             bottom: '1px', 
                             right: '1px', 
                             background: isHorseDef ? '#0284c7' : '#b91c1c', 
                             color: '#ffffff', 
                             border: isHorseDef ? '1px solid #38bdf8' : '1px solid #f87171', 
                             borderRadius: '3px', 
                             fontSize: '0.62rem', 
                             fontWeight: '900', 
                             padding: '0 2px', 
                             lineHeight: 1, 
                             textShadow: '0 1px 2px black' 
                           }}
                         >
                           {isHorseDef ? '+1' : '-1'}
                         </span>
                       </div>
                     );
                   }

                   return (
                     <div 
                       key={i} 
                       className={`my-hero-equip-slot ${eqCard ? 'equipped' : 'empty'}`} 
                       title={eqCard ? `${eqCard.name}: ${eqCard.desc} (Nhấn để phóng to)` : slot.title} 
                       style={{ 
                         backgroundImage: bgImage ? `url(${bgImage})` : 'none', 
                         backgroundSize: 'cover', 
                         backgroundPosition: 'center', 
                         backgroundRepeat: 'no-repeat',
                         border: eqCard ? '1.5px solid var(--color-gold)' : '1.5px dashed rgba(212, 168, 67, 0.35)' 
                       }}
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

               {/* 2. Thanh HP & Phe: Nằm ở giữa, dưới Khung trang bị và trên Khung thẻ tướng */}
               <div className="my-hero-dock-header">
                   <div className="my-hero-dock-badges">
                       {isDead ? (
                         <div className="my-hero-faction-tag" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)', border: '1px solid #ef4444', color: '#fef08a', fontWeight: '900', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}>
                           💀 TỬ TRẬN
                         </div>
                       ) : isDying ? (
                         <div className="my-hero-faction-tag" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #b45309 100%)', border: '1px solid #f97316', color: '#fef08a', fontWeight: '900', boxShadow: '0 0 8px rgba(249,115,22,0.7)', animation: 'pulse 1.2s infinite' }}>
                           ⚠️ HẤP HỐI
                         </div>
                       ) : !me.isRevealed ? (
                         <div className="my-hero-faction-tag unrevealed">
                           PHE ẨN
                         </div>
                       ) : (
                         <div className={`my-hero-faction-tag ${me.isDaTam ? 'datam' : (getPlayerFaction(me) === 'Lạc' ? 'lac' : getPlayerFaction(me) === 'Sơn' ? 'son' : getPlayerFaction(me) === 'Hà' ? 'ha' : 'default')}`}>
                           {me.isDaTam ? 'DÃ TÂM' : `PHE ${getPlayerFaction(me)?.toUpperCase()}`}
                         </div>
                       )}
                   </div>

                   <div className="my-hero-hp-bar">
                     <div className="my-hero-hp-hearts">
                       {Array.from({ length: me.maxHp }).map((_, i) => (
                         <HpHeartIcon key={i} size={me.maxHp >= 6 ? 9.5 : (me.maxHp >= 5 ? 10.5 : 11)} lost={i >= me.hp} />
                       ))}
                     </div>
                     <span className="my-hero-hp-text">
                       {me.hp}/{me.maxHp}
                     </span>
                     {me.drankWine && <span className="my-hero-wine-status">🍷 Say</span>}
                   </div>
               </div>

               {/* 3. Khung thẻ Tướng: Nằm ở dưới cùng */}
               <div className="my-hero-dock">
                   <div className="my-hero-dock-body" style={{ position: 'relative' }}>
                       {/* Overlay BẠN ĐÃ TỬ TRẬN nổi bật khi thực sự chết */}
                       {isDead && (
                         <div 
                           style={{ 
                             position: 'absolute', 
                             top: 0, 
                             left: 0, 
                             width: '100%', 
                             height: '100%', 
                             background: 'rgba(11, 15, 25, 0.82)', 
                             backdropFilter: 'blur(2px)', 
                             display: 'flex', 
                             alignItems: 'center', 
                             justifyContent: 'center', 
                             zIndex: 35, 
                             borderRadius: '8px' 
                           }}
                         >
                           <div 
                             style={{ 
                               background: 'linear-gradient(135deg, #b91c1c 0%, #450a0a 100%)', 
                               border: '2px solid #ef4444', 
                               color: '#fef08a', 
                               padding: '4px 12px', 
                               borderRadius: '5px', 
                               fontSize: '0.82rem', 
                               fontWeight: '900', 
                               letterSpacing: '1px', 
                               boxShadow: '0 4px 16px rgba(0,0,0,0.9), 0 0 12px rgba(239,68,68,0.7)', 
                               textTransform: 'uppercase', 
                               transform: 'rotate(-5deg)',
                               whiteSpace: 'nowrap'
                             }}
                           >
                             💀 BẠN ĐÃ TỬ TRẬN
                           </div>
                         </div>
                       )}
                       {/* Overlay BẠN ĐANG HẤP HỐI khi sinh lực <= 0 */}
                       {isDying && (
                         <div 
                           style={{ 
                             position: 'absolute', 
                             top: 0, 
                             left: 0, 
                             width: '100%', 
                             height: '100%', 
                             background: 'rgba(69, 10, 10, 0.78)', 
                             backdropFilter: 'blur(2px)', 
                             display: 'flex', 
                             alignItems: 'center', 
                             justifyContent: 'center', 
                             zIndex: 35, 
                             borderRadius: '8px' 
                           }}
                         >
                           <div 
                             style={{ 
                               background: 'linear-gradient(135deg, #dc2626 0%, #b45309 100%)', 
                               border: '2px solid #f59e0b', 
                               color: '#fef08a', 
                               padding: '4px 12px', 
                               borderRadius: '5px', 
                               fontSize: '0.82rem', 
                               fontWeight: '900', 
                               letterSpacing: '1px', 
                               boxShadow: '0 4px 16px rgba(0,0,0,0.9), 0 0 14px rgba(245,158,11,0.8)', 
                               textTransform: 'uppercase', 
                               transform: 'rotate(-3deg)',
                               whiteSpace: 'nowrap'
                             }}
                           >
                             ⚠️ BẠN ĐANG HẤP HỐI
                           </div>
                         </div>
                       )}
                       {/* Avatars */}
                       <div className="my-hero-avatars" style={{ filter: isDead ? 'grayscale(70%) opacity(0.55)' : (isDying ? 'sepia(30%)' : 'none') }}>
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
                                   <span className="my-hero-reveal-label">{(!me.revealedHeroes[0] && !me.revealedHeroes[1]) ? "TƯỚNG 1" : "CHÍNH ẨN"}</span>
                                   <button 
                                     className="btn-action warning my-hero-reveal-btn" 
                                     disabled={!canRevealHero}
                                     title={!canRevealHero 
                                       ? "Chỉ có thể mở tướng trong lượt của bạn hoặc khi có sự kiện kích hoạt" 
                                       : "Lật mở tướng này làm Tướng Chính"} 
                                     onClick={(e) => { 
                                       e.stopPropagation(); 
                                       if (!canRevealHero) return;
                                       handleRevealClick(0); 
                                     }}
                                   >
                                     Lật
                                   </button>
                                   <button className="btn-action secondary my-hero-view-btn" onClick={(e) => { e.stopPropagation(); setHeroPopup(me); }}>Xem</button>
                                 </div>
                               )}
                           </div>

                           {/* Avatar 2 */}
                           <div className={`my-hero-avatar-card ${isTargetable ? 'targetable' : ''} ${isSelected ? 'selected' : ''}`} onClick={onAvatarClick}>
                               {me.heroes?.[1]?.image ? <img src={`/images/heroes/${me.heroes?.[1].image}`} className="my-hero-avatar-img" /> : <div className="my-hero-avatar-emoji">{(me.heroes?.[1]?.emoji || '')}</div>}
                               {me.revealedHeroes && !me.revealedHeroes[1] && (
                                 <div className="my-hero-reveal-overlay" onClick={(e) => { e.stopPropagation(); setHeroPopup(me); }}>
                                   <span className="my-hero-reveal-label">{(!me.revealedHeroes[0] && !me.revealedHeroes[1]) ? "TƯỚNG 2" : "PHÓ ẨN"}</span>
                                   <button 
                                     className="btn-action warning my-hero-reveal-btn" 
                                     disabled={!canRevealHero}
                                     title={!canRevealHero 
                                       ? "Chỉ có thể mở tướng trong lượt của bạn hoặc khi có sự kiện kích hoạt" 
                                       : (!me.revealedHeroes[0] ? "Lật mở tướng này làm Tướng Chính" : "Lật mở Phó Tướng")}
                                     onClick={(e) => { 
                                       e.stopPropagation(); 
                                       if (!canRevealHero) return;
                                       handleRevealClick(1); 
                                     }}
                                   >
                                     Lật
                                   </button>
                                   <button className="btn-action secondary my-hero-view-btn" onClick={(e) => { e.stopPropagation(); setHeroPopup(me); }}>Xem</button>
                                 </div>
                               )}
                           </div>
                       </div>
                   </div>
               </div>
           </div>

           {/* ZONE 2: HAND FAN (Chính giữa đáy) */}
           <div className="my-hero-hand-zone">
               <div className="my-hero-hand-wrapper">
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
