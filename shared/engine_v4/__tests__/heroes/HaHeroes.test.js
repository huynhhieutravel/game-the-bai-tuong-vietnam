import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { GameInvariants } from '../../core/Invariants.js';

describe('Heroes Hệ 🔵 HÀ v4 (Ngô)', () => {
  HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));

  const createGameWithHero = (heroId, p0Props = {}) => {
    const hero = globalHeroRegistry.getHero(heroId);
    return new GameState({
      players: [
        {
          id: 0,
          name: hero.name,
          heroId: hero.id,
          faction: hero.faction,
          hp: hero.hp,
          maxHp: hero.maxHp,
          skills: hero.skills.map(s => s.id),
          hand: [],
          ...p0Props
        },
        { id: 1, name: 'Đối thủ 1', hp: 4, maxHp: 4, hand: [] }
      ],
      drawPile: Array.from({ length: 10 }, (_, i) => ({ id: `card_${i}`, name: `Thẻ ${i}` })),
      currentTurnPlayerId: 0
    });
  };

  it('Ngô Quyền: Bạch Đằng (Bỏ hết bài tay được rút count + 1 bài mới)', () => {
    const state = createGameWithHero('ngo_quyen', {
      hand: [{ id: 'old_1' }, { id: 'old_2' }] // 2 lá bài
    });

    const ngoQuyen = state.getPlayer(0);
    const skill = globalHeroRegistry.getSkill('bach_dang');

    skill.execute(state, { owner: ngoQuyen });

    // Bỏ 2 lá -> Rút 2 + 1 = 3 lá bài mới
    expect(ngoQuyen.hand.length).toBe(3);
  });

  it('Yết Kiêu: Lặn Sâu (Mất 1 HP để rút 2 bài)', () => {
    const state = createGameWithHero('yet_kieu', { hp: 4 });
    const yetKieu = state.getPlayer(0);
    const skill = globalHeroRegistry.getSkill('lan_sau');

    skill.execute(state, { owner: yetKieu });

    expect(yetKieu.hp).toBe(3); // Mất 1 HP
    expect(yetKieu.hand.length).toBe(2); // Rút 2 bài
  });

  it('Nguyễn Trãi: Bình Ngô (Giai đoạn rút bài được rút 3 lá bài)', () => {
    const state = createGameWithHero('nguyen_trai');
    const nguyenTrai = state.getPlayer(0);

    globalHeroRegistry.dispatchTrigger('DRAW_PHASE', {
      sourceId: 0,
      actorId: 0
    }, state);

    expect(nguyenTrai.temporaryFlags.drawCardCount).toBe(3);
  });

  it('Tô Hiến Thành: Nhiếp Chính (Miễn trừ luật bỏ bài khi không đánh Chém)', () => {
    const p = {
      id: 0,
      name: 'Tô Hiến Thành',
      hp: 1,
      hand: [{ id: '1' }, { id: '2' }, { id: '3' }], // 3 lá > 1 HP
      skills: ['nhiep_chinh_to_hien_thanh']
    };

    // GameInvariants không được throw error vì có Nhiếp Chính
    expect(() => {
      GameInvariants.assertDiscardLimit(p);
    }).not.toThrow();
  });

  it('Hồ Xuân Hương: Xuân Hương (Khi mất trang bị được rút 2 lá bài)', () => {
    const state = createGameWithHero('ho_xuan_huong');
    const hxh = state.getPlayer(0);

    globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', {
      targetId: 0
    }, state);

    expect(hxh.hand.length).toBe(2);
  });
});
