import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('QA Toàn Diện Tướng Hệ Sơn: Nguyễn Xí (Nguyen Xi QA Suite v4)', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    // Đăng ký tướng hệ Sơn vào globalHeroRegistry
    for (const hero of SON_HEROES) {
      if (!globalHeroRegistry.getHero(hero.id)) {
        globalHeroRegistry.registerHero(hero);
      }
    }

    state = new GameState({
      players: [
        {
          id: 0,
          name: 'Nguyễn Xí (P0)',
          heroId: 'nguyen_xi',
          mainHeroId: 'nguyen_xi',
          subHeroId: null,
          faction: 'son',
          rawFaction: 'son',
          gender: 'male',
          hp: 5,
          maxHp: 5,
          skills: ['pha_quan_nguyen_xi'],
          hand: [{ id: 'slash_nx', type: 'slash', name: 'Chém' }],
          revealedHeroes: [true, false]
        },
        {
          id: 1,
          name: 'Mục Tiêu Bị Chém (P1)',
          faction: 'viet',
          rawFaction: 'viet',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          hand: [
            { id: 'dodge_1', type: 'dodge', name: 'Né 1' },
            { id: 'dodge_2', type: 'dodge', name: 'Né 2' }
          ]
        },
        {
          id: 2,
          name: 'Người Thứ Ba (P2)',
          faction: 'lac',
          rawFaction: 'lac',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          hand: [{ id: 'slash_p2', type: 'slash', name: 'Chém P2' }]
        }
      ],
      drawPile: Array.from({ length: 30 }, (_, i) => ({ id: `card_${i}`, name: `Thẻ ${i}` })),
      currentTurnPlayerId: 0
    });

    dispatcher = new DispatcherV4(state);
  });

  it('1. Đăng ký đầy đủ thuộc tính Nguyễn Xí trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('nguyen_xi');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Nguyễn Xí');
    expect(['son', 'Sơn'].includes(hero.faction) || hero.rawFaction === 'son').toBe(true);
    expect(hero.gender).toBe('male');
    expect(hero.hp).toBe(5);
    expect(hero.maxHp).toBe(5);
    expect(hero.skills.some(s => s.id === 'pha_quan_nguyen_xi')).toBe(true);
  });

  describe('2. Phá Quân (Chém ép đối thủ dùng 2 lá Né)', () => {
    it('2.1. Khi Nguyễn Xí Chém, frame ASK_DODGE yêu cầu 2 lá Né (requiredDodges = 2)', () => {
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      CombatRules.playSlash(state, p0.id, p1.id, p0.hand[0]);

      const dodgeFrame = state.priorityStack.peek();
      expect(dodgeFrame).toBeDefined();
      expect(dodgeFrame.type).toBe('ASK_DODGE');
      expect(dodgeFrame.context.requiredDodges).toBe(2);
      expect(dodgeFrame.context.dodgesProvided).toBe(0);
    });

    it('2.2. Mục tiêu chỉ đánh 1 lá Né rồi bỏ cuộc -> bị trừ 1 HP', () => {
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      CombatRules.playSlash(state, p0.id, p1.id, p0.hand[0]);

      // Đánh lá Né thứ 1
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: p1.id,
        data: {
          cardId: 'dodge_1'
        }
      });

      // Frame ASK_DODGE vẫn còn tồn tại trên đỉnh stack, ghi nhận dodgesProvided = 1 / 2
      const ongoingFrame = state.priorityStack.peek();
      expect(ongoingFrame).toBeDefined();
      expect(ongoingFrame.type).toBe('ASK_DODGE');
      expect(ongoingFrame.context.dodgesProvided).toBe(1);
      expect(ongoingFrame.context.requiredDodges).toBe(2);

      // Mục tiêu không đánh tiếp lá Né thứ 2 (chọn skip)
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: p1.id,
        data: {
          isCancelOrSkip: true
        }
      });

      // Bị trúng đòn Chém, mất 1 HP
      expect(p1.hp).toBe(3);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('2.3. Mục tiêu đánh đủ cả 2 lá Né -> Né thành công, không mất máu', () => {
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      CombatRules.playSlash(state, p0.id, p1.id, p0.hand[0]);

      // Đánh lá Né thứ 1
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: p1.id,
        data: {
          cardId: 'dodge_1'
        }
      });

      // Đánh lá Né thứ 2
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: p1.id,
        data: {
          cardId: 'dodge_2'
        }
      });

      // Frame ASK_DODGE đã được giải quyết xong và bị pop
      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(p1.hp).toBe(4); // Máu giữ nguyên
      expect(p1.hand.length).toBe(0); // Tiêu tốn cả 2 lá Né
    });

    it('2.4. Chống nhảy ké: Khi người khác ra Chém, requiredDodges vẫn bằng 1 chuẩn', () => {
      const p2 = state.getPlayer(2);
      const p1 = state.getPlayer(1);

      CombatRules.playSlash(state, p2.id, p1.id, p2.hand[0]);

      const dodgeFrame = state.priorityStack.peek();
      expect(dodgeFrame).toBeDefined();
      expect(dodgeFrame.type).toBe('ASK_DODGE');
      expect(dodgeFrame.context.requiredDodges).toBe(1); // Không bị ảnh hưởng bởi Phá Quân
    });
  });
});
