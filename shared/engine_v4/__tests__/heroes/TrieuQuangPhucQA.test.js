import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Việt: Triệu Quang Phục (Trieu Quang Phuc QA Suite v4)', () => {
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
        name: 'Triệu Quang Phục',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        mainHeroId: 'trieu_quang_phuc',
        heroes: [{ id: 'trieu_quang_phuc', skills: ['da_trach'] }],
        skills: ['da_trach'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Đối thủ 1 (Có 2 bài)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'son_tinh',
        heroes: [{ id: 'son_tinh', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [
          { id: 'card_target1_a', name: 'Đào', type: 'peach' },
          { id: 'card_target1_b', name: 'Chém', type: 'slash' }
        ],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Đối thủ 2 (Có 1 bài)',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        faction: 'ha',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [
          { id: 'card_target2_a', name: 'Né', type: 'dodge' }
        ],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Đối thủ 3 (Hết bài)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'son',
        mainHeroId: 'thuy_tinh',
        heroes: [{ id: 'thuy_tinh', skills: [] }],
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

  describe('1. Kỹ năng Dạ Trạch (Rút bài thay thế bằng cướp bài đối thủ)', () => {
    it('1.1. Tự động kích hoạt ở DRAW_PHASE và tạo Priority Frame ASK_DA_TRACH khi có đối thủ có bài', () => {
      const state = createMockGameState();
      const stateMachine = new StateMachine(state);

      // Bắt đầu lượt của Triệu Quang Phục (id: 0)
      stateMachine.startTurn(0);

      // Nhịp chạy qua BEGIN -> JUDGE -> DRAW và dừng lại ở ASK_DA_TRACH
      expect(state.priorityStack.isEmpty()).toBe(false);
      const topFrame = state.priorityStack.peek();
      expect(topFrame.type).toBe('ASK_DA_TRACH');
      expect(topFrame.currentActorId).toBe(0);
      expect(state.currentPhase).toBe(PHASES.DRAW);
    });

    it('1.2. Chọn cướp bài của 2 đối thủ: Chuyển bài thành công và bỏ qua rút bài từ bộ bài', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      sm.startTurn(0);
      expect(state.priorityStack.peek().type).toBe('ASK_DA_TRACH');

      // Chọn cướp bài của Đối thủ 1 (id: 1) và Đối thủ 2 (id: 2)
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        doUse: true,
        targets: [1, 2]
      });

      // Frame ASK_DA_TRACH đã kết thúc
      expect(state.priorityStack.isEmpty()).toBe(true);

      // Đối thủ 1 bị cướp 1 lá (còn 1 lá)
      expect(state.getPlayer(1).hand.length).toBe(1);

      // Đối thủ 2 bị cướp 1 lá (còn 0 lá)
      expect(state.getPlayer(2).hand.length).toBe(0);

      // Triệu Quang Phục nhận đủ 2 lá cướp được
      const p0 = state.getPlayer(0);
      expect(p0.hand.length).toBe(2);
      expect(p0.hand.some(c => c.id === 'card_target1_b')).toBe(true);
      expect(p0.hand.some(c => c.id === 'card_target2_a')).toBe(true);

      // Kiểm tra pha game: đã hoàn tất pha Rút bài và chuyển sang Pha Ra bài (ACTION)
      expect(state.currentPhase).toBe(PHASES.ACTION);
    });

    it('1.3. Từ chối sử dụng Dạ Trạch (skip/cancel): Rút 2 lá bài bình thường từ chồng bài rút', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      sm.startTurn(0);
      expect(state.priorityStack.peek().type).toBe('ASK_DA_TRACH');

      // Bỏ qua Dạ Trạch, muốn rút bài thường
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        doUse: false,
        responseType: 'skip'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);

      // Bài của đối thủ không bị suy chuyển
      expect(state.getPlayer(1).hand.length).toBe(2);
      expect(state.getPlayer(2).hand.length).toBe(1);

      // Triệu Quang Phục rút 2 lá bài từ drawPile
      const p0 = state.getPlayer(0);
      expect(p0.hand.length).toBe(2);
      expect(p0.hand[0].id).toContain('deck_card_');
      expect(p0.hand[1].id).toContain('deck_card_');

      // Đã chuyển sang Pha Ra bài
      expect(state.currentPhase).toBe(PHASES.ACTION);
    });

    it('1.4. Khi không có bất kỳ đối thủ nào có bài trên tay: Không tạo frame ASK_DA_TRACH và tự động rút bài bình thường', () => {
      const state = createMockGameState();
      // Làm rỗng bài của tất cả đối thủ
      state.getPlayer(1).hand = [];
      state.getPlayer(2).hand = [];
      state.getPlayer(3).hand = [];

      const sm = new StateMachine(state);
      sm.startTurn(0);

      // Không có ASK_DA_TRACH vì không có bài để cướp
      expect(state.priorityStack.isEmpty()).toBe(true);

      // Tự động rút 2 lá từ bộ bài và sang Pha ACTION
      expect(state.getPlayer(0).hand.length).toBe(2);
      expect(state.currentPhase).toBe(PHASES.ACTION);
    });

    it('1.5. BotBrain tự động đưa ra quyết định cướp bài tối đa 2 đối thủ không phải đồng minh', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      sm.startTurn(0);

      const frame = state.priorityStack.peek();
      expect(frame.type).toBe('ASK_DA_TRACH');

      const botDecision = BotBrain.decideReaction(state, 0, frame);
      expect(botDecision.type).toBe('ACTION_REACT');
      expect(botDecision.doUse).toBe(true);
      expect(botDecision.targets.length).toBe(2);
      expect(botDecision.targets).toContain(1);
      expect(botDecision.targets).toContain(2);
    });
  });
});
