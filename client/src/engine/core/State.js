// ==========================================
// State - Định dạng dữ liệu và Khởi tạo State
// ==========================================
import { SeededRNG } from './SeededRNG';
import { HeroRegistry } from '../registries/HeroRegistry';
import { PHASES, CARDS } from '../../data/gameData'; // Giữ lại hằng số cũ tạm thời
import { shuffle } from '../gameState';

export function createInitialState(playerConfigs, seed = Date.now()) {
  const rng = new SeededRNG(seed);
  
  // Khởi tạo deck từ gameData và trộn lên
  const deck = shuffle([...CARDS]); 

  const state = {
    seed,
    turn: 1,
    currentPlayerIndex: 0,
    currentPhase: PHASES.BEGIN,
    
    deck,
    discardPile: [],
    
    players: playerConfigs.map((config, index) => {
      const mainHero = HeroRegistry[config.mainHeroId];
      const subHero = HeroRegistry[config.subHeroId];
      // Máu tối đa tính theo luật Quốc Chiến (Trung bình cộng 2 tướng, làm tròn xuống)
      const calculatedMaxHp = Math.floor((mainHero.maxHp + subHero.maxHp) / 2);
      return {
        id: config.id, // e.g. 0, 1, 2, 3
        name: config.name || mainHero.name || `Người chơi ${config.id + 1}`,
        isBot: config.isBot,
        mainHeroId: mainHero.id,
        subHeroId: subHero.id,
        isAlive: true,
        hp: calculatedMaxHp,
        maxHp: calculatedMaxHp,
        
        hand: [],
        equipment: [],
        judgement: [],
        
        // Trạng thái Tướng (lật/úp)
        isFlipped: false,
        isChained: false,
        isSilenced: false,
        isRevealed: false,
        revealedHeroes: [false, false],
        
        // Thống kê trong lượt (reset bởi turnResetFlags)
        attackCountThisTurn: 0,
        drankWineThisTurn: false,
        
        // ... Các flags của Kỹ năng sẽ được Dispatcher tự động thêm vào 
        // dựa trên turnResetFlags của SkillRegistry.
      };
    }),
    
    // Hệ thống Event (Phase 5)
    actionQueue: [],
    reactionStack: [],
    waitingForResponse: null,
    
    // Log
    history: []
  };

  // Chia 4 lá bài đầu game
  state.players.forEach(p => {
    for (let i = 0; i < 4; i++) {
      if (state.deck.length > 0) {
        p.hand.push(state.deck.pop());
      }
    }
  });

  return state;
}
