// @ts-check
import { useCallback, useState } from 'react';
import { CARD_TYPES, CARD_SUITS } from 'shared/constants/cardTypes';
import { getTargetingDefinition, getAvailableTargets, canPlayCard } from 'shared/engine_v4/rules/TargetResolverV4.js';
import { hasSkill, getEffectiveSuit, getEffectiveColor } from 'shared/engine_v4/application/index.js';
import { PHASES } from 'shared/data/gameData';

/**
 * @typedef {import('../../../engine/types/view/GameViewModel').GameViewModel} GameViewModel
 * 
 * @typedef {Object} UseCardInteractionProps
 * @property {GameViewModel} gameState
 * @property {any} gameAPI
 * @property {string} [activeSkill]
 * @property {Function} setTargetSession
 * @property {Function} cancelTargeting
 * @property {any} [targetSession]
 * 
 * @param {UseCardInteractionProps} props
 */
export function useCardInteraction(props) {
    const { gameState, gameAPI, activeSkill, targetSession, setTargetSession, cancelTargeting, mainPlayerId = 0 } = props;
    const [selectedDiscards, setSelectedDiscards] = useState([]);

    const handleCardClick = useCallback((cardIndex) => {
        if (!gameState || !gameAPI) return;
        if (gameState.waitingForResponse && gameState.waitingForResponse.type !== 'play_phase') return;
        const player = gameState.players.find(p => p.id === mainPlayerId);
        const card = player?.hand[cardIndex];
        if (!card) return;

        const NON_CONVERTING_TARGETED_SKILLS = ['Tâm Công', 'Vân Đồn', 'Duyên Thơ', 'Tiên Phong', 'Bọc Trăm Trứng', 'Bọc Trăm Trứng (Chủ Công Kỹ)'];
        if (activeSkill && NON_CONVERTING_TARGETED_SKILLS.includes(activeSkill)) {
            if (activeSkill === 'Tâm Công') {
                gameAPI.addLog('🔮 [Tâm Công] Đối thủ sẽ tự động rút ngẫu nhiên 1 lá bài từ tay bạn! Hãy nhấp chọn TƯỚNG MỤC TIÊU trên bàn cờ.', 'warning');
            } else {
                gameAPI.addLog(`🎯 Bạn đang dùng [${activeSkill}]. Hãy nhấp chọn TƯỚNG MỤC TIÊU trên bàn cờ!`, 'warning');
            }
            return;
        }
        
        // If an active skill is selected, handle card conversion
        let virtualName = null;
        if (activeSkill) {
          const effColor = getEffectiveColor(player, card);
          const effSuit = getEffectiveSuit(player, card);

          if (activeSkill === 'Tiên Duyên') {
              const isClub = effSuit === CARD_SUITS.CLUB || effSuit === 'club' || effSuit === '♣' || effSuit === 'clubs' || effSuit === 'chuồn';
              if (!isClub) {
                  gameAPI.addLog('Tiên Duyên chỉ dùng được với bài ♣ (Chuồn)!', 'danger');
                  return;
              }
              setTargetSession({
                  card: card,
                  cardIndex: cardIndex,
                  virtualCardName: 'Xiềng Xích',
                  targetingDef: { type: 'multiple', max: 2, filter: (state, player) => state.players.filter(p => p.isAlive), optional: true },
                  step: 0,
                  selectedTargets: [],
                  validTargets: gameState.players.filter(p => p.isAlive).map(p => p.id),
                  message: '✨ Chọn 0 mục tiêu để Rút 1 bài, hoặc 1-2 mục tiêu để gán Xiềng Xích.'
              });
              return;
          }
          if (activeSkill === 'Khai Thiên') {
              if (effColor !== 'red') {
                  gameAPI.addLog('Khai Thiên chỉ dùng được với bài màu Đỏ!', 'danger');
                  return;
              }
              virtualName = 'Chém';
          }
          if (activeSkill === 'Định Quốc') {
              if (card.name !== 'Né' && card.name !== 'Sấm Sét') {
                  gameAPI.addLog('Định Quốc chỉ được truyền lá [Né] hoặc [Sấm Sét]!', 'danger');
                  return;
              }
              setTargetSession({
                  card: card,
                  cardIndex: cardIndex,
                  virtualCardName: null,
                  targetingDef: { type: 'single', filter: (state, player) => state.players.filter(p => p.id !== player.id && p.isAlive && !p.isSkillsSuppressed && p.revealedHeroes.some(Boolean) && hasSkill(p, 'dinh-quoc')) },
                  step: 0,
                  selectedTargets: [],
                  validTargets: gameState.players.filter(p => p.id !== mainPlayerId && p.isAlive && !p.isSkillsSuppressed && p.revealedHeroes.some(Boolean) && hasSkill(p, 'dinh-quoc')).map(p => p.id),
                  message: '🎯 Hãy chọn 1 người có kỹ năng Định Quốc để truyền bài!'
              });
              return;
          }
          if (activeSkill === 'Thần Hỏa') {
              if (effColor !== 'red') {
                  gameAPI.addLog('Thần Hỏa chỉ dùng được với bài ĐỎ!', 'danger');
                  return;
              }
              virtualName = 'Hỏa Công';
              // Không return, để logic bên dưới (dòng 93) tự set targetingDef dựa trên 'Hỏa Công'
          }
    
          if (activeSkill === 'Kỳ Tập') {
            if (effColor !== 'black') {
              gameAPI.addLog('Kỳ Tập chỉ dùng được với bài màu ĐEN!', 'danger');
              return;
            }
            virtualName = 'Tước Bài';
          }
          if (activeSkill === 'Dời Núi') {
            if (card.name === 'Né') virtualName = 'Chém';
            else if (card.name === 'Chém') virtualName = 'Né';
            else {
              gameAPI.addLog('Dời Núi chỉ áp dụng chuyển đổi cho lá [Chém] hoặc [Né]!', 'danger');
              return;
            }
          }
          if (activeSkill === 'Phá Thành') {
            const p = gameState.players.find(p => p.id === mainPlayerId);
            if (!p || !p.phaThanhColor || effColor === p.phaThanhColor) {
              gameAPI.addLog('Phá Thành chỉ dùng được với bài KHÁC MÀU lá phán xét!', 'danger');
              return;
            }
            virtualName = 'Quyết Đấu';
          }
          if ((activeSkill === 'Hòa Thân' || activeSkill === 'hoa_than_an_tu') && player && hasSkill(player, 'hoa_than_an_tu')) {
            const isDiamond = effSuit === 'diamond' || effSuit === 'diamonds' || effSuit === '♦' || effSuit === 'rô';
            if (!isDiamond) {
              gameAPI.addLog('Hòa Thân (An Tư) chỉ dùng được với bài chất Rô ♦!', 'danger');
              return;
            }
            virtualName = 'Hỗn Loạn';
          }
        }
    
        const targetingDef = getTargetingDefinition(gameState, mainPlayerId, virtualName || card.name, card);
        
        // If clicking the same card again, cancel targeting
        if (targetSession && targetSession.cardIndex === cardIndex && targetSession.virtualCardName === virtualName) {
            cancelTargeting();
            return;
        }

        // Lá Hóa Giải và Né chỉ dùng để phản ứng, không thể mở session tự dùng trong lượt
        const isReactionOnlyCard = (card.name === 'Hóa Giải' || card.idKey === 'hoa_giai' || (!virtualName && (card.name === 'Né' || card.idKey === 'ne')));
        if (isReactionOnlyCard && !activeSkill) {
            gameAPI.addLog(`🛡️ Lá [${card.name}] chỉ có thể sử dụng khi phản ứng yêu cầu, không thể chủ động đánh ra trong lượt!`, 'warning');
            return;
        }

        // Play directly if Auto-cast (no target required by user)
        if (targetingDef.type === 'none' || targetingDef.type === 'aoe' || targetingDef.type === 'self') {
           setTargetSession({
               cardIndex,
               card,
               virtualCardName: virtualName,
               targetingDef,
               step: 0,
               selectedTargets: [],
               validTargets: [],
               message: `Bạn muốn sử dụng [${virtualName || card.name}]?`
           });
        } else {
           // Needs target selection
           let defaultMsg = '🎯 HÃY CHỌN 1 MỤC TIÊU! 🎯';
           if (targetingDef.type === 'multiple') {
               const isXiengXich = virtualName === 'Xiềng Xích' || card.name === 'Xiềng Xích' || activeSkill === 'Tiên Duyên';
               defaultMsg = isXiengXich
                   ? `Đã chọn 0/${targetingDef.max || 2} mục tiêu (Bấm "Rèn Lại" nếu không khóa ai)`
                   : `Đã chọn 0/${targetingDef.max || 2} mục tiêu (Chọn từ ${targetingDef.min} - ${targetingDef.max})`;
           }
           setTargetSession({
               cardIndex,
               card,
               virtualCardName: virtualName,
               targetingDef,
               step: 0,
               selectedTargets: [],
               validTargets: getAvailableTargets(gameState, mainPlayerId, virtualName || card.name, card.id, []),
               message: `[${virtualName || card.name}]: ` + defaultMsg
           });
        }
    }, [gameState, gameAPI, activeSkill, cancelTargeting, setTargetSession, mainPlayerId]);

    const handleDiscardToggle = useCallback((cardIndex) => {
        setSelectedDiscards(prev => {
            if (prev.includes(cardIndex)) return prev.filter(i => i !== cardIndex);
            
            const player = gameState?.players?.find(p => p.id === mainPlayerId);
            if (!player) return prev;
            const discardCount = gameState?.waitingForResponse?.type === 'discard_phase' ? gameState.waitingForResponse.amount : 0;
            if (prev.length < discardCount) {
                return [...prev, cardIndex];
            }
            return prev;
        });
    }, [gameState, mainPlayerId]);

    const confirmDiscard = useCallback(() => {
        if (!gameState) return;
        const player = gameState.players.find(p => p.id === mainPlayerId);
        if (!player) return;
        const discardCount = gameState?.waitingForResponse?.type === 'discard_phase' ? gameState.waitingForResponse.amount : 0;
        if (selectedDiscards.length !== discardCount) return;
    
        const cardIds = selectedDiscards.map(idx => player.hand[idx]?.id).filter(Boolean);
        if (!gameAPI) return;
        gameAPI.discardCards(mainPlayerId, cardIds);
        
        setSelectedDiscards([]);
    }, [gameState, selectedDiscards, gameAPI, mainPlayerId]);
    const handleUnplayableClick = useCallback((cardIndex) => {
        const player = gameState?.players?.find(p => p.id === mainPlayerId);
        const card = player?.hand[cardIndex];
        if (card && card.unplayableReason) {
            gameAPI.addLog(card.unplayableReason, 'warning');
        }
    }, [gameState, gameAPI, mainPlayerId]);

    return {
        selectedDiscards,
        setSelectedDiscards,
        handleCardClick,
        handleDiscardToggle,
        confirmDiscard,
        handleUnplayableClick
    };
}
