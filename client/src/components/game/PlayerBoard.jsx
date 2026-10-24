import { getSuitEmoji } from 'shared/constants/cardTypes';
import React from 'react';
import { CARD_SUBTYPES, getCardSubType } from 'shared/data/gameData';
import { getCardBg } from 'shared/utils/cardStyles';
import { WeaponIcon, ArmorIcon, MountAtkIcon, MountDefIcon, HpHeartIcon, HandCardsIcon, RangeIcon, DistanceIcon } from '../common/GameIcons';

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
 * @property {string} [animationClass]
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
    style,
    animationClass
}) {
    const isTargetable = targetSession?.validTargets.includes(player.id);
    const isSelected = targetSession?.selectedTargets.includes(player.id);

    // Support both Array and Object equipment structures
    const getEquipCard = (slotType) => {
        if (!player.equipment) return null;
        if (Array.isArray(player.equipment)) {
            return player.equipment.find(c => getCardSubType(c) === slotType);
        }
        return player.equipment[slotType] || player.equipment[slotType.replace('equip_', '')];
    };

    const getFactionColor = (faction, isDaTam) => {
        if (isDaTam) return '#9ca3af';
        if (faction === 'Lạc') return '#10b981';
        if (faction === 'Sơn') return '#b45309';
        if (faction === 'Hà') return '#3b82f6';
        if (faction === 'Việt') return '#ef4444';
        return '#64748b';
    };

    const renderHeroSlot = (slotIdx) => {
        const isRevealed = Boolean(player.revealedHeroes?.[slotIdx]);
        const hero = player.heroes?.[slotIdx];
        const roleLabel = slotIdx === 0 ? 'Chính' : 'Phó';

        if (!isRevealed) {
            return (
                <div 
                    key={slotIdx}
                    className="opponent-hero-slot facedown"
                    style={{
                        width: '54px',
                        height: '76px',
                        borderRadius: '6px',
                        background: 'linear-gradient(145deg, #1e293b 0%, #0b1120 100%)',
                        border: '1.5px solid rgba(212, 168, 67, 0.45)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.5)',
                        userSelect: 'none'
                    }}
                    title={`Tướng ${roleLabel}: Chưa lộ diện (Bấm để xem thông tin)`}
                >
                    <div style={{ fontSize: '1.4rem', opacity: 0.85, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
                        🕵️
                    </div>
                    <div style={{ fontSize: '0.52rem', color: '#f59e0b', fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {roleLabel} Ẩn
                    </div>
                </div>
            );
        }

        const heroFaction = hero?.faction || player.faction || 'none';
        const borderColor = getFactionColor(heroFaction, player.isDaTam);

        return (
            <div 
                key={slotIdx}
                className="opponent-hero-slot faceup"
                style={{
                    width: '54px',
                    height: '76px',
                    borderRadius: '6px',
                    background: '#0f172a',
                    border: `1.5px solid ${borderColor}`,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `0 2px 8px ${borderColor}40`,
                    userSelect: 'none'
                }}
                title={`${hero?.name || 'Võ Tướng'} (${roleLabel} Tướng) - Bấm để xem chi tiết`}
            >
                {hero?.image ? (
                    <img 
                        src={`/images/heroes/${hero.image}`} 
                        alt={hero.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                        {hero?.emoji || '⚔️'}
                    </div>
                )}
                <div 
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
                        padding: '2px 1px',
                        textAlign: 'center',
                        fontSize: '0.55rem',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {hero?.name || `Tướng ${slotIdx + 1}`}
                </div>
            </div>
        );
    };

    return (
        <div
            className={`player-zone ${isCurrentTurn ? 'is-current-turn' : ''} ${!player.isAlive ? 'dead' : ''} ${className || ''} ${animationClass || ''}`}
            style={{
              ...style,
              cursor: isTargetable ? 'crosshair' : 'pointer',
              outline: isSelected ? '3px solid var(--color-gold)' : (isTargetable ? '3px dashed #ef4444' : 'none'),
              outlineOffset: '4px',
              borderRadius: '10px'
            }}
            onClick={() => {
              if (isTargetable) {
                handleTargetClick(player.id);
              } else {
                setHeroPopup(player);
              }
            }}
          >
            {/* Target Distance Indicator */}
            {(() => {
               if (!isTargetable) return null;
               
               let rng = me.attackRange;
               const virtualName = targetSession.virtualCardName || targetSession.card?.name;
               
               if (virtualName === 'Chém' || virtualName === null) {
                  const hasNoThanOrThuyTo = me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'no-than' || s.id === 'thuy-to'));
                  if (hasNoThanOrThuyTo && targetSession.card) {
                      const rankMap = { 'A': 1, 'J': 11, 'Q': 12, 'K': 13 };
                      const r = rankMap[targetSession.card.rank] || parseInt(targetSession.card.rank, 10);
                      rng = Math.max(rng, r);
                  }
               }
               return (
                 <div className="target-distance-banner" style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', zIndex: 30, fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
                   ⚔️ Tầm: {rng} | 🛡️ Cự ly: {player.distanceFromMe}
                 </div>
               );
            })()}

            {/* Header: Player Name + Faction Badge */}
            <div className="player-header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '4px', marginBottom: '2px' }}>
              <div className="player-name" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isCurrentTurn ? 'var(--color-gold)' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                {player.name}
                {isCurrentTurn && ' 🎯'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {!player.isRevealed ? (
                  <span className="player-faction-badge unrevealed" style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: '#334155', color: '#cbd5e1', fontWeight: 'bold' }}>
                    🕵️ ẨN
                  </span>
                ) : (
                  <span className={`player-faction-badge ${player.faction?.toLowerCase()}`} style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: getFactionColor(player.faction, player.isDaTam), color: 'white', fontWeight: 'bold' }}>
                    {player.isDaTam ? '🐺 DÃ TÂM' : player.faction?.toUpperCase()}
                  </span>
                )}
                {player.isRevealed && me.faction && player.faction && (
                  <span style={{ fontSize: '0.52rem', color: (me.faction === player.faction && !me.isDaTam && !player.isDaTam) ? '#10b981' : '#f87171', fontWeight: 'bold' }}>
                    {(me.faction === player.faction && !me.isDaTam && !player.isDaTam) ? '🤝' : '⚔️'}
                  </span>
                )}
              </div>
            </div>

            {/* Dual Hero Container (Hình chữ nhật chứa 2 thẻ tướng Chính & Phó) */}
            <div 
              className="opponent-dual-hero-frame" 
              style={{ 
                display: 'flex', 
                gap: '5px', 
                position: 'relative', 
                width: '100%', 
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.45)',
                padding: '4px',
                borderRadius: '8px',
                border: `1.5px solid ${player.isRevealed ? getFactionColor(player.faction, player.isDaTam) : 'rgba(255,255,255,0.18)'}`,
                boxSizing: 'border-box'
              }}
            >
              {/* Overlays for Silenced & Chained */}
              {player.isSilenced && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2rem', background: 'rgba(0,0,0,0.65)', padding: '6px', borderRadius: '50%', zIndex: 20 }} title="Kỹ năng bị khóa!">
                  🔒
                </div>
              )}
              {player.isChained && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 18, pointerEvents: 'none' }} title="Bị Xích!">
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(45deg)', fontSize: '2.5rem', opacity: 0.9 }}>⛓️</div>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '2.5rem', opacity: 0.9 }}>⛓️</div>
                </div>
              )}

              {/* Judgement Area */}
              {player.judgementArea && player.judgementArea.length > 0 && (
                <div className="judgement-area" style={{ display: 'flex', gap: '3px', position: 'absolute', top: '-10px', left: '2px', zIndex: 25 }}>
                  {player.judgementArea.map((card, i) => {
                    const icon = card.emoji || (card.name === 'Sấm Sét' ? '⚡' : card.name === 'Hỗn Loạn' ? '🌀' : '📜');
                    return (
                      <div 
                        key={i} 
                        className="judgement-item" 
                        title={`${card.name}: Cẩm nang trì hoãn`} 
                        style={{ 
                          background: 'rgba(0,0,0,0.85)', 
                          border: '1px solid #f59e0b', 
                          borderRadius: '4px', 
                          padding: '1px 4px', 
                          fontSize: '0.75rem', 
                          boxShadow: '0 0 6px rgba(245, 158, 11, 0.7)' 
                        }}
                      >
                        {icon}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Slot 1: Chính tướng */}
              {renderHeroSlot(0)}
              {/* Slot 2: Phó tướng */}
              {renderHeroSlot(1)}
            </div>

            {/* HP Bar */}
            <div className="player-hp-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '3px', padding: '0 2px' }}>
              <div className="hero-hp-hearts" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {Array.from({ length: player.maxHp }).map((_, i) => (
                  <HpHeartIcon key={i} size={player.maxHp >= 6 ? 11 : 12.5} lost={i >= player.hp} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                  {player.hp}/{player.maxHp}
                </span>
                {player.drankWine && (
                  <span title="Đang say rượu (+1 Sát thương)" style={{ fontSize: '0.75rem' }}>🍷</span>
                )}
              </div>
            </div>

            {/* Stat Badges: Hand Cards, Attack Range, Distance */}
            <div className="player-stat-badges" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '4px', marginTop: '2px' }}>
              <span className="player-stat-badge stat-cards" title={`Số lá bài trên tay: ${player.hand.length}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#f8fafc' }}>
                <HandCardsIcon size={15} /> <span>{player.hand.length}</span>
              </span>
              <span className="player-stat-badge stat-range" title={`Tầm đánh của người này: ${player.attackRange}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', background: 'rgba(153, 27, 27, 0.4)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#fca5a5' }}>
                <RangeIcon size={15} /> <span>{player.attackRange}</span>
              </span>
              <span className="player-stat-badge stat-distance" title={`Khoảng cách từ bạn đến người này: ${player.distanceFromMe}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', background: 'rgba(30, 58, 138, 0.4)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#93c5fd' }}>
                <DistanceIcon size={15} /> <span>{player.distanceFromMe}</span>
              </span>
            </div>

            {/* Compact Mini Equipment Row (Nằm gọn gàng trong khung đối thủ) */}
            <div className="equipment-area opponent-equipment-row" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '3px', marginTop: '3px' }}>
              {[
                { type: CARD_SUBTYPES.EQUIP_WEAPON, icon: <WeaponIcon size={13} />, title: 'Vũ khí' },
                { type: CARD_SUBTYPES.EQUIP_ARMOR, icon: <ArmorIcon size={13} />, title: 'Phòng cụ' },
                { type: CARD_SUBTYPES.EQUIP_MOUNT_ATK, icon: <MountAtkIcon size={13} />, title: 'Ngựa công (-1)' },
                { type: CARD_SUBTYPES.EQUIP_MOUNT_DEF, icon: <MountDefIcon size={13} />, title: 'Ngựa thủ (+1)' }
              ].map((slot, i) => {
                const eqCard = getEquipCard(slot.type);
                const bgImage = eqCard ? getCardBg(eqCard.name) : null;
                return (
                  <div 
                    key={i} 
                    className={`equip-slot ${eqCard ? 'equipped' : 'empty'}`} 
                    title={eqCard ? `${eqCard.name}: ${eqCard.desc}` : slot.title} 
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '4px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      position: 'relative',
                      background: eqCard ? (bgImage ? `url(${bgImage})` : 'rgba(212, 168, 67, 0.25)') : 'rgba(15, 23, 42, 0.5)',
                      backgroundSize: 'cover',
                      border: eqCard ? '1px solid var(--color-gold)' : '1px dashed rgba(255,255,255,0.15)',
                      cursor: eqCard ? 'pointer' : 'default',
                      boxShadow: eqCard ? '0 0 6px rgba(212, 168, 67, 0.5)' : 'none'
                    }} 
                    onClick={(e) => { 
                      if (eqCard) {
                        e.stopPropagation();
                        setCardPopup(eqCard);
                      }
                    }}
                  >
                    {eqCard ? (
                      <span style={{ fontSize: '0.52rem', color: eqCard.color === 'red' ? '#ef4444' : '#ffffff', fontWeight: 'bold', textShadow: '0 0 3px black' }}>
                        {getSuitEmoji(eqCard.suit)}{eqCard.rank}
                      </span>
                    ) : (
                      <span style={{ opacity: 0.35, display: 'flex' }}>{slot.icon}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
    );
}

