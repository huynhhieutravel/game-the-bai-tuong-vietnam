import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Lạc Long Quân (Lac Long Quan QA Suite v4)', () => {
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
        name: 'Lạc Long Quân (Chúa Công Lạc)',
        hp: 3,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'lac_long_quan',
        heroes: [{ id: 'lac_long_quan', skills: ['thuy_to', 'boc_tram_trung'] }],
        skills: ['thuy_to', 'boc_tram_trung'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Đồng Minh Lạc (Sơn Tinh)',
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
        id: 2,
        name: 'Đồng Minh Lạc 2 (Lang Liêu)',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'lang_lieu',
        heroes: [{ id: 'lang_lieu', skills: ['dam_bac'] }],
        skills: ['dam_bac'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Kẻ Địch Phe Hà (An Tư)',
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

  describe('1. Kỹ năng Thủy Tổ (Cho bài đồng minh & Dùng bài cơ bản miễn phí)', () => {
    it('1.1. Phát động kỹ năng Thủy Tổ tạo frame ASK_THUY_TO và giao 1 lá bài cho đồng minh', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const cardA = { id: 'card_A', name: 'Chém', type: 'slash' };
      p0.hand = [cardA];
      p1.hand = [];

      // Lạc Long Quân kích hoạt Thủy Tổ
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'thuy_to'
      });

      expect(state.priorityStack.peek().type).toBe('ASK_THUY_TO');

      // Chuyển 1 lá bài cho đồng minh (p1)
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        selectedAlly: 1,
        selectedCardIds: ['card_A']
      });

      // Bài chuyển sang tay p1, p0 hết bài
      expect(p0.hand.length).toBe(0);
      expect(p1.hand.length).toBe(1);
      expect(p1.hand[0].id).toBe('card_A');

      // Cho < 2 bài thì không kích hoạt frame thưởng
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('1.2. Giao từ 2 lá bài trở lên cho đồng minh: Tự động kích hoạt frame ASK_THUY_TO_BONUS', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const cardA = { id: 'card_A', name: 'Chém', type: 'slash' };
      const cardB = { id: 'card_B', name: 'Né', type: 'dodge' };
      p0.hand = [cardA, cardB];
      p1.hand = [];

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'thuy_to'
      });

      // Cho cả 2 lá bài
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        selectedAlly: 1,
        selectedCardIds: ['card_A', 'card_B']
      });

      expect(p0.hand.length).toBe(0);
      expect(p1.hand.length).toBe(2);

      // Nhận frame thưởng ASK_THUY_TO_BONUS
      expect(state.priorityStack.isEmpty()).toBe(false);
      const bonusFrame = state.priorityStack.peek();
      expect(bonusFrame.type).toBe('ASK_THUY_TO_BONUS');
      expect(bonusFrame.currentActorId).toBe(0);
    });

    it('1.3. Thưởng Thủy Tổ: Sử dụng [Đào] miễn phí hồi phục 1 HP khi chưa đầy máu', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0);
      p0.hp = 2; // Máu giảm còn 2/4
      p0.hand = [
        { id: 'c1', name: 'Bài 1', type: 'basic' },
        { id: 'c2', name: 'Bài 2', type: 'basic' }
      ];

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'thuy_to'
      });

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        selectedAlly: 1,
        selectedCardIds: ['c1', 'c2']
      });

      expect(state.priorityStack.peek().type).toBe('ASK_THUY_TO_BONUS');

      // Chọn dùng Đào miễn phí
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        virtualCardName: 'Đào'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(p0.hp).toBe(3); // Hồi 1 HP (2 -> 3)
    });

    it('1.4. Thưởng Thủy Tổ: Sử dụng [Rượu] miễn phí kích hoạt cờ wineActive', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0);
      p0.hand = [
        { id: 'c1', name: 'Bài 1', type: 'basic' },
        { id: 'c2', name: 'Bài 2', type: 'basic' }
      ];

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'thuy_to'
      });

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        selectedAlly: 1,
        selectedCardIds: ['c1', 'c2']
      });

      // Chọn dùng Rượu miễn phí
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        virtualCardName: 'Rượu'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(p0.temporaryFlags.wineActive).toBe(true);
    });

    it('1.5. Thưởng Thủy Tổ: Sử dụng [Chém] miễn phí tấn công kẻ địch', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0);
      p0.hand = [
        { id: 'c1', name: 'Bài 1', type: 'basic' },
        { id: 'c2', name: 'Bài 2', type: 'basic' }
      ];

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'thuy_to'
      });

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        selectedAlly: 1,
        selectedCardIds: ['c1', 'c2']
      });

      // Chọn dùng Chém miễn phí nhắm vào kẻ địch p3
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        virtualCardName: 'Chém',
        targetId: 3
      });

      // Kẻ địch p3 phải đối mặt với yêu cầu Né (ASK_DODGE)
      expect(state.priorityStack.isEmpty()).toBe(false);
      const dodgeFrame = state.priorityStack.peek();
      expect(dodgeFrame.type).toBe('ASK_DODGE');
      expect(dodgeFrame.targetId).toBe(3);
    });
  });

  describe('2. Kỹ năng Bọc Trăm Trứng (Chúa Công Kỹ - Đồng minh Lạc ra bài giùm)', () => {
    it('2.1. Lạc Long Quân bị Chém: Kích hoạt Bọc Trăm Trứng chuyển sang ASK_BOC_TRAM_TRUNG_DODGE', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0); // LLQ
      const p3 = state.getPlayer(3); // Kẻ địch
      p3.hand = [{ id: 'slash_3', name: 'Chém', type: 'slash', suit: 'spade' }];

      // p3 đánh Chém lên p0
      CombatRules.playSlash(state, 3, 0, p3.hand[0]);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // Lạc Long Quân kích hoạt Bọc Trăm Trứng nhờ đồng minh Né giùm
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        callBocTramTrung: true
      });

      expect(state.priorityStack.peek().type).toBe('ASK_BOC_TRAM_TRUNG_DODGE');
      expect(state.priorityStack.peek().currentActorId).toBe(1); // Đồng minh Lạc 1 (Sơn Tinh)
    });

    it('2.2. Đồng minh phe Lạc đánh lá [Né] giùm: Đỡ đòn thành công thay cho Lạc Long Quân', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0); // LLQ
      const p1 = state.getPlayer(1); // Đồng minh Lạc
      const p3 = state.getPlayer(3); // Kẻ địch

      const slashCard = { id: 'slash_3', name: 'Chém', type: 'slash', suit: 'spade' };
      const dodgeCard = { id: 'dodge_1', name: 'Né', type: 'dodge', suit: 'diamond' };
      p3.hand = [slashCard];
      p1.hand = [dodgeCard];
      p0.hand = []; // LLQ không có Né

      CombatRules.playSlash(state, 3, 0, slashCard);

      // LLQ gọi đồng minh
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        callBocTramTrung: true
      });

      // Đồng minh p1 ra lá Né giùm
      dispatcher.dispatchAction({
        playerId: 1,
        type: 'ACTION_REACT',
        doProvide: true,
        cardId: 'dodge_1'
      });

      // Cú Chém bị vô hiệu hóa hoàn toàn, p0 không mất máu
      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(p0.hp).toBe(3);
      expect(p1.hand.length).toBe(0); // Lá Né của đồng minh bị bỏ
    });

    it('2.3. Đồng minh 1 từ chối: Tự động chuyển quyền hỏi sang Đồng minh 2', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p1 = state.getPlayer(1); // Đồng minh 1
      const p2 = state.getPlayer(2); // Đồng minh 2
      const slashCard = { id: 'slash_3', name: 'Chém', type: 'slash', suit: 'spade' };
      const dodgeCard = { id: 'dodge_2', name: 'Né', type: 'dodge', suit: 'heart' };
      p2.hand = [dodgeCard];

      CombatRules.playSlash(state, 3, 0, slashCard);

      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        callBocTramTrung: true
      });

      expect(state.priorityStack.peek().currentActorId).toBe(1);

      // Đồng minh 1 từ chối ra Né
      dispatcher.dispatchAction({
        playerId: 1,
        type: 'ACTION_REACT',
        doProvide: false,
        responseType: 'skip'
      });

      // Tự động chuyển lượt hỏi sang Đồng minh 2 (p2)
      expect(state.priorityStack.peek().type).toBe('ASK_BOC_TRAM_TRUNG_DODGE');
      expect(state.priorityStack.peek().currentActorId).toBe(2);

      // Đồng minh 2 ra Né giùm
      dispatcher.dispatchAction({
        playerId: 2,
        type: 'ACTION_REACT',
        doProvide: true,
        cardId: 'dodge_2'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(state.getPlayer(0).hp).toBe(3);
    });

    it('2.4. Quyết Đấu: Đồng minh phe Lạc ra lá [Chém] giùm cho Lạc Long Quân qua Bọc Trăm Trứng', () => {
      const state = createMockGameState();

      const p0 = state.getPlayer(0); // LLQ
      const p1 = state.getPlayer(1); // Đồng minh Lạc
      const p3 = state.getPlayer(3); // Kẻ địch

      const slashAlly = { id: 'slash_ally', name: 'Chém', type: 'slash', suit: 'spade' };
      p1.hand = [slashAlly];

      // Kẻ địch p3 Quyết Đấu với LLQ
      state.priorityStack.push({
        type: 'ASK_SLASH_DUEL',
        sourceId: 3,
        targetId: 0,
        currentActorId: 0,
        context: {
          attackerId: 3,
          currentResponderId: 0
        }
      });

      // LLQ gọi Bọc Trăm Trứng Chém
      state.priorityStack.push({
        type: 'ASK_BOC_TRAM_TRUNG_SLASH',
        sourceId: 0,
        targetId: 0,
        priorityQueue: [1, 2],
        currentActorId: 1,
        context: {
          allies: [1, 2],
          allyIndex: 0
        }
      });

      // Đồng minh 1 đánh lá Chém giùm
      const res = CombatRules.respondBocTramTrungSlash(state, 1, slashAlly);
      expect(res.continued).toBe(true);
      expect(res.nextPlayerId).toBe(3); // Lượt đánh Chém chuyển lại cho Kẻ địch p3!

      // Frame Bọc Trăm Trứng đã gỡ bỏ, frame Quyết Đấu giờ chuyển sang kẻ địch
      expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');
      expect(state.priorityStack.peek().currentActorId).toBe(3);
    });

    it('2.5. Chủ động Hành Động: Lạc Long Quân phát động Bọc Trăm Trứng chỉ định kẻ địch, đồng minh Chém giùm thành công', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0); // LLQ
      const p1 = state.getPlayer(1); // Đồng minh Lạc
      const p3 = state.getPlayer(3); // Kẻ địch
      p1.hand = [{ id: 'slash_ally', name: 'Chém', type: 'slash', suit: 'spade' }];
      p3.hand = [{ id: 'dodge_enemy', name: 'Né', type: 'dodge', suit: 'heart' }];

      // LLQ phát động Bọc Trăm Trứng tấn công kẻ địch p3
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'boc_tram_trung',
        targets: [3]
      });

      // Frame hỏi đồng minh Lạc ra Chém được tạo
      expect(state.priorityStack.peek().type).toBe('ASK_BOC_TRAM_TRUNG_SLASH');
      expect(state.priorityStack.peek().currentActorId).toBe(1);

      // Đồng minh p1 ra lá Chém giùm
      dispatcher.dispatchAction({
        playerId: 1,
        type: 'ACTION_REACT',
        doProvide: true,
        cardId: 'slash_ally'
      });

      // Kẻ địch p3 bị tấn công bằng Chém -> mở frame ASK_DODGE cho p3
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(3);
      // Lạc Long Quân đã tính 1 lần Chém trong lượt
      expect(p0.turnStats.slashCount).toBe(1);
    });

    it('2.6. Chủ động Hành Động: Đồng minh Lạc từ chối Chém -> Lạc Long Quân KHÔNG bị mất lượt Chém và vẫn tự Chém được', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0); // LLQ
      const p3 = state.getPlayer(3); // Kẻ địch
      p0.hand = [{ id: 'slash_llq', name: 'Chém', type: 'slash', suit: 'spade' }];

      // LLQ phát động Bọc Trăm Trứng tấn công kẻ địch p3
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_USE_SKILL',
        skillId: 'boc_tram_trung',
        targets: [3]
      });

      // Đồng minh 1 từ chối
      dispatcher.dispatchAction({
        playerId: 1,
        type: 'ACTION_REACT',
        doProvide: false,
        responseType: 'skip'
      });

      // Đồng minh 2 từ chối
      dispatcher.dispatchAction({
        playerId: 2,
        type: 'ACTION_REACT',
        doProvide: false,
        responseType: 'skip'
      });

      // Frame Bọc Trăm Trứng đã gỡ bỏ hoàn toàn
      expect(state.priorityStack.isEmpty()).toBe(true);
      // Lạc Long Quân KHÔNG bị tính lượt Chém (slashCount vẫn bằng 0)
      expect(p0.turnStats.slashCount).toBe(0);

      // LLQ có thể tự mình dùng lá Chém trên tay để tấn công p3
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_PLAY_CARD',
        cardId: 'slash_llq',
        targetIds: [3]
      });

      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(3);
      expect(p0.turnStats.slashCount).toBe(1);
    });

    it('2.7. Bị Chém: Đồng minh từ chối Né giùm -> Lạc Long Quân vẫn giữ quyền tự dùng lá [Né] trên tay để đỡ đòn', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0); // LLQ
      const p3 = state.getPlayer(3); // Kẻ địch
      p0.hand = [{ id: 'dodge_llq', name: 'Né', type: 'dodge', suit: 'diamond' }];
      p3.hand = [{ id: 'slash_enemy', name: 'Chém', type: 'slash', suit: 'spade' }];

      CombatRules.playSlash(state, 3, 0, p3.hand[0]);

      // LLQ gọi Bọc Trăm Trứng
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        callBocTramTrung: true
      });

      // Đồng minh 1 từ chối
      dispatcher.dispatchAction({
        playerId: 1,
        type: 'ACTION_REACT',
        doProvide: false,
        responseType: 'skip'
      });

      // Đồng minh 2 từ chối
      dispatcher.dispatchAction({
        playerId: 2,
        type: 'ACTION_REACT',
        doProvide: false,
        responseType: 'skip'
      });

      // Frame ASK_DODGE quay lại đỉnh stack với currentActorId là chính Lạc Long Quân (p0)
      const topFrame = state.priorityStack.peek();
      expect(topFrame.type).toBe('ASK_DODGE');
      expect(topFrame.currentActorId).toBe(0);
      expect(topFrame.context.bocTramTrungFailed).toBe(true);

      // Lạc Long Quân tự đánh lá Né trên tay mình
      dispatcher.dispatchAction({
        playerId: 0,
        type: 'ACTION_REACT',
        cardId: 'dodge_llq'
      });

      // Đỡ đòn thành công, LLQ không mất máu
      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(p0.hp).toBe(3);
    });
  });
});
