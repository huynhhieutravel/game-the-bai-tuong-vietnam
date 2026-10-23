import { getSuitEmoji } from 'shared/constants/cardTypes';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PHASES } from 'shared/constants/phases';
import { CARD_TYPES } from 'shared/constants/cardTypes';
import { CARD_TYPE_LABELS } from '../../i18n/vi/cardLabels';
import { getCardBg } from 'shared/utils/cardStyles';

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

// Bounded, auto-scaling card name badge preventing text clipping and multi-line wrapping on mobile
function renderCardNameBadge(card) {
  const name = card.name || '';
  const len = name.length;
  // Dynamic font size ensuring 2-word & long names (e.g. "Quyết Đấu", "Vạn Tiễn Quy Tâm") fit cleanly on 1 line
  let fontSize = '0.74rem';
  if (len > 12) {
    fontSize = '0.50rem';
  } else if (len > 8) {
    fontSize = '0.58rem';
  } else if (len > 5) {
    fontSize = '0.64rem';
  }

  return (
    <div 
      className="card-name-pill"
      style={{ 
        position: 'absolute', 
        bottom: '3px', 
        left: '2px', 
        right: '2px', 
        background: getBadgeColor(card), 
        color: '#ffffff', 
        padding: '1px 2px', 
        borderRadius: '4px', 
        fontSize, 
        lineHeight: 1.2, 
        fontWeight: 'bold', 
        textAlign: 'center', 
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis', 
        border: '1px solid rgba(255,255,255,0.45)', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '18px',
        boxSizing: 'border-box'
      }}
      title={name}
    >
      {name}
    </div>
  );
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
        handleCardClick,
        handleUnplayableClick,
        cancelTargeting
    } = props;

    const [isExpanded, setIsExpanded] = useState(false);
    
    // Quy tắc v3: Nếu bài trên tay nhiều hơn 5 lá (> 5 lá):
    // Hiển thị 4 lá đầu tiên + 1 ô mở rộng "+N" (ví dụ có 6 lá thì hiển thị 4 lá + ô "+2")
    // Giữ số lượng thẻ tối đa trên thanh tay luôn là 5, không bao giờ bị đè tràn lấn vào Hero Dock hay Action Hub
    const hasOverflow = !isExpanded && me.hand.length > 5;
    const displayCards = hasOverflow ? me.hand.slice(0, 4) : me.hand;
    const hiddenCount = me.hand.length - 4;

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
                        } else if (activeSkill === 'Khai Thiên' && card.type === CARD_TYPES.EQUIP) {
                            isPlayable = true;
                        } else if (activeSkill === 'Kỳ Tập' && card.color === 'black') {
                            isPlayable = true;
                        } else if (activeSkill === 'Tiên Duyên' && card.suit === 'club') {
                            isPlayable = true;
                        } else if (activeSkill === 'Thần Hỏa' && card.color === 'red') {
                            isPlayable = true;
                        } else if (activeSkill === 'Định Quốc' && (card.name === 'Né' || card.name === 'Sấm Sét')) {
                            isPlayable = true;
                        } else if (activeSkill === 'Phá Thành') {
                            // Cần kiểm tra phaThanhColor của me
                            if (me.phaThanhColor && card.color !== me.phaThanhColor) {
                                isPlayable = true;
                            }
                        } else {
                            isPlayable = card.isPlayable;
                        }
                    }
                    
                    return (
                    <div
                        key={`${card.id}-${originalIndex}-inline`}
                        className={`card ${card.type} ${targetSession?.cardIndex === originalIndex ? 'selected' : ''} ${selectedDiscards.includes(originalIndex) ? 'selected' : ''} ${!isPlayable ? 'unplayable' : ''}`}
                        style={getCardBg(card.name) ? { backgroundImage: `url(${getCardBg(card.name)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: !isPlayable ? 0.4 : 1, cursor: !isPlayable ? 'not-allowed' : 'pointer' } : { opacity: !isPlayable ? 0.4 : 1, cursor: !isPlayable ? 'not-allowed' : 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (needsDiscard) {
                                handleDiscardToggle(originalIndex);
                            } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                                if (isPlayable || activeSkill) { // Allow click if activeSkill is converting it
                                    handleCardClick(originalIndex);
                                } else {
                                    if (handleUnplayableClick) handleUnplayableClick(originalIndex);
                                    if (targetSession) cancelTargeting();
                                }
                            } else if (gameState.waitingForResponse) {
                                // Nếu có event response thì cứ click, hook kia sẽ lo
                                handleCardClick(originalIndex);
                            } else if (!isPlayable && handleUnplayableClick) {
                                handleUnplayableClick(originalIndex);
                            }
                        }}
                        title={`${card.name}: ${card.desc}`}
                    >
                        <div className="card-suit-corner" style={{ position: 'absolute', top: '3px', left: '4px', fontSize: '0.7rem', color: card.color === 'red' ? '#ef4444' : '#111', background: 'rgba(255, 255, 255, 0.9)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: 4 }}>
                        {getSuitEmoji(card.suit)} {card.rank}
                        </div>
                        {getCardBg(card.name) ? renderCardNameBadge(card) : (
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
                                CARD_TYPE_LABELS[card.type] || 'Khác'}
                            </span>
                        </div>
                        )}
                    </div>
                    );
                })}
                
                {/* Ô mở rộng +N (cơ chế v3: khi nhiều hơn 5 lá bài, hiển thị ô +N để bấm xem toàn bộ) */}
                {hasOverflow && (
                    <div 
                        className="card card-overflow-badge" 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }} 
                        style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))', 
                            cursor: 'pointer', 
                            border: '2px dashed var(--color-gold)', 
                            borderRadius: '6px',
                            boxShadow: '0 0 10px rgba(212, 168, 67, 0.35)',
                            position: 'relative',
                            padding: '2px',
                            flexShrink: 0
                        }}
                        title={`Còn ${hiddenCount} lá bài ẩn. Bấm để mở toàn bộ ${me.hand.length} lá bài trên tay`}
                    >
                        <span style={{ 
                            fontSize: '1.45rem', 
                            fontWeight: '900', 
                            color: 'var(--color-gold)',
                            lineHeight: 1,
                            textShadow: '0 0 8px rgba(212, 168, 67, 0.6)'
                        }}>
                            +{hiddenCount}
                        </span>
                        <div style={{ 
                            fontSize: '0.62rem', 
                            marginTop: '3px', 
                            color: '#f8fafc', 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}>
                            Xem hết
                        </div>
                        <div style={{ 
                            fontSize: '0.50rem', 
                            color: '#94a3b8',
                            whiteSpace: 'nowrap'
                        }}>
                            ({me.hand.length} lá)
                        </div>
                    </div>
                )}
            </div>

            {/* EXPANDED POPUP MODAL VIA PORTAL — OPTIMIZED FOR MOBILE LANDSCAPE */}
            {isExpanded && typeof window !== 'undefined' && createPortal(
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        background: 'rgba(2, 6, 23, 0.88)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px 14px'
                    }}
                    onClick={() => setIsExpanded(false)}
                >
                    <div 
                        style={{
                            width: '96vw',
                            maxWidth: '780px',
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'rgba(15, 23, 42, 0.98)',
                            border: '2px solid var(--color-gold)',
                            borderRadius: '14px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.9)',
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header modal */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 14px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(30, 41, 59, 0.6)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--color-gold)', fontSize: '1.05rem', fontWeight: 'bold' }}>
                                    🃏 Toàn Bộ Bài Trên Tay ({me.hand.length} Lá)
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                    {needsDiscard ? `Đang chọn bỏ bài (${selectedDiscards.length} đã chọn)` : 'Chạm lá bài để đánh hoặc chọn'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setIsExpanded(false)}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.6)',
                                    color: '#fca5a5',
                                    borderRadius: '6px',
                                    padding: '4px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕ Thu gọn
                            </button>
                        </div>
                        
                        {/* Danh sách lá bài cuộn mượt mà */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflowY: 'auto',
                            padding: '14px 10px',
                            maxHeight: '70vh'
                        }}>
                            {me.hand.map((card, i) => {
                                const originalIndex = i; 
                                let isPlayable = false;
                                if (needsDiscard) {
                                    isPlayable = true;
                                } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                                    if (activeSkill === 'Dời Núi' && (card.name === 'Né' || card.name === 'Chém')) {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Khai Thiên' && card.type === CARD_TYPES.EQUIP) {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Kỳ Tập' && card.color === 'black') {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Tiên Duyên' && card.suit === 'club') {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Thần Hỏa' && card.color === 'red') {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Định Quốc' && (card.name === 'Né' || card.name === 'Sấm Sét')) {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Phá Thành') {
                                        if (me.phaThanhColor && card.color !== me.phaThanhColor) {
                                            isPlayable = true;
                                        }
                                    } else {
                                        isPlayable = card.isPlayable;
                                    }
                                }
                                
                                return (
                                <div
                                    key={`${card.id}-${originalIndex}-popup`}
                                    className={`card ${card.type} ${targetSession?.cardIndex === originalIndex ? 'selected' : ''} ${selectedDiscards.includes(originalIndex) ? 'selected' : ''} ${!isPlayable ? 'unplayable' : ''}`}
                                    style={getCardBg(card.name) ? { backgroundImage: `url(${getCardBg(card.name)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: !isPlayable ? 0.4 : 1, cursor: !isPlayable ? 'not-allowed' : 'pointer', width: '64px', height: '90px', borderRadius: '6px' } : { opacity: !isPlayable ? 0.4 : 1, cursor: !isPlayable ? 'not-allowed' : 'pointer', width: '64px', height: '90px', borderRadius: '6px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (needsDiscard) {
                                            handleDiscardToggle(originalIndex);
                                        } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                                            if (isPlayable || activeSkill) {
                                                handleCardClick(originalIndex);
                                                setIsExpanded(false);
                                            } else {
                                                if (handleUnplayableClick) handleUnplayableClick(originalIndex);
                                                if (targetSession) cancelTargeting();
                                            }
                                        } else if (gameState.waitingForResponse) {
                                            handleCardClick(originalIndex);
                                            setIsExpanded(false);
                                        } else if (!isPlayable && handleUnplayableClick) {
                                            handleUnplayableClick(originalIndex);
                                        }
                                    }}
                                    title={`${card.name}: ${card.desc}`}
                                >
                                    <div className="card-suit-corner" style={{ position: 'absolute', top: '3px', left: '4px', fontSize: '0.7rem', color: card.color === 'red' ? '#ef4444' : '#111', background: 'rgba(255, 255, 255, 0.9)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: 4 }}>
                                    {getSuitEmoji(card.suit)} {card.rank}
                                    </div>
                                    {getCardBg(card.name) ? renderCardNameBadge(card) : (
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
                                            CARD_TYPE_LABELS[card.type] || 'Khác'}
                                        </span>
                                    </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            , document.body)}
        </>
    );
}
