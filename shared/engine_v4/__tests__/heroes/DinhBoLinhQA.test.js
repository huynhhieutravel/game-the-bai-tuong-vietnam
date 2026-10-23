import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('QA Toàn Diện Tướng Hệ Sơn: Đinh Bộ Lĩnh (Dinh Bo Linh QA Suite v4)', () => {
  let state;

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
          name: 'Đinh Bộ Lĩnh (P0)',
          heroId: 'dinh_bo_linh',
          mainHeroId: 'dinh_bo_linh',
          subHeroId: null,
          faction: 'son',
          hp: 6,
          maxHp: 6,
          skills: ['uy_chan'],
          hand: [],
          revealedHeroes: [true, false]
        },
        { id: 1, name: 'Kẻ Tấn Công (P1)', hp: 4, maxHp: 4, hand: [] },
        { id: 2, name: 'Người Thứ Ba (P2)', hp: 4, maxHp: 4, hand: [] }
      ],
      drawPile: Array.from({ length: 20 }, (_, i) => ({ id: `card_${i}`, name: `Thẻ ${i}` })),
      currentTurnPlayerId: 1
    });
  });

  it('1. Đăng ký đầy đủ thuộc tính Vạn Thắng Vương Đinh Bộ Lĩnh trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('dinh_bo_linh');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Đinh Bộ Lĩnh');
    expect(['son', 'Sơn'].includes(hero.faction) || hero.rawFaction === 'son').toBe(true);
    expect(hero.gender).toBe('male');
    expect(hero.hp).toBe(6);
    expect(hero.maxHp).toBe(6);
    expect(hero.skills.some(s => s.id === 'uy_chan')).toBe(true);
  });

  describe('2. Uy Chấn (Khi bị Chém Đỏ gây sát thương, kẻ tấn công chọn hồi 1 HP hoặc rút 1 bài)', () => {
    it('2.1. Kẻ tấn công bị thương chọn hồi 1 HP khi Chém Đỏ trúng Đinh Bộ Lĩnh', () => {
      const p0 = state.getPlayer(0);
      const attacker = state.getPlayer(1);
      attacker.hp = 2;
      attacker.maxHp = 4;
      attacker.hand = [];

      const redSlash = { id: 'slash_red_1', type: 'slash', suit: 'hearts', color: 'red', name: 'Chém Đỏ' };

      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p0.id,
        target: p0,
        damageAmount: 1,
        card: redSlash,
        choice: 'heal'
      }, state);

      expect(attacker.hp).toBe(3); // Hồi 1 HP
      expect(attacker.hand.length).toBe(0); // Không rút bài
    });

    it('2.2. Kẻ tấn công chọn rút 1 bài khi Chém Đỏ trúng Đinh Bộ Lĩnh', () => {
      const p0 = state.getPlayer(0);
      const attacker = state.getPlayer(1);
      attacker.hp = 2;
      attacker.maxHp = 4;
      attacker.hand = [];
      state.drawPile = [{ id: 'card_drawn_1', name: 'Thẻ Bài Rút' }];

      const redSlash = { id: 'slash_red_2', type: 'slash', suit: 'diamonds', color: 'red', name: 'Chém Rô' };

      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p0.id,
        target: p0,
        damageAmount: 1,
        card: redSlash,
        choice: 'draw'
      }, state);

      expect(attacker.hp).toBe(2); // Giữ nguyên máu
      expect(attacker.hand.length).toBe(1); // Rút 1 bài
      expect(attacker.hand[0].id).toBe('card_drawn_1');
    });

    it('2.3. Kẻ tấn công đầy máu tự động rút 1 bài khi Chém Đỏ trúng Đinh Bộ Lĩnh', () => {
      const p0 = state.getPlayer(0);
      const attacker = state.getPlayer(1);
      attacker.hp = 4;
      attacker.maxHp = 4;
      attacker.hand = [];
      state.drawPile = [{ id: 'card_drawn_2', name: 'Thẻ Bài Rút 2' }];

      const redSlash = { id: 'slash_red_3', type: 'slash', suit: 'hearts', color: 'red', name: 'Chém Cơ' };

      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p0.id,
        target: p0,
        damageAmount: 1,
        card: redSlash
      }, state);

      expect(attacker.hp).toBe(4); // Không vượt maxHp
      expect(attacker.hand.length).toBe(1); // Rút bài
    });

    it('2.4. Không kích hoạt Uy Chấn khi bị Chém Đen gây sát thương', () => {
      const p0 = state.getPlayer(0);
      const attacker = state.getPlayer(1);
      attacker.hp = 2;
      attacker.maxHp = 4;
      attacker.hand = [];

      const blackSlash = { id: 'slash_black_1', type: 'slash', suit: 'spades', color: 'black', name: 'Chém Bích' };

      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p0.id,
        target: p0,
        damageAmount: 1,
        card: blackSlash,
        choice: 'heal'
      }, state);

      expect(attacker.hp).toBe(2); // Không hồi HP
      expect(attacker.hand.length).toBe(0); // Không rút bài
    });

    it('2.5. Không kích hoạt Uy Chấn khi nhận sát thương từ Cẩm nang (Hỏa Công, Quyết Đấu)', () => {
      const p0 = state.getPlayer(0);
      const attacker = state.getPlayer(1);
      attacker.hp = 2;
      attacker.maxHp = 4;
      attacker.hand = [];

      const redFireTrick = { id: 'fire_trick_1', type: 'trick', suit: 'hearts', color: 'red', name: 'Hỏa Công' };

      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p0.id,
        target: p0,
        damageAmount: 1,
        card: redFireTrick,
        reason: 'fire_trick'
      }, state);

      expect(attacker.hp).toBe(2);
      expect(attacker.hand.length).toBe(0);
    });

    it('2.6. Chống nhảy ké: Không kích hoạt Uy Chấn khi mục tiêu bị chém là người khác', () => {
      const p2 = state.getPlayer(2);
      const attacker = state.getPlayer(1);
      attacker.hp = 2;
      attacker.maxHp = 4;
      attacker.hand = [];

      const redSlash = { id: 'slash_red_4', type: 'slash', suit: 'hearts', color: 'red', name: 'Chém Đỏ' };

      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p2.id,
        target: p2,
        damageAmount: 1,
        card: redSlash
      }, state);

      expect(attacker.hp).toBe(2);
      expect(attacker.hand.length).toBe(0);
    });
  });
});
