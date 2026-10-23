import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { getValidCardTargets } from '../../rules/TargetResolverV4.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Nguyễn Chích (nguyen_chich) — Nghệ An Kế & Hiến Kế', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Nguyễn Chích',
          heroId: 'nguyen_chich',
          faction: 'ha',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          skills: ['nghe_an_ke', 'hien_ke'],
          hand: [
            { id: 'nc_card_1', name: 'Lá Bài Duy Nhất', suit: 'spade', rank: 5 }
          ]
        },
        {
          id: 1,
          name: 'Kẻ Địch',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: [
            { id: 'c_steal', name: 'Cướp Bài', type: 'trick', idKey: 'cuop_bai' },
            { id: 'c_chaos', name: 'Hỗn Loạn', type: 'trick', idKey: 'hon_loan' }
          ]
        }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Lá Deck 1', suit: 'heart', rank: 1 },
        { id: 'deck_2', name: 'Lá Deck 2', suit: 'club', rank: 2 }
      ],
      discardPile: [],
      currentTurnPlayerId: 1,
      currentPhase: PHASES.ACTION
    });
    return state;
  };

  describe('1. Nghệ An Kế (Miễn nhiễm Cướp Bài và Hỗn Loạn)', () => {
    it('Không thể trở thành mục tiêu của [Cướp Bài]', () => {
      const state = setupGame();
      const p1 = state.getPlayer(1);
      const stealCard = p1.hand.find(c => c.id === 'c_steal');

      expect(() => {
        TrickRules.playSteal(state, 1, 0, stealCard);
      }).toThrow(/\[Nghệ An Kế\]/);
    });

    it('Không thể trở thành mục tiêu của [Hỗn Loạn]', () => {
      const state = setupGame();
      const p1 = state.getPlayer(1);
      const chaosCard = p1.hand.find(c => c.id === 'c_chaos');

      expect(() => {
        TrickRules.playChaos(state, 1, 0, chaosCard);
      }).toThrow(/\[Nghệ An Kế\]/);
    });

    it('getValidCardTargets loại Nguyễn Chích khỏi mục tiêu hợp lệ của Cướp Bài và Hỗn Loạn', () => {
      const state = setupGame();

      const stealTargets = getValidCardTargets(state, 1, 'Cướp Bài');
      expect(stealTargets.includes(0)).toBe(false);

      const chaosTargets = getValidCardTargets(state, 1, 'Hỗn Loạn');
      expect(chaosTargets.includes(0)).toBe(false);
    });
  });

  describe('2. Hiến Kế (Mất lá bài cuối cùng trên tay thì rút 1 lá bài)', () => {
    it('Khi Nguyễn Chích bỏ lá bài cuối cùng trên tay, tự động kích hoạt Hiến Kế rút 1 lá bài mới', () => {
      const state = setupGame();
      const nc = state.getPlayer(0);

      expect(nc.hand.length).toBe(1);

      // Bỏ lá bài duy nhất
      state.discardFromHand(0, ['nc_card_1']);

      // Sau khi bỏ lá cuối cùng, Hiến Kế tự động rút 1 lá bài mới từ drawPile
      expect(nc.hand.length).toBe(1);
      expect(nc.hand[0].id).toBe('deck_2'); // pop từ drawPile
      expect(state.discardPile.some(c => c.id === 'nc_card_1')).toBe(true);
    });

    it('Khi Nguyễn Chích còn nhiều hơn 1 lá bài trên tay, bỏ 1 lá không kích hoạt Hiến Kế', () => {
      const state = setupGame();
      const nc = state.getPlayer(0);

      // Cho thêm 1 lá bài nữa vào tay
      nc.hand.push({ id: 'nc_card_2', name: 'Lá Bài Thứ Hai' });
      expect(nc.hand.length).toBe(2);

      // Bỏ 1 lá
      state.discardFromHand(0, ['nc_card_1']);

      // Còn 1 lá, không kích hoạt Hiến Kế (không rút thêm bài)
      expect(nc.hand.length).toBe(1);
      expect(nc.hand[0].id).toBe('nc_card_2');
    });
  });
});
