import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Yết Kiêu (yet_kieu) — Lặn Sâu', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = (p0Hp = 4) => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Yết Kiêu',
          heroId: 'yet_kieu',
          faction: 'ha',
          hp: p0Hp,
          maxHp: 4,
          skills: ['lan_sau'],
          hand: []
        },
        {
          id: 1,
          name: 'Đối thủ',
          hp: 4,
          maxHp: 4,
          hand: []
        }
      ],
      drawPile: [
        { id: 'card_1', name: 'Thẻ 1', suit: 'spade', rank: 1 },
        { id: 'card_2', name: 'Thẻ 2', suit: 'heart', rank: 2 },
        { id: 'card_3', name: 'Thẻ 3', suit: 'club', rank: 3 },
        { id: 'card_4', name: 'Thẻ 4', suit: 'diamond', rank: 4 },
        { id: 'card_5', name: 'Thẻ 5', suit: 'spade', rank: 5 }
      ],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  it('Lặn Sâu: Kích hoạt thành công, mất 1 HP và rút 2 lá bài', () => {
    const { state, dispatcher } = setupGame(4);
    const yetKieu = state.getPlayer(0);

    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'lan_sau'
      }
    });

    expect(yetKieu.hp).toBe(3);
    expect(yetKieu.hand.length).toBe(2);
  });

  it('Lặn Sâu: Có thể kích hoạt nhiều lần liên tiếp trong cùng một lượt nếu còn đủ HP', () => {
    const { state, dispatcher } = setupGame(4);
    const yetKieu = state.getPlayer(0);

    // Lần 1: 4 HP -> 3 HP, 2 bài
    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'lan_sau'
      }
    });
    expect(yetKieu.hp).toBe(3);
    expect(yetKieu.hand.length).toBe(2);

    // Lần 2: 3 HP -> 2 HP, 4 bài
    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'lan_sau'
      }
    });
    expect(yetKieu.hp).toBe(2);
    expect(yetKieu.hand.length).toBe(4);
  });

  it('Lặn Sâu: Không cho phép kích hoạt khi chỉ còn 1 HP (chặn tự sát)', () => {
    const { state, dispatcher } = setupGame(1);
    const yetKieu = state.getPlayer(0);
    const skill = globalHeroRegistry.getSkill('lan_sau');

    expect(skill.canUse(state, { owner: yetKieu })).toBe(false);

    expect(() => {
      dispatcher.dispatch({
        type: 'ACTION_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'lan_sau'
        }
      });
    }).toThrow(/Không thể mất máu khi chỉ còn 1 HP/);

    expect(yetKieu.hp).toBe(1);
    expect(yetKieu.hand.length).toBe(0);
  });
});
