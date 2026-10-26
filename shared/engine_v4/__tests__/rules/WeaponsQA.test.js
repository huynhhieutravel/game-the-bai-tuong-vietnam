import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { RangeSystem, WEAPON_RANGE_MAP } from '../../rules/RangeSystem.js';
import { canPlayCard, getTargetingDefinition } from '../../rules/TargetResolverV4.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CardDeck } from '../../cards/CardDeck.js';
import { CARDS, EQUIP_CARDS_INFO, CARD_TYPES, CARD_SUBTYPES } from '../../../data/gameData.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { GameInvariants } from '../../core/Invariants.js';
import { GameViewMapperV4 } from '../../application/GameViewMapperV4.js';

describe('QA Toàn Diện Thẻ Bài Trang Bị: Vũ Khí (Weapons QA Suite v4)', () => {
  const createMockGameState = (customPlayers = null) => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_draw_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: i % 4 === 0 ? 'heart' : (i % 4 === 1 ? 'diamond' : (i % 4 === 2 ? 'club' : 'spade')),
      rank: ((i % 13) + 1),
      color: (i % 4 < 2) ? 'red' : 'black'
    }));

    const players = customPlayers || [
      {
        id: 0,
        name: 'Người chơi 0 (Attacker - Nam)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Target - Nữ)',
        hp: 3,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'viet',
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Người chơi 2 (Target - Nam)',
        hp: 3,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'ha',
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Người chơi 3 (Third Party)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'son',
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    return new GameState({
      players,
      drawPile,
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
  };

  // ==========================================
  // PHẦN 1: BẢNG TRA CỨU TẦM ĐÁNH VŨ KHÍ
  // ==========================================
  describe('1. Bảng Tra Cứu Tầm Đánh Chuẩn Hóa (WEAPON_RANGE_MAP)', () => {
    it('toàn bộ 7 loại vũ khí được ánh xạ tầm đánh chính xác', () => {
      expect(WEAPON_RANGE_MAP['Liên Nỏ']).toBe(1);
      expect(WEAPON_RANGE_MAP['Song Kiếm']).toBe(2);
      expect(WEAPON_RANGE_MAP['Quạt Sắt']).toBe(2);
      expect(WEAPON_RANGE_MAP['Cổ Đĩnh Đao']).toBe(2);
      expect(WEAPON_RANGE_MAP['Thanh Long Đao']).toBe(3);
      expect(WEAPON_RANGE_MAP['Rìu Đá']).toBe(3);
      expect(WEAPON_RANGE_MAP['Quán Thạch Phủ']).toBe(3);
      expect(WEAPON_RANGE_MAP['Phương Thiên Kích']).toBe(4);
      expect(WEAPON_RANGE_MAP['Kỳ Lân Cung']).toBe(5);
    });

    it('fallback tự động tra cứu tầm đánh khi lá bài vũ khí không có sẵn thuộc tính .range', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      // 1. Không có vũ khí -> Tầm đánh mặc định = 1
      expect(RangeSystem.getAttackRange(p0)).toBe(1);

      // 2. Trang bị Thanh Long Đao không có .range
      p0.equipment.weapon = { id: 'thanh-long-dao-0-999', name: 'Thanh Long Đao' };
      expect(RangeSystem.getAttackRange(p0)).toBe(3);

      // 3. Trang bị Phương Thiên Kích bằng idKey
      p0.equipment.weapon = { id: 'wp_halberd', idKey: 'phuong_thien_kich' };
      expect(RangeSystem.getAttackRange(p0)).toBe(4);

      // 4. Trang bị Kỳ Lân Cung
      p0.equipment.weapon = { id: 'wp_bow_1', name: 'Kỳ Lân Cung' };
      expect(RangeSystem.getAttackRange(p0)).toBe(5);

      // 5. Trang bị Song Kiếm
      p0.equipment.weapon = { id: 'wp_sword_1', name: 'Song Kiếm' };
      expect(RangeSystem.getAttackRange(p0)).toBe(2);

      // 6. Trang bị Quạt Sắt
      p0.equipment.weapon = { id: 'wp_fan_1', name: 'Quạt Sắt' };
      expect(RangeSystem.getAttackRange(p0)).toBe(2);
    });

    it('kỹ năng Nỏ Thần của Cao Lỗ tính tầm đánh theo điểm số (rank) lá Chém', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.skills = ['no_than_cao_lo'];

      const slashCardRank9 = { id: 'slash_9', name: 'Chém', type: 'slash', rank: 9 };
      expect(RangeSystem.getAttackRange(p0, slashCardRank9)).toBe(9);

      const slashCardRankQ = { id: 'slash_q', name: 'Chém', type: 'slash', rank: '12' };
      expect(RangeSystem.getAttackRange(p0, slashCardRankQ)).toBe(12);
    });
  });

  // ==========================================
  // PHẦN 2: LIÊN NỎ (REPEATING CROSSBOW)
  // ==========================================
  describe('2. Liên Nỏ (Repeating Crossbow: Tầm 1, Vô Hạn Chém/Lượt)', () => {
    it('khi không có Liên Nỏ: đòn Chém thứ 2 bị chặn bởi GameInvariants.assertSlashLimit', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const slash1 = { id: 's1', name: 'Chém', type: 'slash' };
      const slash2 = { id: 's2', name: 'Chém', type: 'slash' };
      p0.hand.push(slash1, slash2);

      // Đòn Chém 1
      CombatRules.playSlash(state, 0, 1, slash1);
      expect(p0.turnStats.slashCount).toBe(1);

      // Đòn Chém 2 -> Tung ngoại lệ Invariant
      expect(() => {
        CombatRules.playSlash(state, 0, 1, slash2);
      }).toThrow(/không có Liên Nỏ/);
    });

    it('khi trang bị Liên Nỏ: có thể đánh liên tiếp nhiều lá Chém trong cùng một lượt', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'crossbow', name: 'Liên Nỏ', range: 1 };

      const slash1 = { id: 's1', name: 'Chém', type: 'slash' };
      const slash2 = { id: 's2', name: 'Chém', type: 'slash' };
      const slash3 = { id: 's3', name: 'Chém', type: 'slash' };
      p0.hand.push(slash1, slash2, slash3);

      // Đòn Chém 1
      CombatRules.playSlash(state, 0, 1, slash1);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      CombatRules.respondDodge(state, 1, null); // Nhận sát thương

      // Đòn Chém 2
      CombatRules.playSlash(state, 0, 1, slash2);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      CombatRules.respondDodge(state, 1, null);

      // Đòn Chém 3
      CombatRules.playSlash(state, 0, 1, slash3);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      CombatRules.respondDodge(state, 1, null);

      expect(p0.turnStats.slashCount).toBe(3);
      expect(state.getPlayer(1).hp).toBe(0); // 3 - 3 = 0 (hấp hối)
    });

    it('khi trang bị lá Liên Nỏ từ CardDeck (id dạng liên-nỏ-...): toViewModel và TargetResolver đều cho phép Chém tiếp khi slashCount >= 1', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const realLienNo = CardDeck.getStandardDeck().find(c => c.name === 'Liên Nỏ');
      expect(realLienNo).toBeDefined();
      expect(realLienNo.id).toMatch(/^liên-nỏ/);

      p0.equipment.weapon = realLienNo;
      p0.turnStats.slashCount = 1;

      const slashCard = { id: 's2', name: 'Chém', type: 'slash' };
      p0.hand.push(slashCard);
      state.currentPhase = PHASES.ACTION;
      state.activePlayerId = 0;

      // 1. Invariants không ném lỗi
      expect(() => GameInvariants.assertSlashLimit(p0)).not.toThrow();

      // 2. TargetResolver báo hợp lệ
      const canPlay = canPlayCard(state, 0, slashCard.name, slashCard.id);
      expect(canPlay.valid).toBe(true);

      // 3. toViewModel hiển thị isPlayable: true (không bị làm mờ thẻ bài trên tay)
      const vm = GameViewMapperV4.toViewModel(state, 0);
      const vmSlash = vm.players[0].hand.find(c => c.id === 's2');
      expect(vmSlash.isPlayable).toBe(true);
      expect(vmSlash.unplayableReason || '').toBe('');
    });
  });

  // ==========================================
  // PHẦN 3: THANH LONG ĐAO (DRAGON BLADE)
  // ==========================================
  describe('3. Thanh Long Đao (Dragon Blade: Tầm 3, Chém Bị Né -> Chém Tiếp)', () => {
    it('khi Chém bị Né, lập tức đánh tiếp lá Chém thứ hai không bị chặn bởi giới hạn lượt', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'dragon_blade', name: 'Thanh Long Đao', range: 3 };
      const slash1 = { id: 's1', name: 'Chém', type: 'slash' };
      const slash2 = { id: 's2', name: 'Chém', type: 'slash' };
      p0.hand.push(slash1, slash2);

      const dodge1 = { id: 'd1', name: 'Né', type: 'dodge' };
      p1.hand.push(dodge1);

      // Đòn 1: p0 Chém p1
      CombatRules.playSlash(state, 0, 1, slash1);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // p1 dùng Né -> chọn lá Chém s2 kích hoạt đòn Chém 2 qua dragonBladeCardId
      const resDodge = CombatRules.respondDodge(state, 1, dodge1, { dragonBladeCardId: slash2.id });
      expect(resDodge.retriggeredSlash).toBe(true);

      // Frame mới được đẩy lên stack để yêu cầu p1 Né đòn Chém thứ 2
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().context.card.id).toBe('s2');

      // p1 không còn Né -> nhận sát thương
      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(2); // 3 - 1 = 2
    });

    it('từ chối đánh tiếp (useDragonBlade: false) thì kết thúc lượt tấn công an toàn', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'dragon_blade', name: 'Thanh Long Đao', range: 3 };
      const slash1 = { id: 's1', name: 'Chém', type: 'slash' };
      const slash2 = { id: 's2', name: 'Chém', type: 'slash' };
      p0.hand.push(slash1, slash2);

      const dodge1 = { id: 'd1', name: 'Né', type: 'dodge' };
      p1.hand.push(dodge1);

      CombatRules.playSlash(state, 0, 1, slash1);
      const resDodge = CombatRules.respondDodge(state, 1, dodge1, { useDragonBlade: false });

      expect(resDodge.dodged).toBe(true);
      expect(resDodge.retriggeredSlash).toBeUndefined();
      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(p0.hand.some(c => c.id === 's2')).toBe(true); // Lá Chém 2 vẫn còn trên tay
    });
  });

  // ==========================================
  // PHẦN 4: RÌU ĐÁ (ROCK AXE)
  // ==========================================
  describe('4. Rìu Đá (Rock Axe: Tầm 3, Bỏ 2 Bài Xuyên Giáp Bắt Buộc Trúng)', () => {
    it('khi Chém bị Né, bỏ 2 lá bài để cưỡng chế đòn Chém trúng đích xuyên qua cú Né', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'rock_axe', name: 'Rìu Đá', range: 3 };
      const slash1 = { id: 's_axe', name: 'Chém', type: 'slash' };
      const dump1 = { id: 'dump_1', name: 'Lá bỏ 1', type: 'basic' };
      const dump2 = { id: 'dump_2', name: 'Lá bỏ 2', type: 'basic' };
      p0.hand.push(slash1, dump1, dump2);

      const dodge1 = { id: 'd_axe', name: 'Né', type: 'dodge' };
      p1.hand.push(dodge1);

      CombatRules.playSlash(state, 0, 1, slash1);
      // p1 dùng Né -> chọn 2 lá bài dump1, dump2 để kích hoạt Rìu Đá
      const resDodge = CombatRules.respondDodge(state, 1, dodge1, { rockAxeCardIds: ['dump_1', 'dump_2'] });

      expect(resDodge.penetrated).toBe(true);
      expect(resDodge.dodged).toBe(false);
      expect(p0.hand.length).toBe(0); // Đã bỏ dump1 và dump2
      expect(p1.hp).toBe(2); // 3 - 1 = 2 (nhận sát thương dù đã đánh lá Né)
    });

    it('cho phép chọn chính xác 2 lá bài chỉ định qua rockAxeCardIds', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'rock_axe', name: 'Rìu Đá', range: 3 };
      const slash1 = { id: 's_axe_2', name: 'Chém', type: 'slash' };
      const cardKeep = { id: 'keep_peach', name: 'Đào', type: 'peach' };
      const dumpA = { id: 'dump_a', name: 'Rác A', type: 'basic' };
      const dumpB = { id: 'dump_b', name: 'Rác B', type: 'basic' };
      p0.hand.push(slash1, cardKeep, dumpA, dumpB);

      const dodge1 = { id: 'd_axe_2', name: 'Né', type: 'dodge' };
      p1.hand.push(dodge1);

      CombatRules.playSlash(state, 0, 1, slash1);
      const res = CombatRules.respondDodge(state, 1, dodge1, { rockAxeCardIds: ['dump_a', 'dump_b'] });

      expect(res.penetrated).toBe(true);
      expect(p0.hand.some(c => c.id === 'keep_peach')).toBe(true); // Giữ lại Đào thành công
      expect(p1.hp).toBe(2);
    });

    it('nếu người chơi chọn không dùng Rìu Đá (useRockAxe: false), mục tiêu né thành công', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'rock_axe', name: 'Rìu Đá', range: 3 };
      const slash1 = { id: 's_axe_3', name: 'Chém', type: 'slash' };
      p0.hand.push(slash1, { id: 'c1' }, { id: 'c2' });

      p1.hand.push({ id: 'd_axe_3', name: 'Né', type: 'dodge' });

      CombatRules.playSlash(state, 0, 1, slash1);
      const res = CombatRules.respondDodge(state, 1, p1.hand[0], { useRockAxe: false });

      expect(res.dodged).toBe(true);
      expect(p1.hp).toBe(3); // Không mất máu
      expect(p0.hand.length).toBe(2); // Không bị mất bài
    });
  });

  // ==========================================
  // PHẦN 5: SONG KIẾM (TWIN SWORDS)
  // ==========================================
  describe('5. Song Kiếm (Twin Swords: Tầm 2, Tương Tác Khác Giới Trước Khi Né)', () => {
    it('Nam Chém Nữ: Nữ có bài trên tay bị ép tự bỏ 1 lá bài trước khi né', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Nam
      const p1 = state.getPlayer(1); // Nữ

      p0.equipment.weapon = { id: 'twin_swords', name: 'Song Kiếm', range: 2 };
      const slashCard = { id: 's_twin', name: 'Chém', type: 'slash' };
      p0.hand.push(slashCard);

      const targetCard = { id: 'target_card', name: 'Đào', type: 'peach' };
      p1.hand.push(targetCard);

      CombatRules.playSlash(state, 0, 1, slashCard);

      expect(p1.hand.length).toBe(0); // Bị ép bỏ lá Đào
      expect(state.discardPile.some(c => c.id === 'target_card')).toBe(true);
      // Sau khi bỏ bài mới vào cửa sổ Né
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });

    it('Nam Chém Nữ: Nữ không có bài trên tay nhưng có trang bị -> bị ép tháo 1 trang bị', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Nam
      const p1 = state.getPlayer(1); // Nữ

      p0.equipment.weapon = { id: 'twin_swords', name: 'Song Kiếm', range: 2 };
      p0.hand.push({ id: 's_twin_2', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' });

      p1.hand = [];
      p1.equipment.armor = { id: 'armor_p1', name: 'Hắc Thuẫn' };

      CombatRules.playSlash(state, 0, 1, p0.hand[0]);

      expect(p1.equipment.armor).toBeNull();
      expect(state.discardPile.some(c => c.id === 'armor_p1')).toBe(true);
    });

    it('Nam Chém Nữ: Nữ hoàn toàn trống bài -> Người tấn công được rút 1 lá bài thưởng', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Nam
      const p1 = state.getPlayer(1); // Nữ

      p0.equipment.weapon = { id: 'twin_swords', name: 'Song Kiếm', range: 2 };
      p0.hand.push({ id: 's_twin_3', name: 'Chém', type: 'slash' });

      p1.hand = [];
      p1.equipment = { weapon: null, armor: null, horse_attack: null, horse_defense: null };

      CombatRules.playSlash(state, 0, 1, p0.hand[0]);

      expect(p0.hand.length).toBe(1); // Rút được 1 lá bài mới từ drawPile
    });

    it('Nam Chém Nam (cùng giới tính): Hiệu ứng Song Kiếm KHÔNG kích hoạt', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Nam
      const p2 = state.getPlayer(2); // Nam

      p0.equipment.weapon = { id: 'twin_swords', name: 'Song Kiếm', range: 2 };
      p0.hand.push({ id: 's_twin_4', name: 'Chém', type: 'slash' });

      const p2Card = { id: 'p2_card', name: 'Chém' };
      p2.hand.push(p2Card);

      CombatRules.playSlash(state, 0, 2, p0.hand[0]);

      expect(p2.hand.length).toBe(1); // Không bị ép bỏ bài
      expect(p0.hand.length).toBe(0); // Không rút bài
    });
  });

  // ==========================================
  // PHẦN 6: PHƯƠNG THIÊN KÍCH (SKY HALBERD)
  // ==========================================
  describe('6. Phương Thiên Kích (Sky Halberd: Tầm 4, Quét 3 Mục Tiêu Khi Là Bài Cuối)', () => {
    it('khi là lá bài DUY NHẤT trên tay, TargetResolver cho phép chọn tối đa 3 mục tiêu', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'halberd', name: 'Phương Thiên Kích', range: 4 };

      const slashLast = { id: 's_last', name: 'Chém', type: 'slash' };
      p0.hand = [slashLast]; // Duy nhất 1 lá bài

      const targetDef = getTargetingDefinition(state, 0, 'chem', slashLast);
      expect(targetDef.type).toBe('multiple');
      expect(targetDef.max).toBe(3);

      const validTargets = targetDef.filter(state, p0);
      expect(validTargets.length).toBeGreaterThanOrEqual(3);
    });

    it('khi còn từ 2 lá bài trên tay trở lên, chỉ cho phép chọn 1 mục tiêu đơn', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'halberd', name: 'Phương Thiên Kích', range: 4 };

      const slashNotLast = { id: 's_not_last', name: 'Chém', type: 'slash' };
      p0.hand = [slashNotLast, { id: 'other_card', name: 'Đào' }];

      const targetDef = getTargetingDefinition(state, 0, 'chem', slashNotLast);
      expect(targetDef.type).toBe('single');
    });
  });

  // ==========================================
  // PHẦN 7: QUẠT SẮT (IRON FAN / CỔ ĐĨNH ĐAO)
  // ==========================================
  describe('7. Quạt Sắt / Cổ Đĩnh Đao (Tầm 2, +1 Sát Thương Khi Mục Tiêu Hết Bài)', () => {
    it('mục tiêu không có bài trên tay: sát thương Chém tăng từ 1 lên 2 HP', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'iron_fan', name: 'Quạt Sắt', range: 2 };
      p1.hand = []; // Hết bài trên tay

      CombatRules.applyDamage(state, 0, 1, 1, 'slash');
      expect(p1.hp).toBe(1); // 3 - 2 = 1 HP (nhận 2 sát thương)
    });

    it('kết hợp với Rượu: sát thương dồn thành 3 HP', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'iron_fan', name: 'Quạt Sắt', range: 2 };
      p1.hand = [];

      // Đòn Chém có Rượu (amount = 2)
      CombatRules.applyDamage(state, 0, 1, 2, 'slash');
      expect(p1.hp).toBe(0); // 3 - 3 = 0 HP
    });

    it('mục tiêu còn ít nhất 1 lá bài trên tay: sát thương giữ nguyên 1 HP', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'iron_fan', name: 'Quạt Sắt', range: 2 };
      p1.hand = [{ id: 'card_hand', name: 'Chém' }];

      CombatRules.applyDamage(state, 0, 1, 1, 'slash');
      expect(p1.hp).toBe(2); // 3 - 1 = 2 HP
    });
  });

  // ==========================================
  // PHẦN 8: KỲ LÂN CUNG (KIRIN BOW)
  // ==========================================
  describe('8. Kỳ Lân Cung (Kirin Bow: Tầm 5, Bắn Hạ Ngựa Khi Gây Sát Thương)', () => {
    it('bắn hạ Ngựa phòng thủ (+1) của mục tiêu khi Chém gây sát thương', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'kirin_bow', name: 'Kỳ Lân Cung', range: 5 };
      p1.equipment.horse_defense = { id: 'horse_def_p1', name: 'Ngựa Thần (+1)' };
      p1.equipment.horse_attack = { id: 'horse_atk_p1', name: 'Ngựa Chiến (-1)' };

      CombatRules.applyDamage(state, 0, 1, 1, 'slash');

      expect(p1.equipment.horse_defense).toBeNull(); // Bị bắn hạ trước
      expect(p1.equipment.horse_attack).not.toBeNull(); // Ngựa tấn công vẫn còn
      expect(state.discardPile.some(c => c.id === 'horse_def_p1')).toBe(true);
    });

    it('nếu không có Ngựa phòng thủ, bắn hạ Ngựa tấn công (-1) của mục tiêu', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'kirin_bow', name: 'Kỳ Lân Cung', range: 5 };
      p1.equipment.horse_attack = { id: 'horse_atk_only', name: 'Ngựa Chiến (-1)' };

      CombatRules.applyDamage(state, 0, 1, 1, 'slash');

      expect(p1.equipment.horse_attack).toBeNull();
      expect(state.discardPile.some(c => c.id === 'horse_atk_only')).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 9: BẤT BIẾN THAY THẾ & MẤT VŨ KHÍ
  // ==========================================
  describe('9. Bất Biến Thay Thế & Mất Vũ Khí (Disarm & Single Slot Invariant)', () => {
    it('trang bị vũ khí mới qua DispatcherV4: vũ khí cũ bị đưa vào discardPile và kích hoạt ON_EQUIP_LOST', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);

      const oldWeapon = { id: 'old_weapon', name: 'Liên Nỏ', type: 'equip', subtype: 'equip_weapon' };
      p0.equipment.weapon = oldWeapon;

      const newWeapon = { id: 'new_weapon', name: 'Thanh Long Đao', type: 'equip', subtype: 'equip_weapon' };
      p0.hand.push(newWeapon);

      let equipLostTriggered = false;
      globalHeroRegistry.register({
        id: 'mock_listener',
        name: 'Mock',
        onEquipLost: () => { equipLostTriggered = true; }
      });

      dispatcher.dispatchAction({ type: 'PLAY_CARD', playerId: 0, cardId: 'new_weapon' });

      expect(p0.equipment.weapon.id).toBe('new_weapon');
      expect(state.discardPile.some(c => c.id === 'old_weapon')).toBe(true);
      expect(RangeSystem.getAttackRange(p0)).toBe(3); // Cập nhật tầm đánh sang 3
    });

    it('khi vũ khí bị tước bỏ: tầm đánh lập tức trở về 1', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'w_lost', name: 'Kỳ Lân Cung', range: 5 };
      expect(RangeSystem.getAttackRange(p0)).toBe(5);

      // Bị tước vũ khí
      p0.equipment.weapon = null;
      expect(RangeSystem.getAttackRange(p0)).toBe(1);
    });
  });
});
