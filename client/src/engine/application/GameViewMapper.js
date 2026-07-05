// @ts-check
import { HeroRegistry } from '../registries/HeroRegistry';
import { SkillRegistry } from '../registries/SkillRegistry';
import { SkillDescriptions, SkillIdToName } from '../registries/SkillDescriptions';
import { getAttackRange, getDistance, getPlayerFaction, isPlayerRevealed } from '../index.js';
import { canPlayCard } from '../rules/CardRules.js';
import { canUseSkill } from '../rules/SkillRules.js';
import { getFullPlayerName } from '../../utils/playerHelpers.js';

/**
 * ACL (Anti-Corruption Layer) cho UI.
 * Chuyển đổi Raw State từ Engine thành ViewModel sạch cho React.
 * Không chứa Business Logic, không mutate raw state.
 * 
 * @param {import('../types/GameState').GameState} state
 * @param {number} mainPlayerId
 * @returns {import('../types/view/GameViewModel').GameViewModel}
 */
export function toViewModel(state, mainPlayerId = 0) {
    if (!state) return /** @type {any} */ (state);

    const vm = {
        phase: state.currentPhase || state.phase,
        playedCards: state.playedCards ? [...state.playedCards] : [],
        logs: state.history ? [...state.history] : [],
        reactions: state.reactions ? [...state.reactions] : [],
        gameOver: state.isGameOver || state.gameOver || false,
        winner: state.winner || null,
        waitingForResponse: null,
        players: [],
        deck: state.deck || [],
        discardPile: state.discardPile || [],
        currentPlayerIndex: state.currentPlayerIndex || 0,
        turn: state.turn || 1,
        chainedDamageQueue: state.chainedDamageQueue || [],
    };

    // Flatten response (giữ nguyên type/reason từ engine)
    if (state.waitingForResponse) {
        vm.waitingForResponse = { ...state.waitingForResponse };
        
        // Đảm bảo có responderId cho UI
        if (vm.waitingForResponse.askQueue && vm.waitingForResponse.askQueue.length > 0) {
            vm.waitingForResponse.responderId = vm.waitingForResponse.askQueue[0];
        } else if (vm.waitingForResponse.responderId === undefined) {
            vm.waitingForResponse.responderId = vm.waitingForResponse.targetId ?? vm.waitingForResponse.sourceId;
        }
    }

    // Hydrate Players
    vm.players = state.players.map(p => {
        /** @type {any} */
        const pVM = { ...p };
        
        // Resolve heroes
        const resolveHero = (heroId) => {
            if (!heroId) return null;
            const heroData = HeroRegistry[heroId];
            if (!heroData) return { name: heroId, skills: [] };

            const resolvedSkills = (heroData.skillIds || []).map(skillId => {
                const skillDef = SkillRegistry[skillId];
                const realName = skillDef ? skillDef.name : (SkillIdToName[skillId] || skillId);
                const baseName = SkillIdToName[skillId] || realName;
                
                const canUseObj = canUseSkill(state, p.id, skillId);
                return {
                    id: skillId,
                    name: realName,
                    desc: (skillDef && skillDef.desc) ? skillDef.desc : (SkillDescriptions[realName] || SkillDescriptions[baseName] || '(Chưa có mô tả)'),
                    type: skillDef ? skillDef.type : null,
                    isUsable: canUseObj.valid,
                    disableReason: canUseObj.reason
                };
            });
            return { ...heroData, gender: heroData.gender, skills: resolvedSkills };
        };

        const uiHero1 = resolveHero(p.mainHeroId);
        const uiHero2 = resolveHero(p.subHeroId);
        
        pVM.heroes = [uiHero1, uiHero2];
        pVM.revealedHeroes = p.revealedHeroes || [false, false];
        
        // Calculate distances to all other players
        pVM.distances = {};
        state.players.forEach(other => {
            if (other.id !== p.id) {
                pVM.distances[other.id] = getDistance(state, p.id, other.id);
            }
        });
        
        // Calculate display variables
        pVM.attackRange = getAttackRange(state, p.id);
        pVM.distanceFromMe = getDistance(state, mainPlayerId, p.id); // Dynamic from main player
        pVM.judgementArea = p.judgement || p.judgementArea || [];
        pVM.hand = (p.hand || []).map(card => ({
            ...card,
            isPlayable: canPlayCard(state, p.id, card.name, card.id).valid
        }));
        pVM.equipment = p.equipment || [];
        
        // Helper string for UI
        pVM.hpText = `${p.hp}/${p.maxHp}`;
        pVM.displayName = getFullPlayerName(p);
        pVM.isRevealed = isPlayerRevealed(p);
        pVM.faction = getPlayerFaction(p);

        return /** @type {import('../types/view/PlayerViewModel').PlayerViewModel} */ (pVM);
    });

    return vm;
}
