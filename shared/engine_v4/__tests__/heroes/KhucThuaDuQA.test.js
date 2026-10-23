import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Việt: Khúc Thừa Dụ (Khuc Thua Du QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `deck_card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: (i % 13) + 1,
      color: 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Khúc Thừa Dụ',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        mainHeroId: 'khuc_thua_du',
        heroes: [{ id: 'khuc_thua_du', skills: ['tu_chu', 'khoan_dan'] }],
        skills: ['tu_chu', 'khoan_dan'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Đồng Minh Việt',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        mainHeroId: 'trieu_quang_phuc',
        heroes: [{ id: 'trieu_quang_phuc', skills: [] }],
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
        name: 'Kẻ Địch Đối Đầu',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: [] }],
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
    return state;
  };

  describe('1. Kỹ năng Tự Chủ (Đấu điểm & Điều khiển Chém)', () => {
    it('1.1. Phát động Tự Chủ tạo frame ASK_TU_CHU', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'tu_chu'
      });

      expect(state.priorityStack.isEmpty()).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_TU_CHU');
      expect(state.priorityStack.peek().currentActorId).toBe(0);
    });

    it('1.2. Đấu điểm thắng: Ép mục tiêu dùng [Chém] tấn công người chơi khác', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0); // Khúc Thừa Dụ
      const p2 = state.getPlayer(2); // Kẻ Địch

      const cardHigh = { id: 'c_k', name: 'Đao', type: 'basic', rank: 'K' }; // Rank 13
      const cardLow = { id: 'c_5', name: 'Né', type: 'basic', rank: 5 }; // Rank 5

      p0.hand = [cardHigh];
      p2.hand = [cardLow];

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'tu_chu'
      });

      // Khúc Thừa Dụ đấu điểm với p2
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        targetId: 2,
        cardId: 'c_k'
      });

      // Frame ASK_TU_CHU đã hoàn tất
      // Cả 2 lá bài đấu điểm bị bỏ vào discardPile
      expect(state.discardPile.some(c => c.id === 'c_k')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'c_5')).toBe(true);
      expect(p0.hand.length).toBe(0);
      expect(p2.hand.length).toBe(0);

      // Do thắng, p2 bị ép Chém người chơi khác (p1), tạo frame ASK_DODGE nhắm vào p1
      expect(state.priorityStack.isEmpty()).toBe(false);
      const slashFrame = state.priorityStack.peek();
      expect(slashFrame.type).toBe('ASK_DODGE');
      expect(slashFrame.targetId).toBe(1); // p1 là mục tiêu bị p2 Chém
      expect(slashFrame.sourceId).toBe(2); // p2 là người Chém
    });

    it('1.3. Đấu điểm thua/hòa: Kẻ địch lập tức Chém thẳng vào Khúc Thừa Dụ', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      const cardLow = { id: 'c_3', name: 'Chém', type: 'slash', rank: 3 };
      const cardHigh = { id: 'c_10', name: 'Né', type: 'dodge', rank: 10 };

      p0.hand = [cardLow];
      p2.hand = [cardHigh];

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'tu_chu'
      });

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        targetId: 2,
        cardId: 'c_3'
      });

      // Do Khúc Thừa Dụ thua điểm, p2 Chém thẳng vào p0 (Khúc Thừa Dụ)
      expect(state.priorityStack.isEmpty()).toBe(false);
      const slashFrame = state.priorityStack.peek();
      expect(slashFrame.type).toBe('ASK_DODGE');
      expect(slashFrame.targetId).toBe(0); // Khúc Thừa Dụ bị Chém
      expect(slashFrame.sourceId).toBe(2);
    });
  });

  describe('2. Kỹ năng Khoan Dân (Sau khi nhận sát thương, chọn người rút bằng max HP)', () => {
    it('2.1. Tự động kích hoạt khi nhận sát thương và tạo frame ASK_KHOAN_DAN', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      // Gây 1 sát thương lên Khúc Thừa Dụ
      CombatRules.applyDamage(state, 2, 0, 1, 'slash');

      expect(p0.hp).toBe(2);
      expect(state.priorityStack.isEmpty()).toBe(false);
      const frame = state.priorityStack.peek();
      expect(frame.type).toBe('ASK_KHOAN_DAN');
      expect(frame.currentActorId).toBe(0);
    });

    it('2.2. Chọn chính mình: Rút bài cho bằng giới hạn HP (maxHp = 3)', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));
      const p0 = state.getPlayer(0);
      p0.hand = []; // Hiện tại có 0 bài tay, maxHp = 3

      CombatRules.applyDamage(state, 2, 0, 1, 'slash');

      // Chọn chính mình (targetId: 0) nhận hiệu ứng Khoan Dân
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        doUse: true,
        targetId: 0
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      // Rút đủ 3 lá bài (bằng maxHp)
      expect(p0.hand.length).toBe(3);
    });

    it('2.3. Chọn đồng minh có 1 lá bài: Rút bù số lượng bài cho đủ maxHp (4 lá)', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));
      const p1 = state.getPlayer(1); // maxHp = 4
      p1.hand = [{ id: 'hand_1', name: 'Đào', type: 'peach' }]; // Có sẵn 1 bài

      CombatRules.applyDamage(state, 2, 0, 1, 'slash');

      // Chọn đồng minh p1
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        doUse: true,
        targetId: 1
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      // Đồng minh ban đầu có 1 lá, được rút thêm 3 lá để tròn 4 lá (bằng maxHp)
      expect(p1.hand.length).toBe(4);
    });
  });
});
