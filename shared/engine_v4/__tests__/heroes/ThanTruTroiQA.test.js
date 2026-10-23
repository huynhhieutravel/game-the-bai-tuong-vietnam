import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { canPlayCard } from '../../rules/TargetResolverV4.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Thần Trụ Trời (Than Tru Troi QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'heart',
      rank: 7,
      color: 'red'
    }));

    const players = [
      {
        id: 0,
        name: 'Thần Trụ Trời',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'than_tru_troi',
        heroes: [{ id: 'than_tru_troi', skills: ['khai_thien'] }],
        skills: ['khai_thien'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Kẻ địch 1)',
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
      },
      {
        id: 2,
        name: 'Người chơi 2 (Kẻ địch 2 có Hắc Thuẫn)',
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
        equipment: {
          weapon: null,
          armor: { id: 'black_shield_1', idKey: 'hac_thuan', name: 'Hắc Thuẫn' },
          horse_attack: null,
          horse_defense: null
        },
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
  // PHẦN 1: KHAI THIÊN TRONG PHA HÀNH ĐỘNG
  // ==========================================
  describe('1. Khai Thiên: Sử Dụng Bài Đỏ Như [Chém] Trong Pha Hành Động', () => {
    it('dùng lá [Né] màu Đỏ như một lá [Chém] hợp lệ tấn công mục tiêu', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const redDodge = { id: 'd_red', name: 'Né', type: 'dodge', suit: 'diamond', color: 'red', rank: 6 };
      p0.hand = [redDodge];

      // Kiểm tra qua canPlayCard
      const check = canPlayCard(state, 0, 'Né', 'd_red');
      expect(check.valid).toBe(true);

      // Thực thi qua CombatRules
      CombatRules.playSlash(state, 0, 1, redDodge);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(1);

      // p1 không né -> mất 1 HP
      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(3);
    });

    it('dùng lá [Đào] màu Đỏ như một lá [Chém] hợp lệ qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const redPeach = { id: 'p_red', name: 'Đào', type: 'peach', suit: 'heart', color: 'red', rank: 9 };
      p0.hand = [redPeach];

      // Đánh bài Đào nhắm vào p1
      dispatcher.dispatchAction({
        type: 'PLAY_CARD',
        playerId: 0,
        cardId: 'p_red',
        targetId: 1
      });

      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(3);
    });

    it('dùng lá Trang Bị màu Đỏ như một lá [Chém] hợp lệ qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const redArmor = { id: 'equip_red', name: 'Bát Quái', type: 'equip', suit: 'heart', color: 'red', rank: 2 };
      p0.hand = [redArmor];

      dispatcher.dispatchAction({
        type: 'PLAY_CARD',
        playerId: 0,
        cardId: 'equip_red',
        targetId: 1
      });

      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(3);
    });

    it('bài Đen không phải Chém không thể dùng làm Chém', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      const blackDodge = { id: 'd_black', name: 'Né', type: 'dodge', suit: 'spade', color: 'black', rank: 8 };
      p0.hand = [blackDodge];

      expect(() => {
        CombatRules.playSlash(state, 0, 1, blackDodge);
      }).toThrow(/không phải là lá \[Chém\] hợp lệ/);
    });
  });

  // ==========================================
  // PHẦN 2: THUỘC TÍNH CHÉM ĐỎ XUYÊN HẮC THUẪN
  // ==========================================
  describe('2. Khai Thiên: Sát Thương Chém Đỏ Xuyên Giáp Hắc Thuẫn', () => {
    it('đòn Chém Đỏ từ Khai Thiên không bị Giáp Hắc Thuẫn chặn', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2); // Có Hắc Thuẫn

      const redCardAsSlash = { id: 'red_trick', name: 'Hỏa Công', type: 'trick', suit: 'diamond', color: 'red', rank: 4 };
      p0.hand = [redCardAsSlash];

      CombatRules.playSlash(state, 0, 2, redCardAsSlash);
      // Không bị chặn bởi Hắc Thuẫn -> Vẫn đẩy ASK_DODGE
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(2);

      CombatRules.respondDodge(state, 2, null);
      expect(p2.hp).toBe(3);
    });

    it('đòn Chém Đen thông thường bị Giáp Hắc Thuẫn chặn đứng', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      const blackSlash = { id: 'black_slash', name: 'Chém', type: 'slash', suit: 'spade', color: 'black', rank: 7 };
      p0.hand = [blackSlash];

      const res = CombatRules.playSlash(state, 0, 2, blackSlash);
      expect(res.success).toBe(false);
      expect(res.reason).toBe('ARMOR_IMMUNE');
      expect(p2.hp).toBe(4); // Không mất máu
    });
  });

  // ==========================================
  // PHẦN 3: TRONG QUYẾT ĐẤU & DÃ MAN
  // ==========================================
  describe('3. Khai Thiên: Sử Dụng Bài Đỏ Trong Quyết Đấu & Dã Man', () => {
    it('trong Quyết Đấu, Thần Trụ Trời dùng bài Đỏ để đáp trả qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Thần Trụ Trời chỉ có 1 lá Né Đỏ
      const redDodge = { id: 'd_duel_red', name: 'Né', type: 'dodge', suit: 'heart', color: 'red', rank: 3 };
      p0.hand = [redDodge];

      const duelCard = { id: 'duel_tt', idKey: 'quyet_dau', name: 'Quyết Đấu', type: 'trick' };
      p1.hand = [duelCard];

      TrickRules._executeTrickEffect(state, 1, [0], duelCard);
      expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');

      // Phản hồi bằng lá Né Đỏ
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: { cardId: 'd_duel_red' }
      });

      // Lượt chuyển sang p1
      expect(state.priorityStack.peek().context.currentResponderId).toBe(1);
      TrickRules.respondDuel(state, 1, null);
      expect(p1.hp).toBe(3); // p1 thua
      expect(p0.hp).toBe(4); // Thần Trụ Trời bảo toàn máu
    });

    it('trong Dã Man, Thần Trụ Trời dùng bài Đỏ cản đợt công kích qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);

      const redCard = { id: 'wine_red', name: 'Rượu', type: 'wine', suit: 'diamond', color: 'red', rank: 5 };
      p0.hand = [redCard];

      const barbarianCard = { id: 'barb_tt', idKey: 'da_man', name: 'Dã Man', type: 'trick' };

      TrickRules._executeTrickEffect(state, 1, [0], barbarianCard);
      expect(state.priorityStack.peek().type).toBe('ASK_SLASH_RESPONSE');

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: { cardId: 'wine_red' }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(p0.hp).toBe(4); // Chống đỡ thành công
    });
  });

  // ==========================================
  // PHẦN 4: TRÍ TUỆ NHÂN TẠO BOT (BOT BRAIN)
  // ==========================================
  describe('4. Trí Tuệ Nhân Tạo Bot (Bot Brain v4)', () => {
    it('Bot Thần Trụ Trời tự động dùng bài Đỏ để Chém kẻ thù khi không có lá Chém', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      // Không có Chém, chỉ có 1 lá Né Đỏ
      const redDodge = { id: 'bot_red_dodge', name: 'Né', type: 'dodge', suit: 'heart', color: 'red', rank: 8 };
      p0.hand = [redDodge];

      const action = BotBrain.decideAction(state, 0);
      expect(action).not.toBeNull();
      expect(action.type).toBe('PLAY_CARD');
      expect(action.cardId).toBe('bot_red_dodge');
      expect(action.targetId).toBe(1);
    });

    it('Bot Thần Trụ Trời tự động dùng bài Đỏ trong Quyết Đấu', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      const redCard = { id: 'bot_red_wine', name: 'Rượu', type: 'wine', suit: 'diamond', color: 'red', rank: 10 };
      p0.hand = [redCard];

      const duelFrame = {
        type: 'ASK_SLASH_DUEL',
        sourceId: 1,
        targetId: 0,
        context: { attackerId: 1, currentResponderId: 0 }
      };

      const reaction = BotBrain.decideReaction(state, 0, duelFrame);
      expect(reaction.type).toBe('ACTION_REACT');
      expect(reaction.slashCard).not.toBeNull();
      expect(reaction.slashCard.id).toBe('bot_red_wine');
    });
  });
});
