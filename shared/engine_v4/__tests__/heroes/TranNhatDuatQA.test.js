import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Trần Nhật Duật (tran_nhat_duat) — Thông Ngôn & Hòa Nghị', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Trần Nhật Duật',
          heroId: 'tran_nhat_duat',
          faction: 'ha',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: ['thong_ngon', 'hoa_nghi'],
          hand: []
        },
        {
          id: 1,
          name: 'Đồng Minh',
          gender: 'male',
          hp: 4,
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
        { id: 'deck_3', name: 'Lá Deck 3', suit: 'spade', rank: 3 }
      ],
      discardPile: [],
      currentTurnPlayerId: 2,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  describe('1. Thông Ngôn (Thu hồi lá bài phán xét sau khi có hiệu lực)', () => {
    it('Khi Trần Nhật Duật phán xét xong, tự động thu lá bài phán xét về tay', () => {
      const { state } = setupGame();
      const tnd = state.getPlayer(0);
      const judgeCard = { id: 'judge_card_1', name: 'Lá Phán Xét', suit: 'spade', rank: 5 };

      // Đưa lá phán xét vào discardPile trước
      state.discardPile.push(judgeCard);

      // Bắn sự kiện ON_JUDGED cho Trần Nhật Duật
      globalHeroRegistry.dispatchTrigger('ON_JUDGED', {
        targetId: 0,
        judgeCard
      }, state);

      // Thông Ngôn kích hoạt thu hồi lá phán xét về tay
      expect(tnd.hand.some(c => c.id === 'judge_card_1')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'judge_card_1')).toBe(false);
    });

    it('Người chơi khác phán xét thì Trần Nhật Duật không thu bài', () => {
      const { state } = setupGame();
      const tnd = state.getPlayer(0);
      const judgeCard = { id: 'judge_card_other', name: 'Lá Của Người Khác', suit: 'heart', rank: 9 };

      state.discardPile.push(judgeCard);

      // Bắn sự kiện ON_JUDGED cho người chơi 1
      globalHeroRegistry.dispatchTrigger('ON_JUDGED', {
        targetId: 1,
        judgeCard
      }, state);

      expect(tnd.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'judge_card_other')).toBe(true);
    });
  });

  describe('2. Hòa Nghị (Nhận sát thương rút 2 lá bài và phân phối)', () => {
    it('Nhận 1 sát thương tự động rút 2 lá bài và có thể tặng 1 lá cho đồng minh', () => {
      const { state, dispatcher } = setupGame();
      const tnd = state.getPlayer(0);
      const ally = state.getPlayer(1);

      expect(tnd.hp).toBe(3);

      // Trần Nhật Duật nhận 1 sát thương
      CombatRules.applyDamage(state, 2, 0, 1, 'slash');

      expect(tnd.hp).toBe(2);
      // Rút 2 lá bài ('deck_3', 'deck_2' theo pop)
      expect(tnd.hand.length).toBe(2);
      expect(state.priorityStack.peek().type).toBe('ASK_HOA_NGHI');

      // Phân phối: tặng lá 'deck_3' cho đồng minh 1, giữ lại lá 'deck_2'
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        distribution: [
          { cardId: 'deck_3', targetId: 1 }
        ]
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(tnd.hand.length).toBe(1);
      expect(tnd.hand[0].id).toBe('deck_2');
      expect(ally.hand.length).toBe(1);
      expect(ally.hand[0].id).toBe('deck_3');
    });

    it('Nhận 1 sát thương có thể chọn giữ lại toàn bộ 2 lá bài cho bản thân', () => {
      const { state, dispatcher } = setupGame();
      const tnd = state.getPlayer(0);
      const ally = state.getPlayer(1);

      CombatRules.applyDamage(state, 2, 0, 1, 'slash');
      expect(state.priorityStack.peek().type).toBe('ASK_HOA_NGHI');

      // Bỏ qua phân phối
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: false,
        responseType: 'skip'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      // Trần Nhật Duật giữ nguyên cả 2 lá bài
      expect(tnd.hand.length).toBe(2);
      expect(ally.hand.length).toBe(0);
    });
  });
});
