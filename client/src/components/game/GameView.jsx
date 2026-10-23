import { getSuitEmoji } from 'shared/constants/cardTypes';
import { getCardBg, getBadgeColor } from 'shared/utils/cardStyles';
// @ts-check
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { useGameState, useGameAPI, useGameController } from '../../contexts/GameProvider';
import { ModalContainer } from '../modals/ModalContainer';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';
import { PHASES } from 'shared/data/gameData';
import "../../index.css";

import { useTargeting } from './hooks/useTargeting';
import { useSkillInteraction } from './hooks/useSkillInteraction';
import { useCardInteraction } from './hooks/useCardInteraction';
import { usePlayerAnimations } from './hooks/usePlayerAnimations';
import { useAudioSFX } from './hooks/useAudioSFX';

import { DraftScreen } from './DraftScreen';
import { PlayerBoard } from './PlayerBoard';
import MyHeroBar from "./MyHeroBar";
import { PlayerHand } from './PlayerHand';
import { ActionBar } from './ActionBar';
import { ChatWidget } from './ChatWidget';

const getHeroNameStr = (p) => {
   if (!p || !p.heroes) return `(Tướng Ẩn ${p ? p.id + 1 : ''})`;
   const revealed = p.heroes.filter((h, i) => p.revealedHeroes?.[i]).map(h => h.name);
   if (revealed.length === 0) return `(Tướng Ẩn ${p.id + 1})`;
   return `(${revealed.join(' & ')})`;
};

const renderLogText = (text) => {
  if (!text) return text;
  const parts = text.split(/(\[.*?\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <strong 
          key={index} 
          style={{ 
            color: '#facc15',
            textShadow: '0 0 5px rgba(250, 204, 21, 0.4)',
            padding: '0 2px'
          }}
        >
          {part}
        </strong>
      );
    }
    return part;
  });
};

