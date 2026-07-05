import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PHASES, CARD_TYPES } from '../../data/gameData';
import { getCardBg } from '../../utils/cardStyles';

// Helper for card badge colors
function getBadgeColor(card) {
  if (card.type === CARD_TYPES.BASIC) {
    if (card.name === 'Chém') return 'rgba(239, 68, 68, 0.9)'; // red-500
    if (card.name === 'Né') return 'rgba(59, 130, 246, 0.9)'; // blue-500
    if (card.name === 'Đào') return 'rgba(34, 197, 94, 0.9)'; // green-500
    if (card.name === 'Rượu') return 'rgba(168, 85, 247, 0.9)'; // purple-500
  }
  if (card.type === CARD_TYPES.TRICK) return 'rgba(234, 179, 8, 0.9)'; // yellow-500
  if (card.type === CARD_TYPES.EQUIP) return 'rgba(100, 116, 139, 0.9)'; // slate-500
  return 'rgba(0,0,0,0.5)';
}

// @ts-check
/** 
 * @typedef {import('../../engine/types/view/PlayerViewModel').PlayerViewModel} PlayerViewModel
 * @typedef {import('../../engine/types/view/GameViewModel').GameViewModel} GameViewModel
 * 
 * @typedef {Object} PlayerHandProps
 * @property {PlayerViewModel} me
 * @property {GameViewModel} gameState
 * @property {boolean} needsDiscard
 * @property {boolean} isMyTurn
 * @property {string} [activeSkill]
 * @property {any} targetSession
 * @property {Array<number>} selectedDiscards
 * @property {Function} handleDiscardToggle
 * @property {Function} handleCardClick
 * 
 * @param {PlayerHandProps} props
 */


