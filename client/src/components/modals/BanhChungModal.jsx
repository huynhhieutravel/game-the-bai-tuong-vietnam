import { getSuitEmoji } from 'shared/constants/cardTypes';
import React, { useState } from 'react';

export function BanhChungModal({ req, onConfirm }) {
  const [topCards, setTopCards] = useState(req?.viewedCards || req?.cards || []);
  const [bottomCards, setBottomCards] = useState([]);

  const isRed = (c) => Boolean(
    c && (c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦')
  );

  const getSuit = (c) => {
    if (!c) return '';
    return getSuitEmoji ? getSuitEmoji(c.suit) : (c.suit || '');
  };

  const moveToBottom = (card, idx) => {
    const newTop = [...topCards];
    newTop.splice(idx, 1);
    setTopCards(newTop);
    setBottomCards([...bottomCards, card]);
  };

  const moveToTop = (card, idx) => {
    const newBottom = [...bottomCards];
    newBottom.splice(idx, 1);
    setBottomCards(newBottom);
    setTopCards([...topCards, card]);
  };
  
  const moveUp = (idx) => {
    if (idx === 0) return;
    const newTop = [...topCards];
    [newTop[idx - 1], newTop[idx]] = [newTop[idx], newTop[idx - 1]];
    setTopCards(newTop);
  };
  
  const moveDown = (idx) => {
    if (idx === topCards.length - 1) return;
    const newTop = [...topCards];
    [newTop[idx], newTop[idx + 1]] = [newTop[idx + 1], newTop[idx]];
    setTopCards(newTop);
  };

  const moveAllToBottom = () => {
    if (topCards.length === 0) return;
    setBottomCards([...bottomCards, ...topCards]);
    setTopCards([]);
  };

  const moveAllToTop = () => {
    if (bottomCards.length === 0) return;
    setTopCards([...topCards, ...bottomCards]);
    setBottomCards([]);
  };

  const totalCards = topCards.length + bottomCards.length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      textAlign: 'center',
      boxSizing: 'border-box',
      userSelect: 'none'
    }}>
      {/* 1. HEADER COMPACT */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '6px',
        paddingBottom: '6px',
        borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.15rem' }}>🍡</span>
          <span style={{
            fontSize: '1rem',
            fontWeight: '900',
            letterSpacing: '0.5px',
            color: '#34d399',
            textTransform: 'uppercase'
          }}>
            Bánh Chưng (Lang Liêu)
          </span>
          <span style={{
            fontSize: '0.72rem',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10b981',
            color: '#a7f3d0',
            padding: '1px 7px',
            borderRadius: '10px',
            fontWeight: 'bold'
          }}>
            {totalCards} lá bài
          </span>
        </div>

        {/* Nút thao tác nhanh chuyển cả nhóm */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {topCards.length > 0 && (
            <button
              type="button"
              onClick={moveAllToBottom}
              style={{
                fontSize: '0.68rem',
                padding: '2px 7px',
                borderRadius: '5px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                cursor: 'pointer'
              }}
              title="Đẩy toàn bộ bài xuống đáy chồng bài"
            >
              Đẩy hết ⬇
            </button>
          )}
          {bottomCards.length > 0 && (
            <button
              type="button"
              onClick={moveAllToTop}
              style={{
                fontSize: '0.68rem',
                padding: '2px 7px',
                borderRadius: '5px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#6ee7b7',
                cursor: 'pointer'
              }}
              title="Đưa toàn bộ bài lên đỉnh chồng bài"
            >
              Giữ hết ⬆
            </button>
          )}
        </div>
      </div>

      <div style={{
        fontSize: '0.74rem',
        color: '#94a3b8',
        marginBottom: '8px',
        textAlign: 'left',
        flexShrink: 0
      }}>
        💡 Xếp thứ tự rút bài ở cột <strong>Đỉnh</strong>, hoặc đẩy những lá bài không cần thiết xuống cột <strong>Đáy</strong>.
      </div>

      {/* 2. KHU VỰC 2 CỘT SONG HÀNH (ĐỈNH vs ĐÁY) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.15fr 1fr',
        gap: '10px',
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden',
        marginBottom: '8px'
      }}>
        {/* CỘT TRÁI: ĐỈNH CHỒNG BÀI (THỨ TỰ RÚT BÀI) */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '10px',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
            paddingBottom: '4px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#10b981' }}>
              📥 Đỉnh Bộ Bài ({topCards.length})
            </span>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
              Rút từ trên xuống
            </span>
          </div>

          <div style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            minHeight: 0,
            paddingRight: '2px'
          }}>
            {topCards.map((c, idx) => {
              const red = isRed(c);
              const isFirst = idx === 0;
              return (
                <div
                  key={c.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isFirst ? 'rgba(245, 158, 11, 0.12)' : 'rgba(30, 41, 59, 0.7)',
                    border: isFirst ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '3px 6px',
                    marginBottom: '4px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    gap: '4px'
                  }}
                >
                  {/* Nhãn thứ tự rút */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                    <span style={{
                      background: isFirst ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)',
                      color: isFirst ? '#000000' : '#cbd5e1',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontSize: '0.64rem',
                      fontWeight: '800',
                      flexShrink: 0
                    }}>
                      {isFirst ? '#1 Rút Đầu' : `#${idx + 1}`}
                    </span>
                    <span style={{
                      color: red ? '#ef4444' : '#f8fafc',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {getSuit(c)} {c.rank || ''} {c.name}
                    </span>
                  </div>

                  {/* Nút di chuyển vị trí */}
                  <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      style={{
                        padding: '2px 5px',
                        fontSize: '0.65rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: idx === 0 ? '#475569' : '#f8fafc',
                        border: 'none',
                        cursor: idx === 0 ? 'not-allowed' : 'pointer'
                      }}
                      title="Chuyển lên rút sớm hơn"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === topCards.length - 1}
                      style={{
                        padding: '2px 5px',
                        fontSize: '0.65rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: idx === topCards.length - 1 ? '#475569' : '#f8fafc',
                        border: 'none',
                        cursor: idx === topCards.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                      title="Chuyển xuống rút muộn hơn"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => moveToBottom(c, idx)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.65rem',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                      title="Đẩy xuống đáy chồng bài"
                    >
                      Đáy ⬇
                    </button>
                  </div>
                </div>
              );
            })}
            {topCards.length === 0 && (
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>
                (Không có lá nào ở đỉnh)
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: ĐÁY CHỒNG BÀI (KHÔNG MUỐN RÚT) */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.45)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '10px',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
            paddingBottom: '4px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8' }}>
              📤 Đáy Bộ Bài ({bottomCards.length})
            </span>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
              Không muốn rút
            </span>
          </div>

          <div style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            minHeight: 0,
            paddingRight: '2px'
          }}>
            {bottomCards.map((c, idx) => {
              const red = isRed(c);
              return (
                <div
                  key={c.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    padding: '3px 6px',
                    marginBottom: '4px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    gap: '4px',
                    opacity: 0.85
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                    <span style={{
                      background: 'rgba(100, 116, 139, 0.25)',
                      color: '#94a3b8',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontSize: '0.64rem',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      Đáy
                    </span>
                    <span style={{
                      color: red ? '#f87171' : '#cbd5e1',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {getSuit(c)} {c.rank || ''} {c.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => moveToTop(c, idx)}
                    style={{
                      padding: '2px 7px',
                      fontSize: '0.65rem',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.25)',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      color: '#6ee7b7',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title="Đưa trở lại đỉnh bộ bài"
                  >
                    ⬆ Lên Đỉnh
                  </button>
                </div>
              );
            })}
            {bottomCards.length === 0 && (
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>
                (Không có lá nào ở đáy)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. NÚT XÁC NHẬN CỐ ĐỊNH Ở ĐÁY MODAL */}
      <button
        type="button"
        className="btn-action success"
        onClick={() => onConfirm({ orderedCards: true, deckTop: topCards, deckBottom: bottomCards })}
        style={{
          width: '100%',
          padding: '8px 14px',
          fontSize: '0.92rem',
          fontWeight: '900',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: '1px solid #6ee7b7',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
          color: '#ffffff',
          cursor: 'pointer',
          flexShrink: 0,
          letterSpacing: '0.3px',
          transition: 'all 0.15s ease'
        }}
      >
        ✅ Xác Nhận Sắp Xếp (Đỉnh: {topCards.length} | Đáy: {bottomCards.length})
      </button>
    </div>
  );
}
