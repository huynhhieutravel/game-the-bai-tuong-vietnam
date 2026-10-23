import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Chu Văn An (chu_van_an) — Thất Trảm Sớ', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Chu Văn An',
          heroId: 'chu_van_an',
          faction: 'ha',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: ['that_tram_so'],
          hand: []
        },
        {
          id: 1,
          name: 'Kẻ Tấn Công',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: [
            { id: 'c1', name: 'Lá 1', suit: 'diamond', rank: 2 },
            { id: 'c2', name: 'Lá 2', suit: 'club', rank: 3 },
            { id: 'c3', name: 'Lá 3', suit: 'spade', rank: 4 }
          ]
        }
      ],
      drawPile: [],
      discardPile: [],
      currentTurnPlayerId: 1,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  it('Phán xét KHÔNG phải Cơ: Kẻ tấn công chọn bỏ 2 lá bài trên tay', () => {
    const { state, dispatcher } = setupGame();
    const cva = state.getPlayer(0);
    const enemy = state.getPlayer(1);

    // Xếp lá phán xét là Bích (không phải Cơ)
    state.drawPile = [{ id: 'j_spade', name: 'Bích 8', suit: 'spade', rank: 8 }];

    // Kẻ địch gây 1 sát thương lên Chu Văn An
    CombatRules.applyDamage(state, 1, 0, 1, 'slash');

    expect(cva.hp).toBe(2);
    // Xuất hiện frame phạt ASK_THAT_TRAM_SO_PUNISH nhắm vào kẻ địch
    expect(state.priorityStack.peek().type).toBe('ASK_THAT_TRAM_SO_PUNISH');
    expect(state.priorityStack.peek().targetId).toBe(1);

    // Kẻ địch chọn bỏ 2 lá bài c1, c2
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 1,
      option: 'discard',
      cardIds: ['c1', 'c2']
    });

    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(enemy.hand.length).toBe(1); // 3 - 2 = 1 lá
    expect(enemy.hp).toBe(4); // Không mất máu
    expect(state.discardPile.some(c => c.id === 'c1')).toBe(true);
    expect(state.discardPile.some(c => c.id === 'c2')).toBe(true);
  });

  it('Phán xét KHÔNG phải Cơ: Kẻ tấn công chọn nhận 1 sát thương', () => {
    const { state, dispatcher } = setupGame();
    const enemy = state.getPlayer(1);

    // Xếp lá phán xét là Rô (không phải Cơ)
    state.drawPile = [{ id: 'j_diamond', name: 'Rô 9', suit: 'diamond', rank: 9 }];

    CombatRules.applyDamage(state, 1, 0, 1, 'slash');
    expect(state.priorityStack.peek().type).toBe('ASK_THAT_TRAM_SO_PUNISH');

    // Kẻ địch chọn nhận sát thương
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 1,
      option: 'damage'
    });

    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(enemy.hp).toBe(3); // 4 -> 3 HP
    expect(enemy.hand.length).toBe(3); // Không mất bài
  });

  it('Phán xét ra chất Cơ (♥): Thất Trảm Sớ không phạt kẻ tấn công', () => {
    const { state } = setupGame();
    const enemy = state.getPlayer(1);

    // Xếp lá phán xét là Cơ
    state.drawPile = [{ id: 'j_heart', name: 'Cơ 10', suit: 'heart', rank: 10 }];

    CombatRules.applyDamage(state, 1, 0, 1, 'slash');

    // Không có frame phạt nào trong priorityStack
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(enemy.hp).toBe(4);
    expect(enemy.hand.length).toBe(3);
  });
});
