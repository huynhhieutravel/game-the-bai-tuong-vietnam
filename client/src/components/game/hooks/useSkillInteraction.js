import { useCallback } from 'react';
import { canUseSkill } from '../../../engine/rules/SkillRules';
import { PHASES } from "../../../data/gameData";

export function useSkillInteraction({
    gameState,
    gameAPI,
    activeSkill,
    setActiveSkill,
    cancelTargeting,
    setTargetSession,
    isActionPending,
    mainPlayerId = 0
}) {

    const handleExecuteSkill = useCallback((skillId) => {
        if (!gameState || gameState.phase !== PHASES.ACTION || !gameAPI) return;
        if (gameState.currentPlayerIndex !== mainPlayerId) return;
    
        if (isActionPending.current) return;
    
        const skillIdMap = {
            'Thủy Tổ': 'thuy-to',
            'Tự Chủ': 'tu-chu',
            'Tiên Phong': 'tien-phong',
            'Diệu Dược': 'dieu-duoc',
            'Hòa Thân': 'hoa-than',
            'Bình Loạn': 'binh-loan',
            'Trung Dũng': 'trung-dung',
            'Bạch Đằng': 'bach-dang',
            'Lặn Sâu': 'lan-sau',
            'Tâm Công': 'tam-cong',
            'Vân Đồn': 'van-don',
            'Đoạt Sao': 'doat-sao',
            'Duyên Thơ': 'duyen-tho'
        };
    
        if (skillId === 'Bọc Trăm Trứng' || skillId === 'Bọc Trăm Trứng (Chủ Công Kỹ)') {
           if (activeSkill === skillId) {
              cancelTargeting();
           } else {
              setActiveSkill(skillId);
              setTargetSession({
                 card: null,
                 virtualCardName: null,
                 targetingDef: { type: 'single', filter: (state, player) => state.players.filter(p => p.id !== player.id && p.isAlive && p.distanceFromMe <= player.attackRange) },
                 step: 0,
                 selectedTargets: [],
                 validTargets: gameState.players.filter(p => p.id !== mainPlayerId && p.isAlive && p.distanceFromMe <= (gameState.players.find(x => x.id === mainPlayerId)?.attackRange || 1)).map(p => p.id),
                 message: '🎯 Đã kích hoạt Bọc Trăm Trứng! Hãy nhấp chọn 1 KẺ ĐỊCH để đồng minh Lạc chém giúp bạn!'
              });
           }
           return;
        }
    
        if (skillId === 'Tiên Duyên') {
           if (activeSkill === skillId) {
               cancelTargeting();
           } else {
               setActiveSkill(skillId);
               setTargetSession({
                   card: null,
                   virtualCardName: null,
                   targetingDef: { type: 'single', filter: (state, player) => [], optional: true },
                   step: 0,
                   selectedTargets: [],
                   validTargets: [],
                   message: '✨ Hãy nhấp chọn 1 lá bài ♣ trên tay.'
               });
           }
           return;
        }
    
        if (skillId === 'Định Quốc') {
           if (activeSkill === skillId) {
               cancelTargeting();
           } else {
               setActiveSkill(skillId);
               setTargetSession({
                   card: null,
                   virtualCardName: null,
                   targetingDef: { type: 'single', filter: (state, player) => [], optional: true },
                   step: 0,
                   selectedTargets: [],
                   validTargets: [],
                   message: '🎯 Hãy nhấp chọn 1 lá bài trên tay để truyền cho tướng Định Quốc.'
               });
           }
           return;
        }
    
        const mappedId = skillIdMap[skillId];
        if (mappedId) {
           isActionPending.current = true;
           gameAPI.useSkill(mainPlayerId, mappedId);
           cancelTargeting();
        } else {
           // Toggle active skill selection
           setActiveSkill(prev => prev === skillId ? null : skillId);
           cancelTargeting();
        }
    }, [gameState, gameAPI, activeSkill, cancelTargeting, setActiveSkill, setTargetSession, isActionPending]);

    return {
        handleExecuteSkill
    };
}
