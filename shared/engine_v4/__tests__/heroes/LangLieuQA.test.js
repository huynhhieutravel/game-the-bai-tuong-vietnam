import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { getAvailableTargets, validateTargetPayload } from '../../rules/TargetResolverV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Lang Liêu (Lang Lieu QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: (i % 13) + 1,
      color: 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Lang Liêu',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'lang_lieu',
        heroes: [{ id: 'lang_lieu', skills: ['banh_chung', 'dam_bac'] }],
        skills: ['banh_chung', 'dam_bac'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Đối thủ 1',
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
        name: 'Đối thủ 2',
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
        name: 'Đối thủ 3',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'viet',
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
    return state;
  };

  describe('1. Kỹ năng Bánh Chưng (Quan Tinh - Sắp xếp đỉnh/đáy bộ bài)', () => {
    it('1.1. Tự động kích hoạt ở BEGIN_PHASE và tạo Priority Frame ASK_BANH_CHUNG với viewCount = min(alive, 5)', () => {
      const state = createMockGameState();
      const stateMachine = new StateMachine(state);

      // Bắt đầu lượt của Lang Liêu (id: 0)
      stateMachine.startTurn(0);

      // PriorityStack phải có ASK_BANH_CHUNG frame
      expect(state.priorityStack.isEmpty()).toBe(false);
      const topFrame = state.priorityStack.peek();
      expect(topFrame.type).toBe('ASK_BANH_CHUNG');
      expect(topFrame.currentActorId).toBe(0);
      expect(topFrame.context.viewCount).toBe(4); // 4 người chơi còn sống
      expect(topFrame.context.viewedCards.length).toBe(4);
    });

    it('1.2. Người chơi chọn xếp bài lên deckTop và deckBottom, thứ tự rút bài phản ánh chính xác', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      // Đặt 4 lá bài cụ thể ở đỉnh drawPile
      const c1 = { id: 'card_A', name: 'Đào', type: 'peach', suit: 'heart' };
      const c2 = { id: 'card_B', name: 'Chém', type: 'slash', suit: 'spade' };
      const c3 = { id: 'card_C', name: 'Né', type: 'dodge', suit: 'diamond' };
      const c4 = { id: 'card_D', name: 'Sấm Sét', type: 'trick', suit: 'spade' };
      state.drawPile.push(c1, c2, c3, c4); // Top bài hiện tại: c4 (pop đầu tiên), c3, c2, c1

      // Kích hoạt Bánh Chưng
      globalHeroRegistry.dispatchTrigger('BEGIN_PHASE', { sourceId: 0 }, state);
      expect(state.priorityStack.peek().type).toBe('ASK_BANH_CHUNG');

      // Người chơi xếp: c1 và c3 lên deckTop (muốn rút c1 trước, rồi c3), c2 và c4 xuống deckBottom (c2 ở đáy hơn, c4 trên c2)
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        deckTop: [c1, c3],
        deckBottom: [c2, c4]
      });

      // Frame ASK_BANH_CHUNG đã được gỡ bỏ
      expect(state.priorityStack.isEmpty()).toBe(true);

      // Nhờ Bánh Chưng xếp card_A và card_C lên đầu, ở Pha Rút bài (Draw Phase), Lang Liêu đã tự động rút đúng 2 lá bài này vào tay!
      const hand = state.getPlayer(0).hand;
      expect(hand.some(c => c.id === 'card_A')).toBe(true);
      expect(hand.some(c => c.id === 'card_C')).toBe(true);

      // Kiểm tra 2 lá ở đáy bộ bài: bottom cards
      expect(state.drawPile[0].id).toBe('card_D');
      expect(state.drawPile[1].id).toBe('card_B');
    });

    it('1.3. Hỗ trợ BotBrain tự động lọc bài tốt (Đào, Chém, Né) lên Top và bài khác xuống Bottom', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const peach = { id: 'p1', name: 'Đào', type: 'peach' };
      const slash = { id: 's1', name: 'Chém', type: 'slash' };
      const lightning = { id: 'l1', name: 'Sấm Sét', type: 'delayed_trick' };
      const discard = { id: 'd1', name: 'Cướp Bài', type: 'trick' };
      state.drawPile.push(peach, slash, lightning, discard);

      globalHeroRegistry.dispatchTrigger('BEGIN_PHASE', { sourceId: 0 }, state);
      const frame = state.priorityStack.peek();

      // BotBrain đưa ra quyết định
      const botAction = BotBrain.decideReaction(state, 0, frame);
      expect(botAction.type).toBe('ACTION_REACT');
      expect(botAction.deckTop.some(c => c.name === 'Đào')).toBe(true);
      expect(botAction.deckTop.some(c => c.name === 'Chém')).toBe(true);
      expect(botAction.deckBottom.some(c => c.name === 'Sấm Sét')).toBe(true);

      botAction.playerId = 0;
      dispatcher.dispatchAction(botAction);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('1.4. Tự động xào bài (recycleDiscardPile) an toàn khi drawPile thiếu bài trước khi xem', () => {
      const state = createMockGameState();
      state.drawPile = [{ id: 'remaining_1', name: 'Bài duy nhất', type: 'basic' }];
      state.discardPile = [
        { id: 'disc_1', name: 'Bài bỏ 1', type: 'basic' },
        { id: 'disc_2', name: 'Bài bỏ 2', type: 'basic' },
        { id: 'disc_3', name: 'Bài bỏ 3', type: 'basic' },
        { id: 'disc_4', name: 'Bài bỏ 4', type: 'basic' }
      ];

      globalHeroRegistry.dispatchTrigger('BEGIN_PHASE', { sourceId: 0 }, state);
      const topFrame = state.priorityStack.peek();
      expect(topFrame.type).toBe('ASK_BANH_CHUNG');
      expect(topFrame.context.viewCount).toBe(4);
      // Chồng bài đã được recycle an toàn để có đủ 4 lá xem
      expect(state.drawPile.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Kỹ năng Đạm Bạc (Miễn nhiễm Chém & Quyết Đấu khi tay không có bài)', () => {
    it('2.1. Lang Liêu có 0 lá bài trên tay: Không thể là mục tiêu của [Chém]', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Lang Liêu
      const p1 = state.getPlayer(1); // Đối thủ 1

      p0.hand = []; // Hết bài trên tay
      const slashCard = { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'spade' };
      p1.hand = [slashCard];

      // RangeSystem getValidSlashTargets loại bỏ Lang Liêu
      const validTargets = RangeSystem.getValidSlashTargets(p1, state.getAlivePlayers(), slashCard);
      expect(validTargets.some(t => t.id === 0)).toBe(false);

      // TargetResolver getAvailableTargets loại bỏ Lang Liêu
      const availTargets = getAvailableTargets(state, 1, 'Chém', slashCard.id);
      expect(availTargets.includes(0)).toBe(false);

      // TargetResolver validateTargetPayload nhắm vào 0 báo lỗi
      const validation = validateTargetPayload(state, 1, 'Chém', slashCard.id, [0]);
      expect(validation.valid).toBe(false);

      // CombatRules.playSlash trực tiếp vào 0 bị throw Error chặn lại
      expect(() => {
        CombatRules.playSlash(state, 1, 0, slashCard);
      }).toThrow(/Đạm Bạc/);
    });

    it('2.2. Lang Liêu có 0 lá bài trên tay: Không thể là mục tiêu của [Quyết Đấu]', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Lang Liêu
      const p1 = state.getPlayer(1); // Đối thủ 1

      p0.hand = []; // Hết bài trên tay
      const duelCard = { id: 'duel_1', name: 'Quyết Đấu', type: 'trick', trickType: 'quyet_dau' };
      p1.hand = [duelCard];

      // TargetResolver getAvailableTargets loại bỏ Lang Liêu
      const availTargets = getAvailableTargets(state, 1, 'Quyết Đấu', duelCard.id);
      expect(availTargets.includes(0)).toBe(false);

      // TargetResolver validateTargetPayload nhắm vào 0 báo lỗi
      const validation = validateTargetPayload(state, 1, 'Quyết Đấu', duelCard.id, [0]);
      expect(validation.valid).toBe(false);

      // TrickRules.playTrick trực tiếp vào Lang Liêu bị throw Error chặn lại
      expect(() => {
        TrickRules.playTrick(state, 1, [0], duelCard);
      }).toThrow(/Đạm Bạc/);
    });

    it('2.3. Lang Liêu có từ 1 lá bài trên tay: BỊ Chém và Quyết Đấu bình thường', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Lang Liêu
      const p1 = state.getPlayer(1); // Đối thủ 1

      p0.hand = [{ id: 'c_hand', name: 'Đào', type: 'peach' }]; // Có 1 bài trên tay
      const slashCard = { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'spade' };
      const duelCard = { id: 'duel_1', name: 'Quyết Đấu', type: 'trick', trickType: 'quyet_dau' };
      p1.hand = [slashCard, duelCard];

      // Lang Liêu có bài trên tay nên nằm trong danh sách mục tiêu hợp lệ của Chém
      const validSlashTargets = RangeSystem.getValidSlashTargets(p1, state.getAlivePlayers(), slashCard);
      expect(validSlashTargets.some(t => t.id === 0)).toBe(true);

      const availSlash = getAvailableTargets(state, 1, 'Chém', slashCard.id);
      expect(availSlash.includes(0)).toBe(true);

      // Lang Liêu có bài trên tay nên nằm trong danh sách mục tiêu hợp lệ của Quyết Đấu
      const availDuel = getAvailableTargets(state, 1, 'Quyết Đấu', duelCard.id);
      expect(availDuel.includes(0)).toBe(true);
    });

    it('2.4. Đạm Bạc chỉ chặn Chém và Quyết Đấu; các cẩm nang khác (Cướp Bài, Nam Man, Quá Hà...) vẫn tác dụng', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Lang Liêu
      const p1 = state.getPlayer(1); // Đối thủ 1

      p0.hand = [];
      p0.equipment.armor = { id: 'armor_1', name: 'Bát Quái Trận', type: 'armor' }; // Có trang bị để Cướp

      const stealCard = { id: 'steal_1', name: 'Cướp Bài', type: 'trick', trickType: 'cuop_bai' };
      p1.hand = [stealCard];

      // Cướp bài vẫn nhắm được Lang Liêu vì Đạm Bạc chỉ cấm Chém & Quyết Đấu
      const availSteal = getAvailableTargets(state, 1, 'Cướp Bài', stealCard.id);
      expect(availSteal.includes(0)).toBe(true);

      const validation = validateTargetPayload(state, 1, 'Cướp Bài', stealCard.id, [0]);
      expect(validation.valid).toBe(true);
    });
  });
});
