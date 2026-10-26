import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { TrickRules } from '../../rules/TrickRules.js';

describe('TrickRules v4 (Cẩm Nang & Hóa Giải)', () => {
  const createMockTrickGame = () => {
    return new GameState({
      players: [
        { id: 0, name: 'Player 0', hp: 3, maxHp: 4, hand: [] },
        { id: 1, name: 'Player 1', hp: 2, maxHp: 4, hand: [] },
        { id: 2, name: 'Player 2', hp: 4, maxHp: 4, hand: [] }
      ],
      drawPile: [],
      currentTurnPlayerId: 0
    });
  };

  it('xử lý chuỗi Hóa Giải: 1 lần Hóa Giải (lẻ) làm hủy cẩm nang', () => {
    const state = createMockTrickGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    const stealCard = { id: 'steal_1', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
    p0.hand.push(stealCard);
    p1.hand.push({ id: 'target_card', name: 'Lá bài mục tiêu' });

    // p0 đánh Cướp Bài lên p1
    TrickRules.playTrick(state, 0, [1], stealCard);
    expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');

    // p1 dùng lá Hóa Giải
    const negateCard = { id: 'negate_1', name: 'Hóa Giải', type: 'trick' };
    p1.hand.push(negateCard);
    // Vòng hỏi: p0 -> pass
    TrickRules.respondNegate(state, 0, null);
    // p1 -> tung Hóa Giải
    TrickRules.respondNegate(state, 1, negateCard);

    // Tiếp tục hỏi người khác để xem có Hóa Giải lá Hóa Giải không:
    // p2 pass, p0 pass -> Hết vòng
    TrickRules.respondNegate(state, 2, null);
    const finalRes = TrickRules.respondNegate(state, 0, null);

    expect(finalRes.negated).toBe(true);
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p1.hand.length).toBe(1); // Bài của p1 không bị cướp
  });

  it('xử lý chuỗi Hóa Giải: 2 lần Hóa Giải (chẵn) -> Cẩm nang vẫn có hiệu lực', () => {
    const state = createMockTrickGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);

    const stealCard = { id: 'steal_2', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
    p0.hand.push(stealCard);
    p1.hand.push({ id: 'precious_card', name: 'Bảo vật' });

    TrickRules.playTrick(state, 0, [1], stealCard);

    // Lần 1: p1 Hóa Giải lá Cướp Bài
    const neg1 = { id: 'neg_1', name: 'Hóa Giải 1' };
    p1.hand.push(neg1);
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, neg1);

    // Lần 2: p0 Hóa Giải lá Hóa Giải của p1!
    const neg2 = { id: 'neg_2', name: 'Hóa Giải 2' };
    p0.hand.push(neg2);
    TrickRules.respondNegate(state, 2, null);
    TrickRules.respondNegate(state, 0, neg2);

    // Không ai hóa giải thêm: p1, p2 đều pass
    TrickRules.respondNegate(state, 1, null);
    const res = TrickRules.respondNegate(state, 2, null);

    expect(res.negated).toBe(false); // Cẩm nang có hiệu lực!
    expect(p0.hand.some(c => c.id === 'precious_card')).toBe(true); // p0 đã cướp được bài
  });

  it('xử lý trận Quyết Đấu (Duel) luân chuyển Chém qua lại', () => {
    const state = createMockTrickGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    const duelCard = { id: 'duel_1', idKey: 'quyet_dau', name: 'Quyết Đấu', type: 'trick' };
    p0.hand.push(duelCard);

    // p0 đánh Quyết Đấu lên p1
    TrickRules.playTrick(state, 0, [1], duelCard);

    // Cả 3 người chơi đều bỏ qua Hóa Giải
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, null);
    TrickRules.respondNegate(state, 2, null);

    // Quyết Đấu bắt đầu! Target (p1) phải ra Chém trước
    expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');
    expect(state.priorityStack.peek().currentActorId).toBe(1);

    // p1 ra Chém
    const slash1 = { id: 's1', type: 'slash', name: 'Chém 1' };
    p1.hand.push(slash1);
    const turn1 = TrickRules.respondDuel(state, 1, slash1);
    expect(turn1.continued).toBe(true);
    expect(turn1.nextPlayerId).toBe(0); // Lượt p0 phải ra Chém

    // p0 không có Chém -> Thua trận và nhận 1 sát thương!
    const turn2 = TrickRules.respondDuel(state, 0, null);
    expect(turn2.continued).toBe(false);
    expect(turn2.loserId).toBe(0);
    expect(p0.hp).toBe(2); // 3 HP - 1 = 2 HP
  });

  it('xử lý Hồi Xuân (Peach Garden): Tất cả người chơi bị thương hồi 1 HP', () => {
    const state = createMockTrickGame();
    // p0: 3/4 HP, p1: 2/4 HP, p2: 4/4 HP (đầy)
    const gardenCard = { id: 'garden_1', idKey: 'hoi_xuan', name: 'Hồi Xuân', type: 'trick' };
    state.getPlayer(0).hand.push(gardenCard);

    TrickRules.playTrick(state, 0, [], gardenCard);

    expect(state.getPlayer(0).hp).toBe(4); // hồi 1 lên đầy 4
    expect(state.getPlayer(1).hp).toBe(3); // hồi 1 lên 3
    expect(state.getPlayer(2).hp).toBe(4); // đầy rồi không hồi thêm
  });
});
