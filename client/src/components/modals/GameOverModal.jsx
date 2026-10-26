import React from 'react';
import { getFactionColor, getFactionLabel, isSameFaction } from 'shared/utils/translationHelper';

export function GameOverModal({ gameState, mainPlayerId = 0, onClose, onRestart, onHome }) {
  if (!gameState || !gameState.gameOver) return null;

  const players = gameState.players || [];
  const me = players.find(p => p.id === mainPlayerId) || {};
  const winnerIds = Array.isArray(gameState.winner) ? gameState.winner : (gameState.winner ? [gameState.winner.id || gameState.winner] : []);
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
  const winningFactionColor = getFactionColor(winningFaction, winnerPlayers[0]?.isDaTam);
  const winningFactionLabel = winnerPlayers[0]?.isDaTam ? 'DÃ TÂM' : getFactionLabel(winningFaction).toUpperCase();

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
        background: 'rgba(5, 8, 16, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div 
        className="game-over-modal-card"
        style={{
          background: 'linear-gradient(180deg, #131b2e 0%, #0a0f1d 100%)',
          border: `2px solid ${isVictory ? '#f59e0b' : (isDraw ? '#94a3b8' : '#ef4444')}`,
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: `0 20px 50px rgba(0,0,0,0.9), 0 0 30px ${isVictory ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header Ribbon */}
        <div 
          style={{
            background: isVictory 
              ? 'linear-gradient(90deg, #92400e 0%, #d97706 50%, #92400e 100%)' 
              : (isDraw 
                ? 'linear-gradient(90deg, #334155 0%, #64748b 50%, #334155 100%)'
                : 'linear-gradient(90deg, #7f1d1d 0%, #b91c1c 50%, #7f1d1d 100%)'),
            padding: '16px 20px',
            textAlign: 'center',
            borderBottom: `2px solid ${isVictory ? '#fef08a' : '#fca5a5'}`
          }}
        >
          <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))' }}>
            {isVictory ? '🏆' : (isDraw ? '⚔️' : '💀')}
          </div>
          <h2 
            style={{ 
              margin: '4px 0 0 0', 
              fontSize: '1.45rem', 
              fontWeight: '900', 
              color: '#ffffff',
              letterSpacing: '1px',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)'
            }}
          >
            {isVictory ? 'ĐẠI THẮNG QUANG VINH!' : (isDraw ? 'BẤT PHÂN THẮNG BẠI' : 'BẠN ĐÃ THẤT THỦ')}
          </h2>
          <div style={{ fontSize: '0.82rem', color: isVictory ? '#fef08a' : '#cbd5e1', marginTop: '4px', fontWeight: 'bold' }}>
            {isVictory ? 'Chúc mừng bạn và phe cánh đã độc chiếm giang sơn!' : 'Trận chiến đã ngã ngũ, hãy tích lũy kinh nghiệm cho ván sau!'}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto' }}>
          {/* Winner Banner */}
          {!isDraw && (
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1.5px solid ${winningFactionColor}`,
                borderRadius: '10px',
                padding: '10px 14px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold' }}>
                Phe Phái Chiến Thắng
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
                <span 
                  style={{
                    background: winningFactionColor,
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  PHE {winningFactionLabel}
                </span>
                <span style={{ fontSize: '0.98rem', fontWeight: 'bold', color: '#f8fafc' }}>
                  {winnerPlayers.map(getHeroNames).join(' & ')}
                </span>
              </div>
            </div>
          )}

          {/* Player Scoreboard */}
          <div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Danh Sách Người Chơi ({players.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {players.map(p => {
                const isPWinner = winnerIds.includes(p.id);
                const isMe = p.id === mainPlayerId;
                const pColor = getFactionColor(p.faction, p.isDaTam);
                const isAlive = Boolean(p.isAlive);

                return (
                  <div 
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isMe ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: isMe ? '1.5px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span 
                        style={{
                          background: pColor,
                          color: 'white',
                          fontSize: '0.62rem',
                          fontWeight: 'bold',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          flexShrink: 0
                        }}
                      >
                        {p.isDaTam ? 'DÃ TÂM' : getFactionLabel(p.faction).toUpperCase()}
                      </span>
                      <div style={{ minWidth: 0, textAlign: 'left' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: isMe ? '#fef08a' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isMe ? `${p.name} (Bạn)` : p.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getHeroNames(p)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.74rem', color: isAlive ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                        {isAlive ? `❤️ ${p.hp}/${p.maxHp}` : '💀 Tử trận'}
                      </span>
                      {isPWinner && (
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: '#d97706', color: '#ffffff', fontWeight: 'bold' }}>
                          🏆 Thắng
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div 
          style={{
            padding: '14px 20px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap'
          }}
        >
          {onClose && (
            <button 
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📜 Xem Lại Bàn Đấu
            </button>
          )}

          {onHome && (
            <button 
              type="button"
              onClick={onHome}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🏠 Về Menu Chính
            </button>
          )}

          <button 
            type="button"
            onClick={onRestart || (() => window.location.reload())}
            style={{
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              border: '1.5px solid #fef08a',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: '900',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.5)',
              transition: 'all 0.2s'
            }}
          >
            🔄 Chơi Lại Ván Mới
          </button>
        </div>
      </div>
    </div>
  );
}
export default GameOverModal;
