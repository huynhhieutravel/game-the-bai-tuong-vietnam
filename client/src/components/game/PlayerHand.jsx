import { getSuitEmoji } from 'shared/constants/cardTypes';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PHASES } from 'shared/constants/phases';
import { CARD_TYPES } from 'shared/constants/cardTypes';
import { CARD_TYPE_LABELS } from '../../i18n/vi/cardLabels';
import { getCardBg } from 'shared/utils/cardStyles';
import { getEffectiveSuit, getEffectiveColor } from 'shared/engine_v4/heroes/HeroRegistry.js';

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
  let fontSize = '0.78rem';
  if (len > 12) {
    fontSize = '0.54rem';
  } else if (len > 8) {
    fontSize = '0.62rem';
  } else if (len > 5) {
    fontSize = '0.68rem';
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
        height: '20px',
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


const CARD_CONVERTING_SKILLS = ['Tiên Duyên', 'Khai Thiên', 'Định Quốc', 'Thần Hỏa', 'Kỳ Tập', 'Dời Núi', 'Phá Thành', 'Hòa Thân'];

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
        cancelTargeting,
        confirmPlayCard
    } = props;

    const [isExpanded, setIsExpanded] = useState(false);
    
    // Quy tắc tối ưu: Cố định hiển thị đầy đủ tối thiểu 6 thẻ bài trực tiếp trên thanh tay.
    // Chỉ kích hoạt thu gọn khi số lá > 6 (từ 7 lá trở lên) để đảm bảo 6 lá luôn nhìn thấy trọn vẹn:
    // Hiển thị 5 lá đầu tiên + 1 ô mở rộng "+N" (ví dụ có 7 lá thì hiển thị 5 lá + ô "+2")
    const FOLD_THRESHOLD = 6;
    const hasOverflow = !isExpanded && me.hand.length > FOLD_THRESHOLD;
    const displayCards = hasOverflow ? me.hand.slice(0, 5) : me.hand;
    const hiddenCount = me.hand.length - 5;

    const renderFloatingActionPill = (card, originalIndex) => {
        if (!targetSession) return null;
        const isSelectedForTargeting = (targetSession.card?.id === card.id || targetSession.cardIndex === originalIndex);
        if (!isSelectedForTargeting) return null;

        const isXiengXich = targetSession.card?.name === 'Xiềng Xích' || targetSession.virtualCardName === 'Xiềng Xích' || activeSkill === 'Tiên Duyên';
        const isReforge = isXiengXich && (!targetSession.selectedTargets || targetSession.selectedTargets.length === 0);
        const hasEnoughTargets = targetSession.targetingDef?.type === 'multiple' 
            ? (targetSession.selectedTargets?.length >= (targetSession.targetingDef.min !== undefined ? targetSession.targetingDef.min : 1))
            : (targetSession.selectedTargets?.length > 0);

        const canConfirm = Boolean(
            ['none', 'aoe', 'self'].includes(targetSession.targetingDef?.type) ||
            isReforge ||
            hasEnoughTargets
        );

        let confirmLabel = `Dùng`;
        if (isXiengXich) {
            confirmLabel = isReforge ? 'Rèn Lại' : 'Xác Nhận';
        }

        return (
            <div 
                className="card-floating-actions" 
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'absolute',
                    top: '-36px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 60,
                    background: 'rgba(15, 23, 42, 0.96)',
                    padding: '2px 5px',
                    borderRadius: '14px',
                    border: '1.2px solid #f59e0b',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7), 0 0 8px rgba(245, 158, 11, 0.45)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'auto'
                }}
            >
                <button
                    type="button"
                    className="btn-card-floating-cancel"
                    onClick={(e) => {
                        e.stopPropagation();
                        cancelTargeting();
                    }}
                    style={{
                        background: 'rgba(51, 65, 85, 0.95)',
                        color: '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '10px',
                        padding: '2px 7px',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        lineHeight: 1.4
                    }}
                    title="Bỏ chọn lá bài này"
                >
                    ✕ Hủy
                </button>
                {canConfirm && (
                    <button
                        type="button"
                        className="btn-card-floating-confirm"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirmPlayCard) confirmPlayCard();
                            setIsExpanded(false);
                        }}
                        style={{
                            background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                            color: '#1e1b4b',
                            border: '1px solid #fef08a',
                            borderRadius: '10px',
                            padding: '2px 9px',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            lineHeight: 1.4,
                            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.6)'
                        }}
                        title={`Xác nhận sử dụng [${targetSession.virtualCardName || card.name}]`}
                    >
                        {confirmLabel}
                    </button>
                )}
                {!canConfirm && (
                    <span 
                        className="card-floating-hint"
                        style={{
                            fontSize: '0.62rem',
                            color: '#fef08a',
                            fontWeight: 'bold',
                            padding: '0 3px',
                            lineHeight: 1.4
                        }}
                    >
                        🎯 Chọn mục tiêu
                    </span>
                )}
            </div>
        );
    };

    return (
        <>
            <div 
                className="hand-cards"
                style={needsDiscard ? {
                    boxShadow: '0 0 16px rgba(239, 68, 68, 0.45)',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    transition: 'box-shadow 0.3s ease'
                } : {}}
            >
                {displayCards.map((card, i) => {
                    // Keep original index for interaction logic
                    const originalIndex = i; 
                    const effColor = getEffectiveColor(me, card);
                    const effSuit = getEffectiveSuit(me, card);
                    let isPlayable = false;
                    if (needsDiscard) {
                        isPlayable = true;
                    } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                        // If there is an active skill, check if the skill makes it playable visually
                        if (activeSkill === 'Dời Núi' && (card.name === 'Né' || card.name === 'Chém')) {
                            isPlayable = true;
                        } else if (activeSkill === 'Khai Thiên' && effColor === 'red') {
                            isPlayable = true;
                        } else if (activeSkill === 'Kỳ Tập' && effColor === 'black') {
                            isPlayable = true;
                        } else if (activeSkill === 'Tiên Duyên' && (effSuit === 'club' || effSuit === '♣' || effSuit === 'clubs' || effSuit === 'chuồn')) {
                            isPlayable = true;
                        } else if (activeSkill === 'Thần Hỏa' && effColor === 'red') {
                            isPlayable = true;
                        } else if (activeSkill === 'Định Quốc' && (card.name === 'Né' || card.name === 'Sấm Sét')) {
                            isPlayable = true;
                        } else if (activeSkill === 'Phá Thành') {
                            // Cần kiểm tra phaThanhColor của me
                            if (me.phaThanhColor && effColor !== me.phaThanhColor) {
                                isPlayable = true;
                            }
                        } else if ((activeSkill === 'Hòa Thân' || activeSkill === 'hoa_than_an_tu') && (effSuit === 'diamond' || effSuit === '♦' || effSuit === 'diamonds' || effSuit === 'rô')) {
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
                        onClick={(e) => {
                            e.stopPropagation();
                            if (needsDiscard) {
                                handleDiscardToggle(originalIndex);
                            } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                                const isConvertingSkill = activeSkill && CARD_CONVERTING_SKILLS.includes(activeSkill);
                                if (isPlayable || isConvertingSkill) { // Allow click only if card is playable or activeSkill converts it
                                    handleCardClick(originalIndex);
                                } else {
                                    if (handleUnplayableClick) handleUnplayableClick(originalIndex);
                                    if (targetSession && !activeSkill) cancelTargeting();
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
                        {renderFloatingActionPill(card, originalIndex)}
                        <div className="card-suit-corner" style={{ position: 'absolute', top: '3px', left: '4px', fontSize: '0.7rem', color: effColor === 'red' ? '#ef4444' : '#111', background: 'rgba(255, 255, 255, 0.9)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: 4 }}>
                        {getSuitEmoji(effSuit)} {card.rank}
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
                                const effColor = getEffectiveColor(me, card);
                                const effSuit = getEffectiveSuit(me, card);
                                let isPlayable = false;
                                if (needsDiscard) {
                                    isPlayable = true;
                                } else if (isMyTurn && gameState.phase === PHASES.ACTION && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'play_phase')) {
                                    if (activeSkill === 'Dời Núi' && (card.name === 'Né' || card.name === 'Chém')) {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Khai Thiên' && effColor === 'red') {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Kỳ Tập' && effColor === 'black') {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Tiên Duyên' && (effSuit === 'club' || effSuit === '♣' || effSuit === 'clubs' || effSuit === 'chuồn')) {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Thần Hỏa' && effColor === 'red') {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Định Quốc' && (card.name === 'Né' || card.name === 'Sấm Sét')) {
                                        isPlayable = true;
                                    } else if (activeSkill === 'Phá Thành') {
                                        if (me.phaThanhColor && effColor !== me.phaThanhColor) {
                                            isPlayable = true;
                                        }
                                    } else if ((activeSkill === 'Hòa Thân' || activeSkill === 'hoa_than_an_tu') && (effSuit === 'diamond' || effSuit === '♦' || effSuit === 'diamonds' || effSuit === 'rô')) {
                                        isPlayable = true;
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
                                            const isConvertingSkill = activeSkill && CARD_CONVERTING_SKILLS.includes(activeSkill);
                                            if (isPlayable || isConvertingSkill) {
                                                handleCardClick(originalIndex);
                                                setIsExpanded(false);
                                            } else {
                                                if (handleUnplayableClick) handleUnplayableClick(originalIndex);
                                                if (targetSession && !activeSkill) cancelTargeting();
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
                                    {renderFloatingActionPill(card, originalIndex)}
                                    <div className="card-suit-corner" style={{ position: 'absolute', top: '3px', left: '4px', fontSize: '0.7rem', color: effColor === 'red' ? '#ef4444' : '#111', background: 'rgba(255, 255, 255, 0.9)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: 4 }}>
                                    {getSuitEmoji(effSuit)} {card.rank}
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
