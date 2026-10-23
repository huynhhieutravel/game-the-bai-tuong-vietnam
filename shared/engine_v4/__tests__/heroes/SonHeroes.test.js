import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('Heroes Hệ 🟤 SƠN v4 (Quần Hùng)', () => {
  SON_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));

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

  it('Tuệ Tĩnh: Diệu Dược (Chữa lành 1 HP cho đồng minh)', () => {
    const state = createGameWithHero('tue_tinh');
    const tueTinh = state.getPlayer(0);
    const ally = state.getPlayer(1);
    ally.hp = 2; // Bị thương 2/4 HP

    const skill = globalHeroRegistry.getSkill('dieu_duoc');
    skill.execute(state, { owner: tueTinh, target: ally });

    expect(ally.hp).toBe(3); // Hồi 1 HP
  });

  it('Đinh Bộ Lĩnh: Uy Chấn (Bị Chém Đỏ gây damage thì kẻ tấn công được rút 1 bài)', () => {
    const state = createGameWithHero('dinh_bo_linh');
    const dbl = state.getPlayer(0);
    const attacker = state.getPlayer(1);

    globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
      sourceId: 1,
      actor: attacker,
      targetId: 0,
      target: dbl,
      card: { type: 'slash', color: 'red' }
    }, state);

    expect(attacker.hand.length).toBe(1); // Kẻ tấn công được nhận 1 bài
  });

  it('Huyền Trân Công Chúa: An Bang (Rút 1 lá bài trong pha Kết thúc)', () => {
    const state = createGameWithHero('huyen_tran_cong_chua');
    const huyenTran = state.getPlayer(0);

    globalHeroRegistry.dispatchTrigger('END_PHASE', {
      sourceId: 0,
      actorId: 0
    }, state);

    expect(huyenTran.hand.length).toBe(1);
  });

  it('Đinh Điền: Phạt Tội (Trừng phạt đúng kẻ tấn công và không bao giờ nhảy ké)', () => {
    const state = createGameWithHero('dinh_dien');
    const dinhDien = state.getPlayer(0);
    const attacker = state.getPlayer(1);

    // TH1: Đinh Điền Né thành công kẻ tấn công (id 1)
    globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', {
      sourceId: 1,
      actorId: 1,
      actor: attacker,
      targetId: 0,
      target: dinhDien
    }, state);

    expect(attacker.hp).toBe(3); // Kẻ tấn công bị phạt trừ 1 HP!

    // TH2: Người khác Né thành công (Ví dụ Người 2 né Người 3) -> Đinh Điền KHÔNG ĐƯỢC nhảy ké!
    const hpBefore = attacker.hp;
    globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', {
      sourceId: 2,
      actorId: 2,
      targetId: 3 // Người 3 né
    }, state);

    expect(attacker.hp).toBe(hpBefore); // Không đổi vì Đinh Điền không nhảy ké
  });

  it('Nguyễn Xí: Phá Quân (Bắt mục tiêu dùng 2 lá Né và chống nhảy ké)', () => {
    const state = createGameWithHero('nguyen_xi');
    const nguyenXi = state.getPlayer(0);

    const eventData = {
      sourceId: 0, // Nguyễn Xí Chém
      targetId: 1,
      requiredDodges: 1
    };

    globalHeroRegistry.dispatchTrigger('ON_SLASH_TARGET', eventData, state);
    expect(eventData.requiredDodges).toBe(2); // Ép 2 lá Né!

    // Nếu người khác Chém -> Kỹ năng không kích hoạt
    const eventOther = { sourceId: 1, targetId: 2, requiredDodges: 1 };
    globalHeroRegistry.dispatchTrigger('ON_SLASH_TARGET', eventOther, state);
    expect(eventOther.requiredDodges).toBe(1);
  });
});
