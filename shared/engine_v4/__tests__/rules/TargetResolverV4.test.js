import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import {
  mapVietnameseToSlug,
  getTargetingDefinition,
  getAvailableTargets,
  validateTargetPayload,
  canPlayCard,
  canUseSkill,
  canAttack
} from '../../rules/TargetResolverV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('TargetResolverV4 Unit Test Suite', () => {
  const createMockState = () => {
    return new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0',
          hp: 3,
          maxHp: 4,
          isAlive: true,
          hand: [
            { id: 'c_slash_0', name: 'Chém', type: 'slash', suit: 'spade', rank: '7' },
            { id: 'c_peach_0', name: 'Đào', type: 'peach', suit: 'heart', rank: '3' },
            { id: 'c_wine_0', name: 'Rượu', type: 'wine', suit: 'diamond', rank: '9' },
            { id: 'c_snatch_0', name: 'Cướp Bài', type: 'trick', suit: 'spade', rank: 'J' },
            { id: 'c_borrow_0', name: 'Mượn Đao', type: 'trick', suit: 'club', rank: 'Q' },
            { id: 'c_chains_0', name: 'Xiềng Xích', type: 'trick', suit: 'club', rank: '10' }
          ],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: []
        },
        {
          id: 1,
          name: 'Player 1',
          hp: 4,
          maxHp: 4,
          isAlive: true,
          hand: [{ id: 'c_target_1', name: 'Né', type: 'dodge' }],
          equipment: { weapon: { id: 'w_sword', name: 'Thanh Long Đao', range: 3 }, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: []
        },
        {
          id: 2,
          name: 'Player 2',
          hp: 2,
          maxHp: 4,
          isAlive: true,
          hand: [],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: []
        }
      ],
      currentTurnPlayerId: 0
    });
  };

  it('mapVietnameseToSlug chuyển đổi chính xác tên bài và ID key', () => {
    expect(mapVietnameseToSlug('Chém')).toBe('chem');
    expect(mapVietnameseToSlug('slash')).toBe('chem');
    expect(mapVietnameseToSlug('Đào')).toBe('dao');
    expect(mapVietnameseToSlug('peach')).toBe('dao');
    expect(mapVietnameseToSlug('Mượn Đao')).toBe('muon-dao');
    expect(mapVietnameseToSlug('Cướp Bài')).toBe('cuop-bai');
    expect(mapVietnameseToSlug('Xiềng Xích')).toBe('xieng-xich');
    expect(mapVietnameseToSlug('Thanh Long Đao')).toBe('thanh-long-dao');
  });

  it('getTargetingDefinition xác định đúng loại mục tiêu cho từng lá bài', () => {
    const state = createMockState();
    const p0 = state.getPlayer(0);

    // Chém -> single
    const slashCard = p0.hand.find(c => c.name === 'Chém');
    const slashDef = getTargetingDefinition(state, 0, 'Chém', slashCard);
    expect(slashDef.type).toBe('single');

    // Đào -> self
    const peachDef = getTargetingDefinition(state, 0, 'Đào');
    expect(peachDef.type).toBe('self');

    // Trang bị -> self
    const equipCard = { id: 'eq1', name: 'Bát Quái', type: 'equip' };
    const equipDef = getTargetingDefinition(state, 0, 'Bát Quái', equipCard);
    expect(equipDef.type).toBe('self');

    // Mượn Đao -> sequence
    const borrowDef = getTargetingDefinition(state, 0, 'Mượn Đao');
    expect(borrowDef.type).toBe('sequence');
    expect(borrowDef.steps.length).toBe(2);

    // Xiềng Xích -> multiple
    const chainsDef = getTargetingDefinition(state, 0, 'Xiềng Xích');
    expect(chainsDef.type).toBe('multiple');
    expect(chainsDef.min).toBe(0);
    expect(chainsDef.max).toBe(2);
  });

  it('getAvailableTargets lọc đúng danh sách mục tiêu hợp lệ', () => {
    const state = createMockState();

    // Chém từ P0 (tầm đánh 1) -> P1 ở khoảng cách 1 hợp lệ, P2 ở khoảng cách 1 hợp lệ
    const slashTargets = getAvailableTargets(state, 0, 'Chém', 'c_slash_0', []);
    expect(slashTargets).toContain(1);
    expect(slashTargets).toContain(2);
    expect(slashTargets).not.toContain(0); // Không thể tự chém mình

    // Cướp Bài từ P0 -> P1 có bài trên tay và trang bị (khoảng cách 1) -> hợp lệ
    // P2 không có bài (hand rỗng, không equip, không judge) -> không hợp lệ
    const snatchTargets = getAvailableTargets(state, 0, 'Cướp Bài', 'c_snatch_0', []);
    expect(snatchTargets).toContain(1);
    expect(snatchTargets).not.toContain(2);

    // Mượn Đao:
    // Bước 0: Người có vũ khí -> P1 có weapon Thanh Long Đao, P2 không có
    const borrowStep0 = getAvailableTargets(state, 0, 'Mượn Đao', 'c_borrow_0', []);
    expect(borrowStep0).toEqual([1]);

    // Kiểm tra tương thích với ViewModel dạng Array equipment của Client
    const p1 = state.getPlayer(1);
    const savedEq = p1.equipment;
    p1.equipment = [{ id: 'thanh-long-dao-vm', name: 'Thanh Long Đao', type: 'equip', subtype: 'equip_weapon' }];
    const borrowStep0VM = getAvailableTargets(state, 0, 'Mượn Đao', 'c_borrow_0', []);
    expect(borrowStep0VM).toEqual([1]);
    p1.equipment = savedEq;

    // Bước 1: Sau khi chọn P1, mục tiêu trong tầm đánh của P1 (vũ khí tầm 3)
    const borrowStep1 = getAvailableTargets(state, 0, 'Mượn Đao', 'c_borrow_0', [1]);
    expect(borrowStep1).toContain(0); // P1 có thể chém P0
    expect(borrowStep1).toContain(2); // P1 có thể chém P2
    expect(borrowStep1).not.toContain(1); // P1 không tự chém mình
  });

  it('validateTargetPayload xác thực hợp lệ và phát hiện payload sai', () => {
    const state = createMockState();

    // Chém: chọn 1 mục tiêu hợp lệ (P1)
    const validSlash = validateTargetPayload(state, 0, 'Chém', 'c_slash_0', [1]);
    expect(validSlash.valid).toBe(true);

    // Chém: chọn 2 mục tiêu khi không có Vân Đồn/Phương Thiên Kích -> không hợp lệ
    const invalidMultiSlash = validateTargetPayload(state, 0, 'Chém', 'c_slash_0', [1, 2]);
    expect(invalidMultiSlash.valid).toBe(false);

    // Mượn Đao: chọn đủ 2 bước hợp lệ [P1, P2]
    const validBorrow = validateTargetPayload(state, 0, 'Mượn Đao', 'c_borrow_0', [1, 2]);
    expect(validBorrow.valid).toBe(true);

    // Mượn Đao: bước 1 chọn P2 (không có vũ khí) -> không hợp lệ
    const invalidBorrow = validateTargetPayload(state, 0, 'Mượn Đao', 'c_borrow_0', [2, 1]);
    expect(invalidBorrow.valid).toBe(false);
  });

  it('canPlayCard kiểm tra điều kiện chơi bài chính xác', () => {
    const state = createMockState();
    const p0 = state.getPlayer(0);

    // Đào: P0 đang 3/4 HP -> dùng được
    expect(canPlayCard(state, 0, 'Đào').valid).toBe(true);

    // Đào: P0 đầy máu 4/4 -> không dùng được
    p0.hp = 4;
    expect(canPlayCard(state, 0, 'Đào').valid).toBe(false);

    // Né: không thể tự ý chơi trong action phase
    expect(canPlayCard(state, 0, 'Né').valid).toBe(false);

    // Chém: P0 đã dùng 1 lần trong lượt -> bị chặn
    p0.slashCount = 1;
    expect(canPlayCard(state, 0, 'Chém').valid).toBe(false);

    // Chém: Được miễn trừ khi có Liên Nỏ
    p0.equipment.weapon = { id: 'w_crossbow', name: 'Liên Nỏ', idKey: 'lien_no' };
    expect(canPlayCard(state, 0, 'Chém').valid).toBe(true);
  });

  it('canAttack kiểm tra tầm đánh tích hợp với RangeSystem', () => {
    const state = createMockState();
    expect(canAttack(state, 0, 1)).toBe(true);
    expect(canAttack(state, 0, 0)).toBe(false); // Không thể tự đánh mình
  });

  it('tương thích kỹ năng đổi chất Quốc Sắc (Ngọc Hân Công Chúa)', () => {
    const state = createMockState();
    const p0 = state.getPlayer(0);
    p0.revealedHeroes = [true, false];
    p0.heroes = [{ id: 'ngoc_han_cong_chua', name: 'Ngọc Hân Công Chúa', faction: 'Hà', skills: [{ id: 'quoc_sac' }] }, {}];

    const spadeCard = { id: 'c_spade', suit: 'spade', color: 'black' };

    // Khi có Quốc Sắc đã lật: Spade biến thành Heart (Đỏ)
    const effSuit = globalHeroRegistry.getEffectiveSuit(p0, spadeCard);
    const effColor = globalHeroRegistry.getEffectiveColor(p0, spadeCard);

    expect(effSuit).toBe('heart');
    expect(effColor).toBe('red');
  });
});
