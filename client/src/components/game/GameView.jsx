import { getSuitEmoji } from 'shared/constants/cardTypes';
// @ts-check
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    
    // Tăng bán kính elip khi có nhiều người để trải đều
    const rx = totalOpponents > 4 ? 36 : 28; // vw
    const ry = totalOpponents > 4 ? 35 : 28; // %
    const baseY = totalOpponents > 4 ? 40 : 45; // Trọng tâm Y
    
    // Tính toán vị trí tâm (Lùi sang trái 160px để nhường chỗ cho History Sidebar)
    const leftCss = `calc(50% - 160px + ${rx * Math.cos(angleRad)}vw)`;
    const topCss = `${baseY - ry * Math.sin(angleRad)}%`; 
    
    // Thu nhỏ thẻ người chơi khi có >= 6 người để không bị đè nhau
    const scale = totalOpponents >= 6 ? 0.7 : (totalOpponents >= 4 ? 0.8 : 0.85);
    
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
        <div className="game-status" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
        </div>
      </div>
      
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
        
        <div className="board-center" style={{ zIndex: 1, position: 'absolute', top: '50%', left: 'calc(50% - 160px)', transform: 'translate(-50%, -50%)', width: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div className="deck-info" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
               <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>{gameState.deck?.length || 0}</div>
               <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Bài Cầm</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
               <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{gameState.discardPile?.length || 0}</div>
               <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Bỏ Đi</div>
            </div>
          </div>

          <div className="played-cards" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', minHeight: '120px', alignItems: 'center' }}>
            {gameState.playedCards?.map((card, i) => (
              <div
                key={`${card.id}-${i}`}
                className={`card ${card.type}`}
                style={{
                  transform: `rotate(${Math.random() * 10 - 5}deg) scale(0.9) translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px)`,
                  margin: '-15px',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                  cursor: 'pointer'
                }}
                title={`${card.name}: ${card.desc}`}
                onClick={() => setCardPopup(card)}
              >
                <div className="card-suit-corner" style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '0.75rem', color: card.color === 'red' ? '#ef4444' : '#111', background: 'rgba(255, 255, 255, 0.85)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  {getSuitEmoji(card.suit)} {card.rank}
                </div>
                <div className="card-inner" style={{ paddingTop: '12px' }}>
                  <span className="card-icon">{card.emoji}</span>
                  <span className="card-name">{card.name}</span>
                </div>
              </div>
            ))}
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
                    🏆 {gameState.winner ? (getHeroNameStr(gameState.winner) || `Người chơi ${gameState.winner.id + 1}`) : 'Ai đó'} CHIẾN THẮNG!
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

      <div className="game-log-container">
        <div className="game-log-tabs">
           <div className={`game-log-tab ${logTab === 'all' ? 'active' : ''}`} onClick={() => setLogTab('all')}>Tất cả</div>
           <div className={`game-log-tab ${logTab === 'personal' ? 'active' : ''}`} onClick={() => setLogTab('personal')}>Cá nhân</div>
        </div>
        <div className="game-log" ref={logRef}>
          {gameState.logs?.filter(log => {
             if (logTab === 'all') return true;
             const playerName = `Người chơi ${mainPlayerId + 1}`;
             return log.text?.includes("Bạn") || log.text?.includes(playerName);
          }).map((log, i) => (
            <div key={i} className={`log-entry ${log.important ? 'important' : ''} ${log.text?.includes("mất") ? 'damage' : ''}`}>
               <span style={{opacity: 0.5}}>
                 [{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
               </span> {renderLogText(log.text)}
            </div>
          ))}
        </div>
      </div>

      <ModalContainer mainPlayerId={mainPlayerId} />


      {heroPopup && (
         <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }} onClick={() => setHeroPopup(null)}>
            <div style={{ display: 'flex', gap: '30px', maxWidth: '900px' }}>
                <div style={{ background: '#111827', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--color-gold)', width: '320px', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ height: '380px', background: '#374151', position: 'relative' }}>
                        {heroPopup.heroes?.[0]?.image ? <img src={`/images/heroes/${heroPopup.heroes?.[0]?.image}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{heroPopup.heroes?.[0]?.emoji}</div>}
                    </div>
                    <div style={{ padding: '20px' }}>
                        <h2 style={{ margin: '0 0 10px 0', color: 'var(--color-gold)', fontSize: '1.5rem', textAlign: 'center' }}>{heroPopup.heroes?.[0]?.name}</h2>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
                            <span style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '12px', background: heroPopup.isDaTam ? '#9ca3af' : (heroPopup.faction === 'Lạc' ? '#10b981' : heroPopup.faction === 'Sơn' ? '#b45309' : heroPopup.faction === 'Hà' ? '#3b82f6' : '#ef4444'), color: 'white', fontWeight: 'bold' }}>{heroPopup.isDaTam ? '🐺 DÃ TÂM' : `PHE ${heroPopup.faction.toUpperCase()}`}</span>
                        </div>
                        {heroPopup.heroes?.[0]?.skills?.map((skill, idx) => (
                           <div key={idx} style={{ marginBottom: '12px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                               <strong style={{ color: 'var(--color-gold-light)' }}>{skill.name}:</strong> {skill.desc}
                           </div>
                        ))}
                    </div>
                </div>

                <div style={{ background: '#111827', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--color-gold)', width: '320px', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ height: '380px', background: '#374151', position: 'relative' }}>
                        {heroPopup.heroes?.[1]?.image ? <img src={`/images/heroes/${heroPopup.heroes?.[1]?.image}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{heroPopup.heroes?.[1]?.emoji}</div>}
                    </div>
                    <div style={{ padding: '20px' }}>
                        <h2 style={{ margin: '0 0 10px 0', color: 'var(--color-gold)', fontSize: '1.5rem', textAlign: 'center' }}>{heroPopup.heroes?.[1]?.name}</h2>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
                            <span style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '12px', background: heroPopup.isDaTam ? '#9ca3af' : (heroPopup.faction === 'Lạc' ? '#10b981' : heroPopup.faction === 'Sơn' ? '#b45309' : heroPopup.faction === 'Hà' ? '#3b82f6' : '#ef4444'), color: 'white', fontWeight: 'bold' }}>{heroPopup.isDaTam ? '🐺 DÃ TÂM' : `PHE ${heroPopup.faction.toUpperCase()}`}</span>
                        </div>
                        {heroPopup.heroes?.[1]?.skills?.map((skill, idx) => (
                           <div key={idx} style={{ marginBottom: '12px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                               <strong style={{ color: 'var(--color-gold-light)' }}>{skill.name}:</strong> {skill.desc}
                           </div>
                        ))}
                    </div>
                </div>
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
