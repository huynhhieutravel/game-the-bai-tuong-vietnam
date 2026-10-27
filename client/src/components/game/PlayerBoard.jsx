import { getSuitEmoji } from 'shared/constants/cardTypes';
import React from 'react';
import { CARD_SUBTYPES, getCardSubType } from 'shared/data/gameData';
import { getCardBg } from 'shared/utils/cardStyles';
import { getFactionColor, isSameFaction } from 'shared/utils/translationHelper';
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
    const isDead = player.isAlive === false;
    const isDying = player.isAlive !== false && typeof player.hp === 'number' && player.hp <= 0;

    // Support both Array and Object equipment structures
    const getEquipCard = (slotType) => {
        if (!player.equipment) return null;
        if (Array.isArray(player.equipment)) {
            return player.equipment.find(c => getCardSubType(c) === slotType);
        }
        return player.equipment[slotType] || 
               player.equipment[slotType.replace('equip_', '')] ||
               (slotType === CARD_SUBTYPES.EQUIP_MOUNT_DEF ? (player.equipment.horse_defense || player.equipment.mount_defense) : null) ||
               (slotType === CARD_SUBTYPES.EQUIP_MOUNT_ATK ? (player.equipment.horse_attack || player.equipment.mount_attack) : null);
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
                        width: '42px',
                        height: '58px',
                        borderRadius: '5px',
                        background: 'linear-gradient(145deg, #1e293b 0%, #0b1120 100%)',
                        border: '1.2px solid rgba(212, 168, 67, 0.45)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.4)',
                        userSelect: 'none'
                    }}
                    title={`Tướng ${roleLabel}: Chưa lộ diện (Bấm để xem thông tin)`}
                >
                    <div style={{ fontSize: '1.15rem', opacity: 0.85, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
                        🕵️
                    </div>
                    <div style={{ fontSize: '0.46rem', color: '#f59e0b', fontWeight: 'bold', marginTop: '1px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
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
                    width: '42px',
                    height: '58px',
                    borderRadius: '5px',
                    background: '#0f172a',
                    border: `1.2px solid ${borderColor}`,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `0 2px 6px ${borderColor}40`,
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
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
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
                        padding: '1px 2px',
                        textAlign: 'center',
                        fontSize: '0.48rem',
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
            className={`player-zone ${isCurrentTurn ? 'is-current-turn' : ''} ${isDead ? 'dead' : ''} ${className || ''} ${animationClass || ''}`}
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

            {/* Header: Player Name (Toàn bộ chiều rộng, không bị badge che khuất) */}
            <div className="player-header-bar" style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
              <div className="player-name" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isCurrentTurn ? 'var(--color-gold)' : (isDead ? '#94a3b8' : (isDying ? '#fca5a5' : '#f8fafc')), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                {player.name}
                {isCurrentTurn && ' 🎯'}
              </div>
            </div>

            {/* Dual Hero Container (Hình chữ nhật chứa 2 thẻ tướng Chính & Phó) */}
            <div 
              className="opponent-dual-hero-frame" 
              style={{ 
                display: 'flex', 
                gap: '3px', 
                position: 'relative', 
                width: '100%', 
                justifyContent: 'center', 
                background: 'rgba(0, 0, 0, 0.45)', 
                padding: '3px', 
                borderRadius: '6px', 
                border: `1.2px solid ${isDead ? '#ef4444' : (isDying ? '#f97316' : (player.isRevealed ? getFactionColor(player.faction, player.isDaTam) : 'rgba(255,255,255,0.18)'))}`, 
                boxSizing: 'border-box',
                filter: isDead ? 'grayscale(70%) opacity(0.55)' : (isDying ? 'sepia(30%)' : 'none')
              }}
            >
              {/* Badge Phe / Tử Trận / Hấp Hối nằm ở góc phải bên ngoài khung tướng */}
              <div style={{ position: 'absolute', top: '-8px', right: '3px', zIndex: 26, display: 'flex', alignItems: 'center', gap: '2px' }}>
                {isDead ? (
                  <span className="player-dead-badge" style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)', color: '#fef08a', fontWeight: 'bold', border: '1px solid #ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.5)', whiteSpace: 'nowrap' }}>
                    💀 TỬ TRẬN
                  </span>
                ) : isDying ? (
                  <span className="player-dying-badge" style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: 'linear-gradient(135deg, #ea580c 0%, #b45309 100%)', color: '#fef08a', fontWeight: 'bold', border: '1px solid #f97316', boxShadow: '0 0 6px rgba(249,115,22,0.7)', whiteSpace: 'nowrap', animation: 'pulse 1.2s infinite' }}>
                    ⚠️ HẤP HỐI
                  </span>
                ) : !player.isRevealed ? (
                  <span className="player-faction-badge unrevealed" style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: '#334155', color: '#cbd5e1', fontWeight: 'bold' }}>
                    ẨN
                  </span>
                ) : (
                  <span className={`player-faction-badge ${player.faction?.toLowerCase()}`} style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: getFactionColor(player.faction, player.isDaTam), color: 'white', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    {player.isDaTam ? 'DÃ TÂM' : player.faction?.toUpperCase()}
                    {me.faction && player.faction && (
                      <span style={{ fontSize: '0.52rem' }}>
                        {(isSameFaction(me, player) && !me.isDaTam && !player.isDaTam) ? '🤝' : '⚔️'}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Overlay TỬ TRẬN khi người chơi thực sự chết */}
              {isDead && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    background: 'rgba(15, 23, 42, 0.82)', 
                    backdropFilter: 'blur(1.5px)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 35, 
                    borderRadius: '5px' 
                  }}
                >
                  <div 
                    style={{ 
                      background: 'linear-gradient(135deg, #b91c1c 0%, #450a0a 100%)', 
                      border: '1.5px solid #ef4444', 
                      color: '#fef08a', 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.72rem', 
                      fontWeight: '900', 
                      letterSpacing: '1px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.9), 0 0 10px rgba(239,68,68,0.6)', 
                      textTransform: 'uppercase', 
                      transform: 'rotate(-8deg)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    💀 TỬ TRẬN
                  </div>
                </div>
              )}

              {/* Overlay HẤP HỐI khi sinh lực <= 0 nhưng còn sống chờ cứu */}
              {isDying && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    background: 'rgba(69, 10, 10, 0.75)', 
                    backdropFilter: 'blur(1.5px)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 35, 
                    borderRadius: '5px' 
                  }}
                >
                  <div 
                    style={{ 
                      background: 'linear-gradient(135deg, #dc2626 0%, #b45309 100%)', 
                      border: '1.5px solid #f59e0b', 
                      color: '#fef08a', 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.70rem', 
                      fontWeight: '900', 
                      letterSpacing: '1px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.9), 0 0 10px rgba(245,158,11,0.7)', 
                      textTransform: 'uppercase', 
                      transform: 'rotate(-5deg)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ⚠️ HẤP HỐI
                  </div>
                </div>
              )}
              {/* Overlays for Silenced & Chained */}
              {player.isSilenced && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.6rem', background: 'rgba(0,0,0,0.65)', padding: '4px', borderRadius: '50%', zIndex: 20 }} title="Kỹ năng bị khóa!">
                  🔒
                </div>
              )}
              {player.isChained && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 18, pointerEvents: 'none' }} title="Bị Xích!">
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(45deg)', fontSize: '2rem', opacity: 0.9 }}>⛓️</div>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '2rem', opacity: 0.9 }}>⛓️</div>
                </div>
              )}

              {/* Judgement Area */}
              {player.judgementArea && player.judgementArea.length > 0 && (
                <div className="judgement-area" style={{ display: 'flex', gap: '2px', position: 'absolute', top: '-9px', left: '2px', zIndex: 25 }}>
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
                          padding: '0 3px', 
                          fontSize: '0.68rem', 
                          boxShadow: '0 0 5px rgba(245, 158, 11, 0.7)' 
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
            <div className="player-hp-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '2px', padding: '0 1px' }}>
              <div className="hero-hp-hearts" style={{ display: 'flex', alignItems: 'center', gap: '1.5px' }}>
                {Array.from({ length: player.maxHp }).map((_, i) => (
                  <HpHeartIcon key={i} size={player.maxHp >= 6 ? 9 : 10.5} lost={i >= player.hp} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                  {player.hp}/{player.maxHp}
                </span>
                {player.drankWine && (
                  <span title="Đang say rượu (+1 Sát thương)" style={{ fontSize: '0.7rem' }}>🍷</span>
                )}
              </div>
            </div>

            {/* Stat Badges: Hand Cards, Attack Range, Distance */}
            <div className="player-stat-badges" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '2px', marginTop: '2px' }}>
              <span className="player-stat-badge stat-cards" title={`Số lá bài trên tay: ${player.hand?.length ?? player.handCount ?? 0}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '3px', padding: '1px 2px', fontSize: '0.68rem', fontWeight: 'bold', color: '#f8fafc' }}>
                <HandCardsIcon size={12} /> <span>{player.hand?.length ?? player.handCount ?? 0}</span>
              </span>
              <span className="player-stat-badge stat-range" title={`Tầm đánh của người này: ${player.attackRange}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', background: 'rgba(153, 27, 27, 0.4)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '3px', padding: '1px 2px', fontSize: '0.68rem', fontWeight: 'bold', color: '#fca5a5' }}>
                <RangeIcon size={12} /> <span>{player.attackRange}</span>
              </span>
              <span className="player-stat-badge stat-distance" title={`Khoảng cách từ bạn đến người này: ${player.distanceFromMe}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', background: 'rgba(30, 58, 138, 0.4)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '3px', padding: '1px 2px', fontSize: '0.68rem', fontWeight: 'bold', color: '#93c5fd' }}>
                <DistanceIcon size={12} /> <span>{player.distanceFromMe}</span>
              </span>
            </div>

            {/* Compact Mini Equipment Row (Nằm gọn gàng trong khung đối thủ) */}
            <div 
              className="equipment-area opponent-equipment-row" 
              style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '2px', marginTop: '2px', cursor: 'pointer' }}
              onClick={(e) => {
                if (isTargetable) {
                  handleTargetClick(player.id);
                  return;
                }
                e.stopPropagation();
                if (setHeroPopup) {
                  setHeroPopup({ ...player, initialTab: 'equipment' });
                }
              }}
              title={isTargetable ? `Nhấn để chọn ${player.name || 'người chơi này'}` : "Nhấn để xem chi tiết trang bị & phán xét"}
            >
              {[
                { type: CARD_SUBTYPES.EQUIP_WEAPON, icon: <WeaponIcon size={11} />, title: 'Vũ khí' },
                { type: CARD_SUBTYPES.EQUIP_ARMOR, icon: <ArmorIcon size={11} />, title: 'Phòng cụ' },
                { type: CARD_SUBTYPES.EQUIP_MOUNT_ATK, icon: <MountAtkIcon size={11} />, title: 'Ngựa công (-1)' },
                { type: CARD_SUBTYPES.EQUIP_MOUNT_DEF, icon: <MountDefIcon size={11} />, title: 'Ngựa thủ (+1)' }
              ].map((slot, i) => {
                const eqCard = getEquipCard(slot.type);
                const isHorse = slot.type === CARD_SUBTYPES.EQUIP_MOUNT_DEF || slot.type === CARD_SUBTYPES.EQUIP_MOUNT_ATK;
                const isHorseDef = slot.type === CARD_SUBTYPES.EQUIP_MOUNT_DEF;
                const bgImage = (!isHorse && eqCard) ? getCardBg(eqCard.name) : null;
                return (
                  <div 
                    key={i} 
                    className={`equip-slot ${eqCard ? 'equipped' : 'empty'} ${isHorse && eqCard ? 'horse-equipped' : ''}`} 
                    title={eqCard ? `${slot.title}: ${eqCard.name} (${getSuitEmoji(eqCard.suit)}${eqCard.rank}${isHorse ? ` - ${isHorseDef ? '+1 Cự ly thủ' : '-1 Cự ly công'}` : ''}) — ${eqCard.desc || ''} (Nhấn để xem)` : `${slot.title} (Trống - Nhấn để xem)`} 
                    style={{ 
                      width: '21px', 
                      height: '21px', 
                      borderRadius: '3px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative', 
                      backgroundColor: eqCard 
                        ? (isHorse ? (isHorseDef ? 'rgba(14, 116, 144, 0.45)' : 'rgba(153, 27, 27, 0.45)') : 'rgba(30, 41, 59, 0.95)') 
                        : 'rgba(15, 23, 42, 0.5)', 
                      backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      border: eqCard 
                        ? (isHorse ? (isHorseDef ? '1px solid #38bdf8' : '1px solid #ef4444') : '1px solid var(--color-gold)') 
                        : '1px dashed rgba(255,255,255,0.15)', 
                      cursor: 'pointer', 
                      boxShadow: eqCard 
                        ? (isHorse ? (isHorseDef ? '0 0 5px rgba(56, 189, 248, 0.6)' : '0 0 5px rgba(239, 68, 68, 0.6)') : '0 0 5px rgba(212, 168, 67, 0.5)') 
                        : 'none',
                      overflow: 'hidden'
                    }} 
                    onClick={(e) => { 
                      e.stopPropagation();
                      if (setHeroPopup) {
                        setHeroPopup({ ...player, initialTab: 'equipment' });
                      }
                    }}
                  >
                    {eqCard ? (
                      <>
                        {/* Biểu tượng nhận diện loại trang bị (Kiếm/Khiên/Ngựa) */}
                        <span style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: isHorse ? (isHorseDef ? '#38bdf8' : '#f87171') : 'var(--color-gold)', 
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.95))',
                          opacity: 0.95
                        }}>
                          {slot.icon}
                        </span>

                        {/* Huy hiệu chỉ số phụ (+1 thủ, -1 công) */}
                        {isHorse ? (
                          <span style={{ 
                            position: 'absolute', 
                            bottom: '0px', 
                            right: '0px', 
                            fontSize: '0.48rem', 
                            color: '#ffffff', 
                            backgroundColor: isHorseDef ? '#0284c7' : '#b91c1c', 
                            borderRadius: '2px', 
                            padding: '0 1.5px', 
                            fontWeight: '900', 
                            lineHeight: 1 
                          }}>
                            {isHorseDef ? '+1' : '-1'}
                          </span>
                        ) : (
                          /* Huy hiệu Chất & Số lá bài ở góc dưới cho Vũ khí / Giáp */
                          <span style={{ 
                            position: 'absolute', 
                            bottom: '0px', 
                            right: '0px', 
                            fontSize: '0.44rem', 
                            color: eqCard.color === 'red' ? '#ef4444' : '#ffffff', 
                            fontWeight: 'bold', 
                            textShadow: '0 0 2px black, 0 1px 2px black',
                            lineHeight: 1,
                            backgroundColor: 'rgba(0,0,0,0.75)',
                            borderRadius: '1px',
                            padding: '0 1px'
                          }}>
                            {getSuitEmoji(eqCard.suit)}{eqCard.rank}
                          </span>
                        )}
                      </>
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

