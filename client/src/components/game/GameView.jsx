// @ts-check
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { useGameState, useGameAPI, useGameController } from '../../contexts/GameProvider';
import { ModalContainer } from '../modals/ModalContainer';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';
import { PHASES } from '../../data/gameData';
import "../../index.css";

import { useTargeting } from './hooks/useTargeting';
import { useSkillInteraction } from './hooks/useSkillInteraction';
import { useCardInteraction } from './hooks/useCardInteraction';

import { DraftScreen } from './DraftScreen';
import { PlayerBoard } from './PlayerBoard';
import MyHeroBar from "./MyHeroBar";
import { PlayerHand } from './PlayerHand';
import { ActionBar } from './ActionBar';

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

  const startNewGame = useCallback(() => {
    gameController.restart(4);
  }, [gameController]);

  const [activeSkill, setActiveSkill] = useState(null);
  const [targetSession, setTargetSession] = useState(null);
  const [phaseBanner, setPhaseBanner] = useState(null);
  const [heroPopup, setHeroPopup] = useState(null);
  const [cardPopup, setCardPopup] = useState(null);

  const [prevHp, setPrevHp] = useState(null);
  const [damageFlash, setDamageFlash] = useState(false);
  const mainPlayerId = 0; // Tạm thời hardcode, sau này lấy từ Auth/Context
  
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

  const { handleCardClick, handleDiscardToggle, confirmDiscard, selectedDiscards, setSelectedDiscards } = useCardInteraction({
      gameState,
      gameAPI,
      activeSkill,
      targetSession,
      setTargetSession,
      cancelTargeting,
      mainPlayerId: gameState?.players?.[0]?.id ?? mainPlayerId
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

  useEffect(() => {
    if (gameState && gameState.players && gameState.players.length > 0) {
      const myHp = gameState.players[0].hp;
      if (prevHp !== null && myHp < prevHp) {
        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 800);
        
        const dmgLog = gameState.logs.slice(-3).find(l => l?.text?.includes("mất") && l?.text?.includes("Sinh Lực"));
        if (dmgLog) showPhaseBanner(dmgLog.text);
      }
      setPrevHp(myHp);
    }
  }, [gameState, prevHp]);

  /** @returns {import('react').CSSProperties} */
  const getOpponentStyle = (index, totalOpponents) => {
    // Nếu chỉ có 1 đối thủ (2 người chơi), cho ở giữa trên cùng
    const angleDeg = totalOpponents === 1 ? 90 : 180 - (180 / (totalOpponents - 1)) * index;
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Ellipse parameters
    const rx = 24; // Bán kính ngang (vw) - Giữ ở mức 24 để không đè log chat
    const ry = 28; // Bán kính dọc (phần trăm) - Giảm xuống 28 để người chơi 3 không bị tràn màn hình trên khi base là 45%
    
    // Adjusted center: left is 50% - 160px, top is 45% (moved up to avoid overlapping MyHeroBar)
    const leftCss = `calc(50% - 160px + ${rx * Math.cos(angleRad)}vw)`;
    const topCss = `${45 - ry * Math.sin(angleRad)}%`; // Trả về tâm 45%
    
    return {
      position: 'absolute',
      left: leftCss,
      top: topCss,
      transform: 'translate(-50%, -50%) scale(0.85)',
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
  
  if (gameState.phase === PHASES.DRAFT) {
    return <DraftScreen gameState={gameState} me={gameState.players[0]} gameController={gameController} />;
  }

  const me = gameState.players[0];
  const opponents = gameState.players.slice(1);
  const isMyTurn = gameState.currentPlayerIndex === 0;
  const needsDiscard = gameState.phase === PHASES.DISCARD && isMyTurn && me.hand.length > me.hp && (!gameState.waitingForResponse || gameState.waitingForResponse.type === 'discard_phase');
  
  return (
    <div className={`game-board ${damageFlash ? 'damage-flash' : ''}`}>
      {/* Background Image Container with blur filter */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, overflow: 'hidden' }}>
         <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url('/images/bgs/${me.heroes?.[0]?.image || me.hero?.image || 'default.jpg'}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(25px) brightness(0.25) saturate(1.2)', transform: 'scale(1.1)' }} />
      </div>

      <div className="game-top-bar">
        <div className="game-title">Việt Sát</div>
        <div className="game-status">
          <div className="turn-indicator">
            {gameState.currentPlayerIndex === 0 ? '▶ Lượt của bạn' : `⏳ Chờ người chơi ${gameState.currentPlayerIndex + 1}`}
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
                  {card.suit} {card.rank}
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

      <div className="player-hand-area">
        <MyHeroBar
            me={me}
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
                        ⚠️ BẠN CẦN BỎ {me.hand.length - me.hp} LÁ BÀI! (Đã chọn {selectedDiscards.length})
                      </span>
                      {selectedDiscards.length === me.hand.length - me.hp && (
                          <button className="btn-action" style={{ background: '#ef4444', color: 'white', border: '1px solid white' }} onClick={confirmDiscard}>
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

      <div className="game-log" ref={logRef}>
        {gameState.logs?.map((log, i) => (
          <div key={i} className={`log-entry ${log.important ? 'important' : ''} ${log.text?.includes("mất") ? 'damage' : ''}`}>
             <span style={{opacity: 0.5}}>
               [{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
             </span> {renderLogText(log.text)}
          </div>
        ))}
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
               <div style={{ fontSize: '1.2rem', marginBottom: '15px', fontWeight: 'bold' }}>{cardPopup.suit} {cardPopup.rank}</div>
               <div style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>{cardPopup.desc}</div>
               <button className="btn-action primary" style={{ marginTop: '20px' }} onClick={() => setCardPopup(null)}>Đóng</button>
            </div>
         </div>
      )}
    </div>
  );
}