export function PlayerHand(props) {
    const {
        me,
        gameState,
        needsDiscard,
        isMyTurn,
        activeSkill,
        targetSession,
        selectedDiscards,
        handleDiscardToggle,
        handleCardClick
    } = props;

    const [isExpanded, setIsExpanded] = useState(false);
    const MAX_VISIBLE = 6;
    
    // Determine cards to display
    const displayCards = (!isExpanded && me.hand.length > MAX_VISIBLE) 
        ? me.hand.slice(0, MAX_VISIBLE) 
        : me.hand;
    const hiddenCount = me.hand.length - MAX_VISIBLE;

    return (
        <>
            <div className="hand-cards">
                {displayCards.map((card, i) => {
                    // Keep original index for interaction logic
                    const originalIndex = i; 
                    let isPlayable = false;
                    if (needsDiscard) {
                        isPlayable = true;
                    } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                        // If there is an active skill, check if the skill makes it playable visually
                        if (activeSkill === 'Dời Núi' && (card.name === 'Né' || card.name === 'Chém')) {
                            isPlayable = true;
                        } else if (activeSkill === 'Khai Thiên' && card.color === 'red') {
                            isPlayable = true;
                        } else if (activeSkill === 'Kỳ Tập' && card.color === 'black') {
                            isPlayable = true;
                        } else {
                            isPlayable = card.isPlayable;
                        }
                    }
                    
                    return (
                    <div
                        key={`${card.id}-${originalIndex}-inline`}
                        className={`card ${card.type} ${targetSession?.cardIndex === originalIndex ? 'selected' : ''} ${selectedDiscards.includes(originalIndex) ? 'selected' : ''} ${!isPlayable ? 'unplayable' : ''}`}
                        style={getCardBg(card.name) ? { backgroundImage: `url(${getCardBg(card.name)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: !isPlayable ? 0.4 : 1, cursor: !isPlayable ? 'not-allowed' : 'pointer' } : { opacity: !isPlayable ? 0.4 : 1, cursor: !isPlayable ? 'not-allowed' : 'pointer' }}
                        onClick={() => {
                            if (needsDiscard) {
                                handleDiscardToggle(originalIndex);
                            } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                                if (isPlayable || activeSkill) { // Allow click if activeSkill is converting it
                                    handleCardClick(originalIndex);
                                } else if (targetSession) {
                                    cancelTargeting();
                                }
                            }
                        }}
                        title={`${card.name}: ${card.desc}`}
                    >
                        <div className="card-suit-corner" style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '0.75rem', color: card.color === 'red' ? '#ef4444' : '#111', background: 'rgba(255, 255, 255, 0.85)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {card.suit} {card.rank}
                        </div>
                        {getCardBg(card.name) && (
                        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: getBadgeColor(card), color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {card.name}
                        </div>
                        )}
                        {!getCardBg(card.name) && (
                        <div className="card-inner" style={{ paddingTop: '12px' }}>
                            <span className="card-icon">{card.emoji}</span>
                            <span className="card-name">{card.name}</span>
                            <span className="card-type-badge">
                            {card.type === CARD_TYPES.BASIC ? (
                                card.name === 'Chém' ? 'Tấn công' :
                                card.name === 'Né' ? 'Phòng thủ' :
                                card.name === 'Đào' ? 'Hồi phục' :
                                card.name === 'Rượu' ? 'Cường hóa' : 'Cơ bản'
                            ) :
                                card.type === CARD_TYPES.TRICK ? 'Cẩm nang' :
                                card.type === CARD_TYPES.EQUIP ? 'Trang bị' : 'Khác'}
                            </span>
                        </div>
                        )}
                    </div>
                    );
                })}
                
                {/* Show More Card */}
                {!isExpanded && hiddenCount > 0 && (
                    <div 
                        className="card trick" 
                        onClick={() => setIsExpanded(true)} 
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', cursor: 'pointer', border: '2px dashed var(--color-gold)', opacity: 0.9 }}
                        title="Bấm để xem toàn bộ bài trên tay"
                    >
                        <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>+{hiddenCount}</span>
                        <div style={{ fontSize: '0.9rem', marginTop: '10px', color: 'white', fontWeight: 'bold' }}>Lá bài ẩn</div>
                        <div style={{ fontSize: '0.7rem', marginTop: '5px', color: '#9ca3af' }}>(Bấm để xòe bài)</div>
                    </div>
                )}
            </div>

            {/* EXPANDED POPUP MODAL VIA PORTAL */}
            {isExpanded && typeof window !== 'undefined' && createPortal(
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px'
                }}>
                    <h2 style={{ color: 'var(--color-gold)', fontSize: '2rem', marginBottom: '20px', textShadow: '0 0 20px rgba(212, 168, 67, 0.5)' }}>
                        Toàn Bộ Bài Trên Tay ({me.hand.length} Lá)
                    </h2>
                    
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '20px',
                        justifyContent: 'center',
                        alignContent: 'flex-start',
                        width: '95vw',
                        maxWidth: '1400px',
                        height: '80vh',
                        overflowY: 'auto',
                        padding: '40px',
                        background: 'rgba(17, 24, 39, 0.95)',
                        border: '2px solid var(--color-gold)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 10px 50px rgba(0,0,0,0.9)'
                    }}>
                        {me.hand.map((card, i) => {
                            const originalIndex = i; 
                            let isPlayable = false;
                            if (needsDiscard) {
                                isPlayable = true;
                            } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                                if (activeSkill === 'Dời Núi' && (card.name === 'Né' || card.name === 'Chém')) {
                                    isPlayable = true;
                                } else if (activeSkill === 'Khai Thiên' && card.color === 'red') {
                                    isPlayable = true;
                                } else if (activeSkill === 'Kỳ Tập' && card.color === 'black') {
                                    isPlayable = true;
                                } else {
                                    isPlayable = card.isPlayable;
                                }
                            }
                            
                            return (
                            <div
                                key={`${card.id}-${originalIndex}-popup`}
                                className={`card ${card.type} ${targetSession?.cardIndex === originalIndex ? 'selected' : ''} ${selectedDiscards.includes(originalIndex) ? 'selected' : ''} ${!isPlayable ? 'unplayable' : ''}`}
                                style={getCardBg(card.name) ? { backgroundImage: `url(${getCardBg(card.name)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: !isPlayable ? 0.4 : 1, cursor: !isPlayable ? 'not-allowed' : 'pointer' } : { opacity: !isPlayable ? 0.4 : 1, cursor: !isPlayable ? 'not-allowed' : 'pointer' }}
                                onClick={() => {
                                    if (needsDiscard) {
                                        handleDiscardToggle(originalIndex);
                                    } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                                        if (isPlayable || activeSkill) { 
                                            handleCardClick(originalIndex);
                                            setIsExpanded(false); // Auto close on play
                                        }
                                    }
                                }}
                                title={`${card.name}: ${card.desc}`}
                            >
                                <div className="card-suit-corner" style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '0.75rem', color: card.color === 'red' ? '#ef4444' : '#111', background: 'rgba(255, 255, 255, 0.85)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                {card.suit} {card.rank}
                                </div>
                                {getCardBg(card.name) && (
                                <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: getBadgeColor(card), color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                    {card.name}
                                </div>
                                )}
                                {!getCardBg(card.name) && (
                                <div className="card-inner" style={{ paddingTop: '12px' }}>
                                    <span className="card-icon">{card.emoji}</span>
                                    <span className="card-name">{card.name}</span>
                                    <span className="card-type-badge">
                                    {card.type === CARD_TYPES.BASIC ? (
                                        card.name === 'Chém' ? 'Tấn công' :
                                        card.name === 'Né' ? 'Phòng thủ' :
                                        card.name === 'Đào' ? 'Hồi phục' :
                                        card.name === 'Rượu' ? 'Cường hóa' : 'Cơ bản'
                                    ) :
                                        card.type === CARD_TYPES.TRICK ? 'Cẩm nang' :
                                        card.type === CARD_TYPES.EQUIP ? 'Trang bị' : 'Khác'}
                                    </span>
                                </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                    
                    <button 
                        className="btn-action primary" 
                        style={{ marginTop: '30px', padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px' }}
                        onClick={() => setIsExpanded(false)}
                    >
                        ◂ Thu gọn
                    </button>
                </div>
            , document.body)}
        </>
    );
}
