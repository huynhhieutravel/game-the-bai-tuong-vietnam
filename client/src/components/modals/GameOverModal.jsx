import React from 'react';
import { getFactionColor, getFactionLabel, isSameFaction } from 'shared/utils/translationHelper';

export function GameOverModal({ gameState, mainPlayerId = 0, onClose, onRestart, onHome }) {
  if (!gameState || !gameState.gameOver) return null;

  const players = gameState.players || [];
  const me = players.find(p => p.id === mainPlayerId) || {};
  const winnerIds = Array.isArray(gameState.winner) 
    ? gameState.winner 
    : (gameState.winner ? [gameState.winner.id || gameState.winner] : []);
  const winnerPlayers = winnerIds.map(id => players.find(p => p.id === id)).filter(Boolean);

  const isWinnerDirect = winnerIds.includes(mainPlayerId);
  const isAllyWinner = Boolean(
    me && !me.isDaTam &&
    winnerPlayers.some(wp => isSameFaction(wp, me) && !wp.isDaTam)
  );
  const isVictory = isWinnerDirect || isAllyWinner;
  const isDraw = winnerIds.length === 0;

  // Tên phe và danh sách tướng thắng trận
  const winningFaction = winnerPlayers[0]?.faction;
  const isDaTamWin = winnerPlayers.some(p => p.isDaTam);
  const winningFactionColor = getFactionColor(winningFaction, isDaTamWin);
  const winningFactionLabel = isDaTamWin 
    ? 'DÃ TÂM' 
    : (winningFaction ? getFactionLabel(winningFaction).toUpperCase() : 'VÔ DANH');

  const getHeroNames = (p) => {
    if (!p) return 'Ẩn danh';
    if (p.heroes && p.heroes.length > 0) {
      const names = p.heroes.map((h, i) => (p.revealedHeroes?.[i] || gameState.gameOver ? h.name : 'Tướng Ẩn')).filter(Boolean);
      return names.join(' & ');
    }
    return p.name || `Người chơi ${p.id + 1}`;
  };

  return (
    <div 
      className="game-over-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(5, 8, 16, 0.90)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={e => e.stopPropagation()}
    >
      <style>{`
        @media (max-width: 680px) {
          .game-over-modal-card {
            flex-direction: column !important;
            max-height: 94vh !important;
            overflow-y: auto !important;
          }
          .game-over-modal-left {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.1) !important;
          }
        }
      `}</style>
      <div 
        className="game-over-modal-card"
        style={{
          background: 'linear-gradient(135deg, #131b2e 0%, #0a0f1d 100%)',
          border: `2px solid ${isVictory ? '#f59e0b' : (isDraw ? '#94a3b8' : '#ef4444')}`,
          borderRadius: '16px',
          width: '95vw',
          maxWidth: '820px',
          maxHeight: '92vh',
          boxShadow: `0 20px 50px rgba(0,0,0,0.9), 0 0 30px ${isVictory ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          boxSizing: 'border-box'
        }}
      >
        {/* CỘT TRÁI: Tổng quan Kết Quả & Nút Hành Động */}
        <div 
          className="game-over-modal-left"
          style={{
            width: '320px',
            flexShrink: 0,
            background: isVictory 
              ? 'linear-gradient(180deg, rgba(146, 64, 14, 0.35) 0%, rgba(10, 15, 29, 0.95) 100%)' 
              : (isDraw 
                ? 'linear-gradient(180deg, rgba(51, 65, 85, 0.35) 0%, rgba(10, 15, 29, 0.95) 100%)'
                : 'linear-gradient(180deg, rgba(127, 29, 29, 0.35) 0%, rgba(10, 15, 29, 0.95) 100%)'),
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}
        >
          {/* Header & Status */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))', lineHeight: '1' }}>
              {isVictory ? '🏆' : (isDraw ? '⚔️' : '💀')}
            </div>
            <h2 
              style={{ 
                margin: '8px 0 2px 0', 
                fontSize: '1.25rem', 
                fontWeight: '900', 
                color: isVictory ? '#fef08a' : (isDraw ? '#e2e8f0' : '#fca5a5'),
                letterSpacing: '0.8px',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)'
              }}
            >
              {isVictory ? 'ĐẠI THẮNG QUANG VINH!' : (isDraw ? 'BẤT PHÂN THẮNG BẠI' : 'BẠN ĐÃ THẤT THỦ')}
            </h2>
            <div style={{ fontSize: '0.74rem', color: isVictory ? '#fef08a' : '#cbd5e1', fontWeight: '500', lineHeight: '1.3' }}>
              {isVictory ? 'Chúc mừng bạn và phe cánh đã độc chiếm giang sơn!' : 'Trận chiến đã ngã ngũ, hãy tích lũy kinh nghiệm cho ván sau!'}
            </div>

            {/* Khối Phe Phái Chiến Thắng (Gọn gàng & rõ ràng) */}
            {!isDraw && (
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1.5px solid ${winningFactionColor}`,
                  borderRadius: '10px',
                  padding: '8px 10px',
                  marginTop: '10px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold' }}>
                  Phe Phái Chiến Thắng
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span 
                    style={{
                      background: winningFactionColor,
                      color: 'white',
                      fontSize: '0.74rem',
                      fontWeight: '900',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    PHE {winningFactionLabel}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 'bold', marginTop: '4px', lineHeight: '1.3' }}>
                  {winnerPlayers.map(p => {
                    const pName = p.id === mainPlayerId ? (p.name === 'Bạn' ? 'Bạn' : `${p.name} (Bạn)`) : p.name;
                    return `${pName} (${getHeroNames(p)})`;
                  }).join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Buttons hành động */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <button 
              type="button"
              onClick={onRestart || (() => window.location.reload())}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                border: '1.5px solid #fef08a',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.5)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              🔄 Chơi Lại Ván Mới
            </button>

            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              {onClose && (
                <button 
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '7px 8px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  title="Tạm ẩn bảng kết quả để xem lại thế trận bàn cờ"
                >
                  📜 Xem Lại Bàn Đấu
                </button>
              )}

              {onHome && (
                <button 
                  type="button"
                  onClick={onHome}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '7px 8px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🏠 Về Menu Chính
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Bảng Vàng Tổng Kết Người Chơi */}
        <div 
          style={{
            flex: 1,
            minWidth: 0,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Danh Sách Người Chơi ({players.length})</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Trận chiến kết thúc</span>
          </div>

          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px'
            }}
          >
            {players.map(p => {
              const isPWinner = winnerIds.includes(p.id);
              const isMe = p.id === mainPlayerId;
              const pColor = getFactionColor(p.faction, p.isDaTam);
              const isAlive = Boolean(p.isAlive);
              const displayName = isMe ? (p.name === 'Bạn' ? 'Bạn' : `${p.name} (Bạn)`) : p.name;

              return (
                <div 
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isMe ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isMe ? '1.5px solid rgba(245, 158, 11, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Cột trái của dòng: Badge phe, Tên & Tướng */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span 
                      style={{
                        background: pColor,
                        color: 'white',
                        fontSize: '0.64rem',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                    >
                      {p.isDaTam ? 'DÃ TÂM' : getFactionLabel(p.faction).toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 'bold', color: isMe ? '#fef08a' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getHeroNames(p)}
                      </div>
                    </div>
                  </div>

                  {/* Cột phải của dòng: Máu & Trạng thái Thắng/Thua */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: isAlive ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                      {isAlive ? `❤️ ${p.hp}/${p.maxHp}` : '💀 Tử trận'}
                    </span>
                    {isPWinner ? (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#d97706', color: '#ffffff', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.4)' }}>
                        🏆 Thắng
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontWeight: 'bold' }}>
                        Thất thủ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
export default GameOverModal;
