import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Rùa Vàng (Rua Vang QA Suite v4)', () => {
  const createMockGameState = (deckCards = []) => {
    const drawPile = deckCards.length > 0 ? deckCards : Array.from({ length: 60 }, (_, i) => ({
      id: `c_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: i % 2 === 0 ? 'heart' : 'spade',
      rank: 7,
      color: i % 2 === 0 ? 'red' : 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Rùa Vàng',
        hp: 3,
        maxHp: 3,
        gender: 'none',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'rua_vang',
        heroes: [{ id: 'rua_vang', skills: ['than_giap', 'than_hoa', 'linh_giam'] }],
        skills: ['than_giap', 'than_hoa', 'linh_giam'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Kẻ địch)',
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
      }
    ];

    const state = new GameState({ players, drawPile });
    state.activePlayerId = 0;
    return state;
  };

  // ==========================================
  // PHẦN 1: THẦN GIÁP (BÁT QUÁI BẨM SINH)
  // ==========================================
  describe('1. Thần Giáp: Bát Quái Trận Bẩm Sinh (Phán Xét Đỏ = Né)', () => {
    it('khi không có Giáp: phán xét Thần Giáp ra bài Đỏ sẽ né thành công đòn Chém', () => {
      // Đặt lá bài đỏ trên đỉnh deck
      const redJudge = { id: 'j_red', name: 'Đào', color: 'red', suit: 'heart', rank: 8 };
      const state = createMockGameState([redJudge]);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const slashCard = { id: 's_p1', name: 'Chém', type: 'slash', suit: 'spade', rank: 5 };
      p1.hand = [slashCard];

      CombatRules.playSlash(state, 1, 0, slashCard);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // Rùa Vàng không có giáp trang bị -> kích hoạt Thần Giáp phán xét
      const res = CombatRules.respondDodge(state, 0, null, { useBagua: true });
      expect(res.dodged).toBe(true);
      expect(p0.hp).toBe(3); // Không mất máu
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('khi phán xét Thần Giáp ra bài Đen: thất bại, nếu không có Né trên tay sẽ mất máu', () => {
      // Đặt lá bài đen trên đỉnh deck
      const blackJudge = { id: 'j_black', name: 'Sấm Sét', color: 'black', suit: 'spade', rank: 1 };
      const state = createMockGameState([blackJudge]);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const slashCard = { id: 's_p1_b', name: 'Chém', type: 'slash', suit: 'spade', rank: 5 };
      p1.hand = [slashCard];

      CombatRules.playSlash(state, 1, 0, slashCard);
      const res = CombatRules.respondDodge(state, 0, null, { useBagua: true });
      expect(res.dodged).toBe(false);
      expect(res.baguaSuccess).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // Chọn không né bằng bài trên tay -> nhận 1 sát thương
      CombatRules.respondDodge(state, 0, null);
      expect(p0.hp).toBe(2);
    });

    it('khi đã trang bị Giáp khác (Bạch Ngân): Thần Giáp nhường chỗ cho giáp trang bị', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.equipment.armor = { id: 'silver_armor', name: 'Bạch Ngân', idKey: 'bach_ngan' };

      // Kích hoạt phán xét Bát Quái khi đang mặc Bạch Ngân -> không hợp lệ vì Bạch Ngân không có phán xét
      expect(() => {
        CombatRules.respondDodge(state, 0, null, { useBagua: true });
      }).toThrow();
    });

    it('Thần Giáp là Tỏa Định Kỹ: không bị khóa bởi Tre Ngà của Thánh Gióng', () => {
      const redJudge = { id: 'j_red_tg', name: 'Đào', color: 'red', suit: 'diamond', rank: 9 };
      const state = createMockGameState([redJudge]);
      const p0 = state.getPlayer(0);

      // Giả lập bị phong ấn kỹ năng bởi Tre Ngà
      p0.temporaryFlags.skillsSuppressed = true;

      // Thần Giáp vẫn còn hiệu lực
      expect(globalHeroRegistry.hasSkill(p0, 'than_giap', true)).toBe(true);
      expect(globalHeroRegistry.isLockSkill('than_giap')).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 2: THẦN HỎA (DÙNG BÀI ĐỎ LÀM HỎA CÔNG)
  // ==========================================
  describe('2. Thần Hỏa: Sử Dụng Bài Đỏ Làm [Hỏa Công]', () => {
    it('Rùa Vàng dùng lá bài Đỏ bất kỳ làm Hỏa Công qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // p1 có bài trên tay để bị Hỏa Công
      p1.hand = [{ id: 'p1_card', name: 'Né', suit: 'heart', color: 'red' }];

      // Rùa Vàng có 1 lá Né màu Đỏ
      const redDodge = { id: 'red_dodge_fire', name: 'Né', type: 'dodge', suit: 'diamond', color: 'red' };
      p0.hand = [redDodge];

      // Đánh lá Né Đỏ làm Hỏa Công
      dispatcher.dispatchAction({
        type: 'PLAY_CARD',
        playerId: 0,
        cardId: 'red_dodge_fire',
        targetId: 1,
        virtualCardName: 'Hỏa Công'
      });

      // Mở vòng hỏi Hóa Giải (ASK_NEGATE)
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');

      // Cả 2 bên không Hóa Giải
      TrickRules.respondNegate(state, 0, null);
      TrickRules.respondNegate(state, 1, null);

      // Đối phương nhận khung yêu cầu hiển lộ bài ASK_HOACONG_REVEAL
      expect(state.priorityStack.peek().type).toBe('ASK_HOACONG_REVEAL');
      expect(state.priorityStack.peek().currentActorId).toBe(1);
    });
  });

  // ==========================================
  // PHẦN 3: LINH GIÁM (DÙNG BÀI ĐEN LÀM HÓA GIẢI)
  // ==========================================
  describe('3. Linh Giám: Sử Dụng Bài Đen Làm [Hóa Giải]', () => {
    it('Rùa Vàng dùng lá bài Đen bất kỳ để Hóa Giải cẩm nang qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Rùa Vàng chỉ có 1 lá bài Đen (Chém Đen)
      const blackCard = { id: 'black_slash_negate', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      p0.hand = [blackCard];

      // p1 phát động Cướp Bài lên Rùa Vàng
      const stealCard = { id: 'steal_card', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      p1.hand = [stealCard];

      TrickRules.playSteal(state, 1, 0, stealCard);
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');

      // Rùa Vàng phản hồi bằng lá bài Đen làm Hóa Giải
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: { cardId: 'black_slash_negate' }
      });

      // Số lần Hóa Giải tăng lên 1 (Hóa Giải thành công cẩm nang)
      expect(state.priorityStack.peek().context.negateCount).toBe(1);
      expect(p0.hand.length).toBe(0); // Lá bài đen đã bị tiêu hao
    });
  });

  // ==========================================
  // PHẦN 4: TRÍ TUỆ NHÂN TẠO BOT (BOT BRAIN)
  // ==========================================
  describe('4. Trí Tuệ Nhân Tạo Bot (Bot Brain v4)', () => {
    it('Bot Rùa Vàng tự động bật useBagua khi đối mặt ASK_DODGE', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      const dodgeFrame = {
        type: 'ASK_DODGE',
        sourceId: 1,
        targetId: 0,
        context: { baguaAttempted: false }
      };

      const reaction = BotBrain.decideReaction(state, 0, dodgeFrame);
      expect(reaction.type).toBe('ACTION_REACT');
      expect(reaction.useBagua).toBe(true);
    });

    it('Bot Rùa Vàng tự động dùng lá bài Đen để Hóa Giải cẩm nang gây hại cho bản thân', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      // Rùa Vàng có lá bài Đen (không có Hóa Giải thật)
      const blackCard = { id: 'bot_black_card', name: 'Né', type: 'dodge', suit: 'club', color: 'black' };
      p0.hand = [blackCard];

      const negateFrame = {
        type: 'ASK_NEGATE',
        sourceId: 1,
        targetId: 0,
        context: {
          card: { name: 'Quyết Đấu', type: 'trick' },
          negateCount: 0
        }
      };

      const reaction = BotBrain.decideReaction(state, 0, negateFrame);
      expect(reaction.type).toBe('ACTION_REACT');
      expect(reaction.negateCard).not.toBeNull();
      expect(reaction.negateCard.id).toBe('bot_black_card');
    });
  });
});
