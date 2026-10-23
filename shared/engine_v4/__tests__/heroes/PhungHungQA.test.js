import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';

describe('QA Toàn Diện Tướng Hệ Việt: Phùng Hưng (Phung Hung QA Suite v4)', () => {
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
        name: 'Phùng Hưng',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        mainHeroId: 'phung_hung',
        heroes: [{ id: 'phung_hung', skills: ['khoi_nghia'] }],
        skills: ['khoi_nghia'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Kẻ Địch 1 (Cự ly 1)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
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
      }
    ];

    const state = new GameState({ players, drawPile });
    return state;
  };

  describe('1. Kỹ năng Khởi Nghĩa (Rút ít hơn 1 lá, nhận +1 sát thương Chém & Quyết Đấu)', () => {
    it('1.1. Tự động kích hoạt ở DRAW_PHASE và tạo Priority Frame ASK_KHOI_NGHIA', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);

      sm.startTurn(0);

      expect(state.priorityStack.isEmpty()).toBe(false);
      const topFrame = state.priorityStack.peek();
      expect(topFrame.type).toBe('ASK_KHOI_NGHIA');
      expect(topFrame.currentActorId).toBe(0);
      expect(state.currentPhase).toBe(PHASES.DRAW);
    });

    it('1.2. Chọn phát động Khởi Nghĩa: Chỉ rút 1 lá bài và nhận cờ bonusDamage = 1', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      sm.startTurn(0);
      expect(state.priorityStack.peek().type).toBe('ASK_KHOI_NGHIA');

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        doUse: true
      });

      expect(state.priorityStack.isEmpty()).toBe(true);

      // Phùng Hưng chỉ rút đúng 1 lá bài (thay vì 2 lá mặc định)
      const p0 = state.getPlayer(0);
      expect(p0.hand.length).toBe(1);

      // Nhận cờ bonusDamage = 1
      expect(p0.temporaryFlags.bonusDamage).toBe(1);

      // Đã chuyển sang Pha Ra bài
      expect(state.currentPhase).toBe(PHASES.ACTION);
    });

    it('1.3. Cú Chém của Phùng Hưng gây 2 sát thương nhờ cờ bonusDamage = 1', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      sm.startTurn(0);
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        doUse: true
      });

      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const slashCard = { id: 'slash_ph', name: 'Chém', type: 'slash', suit: 'spade' };
      p0.hand = [slashCard];

      // Phùng Hưng Chém kẻ địch
      CombatRules.playSlash(state, 0, 1, slashCard);

      // Yêu cầu Né có damageAmount = 2
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().context.damageAmount).toBe(2);

      // Kẻ địch không Né được (chịu đòn)
      CombatRules.respondDodge(state, 1, null);

      // Kẻ địch bị trừ 2 HP (4 -> 2)
      expect(p1.hp).toBe(2);
    });

    it('1.4. Chiến thắng trong Quyết Đấu gây 2 sát thương nhờ bonusDamage = 1', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.temporaryFlags.bonusDamage = 1;

      // Phùng Hưng phát động Quyết Đấu với p1
      const duelCard = { id: 'duel_ph', name: 'Quyết Đấu', type: 'trick', trickType: 'quyet_dau' };
      p0.hand = [duelCard];
      p1.hand = []; // p1 không có Chém

      TrickRules.playTrick(state, 0, [1], duelCard);
      // Giải phóng frame Hóa Giải ASK_NEGATE nếu có
      while (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_NEGATE') {
        TrickRules.respondNegate(state, state.priorityStack.peek().currentActorId, null);
      }

      expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');

      // p1 không đánh ra Chém (thua cuộc)
      TrickRules.respondDuel(state, 1, null);

      // Kẻ địch p1 nhận 2 sát thương từ Quyết Đấu (1 gốc + 1 bonusDamage)
      expect(p1.hp).toBe(2);
    });

    it('1.5. Từ chối Khởi Nghĩa: Rút 2 lá bài bình thường và không có bonusDamage', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      sm.startTurn(0);
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        doUse: false
      });

      const p0 = state.getPlayer(0);
      expect(p0.hand.length).toBe(2);
      expect(p0.temporaryFlags.bonusDamage || 0).toBe(0);

      // Chém thông thường chỉ gây 1 sát thương
      const slashCard = { id: 'slash_normal', name: 'Chém', type: 'slash', suit: 'spade' };
      p0.hand = [slashCard];
      CombatRules.playSlash(state, 0, 1, slashCard);
      expect(state.priorityStack.peek().context.damageAmount).toBe(1);
    });

    it('1.6. BotBrain tự động phát động Khởi Nghĩa khi có Chém hoặc Quyết Đấu trên tay', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      sm.startTurn(0);

      const p0 = state.getPlayer(0);
      p0.hand = [{ id: 'slash_card', name: 'Chém', type: 'slash' }];

      const frame = state.priorityStack.peek();
      const botDecision = BotBrain.decideReaction(state, 0, frame);
      expect(botDecision.type).toBe('ACTION_REACT');
      expect(botDecision.doUse).toBe(true);
    });
  });
});
