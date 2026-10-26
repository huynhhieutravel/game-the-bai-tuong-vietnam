import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { TargetResolverV4, canPlayCard, getAvailableTargets } from '../../rules/TargetResolverV4.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CardDeck } from '../../cards/CardDeck.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { GameInvariants } from '../../core/Invariants.js';

describe('QA Toàn Diện Thẻ Bài Cơ Bản (Basic Cards QA: Chém, Né, Đào, Rượu)', () => {
  const createMockGameState = (customPlayers = null) => {
    const drawPile = Array.from({ length: 50 }, (_, i) => ({
      id: `c_draw_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: i % 2 === 0 ? 'heart' : 'spade',
      rank: '8'
    }));

    const players = customPlayers || [
      { id: 0, name: 'Người chơi 0', hp: 3, maxHp: 4, gender: 'male', hand: [], faction: 'lac', revealedHeroes: [true, true], equipment: {}, turnStats: { slashCount: 0, wineCount: 0 } },
      { id: 1, name: 'Người chơi 1', hp: 3, maxHp: 3, gender: 'female', hand: [], faction: 'viet', revealedHeroes: [true, true], equipment: {}, turnStats: { slashCount: 0, wineCount: 0 } },
      { id: 2, name: 'Người chơi 2', hp: 3, maxHp: 3, gender: 'male', hand: [], faction: 'ha', revealedHeroes: [true, true], equipment: {}, turnStats: { slashCount: 0, wineCount: 0 } },
      { id: 3, name: 'Người chơi 3', hp: 3, maxHp: 3, gender: 'female', faction: 'son', revealedHeroes: [true, true], equipment: {}, turnStats: { slashCount: 0, wineCount: 0 } }
    ];

    const state = new GameState({
      players,
      drawPile,
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });

    return state;
  };

  // ==========================================
  // PHẦN 1: BỘ BÀI VÀ PHÂN BỔ THẺ CƠ BẢN
  // ==========================================
  describe('1. Phân bổ Thẻ Bài Cơ Bản trong Standard Deck', () => {
    it('bộ bài tiêu chuẩn chứa chính xác 58 lá bài cơ bản (30 Chém, 15 Né, 8 Đào, 5 Rượu)', () => {
      const deck = CardDeck.getStandardDeck();
      expect(deck.length).toBe(106);

      const slashes = deck.filter(c => c.name === 'Chém' || c.type === 'slash');
      const dodges = deck.filter(c => c.name === 'Né' || c.type === 'dodge');
      const peaches = deck.filter(c => c.name === 'Đào' || c.type === 'peach');
      const wines = deck.filter(c => c.name === 'Rượu' || c.type === 'wine');

      expect(slashes.length).toBe(30);
      expect(dodges.length).toBe(15);
      expect(peaches.length).toBe(8);
      expect(wines.length).toBe(5);
      expect(slashes.length + dodges.length + peaches.length + wines.length).toBe(58);
    });
  });

  // ==========================================
  // PHẦN 2: THẺ CHÉM (SLASH)
  // ==========================================
  describe('2. Thẻ Chém (Slash / 30 lá)', () => {
    it('đánh 1 lá Chém hợp lệ: trừ bài trên tay, tạo frame ASK_DODGE', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash', suit: 'heart', rank: '7', color: 'red' };
      p0.hand.push(slash);

      CombatRules.playSlash(state, 0, 1, slash);

      expect(p0.hand.length).toBe(0);
      expect(p0.turnStats.slashCount).toBe(1);
      const frame = state.priorityStack.peek();
      expect(frame.type).toBe('ASK_DODGE');
      expect(frame.sourceId).toBe(0);
      expect(frame.targetId).toBe(1);
      expect(frame.context.requiredDodges).toBe(1);
      expect(frame.context.damageAmount).toBe(1);
    });

    it('giới hạn 1 Chém/lượt: đánh lá Chém thứ 2 bị ném lỗi InvariantViolation', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const slash1 = { id: 'c_slash_1', name: 'Chém', type: 'slash', suit: 'heart', rank: '7' };
      const slash2 = { id: 'c_slash_2', name: 'Chém', type: 'slash', suit: 'diamond', rank: '8' };
      p0.hand.push(slash1, slash2);

      CombatRules.playSlash(state, 0, 1, slash1);
      state.priorityStack.pop(); // Giải phóng frame để tiếp tục

      expect(() => {
        CombatRules.playSlash(state, 0, 1, slash2);
      }).toThrow(/INVARIANT_VIOLATION/);

      // Đồng thời canPlayCard trả về valid: false
      const check = canPlayCard(state, 0, 'Chém', slash2.id);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('dùng Chém');
    });

    it('trang bị Liên Nỏ cho phép Chém vô hạn lần trong lượt', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'crossbow', name: 'Liên Nỏ', range: 1 };

      const slashes = [
        { id: 'c_slash_1', name: 'Chém', type: 'slash' },
        { id: 'c_slash_2', name: 'Chém', type: 'slash' },
        { id: 'c_slash_3', name: 'Chém', type: 'slash' }
      ];
      p0.hand.push(...slashes);

      // Chém 3 lần liên tiếp không lỗi
      CombatRules.playSlash(state, 0, 1, slashes[0]);
      state.priorityStack.pop();
      CombatRules.playSlash(state, 0, 1, slashes[1]);
      state.priorityStack.pop();
      CombatRules.playSlash(state, 0, 1, slashes[2]);
      state.priorityStack.pop();

      expect(p0.turnStats.slashCount).toBe(3);
    });

    it('khoảng cách & tầm đánh: không thể Chém người ngoài cự ly (khoảng cách 2 khi tầm đánh 1)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      p0.hand.push(slash);

      // 4 người chơi: 0 -> 2 có khoảng cách là 2. p0 tầm đánh 1.
      expect(() => {
        CombatRules.playSlash(state, 0, 2, slash);
      }).toThrow(/ngoài tầm đánh/);

      const targets = getAvailableTargets(state, 0, 'Chém', slash.id);
      expect(targets).toEqual([1, 3]); // Chỉ có hàng xóm cự ly 1
    });

    it('trang bị Ngựa Tấn Công (-1) hoặc Vũ khí tầm 2 cho phép Chém mục tiêu cự ly 2', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.equipment.horse_attack = { id: 'h_atk', name: 'Ngựa Chiến (-1)' };
      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      p0.hand.push(slash);

      expect(RangeSystem.calculateDistance(p0, state.getPlayer(2), state.getAlivePlayers())).toBe(1);
      expect(() => {
        CombatRules.playSlash(state, 0, 2, slash);
      }).not.toThrow();
    });

    it('Lang Liêu Đạm Bạc khi hết bài trên tay thì miễn nhiễm Chém', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.skills = ['dam_bac'];
      p1.hand = []; // Hết bài trên tay

      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      p0.hand.push(slash);

      expect(() => {
        CombatRules.playSlash(state, 0, 1, slash);
      }).toThrow(/Đạm Bạc/);
    });

    it('giáp Hắc Thuẫn miễn nhiễm hoàn toàn Chém màu Đen (♠, ♣) nhưng nhận Chém màu Đỏ (♥, ♦)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.equipment.armor = { id: 'black_shield', name: 'Hắc Thuẫn' };

      const blackSlash = { id: 'c_slash_b', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      const redSlash = { id: 'c_slash_r', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      p0.hand.push(blackSlash, redSlash);

      // Chém đen -> Bị Hắc Thuẫn chặn
      const resBlack = CombatRules.playSlash(state, 0, 1, blackSlash);
      expect(resBlack.success).toBe(false);
      expect(resBlack.reason).toBe('ARMOR_IMMUNE');
      expect(state.priorityStack.isEmpty()).toBe(true);

      // Chém đỏ -> Đi vào frame ASK_DODGE bình thường
      p0.turnStats.slashCount = 0; // reset để chém tiếp
      const resRed = CombatRules.playSlash(state, 0, 1, redSlash);
      expect(resRed.success).toBe(true);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });

    it('giáp Bạch Ngân giảm mọi sát thương dồn (kể cả Chém uống Rượu 2 sát thương) xuống tối đa 1 HP', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.equipment.armor = { id: 'bach_ngan', name: 'Bạch Ngân' };
      p1.hp = 3;

      // p0 uống Rượu -> wineActive = true
      p0.temporaryFlags.wineActive = true;
      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash', suit: 'heart' };
      p0.hand.push(slash);

      CombatRules.playSlash(state, 0, 1, slash);
      // p1 không né
      CombatRules.respondDodge(state, 1, null);

      // Nhờ Bạch Ngân, chỉ mất 1 HP thay vì 2 HP!
      expect(p1.hp).toBe(2);
    });

    it('vũ khí Kỳ Lân Cung bắn hạ Ngựa phòng thủ của mục tiêu khi Chém trúng', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p0.equipment.weapon = { id: 'ky_lan_cung', name: 'Kỳ Lân Cung', range: 5 };
      p1.equipment.horse_defense = { id: 'h_def', name: 'Ngựa Thần (+1)' };

      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      p0.hand.push(slash);

      CombatRules.playSlash(state, 0, 1, slash);
      CombatRules.respondDodge(state, 1, null); // Nhận sát thương

      // Ngựa phòng thủ bị bắn rơi xuống discardPile
      expect(p1.equipment.horse_defense).toBeNull();
      expect(state.discardPile.some(c => c.id === 'h_def')).toBe(true);
    });

    it('vũ khí Rìu Đá: đối thủ Né, chủ công bỏ 2 lá bài để bắt buộc Chém trúng đích', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p0.equipment.weapon = { id: 'riu_da', name: 'Rìu Đá', range: 3 };
      p0.hand.push(
        { id: 'c_slash_1', name: 'Chém', type: 'slash' },
        { id: 'c_card_a', name: 'Bài A' },
        { id: 'c_card_b', name: 'Bài B' }
      );
      p1.hand.push({ id: 'c_dodge_1', name: 'Né', type: 'dodge' });
      p1.hp = 3;

      CombatRules.playSlash(state, 0, 1, p0.hand[0]);
      // p1 né, chủ công chọn bỏ 2 bài c_card_a và c_card_b để xuyên phá
      const res = CombatRules.respondDodge(state, 1, p1.hand[0], { rockAxeCardIds: ['c_card_a', 'c_card_b'] });

      expect(res.penetrated).toBe(true);
      expect(p1.hp).toBe(2); // Vẫn bị mất 1 máu
      expect(p0.hand.length).toBe(0); // 2 lá bài trên tay p0 đã bị bỏ
    });

    it('lá bài không phải Chém đưa vào playSlash sẽ ném ra Exception', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const fakeCard = { id: 'fake_1', name: 'Né', type: 'dodge' };
      p0.hand.push(fakeCard);

      expect(() => {
        CombatRules.playSlash(state, 0, 1, fakeCard);
      }).toThrow(/không phải là lá \[Chém\] hợp lệ/);
    });
  });

  // ==========================================
  // PHẦN 3: THẺ NÉ (DODGE)
  // ==========================================
  describe('3. Thẻ Né (Dodge / 15 lá)', () => {
    it('không thể chủ động đánh lá Né trong Pha Hành Động', () => {
      const state = createMockGameState();
      const check = canPlayCard(state, 0, 'Né', 'c_dodge_1');
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('phản ứng');
    });

    it('phản hồi lá Né hợp lệ giải trừ thành công cú Chém', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      const dodge = { id: 'c_dodge_1', name: 'Né', type: 'dodge' };
      p0.hand.push(slash);
      p1.hand.push(dodge);
      p1.hp = 3;

      CombatRules.playSlash(state, 0, 1, slash);
      const res = CombatRules.respondDodge(state, 1, dodge);

      expect(res.dodged).toBe(true);
      expect(p1.hp).toBe(3); // Máu bảo toàn
      expect(p1.hand.length).toBe(0);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('đưa lá bài không phải Né vào respondDodge sẽ ném lỗi Exception', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      const fakeCard = { id: 'c_peach_1', name: 'Đào', type: 'peach' };
      p0.hand.push(slash);
      p1.hand.push(fakeCard);

      CombatRules.playSlash(state, 0, 1, slash);
      expect(() => {
        CombatRules.respondDodge(state, 1, fakeCard);
      }).toThrow(/không phải là lá \[Né\] hợp lệ/);
    });

    it('phản ứng Phá Quân (Nguyễn Xí): đòi hỏi 2 lá Né mới tránh được sát thương', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p0.skills = ['pha_quan_nguyen_xi']; // Kỹ năng đòi 2 Né

      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      const dodge1 = { id: 'c_dodge_1', name: 'Né', type: 'dodge' };
      const dodge2 = { id: 'c_dodge_2', name: 'Né', type: 'dodge' };
      p0.hand.push(slash);
      p1.hand.push(dodge1, dodge2);
      p1.hp = 3;

      CombatRules.playSlash(state, 0, 1, slash);
      expect(state.priorityStack.peek().context.requiredDodges).toBe(2);

      // Đánh lá Né thứ nhất -> Vẫn chưa xong, chờ lá Né thứ hai
      const res1 = CombatRules.respondDodge(state, 1, dodge1);
      expect(res1.dodged).toBe(false);
      expect(res1.pendingMoreDodges).toBe(true);
      expect(state.priorityStack.peek().context.dodgesProvided).toBe(1);

      // Đánh lá Né thứ hai -> Né thành công hoàn toàn
      const res2 = CombatRules.respondDodge(state, 1, dodge2);
      expect(res2.dodged).toBe(true);
      expect(p1.hp).toBe(3);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('Bát Quái Trận: phán xét ĐỎ tính là 1 Né, phán xét ĐEN tính là thất bại', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.equipment.armor = { id: 'bat_quai', name: 'Bát Quái' };

      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      p0.hand.push(slash);

      // Chuẩn bị bài trên đỉnh chồng rút là lá ĐỎ
      state.drawPile.push({ id: 'c_red', name: 'Bài Đỏ', color: 'red', suit: 'heart' });
      CombatRules.playSlash(state, 0, 1, slash);

      // Kích hoạt phán xét Bát Quái
      const res = CombatRules.respondDodge(state, 1, null, { useBagua: true });
      expect(res.baguaSuccess).toBe(true);
      expect(res.dodged).toBe(true);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 4: THẺ ĐÀO (PEACH)
  // ==========================================
  describe('4. Thẻ Đào (Peach / 8 lá)', () => {
    it('Pha Hành Động: Người chơi bị thương dùng Đào hồi 1 HP (không vượt quá MaxHP)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.hp = 2;
      p0.maxHp = 3;
      const peach = { id: 'c_peach_1', name: 'Đào', type: 'peach' };
      p0.hand.push(peach);

      const dispatcher = new DispatcherV4(state);
      dispatcher.dispatch({ type: 'PLAY_CARD', playerId: 0, cardId: peach.id, targetId: 0 });

      expect(p0.hp).toBe(3);
      expect(p0.hand.length).toBe(0);
    });

    it('Pha Hành Động: Đầy máu không thể ăn Đào (canPlayCard trả về false)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.hp = 4;
      p0.maxHp = 4;
      const peach = { id: 'c_peach_1', name: 'Đào', type: 'peach' };
      p0.hand.push(peach);

      const check = canPlayCard(state, 0, 'Đào', peach.id);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('Máu đã đầy');
    });

    it('Trạng thái Hấp hối (Dying State): Bất kỳ người chơi nào cũng có thể dùng Đào để cứu', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);

      // p1 bị kéo máu về 0 (Hấp hối)
      p1.hp = 0;
      CombatRules.enterDyingState(state, 1, 0);

      expect(state.priorityStack.peek().type).toBe('ASK_PEACH');
      expect(state.priorityStack.peek().targetId).toBe(1);

      // p2 dùng Đào để cứu p1
      const peach = { id: 'c_peach_savior', name: 'Đào', type: 'peach' };
      p2.hand.push(peach);

      const res = CombatRules.respondPeach(state, 2, peach);
      expect(res.saved).toBe(true);
      expect(p1.hp).toBe(1); // Thoát hấp hối, HP về 1
      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(p2.hand.length).toBe(0);
    });

    it('người chơi bị sát thương dồn (HP = -1) cần 2 lá Đào mới thoát khỏi Hấp hối', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);
      const p3 = state.getPlayer(3);

      p1.hp = -1;
      CombatRules.enterDyingState(state, 1, 0);

      const peach1 = { id: 'c_p1', name: 'Đào', type: 'peach' };
      const peach2 = { id: 'c_p2', name: 'Đào', type: 'peach' };
      p2.hand.push(peach1);
      p3.hand.push(peach2);

      // Lá Đào 1 từ p2: đưa HP từ -1 lên 0 (vẫn đang hấp hối)
      const res1 = CombatRules.respondPeach(state, 2, peach1);
      expect(res1.saved).toBe(false);
      expect(res1.stillDying).toBe(true);
      expect(p1.hp).toBe(0);
      expect(state.priorityStack.peek().type).toBe('ASK_PEACH');

      // Lá Đào 2 từ p3: đưa HP từ 0 lên 1 (thoát hấp hối thành công)
      const res2 = CombatRules.respondPeach(state, 3, peach2);
      expect(res2.saved).toBe(true);
      expect(p1.hp).toBe(1);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('không ai cứu khi Hấp hối -> Người chơi Tử trận (Death), bài rơi vào discardPile', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      p1.hp = 0;
      p1.hand.push({ id: 'c_card_x', name: 'Bài X' });

      CombatRules.enterDyingState(state, 1, 0);

      // Tất cả người chơi lần lượt từ chối cứu (pass)
      CombatRules.respondPeach(state, 0, null);
      CombatRules.respondPeach(state, 1, null);
      CombatRules.respondPeach(state, 2, null);
      const resFinal = CombatRules.respondPeach(state, 3, null);

      expect(resFinal.dead).toBe(true);
      expect(p1.isAlive).toBe(false);
      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(state.discardPile.some(c => c.id === 'c_card_x')).toBe(true);
    });

    it('lá bài không phải Đào/Rượu đưa vào respondPeach sẽ ném ngoại lệ', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      p1.hp = 0;
      CombatRules.enterDyingState(state, 1, 0);

      const slash = { id: 'c_slash_invalid', name: 'Chém', type: 'slash' };
      expect(() => {
        CombatRules.respondPeach(state, 0, slash);
      }).toThrow(/không thể dùng để cứu người hấp hối/);
    });
  });

  // ==========================================
  // PHẦN 5: THẺ RƯỢU (WINE)
  // ==========================================
  describe('5. Thẻ Rượu (Wine / 5 lá)', () => {
    it('Pha Hành Động: Uống Rượu kích hoạt wineActive, đòn Chém tiếp theo gây 2 sát thương', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.hp = 3;

      const wine = { id: 'c_wine_1', name: 'Rượu', type: 'wine' };
      const slash = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      p0.hand.push(wine, slash);

      const dispatcher = new DispatcherV4(state);

      // p0 uống Rượu
      dispatcher.dispatch({ type: 'PLAY_CARD', playerId: 0, cardId: wine.id, targetId: 0 });
      expect(p0.temporaryFlags.wineActive).toBe(true);
      expect(p0.turnStats.wineCount).toBe(1);

      // p0 đánh Chém lên p1
      dispatcher.dispatch({ type: 'PLAY_CARD', playerId: 0, cardId: slash.id, targetId: 1 });
      const frame = state.priorityStack.peek();
      expect(frame.type).toBe('ASK_DODGE');
      expect(frame.context.damageAmount).toBe(2); // Sát thương 2 điểm!

      // p1 không né
      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(1); // 3 - 2 = 1 HP
      expect(p0.temporaryFlags.wineActive).toBe(false); // Cờ Rượu đã được giải phóng
    });

    it('giới hạn Luật Thép: Mỗi lượt trong Pha Hành Động chỉ được uống Rượu đúng 1 lần', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const wine1 = { id: 'c_wine_1', name: 'Rượu', type: 'wine' };
      const wine2 = { id: 'c_wine_2', name: 'Rượu', type: 'wine' };
      p0.hand.push(wine1, wine2);

      const dispatcher = new DispatcherV4(state);
      dispatcher.dispatch({ type: 'PLAY_CARD', playerId: 0, cardId: wine1.id, targetId: 0 });

      // Cố tình uống lá Rượu thứ hai trong cùng lượt -> Bị ném ngoại lệ
      expect(() => {
        dispatcher.dispatch({ type: 'PLAY_CARD', playerId: 0, cardId: wine2.id, targetId: 0, throwOnError: true });
      }).toThrow(/Mỗi lượt chỉ được uống Rượu 1 lần/);

      // canPlayCard cũng từ chối
      const check = canPlayCard(state, 0, 'Rượu', wine2.id);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('Mỗi lượt chỉ được uống Rượu 1 lần');
    });

    it('đòn Chém thứ 2 (với Liên Nỏ) sau khi cờ Rượu tiêu hao sẽ chỉ gây sát thương cơ bản (1 HP)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p0.equipment.weapon = { id: 'crossbow', name: 'Liên Nỏ', range: 1 };
      p1.hp = 3;

      const wine = { id: 'c_wine_1', name: 'Rượu', type: 'wine' };
      const slash1 = { id: 'c_slash_1', name: 'Chém', type: 'slash' };
      const slash2 = { id: 'c_slash_2', name: 'Chém', type: 'slash' };
      p0.hand.push(wine, slash1, slash2);

      const dispatcher = new DispatcherV4(state);

      // Uống Rượu + Chém 1 -> 2 sát thương
      dispatcher.dispatch({ type: 'PLAY_CARD', playerId: 0, cardId: wine.id, targetId: 0 });
      dispatcher.dispatch({ type: 'PLAY_CARD', playerId: 0, cardId: slash1.id, targetId: 1 });
      CombatRules.respondDodge(state, 1, null);
      expect(p1.hp).toBe(1);

      // Chém 2 (nhờ Liên Nỏ) -> Chỉ gây 1 sát thương cơ bản
      dispatcher.dispatch({ type: 'PLAY_CARD', playerId: 0, cardId: slash2.id, targetId: 1 });
      const frame2 = state.priorityStack.peek();
      expect(frame2.context.damageAmount).toBe(1);
    });

    it('Trạng thái Hấp hối: Người chơi hấp hối CÓ THỂ tự dùng Rượu cứu chính mình', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      p1.hp = 0;
      CombatRules.enterDyingState(state, 1, 0);

      const wine = { id: 'c_wine_self', name: 'Rượu', type: 'wine' };
      p1.hand.push(wine);

      // p1 dùng Rượu tự cứu chính mình
      const res = CombatRules.respondPeach(state, 1, wine);
      expect(res.saved).toBe(true);
      expect(p1.hp).toBe(1);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('Trạng thái Hấp hối: Người chơi KHÔNG THỂ dùng Rượu để cứu người khác (ném ngoại lệ)', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);
      p1.hp = 0;
      CombatRules.enterDyingState(state, 1, 0);

      const wine = { id: 'c_wine_other', name: 'Rượu', type: 'wine' };
      p2.hand.push(wine);

      // p2 cố dùng Rượu để cứu p1 -> Ném ngoại lệ
      expect(() => {
        CombatRules.respondPeach(state, 2, wine);
      }).toThrow(/Rượu chỉ được dùng để tự cứu chính mình khi hấp hối/);
    });

    it('DispatcherV4 quick-save (doSave: true) tự động chọn Rượu khi người hấp hối chỉ có Rượu', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      p1.hp = 0;
      CombatRules.enterDyingState(state, 1, 0);

      // p1 chỉ có Rượu trên tay, không có Đào
      const wine = { id: 'c_wine_quick', name: 'Rượu', type: 'wine' };
      p1.hand.push(wine);

      const dispatcher = new DispatcherV4(state);
      dispatcher.dispatch({ type: 'ACTION_REACT', playerId: 1, doSave: true });

      expect(p1.hp).toBe(1);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });
});