export default function GameView() {
  const location = useLocation();
  const navigate = useNavigate();
  const isWiki = location.pathname.startsWith('/wiki');
  
  const gameAPI = useGameAPI();
  const gameController = useGameController();
  const gameState = useGameState();
  const isActionPending = useRef(false);

  const [logTab, setLogTab] = useState('all');
  const [showMobileLog, setShowMobileLog] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || window.innerHeight <= 520;
  });
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight <= 520 && window.innerWidth > window.innerHeight;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w <= 768 || h <= 520);
      setIsLandscapeMobile(h <= 520 && w > h);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startNewGame = useCallback(() => {
    gameController.restart(4);
  }, [gameController]);

  const [activeSkill, setActiveSkill] = useState(null);
  const [targetSession, setTargetSession] = useState(null);
  const [phaseBanner, setPhaseBanner] = useState(null);
  const [heroPopup, setHeroPopup] = useState(null);
  const [cardPopup, setCardPopup] = useState(null);

  const mainPlayerId = typeof window !== 'undefined' && window.playerId !== undefined ? window.playerId : 0; 
  const playerAnimations = usePlayerAnimations(gameState);
  const sfx = useAudioSFX();
  
  const logRef = useRef(null);

  const { cancelTargeting, handleTargetClick } = useTargeting({
      gameAPI,
      gameState,
      targetSession,
      setTargetSession,
      activeSkill,
      setActiveSkill,
      isActionPending,
      mainPlayerId
  });

  const { handleExecuteSkill } = useSkillInteraction({
      gameState,
      gameAPI,
      activeSkill,
      setActiveSkill,
      cancelTargeting,
      setTargetSession,
      isActionPending,
      mainPlayerId
  });

  const { handleCardClick, handleDiscardToggle, confirmDiscard, selectedDiscards, setSelectedDiscards, handleUnplayableClick } = useCardInteraction({
      gameState,
      gameAPI,
      activeSkill,
      targetSession,
      setTargetSession,
      cancelTargeting,
      mainPlayerId
  });

  const handleResponseAction = useCallback((payload) => {
    if (!gameState?.waitingForResponse || !gameAPI) return;
    gameAPI.respond(payload);
  }, [gameState, gameAPI]);

  const handleDraw = useCallback((skipDraw = false, drawExtra = false, khaiQuoc = false) => {
    if (!gameAPI) return;
    gameAPI.drawPhase(mainPlayerId, skipDraw, drawExtra, khaiQuoc);
  }, [gameAPI, mainPlayerId]);

  const handleEndTurn = useCallback(() => {
    if (!gameAPI) return;
    cancelTargeting();
    gameAPI.endPhase(mainPlayerId);
  }, [gameAPI, cancelTargeting, mainPlayerId]);

  const handleRevealClick = useCallback((heroIndex) => {
    if (!gameAPI) return;
    gameAPI.revealHero(mainPlayerId, heroIndex);
  }, [gameAPI, mainPlayerId]);

  const showPhaseBanner = (text) => {
    setPhaseBanner(text);
    setTimeout(() => setPhaseBanner(null), 2000);
  };

  const winnerText = useMemo(() => {
    if (!gameState || !gameState.winner) return 'Ai đó';
    if (Array.isArray(gameState.winner)) {
      if (gameState.winner.length === 0) return 'Hòa cờ!';
      const winnerPlayers = gameState.winner.map(id => gameState.players.find(p => p.id === id)).filter(Boolean);
      if (winnerPlayers.length === 0) return 'Ai đó';
      const names = winnerPlayers.map(p => {
        const heroStr = getHeroNameStr(p);
        return (heroStr && heroStr !== 'Chưa lật') ? heroStr : (p.name || `Người chơi ${p.id + 1}`);
      }).join(' & ');
      const faction = winnerPlayers[0]?.faction;
      const factionStr = faction && faction !== 'none' ? `Phe ${faction.toUpperCase()} (` : '';
      const factionEnd = faction && faction !== 'none' ? ')' : '';
      return `${factionStr}${names}${factionEnd}`;
    }
    const heroStr = getHeroNameStr(gameState.winner);
    return (heroStr && heroStr !== 'Chưa lật') ? heroStr : (gameState.winner.name || `Người chơi ${gameState.winner.id + 1}`);
  }, [gameState]);

  const processedLogsCount = useRef(0);
  useEffect(() => {
    if (!gameState || !gameState.logs) return;
    const currentLogs = gameState.logs;
    const newLogsCount = currentLogs.length - processedLogsCount.current;
    
    if (newLogsCount > 0 && processedLogsCount.current > 0) { // Đừng kêu loạn xạ khi mới load game
        // Xử lý tất cả các log mới
        for (let i = processedLogsCount.current; i < currentLogs.length; i++) {
            const log = currentLogs[i];
            const logText = log?.text || log?.message || (typeof log === 'string' ? log : '');
            if (logText) {
                const text = logText.toLowerCase();
                if (text.includes("mất") && text.includes("sinh lực")) {
                    sfx.playDamage();
                    showPhaseBanner(logText);
                } else if (text.includes("hồi") && text.includes("sinh lực")) {
                    sfx.playHeal();
                } else if (text.includes("dùng [sát]") || text.includes("dùng [chém]")) {
                    sfx.playSlash();
                } else if (text.includes("dùng [né]")) {
                    sfx.playDodge();
                } else if (text.includes("rút") && text.includes("lá bài")) {
                    sfx.playDrawCard();
                } else if (text.includes("bắt đầu lượt")) {
                    sfx.playTurnStart();
                } else if (text.includes("lộ diện tướng") || text.includes("hiển lộ tướng")) {
                    showPhaseBanner(logText);
                } else if (text.includes("khu phán xét")) {
                    showPhaseBanner(logText);
                }
            }
        }
    }
    processedLogsCount.current = currentLogs.length;
  }, [gameState?.logs, sfx]);

  /** @returns {import('react').CSSProperties} */
  const getOpponentStyle = (index, totalOpponents) => {
    let angleDeg = 90;
    if (totalOpponents > 1) {
       // Mở rộng vòng cung nếu có đông người (8 người chơi = 7 đối thủ)
       const startAngle = totalOpponents > 4 ? 210 : 180;
       const endAngle = totalOpponents > 4 ? -30 : 0;
       const span = startAngle - endAngle;
       angleDeg = startAngle - (span / (totalOpponents - 1)) * index;
    }
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Tọa độ và bán kính elip co giãn theo Desktop / Mobile Portrait / Mobile Landscape
    let rx, ry, baseY, scale;
    if (isLandscapeMobile) {
      rx = totalOpponents > 4 ? 38 : 32; // vw
      ry = 4; // % arc phẳng hơn, giữ đối thủ trong dải top 19-24%
      baseY = 23.5; // Trọng tâm Y ở 23.5% (91px), hoàn toàn cách top-bar và trên center deck (41%)
      scale = totalOpponents >= 6 ? 0.48 : (totalOpponents >= 4 ? 0.54 : 0.60);
    } else if (isMobile) {
      rx = totalOpponents > 4 ? 37 : 35; // vw
      ry = totalOpponents > 4 ? 20 : 15; // %
      baseY = totalOpponents > 4 ? 37 : 34; // Trọng tâm Y
      scale = totalOpponents >= 6 ? 0.58 : (totalOpponents >= 4 ? 0.62 : 0.68);
    } else {
      rx = totalOpponents > 4 ? 34 : 27;
      ry = 20;
      baseY = 32;
      scale = totalOpponents >= 6 ? 0.68 : (totalOpponents >= 4 ? 0.74 : 0.8);
    }
    
    // Desktop: lùi 160px để chừa chỗ cho History Sidebar. Mobile: căn giữa 50%
    const leftCss = isMobile
      ? `calc(50% + ${rx * Math.cos(angleRad)}vw)`
      : `calc(50% - 160px + ${rx * Math.cos(angleRad)}vw)`;
    const topCss = `${baseY - ry * Math.sin(angleRad)}%`; 
    
    return {
      position: 'absolute',
      left: leftCss,
      top: topCss,
      transform: `translate(-50%, -50%) scale(${scale})`,
      zIndex: 10
    };
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [gameState?.logs]);


  if (!gameState) {
    return (
      <div className="game-board flex-center">
        <h2>Loading game...</h2>
      </div>
    );
  }
  
  const me = gameState.players.find(p => p.id === mainPlayerId) || gameState.players[0];
  
  if (gameState.phase === PHASES.DRAFT) {
    return <DraftScreen gameState={gameState} me={me} gameController={gameController} />;
  }


  const opponents = gameState.players.filter(p => p.id !== me.id);
  const isMyTurn = gameState.currentPlayerIndex === me.id;
  const needsDiscard = gameState.waitingForResponse?.type === 'discard_phase' && gameState.waitingForResponse?.responderId === me.id;
  const discardAmount = needsDiscard ? gameState.waitingForResponse.amount : 0;
  
  const myAnimationClass = playerAnimations[me.id] || '';

  return (
    <div className={`game-board ${myAnimationClass === 'anim-damage' ? 'damage-flash' : ''}`}>
      {/* Background Image Container with blur filter */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, overflow: 'hidden' }}>
         <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url('/images/bgs/${me.heroes?.[0]?.image || me.hero?.image || 'default.jpg'}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(25px) brightness(0.25) saturate(1.2)', transform: 'scale(1.1)' }} />
      </div>

      <div className="game-top-bar">
        <div className="game-title">Việt Sát</div>
        <div className="game-status" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
             onClick={sfx.toggleMute} 
             style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', opacity: 0.7 }}
             title={sfx.isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
             {sfx.isMuted ? '🔇' : '🔊'}
          </button>
          <div className="turn-indicator">
            {gameState.currentPlayerIndex === me.id ? '▶ Lượt của bạn' : `⏳ Chờ người chơi ${gameState.currentPlayerIndex + 1}`}
            <span style={{ marginLeft: '10px', color: 'var(--color-gold)' }}>{gameState.phase}</span>
          </div>
          <button 
             className="mobile-log-toggle-btn"
             onClick={() => setShowMobileLog(prev => !prev)}
             title="Xem nhật ký trận đấu"
          >
             📜 Log {gameState.logs?.length > 0 && <span className="mobile-log-count">{gameState.logs.length}</span>}
          </button>
        </div>
      </div>
      
      {/* Quick Ticker trên Mobile */}
      {isMobile && gameState.logs && gameState.logs.length > 0 && (
        <div 
          className="mobile-log-ticker" 
          onClick={() => setShowMobileLog(true)}
        >
          <span className="ticker-icon">📜</span>
          <span className="ticker-text">
            {gameState.logs[gameState.logs.length - 1].text || gameState.logs[gameState.logs.length - 1].message}
          </span>
          <span className="ticker-more">›</span>
        </div>
      )}

      {phaseBanner && (
        <div className="phase-banner">
          {phaseBanner}
        </div>
      )}

      {/* Opponents Area */}
      <div className="opponents-area">
        {opponents.map((player, index) => {
          const isCurrentTurn = gameState.currentPlayerIndex === player.id;
          return (
            <PlayerBoard
              key={player.id}
              player={player}
              gameState={gameState}
              me={me}
              isCurrentTurn={isCurrentTurn}
              targetSession={targetSession}
              handleTargetClick={handleTargetClick}
              setHeroPopup={setHeroPopup}
              setCardPopup={setCardPopup}
              style={getOpponentStyle(index, opponents.length)}
              animationClass={playerAnimations[player.id] || ''}
            />
          );
        })}
        
        <div className="board-center" style={{ zIndex: 1, position: 'absolute', top: isLandscapeMobile ? '41%' : (isMobile ? '46%' : '38%'), left: isMobile ? '50%' : 'calc(50% - 160px)', transform: isLandscapeMobile ? 'translate(-50%, -50%) scale(0.78)' : 'translate(-50%, -50%)', width: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div className="deck-info" style={{ display: 'flex', justifyContent: 'center', gap: isLandscapeMobile ? '10px' : '20px', marginBottom: isLandscapeMobile ? '4px' : '15px' }}>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.5)', padding: isLandscapeMobile ? '2px 10px' : '5px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
               <div style={{ fontSize: isLandscapeMobile ? '1.1rem' : '1.5rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>{gameState.deck?.length || 0}</div>
               <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Bài Cầm</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.5)', padding: isLandscapeMobile ? '2px 10px' : '5px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
               <div style={{ fontSize: isLandscapeMobile ? '1.1rem' : '1.5rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{gameState.discardPile?.length || 0}</div>
               <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Bỏ Đi</div>
            </div>
          </div>

          <div className="played-cards" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', minHeight: isLandscapeMobile ? (gameState.playedCards?.length ? '65px' : '0px') : '120px', alignItems: 'center' }}>
            {gameState.playedCards?.map((card, i) => {
              const bg = getCardBg(card.name);
              return (
                <div
                  key={`${card.id}-${i}`}
                  className={`card ${card.type}`}
                  style={{
                    ...(bg ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}),
                    transform: `rotate(${Math.random() * 10 - 5}deg) scale(0.9) translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px)`,
                    margin: '-15px',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                    cursor: 'pointer'
                  }}
                  title={`${card.name}: ${card.desc}`}
                  onClick={() => setCardPopup(card)}
                >
                  <div className="card-suit-corner" style={{ position: 'absolute', top: '3px', left: '4px', fontSize: '0.7rem', color: card.color === 'red' ? '#ef4444' : '#111', background: 'rgba(255, 255, 255, 0.9)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: 4 }}>
                    {getSuitEmoji(card.suit)} {card.rank}
                  </div>
                  {bg ? (
                    <div style={{ position: 'absolute', bottom: '4px', left: '2px', right: '2px', background: getBadgeColor(card), color: '#ffffff', padding: '1px 3px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 'bold', textAlign: 'center', border: '1px solid rgba(255,255,255,0.4)', zIndex: 4, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {card.name}
                    </div>
                  ) : (
                    <div className="card-inner" style={{ paddingTop: '12px' }}>
                      <span className="card-icon">{card.emoji}</span>
                      <span className="card-name">{card.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {(gameState.playedCards?.length || 0) === 0 && targetSession && (
              <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px' }}>
                {targetSession.targetingDef?.steps?.[targetSession.step]?.message || targetSession.message || '🎯 Hãy chọn 1 mục tiêu...'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}></div>

      <div className="player-hand-area" onClick={() => cancelTargeting()}>
        <MyHeroBar
            me={me}
            isMyTurn={isMyTurn}
            activeSkill={activeSkill}
            setActiveSkill={setActiveSkill}
            handleExecuteSkill={handleExecuteSkill}
            animationClass={myAnimationClass}
            gameState={gameState}
            activePhase={gameState.phase}
            handleRevealClick={handleRevealClick}
            setHeroPopup={setHeroPopup}
            setCardPopup={setCardPopup}
            targetSession={targetSession}
            handleTargetClick={handleTargetClick}
            playerHand={
              <PlayerHand
                  me={me}
                  gameState={gameState}
                  needsDiscard={needsDiscard}
                  isMyTurn={isMyTurn}
                  activeSkill={activeSkill}
                  targetSession={targetSession}
                  selectedDiscards={selectedDiscards}
                  handleDiscardToggle={handleDiscardToggle}
                  handleCardClick={handleCardClick}
                  cancelTargeting={cancelTargeting}
                  handleUnplayableClick={handleUnplayableClick}
              />
            }
            statusMessage={
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {gameState.gameOver ? (
                  <span style={{ color: 'var(--color-gold)', fontSize: '1rem', fontWeight: 700 }}>
                    🏆 {winnerText} CHIẾN THẮNG!
                  </span>
                ) : !isMyTurn ? (
                  'Đang chờ đối thủ...'
                ) : needsDiscard ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '4px' }}>
                        ⚠️ BẠN CẦN BỎ {discardAmount} LÁ BÀI! (Đã chọn {selectedDiscards.length})
                      </span>
                      {selectedDiscards.length === discardAmount && (
                          <button className="btn-action" style={{ background: '#ef4444', color: 'white', border: '1px solid white' }} onClick={(e) => { e.stopPropagation(); confirmDiscard(); }}>
                              🗑️ Xác nhận Vứt
                          </button>
                      )}
                  </div>
                ) : targetSession ? (
                  <span style={{ color: 'var(--color-red-light)', fontSize: '1rem', fontWeight: 'bold', padding: '10px' }}>
                    {targetSession.targetingDef?.steps?.[targetSession.step]?.message || targetSession.message || '🎯 HÃY CHỌN 1 MỤC TIÊU! 🎯'}
                  </span>
                ) : gameState.phase === PHASES.DRAW ? (
                  <span style={{ color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    👇 Giai đoạn Rút Bài: Hãy bấm "Rút Bài" để tiếp tục!
                  </span>
                ) : gameState.phase === PHASES.ACTION ? (
                  'Đang trong Giai đoạn Hành động'
                ) : (
                  'Đang xử lý...'
                )}
              </div>
            }
            actionBar={
              <ActionBar
                  me={me}
                  isMyTurn={isMyTurn}
                  gameState={gameState}
                  gameAPI={gameAPI}
                  activeSkill={activeSkill}
                  targetSession={targetSession}
                  isActionPending={isActionPending}
                  handleDraw={handleDraw}
                  handleEndTurn={handleEndTurn}
                  handleExecuteSkill={handleExecuteSkill}
                  handleRevealClick={handleRevealClick}
                  cancelTargeting={cancelTargeting}
              />
            }
        />
      </div>

      {/* Mobile Log Backdrop */}
      {showMobileLog && (
        <div className="mobile-log-backdrop" onClick={() => setShowMobileLog(false)} />
      )}

      <div className={`game-log-container ${showMobileLog ? 'mobile-open' : ''}`}>
        <div className="game-log-header">
           <span className="game-log-title">📜 Nhật Ký Trận Đấu</span>
           <button className="mobile-log-close-btn" onClick={() => setShowMobileLog(false)} title="Đóng">✕</button>
        </div>
        <div className="game-log-tabs">
           <div className={`game-log-tab ${logTab === 'all' ? 'active' : ''}`} onClick={() => setLogTab('all')}>Tất cả</div>
           <div className={`game-log-tab ${logTab === 'personal' ? 'active' : ''}`} onClick={() => setLogTab('personal')}>Cá nhân</div>
        </div>
        <div className="game-log" ref={logRef}>
          {gameState.logs?.filter(log => {
             const text = log.text || log.message || '';
             if (logTab === 'all') return true;
             const playerName = `Người chơi ${mainPlayerId + 1}`;
             return text.includes("Bạn") || text.includes(playerName);
          }).map((log, i) => {
            const text = log.text || log.message || '';
            return (
              <div key={i} className={`log-entry ${log.important ? 'important' : ''} ${text.includes("mất") ? 'damage' : ''}`}>
                 <span style={{opacity: 0.5}}>
                   [{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
                 </span> {renderLogText(text)}
              </div>
            );
          })}
        </div>
      </div>

      <ModalContainer mainPlayerId={mainPlayerId} />


      {heroPopup && (
         <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', padding: '16px', boxSizing: 'border-box' }} onClick={() => setHeroPopup(null)}>
            <div style={{ display: 'flex', gap: '24px', maxWidth: '920px', maxHeight: '94vh', overflowY: 'auto', padding: '12px', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
              {(heroPopup.heroes || []).map((hero, idx) => {
                const isSelf = heroPopup.id === mainPlayerId;
                const isRevealed = Boolean(heroPopup.revealedHeroes?.[idx] ?? hero?.isRevealed);
                const isGameOver = Boolean(gameState?.gameOver);
                const isVisible = isSelf || isRevealed || isGameOver;

                if (!isVisible) {
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        background: 'linear-gradient(180deg, #161e2e 0%, #0d121d 100%)', 
                        borderRadius: '16px', 
                        overflow: 'hidden', 
                        border: '2px dashed #4b5563', 
                        width: 'clamp(280px, 42vw, 340px)', 
                        boxShadow: '0 10px 40px rgba(0,0,0,0.85)',
                        display: 'flex',
                        flexDirection: 'column'
                      }} 
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ padding: '12px 12px 6px 12px', background: '#090d16', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ width: '100%', aspectRatio: '1086 / 1448', background: '#1f2937', borderRadius: '4px', border: '1px dashed #4b5563', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ fontSize: '70px', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}>🕵️</div>
                          <div style={{ color: '#9ca3af', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '2px', marginTop: '8px' }}>TƯỚNG ẨN</div>
                          <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '2px' }}>Chưa lộ diện</div>
                        </div>
                      </div>
                      <div style={{ padding: '16px 18px 20px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ margin: '0 0 6px 0', color: '#9ca3af', fontSize: '1.35rem', textAlign: 'center' }}>Tướng Ẩn (???)</h2>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.75rem', padding: '3px 12px', borderRadius: '12px', background: '#4b5563', color: 'white', fontWeight: 'bold' }}>🕵️ HỆ ẨN</span>
                        </div>
                        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed #4b5563', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.5' }}>
                          Võ tướng này đang trong trạng thái ẩn danh. Danh tính và kỹ năng sẽ được hiển lộ khi người chơi phát động kỹ năng hoặc lật tướng!
                        </div>
                      </div>
                    </div>
                  );
                }

                const heroFaction = hero?.faction || heroPopup.faction || 'none';
                const factionColor = heroPopup.isDaTam ? '#9ca3af' : (heroFaction === 'Lạc' ? '#10b981' : heroFaction === 'Sơn' ? '#b45309' : heroFaction === 'Hà' ? '#3b82f6' : '#ef4444');
                const factionLabel = heroPopup.isDaTam ? '🐺 DÃ TÂM' : `PHE ${heroFaction.toUpperCase()}`;

                return (
                  <div key={idx} style={{ background: 'linear-gradient(180deg, #161e2e 0%, #0d121d 100%)', borderRadius: '16px', overflow: 'hidden', border: `2px solid ${factionColor}`, width: 'clamp(280px, 42vw, 340px)', boxShadow: '0 10px 40px rgba(0,0,0,0.85), 0 0 20px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '12px 12px 6px 12px', background: '#090d16', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {hero?.image ? (
                        <div style={{ width: '100%', aspectRatio: '1086 / 1448', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                          <img src={`/images/heroes/${hero.image}`} alt={hero.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '1086 / 1448', background: '#1f2937', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>
                          {hero?.emoji || '🎴'}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '16px 18px 20px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h2 style={{ margin: '0 0 6px 0', color: 'var(--color-gold)', fontSize: '1.35rem', textAlign: 'center', fontWeight: 'bold' }}>{hero?.name}</h2>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', padding: '3px 14px', borderRadius: '12px', background: factionColor, color: 'white', fontWeight: 'bold', letterSpacing: '0.8px' }}>{factionLabel}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {hero?.skills?.map((skill, sIdx) => (
                          <div key={sIdx} style={{ fontSize: '0.85rem', lineHeight: '1.45', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <strong style={{ color: 'var(--color-gold-light)', display: 'block', marginBottom: '2px', fontSize: '0.9rem' }}>{skill.name}:</strong>
                            <span style={{ color: '#d1d5db' }}>{skill.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
         </div>
      )}

      {cardPopup && (
         <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }} onClick={() => setCardPopup(null)}>
            <div style={{ background: '#111827', borderRadius: '16px', padding: '30px', border: '2px solid var(--color-gold)', maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
               <div style={{ fontSize: '4rem', marginBottom: '10px' }}>{cardPopup.emoji}</div>
               <h2 style={{ color: cardPopup.color === 'red' ? '#ef4444' : 'white', margin: '0 0 5px 0' }}>{cardPopup.name}</h2>
               <div style={{ fontSize: '1.2rem', marginBottom: '15px', fontWeight: 'bold' }}>{getSuitEmoji(cardPopup.suit)} {cardPopup.rank}</div>
               <div style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>{cardPopup.desc}</div>
               <button className="btn-action primary" style={{ marginTop: '20px' }} onClick={() => setCardPopup(null)}>Đóng</button>
            </div>
         </div>
      )}

      <ChatWidget style={{ position: 'absolute', top: '100px', left: '20px', zIndex: 90, height: '300px', width: '280px' }} />
    </div>
  );
}
