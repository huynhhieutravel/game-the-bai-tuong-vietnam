import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { PHASES } from '../../core/StateMachine.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('QA Toàn Diện Tướng Hệ Sơn: Lê Ngân (Le Ngan QA Suite v4)', () => {
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
          name: 'Lê Ngân (P0)',
          heroId: 'le_ngan',
          mainHeroId: 'le_ngan',
          subHeroId: null,
          faction: 'son',
          rawFaction: 'son',
          gender: 'male',
          hp: 2,
          maxHp: 3,
          skills: ['trung_dung', 'ho_gia'],
          hand: [
            { id: 'random_card_1', name: 'Lá Bài Bí Ẩn 1', type: 'basic' },
            { id: 'random_card_2', name: 'Lá Bài Bí Ẩn 2', type: 'basic' }
          ],
          revealedHeroes: [true, false],
          judgementArea: []
        },
        {
          id: 1,
          name: 'Mục Tiêu (P1)',
          faction: 'viet',
          rawFaction: 'viet',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          hand: [{ id: 'dodge_p1', type: 'dodge', name: 'Né' }]
        }
      ],
      drawPile: Array.from({ length: 30 }, (_, i) => ({ id: `card_${i}`, name: `Thẻ ${i}` })),
      currentTurnPlayerId: 0,
      phase: PHASES.ACTION
    });

    dispatcher = new DispatcherV4(state);
  });

  it('1. Đăng ký đầy đủ thuộc tính Lê Ngân trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('le_ngan');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Lê Ngân');
    expect(['son', 'Sơn'].includes(hero.faction) || hero.rawFaction === 'son').toBe(true);
    expect(hero.gender).toBe('male');
    expect(hero.hp).toBe(3);
    expect(hero.maxHp).toBe(3);
    expect(hero.skills.some(s => s.id === 'trung_dung')).toBe(true);
    expect(hero.skills.some(s => s.id === 'ho_gia')).toBe(true);
  });

  describe('2. Trung Dũng (Úp 1 bài dùng như bất kỳ lá bài nào)', () => {
    it('2.1. Trực tiếp: Úp 1 lá bất kỳ tuyên bố dùng như [Đào], hồi 1 HP thành công', () => {
      const p0 = state.getPlayer(0);
      expect(p0.hp).toBe(2);

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'trung_dung',
        cardIds: ['random_card_1'],
        virtualCardName: 'Đào'
      });

      // Hồi 1 HP lên 3/3
      expect(p0.hp).toBe(3);
      expect(p0.hand.some(c => c.id === 'random_card_1')).toBe(false);
      expect(state.discardPile.some(c => c.id === 'random_card_1')).toBe(true);
    });

    it('2.2. Trực tiếp: Úp 1 lá bất kỳ tuyên bố dùng như [Chém] tấn công mục tiêu', () => {
      const p0 = state.getPlayer(0);

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'trung_dung',
        cardIds: ['random_card_1'],
        virtualCardName: 'Chém',
        targets: [1]
      });

      // Frame ASK_DODGE được mở ra cho mục tiêu P1
      const topFrame = state.priorityStack.peek();
      expect(topFrame).toBeDefined();
      expect(topFrame.type).toBe('ASK_DODGE');
      expect(topFrame.targetId).toBe(1);
    });

    it('2.3. Modal ASK_TRUNG_DUNG: Chọn lá bài và virtualCardName hồi phục thành công', () => {
      const p0 = state.getPlayer(0);

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'trung_dung'
      });

      expect(state.priorityStack.peek().type).toBe('ASK_TRUNG_DUNG');

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: {
          cardId: 'random_card_1',
          virtualCardName: 'Đào'
        }
      });

      expect(p0.hp).toBe(3);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('2.4. Ràng buộc Một lượt 1 lần: Dùng lần thứ hai trong cùng lượt bị chặn', () => {
      const p0 = state.getPlayer(0);
      p0.hp = 1; // 1 HP sẽ bị Hộ Giá chặn, nên set 2 HP và maxHp = 4
      p0.hp = 2;
      p0.maxHp = 4;

      // Lần 1 dùng như Đào
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'trung_dung',
        cardIds: ['random_card_1'],
        virtualCardName: 'Đào'
      });

      // Lần 2 trong cùng lượt bị chặn
      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'trung_dung',
          cardIds: ['random_card_2'],
          virtualCardName: 'Đào',
          throwOnError: true
        });
      }).toThrow(/Mỗi lượt chỉ được sử dụng 1 lần/);
    });
  });

  describe('3. Hộ Giá (Khi còn 1 HP các kỹ năng khác bị vô hiệu)', () => {
    it('3.1. Khi Lê Ngân chỉ còn 1 HP: Kỹ năng Trung Dũng bị vô hiệu hóa', () => {
      const p0 = state.getPlayer(0);
      p0.hp = 1; // Rơi xuống mức nguy kịch 1 HP

      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'trung_dung',
          cardIds: ['random_card_1'],
          virtualCardName: 'Đào',
          throwOnError: true
        });
      }).toThrow(/Khi còn 1 HP, kỹ năng Trung Dũng bị vô hiệu hóa/);

      expect(p0.hand.length).toBe(2); // Không bị mất bài
    });

    it('3.2. Modal ASK_TRUNG_DUNG: Nếu còn 1 HP, phản hồi không được kích hoạt', () => {
      const p0 = state.getPlayer(0);
      p0.hp = 2;

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'trung_dung'
      });

      // Trong lúc đang ở frame, HP bị tụt xuống 1
      p0.hp = 1;

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: {
          cardId: 'random_card_1',
          virtualCardName: 'Đào'
        }
      });

      expect(p0.hp).toBe(1); // Không hồi máu
      expect(p0.hand.length).toBe(2); // Không mất bài
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });
});
