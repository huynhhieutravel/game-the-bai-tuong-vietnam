import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';

describe('CombatRules v4 (Chém, Né, Hấp hối, Tử trận)', () => {
  const createMockCombatGame = () => {
    const drawPile = Array.from({ length: 30 }, (_, i) => ({
      id: `card_${i}`,
      name: `Thẻ ${i}`,
      type: 'basic'
    }));

    const gameState = new GameState({
      players: [
        { id: 0, name: 'Chủ Công', isLord: true, identity: 'lord', hp: 4, maxHp: 4, hand: [] },
        { id: 1, name: 'Phản Tặc', isLord: false, identity: 'rebel', hp: 1, maxHp: 3, hand: [] },
        { id: 2, name: 'Trung Thần', isLord: false, identity: 'loyalist', hp: 2, maxHp: 3, hand: [] }
      ],
      drawPile,
      currentTurnPlayerId: 0
    });

    return gameState;
  };

  it('xử lý Chém trúng và mục tiêu đánh lá Né thành công', () => {
    const state = createMockCombatGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    const slashCard = { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
    p0.hand.push(slashCard);

    // p0 Chém p1
    CombatRules.playSlash(state, 0, 1, slashCard);
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(p0.hand.length).toBe(0); // Đã trừ bài Chém

    // p1 phản hồi bằng lá Né
    const dodgeCard = { id: 'dodge_1', name: 'Né', type: 'dodge' };
    p1.hand.push(dodgeCard);

    const res = CombatRules.respondDodge(state, 1, dodgeCard);
    expect(res.dodged).toBe(true);
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p1.hp).toBe(1); // Máu không đổi
  });

  it('mục tiêu không Né -> nhận 1 sát thương', () => {
    const state = createMockCombatGame();
    const p0 = state.getPlayer(0);
    const p2 = state.getPlayer(2); // HP ban đầu = 2

    const slashCard = { id: 'slash_2', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red' };
    p0.hand.push(slashCard);

    CombatRules.playSlash(state, 0, 2, slashCard);
    // p2 chọn không Né (pass)
    const res = CombatRules.respondDodge(state, 2, null);
    expect(res.dodged).toBe(false);
    expect(p2.hp).toBe(1); // Bị trừ 1 máu
  });

  it('Giáp Hắc Thuẫn miễn nhiễm hoàn toàn Chém màu Đen nhưng bị Chém Đỏ đánh trúng', () => {
    const state = createMockCombatGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    // p1 trang bị Hắc Thuẫn
    p1.equipment.armor = { id: 'black_shield', name: 'Hắc Thuẫn' };

    // 1. Chém Đen (spade) -> Bị giáp chặn ngay lập tức
    const blackSlash = { id: 'slash_black', name: 'Chém Đen', type: 'slash', suit: 'spade', color: 'black' };
    p0.hand.push(blackSlash);
    const res1 = CombatRules.playSlash(state, 0, 1, blackSlash);
    expect(res1.reason).toBe('ARMOR_IMMUNE');
    expect(state.priorityStack.isEmpty()).toBe(true);

    // 2. Chém Đỏ (heart) -> Xuyên qua giáp, hỏi Né bình thường
    const redSlash = { id: 'slash_red', name: 'Chém Đỏ', type: 'slash', suit: 'heart', color: 'red' };
    p0.hand.push(redSlash);
    p0.turnStats.slashCount = 0; // reset để test
    const res2 = CombatRules.playSlash(state, 0, 1, redSlash);
    expect(res2.success).toBe(true);
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
  });

  it('HP về 0 kích hoạt Trạng thái Hấp hối và Vòng cứu viện bằng Đào', () => {
    const state = createMockCombatGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1); // HP = 1
    const p2 = state.getPlayer(2);

    const slashCard = { id: 'slash_lethal', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
    p0.hand.push(slashCard);

    CombatRules.playSlash(state, 0, 1, slashCard);
    // p1 không né -> HP tụt xuống 0 -> Hấp hối!
    CombatRules.respondDodge(state, 1, null);

    expect(p1.hp).toBe(0);
    expect(state.priorityStack.peek().type).toBe('ASK_PEACH');
    expect(state.priorityStack.peek().currentActorId).toBe(1); // Hỏi từ chính người hấp hối trước

    // p1 không có Đào -> chuyển sang p2
    const pass1 = CombatRules.respondPeach(state, 1, null);
    expect(pass1.saved).toBe(false);
    expect(state.priorityStack.peek().currentActorId).toBe(2);

    // p2 dùng Đào cứu p1!
    const peachCard = { id: 'peach_1', name: 'Đào', type: 'peach' };
    p2.hand.push(peachCard);
    const saveRes = CombatRules.respondPeach(state, 2, peachCard);
    expect(saveRes.saved).toBe(true);
    expect(p1.hp).toBe(1); // HP hồi phục lên 1, thoát chết!
    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('không ai cứu người hấp hối -> Tử trận và thưởng rút 3 bài khi giết Phản Tặc', () => {
    const state = createMockCombatGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1); // Phản tặc, HP = 1

    p1.hand = [{ id: 'loot_1' }, { id: 'loot_2' }];
    p1.equipment.weapon = { id: 'some_weapon' };

    // Sát thương trí mạng từ p0 (Chủ Công) lên p1 (Phản Tặc)
    CombatRules.applyDamage(state, 0, 1, 1, 'fatal_strike');
    expect(p1.hp).toBe(0);

    // Không ai cứu: p1 pass -> p2 pass -> p0 pass
    CombatRules.respondPeach(state, 1, null);
    CombatRules.respondPeach(state, 2, null);
    const deadRes = CombatRules.respondPeach(state, 0, null);

    expect(deadRes.dead).toBe(true);
    expect(p1.isAlive).toBe(false);
    expect(p1.hand.length).toBe(0); // Bị thu hồi toàn bộ bài
    expect(p1.equipment.weapon).toBe(null);

    // Thưởng cho kẻ kết liễu Phản Tặc (p0): Rút 3 lá bài!
    expect(p0.hand.length).toBe(3);
  });
});
