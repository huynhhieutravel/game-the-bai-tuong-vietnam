import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { VIET_HEROES } from '../../heroes/viet/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';

describe('Heroes Hệ 🔴 VIỆT v4 (Nguỵ)', () => {
  VIET_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));

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
      drawPile: [
        { id: 'c1', name: 'Thẻ 1' },
        { id: 'c2', name: 'Thẻ 2' },
        { id: 'c3', name: 'Thẻ 3' },
        { id: 'c4', name: 'Thẻ 4' }
      ],
      currentTurnPlayerId: 0
    });
  };

  it('Triệu Quang Phục: Dạ Trạch (Bỏ qua pha Rút bài để cướp bài)', () => {
    const state = createGameWithHero('trieu_quang_phuc');
    const tqp = state.getPlayer(0);

    globalHeroRegistry.dispatchTrigger('DRAW_PHASE', {
      sourceId: 0,
      source: tqp
    }, state);

    expect(tqp.temporaryFlags.skipDrawPhase).toBe(true);
  });

  it('Phùng Hưng: Khởi Nghĩa (Rút ít hơn 1 bài để nhận +1 sát thương)', () => {
    const state = createGameWithHero('phung_hung');
    const phungHung = state.getPlayer(0);

    globalHeroRegistry.dispatchTrigger('DRAW_PHASE', {
      sourceId: 0,
      source: phungHung
    }, state);

    expect(phungHung.temporaryFlags.drawCardCount).toBe(1);
    expect(phungHung.temporaryFlags.bonusDamage).toBe(1);
  });

  it('Khúc Thừa Dụ: Khoan Dân (Khi nhận sát thương, rút bù bài cho bằng MaxHP)', () => {
    const state = createGameWithHero('khuc_thua_du', {
      hp: 2, // 2/3 HP
      hand: [{ id: 'hand_1' }] // 1 bài tay < 3 MaxHP
    });

    const ktd = state.getPlayer(0);

    globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
      sourceId: 1,
      targetId: 0,
      target: ktd
    }, state);

    expect(state.priorityStack.peek().type).toBe('ASK_KHOAN_DAN');

    const dispatcher = new DispatcherV4(state);
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { doUse: true, targetId: 0 }
      }
    });

    // MaxHP = 3, có sẵn 1 bài -> rút thêm 2 bài -> tổng 3 bài
    expect(ktd.hand.length).toBe(3);
  });

  it('Lý Thường Kiệt: Nam Quốc Sơn Hà (Nhận damage rút 1 bài và thu lấy lá bài gây sát thương)', () => {
    const state = createGameWithHero('ly_thuong_kiet');
    const ltk = state.getPlayer(0);
    const slashCard = { id: 'lethal_slash', name: 'Chém Sát Thương' };

    state.discardPile.push(slashCard);

    globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
      sourceId: 1,
      targetId: 0,
      target: ltk,
      card: slashCard
    }, state);

    expect(ltk.hand.some(c => c.id === 'lethal_slash')).toBe(true); // Thu lấy lá Chém
    expect(ltk.hand.length).toBe(2); // 1 bài rút + 1 lá Chém thu hồi
  });

  it('Trần Quang Khải: Đoạt Sáo (Cuối lượt rút 4 lá bài)', () => {
    const state = createGameWithHero('tran_quang_khai');
    const tqk = state.getPlayer(0);

    globalHeroRegistry.dispatchTrigger('END_PHASE', {
      sourceId: 0,
      actorId: 0
    }, state);

    expect(state.priorityStack.peek().type).toBe('ASK_DOAT_SAO');

    const dispatcher = new DispatcherV4(state);
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { doUse: true }
      }
    });

    expect(tqk.hand.length).toBe(4); // Rút 4 lá bài
  });
});
