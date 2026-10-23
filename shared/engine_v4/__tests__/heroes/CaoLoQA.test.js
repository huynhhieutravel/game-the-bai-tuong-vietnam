import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Cao Lỗ (Cao Lo QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: 5,
      color: 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Cao Lỗ',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'cao_lo_lac',
        heroes: [{ id: 'cao_lo_lac', skills: ['no_than_cao_lo'] }],
        skills: ['no_than_cao_lo'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Khoảng cách 1)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'ha',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Người chơi 2 (Khoảng cách 2)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        mainHeroId: 'ngo_quyen',
        heroes: [{ id: 'ngo_quyen', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Người chơi 3 (Khoảng cách 3)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'son',
        mainHeroId: 'trieu_thi_trinh',
        heroes: [{ id: 'trieu_thi_trinh', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    const state = new GameState({ players, drawPile });
    state.activePlayerId = 0;
    return state;
  };

  // ==========================================
  // PHẦN 1: TẦM ĐÁNH CỦA CHÉM BẰNG ĐIỂM SỐ (RANK)
  // ==========================================
  describe('1. Tầm Đánh Của [Chém] Bằng Điểm Số (Rank lá bài)', () => {
    it('lá Chém rank 1 (Át) chỉ có tầm đánh 1, không đánh tới người chơi ở cự ly 2', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const slashRank1 = { id: 's_rank_1', name: 'Chém', type: 'slash', suit: 'spade', rank: 1 };
      p0.hand = [slashRank1];

      const range = RangeSystem.getAttackRange(p0, slashRank1);
      expect(range).toBe(1);

      const targets = RangeSystem.getValidSlashTargets(p0, state.getAlivePlayers(), slashRank1);
      const targetIds = targets.map(t => t.id);
      expect(targetIds).toContain(1);
      expect(targetIds).not.toContain(2); // Cự ly 2 nằm ngoài tầm
    });

    it('lá Chém rank 5 có tầm đánh 5, vươn tới toàn bộ người chơi trên bàn 4 người', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const slashRank5 = { id: 's_rank_5', name: 'Chém', type: 'slash', suit: 'club', rank: 5 };
      p0.hand = [slashRank5];

      const range = RangeSystem.getAttackRange(p0, slashRank5);
      expect(range).toBe(5);

      const targets = RangeSystem.getValidSlashTargets(p0, state.getAlivePlayers(), slashRank5);
      expect(targets.length).toBe(3); // Cả 3 người chơi khác đều trong tầm
    });

    it('lá Chém rank 13 (K) có tầm đánh tối đa 13', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const slashRank13 = { id: 's_rank_13', name: 'Chém', type: 'slash', suit: 'heart', rank: 13 };

      const range = RangeSystem.getAttackRange(p0, slashRank13);
      expect(range).toBe(13);
    });
  });

  // ==========================================
  // PHẦN 2: BÀI TAY >= ĐỊCH THÌ CẤM NÉ
  // ==========================================
  describe('2. Nỏ Thần: Bài Trên Tay >= Địch Khóa [Né]', () => {
    it('khi bài trên tay Cao Lỗ nhiều hơn địch: đòn Chém không thể né, gây sát thương trực tiếp', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Cao Lỗ có 3 lá bài (1 lá Chém + 2 lá khác)
      const slashCard = { id: 's_cl_1', name: 'Chém', type: 'slash', suit: 'heart', rank: 5 };
      p0.hand = [
        slashCard,
        { id: 'h_1', name: 'Đào', type: 'peach' },
        { id: 'h_2', name: 'Né', type: 'dodge' }
      ];

      // Địch chỉ có 1 lá bài trên tay
      p1.hand = [{ id: 'p1_dodge', name: 'Né', type: 'dodge' }];

      // Đánh chém: Sau khi vứt Chém, Cao Lỗ còn 2 bài >= 1 bài của p1
      const res = CombatRules.playSlash(state, 0, 1, slashCard);
      expect(res.unavoidable).toBe(true);
      expect(state.priorityStack.isEmpty()).toBe(true); // Không đẩy ASK_DODGE
      expect(p1.hp).toBe(2); // p0 (4 HP) <= p1 (4 HP ban đầu) -> 2 sát thương!
    });

    it('khi bài trên tay Cao Lỗ bằng bài địch: vẫn kích hoạt cấm Né', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const slashCard = { id: 's_cl_2', name: 'Chém', type: 'slash', suit: 'diamond', rank: 7 };
      // Cao Lỗ có 2 lá (đánh 1 còn 1)
      p0.hand = [slashCard, { id: 'cl_extra', name: 'Rượu', type: 'wine' }];
      // p1 có 1 lá
      p1.hand = [{ id: 'p1_d', name: 'Né', type: 'dodge' }];

      const res = CombatRules.playSlash(state, 0, 1, slashCard);
      expect(res.unavoidable).toBe(true);
      expect(p1.hp).toBe(2);
    });

    it('khi bài trên tay Cao Lỗ ít hơn địch: không kích hoạt cấm Né, địch có cơ hội Né', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const slashCard = { id: 's_cl_3', name: 'Chém', type: 'slash', suit: 'club', rank: 8 };
      // Cao Lỗ chỉ có duy nhất 1 lá Chém này (đánh xong còn 0 bài)
      p0.hand = [slashCard];
      // p1 có 2 lá
      const dodgeOfP1 = { id: 'p1_dodge_card', name: 'Né', type: 'dodge' };
      p1.hand = [dodgeOfP1, { id: 'p1_card_2', name: 'Chém', type: 'slash' }];

      const res = CombatRules.playSlash(state, 0, 1, slashCard);
      expect(res.unavoidable).toBeFalsy();
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // p1 dùng lá Né thoát đòn thành công
      const dodgeRes = CombatRules.respondDodge(state, 1, dodgeOfP1);
      expect(dodgeRes.dodged).toBe(true);
      expect(p1.hp).toBe(4); // Không mất máu
    });
  });

  // ==========================================
  // PHẦN 3: HP <= ĐỊCH TĂNG +1 SÁT THƯƠNG
  // ==========================================
  describe('3. Nỏ Thần: HP <= Địch Tăng +1 Sát Thương', () => {
    it('khi Cao Lỗ có HP ít hơn địch: tăng sát thương từ 1 lên 2', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.hp = 3; // Máu ít hơn
      p1.hp = 4;

      const slashCard = { id: 's_cl_dmg', name: 'Chém', type: 'slash', suit: 'spade', rank: 9 };
      // Cao Lỗ bài ít hơn để không cấm Né
      p0.hand = [slashCard];
      p1.hand = [
        { id: 'c1', name: 'A' },
        { id: 'c2', name: 'B' }
      ];

      CombatRules.playSlash(state, 0, 1, slashCard);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().context.damageAmount).toBe(2);

      // p1 không né -> Nhận trọn 2 sát thương!
      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(2); // 4 - 2 = 2 HP
    });

    it('khi Cao Lỗ có HP bằng địch: vẫn thỏa mãn điều kiện <=, gây 2 sát thương', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.hp = 3;
      p1.hp = 3;

      const slashCard = { id: 's_cl_equal_hp', name: 'Chém', type: 'slash', suit: 'heart', rank: 6 };
      p0.hand = [slashCard];
      p1.hand = [{ id: 'c1' }, { id: 'c2' }];

      CombatRules.playSlash(state, 0, 1, slashCard);
      expect(state.priorityStack.peek().context.damageAmount).toBe(2);

      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(1); // 3 - 2 = 1 HP
    });

    it('khi Cao Lỗ có HP nhiều hơn địch: chỉ gây 1 sát thương cơ bản', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.hp = 4;
      p1.hp = 2; // Địch ít máu hơn

      const slashCard = { id: 's_cl_more_hp', name: 'Chém', type: 'slash', suit: 'club', rank: 10 };
      p0.hand = [slashCard];
      p1.hand = [{ id: 'c1' }, { id: 'c2' }];

      CombatRules.playSlash(state, 0, 1, slashCard);
      expect(state.priorityStack.peek().context.damageAmount).toBe(1);

      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(1); // 2 - 1 = 1 HP
    });

    it('kết hợp Nỏ Thần (+1 dmg) và Rượu (+1 dmg) gây tới 3 sát thương', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.hp = 3;
      p1.hp = 4;
      p0.temporaryFlags.wineActive = true;

      const slashCard = { id: 's_cl_wine', name: 'Chém', type: 'slash', suit: 'diamond', rank: 4 };
      p0.hand = [slashCard];
      p1.hand = [{ id: 'c1' }, { id: 'c2' }];

      CombatRules.playSlash(state, 0, 1, slashCard);
      expect(state.priorityStack.peek().context.damageAmount).toBe(3); // 1 gốc + 1 Rượu + 1 Nỏ Thần

      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(1); // 4 - 3 = 1 HP
    });
  });

  // ==========================================
  // PHẦN 4: TRÍ TUỆ NHÂN TẠO BOT (BOT BRAIN)
  // ==========================================
  describe('4. Trí Tuệ Nhân Tạo Bot (Bot Brain v4)', () => {
    it('Bot Cao Lỗ tự động tận dụng tầm đánh từ rank lá bài để chém kẻ địch ở cự ly xa', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      // p0 có 1 lá Chém rank 9 (tầm 9)
      const slashHighRank = { id: 'bot_slash_9', name: 'Chém', type: 'slash', rank: 9, suit: 'spade' };
      p0.hand = [slashHighRank];

      // Mục tiêu ở xa là p3 (cự ly 3)
      const action = BotBrain.decideAction(state, 0);
      expect(action).not.toBeNull();
      expect(action.type).toBe('PLAY_CARD');
      expect(action.cardId).toBe('bot_slash_9');
      // Bot có thể nhắm vào bất kỳ ai trong tầm 9
      expect([1, 2, 3]).toContain(action.targetId);
    });
  });
});
