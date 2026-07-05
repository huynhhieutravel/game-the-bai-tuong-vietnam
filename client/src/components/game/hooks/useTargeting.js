import { useCallback } from 'react';
import { getAvailableTargets } from '../../../engine/rules/TargetResolver';

export function useTargeting({ 
    gameState, 
    gameAPI, 
    targetSession, 
    setTargetSession, 
    activeSkill, 
    setActiveSkill, 
    isActionPending,
    mainPlayerId = 0
}) {

    const cancelTargeting = useCallback(() => {
        setTargetSession(null);
        setActiveSkill(null);
        if (isActionPending.current) isActionPending.current = false;
    }, [setTargetSession, setActiveSkill, isActionPending]);

    const handleTargetClick = useCallback((targetId) => {
        if (!gameAPI || !gameState || !targetSession) return;
        
        // Check if targetId is valid
        if (!targetSession.validTargets.includes(targetId)) return;
    
        if (isActionPending.current) return;
    
        const { card, virtualCardName, targetingDef, step, selectedTargets } = targetSession;
        
        if (targetingDef.type === 'multiple') {
           // Toggle selection (like Xiềng Xích)
           let newSelected = [...selectedTargets];
           if (newSelected.includes(targetId)) {
               newSelected = newSelected.filter(id => id !== targetId);
           } else {
               if (newSelected.length < targetingDef.max) {
                   newSelected.push(targetId);
               }
           }
           setTargetSession(prev => ({
               ...prev,
               selectedTargets: newSelected
           }));
           return;
        }
    
        const newSelectedTargets = [...selectedTargets, targetId];
    
        if (targetingDef.type === 'single') {
           isActionPending.current = true;
           if (activeSkill === 'Định Quốc') {
               gameAPI.dispatcher.dispatchAction({
                   type: 'ACTION_USE_SKILL',
                   payload: { playerId: mainPlayerId, skillId: 'dinh-quoc', targets: newSelectedTargets, options: { cardIdx: targetSession.cardIndex } }
               });
           } else if (card) {
               gameAPI.playCard(mainPlayerId, card.id, newSelectedTargets, virtualCardName ? { virtualCardName } : {});
           } else if (activeSkill === 'Bọc Trăm Trứng' || activeSkill === 'Bọc Trăm Trứng (Chủ Công Kỹ)') {
               gameAPI.dispatcher.dispatchAction({
                   type: 'ACTION_USE_SKILL',
                   payload: { playerId: mainPlayerId, skillId: 'boc-tram-trung', targets: newSelectedTargets }
               });
           }
           cancelTargeting();
        }  
        else if (targetingDef.type === 'sequence') {
           if (step + 1 >= targetingDef.steps.length) {
               isActionPending.current = true;
               gameAPI.playCard(mainPlayerId, card.id, newSelectedTargets, virtualCardName ? { virtualCardName } : {});
               cancelTargeting();
           } else {
               // Move to next step
               setTargetSession(prev => ({
                   ...prev,
                   step: step + 1,
                   selectedTargets: newSelectedTargets,
                   validTargets: getAvailableTargets(gameState, mainPlayerId, virtualCardName || card.name, card.id, newSelectedTargets)
               }));
           }
        }
    }, [gameAPI, gameState, targetSession, cancelTargeting, activeSkill, isActionPending, setTargetSession, mainPlayerId]);

    return {
        cancelTargeting,
        handleTargetClick
    };
}
