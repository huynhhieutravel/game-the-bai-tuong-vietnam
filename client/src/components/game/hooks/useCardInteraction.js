// @ts-check
import { useCallback, useState } from 'react';
import { getTargetingDefinition, getAvailableTargets } from '../../../engine/rules/TargetResolver';
import { canPlayCard } from '../../../engine/rules/CardRules';
import { PHASES } from '../../../data/gameData';

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
        
        // If an active skill is selected, handle card conversion
        let virtualName = null;
        if (activeSkill) {
          if (activeSkill === 'Tiên Duyên') {
              if (card.suit !== '♣') {
                  alert('Tiên Duyên chỉ dùng được với bài ♣!');
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
          if (activeSkill === 'Định Quốc') {
              setTargetSession({
                  card: card,
                  cardIndex: cardIndex,
                  virtualCardName: null,
                  targetingDef: { type: 'single', filter: (state, player) => state.players.filter(p => p.id !== player.id && p.isAlive && p.heroes?.some(h => h.skills?.some(s => s.id === 'dinh-quoc'))) },
                  step: 0,
                  selectedTargets: [],
                  validTargets: gameState.players.filter(p => p.id !== mainPlayerId && p.isAlive && p.heroes?.some(h => h.skills?.some(s => s.id === 'dinh-quoc'))).map(p => p.id),
                  message: '🎯 Hãy chọn 1 người có kỹ năng Định Quốc để truyền bài!'
              });
              return;
          }
    
          if (activeSkill === 'Kỳ Tập' && card.color === 'black') virtualName = 'Tước Bài';
          if (activeSkill === 'Khai Thiên' && card.color === 'red') virtualName = 'Chém';
          if (activeSkill === 'Dời Núi') {
            if (card.name === 'Né') virtualName = 'Chém';
            if (card.name === 'Chém') virtualName = 'Né';
          }
        }
    
        const targetingDef = getTargetingDefinition(virtualName || card.name, card);
        
        // If clicking the same card again, cancel targeting
        if (targetSession && targetSession.cardIndex === cardIndex && targetSession.virtualCardName === virtualName) {
            cancelTargeting();
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
               defaultMsg = `🎯 CHỌN ${targetingDef.min} - ${targetingDef.max} MỤC TIÊU! 🎯`;
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
            return [...prev, cardIndex];
        });
    }, []);

    const confirmDiscard = useCallback(() => {
        if (!gameState) return;
        const player = gameState.players.find(p => p.id === mainPlayerId);
        if (!player) return;
        const discardCount = player.hand.length - player.hp;
        if (selectedDiscards.length !== discardCount) return;
    
        const cardIds = selectedDiscards.map(idx => player.hand[idx].id);
        if (!gameAPI) return;
        gameAPI.discardCards(mainPlayerId, cardIds);
        
        setSelectedDiscards([]);
    }, [gameState, selectedDiscards, gameAPI, mainPlayerId]);

    return {
        selectedDiscards,
        setSelectedDiscards,
        handleCardClick,
        handleDiscardToggle,
        confirmDiscard
    };
}
