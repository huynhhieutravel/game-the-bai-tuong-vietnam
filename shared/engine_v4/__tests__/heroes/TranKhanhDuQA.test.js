import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Trần Khánh Dư (tran_khanh_du) — Vân Đồn', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Trần Khánh Dư',
          heroId: 'tran_khanh_du',
          faction: 'ha',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          skills: ['van_don'],
          hand: [
            { id: 'k_card', name: 'Lá Bài K', suit: 'spade', rank: 'K' },
            { id: 'low_card', name: 'Lá Bài 5', suit: 'club', rank: 5 },
            { id: 'slash_1', name: 'Chém 1', type: 'slash', suit: 'spade', rank: 7 },
            { id: 'slash_2', name: 'Chém 2', type: 'slash', suit: 'club', rank: 8 }
          ]
        },
        {
          id: 1,
          name: 'Đối Thủ Gần',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: [
            { id: 'opp_card_8', name: 'Lá Bài 8', suit: 'heart', rank: 8 },
            { id: 'opp_card_j', name: 'Lá Bài J', suit: 'diamond', rank: 'J' }
          ]
        },
        {
          id: 2,
          name: 'Đối Thủ Xa',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: [
            { id: 'opp2_card', name: 'Lá Đối Thủ 2', suit: 'spade', rank: 9 }
          ],
          equipment: {
            horse_defense: { id: 'horse_def', name: 'Ngựa Thần (+1)' }
          }
        }
      ],
      drawPile: [],
      discardPile: [],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  it('Đấu điểm Thắng: Được đánh thêm 1 Chém và Chém vô hạn cự ly', () => {
    const { state, dispatcher } = setupGame();
    const tkd = state.getPlayer(0);

    // Kích hoạt Vân Đồn nhắm vào mục tiêu 1
    dispatcher.dispatchAction({
      type: 'ACTION_SKILL',
      skillId: 'van_don',
      playerId: 0,
      targets: [1]
    });

    expect(state.priorityStack.peek().type).toBe('ASK_VAN_DON');

    // TKD ra lá K, đối thủ ra lá 8 -> TKD Thắng!
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 0,
      cardId: 'k_card',
      targetCardId: 'opp_card_8'
    });

    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(tkd.temporaryFlags?.vanDonWin).toBe(true);

    // 1. Chém phát thứ 1: Nhắm vào mục tiêu xa (cách 2 khoảng cách do có ngựa thủ) -> Thành công nhờ vô hạn cự ly
    const slash1 = tkd.hand.find(c => c.id === 'slash_1');
    CombatRules.playSlash(state, 0, 2, slash1);
    expect(tkd.turnStats.slashCount).toBe(1);

    // Giải phóng ASK_DODGE
    state.priorityStack.pop();

    // 2. Chém phát thứ 2: Thành công mà không vi phạm Invariant Slash Limit
    const slash2 = tkd.hand.find(c => c.id === 'slash_2');
    CombatRules.playSlash(state, 0, 1, slash2);
    expect(tkd.turnStats.slashCount).toBe(2);
  });

  it('Đấu điểm Thua: Bị cấm Chém hoàn toàn trong lượt', () => {
    const { state, dispatcher } = setupGame();
    const tkd = state.getPlayer(0);

    dispatcher.dispatchAction({
      type: 'ACTION_SKILL',
      skillId: 'van_don',
      playerId: 0,
      targets: [1]
    });

    // TKD ra lá 5, đối thủ ra lá J (11) -> TKD Thua!
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 0,
      cardId: 'low_card',
      targetCardId: 'opp_card_j'
    });

    expect(tkd.temporaryFlags?.vanDonLose).toBe(true);

    // Thử Chém -> Bị ném lỗi
    const slash1 = tkd.hand.find(c => c.id === 'slash_1');
    expect(() => {
      CombatRules.playSlash(state, 0, 1, slash1);
    }).toThrow(/đã thất bại trong đấu điểm \[Vân Đồn\], không thể Chém/);
  });

  it('Không thể kích hoạt Vân Đồn lần 2 trong cùng một lượt', () => {
    const { state, dispatcher } = setupGame();

    dispatcher.dispatchAction({
      type: 'ACTION_SKILL',
      skillId: 'van_don',
      playerId: 0,
      targets: [1]
    });

    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 0,
      cardId: 'k_card',
      targetCardId: 'opp_card_8'
    });

    // Thử dùng lần 2
    expect(() => {
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'van_don',
        playerId: 0,
        targets: [1],
        throwOnError: true
      });
    }).toThrow();
  });
});
