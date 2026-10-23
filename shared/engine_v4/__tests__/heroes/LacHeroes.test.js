import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { LAC_HEROES } from '../../heroes/lac/index.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { RangeSystem } from '../../rules/RangeSystem.js';

describe('Heroes Hệ 🟢 LẠC v4 (Thục)', () => {
  // Đăng ký toàn bộ tướng Lạc vào Registry
  LAC_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));

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
        { id: 1, name: 'Đối thủ 1', hp: 4, maxHp: 4, hand: [] },
        { id: 2, name: 'Đối thủ 2', hp: 4, maxHp: 4, hand: [] }
      ],
      drawPile: [
        { id: 'c_black', suit: 'spade', color: 'black', name: 'Đen 1' },
        { id: 'c_red_1', suit: 'heart', color: 'red', name: 'Đỏ 1' },
        { id: 'c_red_2', suit: 'diamond', color: 'red', name: 'Đỏ 2' },
        { id: 'c_red_3', suit: 'heart', color: 'red', name: 'Đỏ 3' }
      ],
      currentTurnPlayerId: 0
    });
  };

  it('Thánh Gióng: Thiết Mã (-1 khoảng cách) và Tre Ngà (khóa né bằng phán xét)', () => {
    const state = createGameWithHero('thanh_giong');
    const giong = state.getPlayer(0);
    const target = state.getPlayer(2); // Bình thường cách 2 (3 người: min(2, 1) = 1, nhưng test 4 người)

    // Kiểm tra cự ly: Gióng có kỹ năng thiet_ma
    expect(giong.skills).toContain('thiet_ma');

    // Kích hoạt Tre Ngà qua dispatchTrigger
    globalHeroRegistry.dispatchTrigger('ON_SLASH_TARGET', {
      sourceId: 0,
      targetId: 1,
      target: state.getPlayer(1)
    }, state);

    expect(state.getPlayer(1).temporaryFlags.treNgaRequiredSuit).toBeDefined();
  });

  it('Cao Lỗ: Nỏ Thần (Bài tay >= địch cấm Né, HP <= địch +1 sát thương)', () => {
    const state = createGameWithHero('cao_lo_lac', {
      hand: [{ id: '1' }, { id: '2' }, { id: '3' }],
      hp: 3 // HP = 3 < Target HP = 4
    });

    const caoLo = state.getPlayer(0);
    const target = state.getPlayer(1);
    target.hand = [{ id: 'target_1' }]; // Bài tay = 1 < Cao Lỗ = 3

    const eventData = {
      sourceId: 0,
      targetId: 1,
      target,
      damageAmount: 1,
      unavoidable: false
    };

    globalHeroRegistry.dispatchTrigger('ON_SLASH_TARGET', eventData, state);

    expect(eventData.unavoidable).toBe(true); // Cấm Né!
    expect(eventData.damageAmount).toBe(2); // +1 Sát thương!
  });

  it('Rùa Vàng: Thần Giáp (Tự động kích hoạt Bát Quái khi không có giáp)', () => {
    const state = createGameWithHero('rua_vang');
    const ruaVang = state.getPlayer(0);

    // Rút ra lá bài Đỏ từ drawPile -> Né thành công
    const res = globalHeroRegistry.dispatchTrigger('ON_NEED_DODGE', {
      sourceId: 1,
      targetId: 0,
      target: ruaVang
    }, state);

    expect(res.some(r => r.result?.dodged === true)).toBe(true);
  });

  it('Chử Đồng Tử: Hóa Tiên (Hạn định khi Hấp hối hồi 3 HP và rút 3 bài)', () => {
    const state = createGameWithHero('chu_dong_tu', { hp: 0 });
    const chuDongTu = state.getPlayer(0);
    chuDongTu.hand = [{ id: 'junk_1' }];
    chuDongTu.equipment.weapon = { id: 'junk_weapon' };

    // Đẩy frame Hấp hối vào stack
    state.priorityStack.push({ type: 'ASK_PEACH', targetId: 0 });

    // Kích hoạt Hóa Tiên
    globalHeroRegistry.dispatchTrigger('ON_DYING', {
      sourceId: 1,
      targetId: 0,
      target: chuDongTu
    }, state);

    expect(chuDongTu.hp).toBe(3); // Hồi đầy 3 HP!
    expect(chuDongTu.equipment.weapon).toBe(null); // Đã bỏ trang bị
    expect(chuDongTu.hand.length).toBe(3); // Đã rút 3 lá bài mới
    expect(state.priorityStack.isEmpty()).toBe(true); // Thoát Hấp hối thành công
  });

  it('Tiên Dung: Duyên Tiên (Rút 1 lá bài khi sử dụng Cẩm Nang Thường)', () => {
    const state = createGameWithHero('tien_dung');
    const tienDung = state.getPlayer(0);

    expect(tienDung.hand.length).toBe(0);

    // Kích hoạt Duyên Tiên khi đánh cẩm nang
    globalHeroRegistry.dispatchTrigger('ON_TRICK_PLAYED', {
      sourceId: 0,
      card: { name: 'Cướp Bài' }
    }, state);

    expect(tienDung.hand.length).toBe(1); // Đã rút 1 bài
  });
});
