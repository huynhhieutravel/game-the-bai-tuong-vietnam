import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { LAC_HEROES } from '../../heroes/lac/index.js';
import { SON_HEROES } from '../../heroes/son/index.js';
import { VIET_HEROES } from '../../heroes/viet/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CombatRules } from '../../rules/CombatRules.js';

describe('QA Invariant: Bắt buộc Tự Động Minh Khai Tướng Khi Phát Động Kỹ Năng (Anti-Ghost Skill Invariant)', () => {
  beforeEach(() => {
    [...HA_HEROES, ...LAC_HEROES, ...SON_HEROES, ...VIET_HEROES].forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  it('1. Hiền Hậu (Ngọc Hân Công Chúa): Đang ẩn [false, false] dùng Hiền Hậu cản đòn phản sát thương -> Tự động lật mở tướng', () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Người chơi 1 (Bạn)',
          heroId: 'lac_long_quan',
          faction: 'lac',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          skills: ['thuy_to', 'boc_tram_trung'],
          hand: []
        },
        {
          id: 1,
          name: 'Người chơi 4 (Bot)',
          heroId: 'ngoc_han_cong_chua',
          faction: 'ha',
          gender: 'female',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [false, false], // Đang ẩn hoàn toàn
          skills: ['hien_hau', 'quoc_sac'],
          hand: [
            { id: 'heart_peach_1', name: 'Đào', type: 'peach', suit: 'heart', color: 'red', rank: 7 }
          ]
        }
      ]
    });

    const dispatcher = new DispatcherV4(state);

    // Người chơi 4 nhận sát thương từ Vạn Tiễn
    CombatRules.applyDamage(state, 0, 1, 1, 'arrow_rain');

    // Priority stack xuất hiện ASK_HIEN_HAU
    expect(state.priorityStack.peek().type).toBe('ASK_HIEN_HAU');

    // Người chơi 4 kích hoạt Hiền Hậu
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 1,
      doUse: true,
      cardId: 'heart_peach_1',
      targetId: 0,
      option: 2
    });

    // BẮT BUỘC: Người chơi 4 không còn bị ẩn! Phải lật mở Ngọc Hân Công Chúa
    expect(state.getPlayer(1).revealedHeroes[0]).toBe(true);
    expect(state.getPlayer(1).faction).toBe('Hà');
    // Người chơi 1 bị trừ 1 HP và nhận lá Đào
    expect(state.getPlayer(0).hp).toBe(3);
    expect(state.getPlayer(0).hand.some(c => c.id === 'heart_peach_1')).toBe(true);
  });

  it('2. Dời Núi (Sơn Tinh): Đang ẩn [false, false] dùng lá Né đánh như Chém -> Tự động lật mở Sơn Tinh', () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Sơn Tinh',
          heroId: 'son_tinh',
          faction: 'son',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [false, false],
          skills: ['doi_nui'],
          heroes: [globalHeroRegistry.getHero('son_tinh'), null],
          hand: [
            { id: 'dodge_1', name: 'Né', type: 'dodge', suit: 'spade', color: 'black', rank: 5 }
          ]
        },
        {
          id: 1,
          name: 'Đối thủ',
          heroId: 'trieu_quang_phuc',
          faction: 'viet',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          skills: [],
          hand: []
        }
      ]
    });

    const dispatcher = new DispatcherV4(state);

    // Sơn Tinh đánh lá Né như Chém
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: 'dodge_1',
      targetId: 1,
      virtualCardName: 'Chém',
      asSlash: true
    });

    // Sơn Tinh phải tự động lộ diện
    expect(state.getPlayer(0).revealedHeroes[0]).toBe(true);
    expect(state.getPlayer(0).faction).toBe('Lạc');
  });

  it('3. Lặn Sâu (Yết Kiêu): Đang ẩn [false, false] kích hoạt kỹ năng chủ động Lặn Sâu -> Tự động lật mở Yết Kiêu', () => {
    const state = new GameState({
      drawPile: [
        { id: 'c1', name: 'Bài 1' },
        { id: 'c2', name: 'Bài 2' }
      ],
      players: [
        {
          id: 0,
          name: 'Yết Kiêu',
          heroId: 'yet_kieu',
          faction: 'ha',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [false, false],
          skills: ['lan_sau'],
          heroes: [globalHeroRegistry.getHero('yet_kieu'), null],
          hand: []
        }
      ]
    });

    const dispatcher = new DispatcherV4(state);

    // Kích hoạt kỹ năng chủ động
    dispatcher.dispatchAction({
      type: 'ACTION_SKILL',
      playerId: 0,
      skillId: 'lan_sau'
    });

    // Yết Kiêu mất 1 HP để rút 2 bài VÀ PHẢI LẬT MỞ TƯỚNG
    expect(state.getPlayer(0).hp).toBe(2);
    expect(state.getPlayer(0).hand.length).toBe(2);
    expect(state.getPlayer(0).revealedHeroes[0]).toBe(true);
    expect(state.getPlayer(0).faction).toBe('Hà');
  });
});
