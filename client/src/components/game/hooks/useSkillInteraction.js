import { useCallback } from 'react';
import { canUseSkill, canAttack } from 'shared/engine_v4/rules/TargetResolverV4.js';
import { PHASES } from 'shared/data/gameData';
import { getPlayerGender, hasSkill } from 'shared/engine_v4/application/index.js';
import { normalizeSkillId, normalizeGender } from 'shared/utils/translationHelper';

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

        const normSkillId = normalizeSkillId(skillId);

        if (normSkillId === 'thuy_to') {
            const me = gameState.players.find(p => p.id === mainPlayerId);
            if (!me || !me.hand || me.hand.length === 0) {
                gameAPI.addLog('Bạn không có bài trên tay để dùng Thủy Tổ!', 'warning');
                return;
            }
        }

        if (normSkillId === 'hoa_than') {
            const me = gameState.players.find(p => p.id === mainPlayerId);
            const isAnTu = me && (hasSkill(me, 'hoa_than_an_tu') || hasSkill(me, 'hoa-than-an-tu'));
            if (isAnTu) {
                isActionPending.current = true;
                gameAPI.useSkill(mainPlayerId, 'hoa-than-an-tu');
                cancelTargeting();
                return;
            }
        }
    
        if (normSkillId === 'boc_tram_trung') {
           if (activeSkill === skillId || activeSkill === normSkillId) {
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
    
        if (normSkillId === 'tien_duyen') {
           if (activeSkill === skillId || activeSkill === normSkillId || normalizeSkillId(activeSkill) === 'tien_duyen') {
               cancelTargeting();
           } else {
               setActiveSkill('Tiên Duyên');
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
        
        if (normSkillId === 'pha_thanh') {
           if (activeSkill === skillId || activeSkill === normSkillId) {
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

        if (normSkillId === 'than_hoa') {
           if (activeSkill === skillId || activeSkill === normSkillId) {
               cancelTargeting();
           } else {
                setActiveSkill(skillId);
                setTargetSession({
                    card: null,
                    virtualCardName: null,
                    targetingDef: { type: 'single', filter: (state, player) => state.players.filter(p => p.isAlive && p.hand.length > 0) },
                    step: 0,
                    selectedTargets: [],
                    validTargets: [],
                    message: '🔥 Hãy nhấp chọn 1 lá bài ĐỎ trên tay để ném Hỏa Công.'
                });
           }
           return;
        }

        if (['tam_cong', 'van_don', 'duyen_tho', 'tien_phong'].includes(normSkillId)) {
           if (normSkillId === 'tam_cong') {
               const me = gameState.players.find(p => p.id === mainPlayerId);
               if (!me || !me.hand || me.hand.length === 0) {
                   gameAPI.addLog('Bạn không có bài trên tay để dùng Tâm Công!', 'warning');
                   return;
               }
               if (me.skillUsage?.tam_cong?.usedThisTurn) {
                   gameAPI.addLog('[Tâm Công] Mỗi lượt chỉ được sử dụng 1 lần!', 'warning');
                   return;
               }
           }
           if (activeSkill === skillId || activeSkill === normSkillId) {
               cancelTargeting();
           } else {
               setActiveSkill(skillId);
               setTargetSession({
                   card: null,
                   virtualCardName: null,
                   targetingDef: { type: 'single', filter: (state, player) => {
                       if (normSkillId === 'duyen_tho') {
                           return state.players.filter(p => {
                               if (p.id === player.id || !p.isAlive || p.hp >= p.maxHp) return false;
                               return normalizeGender(getPlayerGender(p)) === 'male';
                           });
                       }
                       if (normSkillId === 'van_don') {
                           return state.players.filter(p => p.id !== player.id && p.isAlive && p.hand?.length > 0);
                       }
                       return state.players.filter(p => p.id !== player.id && p.isAlive);
                   } },
                   step: 0,
                   selectedTargets: [],
                   validTargets: gameState.players.filter(p => {
                       if (p.id === mainPlayerId || !p.isAlive) return false;
                       if (normSkillId === 'duyen_tho') {
                           if (p.hp >= p.maxHp) return false;
                           return normalizeGender(getPlayerGender(p)) === 'male';
                       }
                       if (normSkillId === 'van_don') {
                           return p.hand && p.hand.length > 0;
                       }
                       return true;
                   }).map(p => p.id),
                   message: `🎯 Bạn đang dùng [${skillId}]. Hãy nhấp chọn 1 MỤC TIÊU.`
               });
           }
           return;
        }
    
        if (normSkillId === 'dinh_quoc') {
           if (activeSkill === skillId || activeSkill === normSkillId) {
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
    
        const directSkills = [
            'thuy_to', 'tu_chu', 'tien_phong', 'dieu_duoc', 'hoa_than', 
            'binh_loan', 'trung_dung', 'bach_dang', 'lan_sau', 'doat_sao', 'can_gian'
        ];
        if (directSkills.includes(normSkillId)) {
           isActionPending.current = true;
           const sendId = normSkillId.replace(/_/g, '-');
           gameAPI.useSkill(mainPlayerId, sendId);
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
