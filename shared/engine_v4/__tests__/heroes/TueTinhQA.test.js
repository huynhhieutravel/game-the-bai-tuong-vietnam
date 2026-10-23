import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Sơn: Tuệ Tĩnh (Tue Tinh QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `deck_card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'heart',
      rank: (i % 13) + 1,
      color: 'red'
    }));

    const players = [
      {
        id: 0,
        name: 'Tuệ Tĩnh',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'son',
        rawFaction: 'son',
        mainHeroId: 'tue_tinh',
        heroes: [{ id: 'tue_tinh', skills: ['nam_duoc', 'dieu_duoc'] }],
        skills: ['nam_duoc', 'dieu_duoc'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Đồng Minh Sơn',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'son',
        rawFaction: 'son',
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
        name: 'Kẻ Địch Đối Lập',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'viet',
        rawFaction: 'viet',
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

  it('1. Đăng ký đầy đủ thuộc tính và kỹ năng Nam Dược, Diệu Dược trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('tue_tinh');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Tuệ Tĩnh');
    expect(hero.faction.toLowerCase()).toContain('sơn');
    expect(hero.skills.some(s => s.id === 'nam_duoc')).toBe(true);
    expect(hero.skills.some(s => s.id === 'dieu_duoc')).toBe(true);
  });

  describe('2. Nam Dược (Dùng bài Đỏ làm Đào ngoài lượt)', () => {
    it('2.1. Ngoài lượt: Dùng lá bài Đỏ bất kỳ (Chém Đỏ) cứu đồng minh đang hấp hối', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      // Lượt của Kẻ Địch 2
      state.currentTurnPlayerId = 2;
      const p0 = state.getPlayer(0); // Tuệ Tĩnh
      const p1 = state.getPlayer(1); // Đồng minh hấp hối

      // Tuệ Tĩnh có 1 lá Chém Đỏ (chất cơ)
      const redSlash = { id: 'red_slash_1', name: 'Chém Đỏ', type: 'slash', suit: 'heart', color: 'red' };
      p0.hand = [redSlash];

      // Đưa Player 1 về 0 HP (Hấp hối) và tạo frame ASK_PEACH
      p1.hp = 0;
      state.priorityStack.push({
        type: 'ASK_PEACH',
        sourceId: 2,
        targetId: 1,
        currentActorId: 0, // Đang hỏi Tuệ Tĩnh cứu
        priorityQueue: [0, 1, 2],
        context: { reason: 'dying' }
      });

      // Tuệ Tĩnh đánh lá Chém Đỏ làm Đào cứu p1
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'red_slash_1',
        doSave: true
      });

      // p1 được hồi sinh lên 1 HP và thoát khỏi trạng thái hấp hối
      expect(p1.hp).toBe(1);
      // Lá Chém Đỏ đã bị bỏ
      expect(p0.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'red_slash_1')).toBe(true);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('2.2. Nam Dược: Không cho phép dùng bài Đen làm Đào', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      state.currentTurnPlayerId = 2;
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const blackSlash = { id: 'black_slash_1', name: 'Chém Đen', type: 'slash', suit: 'spade', color: 'black' };
      p0.hand = [blackSlash];

      p1.hp = 0;
      state.priorityStack.push({
        type: 'ASK_PEACH',
        sourceId: 2,
        targetId: 1,
        currentActorId: 0,
        priorityQueue: [0, 1, 2],
        context: { reason: 'dying' }
      });

      // Tuệ Tĩnh cố tình đánh lá Chém Đen
      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          playerId: 0,
          cardId: 'black_slash_1',
          doSave: true,
          throwOnError: true
        });
      }).toThrowError(/không thể dùng để cứu người hấp hối/);

      expect(p1.hp).toBe(0);
    });
  });

  describe('3. Diệu Dược (Bỏ 1 bài hồi 1 HP cho người chơi)', () => {
    it('3.1. Trong Action Phase: Bỏ 1 bài trên tay hồi 1 HP cho đồng minh đang mất máu', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      state.currentTurnPlayerId = 0;
      state.currentPhase = PHASES.ACTION;

      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.hand = [{ id: 'card_any', name: 'Bài Rác', type: 'basic' }];
      p1.hp = 2; // Mất máu (2/4)

      // Kích hoạt Diệu Dược nhắm vào Player 1
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'dieu_duoc',
        targets: [1],
        cardId: 'card_any'
      });

      expect(p1.hp).toBe(3);
      expect(p0.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'card_any')).toBe(true);
      expect(p0.skillUsage?.dieu_duoc?.usedThisTurn).toBe(true);
    });

    it('3.2. Ràng buộc Một lượt 1 lần: Dùng lần thứ hai trong cùng lượt bị chặn', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      state.currentTurnPlayerId = 0;
      state.currentPhase = PHASES.ACTION;

      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.hand = [
        { id: 'card_1', name: 'Bài 1', type: 'basic' },
        { id: 'card_2', name: 'Bài 2', type: 'basic' }
      ];
      p1.hp = 1;

      // Lần 1: Thành công
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'dieu_duoc',
        targets: [1],
        cardId: 'card_1'
      });
      expect(p1.hp).toBe(2);

      // Lần 2: Cố tình dùng tiếp -> Lỗi
      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'dieu_duoc',
          targets: [1],
          cardId: 'card_2',
          throwOnError: true
        });
      }).toThrowError(/Mỗi lượt chỉ được sử dụng 1 lần/);

      expect(p1.hp).toBe(2);
    });

    it('3.3. Không thể hồi máu cho người đã đầy Máu', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      state.currentTurnPlayerId = 0;
      state.currentPhase = PHASES.ACTION;

      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.hp = 4; // Đầy máu 4/4

      p0.hand = [{ id: 'card_1', name: 'Bài 1', type: 'basic' }];

      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'dieu_duoc',
          targets: [1],
          cardId: 'card_1',
          throwOnError: true
        });
      }).toThrowError(/Mục tiêu đã đầy Máu/);
    });
  });
});
