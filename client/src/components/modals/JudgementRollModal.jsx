// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { getSuitEmoji } from 'shared/constants/cardTypes';
import { getFullPlayerName } from 'shared/utils/playerHelpers';

export function JudgementRollModal({ req, gameState, onConfirm }) {
  const isResult = req.type === 'ask_judgement_result';
  const me = gameState.players.find(p => p.id === (req.responderId ?? (typeof window !== 'undefined' ? window.playerId : 0))) || gameState.players[0];
  const target = gameState.players.find(p => p.id === req.targetId) || me;

  const cardKey = req.cardKey || (req.delayedCard ? (req.delayedCard.idKey || req.delayedCard.name) : 'hon_loan');
  const isChaos = cardKey === 'hon_loan' || cardKey === 'hon-loan' || req.cardName === 'Hỗn Loạn';
  const isLightning = cardKey === 'sam_set' || cardKey === 'sam-set' || req.cardName === 'Sấm Sét';
  const isStarve = cardKey === 'binh_luong' || cardKey === 'binh-luong' || req.cardName === 'Binh Lương Thốn Đoạn';

  const titleEmoji = isChaos ? '🌀' : (isLightning ? '⚡' : '🌾');
  const titleName = isChaos ? 'HỖN LOẠN' : (isLightning ? 'SẤM SÉT' : 'BINH LƯƠNG');

  const [countdown, setCountdown] = useState(isResult ? 4 : 7);
  const hasConfirmedRef = React.useRef(false);

  const handleConfirm = React.useCallback((payload) => {
    if (hasConfirmedRef.current) return;
    hasConfirmedRef.current = true;
    onConfirm(payload);
  }, [onConfirm]);

  useEffect(() => {
    hasConfirmedRef.current = false;
    setCountdown(isResult ? 4 : 7);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isResult, req?.id, req?.type]);

  useEffect(() => {
    if (countdown === 0 && !hasConfirmedRef.current) {
      if (isResult) {
        handleConfirm({ confirmResult: true, _isAuto: true });
      } else {
        handleConfirm({ doRoll: true, _isAuto: true });
      }
    }
  }, [countdown, isResult, handleConfirm]);

  const judgeCard = req.judgeCard;
  const isSuccess = req.isSuccess;
  const suitEmoji = judgeCard?.suit ? getSuitEmoji(judgeCard.suit) : '';
  const isRed = judgeCard?.color === 'red' || judgeCard?.suit === 'heart' || judgeCard?.suit === 'diamond' || judgeCard?.suit === '♥' || judgeCard?.suit === '♦';

  return (
    <div style={{ textAlign: 'center', minWidth: '340px', maxWidth: '420px', padding: '10px 5px' }}>
      {/* Header */}
      <div style={{ 
        fontSize: '1.25rem', 
        marginBottom: '10px', 
        color: isChaos ? '#a855f7' : (isLightning ? '#eab308' : '#10b981'), 
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        {titleEmoji} SỰ KIỆN PHÁN XÉT: [{titleName}]
      </div>

      {/* Target Info */}
      <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
        Người phán xét: <strong style={{ color: '#fff' }}>{getFullPlayerName(target, me.id)}</strong>
      </div>

      {!isResult ? (
        /* Giai đoạn 1: Chuẩn bị rút bài */
        <div>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            border: '1px dashed rgba(255, 255, 255, 0.2)', 
            borderRadius: '10px', 
            padding: '14px', 
            marginBottom: '16px' 
          }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#f3f4f6', marginBottom: '6px' }}>
              🎯 Điều kiện thoát hiểm:
            </div>
            <div style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '8px' }}>
              {isChaos && '👉 Rút ra chất CƠ ♥ để giải trừ Hỗn Loạn!'}
              {isStarve && '👉 Rút ra chất NHÉP ♣ để giải trừ Binh Lương!'}
              {isLightning && '👉 Né chất BÍCH ♠ từ 2 đến 9 để không nổ sét!'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#f87171' }}>
              {isChaos && '⚠️ Nếu thất bại: Bị mất Giai đoạn Ra bài lượt này!'}
              {isStarve && '⚠️ Nếu thất bại: Bị mất Pha Rút bài lượt này!'}
              {isLightning && '⚠️ Nếu thất bại: Chịu 3 sát thương Lôi Hỏa!'}
            </div>
          </div>

          {/* Card Back Animation Placeholder */}
          <div style={{
            width: '90px',
            height: '130px',
            margin: '0 auto 16px',
            borderRadius: '8px',
            border: '2px solid #a855f7',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)',
            userSelect: 'none'
          }}>
            🔮
          </div>

          <button 
            className="btn-action success" 
            style={{ 
              padding: '12px 30px', 
              fontSize: '1.05rem', 
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }} 
            onClick={() => handleConfirm({ doRoll: true })}
          >
            🎲 RÚT BÀI PHÁN XÉT ({countdown}s)
          </button>
        </div>
      ) : (
        /* Giai đoạn 2: Lật mở lá bài phán xét & Hiển thị kết quả */
        <div>
          {/* Revealed Card */}
          {judgeCard && (
            <div style={{
              width: '100px',
              height: '145px',
              margin: '0 auto 14px',
              borderRadius: '8px',
              border: `2px solid ${isSuccess ? '#22c55e' : '#ef4444'}`,
              backgroundColor: '#18181b',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '8px',
              boxShadow: isSuccess ? '0 0 20px rgba(34, 197, 94, 0.4)' : '0 0 20px rgba(239, 68, 68, 0.4)',
              userSelect: 'none'
            }}>
              <div style={{ textAlign: 'left', fontWeight: 'bold', color: isRed ? '#ef4444' : '#e4e4e7', fontSize: '0.9rem' }}>
                {suitEmoji} {judgeCard.rank || ''}
              </div>
              <div style={{ fontSize: '1.8rem' }}>
                {suitEmoji}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {judgeCard.name}
              </div>
            </div>
          )}

          {/* Result Banner */}
          <div style={{
            backgroundColor: isSuccess ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${isSuccess ? '#22c55e' : '#ef4444'}`,
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '1.05rem',
              fontWeight: 'bold',
              color: isSuccess ? '#4ade80' : '#f87171',
              marginBottom: '4px'
            }}>
              {isSuccess ? '🌟 THOÁT HIỂM THÀNH CÔNG!' : '🌀 PHÁN XÉT THẤT BẠI!'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
              {req.resultMessage || (isSuccess ? `Lá phán xét là ${suitEmoji} (${judgeCard?.name})! Thoát nạn thành công.` : `Lá phán xét không thỏa mãn điều kiện!`)}
            </div>
          </div>

          <button 
            className="btn-action primary" 
            style={{ 
              padding: '10px 24px', 
              fontSize: '1rem', 
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%'
            }} 
            onClick={() => handleConfirm({ confirmResult: true })}
          >
            Tiếp tục ➔ ({countdown}s)
          </button>
        </div>
      )}
    </div>
  );
}
