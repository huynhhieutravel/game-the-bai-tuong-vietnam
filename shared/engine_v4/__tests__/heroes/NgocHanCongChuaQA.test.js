import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Ngọc Hân Công Chúa (ngoc_han_cong_chua) — Hiền Hậu & Quốc Sắc', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Ngọc Hân Công Chúa',
          heroId: 'ngoc_han_cong_chua',
          faction: 'ha',
          gender: 'female',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: ['hien_hau', 'quoc_sac'],
          hand: [
            { id: 'heart_1', name: 'Đào Cơ', type: 'peach', suit: 'heart', color: 'red', rank: 3 },
            { id: 'spade_1', name: 'Chém Bích', type: 'slash', suit: 'spade', color: 'black', rank: 7 }
          ]
        },
        {
          id: 1,
          name: 'Mục Tiêu',
          gender: 'male',
          hp: 3,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: []
        },
        {
          id: 2,
          name: 'Kẻ Tấn Công',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: []
        }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Lá Deck 1', suit: 'heart', rank: 1 },
        { id: 'deck_2', name: 'Lá Deck 2', suit: 'diamond', rank: 2 },
        { id: 'deck_3', name: 'Lá Deck 3', suit: 'club', rank: 3 }
      ],
      discardPile: [],
      currentTurnPlayerId: 2,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  describe('1. Quốc Sắc (Spade tính như Heart)', () => {
    it('Chất và màu của lá bài Spade thuộc về Ngọc Hân tự động chuyển thành Heart và Red', () => {
      const { state } = setupGame();
      const ngocHan = state.getPlayer(0);
      const spadeCard = ngocHan.hand.find(c => c.suit === 'spade');

      const effSuit = globalHeroRegistry.getEffectiveSuit(ngocHan, spadeCard);
      const effColor = globalHeroRegistry.getEffectiveColor(ngocHan, spadeCard);

      expect(effSuit).toBe('heart');
      expect(effColor).toBe('red');
    });
  });

  describe('2. Hiền Hậu (Bỏ bài Cơ / Bích chặn sát thương và chọn hiệu ứng lên người khác)', () => {
    it('Lựa chọn 1: Ngăn chặn sát thương, chuyển 1 sát thương lên mục tiêu và mục tiêu rút bài theo máu đã mất', () => {
      const { state, dispatcher } = setupGame();
      const ngocHan = state.getPlayer(0);
      const target = state.getPlayer(1);

      // Kẻ tấn công 2 gây 1 sát thương lên Ngọc Hân
      CombatRules.applyDamage(state, 2, 0, 1, 'slash');

      // Frame ASK_HIEN_HAU xuất hiện
      expect(state.priorityStack.peek().type).toBe('ASK_HIEN_HAU');

      // Ngọc Hân chọn bỏ lá 'spade_1' (được tính như Heart do Quốc Sắc), chọn mục tiêu 1, option 1
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true,
        targetId: 1,
        cardId: 'spade_1',
        option: 1
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      // Ngọc Hân không mất máu, vẫn 3 HP
      expect(ngocHan.hp).toBe(3);
      expect(ngocHan.hand.some(c => c.id === 'spade_1')).toBe(false);

      // Mục tiêu nhận 1 sát thương (3 -> 2 HP). Deficit = 4 - 2 = 2 HP -> Rút 2 bài
      expect(target.hp).toBe(2);
      expect(target.hand.length).toBe(2);
    });

    it('Lựa chọn 2: Ngăn chặn sát thương, mục tiêu mất 1 HP và thu lấy lá bài vừa bỏ của Ngọc Hân', () => {
      const { state, dispatcher } = setupGame();
      const ngocHan = state.getPlayer(0);
      const target = state.getPlayer(1);

      CombatRules.applyDamage(state, 2, 0, 1, 'slash');
      expect(state.priorityStack.peek().type).toBe('ASK_HIEN_HAU');

      // Ngọc Hân chọn bỏ lá 'heart_1', chọn mục tiêu 1, option 2
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true,
        targetId: 1,
        cardId: 'heart_1',
        option: 2
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(ngocHan.hp).toBe(3); // Không mất máu
      expect(ngocHan.hand.some(c => c.id === 'heart_1')).toBe(false);

      // Mục tiêu mất 1 HP (3 -> 2 HP) và nhận được lá 'heart_1'
      expect(target.hp).toBe(2);
      expect(target.hand.some(c => c.id === 'heart_1')).toBe(true);
    });

    it('Từ chối Hiền Hậu: Ngọc Hân nhận sát thương như bình thường', () => {
      const { state, dispatcher } = setupGame();
      const ngocHan = state.getPlayer(0);

      CombatRules.applyDamage(state, 2, 0, 1, 'slash');
      expect(state.priorityStack.peek().type).toBe('ASK_HIEN_HAU');

      // Từ chối kích hoạt Hiền Hậu
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: false,
        responseType: 'cancel'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      // Ngọc Hân nhận sát thương (3 -> 2 HP)
      expect(ngocHan.hp).toBe(2);
    });
  });
});
