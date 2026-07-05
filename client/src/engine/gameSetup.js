// @ts-check
/**
 * @typedef {import('./types/GameState').GameState} GameState
 * @typedef {import('./types/PlayerState').PlayerState} PlayerState
 * @typedef {import('./types/Hero').Hero} Hero
 */
import { Dispatcher } from './core/Dispatcher';
import { createInitialState } from './core/State';
import { HeroRegistry } from './registries/HeroRegistry';
import { SkillRegistry } from './registries/SkillRegistry';
import { PHASES } from '../data/gameData';
import { SkillDescriptions, SkillIdToName } from './registries/SkillDescriptions';

let draftSelections = {};

export function createGameState(safeCount) {
   draftSelections = {}; // Reset khi ván mới
   const allHeroes = Object.values(HeroRegistry);
   
   // Lấy ngẫu nhiên các tướng cho mỗi người chơi (5 tướng để chọn 2, đảm bảo Pigeonhole Principle cho bot)
   const players = Array.from({ length: safeCount }).map((_, i) => {
      const shuffled = [...allHeroes].sort(() => Math.random() - 0.5);
      return {
         id: i,
         name: i === 0 ? 'Bạn' : `Người chơi ${i + 1}`,
         isBot: i !== 0,
         isAlive: true,
         hasDrafted: false,
         draftHeroes: shuffled.slice(0, 5).map(h => {
            const resolvedSkills = (h.skillIds || []).map(skillId => {
               const skillDef = SkillRegistry[skillId];
               const realName = skillDef ? skillDef.name : (SkillIdToName[skillId] || skillId);
               const baseName = SkillIdToName[skillId] || realName;
               return {
                  id: skillId,
                  name: realName,
                  desc: (skillDef && skillDef.desc) ? skillDef.desc : (SkillDescriptions[realName] || SkillDescriptions[baseName] || '(Kỹ năng Engine mới chưa nạp mô tả)')
               };
            });
            return { ...h, skills: resolvedSkills };
         }),
         heroes: [{}, {}], // Điền 2 object rỗng để App.jsx không bị crash khi đọc heroes[1].name
         revealedHeroes: [false, false],
         
         // Fix lỗi sập màn hình vì thiếu thuộc tính
         hp: 4,
         maxHp: 4,
         hand: [],
         equipment: [],
         judgementArea: [],
         isFlipped: false,
         isChained: false,
         isVip: i === 0
      };
   });

   return {
      phase: PHASES.DRAFT,
      players,
      playedCards: [],
      logs: [],
      reactions: [],
      deck: [],
      discardPile: [],
      currentPlayerIndex: 0,
      turn: 1
   };
}

export function selectDraftHeroes(state, playerId, hero1Id, hero2Id) {
   let finalH1 = hero1Id;
   let finalH2 = hero2Id;

   const h1 = HeroRegistry[finalH1];
   const h2 = HeroRegistry[finalH2];

   if (!h1 || !h2 || h1.faction !== h2.faction) {
       const p = state.players.find(p => p.id === playerId);
       if (p && p.draftHeroes) {
           const factions = {};
           p.draftHeroes.forEach(h => {
             if (!factions[h.faction]) factions[h.faction] = [];
             factions[h.faction].push(h);
           });
           let selectedPair = null;
           for (const fac in factions) {
             if (factions[fac].length >= 2) {
               selectedPair = [factions[fac][0].id, factions[fac][1].id];
               break;
             }
           }
           if (selectedPair) {
               finalH1 = selectedPair[0];
               finalH2 = selectedPair[1];
           } else {
               finalH1 = p.draftHeroes[0]?.id;
               finalH2 = p.draftHeroes[1]?.id || finalH1;
           }
       }
   }

   draftSelections[playerId] = [finalH1, finalH2];

   const newState = { ...state };
   newState.players = newState.players.map(p => p.id === playerId ? { ...p, hasDrafted: true } : p);

   if (newState.players.every(p => p.hasDrafted)) {
      const playerConfigs = newState.players.map(p => {
         const selections = draftSelections[p.id] || ['lac-long-quan', 'lac-long-quan'];
         return {
            id: p.id,
            name: p.name,
            isBot: p.isBot,
            mainHeroId: selections[0],
            subHeroId: selections[1]
         };
      });
      const dispatcher = new Dispatcher(createInitialState(playerConfigs));
      // Bắt đầu lượt đầu tiên luôn
      dispatcher.state.reactionStack.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
      dispatcher.tick();
      return dispatcher.getState();
   }
   return newState;
}
