import { useCallback } from 'react';
import { canUseSkill } from 'shared/engine/rules/SkillRules';
import { PHASES } from 'shared/data/gameData';
import { canAttack } from 'shared/engine/rangeSystem';
import { getPlayerGender } from 'shared/engine/gameState';

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
                 targetingDef: { type: 'single', filter: (state, player) => state.players.filter(p => p.id !== player.id && p.isAlive && canAttack(state, player.id, p.id, null)) },
                 step: 0,
                 selectedTargets: [],
                 validTargets: gameState.players.filter(p => p.id !== mainPlayerId && p.isAlive && canAttack(gameState, mainPlayerId, p.id, null)).map(p => p.id),
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
        
        if (skillId === 'Phá Thành') {
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
                   message: '💥 Hãy nhấp chọn 1 lá bài trên tay khác màu với lá phán xét để dùng như Quyết Đấu.'
               });
           }
           return;
        }

        if (skillId === 'Thần Hỏa') {
           if (activeSkill === skillId) {
               cancelTargeting();
           } else {
                setActiveSkill(skillId);
                setTargetSession({
                    card: null,
                    virtualCardName: null,
                    targetingDef: { type: 'single', filter: (state, player) => state.players.filter(p => p.isAlive && p.hand.length > 0) },
                    step: 0,
                    selectedTargets: [],
                    validTargets: gameState.players.filter(p => p.isAlive && p.hand.length > 0).map(p => p.id),
                    message: '🔥 Hãy nhấp chọn 1 lá bài ĐỎ trên tay để ném Hỏa Công.'
                });
           }
           return;
        }

        if (['Tâm Công', 'Vân Đồn', 'Duyên Thơ', 'Tiên Phong'].includes(skillId)) {
           if (activeSkill === skillId) {
               cancelTargeting();
           } else {
               setActiveSkill(skillId);
               setTargetSession({
                   card: null,
                   virtualCardName: null,
                   targetingDef: { type: 'single', filter: (state, player) => {
                       if (skillId === 'Duyên Thơ') {
                           return state.players.filter(p => p.id !== player.id && p.isAlive && p.hp < p.maxHp && (getPlayerGender(p) === 'Nam' || getPlayerGender(p) === 'Male'));
                       }
                       return state.players.filter(p => p.id !== player.id && p.isAlive);
                   } },
                   step: 0,
                   selectedTargets: [],
                   validTargets: gameState.players.filter(p => {
                       if (p.id === mainPlayerId || !p.isAlive) return false;
                       if (skillId === 'Duyên Thơ') {
                           return p.hp < p.maxHp && (getPlayerGender(p) === 'Nam' || getPlayerGender(p) === 'Male');
                       }
                       return true;
                   }).map(p => p.id),
                   message: `🎯 Bạn đang dùng [${skillId}]. Hãy nhấp chọn 1 MỤC TIÊU.`
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
           setTargetSession(null);
           if (isActionPending.current) isActionPending.current = false;
        }
    }, [gameState, gameAPI, activeSkill, cancelTargeting, setActiveSkill, setTargetSession, isActionPending, mainPlayerId]);

    return {
        handleExecuteSkill
    };
}
