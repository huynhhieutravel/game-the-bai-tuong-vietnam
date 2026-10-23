import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { GameInvariants } from '../../core/Invariants.js';

describe('Vòng 6: Mượn Đao Giết Người, Cướp/Tước Đa Vùng, Hắc Thuẫn & Rượu Hấp Hối', () => {
  let state;

  beforeEach(() => {
    state = new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0 (Borrower)',
          hp: 4,
          maxHp: 4,
          isAlive: true,
          hand: [],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          turnStats: { slashCount: 0 }
        },
        {
          id: 1,
          name: 'Player 1 (Target A)',
          hp: 3,
          maxHp: 4,
          isAlive: true,
          hand: [],
          equipment: { weapon: { id: 'w1', name: 'Thanh Long Đao', range: 3 }, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          turnStats: { slashCount: 0 }
        },
        {
          id: 2,
          name: 'Player 2 (Target B)',
          hp: 4,
          maxHp: 4,
          isAlive: true,
          hand: [],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          turnStats: { slashCount: 0 }
        }
      ],
      drawPile: [
        { id: 'c1', name: 'Chém', type: 'slash', suit: 'heart', color: 'red', rank: 7 },
        { id: 'c2', name: 'Né', type: 'dodge', suit: 'diamond', color: 'red', rank: 2 }
      ],
      discardPile: [],
      initialTotalCards: 4
    });
  });

  describe('1. Mượn Đao Giết Người (Borrow Sword)', () => {
    it('Lỗi khi mượn đao từ người không có vũ khí', () => {
      const card = { id: 'bd_1', name: 'Mượn Đao', type: 'trick' };
      state.getPlayer(0).hand.push(card);
      state.getPlayer(1).equipment.weapon = null;

      expect(() => {
        TrickRules.playBorrowSword(state, 0, 1, 2, card);
      }).toThrow(/không có vũ khí để mượn đao/);
    });

    it('Mục tiêu A đồng ý xuất Chém lên Mục tiêu B', () => {
      const borrowCard = { id: 'bd_1', name: 'Mượn Đao', type: 'trick' };
      const slashCard = { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'spade', rank: 5 };
      state.getPlayer(0).hand.push(borrowCard);
      state.getPlayer(1).hand.push(slashCard);

      TrickRules.playBorrowSword(state, 0, 1, 2, borrowCard);

      // Bỏ qua hỏi Hóa Giải
      state.priorityStack.pop(); // ASK_NEGATE
      // Tự động execute effect Mượn Đao
      TrickRules._executeTrickEffect(state, 0, [1, 2], borrowCard, { secondTargetId: 2 });

      expect(state.priorityStack.peek().type).toBe('ASK_BORROW_SLASH');

      // Player 1 ra Chém tấn công Player 2
      const result = TrickRules.respondBorrowSlash(state, 1, slashCard);
      expect(result.slashed).toBe(true);

      // Kiểm tra Player 2 bị yêu cầu Né
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(2);
    });

    it('Mục tiêu A không Chém -> Bị Borrower tịch thu vũ khí về tay', () => {
      const borrowCard = { id: 'bd_2', name: 'Mượn Đao', type: 'trick' };
      state.getPlayer(0).hand.push(borrowCard);

      TrickRules.playBorrowSword(state, 0, 1, 2, borrowCard);
      state.priorityStack.pop(); // Hóa Giải
      TrickRules._executeTrickEffect(state, 0, [1, 2], borrowCard, { secondTargetId: 2 });

      expect(state.getPlayer(1).equipment.weapon).toBeTruthy();

      // Player 1 từ chối đánh Chém
      const result = TrickRules.respondBorrowSlash(state, 1, null);
      expect(result.surrenderedWeapon).toBe(true);
      expect(result.weapon.name).toBe('Thanh Long Đao');

      // Player 1 mất vũ khí, Player 0 nhận vũ khí trên tay
      expect(state.getPlayer(1).equipment.weapon).toBeNull();
      expect(state.getPlayer(0).hand.some(c => c.name === 'Thanh Long Đao')).toBe(true);
    });
  });

  describe('2. Cướp Bài & Tước Bài Đa Vùng (Equipment & Judgement)', () => {
    it('Cướp bài từ trang bị khi mục tiêu hết bài trên tay', () => {
      const stealCard = { id: 'steal_1', name: 'Cướp Bài', type: 'trick' };
      state.getPlayer(0).hand.push(stealCard);
      state.getPlayer(1).hand = []; // Hết bài tay
      state.getPlayer(1).equipment.weapon = { id: 'weapon_stolen', name: 'Liên Nỏ' };

      TrickRules.playSteal(state, 0, 1, stealCard);
      state.priorityStack.pop(); // Hóa giải
      TrickRules._executeTrickEffect(state, 0, [1], stealCard, {});

      expect(state.getPlayer(1).equipment.weapon).toBeNull();
      expect(state.getPlayer(0).hand.some(c => c.name === 'Liên Nỏ')).toBe(true);
    });

    it('Tước bài trang bị Bạch Ngân giúp mục tiêu hồi 1 HP', () => {
      const disCard = { id: 'dis_1', name: 'Tước Bài', type: 'trick' };
      state.getPlayer(0).hand.push(disCard);
      state.getPlayer(1).hp = 2; // Đang mất máu
      state.getPlayer(1).hand = [];
      state.getPlayer(1).equipment.armor = { id: 'bach_ngan_armor', name: 'Bạch Ngân' };

      TrickRules.playDismantle(state, 0, 1, disCard);
      state.priorityStack.pop(); // Hóa giải
      TrickRules._executeTrickEffect(state, 0, [1], disCard, { targetCardId: 'bach_ngan_armor' });

      expect(state.getPlayer(1).equipment.armor).toBeNull();
      expect(state.getPlayer(1).hp).toBe(3); // Hồi 1 HP!
      expect(state.discardPile.some(c => c.name === 'Bạch Ngân')).toBe(true);
    });

    it('Tước hoặc Cướp cẩm nang trì hoãn trong khu phán xét của mục tiêu', () => {
      const stealCard = { id: 'steal_2', name: 'Cướp Bài', type: 'trick' };
      state.getPlayer(0).hand.push(stealCard);
      state.getPlayer(1).hand = [];
      state.getPlayer(1).equipment = {};
      state.getPlayer(1).judgementArea = [{ id: 'hon_loan_target', name: 'Hỗn Loạn', type: 'trick' }];

      TrickRules.playSteal(state, 0, 1, stealCard);
      state.priorityStack.pop();
      TrickRules._executeTrickEffect(state, 0, [1], stealCard, {});

      expect(state.getPlayer(1).judgementArea.length).toBe(0);
      expect(state.getPlayer(0).hand.some(c => c.name === 'Hỗn Loạn')).toBe(true);
    });
  });

  describe('3. Hắc Thuẫn & Giới Hạn Rượu Hấp Hối', () => {
    it('Hắc Thuẫn miễn nhiễm hoàn toàn với Chém màu Đen (Spade / Club)', () => {
      const blackSlash = { id: 'black_s', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      state.getPlayer(0).hand.push(blackSlash);
      state.getPlayer(1).equipment.armor = { id: 'hac_thuan_card', name: 'Hắc Thuẫn' };

      const res = CombatRules.playSlash(state, 0, 1, blackSlash);
      expect(res.success).toBe(false);
      expect(res.reason).toBe('ARMOR_IMMUNE');
      // Không đẩy ASK_DODGE
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('Hắc Thuẫn KHÔNG miễn nhiễm với Chém màu Đỏ (Heart / Diamond)', () => {
      const redSlash = { id: 'red_s', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      state.getPlayer(0).hand.push(redSlash);
      state.getPlayer(1).equipment.armor = { id: 'hac_thuan_card', name: 'Hắc Thuẫn' };

      CombatRules.playSlash(state, 0, 1, redSlash);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });

    it('Rượu khi hấp hối: Chỉ được tự cứu chính mình, cấm cứu người khác', () => {
      const wineCard = { id: 'wine_1', name: 'Rượu', type: 'wine' };
      state.getPlayer(0).hand.push(wineCard);
      state.getPlayer(1).hp = 0; // Target hấp hối

      state.priorityStack.push({
        type: 'ASK_PEACH',
        sourceId: null,
        targetId: 1,
        priorityQueue: [0, 1],
        currentActorId: 0,
        context: {}
      });

      // Player 0 cố tình dùng Rượu cứu Player 1 -> Bị từ chối
      expect(() => {
        CombatRules.respondPeach(state, 0, wineCard);
      }).toThrow(/Rượu chỉ được dùng để tự cứu chính mình khi hấp hối/);

      // Nếu Player 1 tự dùng Rượu cứu chính mình -> Hợp lệ
      state.getPlayer(1).hand.push(wineCard);
      const res = CombatRules.respondPeach(state, 1, wineCard);
      expect(res.saved).toBe(true);
      expect(state.getPlayer(1).hp).toBe(1);
    });
  });
});
