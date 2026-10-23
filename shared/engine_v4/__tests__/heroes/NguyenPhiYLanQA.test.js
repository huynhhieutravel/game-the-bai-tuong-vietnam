import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Nguyên Phi Ỷ Lan (nguyen_phi_y_lan) — Thính Chính & Phật Tâm', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Nguyên Phi Ỷ Lan',
          heroId: 'nguyen_phi_y_lan',
          faction: 'ha',
          gender: 'female',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: ['thinh_chinh', 'phat_tam'],
          hand: [
            { id: 'black_slash', name: 'Chém Đen', type: 'slash', suit: 'spade', color: 'black', rank: 7 },
            { id: 'red_slash', name: 'Chém Đỏ', type: 'slash', suit: 'heart', color: 'red', rank: 8 }
          ]
        },
        {
          id: 1,
          name: 'Kẻ Tấn Công',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: [
            { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red', rank: 5 }
          ]
        }
      ],
      drawPile: [],
      discardPile: [],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    return state;
  };

  describe('1. Thính Chính (Dùng bài Đen làm Né)', () => {
    it('Sử dụng lá bài Đen bất kỳ trên tay làm [Né] thành công để hóa giải đòn Chém', () => {
      const state = setupGame();
      const p1 = state.getPlayer(1);
      const yLan = state.getPlayer(0);

      // P1 Chém Y Lan
      CombatRules.playSlash(state, 1, 0, p1.hand[0]);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // Y Lan dùng lá Chém Đen trên tay làm lá Né
      const blackCard = yLan.hand.find(c => c.id === 'black_slash');
      const res = CombatRules.respondDodge(state, 0, blackCard);

      expect(res.dodged).toBe(true);
      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(yLan.hand.some(c => c.id === 'black_slash')).toBe(false);
      expect(state.discardPile.some(c => c.id === 'black_slash')).toBe(true);
      expect(yLan.hp).toBe(3); // Không mất máu
    });

    it('Không thể dùng lá bài Đỏ không phải Né để làm Né', () => {
      const state = setupGame();
      const p1 = state.getPlayer(1);
      const yLan = state.getPlayer(0);

      CombatRules.playSlash(state, 1, 0, p1.hand[0]);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      const redCard = yLan.hand.find(c => c.id === 'red_slash');
      expect(() => {
        CombatRules.respondDodge(state, 0, redCard);
      }).toThrow(/không phải là lá \[Né\] hợp lệ/);
    });
  });

  describe('2. Phật Tâm (Phán xét thu bài Đen liên tiếp tại Pha Chuẩn bị)', () => {
    it('Phán xét rút được các lá Đen liên tiếp và dừng lại khi gặp lá Đỏ, thu tất cả bài Đen về tay', () => {
      const state = setupGame();
      const yLan = state.getPlayer(0);

      // Trong GameState, drawCardFromDeck() lấy từ cuối mảng (pop)
      // Muốn rút: b1 (Đen) -> b2 (Đen) -> r1 (Đỏ, dừng) và b3 còn lại trong deck
      // Thứ tự mảng từ đáy đến đỉnh: [b3_con_lai, r1_do, b2_den, b1_den]
      const b3 = { id: 'b3', name: 'Lá Đen 3', suit: 'spade', color: 'black' };
      const r1 = { id: 'r1', name: 'Lá Đỏ 1', suit: 'heart', color: 'red' };
      const b2 = { id: 'b2', name: 'Lá Đen 2', suit: 'club', color: 'black' };
      const b1 = { id: 'b1', name: 'Lá Đen 1', suit: 'spade', color: 'black' };

      state.drawPile = [b3, r1, b2, b1];
      const initialHandLen = yLan.hand.length;

      // Trigger BEGIN_PHASE
      globalHeroRegistry.dispatchTrigger('BEGIN_PHASE', { sourceId: 0 }, state);

      // Y Lan thu được 2 lá Đen (b1, b2) về tay
      expect(yLan.hand.length).toBe(initialHandLen + 2);
      expect(yLan.hand.some(c => c.id === 'b1')).toBe(true);
      expect(yLan.hand.some(c => c.id === 'b2')).toBe(true);

      // Lá Đỏ r1 vào discardPile
      expect(state.discardPile.some(c => c.id === 'r1')).toBe(true);

      // Lá b3 vẫn còn trong drawPile
      expect(state.drawPile.some(c => c.id === 'b3')).toBe(true);
    });

    it('Dừng ngay lập tức nếu lá phán xét đầu tiên là Đỏ, không thu được lá bài nào', () => {
      const state = setupGame();
      const yLan = state.getPlayer(0);

      // Đỉnh deck là r_first (rút trước bằng pop), đáy deck là b_after (còn lại)
      const b_after = { id: 'b_after', name: 'Lá Đen Sau', suit: 'spade', color: 'black' };
      const r_first = { id: 'r_first', name: 'Lá Đỏ Đầu', suit: 'diamond', color: 'red' };

      state.drawPile = [b_after, r_first];
      const initialHandLen = yLan.hand.length;

      globalHeroRegistry.dispatchTrigger('BEGIN_PHASE', { sourceId: 0 }, state);

      expect(yLan.hand.length).toBe(initialHandLen);
      expect(state.discardPile.some(c => c.id === 'r_first')).toBe(true);
      expect(state.drawPile.some(c => c.id === 'b_after')).toBe(true);
    });
  });
});
