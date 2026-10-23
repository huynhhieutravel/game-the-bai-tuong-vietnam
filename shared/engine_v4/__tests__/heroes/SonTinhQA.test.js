import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { canPlayCard } from '../../rules/TargetResolverV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { PHASES } from '../../../constants/phases.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Sơn Tinh (Son Tinh QA Suite v4)', () => {
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
        name: 'Sơn Tinh',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'son_tinh',
        heroes: [{ id: 'son_tinh', skills: ['doi_nui'] }],
        skills: ['doi_nui'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Enemy 1)',
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
        name: 'Người chơi 2 (Enemy 2)',
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
        name: 'Người chơi 3 (Enemy 3)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'son',
        mainHeroId: 'nguyen_xi',
        heroes: [{ id: 'nguyen_xi', skills: ['pha_quan'] }],
        skills: ['pha_quan'],
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
  // PHẦN 1: DỜI NÚI — PHÒNG THỦ CỰ LY (+1)
  // ==========================================
  describe('1. Cự Ly Phòng Thủ Dời Núi (+1 Khoảng Cách Khi Bị Nhắm Đến)', () => {
    it('khi đã lộ diện: khoảng cách từ người khác đến Sơn Tinh luôn được tăng 1', () => {
      const state = createMockGameState();
      // Kẻ địch 1 ở vị trí kề bên (cự ly gốc = 1) nhìn Sơn Tinh ở cự ly 1 + 1 = 2
      expect(RangeSystem.getDistance(state, 1, 0)).toBe(2);

      // Kẻ địch 2 ở đối diện (cự ly gốc = 2) nhìn Sơn Tinh ở cự ly 2 + 1 = 3
      expect(RangeSystem.getDistance(state, 2, 0)).toBe(3);

      // Ngược lại, Sơn Tinh nhìn người khác vẫn ở khoảng cách gốc bình thường
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(1);
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(2);
    });

    it('Dời Núi cộng dồn với Ngựa Thần (+1) thành tổng mức tăng +2', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      p0.equipment.horse_defense = { id: 'son_mount', name: 'Ngựa Thần (+1)' };

      // Kẻ địch 1 ở kề bên nhìn Sơn Tinh: 1 + 1 (Dời Núi) + 1 (Ngựa) = 3
      expect(RangeSystem.getDistance(state, 1, 0)).toBe(3);
    });

    it('khi Sơn Tinh chưa lộ diện: Dời Núi không kích hoạt hiệu ứng cự ly', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.revealedHeroes = [false, false]; // Ẩn tướng

      // Chưa lộ diện: cự ly gốc 1 -> 0 là 1
      expect(RangeSystem.getDistance(state, 1, 0)).toBe(1);
    });
  });

  // ==========================================
  // PHẦN 2: DỜI NÚI — ĐÁNH CHÉM NHƯ NÉ (DEFENSE)
  // ==========================================
  describe('2. Dời Núi: Sử Dụng [Chém] Như [Né]', () => {
    it('Sơn Tinh dùng lá [Chém] để né thành công đòn Chém của đối thủ qua CombatRules', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const slashFromP1 = { id: 's_p1', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      p1.hand = [slashFromP1];
      // Sơn Tinh có cự ly phòng thủ +1 (khoảng cách là 2), nên p1 cần trang bị vũ khí tầm 3
      p1.equipment.weapon = { id: 'w_bow_1', name: 'Cung Tên', range: 3 };

      // Sơn Tinh chỉ có 1 lá Chém trên tay (không có Né)
      const slashOnP0 = { id: 's_p0', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      p0.hand = [slashOnP0];

      CombatRules.playSlash(state, 1, 0, slashFromP1);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // Sơn Tinh đánh lá Chém như Né
      const res = CombatRules.respondDodge(state, 0, slashOnP0);
      expect(res.dodged).toBe(true);
      expect(p0.hp).toBe(4); // Không mất máu
      expect(p0.hand.length).toBe(0);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('Sơn Tinh dùng lá [Chém] né cẩm nang Loạn Tiễn thành công', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      const slashOnP0 = { id: 's_rain', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red' };
      p0.hand = [slashOnP0];

      const rainCard = { id: 'rain_son_tinh', idKey: 'loan_tien', name: 'Loạn Tiễn', type: 'trick' };

      TrickRules._executeTrickEffect(state, 1, [0], rainCard);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      const res = CombatRules.respondDodge(state, 0, slashOnP0);
      expect(res.dodged).toBe(true);
      expect(p0.hp).toBe(4);
    });

    it('DispatcherV4 tự động nhận diện lá Chém làm Né cho Sơn Tinh khi phản hồi ASK_DODGE', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const slashCard = { id: 's_p1_2', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      p1.hand = [slashCard];
      p1.equipment.weapon = { id: 'w_bow_2', name: 'Cung Tên', range: 3 };

      const slashForDodge = { id: 's_p0_dodge', name: 'Chém', type: 'slash', suit: 'club', color: 'black' };
      p0.hand = [slashForDodge];

      CombatRules.playSlash(state, 1, 0, slashCard);

      // Phản hồi qua Dispatcher: không truyền cardId nhưng bật doReact: true
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: { doReact: true }
      });

      expect(p0.hp).toBe(4);
      expect(p0.hand.length).toBe(0);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 3: DỜI NÚI — DÙNG NÉ NHƯ CHÉM (OFFENSE)
  // ==========================================
  describe('3. Dời Núi: Sử Dụng [Né] Như [Chém] Trong Pha Hành Động', () => {
    it('TargetResolverV4 xác nhận hợp lệ khi Sơn Tinh dùng lá [Né] để Chém', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      const dodgeCard = { id: 'd_attack', name: 'Né', type: 'dodge', suit: 'diamond', color: 'red' };
      p0.hand = [dodgeCard];

      const check = canPlayCard(state, 0, 'Né', 'd_attack');
      expect(check.valid).toBe(true);
    });

    it('Sơn Tinh dùng lá [Né] Chém đối thủ trong tầm qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const dodgeAsSlash = { id: 'd_as_slash', name: 'Né', type: 'dodge', suit: 'heart', color: 'red' };
      p0.hand = [dodgeAsSlash];

      dispatcher.dispatchAction({
        type: 'PLAY_CARD',
        playerId: 0,
        cardId: 'd_as_slash',
        targetId: 1
      });

      // Đối phương nhận ASK_DODGE
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(1);

      // Đối phương không né -> Bị trừ 1 HP
      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(3);
    });
  });

  // ==========================================
  // PHẦN 4: DỜI NÚI — TRONG QUYẾT ĐẤU & DÃ MAN
  // ==========================================
  describe('4. Dời Núi: Sử Dụng [Né] Như [Chém] Trong Quyết Đấu & Dã Man', () => {
    it('trong Quyết Đấu, Sơn Tinh có thể đánh lá [Né] để phản hồi Chém qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Sơn Tinh chỉ có 1 lá Né
      p0.hand = [{ id: 'd_duel', name: 'Né', type: 'dodge', suit: 'club', color: 'black' }];
      p1.hand = [];

      // p1 phát động Quyết Đấu lên Sơn Tinh
      const duelCard = { id: 'duel_st', idKey: 'quyet_dau', name: 'Quyết Đấu', type: 'trick' };
      p1.hand.push(duelCard);

      TrickRules._executeTrickEffect(state, 1, [0], duelCard);
      expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');

      // Sơn Tinh phản hồi Chém bằng lá Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: { cardId: 'd_duel' }
      });

      // Lượt chuyển sang p1 (p1 không có Chém nên thua cuộc)
      expect(state.priorityStack.peek().context.currentResponderId).toBe(1);
      TrickRules.respondDuel(state, 1, null);

      expect(p1.hp).toBe(3); // p1 thua và mất 1 HP
      expect(p0.hp).toBe(4); // Sơn Tinh bảo toàn máu
    });

    it('trong Dã Man, Sơn Tinh đánh lá [Né] chống đỡ đợt công kích thành công', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.hand = [{ id: 'd_barbarian', name: 'Né', type: 'dodge', suit: 'diamond', color: 'red' }];

      const barbarianCard = { id: 'barbarian_st', idKey: 'da_man', name: 'Dã Man', type: 'trick' };
      p1.hand = [barbarianCard];

      TrickRules._executeTrickEffect(state, 1, [0], barbarianCard);
      expect(state.priorityStack.peek().type).toBe('ASK_SLASH_RESPONSE');

      // Sơn Tinh đánh lá Né đỡ Dã Man qua Dispatcher
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: { cardId: 'd_barbarian' }
      });

      expect(p0.hp).toBe(4); // Không mất máu
    });
  });

  // ==========================================
  // PHẦN 5: TRÍ TUỆ NHÂN TẠO BOT (BOT BRAIN V4)
  // ==========================================
  describe('5. Trí Tuệ Nhân Tạo Bot (Bot Brain v4 Reaction & Action)', () => {
    it('Bot Sơn Tinh khi cần Né tự động dùng lá Chém nếu trên tay không có Né', () => {
      const state = createMockGameState();
      const bot = state.getPlayer(0);

      bot.hand = [
        { id: 'bot_slash', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' }
      ];

      const frame = {
        type: 'ASK_DODGE',
        context: { baguaAttempted: true }
      };

      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.dodgeCard?.id).toBe('bot_slash');
    });

    it('Bot Sơn Tinh trong Pha Hành Động tự động dùng lá Né để Chém kẻ địch nếu không có Chém', () => {
      const state = createMockGameState();
      const bot = state.getPlayer(0);

      bot.hand = [
        { id: 'bot_dodge_attack', name: 'Né', type: 'dodge', suit: 'heart', color: 'red' }
      ];

      const decision = BotBrain.decideAction(state, 0);
      expect(decision.type).toBe('PLAY_CARD');
      expect(decision.cardId).toBe('bot_dodge_attack');
    });
  });
});
