import { useCallback } from 'react';
import { getAvailableTargets } from 'shared/engine_v4/rules/TargetResolverV4.js';
import { normalizeSkillId } from 'shared/utils/translationHelper';

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
        if (typeof setActiveSkill === 'function') setActiveSkill(null);
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
           const cardName = virtualCardName || card?.name || activeSkill || '';
           const isXiengXich = cardName === 'Xiềng Xích' || card?.name === 'Xiềng Xích' || activeSkill === 'Tiên Duyên' || normalizeSkillId(activeSkill) === 'tien_duyen';
           const maxTargets = targetingDef.max || 2;
           let updatedMessage = '';
           if (newSelected.length === 0) {
               updatedMessage = isXiengXich
                   ? `[${cardName}]: Đã chọn 0/${maxTargets} mục tiêu (Bấm "Rèn Lại" nếu không khóa ai)`
                   : `[${cardName}]: Đã chọn 0/${maxTargets} mục tiêu`;
           } else {
               updatedMessage = `[${cardName}]: Đã chọn ${newSelected.length}/${maxTargets} mục tiêu${newSelected.length >= maxTargets ? ' (Đã đủ)' : ''}`;
           }

           setTargetSession(prev => ({
               ...prev,
               selectedTargets: newSelected,
               message: updatedMessage
           }));
           return;
        }
    
        const newSelectedTargets = [...selectedTargets, targetId];
    
        if (targetingDef.type === 'single') {
           isActionPending.current = true;
           const normSkill = normalizeSkillId(activeSkill);
           if (normSkill === 'dinh_quoc' || activeSkill === 'Định Quốc') {
               gameAPI.dispatcher.dispatchAction({
                   type: 'ACTION_USE_SKILL',
                   payload: { playerId: mainPlayerId, skillId: 'dinh-quoc', targets: newSelectedTargets, options: { cardIdx: targetSession.cardIndex } }
               });
           } else if (['Tâm Công', 'Vân Đồn', 'Duyên Thơ', 'Tiên Phong'].includes(activeSkill) || ['tam_cong', 'van_don', 'duyen_tho', 'tien_phong'].includes(normSkill)) {
               const skillMap = {
                   'Tâm Công': 'tam-cong',
                   'Vân Đồn': 'van-don',
                   'Duyên Thơ': 'duyen-tho',
                   'Tiên Phong': 'tien-phong',
                   'tam_cong': 'tam-cong',
                   'van_don': 'van-don',
                   'duyen_tho': 'duyen-tho',
                   'tien_phong': 'tien-phong'
               };
               const targetSkillId = skillMap[normSkill] || skillMap[activeSkill];
               gameAPI.dispatcher.dispatchAction({
                   type: 'ACTION_USE_SKILL',
                   payload: { playerId: mainPlayerId, skillId: targetSkillId, targets: newSelectedTargets }
               });
           } else if (normSkill === 'boc_tram_trung' || activeSkill === 'Bọc Trăm Trứng' || activeSkill === 'Bọc Trăm Trứng (Chủ Công Kỹ)' || activeSkill === 'boc_tram_trung' || activeSkill === 'boc-tram-trung') {
               gameAPI.dispatcher.dispatchAction({
                   type: 'ACTION_USE_SKILL',
                   payload: { playerId: mainPlayerId, skillId: 'boc_tram_trung', targets: newSelectedTargets }
               });
           } else if (card) {
               gameAPI.playCard(mainPlayerId, card.id, newSelectedTargets, virtualCardName ? { virtualCardName } : {});
           }
           cancelTargeting();
        }  
        else if (targetingDef.type === 'sequence') {
           if (step + 1 >= targetingDef.steps.length) {
               isActionPending.current = true;
               if (card) {
                   gameAPI.playCard(mainPlayerId, card.id, newSelectedTargets, virtualCardName ? { virtualCardName } : {});
               }
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
