import { getSuitEmoji } from 'shared/constants/cardTypes';
import { getCardBg, getBadgeColor } from 'shared/utils/cardStyles';
import { normalizeSkillType, normalizeSkillId, normalizePhase, getPhaseLabel, getFactionLabel, getFactionColor } from 'shared/utils/translationHelper';
// @ts-check
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { useGameState, useGameAPI, useGameController } from '../../contexts/GameProvider';
import { ModalContainer } from '../modals/ModalContainer';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';
import { GameOverModal } from '../modals/GameOverModal';
import { PHASES, CARD_SUBTYPES, getCardSubType } from 'shared/data/gameData';
import { RangeIcon, DistanceIcon, WeaponIcon, ArmorIcon, MountAtkIcon, MountDefIcon } from '../common/GameIcons';
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
   if (!p || !p.heroes) return `Tướng Ẩn ${p ? p.id + 1 : ''}`;
   const revealed = p.heroes.filter((h, i) => p.revealedHeroes?.[i]).map(h => h.name);
   if (revealed.length === 0) return `Tướng Ẩn ${p.id + 1}`;
   return revealed.join(' & ');
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

export default function GameView(props = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isWiki = location.pathname.startsWith('/wiki');
  
  const injectedAPI = useGameAPI();
  const gameController = useGameController();
  const injectedState = useGameState();
  const gameAPI = props.gameAPI || injectedAPI;
  const gameState = props.gameState || injectedState;
  const isActionPending = useRef(false);

  // Auto-reset action lock whenever gameState changes
  useEffect(() => {
    isActionPending.current = false;
  }, [gameState]);

  const [logTab, setLogTab] = useState('all');
  const [showMobileLog, setShowMobileLog] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
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
  const [toastQueue, setToastQueue] = useState([]);
  const [phaseBanner, setPhaseBanner] = useState(null);
  const [directImpactAlert, setDirectImpactAlert] = useState(null);
  const directImpactTimerRef = useRef(null);
  const [gamePace, setGamePace] = useState(() => {
    try {
      return (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function')
        ? (window.localStorage.getItem('viet_sat_game_pace') || 'normal')
        : 'normal';
    } catch (_) {
      return 'normal';
    }
  });
  const [heroPopup, setHeroPopup] = useState(null);
  const [popupTab, setPopupTab] = useState('heroes');
  const [cardPopup, setCardPopup] = useState(null);
  const [isGameOverModalDismissed, setIsGameOverModalDismissed] = useState(false);
  const toastTimerRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const triggerDirectImpactAlert = useCallback((alertData) => {
    if (directImpactTimerRef.current) clearTimeout(directImpactTimerRef.current);
    setDirectImpactAlert(alertData);
    directImpactTimerRef.current = setTimeout(() => {
      setDirectImpactAlert(null);
    }, 3200); // 3.2s để người chơi dễ đọc và nhận biết rõ ràng
  }, []);

  const handlePaceChange = useCallback((newPace) => {
    setGamePace(newPace);
    try {
      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
        window.localStorage.setItem('viet_sat_game_pace', newPace);
      }
    } catch (_) {}
    if (gameAPI && typeof gameAPI.setBotPace === 'function') {
      gameAPI.setBotPace(newPace);
    }
  }, [gameAPI]);

  useEffect(() => {
    if (heroPopup) {
      setPopupTab(heroPopup.initialTab || 'heroes');
    }
  }, [heroPopup]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (directImpactTimerRef.current) clearTimeout(directImpactTimerRef.current);
    };
  }, []);

  const mainPlayerId = typeof window !== 'undefined' && window.playerId !== undefined ? window.playerId : 0; 
  const playerAnimations = usePlayerAnimations(gameState);
  const sfx = useAudioSFX();
  
  const logRef = useRef(null);

  const clickGuardUntilRef = useRef(0);
  const prevPhaseRef = useRef(gameState?.phase);

  useEffect(() => {
    if (prevPhaseRef.current === PHASES.DRAFT && gameState?.phase !== PHASES.DRAFT) {
      setTargetSession(null);
      setActiveSkill(null);
      clickGuardUntilRef.current = Date.now() + 450;
    }
    prevPhaseRef.current = gameState?.phase;
  }, [gameState?.phase]);

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
      mainPlayerId,
      clickGuardUntilRef
  });

  const dismissBanner = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setPhaseBanner(null);
    setToastQueue([]);
  }, []);

  const handleResponseAction = useCallback((payload) => {
    dismissBanner();
    if (!gameState?.waitingForResponse || !gameAPI) return;
    gameAPI.respond(payload);
  }, [gameState, gameAPI, dismissBanner]);

  const handleDraw = useCallback((skipDraw = false, drawExtra = false, khaiQuoc = false) => {
    dismissBanner();
    if (!gameAPI) return;
    gameAPI.drawPhase(mainPlayerId, skipDraw, drawExtra, khaiQuoc);
  }, [gameAPI, mainPlayerId, dismissBanner]);

  const handleEndTurn = useCallback(() => {
    dismissBanner();
    if (!gameAPI) return;
    cancelTargeting();
    isActionPending.current = false;
    gameAPI.endPhase(mainPlayerId);
  }, [gameAPI, cancelTargeting, mainPlayerId, dismissBanner]);

  const showPhaseBanner = useCallback((text) => {
    if (!text) return;
    setToastQueue(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === text) return prev;
      const nextQueue = [...prev, text];
      return nextQueue.slice(-6); // Giữ tối đa 6 thông báo liên tiếp
    });
  }, []);

  const handleRevealClick = useCallback((heroIndex) => {
    dismissBanner();
    if (!gameAPI) return;

    const currentTurnId = gameState?.currentTurnPlayerId ?? gameState?.currentPlayerIndex;
    const isMyTurn = currentTurnId !== undefined && currentTurnId !== null ? currentTurnId === mainPlayerId : true;
    const hasWaitingResponse = Boolean(
      gameState?.waitingForResponse && (
        gameState.waitingForResponse.responderId === mainPlayerId ||
        gameState.waitingForResponse.targetId === mainPlayerId ||
        (Array.isArray(gameState.waitingForResponse.askQueue) && gameState.waitingForResponse.askQueue.includes(mainPlayerId))
      )
    );

    if (!isMyTurn && !hasWaitingResponse) {
      showPhaseBanner("⚠️ Bạn chỉ có thể mở tướng trong lượt của mình hoặc khi có sự kiện kích hoạt!");
      return;
    }

    gameAPI.revealHero(mainPlayerId, heroIndex);
  }, [gameAPI, mainPlayerId, dismissBanner, gameState, showPhaseBanner]);

  const onCardClick = useCallback((card) => {
    dismissBanner();
    handleCardClick(card);
  }, [dismissBanner, handleCardClick]);

  const onDiscardToggle = useCallback((cardId) => {
    dismissBanner();
    handleDiscardToggle(cardId);
  }, [dismissBanner, handleDiscardToggle]);

  useEffect(() => {
    if (targetSession) {
      dismissBanner();
    }
  }, [targetSession, dismissBanner]);

  const confirmPlayCard = useCallback(() => {
    dismissBanner();
    if (!targetSession || isActionPending.current || !gameAPI) return;
    if (!targetSession.card) {
      console.warn('[GameView] Không thể dùng bài hoặc rèn lại khi chưa chọn lá bài!');
      return;
    }
    isActionPending.current = true;
    try {
      const isTienDuyen = activeSkill === 'Tiên Duyên' || normalizeSkillId(activeSkill) === 'tien_duyen';
      const isXiengXich = targetSession.card?.name === 'Xiềng Xích' || targetSession.virtualCardName === 'Xiềng Xích' || isTienDuyen;
      const isReforge = isXiengXich && (!targetSession.selectedTargets || targetSession.selectedTargets.length === 0);
      gameAPI.playCard(mainPlayerId, targetSession.card.id, targetSession.selectedTargets || [], { 
        virtualCardName: targetSession.virtualCardName || (isXiengXich ? 'Xiềng Xích' : undefined),
        isReforge,
        reforge: isReforge,
        asChain: isXiengXich
      });
    } finally {
      setTimeout(() => {
        isActionPending.current = false;
      }, 500);
    }
    cancelTargeting();
  }, [targetSession, activeSkill, gameAPI, mainPlayerId, cancelTargeting, isActionPending, dismissBanner]);

  // 1. Lấy toast tiếp theo từ hàng đợi khi chưa có banner hiển thị
  useEffect(() => {
    if (phaseBanner || toastQueue.length === 0) return;
    const nextToast = toastQueue[0];
    setPhaseBanner(nextToast);
    setToastQueue(prev => prev.slice(1));
  }, [phaseBanner, toastQueue]);

  // 2. Tự động ẩn banner toast với thời lượng thông minh (mượt mà, phản hồi tức thì, không làm delay nhịp chơi)
  useEffect(() => {
    if (!phaseBanner) return;
    const isLongText = (phaseBanner || '').length > 40;
    const duration = toastQueue.length > 0 ? 1100 : (isLongText ? 2200 : 1500);
    toastTimerRef.current = setTimeout(() => {
      setPhaseBanner(null);
    }, duration);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [phaseBanner, toastQueue.length]);

  // 3. Tự động dọn sạch thông báo lỗi thời khi có Modal tương tác mới xuất hiện
  useEffect(() => {
    if (gameState?.waitingForResponse) {
      setPhaseBanner(null);
      setToastQueue([]);
    }
  }, [gameState?.waitingForResponse]);

  // 4. Xóa bỏ thông báo chỉ dẫn khi Phase hoặc Turn đã trôi qua
  useEffect(() => {
    setToastQueue(prev => prev.filter(t => !t.includes('Đến Pha Bỏ Bài')));
    if (phaseBanner && phaseBanner.includes('Đến Pha Bỏ Bài') && gameState?.phase !== PHASES.DISCARD) {
      setPhaseBanner(null);
    }
  }, [gameState?.phase, gameState?.currentPlayerIndex]);

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
      const factionStr = faction && faction !== 'none' ? `Phe ${getFactionLabel(faction).toUpperCase()} ` : '';
      return `${factionStr}(${names})`;
    }
    const heroStr = getHeroNameStr(gameState.winner);
    return (heroStr && heroStr !== 'Chưa lật') ? heroStr : (gameState.winner.name || `Người chơi ${gameState.winner.id + 1}`);
  }, [gameState]);

  const targetPlayer = useMemo(() => {
    if (!heroPopup) return null;
    return gameState?.players?.find(p => p.id === heroPopup.id) || heroPopup;
  }, [heroPopup, gameState?.players]);

  const getPlayerEquip = useCallback((player, subType) => {
    if (!player || !player.equipment) return null;
    if (Array.isArray(player.equipment)) {
      const found = player.equipment.find(c => c && (c.subType === subType || getCardSubType(c) === subType));
      if (found) return found;
    }
    if (subType === CARD_SUBTYPES.EQUIP_WEAPON) return player.equipment.weapon || null;
    if (subType === CARD_SUBTYPES.EQUIP_ARMOR) return player.equipment.armor || null;
    if (subType === CARD_SUBTYPES.EQUIP_MOUNT_ATK) return player.equipment.horse_attack || null;
    if (subType === CARD_SUBTYPES.EQUIP_MOUNT_DEF) return player.equipment.horse_defense || null;
    return null;
  }, []);

  const targetEquipSlots = useMemo(() => {
    if (!targetPlayer) return [];
    return [
      {
        key: 'weapon',
        type: CARD_SUBTYPES.EQUIP_WEAPON,
        label: 'Vũ Khí',
        icon: <WeaponIcon size={18} />,
        card: getPlayerEquip(targetPlayer, CARD_SUBTYPES.EQUIP_WEAPON),
        defaultDesc: 'Tầm bắn cơ bản: 1. Trang bị vũ khí giúp tăng tầm bắn hoặc mở khóa đòn đánh đặc biệt.'
      },
      {
        key: 'armor',
        type: CARD_SUBTYPES.EQUIP_ARMOR,
        label: 'Phòng Cụ',
        icon: <ArmorIcon size={18} />,
        card: getPlayerEquip(targetPlayer, CARD_SUBTYPES.EQUIP_ARMOR),
        defaultDesc: 'Chưa trang bị giáp hộ thân. Phòng cụ giúp tự động phòng thủ hoặc né sát thương.'
      },
      {
        key: 'horse_attack',
        type: CARD_SUBTYPES.EQUIP_MOUNT_ATK,
        label: 'Ngựa Công (-1 Cự ly)',
        icon: <MountAtkIcon size={18} />,
        card: getPlayerEquip(targetPlayer, CARD_SUBTYPES.EQUIP_MOUNT_ATK),
        defaultDesc: 'Chưa cưỡi chiến mã. Ngựa công giúp giảm khoảng cách đến đối thủ đi 1 (-1 cự ly).'
      },
      {
        key: 'horse_defense',
        type: CARD_SUBTYPES.EQUIP_MOUNT_DEF,
        label: 'Ngựa Thủ (+1 Cự ly)',
        icon: <MountDefIcon size={18} />,
        card: getPlayerEquip(targetPlayer, CARD_SUBTYPES.EQUIP_MOUNT_DEF),
        defaultDesc: 'Chưa cưỡi tuấn mã. Ngựa thủ giúp tăng khoảng cách đối thủ tiếp cận bản thân lên 1 (+1 cự ly).'
      }
    ];
  }, [targetPlayer, getPlayerEquip]);

  const targetJudgements = useMemo(() => {
    if (!targetPlayer) return [];
    return targetPlayer.judgementArea || targetPlayer.judges || [];
  }, [targetPlayer]);

  const totalTargetEquipCount = useMemo(() => {
    return targetEquipSlots.filter(s => Boolean(s.card)).length;
  }, [targetEquipSlots]);

  const processedLogsCount = useRef(0);
  useEffect(() => {
    if (!gameState || !gameState.logs) return;
    const currentLogs = gameState.logs;
    const newLogsCount = currentLogs.length - processedLogsCount.current;
    
    if (newLogsCount > 0 && processedLogsCount.current > 0) { // Đừng kêu loạn xạ khi mới load game
        const myPlayer = gameState.players?.find(p => p.id === mainPlayerId) || gameState.players?.[0];
        const myPlayerName = myPlayer?.name || 'Bạn';

        // Xử lý tất cả các log mới
        for (let i = processedLogsCount.current; i < currentLogs.length; i++) {
            const log = currentLogs[i];
            const logText = log?.text || log?.message || (typeof log === 'string' ? log : '');
            if (logText) {
                const text = logText.toLowerCase();

                // 1. Kiểm tra sự kiện tác động trực tiếp lên Bạn (Direct Impact Alert)
                const isImpactOnMe = 
                  (log.victimId !== undefined && log.victimId === mainPlayerId) ||
                  (log.targetId !== undefined && log.targetId === mainPlayerId) ||
                  (myPlayerName && (logText.includes(`của ${myPlayerName}`) || logText.includes(`lên ${myPlayerName}`) || logText.includes(`${myPlayerName} chịu`))) ||
                  logText.includes("của Bạn") || logText.includes("lên Bạn") || logText.includes("Bạn chịu");

                if (isImpactOnMe) {
                  if (log.type === 'STEAL_CARD' || text.includes("đã cướp 1 lá bài") || text.includes("đã cướp")) {
                    const thief = gameState.players?.find(p => p.id === log.thiefId);
                    const thiefName = thief?.name || 'Đối thủ';
                    const cardInfo = log.cardName ? `lá [${log.cardName}${log.cardSuit ? ' ' + log.cardSuit : ''}${log.cardRank ? log.cardRank : ''}]` : '1 lá bài';
                    const fromZone = log.fromZoneDesc || 'trên tay';
                    triggerDirectImpactAlert({
                      icon: '🤏',
                      title: 'BỊ CƯỚP BÀI!',
                      message: `${thiefName} đã cướp ${cardInfo} (${fromZone}) của Bạn!`,
                      type: 'danger'
                    });
                  } else if (log.type === 'DISMANTLE_CARD' || text.includes("đã tước 1 lá bài") || text.includes("đã tước")) {
                    const thief = gameState.players?.find(p => p.id === log.thiefId);
                    const thiefName = thief?.name || 'Đối thủ';
                    const cardInfo = log.cardName ? `lá [${log.cardName}${log.cardSuit ? ' ' + log.cardSuit : ''}${log.cardRank ? log.cardRank : ''}]` : '1 lá bài';
                    const fromZone = log.fromZoneDesc || 'trên tay';
                    triggerDirectImpactAlert({
                      icon: '💥',
                      title: 'BỊ TƯỚC BÀI!',
                      message: `${thiefName} đã tước ${cardInfo} (${fromZone}) của Bạn!`,
                      type: 'danger'
                    });
                  } else if (text.includes("sát thương") || (text.includes("mất") && text.includes("sinh lực"))) {
                    triggerDirectImpactAlert({
                      icon: '🩸',
                      title: 'BỊ THƯƠNG!',
                      message: logText,
                      type: 'danger'
                    });
                  } else if (text.includes("quyết đấu")) {
                    triggerDirectImpactAlert({
                      icon: '⚔️',
                      title: 'BỊ ÉP QUYẾT ĐẤU!',
                      message: logText,
                      type: 'warning'
                    });
                  } else if (text.includes("khu phán xét")) {
                    triggerDirectImpactAlert({
                      icon: '⚖️',
                      title: 'BỊ GẮN PHÁN XÉT!',
                      message: logText,
                      type: 'warning'
                    });
                  }
                }

                // 2. Xử lý âm thanh và banner thông báo chung cho toàn bàn
                if (text.includes("lập công") || text.includes("tiêu diệt kẻ địch") || text.includes("thưởng rút")) {
                    sfx.playDrawCard();
                    showPhaseBanner(logText.startsWith("🎁") ? logText : `🎁 ${logText}`);
                } else if (text.includes("đã tử trận") || text.includes("tử trận!")) {
                    showPhaseBanner(logText.startsWith("💀") ? logText : `💀 ${logText}`);
                } else if (text.includes("ác mộng") || text.includes("ngộ sát đồng minh")) {
                    showPhaseBanner(logText.startsWith("⚠️") ? logText : `⚠️ ${logText}`);
                } else if (text.includes("trạng thái hấp hối") || text.includes("hấp hối (hp: 0)")) {
                    showPhaseBanner(logText.startsWith("⚠️") ? logText : `⚠️ ${logText}`);
                } else if (text.includes("trò chơi kết thúc") || text.includes("chiến thắng độc tôn")) {
                    showPhaseBanner(logText.startsWith("🏆") ? logText : `🏆 ${logText}`);
                } else if (text.includes("sát thương") || (text.includes("mất") && text.includes("sinh lực"))) {
                    sfx.playDamage();
                    showPhaseBanner(`🩸 ${logText}`);
                } else if (text.includes("hồi") && text.includes("sinh lực")) {
                    sfx.playHeal();
                    showPhaseBanner(`💖 ${logText}`);
                } else if (text.includes("[dã man]:") || text.includes("🏹")) {
                    showPhaseBanner(logText.startsWith("🏹") ? logText : `🏹 ${logText}`);
                } else if (text.includes("[vạn tiễn]:") || text.includes("🎯")) {
                    showPhaseBanner(logText.startsWith("🎯") ? logText : `🎯 ${logText}`);
                } else if (text.includes("dã tâm") || text.includes("🐺")) {
                    showPhaseBanner(logText.startsWith("🐺") ? logText : `🐺 ${logText}`);
                } else if (text.includes("đã tước 1 lá bài") || text.includes("tước 1 lá bài")) {
                    showPhaseBanner(`💥 ${logText}`);
                } else if (text.includes("đã cướp 1 lá bài") || text.includes("cướp 1 lá bài")) {
                    showPhaseBanner(`🤏 ${logText}`);
                } else if (text.includes("né thành công")) {
                    sfx.playDodge();
                    showPhaseBanner(`💨 ${logText}`);
                } else if (text.includes("sử dụng [hóa giải]") || text.includes("đã bị [hóa giải]") || text.includes("vô hiệu hóa")) {
                    showPhaseBanner(`🛡️ ${logText}`);
                } else if (text.includes("cẩm nang toàn bàn") && text.includes("có hiệu lực")) {
                    showPhaseBanner(`⚡ ${logText}`);
                } else if (text.includes("dùng [sát]") || text.includes("dùng [chém]")) {
                    sfx.playSlash();
                } else if (text.includes("dùng [né]")) {
                    sfx.playDodge();
                } else if (text.includes("rút") && text.includes("lá bài")) {
                    sfx.playDrawCard();
                } else if (text.includes("bắt đầu lượt")) {
                    sfx.playTurnStart();
                } else if (text.includes("lộ diện tướng") || text.includes("hiển lộ tướng")) {
                    showPhaseBanner(`👁️ ${logText}`);
                } else if (text.includes("khu phán xét")) {
                    showPhaseBanner(`⚖️ ${logText}`);
                }
            }
        }
    }
    processedLogsCount.current = currentLogs.length;
  }, [gameState?.logs, sfx, mainPlayerId, triggerDirectImpactAlert]);

  const prevNeedsDiscard = useRef(false);
  useEffect(() => {
    if (!gameState) return;
    const isDiscarding = gameState.waitingForResponse?.type === 'discard_phase' && 
      (gameState.waitingForResponse?.responderId === mainPlayerId || gameState.waitingForResponse?.responderId === gameState.players?.[0]?.id);
    if (isDiscarding && !prevNeedsDiscard.current) {
      const amount = gameState.waitingForResponse?.amount || 1;
      showPhaseBanner(`⚠️ Đến Pha Bỏ Bài: Hãy chọn ${amount} lá bài trên tay rồi bấm [Bỏ Bài]!`);
    }
    prevNeedsDiscard.current = Boolean(isDiscarding);
  }, [gameState, mainPlayerId, showPhaseBanner]);

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
      rx = totalOpponents > 4 ? 38 : 34; // vw
      ry = 3.5; // % độ võng vòng cung
      baseY = 32.5; // Trọng tâm Y ở 32.5%: Người chơi 3 ở top 29%, Người chơi 2 & 4 ở top 32.5% (tránh đè MyHeroBar ở dưới và hoàn toàn không bị top-bar đè che tên)
      scale = totalOpponents >= 6 ? 0.76 : (totalOpponents >= 4 ? 0.84 : 0.88);
    } else if (isMobile) {
      rx = totalOpponents > 4 ? 37 : 35; // vw
      ry = totalOpponents > 4 ? 18 : 14; // %
      baseY = totalOpponents > 4 ? 34 : 30; // Trọng tâm Y
      scale = totalOpponents >= 6 ? 0.75 : (totalOpponents >= 4 ? 0.82 : 0.88);
    } else {
      rx = totalOpponents > 4 ? 34 : 27;
      ry = 18;
      baseY = 28;
      scale = 1;
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

  // 1. Tự động cuộn xuống tin mới nhất lúc vừa mở modal Log
  useEffect(() => {
    if (showMobileLog) {
      isUserScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
      setTimeout(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      }, 50);
    }
  }, [showMobileLog]);

  // 2. Tự động cuộn khi có logs mới, NHƯNG chỉ khi người chơi KHÔNG đang chủ động cuộn lên xem tin cũ
  useEffect(() => {
    if (logRef.current && !isUserScrolledUpRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
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
        <div className="game-top-left" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'nowrap' }}>
          <div className="game-title">Việt Sát</div>
          
          {/* Text trạng thái giai đoạn dời lên trên chỗ khu vực Việt Sát */}
          <div className="top-status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {gameState.gameOver ? (
              <button 
                type="button"
                onClick={() => setIsGameOverModalDismissed(false)}
                style={{
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.45) 0%, rgba(180, 83, 9, 0.45) 100%)',
                  border: '1.5px solid var(--color-gold)',
                  borderRadius: '12px',
                  padding: '2px 10px',
                  color: 'var(--color-gold)',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                title="Nhấn để mở Bảng Kết Quả Trận Đấu"
              >
                🏆 {winnerText} Thắng! (Xem Kết Quả)
              </button>
            ) : needsDiscard ? (
              <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.74rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                ⚠️ Bỏ {discardAmount} lá ({selectedDiscards.length} đã chọn)
              </span>
            ) : targetSession ? (
              <span style={{ color: '#fca5a5', fontWeight: 'bold', fontSize: '0.74rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239,68,68,0.5)', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                🎯 {targetSession.targetingDef?.type === 'multiple' 
                     ? `Đã chọn ${targetSession.selectedTargets?.length || 0}/${targetSession.targetingDef?.max || 2}`
                     : (targetSession.selectedTargets?.length > 0 ? `Đã chọn ${targetSession.selectedTargets.length} mục tiêu` : 'Hãy chọn mục tiêu!')}
              </span>
            ) : (
              <span style={{ color: isMyTurn ? '#6ee7b7' : '#94a3b8', fontSize: '0.74rem', fontWeight: 600, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                {isMyTurn ? `⚔️ Giai đoạn ${gameState.phase === PHASES.ACTION ? 'Hành động' : gameState.phase === PHASES.DRAW ? 'Rút bài' : gameState.phase}` : '⏳ Chờ đối thủ...'}
              </span>
            )}
          </div>

          {/* Tầm và Cự ly dời lên trên */}
          <div className="top-range-box" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 'bold' }} title="Tầm đánh">
              <RangeIcon size={12} /> Tầm: <strong style={{ color: '#f8fafc' }}>{me.attackRange}</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>|</span>
            <span style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 'bold' }} title="Khoảng cách phòng vệ">
              <DistanceIcon size={12} /> Cự ly: <strong style={{ color: '#f8fafc' }}>+{getPlayerEquip(me, CARD_SUBTYPES.EQUIP_MOUNT_DEF) ? 1 : 0}</strong>
            </span>
          </div>
        </div>

        <div className="game-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button 
             onClick={sfx.toggleMute} 
             style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', opacity: 0.7 }}
             title={sfx.isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
             {sfx.isMuted ? '🔇' : '🔊'}
          </button>
          <div className="turn-indicator" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
            {gameState.currentPlayerIndex === me.id ? '▶ Lượt của bạn' : `⏳ Chờ P${gameState.currentPlayerIndex + 1}`}
          </div>
          <button 
             className="mobile-log-toggle-btn"
             onClick={() => setShowMobileLog(prev => !prev)}
             title="Xem nhật ký trận đấu"
             style={{ padding: '2px 8px', fontSize: '0.74rem' }}
          >
             📜 Log {gameState.logs?.length > 0 && <span className="mobile-log-count">{gameState.logs.length}</span>}
          </button>
          <button 
             onClick={() => setShowGameMenu(true)}
             title="Tùy chọn nhịp độ trận đấu"
             style={{
               background: 'rgba(255, 255, 255, 0.08)',
               border: '1px solid rgba(255, 255, 255, 0.2)',
               color: gamePace === 'slow' ? '#38bdf8' : gamePace === 'fast' ? '#f59e0b' : '#a3e635',
               padding: '2px 8px',
               borderRadius: '6px',
               fontSize: '0.74rem',
               fontWeight: 'bold',
               cursor: 'pointer',
               display: 'inline-flex',
               alignItems: 'center',
               gap: '2px'
             }}
          >
             {gamePace === 'slow' ? '🐢 Chậm' : gamePace === 'fast' ? '⚡ Nhanh' : '⚖️ Chuẩn'}
          </button>
          <button 
             className="game-menu-btn"
             onClick={() => setShowGameMenu(true)}
             title="Tùy chọn & Menu trận đấu"
             style={{
               background: 'rgba(212, 168, 67, 0.2)',
               border: '1px solid var(--color-gold)',
               color: 'var(--color-gold)',
               padding: '2px 8px',
               borderRadius: '6px',
               fontSize: '0.74rem',
               fontWeight: 'bold',
               cursor: 'pointer',
               display: 'inline-flex',
               alignItems: 'center',
               gap: '2px'
             }}
          >
             ⚙️ Menu
          </button>
        </div>
      </div>
      
      {/* Live Combat Action Ticker (Desktop & Mobile) */}
      {gameState.logs && gameState.logs.length > 0 && (
        <div 
          className="live-combat-ticker" 
          onClick={() => setShowMobileLog(true)}
          style={{
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            padding: isMobile ? '4px 10px' : '5px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            zIndex: 40,
            fontSize: isMobile ? '0.75rem' : '0.84rem',
            color: '#cbd5e1',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            userSelect: 'none',
            transition: 'background 0.2s ease'
          }}
          title="Nhấp để mở chi tiết Nhật Ký Trận Đấu"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <span style={{ 
              fontSize: '0.65rem', 
              fontWeight: '800', 
              background: 'linear-gradient(to right, #f59e0b, #d97706)',
              color: '#0f172a',
              padding: '1px 6px',
              borderRadius: '4px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              flexShrink: 0
            }}>
              Mới nhất
            </span>
            <span style={{ 
              color: '#f8fafc', 
              fontWeight: '600',
              overflow: 'hidden', 
              textOverflow: 'ellipsis'
            }}>
              {gameState.logs[gameState.logs.length - 1].text || gameState.logs[gameState.logs.length - 1].message}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, color: '#94a3b8', fontSize: '0.74rem' }}>
            <span>📜 Nhật ký</span>
            <span style={{ fontSize: '0.9rem', color: '#f59e0b' }}>›</span>
          </div>
        </div>
      )}

      {/* Direct Impact Alert Banner (Cảnh Báo Nổi Bật Dành Cho Bạn - Không bị xóa bởi waitingForResponse) */}
      {directImpactAlert && (
        <div 
          style={{
            position: 'fixed',
            top: isMobile ? '82px' : '96px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            minWidth: isMobile ? '92%' : '440px',
            maxWidth: '680px',
            background: directImpactAlert.type === 'danger'
              ? 'linear-gradient(135deg, rgba(185, 28, 28, 0.96) 0%, rgba(127, 29, 29, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(217, 119, 6, 0.96) 0%, rgba(180, 83, 9, 0.98) 100%)',
            border: '2px solid #f59e0b',
            borderRadius: '14px',
            padding: '12px 18px',
            boxShadow: '0 0 30px rgba(245, 158, 11, 0.7), 0 10px 30px rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            boxSizing: 'border-box'
          }}
          onClick={() => setDirectImpactAlert(null)}
          title="Nhấn để đóng cảnh báo"
        >
          <div style={{
            fontSize: '2rem',
            lineHeight: 1,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
            flexShrink: 0
          }}>
            {directImpactAlert.icon || '⚠️'}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '800',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#fef08a',
              marginBottom: '2px'
            }}>
              {directImpactAlert.title || 'CẢNH BÁO TÁC ĐỘNG'}
            </div>
            <div style={{
              fontSize: isMobile ? '0.88rem' : '0.98rem',
              fontWeight: '700',
              lineHeight: 1.35,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)'
            }}>
              {directImpactAlert.message}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDirectImpactAlert(null);
            }}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              flexShrink: 0
            }}
            title="Đóng cảnh báo"
          >
            ✕
          </button>
        </div>
      )}

      {phaseBanner && (
        <div 
          className="game-toast-popup" 
          onClick={() => {
            dismissBanner();
          }}
          title="Nhấn để đóng thông báo"
        >
          <span className="game-toast-icon">
            {phaseBanner.includes('🎁') || phaseBanner.includes('LẬP CÔNG') ? '🎁' :
             phaseBanner.includes('💀') || phaseBanner.includes('TỬ TRẬN') ? '💀' :
             phaseBanner.includes('🏆') ? '🏆' :
             phaseBanner.includes('🏹') || phaseBanner.includes('Dã Man') ? '🏹' :
             phaseBanner.includes('🎯') || phaseBanner.includes('Vạn Tiễn') ? '🎯' :
             phaseBanner.includes('🐺') || phaseBanner.includes('Dã Tâm') ? '🐺' :
             phaseBanner.includes('👁️') ? '👁️' :
             phaseBanner.includes('🩸') || phaseBanner.includes('sát thương') ? '🩸' :
             phaseBanner.includes('💖') ? '💖' :
             phaseBanner.includes('⚔️') || phaseBanner.includes('chém') ? '⚔️' :
             phaseBanner.includes('⚖️') || phaseBanner.includes('phán xét') ? '⚖️' :
             phaseBanner.includes('📜') ? '📜' :
             phaseBanner.includes('💥') || phaseBanner.includes('tước') ? '💥' :
             phaseBanner.includes('🤏') || phaseBanner.includes('cướp') ? '🤏' :
             phaseBanner.includes('🛡️') || phaseBanner.includes('hóa giải') ? '🛡️' :
             phaseBanner.includes('💨') || phaseBanner.includes('né') ? '💨' :
             phaseBanner.includes('⚡') ? '⚡' :
             phaseBanner.includes('⚠️') ? '⚠️' : '📢'}
          </span>
          <span className="game-toast-text">
            {phaseBanner.replace(/^[🎁💀🏆🏹🎯🐺👁️🩸💖⚔️⚖️📜💥🤏🛡️💨⚡⚠️📢\s]+/, '')}
          </span>
          <button 
            type="button" 
            className="game-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              dismissBanner();
            }}
            title="Đóng thông báo"
          >
            ✕
          </button>
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
        
        {/* Landscape Mobile: Đưa Bài Cầm & Bỏ Đi sang góc phải giữa Người chơi 3 và 4 để không đè bàn trang bị */}
        {isLandscapeMobile && (
          <div 
            className="deck-info deck-info-landscape" 
            style={{ 
              position: 'absolute', 
              top: '29%', 
              left: 'calc(50% + 17.5vw)', 
              transform: 'translate(-50%, -50%) scale(0.88)', 
              display: 'flex', 
              gap: '8px', 
              zIndex: 6,
              pointerEvents: 'none'
            }}
          >
            <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.75)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(212, 168, 67, 0.4)', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
               <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--color-gold)', lineHeight: 1.1 }}>{gameState.deck?.length || 0}</div>
               <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>Bài Cầm</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.75)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
               <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--color-text-muted)', lineHeight: 1.1 }}>{gameState.discardPile?.length || 0}</div>
               <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>Bỏ Đi</div>
            </div>
          </div>
        )}

        <div className="board-center" style={{ zIndex: 1, position: 'absolute', top: isLandscapeMobile ? '49%' : (isMobile ? '46%' : '38%'), left: isMobile ? '50%' : 'calc(50% - 160px)', transform: isLandscapeMobile ? 'translate(-50%, -50%) scale(0.85)' : 'translate(-50%, -50%)', width: isLandscapeMobile ? '380px' : '320px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {!isLandscapeMobile && (
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
          )}

          <div className="played-cards" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', minHeight: isLandscapeMobile ? (gameState.playedCards?.length ? '65px' : '0px') : '120px', alignItems: 'center' }}>
            {gameState.playedCards?.map((card, i) => {
              const bg = getCardBg(card.name);
              return (
                <div
                  key={`${card.id}-${i}`}
                  className={`card ${card.type}`}
                  style={{
                    ...(bg ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}),
                    transform: `rotate(${Math.random() * 10 - 5}deg) scale(${isLandscapeMobile ? 0.76 : 0.9}) translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px)`,
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
            {targetSession && (() => {
              const hasCard = Boolean(targetSession.card);
              const isTienDuyen = activeSkill === 'Tiên Duyên' || normalizeSkillId(activeSkill) === 'tien_duyen';
              const cardName = targetSession.virtualCardName || targetSession.card?.name || (isTienDuyen ? 'Xiềng Xích' : (activeSkill || ''));
              const isXiengXich = cardName === 'Xiềng Xích' || targetSession.card?.name === 'Xiềng Xích' || isTienDuyen;
              const isMultiple = targetSession.targetingDef?.type === 'multiple';
              const selectedCount = targetSession.selectedTargets?.length || 0;
              const maxTargets = targetSession.targetingDef?.max || (isXiengXich ? 2 : 1);
              const minTargets = targetSession.targetingDef?.min !== undefined ? targetSession.targetingDef.min : 1;
              const isReforge = hasCard && isXiengXich && selectedCount === 0;

              let message = targetSession.targetingDef?.steps?.[targetSession.step]?.message || targetSession.message;
              if (isMultiple) {
                if (selectedCount === 0) {
                  message = isXiengXich
                    ? (hasCard 
                        ? `[Xiềng Xích]: Đã chọn [${targetSession.card.name}] (Bấm "Rèn Lại" nếu không khóa ai)`
                        : `[Xiềng Xích]: Hãy nhấp chọn 1 lá bài ♣ trên tay`)
                    : `[${cardName}]: Đã chọn 0/${maxTargets} mục tiêu`;
                } else {
                  message = `[${cardName}]: Đã chọn ${selectedCount}/${maxTargets} mục tiêu${selectedCount >= maxTargets ? ' (Đã đủ)' : ''}`;
                }
              }

              const hasEnoughTargets = isMultiple 
                ? (selectedCount >= minTargets)
                : (selectedCount > 0);

              const canConfirm = Boolean(
                hasCard && (
                  ['none', 'aoe', 'self'].includes(targetSession.targetingDef?.type) ||
                  isReforge ||
                  hasEnoughTargets
                )
              );

              let confirmLabel = `Dùng ${cardName}`.trim();
              if (isXiengXich) {
                confirmLabel = isReforge ? 'Rèn Lại (Bỏ 1)' : `Khóa Xích (${selectedCount}/${maxTargets})`;
              } else if (isMultiple) {
                confirmLabel = `Xác Nhận (${selectedCount}/${maxTargets})`;
              }

              return (
                <div 
                  className="target-notification-banner"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%)',
                    border: '1.5px solid #f59e0b',
                    borderRadius: '20px',
                    padding: '5px 12px',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.8), 0 0 14px rgba(245, 158, 11, 0.45)',
                    zIndex: 50,
                    marginTop: '6px',
                    maxWidth: '100%',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ 
                    fontSize: '0.84rem', 
                    color: '#f8fafc', 
                    fontWeight: 'bold',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                  }}>
                    {message}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn-notification-cancel"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelTargeting();
                      }}
                      style={{
                        background: 'rgba(51, 65, 85, 0.95)',
                        color: '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '12px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        lineHeight: 1.2
                      }}
                      title="Hủy thao tác"
                    >
                      ✕ Hủy
                    </button>

                    {canConfirm && (
                      <button
                        type="button"
                        className="btn-notification-confirm"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmPlayCard();
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                          color: '#1e1b4b',
                          border: '1px solid #fef08a',
                          borderRadius: '12px',
                          padding: '3px 10px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          lineHeight: 1.2,
                          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.6)'
                        }}
                        title={`Xác nhận sử dụng [${cardName}]`}
                      >
                        ✓ {confirmLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}></div>

      <div className="player-hand-area" onClick={() => { dismissBanner(); cancelTargeting(); }}>
        <MyHeroBar
            me={me}
            isMyTurn={isMyTurn}
            activeSkill={activeSkill}
            setActiveSkill={setActiveSkill}
            handleExecuteSkill={(skillId) => {
              dismissBanner();
              handleExecuteSkill(skillId);
            }}
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
                  handleDiscardToggle={onDiscardToggle}
                  handleCardClick={onCardClick}
                  cancelTargeting={cancelTargeting}
                  handleUnplayableClick={handleUnplayableClick}
                  confirmPlayCard={confirmPlayCard}
              />
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
                  needsDiscard={needsDiscard}
                  discardAmount={discardAmount}
                  selectedDiscards={selectedDiscards}
                  confirmDiscard={confirmDiscard}
              />
            }
        />
      </div>

      {/* Mobile Log Backdrop */}
      {showMobileLog && (
        <div className="mobile-log-backdrop" onClick={() => setShowMobileLog(false)} />
      )}

      <div className={`game-log-container ${showMobileLog ? 'mobile-open' : ''}`}>
        <div className="game-log-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
           <span className="game-log-title" style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>
             📜 Nhật Ký Trận Đấu {gameState.logs?.length > 0 && `(${gameState.logs.length})`}
           </span>
           <button 
             className="mobile-log-close-btn" 
             onClick={() => setShowMobileLog(false)} 
             title="Thoát nhật ký"
             style={{ 
               background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
               color: 'white', 
               border: '1px solid rgba(255, 255, 255, 0.25)', 
               borderRadius: '8px', 
               padding: '6px 16px', 
               fontSize: '0.88rem', 
               fontWeight: 'bold', 
               display: 'inline-flex', 
               alignItems: 'center', 
               gap: '6px', 
               cursor: 'pointer',
               boxShadow: '0 2px 8px rgba(239, 68, 68, 0.45)',
               minHeight: '34px'
             }}
           >
             ✕ Thoát
           </button>
        </div>
        <div 
          className="game-log-tabs" 
          style={{ 
            display: 'flex', 
            justifyContent: 'flex-start', 
            gap: '6px', 
            padding: '6px 12px', 
            background: 'rgba(0,0,0,0.3)', 
            borderBottom: '1px solid rgba(255,255,255,0.08)', 
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'thin',
            WebkitTextSizeAdjust: '100%', 
            textSizeAdjust: '100%', 
            touchAction: 'manipulation' 
          }}
        >
           <div 
             className={`game-log-tab ${logTab === 'all' ? 'active' : ''}`} 
             onClick={() => setLogTab('all')} 
             style={{ 
               flexShrink: 0,
               padding: '0 12px', 
               height: '30px', 
               display: 'inline-flex', 
               alignItems: 'center', 
               justifyContent: 'center', 
               borderRadius: '6px', 
               fontSize: '0.82rem', 
               cursor: 'pointer', 
               fontWeight: logTab === 'all' ? 'bold' : 'normal', 
               background: logTab === 'all' ? 'var(--color-gold)' : 'rgba(255,255,255,0.06)', 
               color: logTab === 'all' ? '#111827' : '#94a3b8', 
               transition: 'all 0.2s', 
               WebkitTextSizeAdjust: '100%', 
               textSizeAdjust: '100%', 
               touchAction: 'manipulation', 
               WebkitTapHighlightColor: 'transparent', 
               userSelect: 'none', 
               WebkitUserSelect: 'none' 
             }}
           >
             Tất cả
           </div>
           <div 
             className={`game-log-tab ${logTab === 'personal' ? 'active' : ''}`} 
             onClick={() => setLogTab('personal')} 
             style={{ 
               flexShrink: 0,
               padding: '0 12px', 
               height: '30px', 
               display: 'inline-flex', 
               alignItems: 'center', 
               justifyContent: 'center', 
               borderRadius: '6px', 
               fontSize: '0.82rem', 
               cursor: 'pointer', 
               fontWeight: logTab === 'personal' ? 'bold' : 'normal', 
               background: logTab === 'personal' ? 'var(--color-gold)' : 'rgba(255,255,255,0.06)', 
               color: logTab === 'personal' ? '#111827' : '#94a3b8', 
               transition: 'all 0.2s', 
               WebkitTextSizeAdjust: '100%', 
               textSizeAdjust: '100%', 
               touchAction: 'manipulation', 
               WebkitTapHighlightColor: 'transparent', 
               userSelect: 'none', 
               WebkitUserSelect: 'none' 
             }}
           >
             Cá nhân
           </div>
           {gameState.players?.filter(p => p.id !== mainPlayerId).map(p => {
             const isTabActive = String(logTab) === String(p.id);
             const label = p.name || `Người chơi ${p.id + 1}`;

             return (
               <div 
                 key={p.id}
                 className={`game-log-tab ${isTabActive ? 'active' : ''}`} 
                 onClick={() => setLogTab(p.id)} 
                 style={{ 
                   flexShrink: 0,
                   padding: '0 12px', 
                   height: '30px', 
                   display: 'inline-flex', 
                   alignItems: 'center', 
                   justifyContent: 'center', 
                   borderRadius: '6px', 
                   fontSize: '0.82rem', 
                   cursor: 'pointer', 
                   fontWeight: isTabActive ? 'bold' : 'normal', 
                   background: isTabActive ? 'var(--color-gold)' : 'rgba(255,255,255,0.06)', 
                   color: isTabActive ? '#111827' : '#94a3b8', 
                   transition: 'all 0.2s', 
                   WebkitTextSizeAdjust: '100%', 
                   textSizeAdjust: '100%', 
                   touchAction: 'manipulation', 
                   WebkitTapHighlightColor: 'transparent', 
                   userSelect: 'none', 
                   WebkitUserSelect: 'none' 
                 }}
                 title={`Xem nhật ký của ${label}`}
               >
                 {label}
               </div>
             );
           })}
        </div>
        <div 
          className="game-log" 
          ref={logRef} 
          onScroll={(e) => {
            const el = e.currentTarget;
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
            isUserScrolledUpRef.current = !isNearBottom;
            setShowScrollBottomBtn(!isNearBottom);
          }}
          style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '5px', WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%', touchAction: 'manipulation' }}
        >
          {(() => {
            const filteredLogs = gameState.logs?.filter(log => {
              if (logTab === 'all') return true;
              const text = log.text || log.message || '';

              if (logTab === 'personal') {
                const mePlayer = gameState.players.find(p => p.id === mainPlayerId);
                const myHeroNames = mePlayer?.heroes?.map(h => h?.name).filter(Boolean) || [];
                const myPlayerName = `Người chơi ${mainPlayerId + 1}`;
                return log.turnPlayerId === mainPlayerId ||
                       log.sourceId === mainPlayerId ||
                       log.targetId === mainPlayerId ||
                       log.playerId === mainPlayerId ||
                       text.includes("Bạn") || 
                       text.includes(myPlayerName) || 
                       (mePlayer?.name && text.includes(mePlayer.name)) ||
                       myHeroNames.some(hn => text.includes(hn));
              }

              const targetPlayer = gameState.players?.find(p => String(p.id) === String(logTab));
              if (targetPlayer) {
                const pPlayerName = `Người chơi ${targetPlayer.id + 1}`;
                const pHeroNames = targetPlayer.heroes?.map(h => h?.name).filter(Boolean) || [];
                return log.turnPlayerId === targetPlayer.id ||
                       log.sourceId === targetPlayer.id ||
                       log.targetId === targetPlayer.id ||
                       log.playerId === targetPlayer.id ||
                       (targetPlayer.name && text.includes(targetPlayer.name)) ||
                       text.includes(pPlayerName) ||
                       pHeroNames.some(hn => text.includes(hn));
              }

              return true;
            }) || [];

            if (filteredLogs.length === 0) {
              const currentTabPlayer = gameState.players?.find(p => String(p.id) === String(logTab));
              const emptyMessage = logTab === 'personal' 
                ? 'Chưa có nhật ký cá nhân nào.' 
                : logTab === 'all' 
                  ? 'Chưa có nhật ký trận đấu.' 
                  : `Chưa có nhật ký cho ${currentTabPlayer?.name || `Người chơi ${currentTabPlayer ? currentTabPlayer.id + 1 : ''}`}.`;
              return (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem', padding: '24px 10px', fontStyle: 'italic', WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}>
                  {emptyMessage}
                </div>
              );
            }

            return filteredLogs.map((log, i) => {
              const text = log.text || log.message || '';
              return (
                <div 
                  key={i} 
                  className={`log-entry ${log.important ? 'important' : ''} ${text.includes("mất") ? 'damage' : ''}`} 
                  style={{ 
                    fontSize: '0.84rem', 
                    lineHeight: '1.4',
                    WebkitTextSizeAdjust: '100%',
                    textSizeAdjust: '100%',
                    touchAction: 'manipulation'
                  }}
                >
                   <span style={{ opacity: 0.5, marginRight: '6px', fontSize: '0.78rem' }}>
                     [{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
                   </span> {renderLogText(text)}
                </div>
              );
            });
          })()}
        </div>
        {showScrollBottomBtn && (
          <button 
            type="button" 
            className="log-scroll-bottom-btn"
            onClick={() => {
              if (logRef.current) {
                logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
                isUserScrolledUpRef.current = false;
                setShowScrollBottomBtn(false);
              }
            }}
            title="Cuộn xuống xem diễn biến mới nhất"
          >
            ⬇ Tin mới nhất
          </button>
        )}
        <div className="game-log-footer" style={{ padding: '8px 16px', background: 'rgba(15, 23, 42, 0.98)', borderTop: '1px solid rgba(212, 168, 67, 0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button 
            onClick={() => setShowMobileLog(false)}
            style={{ 
              height: '32px',
              minHeight: '32px',
              padding: '0 28px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(212, 168, 67, 0.6)',
              color: 'var(--color-gold)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.2s ease',
              flex: 'none'
            }}
          >
            ✕ Đóng Nhật Ký
          </button>
        </div>
      </div>

      <ModalContainer mainPlayerId={mainPlayerId} />

      {/* HERO DETAIL MODAL (Zoom Võ Tướng) */}
      {heroPopup && (
         <div 
           style={{ 
             position: 'fixed', 
             top: 0, 
             left: 0, 
             width: '100%', 
             height: '100%', 
             background: 'rgba(0,0,0,0.85)', 
             zIndex: 1200, 
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'center', 
             backdropFilter: 'blur(8px)', 
             padding: '10px', 
             boxSizing: 'border-box' 
           }} 
           onClick={() => setHeroPopup(null)}
         >
           <div
             style={{
               position: 'relative',
               background: 'linear-gradient(165deg, #1e293b 0%, #0f172a 100%)',
               border: '1.5px solid rgba(212, 168, 67, 0.55)',
               borderRadius: '14px',
               boxShadow: '0 12px 40px rgba(0, 0, 0, 0.9), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
               padding: isLandscapeMobile ? '10px 16px 12px 16px' : '16px',
               maxWidth: isLandscapeMobile ? '640px' : '92vw',
               maxHeight: isLandscapeMobile ? '92vh' : '88vh',
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               boxSizing: 'border-box'
             }}
             onClick={e => e.stopPropagation()}
           >
             {/* Nút thoát nổi góc trên bên phải của modal dialog */}
             <button 
               onClick={() => setHeroPopup(null)} 
               title="Thoát xem tướng"
               style={{ 
                 position: 'absolute', 
                 top: '10px', 
                 right: '12px', 
                 zIndex: 10, 
                 background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                 color: 'white', 
                 border: '1px solid rgba(255, 255, 255, 0.35)', 
                 borderRadius: '6px', 
                 padding: '3px 10px', 
                 fontSize: '0.75rem', 
                 fontWeight: 'bold', 
                 cursor: 'pointer',
                 boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
               }}
             >
               ✕ Đóng
             </button>

             <div style={{ color: 'var(--color-gold)', fontSize: '0.92rem', fontWeight: 'bold', marginBottom: '8px', paddingRight: '50px', textShadow: '0 2px 4px rgba(0,0,0,0.8)', textAlign: 'center' }}>
               📜 Hồ Sơ: {targetPlayer.name} {targetPlayer.isRevealed ? (targetPlayer.isDaTam ? '(Phe Dã Tâm)' : `(Phe ${targetPlayer.faction})`) : '(Chưa lộ diện)'}
             </div>

             {/* Segmented Tab Controls */}
             <div style={{
               display: 'flex',
               gap: '8px',
               marginBottom: '10px',
               background: 'rgba(15, 23, 42, 0.7)',
               padding: '3px',
               borderRadius: '24px',
               border: '1px solid rgba(212, 168, 67, 0.35)',
               boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)'
             }}>
               <button
                 type="button"
                 onClick={() => setPopupTab('heroes')}
                 style={{
                   padding: '5px 16px',
                   borderRadius: '20px',
                   fontSize: '0.78rem',
                   fontWeight: 'bold',
                   border: 'none',
                   cursor: 'pointer',
                   background: popupTab === 'heroes' ? 'linear-gradient(135deg, #d4a843 0%, #b45309 100%)' : 'transparent',
                   color: popupTab === 'heroes' ? '#0f172a' : '#cbd5e1',
                   boxShadow: popupTab === 'heroes' ? '0 2px 8px rgba(212, 168, 67, 0.5)' : 'none',
                   transition: 'all 0.15s ease'
                 }}
               >
                 🎴 Võ Tướng ({targetPlayer.heroes?.length || 2})
               </button>
               <button
                 type="button"
                 onClick={() => setPopupTab('equipment')}
                 style={{
                   padding: '5px 16px',
                   borderRadius: '20px',
                   fontSize: '0.78rem',
                   fontWeight: 'bold',
                   border: 'none',
                   cursor: 'pointer',
                   background: popupTab === 'equipment' ? 'linear-gradient(135deg, #d4a843 0%, #b45309 100%)' : 'transparent',
                   color: popupTab === 'equipment' ? '#0f172a' : '#cbd5e1',
                   boxShadow: popupTab === 'equipment' ? '0 2px 8px rgba(212, 168, 67, 0.5)' : 'none',
                   transition: 'all 0.15s ease',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '5px'
                 }}
               >
                 <span>⚔️ Trang Bị & Phán Xét</span>
                 <span style={{
                   background: popupTab === 'equipment' ? '#0f172a' : 'rgba(212, 168, 67, 0.25)',
                   color: popupTab === 'equipment' ? '#fef08a' : 'var(--color-gold)',
                   borderRadius: '10px',
                   padding: '1px 6px',
                   fontSize: '0.68rem',
                   fontWeight: 'bold'
                 }}>
                   {totalTargetEquipCount + targetJudgements.length}
                 </span>
               </button>
             </div>

             {/* TAB 1: VÕ TƯỚNG */}
             {popupTab === 'heroes' && (
               <div 
                 style={{ 
                   display: 'flex', 
                   gap: '12px', 
                   maxWidth: '100%', 
                   maxHeight: isLandscapeMobile ? '68vh' : '75vh', 
                   overflowY: 'auto', 
                   overflowX: 'auto', 
                   padding: '4px', 
                   alignItems: 'stretch', 
                   justifyContent: 'center', 
                   flexWrap: 'nowrap' 
                 }}
               >
                 {(targetPlayer.heroes || []).map((hero, idx) => {
                 const isSelf = heroPopup.id === mainPlayerId;
                 const isRevealed = Boolean(heroPopup.revealedHeroes?.[idx] ?? hero?.isRevealed);
                 const isGameOver = Boolean(gameState?.gameOver);
                 const isVisible = isSelf || isRevealed || isGameOver;
                 const roleLabel = idx === 0 ? 'Chính Tướng' : 'Phó Tướng';

                 if (!isVisible) {
                   return (
                     <div 
                       key={idx} 
                       style={{ 
                         background: 'linear-gradient(180deg, #161e2e 0%, #0d121d 100%)', 
                         borderRadius: '12px', 
                         border: '2px dashed #4b5563', 
                         width: isLandscapeMobile ? '210px' : '230px',
                         height: isLandscapeMobile ? 'clamp(170px, 58vh, 220px)' : 'clamp(210px, 65vh, 280px)', 
                         boxShadow: '0 8px 24px rgba(0,0,0,0.85)',
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         justifyContent: 'center',
                         padding: '16px',
                         boxSizing: 'border-box'
                       }} 
                       onClick={e => e.stopPropagation()}
                     >
                       <div style={{ fontSize: '40px' }}>🕵️</div>
                       <div style={{ color: '#9ca3af', fontWeight: 'bold', fontSize: '0.88rem', marginTop: '6px' }}>TƯỚNG ẨN</div>
                       <div style={{ color: '#f59e0b', fontSize: '0.72rem', marginTop: '2px', fontWeight: 'bold' }}>{roleLabel}</div>
                       <div style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: '4px' }}>Chưa lộ diện</div>
                     </div>
                   );
                 }

                 const isDaTam = Boolean(heroPopup.isDaTam || targetPlayer.isDaTam);
                 const rawHeroFaction = hero?.faction || heroPopup.rawFaction || heroPopup.canonicalFaction || heroPopup.faction || 'none';
                 const heroFaction = getFactionLabel(rawHeroFaction);
                 const factionColor = isDaTam ? '#9ca3af' : getFactionColor(heroFaction, false);

                 return (
                   <div 
                     key={idx} 
                     style={{ 
                       background: 'linear-gradient(180deg, #161e2e 0%, #0d121d 100%)', 
                       borderRadius: '12px', 
                       border: `2px solid ${factionColor}`, 
                       width: isLandscapeMobile ? '260px' : '280px',
                       maxWidth: '46vw',
                       height: isLandscapeMobile ? 'clamp(170px, 58vh, 220px)' : 'clamp(210px, 65vh, 280px)', 
                       boxShadow: `0 8px 24px rgba(0,0,0,0.85), 0 0 10px ${factionColor}30`, 
                       display: 'flex', 
                       flexDirection: 'column', 
                       overflow: 'hidden', 
                       position: 'relative',
                       padding: '8px 10px',
                       boxSizing: 'border-box'
                     }} 
                     onClick={e => e.stopPropagation()}
                   >
                     {/* Header Card: Avatar + Tên + Badge Phe/Vai Trò */}
                     <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '6px', marginBottom: '6px', flexShrink: 0 }}>
                       {hero?.image ? (
                         <img 
                           src={`/images/heroes/${hero.image}`} 
                           alt={hero.name} 
                           style={{ 
                             width: '42px', 
                             height: '56px', 
                             objectFit: 'cover', 
                             objectPosition: 'top',
                             borderRadius: '5px',
                             border: `1.5px solid ${factionColor}`,
                             flexShrink: 0,
                             display: 'block' 
                           }} 
                         />
                       ) : (
                         <div style={{ width: '42px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', border: `1.5px solid ${factionColor}`, flexShrink: 0 }}>
                           {hero?.emoji || '🎴'}
                         </div>
                       )}
                       <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                         <h3 style={{ color: 'var(--color-gold)', margin: 0, fontSize: '0.88rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                           {hero?.name || 'Võ Tướng'}
                         </h3>
                         <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                           <span style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: factionColor, color: 'white', fontWeight: 'bold' }}>
                             {isDaTam ? 'DÃ TÂM' : heroFaction}
                           </span>
                           <span style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', fontWeight: 'bold' }}>
                             {roleLabel}
                           </span>
                           <span style={{ fontSize: '0.58rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontWeight: 'bold' }}>
                             ❤️ {hero?.hp || hero?.maxHp || 3}
                           </span>
                         </div>
                       </div>
                     </div>

                     {/* Body Card: Chi tiết các Kỹ Năng (Skill List) */}
                     <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '2px' }}>
                       {hero?.skills && hero.skills.length > 0 ? (
                         hero.skills.filter((s, idx, arr) => arr.findIndex(o => (o.id && o.id === s.id) || (o.name && o.name === s.name)) === idx).map((skill, sIdx) => {
                           const normType = normalizeSkillType(skill.type);
                           return (
                             <div key={sIdx} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '5px', padding: '4px 6px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
                                 <span style={{ color: '#fef08a', fontWeight: 'bold', fontSize: '0.74rem' }}>
                                   ⚡ {skill.name}
                                 </span>
                                 {skill.type && (
                                   <span style={{ fontSize: '0.52rem', padding: '1px 4px', borderRadius: '3px', background: normType.badgeColor, color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                     {normType.label}
                                   </span>
                                 )}
                               </div>
                               <div style={{ fontSize: '0.68rem', color: '#cbd5e1', lineHeight: '1.35', textAlign: 'left' }}>
                                 {skill.desc || '(Chưa có mô tả)'}
                               </div>
                             </div>
                           );
                         })
                       ) : (
                         <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>
                           Không có kỹ năng đặc biệt
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
             )}

             {/* TAB 2: TRANG BỊ & PHÁN XÉT */}
             {popupTab === 'equipment' && (
               <div 
                 style={{ 
                   display: 'flex', 
                   flexDirection: 'column',
                   gap: '8px', 
                   width: '100%', 
                   maxWidth: isLandscapeMobile ? '580px' : '92vw',
                   maxHeight: isLandscapeMobile ? '68vh' : '75vh', 
                   overflowY: 'auto', 
                   padding: '4px',
                   boxSizing: 'border-box'
                 }}
               >
                 {/* 4 Ô Trang Bị dạng Grid */}
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: isLandscapeMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(260px, 1fr))',
                   gap: '8px',
                   width: '100%'
                 }}>
                   {targetEquipSlots.map(slot => {
                     const { card } = slot;
                     const bgImage = card ? getCardBg(card.name) : null;
                     return (
                       <div
                         key={slot.key}
                         style={{
                           display: 'flex',
                           gap: '8px',
                           alignItems: 'center',
                           background: card ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)' : 'rgba(15, 23, 42, 0.5)',
                           border: card ? '1.5px solid rgba(212, 168, 67, 0.75)' : '1px dashed rgba(255, 255, 255, 0.15)',
                           borderRadius: '10px',
                           padding: '6px 8px',
                           boxShadow: card ? '0 4px 12px rgba(0,0,0,0.6), inset 0 0 10px rgba(212, 168, 67, 0.15)' : 'none',
                           cursor: card ? 'pointer' : 'default',
                           transition: 'all 0.15s ease'
                         }}
                         onClick={() => {
                           if (card && setCardPopup) {
                             setCardPopup(card);
                           }
                         }}
                         title={card ? `${card.name} - Nhấn để xem phóng to` : `${slot.label} (Trống)`}
                       >
                         {/* Slot Card Thumbnail / Empty Slot */}
                         {card ? (
                           <div style={{
                             width: '42px',
                             height: '56px',
                             borderRadius: '6px',
                             border: '1px solid var(--color-gold)',
                             backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                             backgroundSize: 'cover',
                             backgroundPosition: 'center',
                             backgroundColor: 'rgba(212, 168, 67, 0.2)',
                             display: 'flex',
                             flexDirection: 'column',
                             justifyContent: 'space-between',
                             padding: '2px 3px',
                             flexShrink: 0,
                             position: 'relative',
                             boxShadow: '0 2px 6px rgba(0,0,0,0.8)'
                           }}>
                             <span style={{
                               fontSize: '0.62rem',
                               fontWeight: 'bold',
                               color: card.color === 'red' ? '#ef4444' : '#ffffff',
                               textShadow: '0 0 3px black, 0 1px 2px black',
                               lineHeight: 1
                             }}>
                               {getSuitEmoji(card.suit)}{card.rank}
                             </span>
                             <span style={{ 
                               alignSelf: 'center', 
                               display: 'flex', 
                               alignItems: 'center', 
                               justifyContent: 'center', 
                               color: 'var(--color-gold)', 
                               filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.95))',
                               opacity: 0.95 
                             }}>
                               {slot.icon}
                             </span>
                             <span style={{
                               fontSize: '0.45rem',
                               background: 'rgba(0,0,0,0.75)',
                               color: '#fef08a',
                               borderRadius: '2px',
                               padding: '1px 2px',
                               textAlign: 'center',
                               fontWeight: 'bold',
                               whiteSpace: 'nowrap',
                               overflow: 'hidden'
                             }}>
                               {card.name}
                             </span>
                           </div>
                         ) : (
                           <div style={{
                             width: '42px',
                             height: '56px',
                             borderRadius: '6px',
                             border: '1px dashed rgba(255, 255, 255, 0.2)',
                             backgroundColor: 'rgba(0, 0, 0, 0.3)',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             flexShrink: 0,
                             opacity: 0.4
                           }}>
                             {slot.icon}
                           </div>
                         )}

                         {/* Slot Details */}
                         <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
                             <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                               {slot.icon} {slot.label}
                             </span>
                             {card && slot.key === 'weapon' && (
                               <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                                 🎯 Tầm: {card.attackRange || 1}
                               </span>
                             )}
                             {card && (
                               <span style={{ fontSize: '0.6rem', color: '#93c5fd', fontStyle: 'italic' }}>
                                 🔍 Phóng to
                               </span>
                             )}
                           </div>

                           {card ? (
                             <>
                               <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: card.color === 'red' ? '#f87171' : '#f8fafc', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                 {card.name} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({getSuitEmoji(card.suit)}{card.rank})</span>
                               </div>
                               <div style={{ fontSize: '0.68rem', color: '#cbd5e1', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                 {card.desc || slot.defaultDesc}
                               </div>
                             </>
                           ) : (
                             <div style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic', lineHeight: '1.35' }}>
                               (Chưa trang bị) — {slot.defaultDesc}
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                 </div>

                 {/* Judgement Area Section */}
                 <div style={{
                   marginTop: '4px',
                   background: targetJudgements.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                   border: targetJudgements.length > 0 ? '1px solid rgba(239, 68, 68, 0.45)' : '1px dashed rgba(255, 255, 255, 0.1)',
                   borderRadius: '10px',
                   padding: '8px 12px',
                   width: '100%',
                   boxSizing: 'border-box'
                 }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: targetJudgements.length > 0 ? '6px' : 0 }}>
                     <div style={{ fontSize: '0.76rem', fontWeight: 'bold', color: targetJudgements.length > 0 ? '#fca5a5' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                       <span>⚖️</span>
                       <span>Khu Vực Phán Xét:</span>
                       <span style={{ fontSize: '0.7rem', color: targetJudgements.length > 0 ? '#ef4444' : '#64748b', fontWeight: 'normal' }}>
                         {targetJudgements.length > 0 ? `(${targetJudgements.length} lá bài hiệu ứng đang chờ phán xét)` : '(Trống - Không có hiệu ứng bất lợi)'}
                       </span>
                     </div>
                   </div>

                   {targetJudgements.length > 0 && (
                     <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                       {targetJudgements.map((jCard, jIdx) => {
                         const jBg = getCardBg(jCard.name);
                         return (
                           <div 
                             key={jIdx}
                             style={{
                               display: 'flex',
                               alignItems: 'center',
                               gap: '8px',
                               background: 'rgba(30, 41, 59, 0.85)',
                               border: '1px solid rgba(239, 68, 68, 0.6)',
                               borderRadius: '6px',
                               padding: '4px 8px',
                               cursor: 'pointer'
                             }}
                             onClick={() => setCardPopup && setCardPopup(jCard)}
                             title="Nhấn để xem phóng to"
                           >
                             {jBg ? (
                               <div style={{ width: '28px', height: '38px', backgroundImage: `url(${jBg})`, backgroundSize: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }} />
                             ) : (
                               <span style={{ fontSize: '1.1rem' }}>📜</span>
                             )}
                             <div style={{ textAlign: 'left' }}>
                               <div style={{ fontWeight: 'bold', fontSize: '0.74rem', color: '#fca5a5' }}>
                                 {jCard.name} <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>({getSuitEmoji(jCard.suit)}{jCard.rank})</span>
                               </div>
                               <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                 {jCard.desc}
                               </div>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* Nút đóng chân dialog cố định kích thước gọn gàng, không bị dãn phình to */}
             <button 
               onClick={() => setHeroPopup(null)} 
               style={{ 
                 flex: 'none',
                 height: '32px', 
                 minHeight: '32px', 
                 marginTop: '10px', 
                 padding: '0 28px', 
                 borderRadius: '20px', 
                 fontSize: '0.82rem', 
                 fontWeight: 'bold', 
                 cursor: 'pointer',
                 background: 'rgba(30, 41, 59, 0.95)',
                 border: '1px solid rgba(212, 168, 67, 0.6)',
                 color: 'var(--color-gold)',
                 boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                 transition: 'all 0.2s ease'
               }}
             >
               ✕ Đóng
             </button>
           </div>
         </div>
      )}

      {/* CARD DETAIL POPUP */}
      {cardPopup && (
         <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.88)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '16px', boxSizing: 'border-box' }} onClick={() => setCardPopup(null)}>
            <div style={{ background: '#111827', borderRadius: '16px', padding: '20px 24px', border: '2px solid var(--color-gold)', maxWidth: '380px', width: '90%', maxHeight: '88vh', overflowY: 'auto', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
               <button onClick={() => setCardPopup(null)} style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
               {getCardBg(cardPopup.name) ? (
                  <div style={{ width: '110px', height: '150px', margin: '0 auto 10px auto', backgroundImage: `url(${getCardBg(cardPopup.name)})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
               ) : (
                  <div style={{ fontSize: '3.5rem', marginBottom: '6px' }}>{cardPopup.emoji}</div>
               )}
               <h2 style={{ color: cardPopup.color === 'red' ? '#ef4444' : 'var(--color-gold)', margin: '0 0 4px 0', fontSize: '1.2rem' }}>{cardPopup.name}</h2>
               <div style={{ fontSize: '0.95rem', marginBottom: '10px', fontWeight: 'bold', color: cardPopup.color === 'red' ? '#ef4444' : '#f8fafc' }}>{getSuitEmoji(cardPopup.suit)} {cardPopup.rank}</div>
               <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: '1.45', background: 'rgba(255,255,255,0.05)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>{cardPopup.desc}</div>
               <button className="btn-action primary" style={{ marginTop: '14px', padding: '6px 24px', fontSize: '0.88rem' }} onClick={() => setCardPopup(null)}>Đóng</button>
            </div>
         </div>
      )}

      {/* IN-GAME MENU MODAL (Tùy Chọn & Thoát Về Sảnh) */}
      {showGameMenu && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            background: 'rgba(0,0,0,0.85)', 
            zIndex: 1500, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backdropFilter: 'blur(12px)',
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={() => setShowGameMenu(false)}
        >
          <div 
            style={{ 
              background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', 
              border: '2px solid var(--color-gold)', 
              borderRadius: '16px', 
              padding: '20px 24px', 
              maxWidth: '360px', 
              width: '90%', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.9)',
              textAlign: 'center',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowGameMenu(false)}
              style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕
            </button>

            <h3 style={{ margin: '0 0 4px 0', color: 'var(--color-gold)', fontSize: '1.25rem', fontWeight: 'bold' }}>
              ⚙️ TÙY CHỌN TRẬN ĐẤU
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              Quốc Chiến • Lượt {gameState.turnCount || 1} • {getPhaseLabel(gameState.phase)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => setShowGameMenu(false)}
                style={{ 
                  background: 'linear-gradient(to right, #fbbf24, #d97706)', 
                  color: '#111827', 
                  fontWeight: 'bold', 
                  padding: '10px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                ▶️ Tiếp Tục Trận Đấu
              </button>

              {/* Tùy Chọn Nhịp Độ Trận Đấu (Bot Pace) */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px 12px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    ⏱️ NHỊP ĐỘ TRẬN ĐẤU (BOT SPEED)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {gamePace === 'slow' ? '1800ms' : gamePace === 'fast' ? '700ms' : '1300ms'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {[
                    { id: 'slow', label: '🐢 Chậm', desc: '1.8s' },
                    { id: 'normal', label: '⚖️ Chuẩn', desc: '1.3s' },
                    { id: 'fast', label: '⚡ Nhanh', desc: '0.7s' }
                  ].map(item => {
                    const isActive = gamePace === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handlePaceChange(item.id)}
                        style={{
                          background: isActive 
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                            : 'rgba(255,255,255,0.06)',
                          border: isActive ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                          padding: '7px 4px',
                          color: isActive ? '#0f172a' : '#cbd5e1',
                          fontWeight: isActive ? '800' : '600',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{item.label}</span>
                        <span style={{ fontSize: '0.66rem', opacity: isActive ? 0.9 : 0.6 }}>{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center' }}>
                  Điều chỉnh thời gian chờ suy nghĩ và phản hồi của Bot
                </p>
              </div>

              <button 
                onClick={sfx.toggleMute}
                style={{ 
                  background: 'rgba(255,255,255,0.08)', 
                  color: '#f8fafc', 
                  fontWeight: 'bold', 
                  padding: '9px', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {sfx.isMuted ? '🔇 Âm Thanh: Đang Tắt' : '🔊 Âm Thanh: Đang Bật'}
              </button>

              <button 
                onClick={() => {
                  if (window.confirm("Bạn có chắc chắn muốn khởi động lại ván đấu mới không?")) {
                    window.location.reload();
                  }
                }}
                style={{ 
                  background: 'rgba(59, 130, 246, 0.15)', 
                  color: '#60a5fa', 
                  fontWeight: 'bold', 
                  padding: '9px', 
                  borderRadius: '10px', 
                  border: '1px solid #3b82f6', 
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                🔄 Khởi Động Lại Ván Đấu
              </button>

              <button 
                onClick={() => {
                  if (window.confirm("Bạn có chắc chắn muốn thoát ván đấu hiện tại về sảnh chính không?")) {
                    navigate('/');
                  }
                }}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#f87171', 
                  fontWeight: 'bold', 
                  padding: '9px', 
                  borderRadius: '10px', 
                  border: '1px solid #ef4444', 
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                🏠 Thoát Về Sảnh Chính
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState?.gameOver && !isGameOverModalDismissed && (
        <GameOverModal 
          gameState={gameState} 
          mainPlayerId={mainPlayerId} 
          onClose={() => setIsGameOverModalDismissed(true)} 
          onRestart={() => window.location.reload()} 
          onHome={() => navigate('/')} 
        />
      )}

      {/* Floating Toolbar khi tạm ẩn GameOverModal để xem lại bàn đấu */}
      {gameState?.gameOver && isGameOverModalDismissed && (
        <div 
          style={{
            position: 'fixed',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1.5px solid var(--color-gold)',
            borderRadius: '24px',
            padding: '5px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.85), 0 0 16px rgba(245, 158, 11, 0.4)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <button
            type="button"
            onClick={() => setIsGameOverModalDismissed(false)}
            style={{
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              border: '1px solid #fef08a',
              borderRadius: '16px',
              padding: '5px 14px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🏆 Mở Bảng Kết Quả
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '5px 14px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔄 Chơi Lại Ván Mới
          </button>
        </div>
      )}

      <ChatWidget style={{ position: 'absolute', top: '100px', left: '20px', zIndex: 90, height: '300px', width: '280px' }} />
    </div>
  );
}
