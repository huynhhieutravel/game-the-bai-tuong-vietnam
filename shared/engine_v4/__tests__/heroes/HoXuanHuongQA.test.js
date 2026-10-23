import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Hồ Xuân Hương (ho_xuan_huong) — Duyên Thơ & Xuân Hương', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Hồ Xuân Hương',
          heroId: 'ho_xuan_huong',
          faction: 'ha',
          gender: 'female',
          hp: 2,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: ['duyen_tho', 'xuan_huong'],
          hand: [
            { id: 'c1', name: 'Lá 1', suit: 'heart', rank: 2 },
            { id: 'c2', name: 'Lá 2', suit: 'diamond', rank: 5 },
            { id: 'c3', name: 'Lá 3', suit: 'spade', rank: 8 }
          ],
          equipment: {
            weapon: { id: 'w1', name: 'Kiếm Ngắn', type: 'weapon' }
          }
        },
        {
          id: 1,
          name: 'Tướng Nam Đồng Minh',
          gender: 'male',
          hp: 2,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: [],
          equipment: {
            weapon: { id: 'w2', name: 'Côn Gỗ', type: 'weapon' }
          }
        },
        {
          id: 2,
          name: 'Tướng Nữ Đối Thủ',
          gender: 'female',
          hp: 2,
          maxHp: 3,
          revealedHeroes: [true, true],
          hand: []
        }
      ],
      drawPile: [
        { id: 'd1', name: 'Deck 1', suit: 'club', rank: 3 },
        { id: 'd2', name: 'Deck 2', suit: 'heart', rank: 9 },
        { id: 'd3', name: 'Deck 3', suit: 'spade', rank: 10 }
      ],
      discardPile: [],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  describe('1. Duyên Thơ (Bỏ 2 bài hồi 1 HP cho mình và tướng Nam)', () => {
    it('Bỏ 2 lá bài hồi 1 HP cho bản thân và 1 tướng Nam bị thương', () => {
      const { state, dispatcher } = setupGame();
      const hxh = state.getPlayer(0);
      const nam = state.getPlayer(1);

      expect(hxh.hp).toBe(2);
      expect(nam.hp).toBe(2);
      expect(hxh.hand.length).toBe(3);

      // Kích hoạt Duyên Thơ
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'duyen_tho',
        sourceId: 0
      });

      expect(state.priorityStack.peek().type).toBe('ASK_DUYEN_THO');

      // Phản hồi chọn bỏ c1, c2 và chỉ định hồi máu cho tướng Nam (id: 1)
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        targetId: 1,
        cardIds: ['c1', 'c2']
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(hxh.hp).toBe(3); // 2 -> 3 (Max)
      expect(nam.hp).toBe(3); // 2 -> 3
      expect(hxh.hand.length).toBe(1); // 3 - 2 = 1 lá (c3)
      expect(state.discardPile.some(c => c.id === 'c1')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'c2')).toBe(true);
      expect(hxh.skillUsage?.duyen_tho?.usedThisTurn).toBe(true);
    });

    it('Không thể kích hoạt lần 2 trong cùng một lượt', () => {
      const { state, dispatcher } = setupGame();
      const hxh = state.getPlayer(0);

      // Cho hxh thêm bài để đủ 2 lá
      hxh.hand.push({ id: 'c4', name: 'Lá 4' });

      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'duyen_tho',
        sourceId: 0
      });

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        targetId: 1,
        cardIds: ['c1', 'c2']
      });

      // Thử dùng lần 2
      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_SKILL',
          skillId: 'duyen_tho',
          sourceId: 0,
          throwOnError: true
        });
      }).toThrow();
    });
  });

  describe('2. Xuân Hương (Mất trang bị rút 2 lá bài)', () => {
    it('Khi Hồ Xuân Hương mất trang bị, tự động kích hoạt Xuân Hương rút 2 lá bài', () => {
      const { state } = setupGame();
      const hxh = state.getPlayer(0);
      const initialHandCount = hxh.hand.length;

      // Giả lập mất vũ khí
      const lostWeapon = hxh.equipment.weapon;
      hxh.equipment.weapon = null;
      state.discardPile.push(lostWeapon);

      // Phát sự kiện ON_EQUIP_LOST
      globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', {
        targetId: 0,
        card: lostWeapon
      }, state);

      expect(hxh.hand.length).toBe(initialHandCount + 2);
    });

    it('Khi người chơi khác mất trang bị, Hồ Xuân Hương không được rút bài', () => {
      const { state } = setupGame();
      const hxh = state.getPlayer(0);
      const nam = state.getPlayer(1);
      const initialHandCount = hxh.hand.length;

      const lostWeapon = nam.equipment.weapon;
      nam.equipment.weapon = null;
      state.discardPile.push(lostWeapon);

      // Phát sự kiện ON_EQUIP_LOST cho người chơi 1
      globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', {
        targetId: 1,
        card: lostWeapon
      }, state);

      // Hồ Xuân Hương không bị kích hoạt rút bài ké
      expect(hxh.hand.length).toBe(initialHandCount);
    });
  });
});
