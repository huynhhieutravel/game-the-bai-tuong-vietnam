import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { PHASES } from '../../../constants/phases.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Thánh Gióng (Thanh Giong QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: i % 4 === 0 ? 'heart' : (i % 4 === 1 ? 'diamond' : (i % 4 === 2 ? 'club' : 'spade')),
      rank: ((i % 13) + 1),
      color: (i % 4 < 2) ? 'red' : 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Thánh Gióng',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'thanh_giong',
        heroes: [{ id: 'thanh_giong', skills: ['thiet_ma', 'tre_nga'] }],
        skills: ['thiet_ma', 'tre_nga'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Defender)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'ha',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: ['xa_than'] }],
        skills: ['xa_than'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Người chơi 2 (Opponent)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        mainHeroId: 'ly_thuong_kiet',
        heroes: [{ id: 'ly_thuong_kiet', skills: ['tien_phat'] }],
        skills: ['tien_phat'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
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
        mainHeroId: 'rua_vang',
        heroes: [{ id: 'rua_vang', skills: ['than_giap'] }],
        skills: ['than_giap'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
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
  // PHẦN 1: THIẾT MÃ (CỰ LY -1 TOẢ ĐỊNH KỸ)
  // ==========================================
  describe('1. Kỹ Năng Thiết Mã (Khoảng Cách Tấn Công Luôn -1)', () => {
    it('khoảng cách từ Thánh Gióng đến người chơi khác luôn được giảm 1', () => {
      const state = createMockGameState();
      // Bàn 4 người: khoảng cách gốc 0 -> 2 là 2.
      // Với Thiết Mã, cự ly giảm 1: 2 - 1 = 1
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(1);

      // Ngược lại, người chơi 2 nhìn Thánh Gióng vẫn ở khoảng cách gốc 2
      expect(RangeSystem.getDistance(state, 2, 0)).toBe(2);
    });

    it('Thiết Mã cộng dồn với Ngựa Chiến (-1) thành tổng mức giảm -2', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      // Thêm người chơi 4 để tạo bàn 5 người (cự ly gốc 0 -> 2 là 2)
      const p4 = {
        id: 4, name: 'P4', hp: 4, maxHp: 4, isAlive: true, faction: 'son',
        revealedHeroes: [true, true], hand: [], equipment: {}
      };
      state.players.push(p4);

      // Người 2 mang Ngựa Thần (+1) => Cự ly gốc 2 + 1 = 3
      state.getPlayer(2).equipment.horse_defense = { id: 'h_def_2', name: 'Ngựa Thần (+1)' };
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(2); // 2 + 1 - 1 = 2

      // Thánh Gióng trang bị thêm Ngựa Chiến (-1) => 2 + 1 - 2 = 1
      p0.equipment.horse_attack = { id: 'giong_mount', name: 'Ngựa Chiến (-1)' };
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(1);
    });

    it('sàn cự ly bất biến: cự ly giữa Thánh Gióng và người chơi kế bên luôn tối thiểu là 1', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.equipment.horse_attack = { id: 'giong_mount_2', name: 'Ngựa Chiến (-1)' };

      // Cự ly gốc 0 -> 1 là 1. Mặc dù có Thiết Mã (-1) và Ngựa (-1), cự ly không thể <= 0
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(1);
    });
  });

  // ==========================================
  // PHẦN 2: TRE NGÀ (KHÓA KỸ NĂNG MỤC TIÊU ĐẾN HẾT LƯỢT)
  // ==========================================
  describe('2. Kỹ Năng Tre Ngà: Khóa Kỹ Năng Nạn Nhân (Skill Suppression)', () => {
    it('sau khi Chém, nạn nhân bị khóa các kỹ năng thông thường (Xả Thân, Tiên Phát)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1); // Công Chúa An Tư (Xả Thân)

      // Đặt lá phán xét ở đỉnh drawPile là Cơ (Heart)
      state.drawPile.push({ id: 'judge_heart', suit: 'heart', color: 'red' });

      const slashCard = { id: 's_giong', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red' };
      p0.hand = [slashCard];

      // Trước khi Chém: An Tư có Xả Thân
      expect(globalHeroRegistry.hasSkill(p1, 'xa_than', true)).toBe(true);

      // Thánh Gióng Chém An Tư -> Tre Ngà kích hoạt
      CombatRules.playSlash(state, 0, 1, slashCard);

      // Nạn nhân p1 bị gán cờ skillsSuppressed
      expect(p1.temporaryFlags.skillsSuppressed).toBe(true);

      // Trong lúc bị khóa: Xả Thân không còn hiệu lực
      expect(globalHeroRegistry.hasSkill(p1, 'xa_than', true)).toBe(false);
    });

    it('kỹ năng Tỏa Định Kỹ (như Thần Giáp của Rùa Vàng) KHÔNG bị khóa bởi Tre Ngà', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p3 = state.getPlayer(3); // Rùa Vàng (Thần Giáp - Lock Skill)

      state.drawPile.push({ id: 'judge_spade', suit: 'spade', color: 'black' });
      const slashCard = { id: 's_giong_2', name: 'Chém', type: 'slash', suit: 'club', color: 'black' };
      p0.hand = [slashCard];

      // Gióng trang bị vũ khí tầm 3 để chém tới người 3
      p0.equipment.weapon = { id: 'w_spear', name: 'Thanh Long Đao', range: 3 };

      CombatRules.playSlash(state, 0, 3, slashCard);

      expect(p3.temporaryFlags.skillsSuppressed).toBe(true);
      // Thần Giáp là Tỏa Định Kỹ (Lock skill) nên vẫn có hiệu lực!
      expect(globalHeroRegistry.hasSkill(p3, 'than_giap', true)).toBe(true);
    });

    it('khi chuyển sang lượt tiếp theo, cờ skillsSuppressed tự động được giải phóng', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);

      p1.temporaryFlags = { skillsSuppressed: true, treNgaRequiredSuit: 'heart' };
      expect(globalHeroRegistry.hasSkill(p1, 'xa_than', true)).toBe(false);

      // StateMachine chuyển sang lượt mới
      const dispatcher = new DispatcherV4(state);
      dispatcher.stateMachine.nextTurn();

      // skillsSuppressed đã được dọn sạch
      expect(p1.temporaryFlags.skillsSuppressed).toBeFalsy();
      expect(globalHeroRegistry.hasSkill(p1, 'xa_than', true)).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 3: TRE NGÀ (PHÁN XÉT & BỎ BÀI CÙNG CHẤT)
  // ==========================================
  describe('3. Kỹ Năng Tre Ngà: Phán Xét & Bỏ Bài Cùng Chất Bắt Buộc', () => {
    it('bỏ đúng lá bài cùng chất phán xét: bảo toàn quyền Né và né thành công', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Phán xét ra Cơ (Heart)
      state.drawPile.push({ id: 'judge_h', suit: 'heart', color: 'red' });

      const slashCard = { id: 's_giong_3', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red' };
      p0.hand = [slashCard];

      // p1 có 1 lá Cơ (để bỏ) và 1 lá Né (để né)
      const heartCard = { id: 'card_heart', name: 'Chém', suit: 'heart', color: 'red' };
      const dodgeCard = { id: 'card_dodge', name: 'Né', suit: 'diamond', color: 'red' };
      p1.hand = [heartCard, dodgeCard];

      CombatRules.playSlash(state, 0, 1, slashCard);

      // Stack: ASK_DODGE ở dưới, ASK_TRE_NGA_DISCARD ở trên
      expect(state.priorityStack.peek().type).toBe('ASK_TRE_NGA_DISCARD');
      expect(state.priorityStack.peek().context.judgeSuit).toBe('heart');

      // Bước 1: p1 bỏ lá Cơ trùng khớp
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        data: { doDiscard: true, cardId: 'card_heart' }
      });

      // Lá bài Cơ bị vứt bỏ, ASK_DODGE lộ ra
      expect(p1.hand.some(c => c.id === 'card_heart')).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // Bước 2: p1 đánh lá Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        data: { dodgeCardId: 'card_dodge' }
      });

      expect(p1.hp).toBe(4); // Không mất máu
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('bỏ sai chất bài phán xét: lập tức thất bại và bị chém mất máu trực tiếp', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Phán xét ra Cơ (Heart)
      state.drawPile.push({ id: 'judge_h2', suit: 'heart', color: 'red' });

      const slashCard = { id: 's_giong_4', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      p0.hand = [slashCard];

      // p1 chỉ có bài Bích (Spade) và lá Né
      const spadeCard = { id: 'card_spade', name: 'Chém', suit: 'spade', color: 'black' };
      const dodgeCard = { id: 'card_dodge2', name: 'Né', suit: 'diamond', color: 'red' };
      p1.hand = [spadeCard, dodgeCard];

      CombatRules.playSlash(state, 0, 1, slashCard);

      // p1 cố tình bỏ lá Bích (sai chất)
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        data: { doDiscard: true, cardId: 'card_spade' }
      });

      // Do sai chất: Tre Ngà tước quyền Né, p1 mất máu ngay lập tức
      expect(p1.hp).toBe(3); // 4 - 1 = 3
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('không bỏ bài (doDiscard: false): bị tước quyền Né và mất máu trực tiếp', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      state.drawPile.push({ id: 'judge_d', suit: 'diamond', color: 'red' });

      const slashCard = { id: 's_giong_5', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      p0.hand = [slashCard];
      p1.hand = [{ id: 'd_card', name: 'Né', suit: 'diamond', color: 'red' }];

      CombatRules.playSlash(state, 0, 1, slashCard);

      // p1 bấm Bỏ qua / Không bỏ bài
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        data: { doDiscard: false }
      });

      expect(p1.hp).toBe(3);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 4: GIAO DIỆN CLIENT & MODAL INTEGRATION
  // ==========================================
  describe('4. Giao Diện Client & Modal Integration (cardIndexSelected Contract)', () => {
    it('ModalContainer gửi cardIndexSelected được xử lý chính xác bởi DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Phán xét ra Nhép (Club)
      state.drawPile.push({ id: 'judge_club', suit: 'club', color: 'black' });

      const slashCard = { id: 's_giong_6', name: 'Chém', type: 'slash', suit: 'club', color: 'black' };
      p0.hand = [slashCard];

      // p1 có bài: [0] = Spade, [1] = Club (khớp)
      p1.hand = [
        { id: 'c_spade', name: 'Chém', suit: 'spade', color: 'black' },
        { id: 'c_club', name: 'Đào', suit: 'club', color: 'black' }
      ];

      CombatRules.playSlash(state, 0, 1, slashCard);

      // Client Modal gửi: { doDiscard: true, cardIndexSelected: 1 }
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        data: { doDiscard: true, cardIndexSelected: 1 }
      });

      // Lá c_club ở index 1 bị vứt bỏ thành công
      expect(p1.hand.length).toBe(1);
      expect(p1.hand[0].id).toBe('c_spade');
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });
  });

  // ==========================================
  // PHẦN 5: TRÍ TUỆ NHÂN TẠO BOT (BOT BRAIN V4)
  // ==========================================
  describe('5. Trí Tuệ Nhân Tạo Bot (Bot Brain v4 Reaction)', () => {
    it('Bot tự động chọn bỏ bài cùng chất khi đối mặt với ASK_TRE_NGA_DISCARD', () => {
      const state = createMockGameState();
      const bot = state.getPlayer(1);

      bot.hand = [
        { id: 'bot_card_1', name: 'Chém', suit: 'spade', color: 'black' },
        { id: 'bot_card_2', name: 'Né', suit: 'heart', color: 'red' }
      ];

      const frame = {
        type: 'ASK_TRE_NGA_DISCARD',
        context: { judgeSuit: 'heart' }
      };

      const reaction = BotBrain.decideReaction(state, 1, frame);
      expect(reaction.doDiscard).toBe(true);
      expect(reaction.cardId).toBe('bot_card_2');
    });

    it('Bot từ chối bỏ bài (doDiscard: false) khi không có bài cùng chất', () => {
      const state = createMockGameState();
      const bot = state.getPlayer(1);

      bot.hand = [
        { id: 'bot_card_1', name: 'Chém', suit: 'spade', color: 'black' }
      ];

      const frame = {
        type: 'ASK_TRE_NGA_DISCARD',
        context: { judgeSuit: 'diamond' }
      };

      const reaction = BotBrain.decideReaction(state, 1, frame);
      expect(reaction.doDiscard).toBe(false);
    });
  });
});
