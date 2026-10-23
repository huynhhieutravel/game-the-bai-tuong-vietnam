import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';

describe('Xiềng Xích, Truyền Sát Thương & Cẩm Nang Trì Hoãn (Engine v4)', () => {
  const createMockGame = (playerCount = 3) => {
    const drawPile = Array.from({ length: 40 }, (_, i) => ({
      id: `card_${i}`,
      name: `Thẻ ${i}`,
      type: 'basic',
      suit: 'spade',
      color: 'black',
      rank: 10
    }));

    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: `Người chơi ${i}`,
      hp: 4,
      maxHp: 4,
      faction: 'lac',
      hand: [],
      isChained: false,
      judgementArea: []
    }));

    const gameState = new GameState({
      players,
      drawPile,
      currentTurnPlayerId: 0
    });

    return gameState;
  };

  it('1. Xiềng Xích: Rèn Lại khi không chọn mục tiêu -> rút 1 lá bài mới', () => {
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    const chainCard = { id: 'chain_1', name: 'Xiềng Xích', idKey: 'xieng_xich', type: 'trick' };
    p0.hand.push(chainCard);

    // Chơi Xiềng Xích không có target -> Rèn Lại
    TrickRules.playTrick(state, 0, [], chainCard);

    expect(p0.hand.length).toBe(1); // Đã rút 1 lá mới
    expect(p0.hand[0].id).not.toBe('chain_1');
    expect(state.discardPile.some(c => c.id === 'chain_1')).toBe(true);
  });

  it('2. Xiềng Xích: Khóa xích và tháo xích mục tiêu', () => {
    const state = createMockGame(3);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const chainCard = { id: 'chain_2', name: 'Xiềng Xích', idKey: 'xieng_xich', type: 'trick' };
    p0.hand.push(chainCard);

    // Thực thi trực tiếp hiệu ứng Xiềng Xích lên p0 và p1
    TrickRules._executeTrickEffect(state, 0, [0, 1], chainCard, {});

    expect(p0.isChained).toBe(true);
    expect(p1.isChained).toBe(true);

    // Dùng lại lần nữa -> Tháo xích
    TrickRules._executeTrickEffect(state, 0, [0], chainCard, {});
    expect(p0.isChained).toBe(false);
    expect(p1.isChained).toBe(true);
  });

  it('3. Truyền Sát Thương Lôi Hỏa qua Xiềng Xích', () => {
    const state = createMockGame(3);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);

    p0.isChained = true;
    p1.isChained = true;
    p2.isChained = false; // p2 không bị xích

    // p0 nhận 2 sát thương Sét (lightning)
    CombatRules.applyDamage(state, null, 0, 2, 'lightning');

    // Cả p0 và p1 đều phải nhận 2 sát thương, p2 không bị ảnh hưởng
    expect(p0.hp).toBe(2); // 4 - 2 = 2
    expect(p1.hp).toBe(2); // 4 - 2 = 2
    expect(p2.hp).toBe(4); // Giữ nguyên 4

    // Sau khi nhận sát thương, cả p0 và p1 đều được tháo xích
    expect(p0.isChained).toBe(false);
    expect(p1.isChained).toBe(false);
  });

  it('4. Sát thương Chém thông thường KHÔNG truyền qua Xiềng Xích', () => {
    const state = createMockGame(3);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.isChained = true;
    p1.isChained = true;

    // p0 nhận 1 sát thương Chém vật lý
    CombatRules.applyDamage(state, null, 0, 1, 'slash');

    expect(p0.hp).toBe(3);
    expect(p1.hp).toBe(4); // p1 không bị ảnh hưởng
    expect(p0.isChained).toBe(true); // Vẫn bị xích
    expect(p1.isChained).toBe(true);
  });

  it('5. Hỗn Loạn: Phán xét KHÔNG PHẢI CƠ -> Bị mất Pha Hành Động', () => {
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    // Cấp cho p0 5 lá bài để khi rút thêm 2 lá (tổng 7 > HP 4) sẽ dừng lại chờ bỏ bài ở Pha DISCARD
    p0.hand = Array.from({ length: 5 }, (_, i) => ({ id: `card_hand_${i}`, name: 'Bài', type: 'basic' }));
    const honLoanCard = { id: 'hon_loan_1', name: 'Hỗn Loạn', idKey: 'hon_loan', type: 'delayed_trick' };

    // Đặt Hỗn Loạn vào khu phán xét của p0
    p0.judgementArea.push(honLoanCard);

    // Đặt lá bài phán xét là Bích (không phải Cơ)
    state.drawPile.push({ id: 'judge_spade', name: 'Sát thủ', suit: 'spade', color: 'black' });

    const sm = new StateMachine(state);
    sm.startTurn(0);

    // Bị mất Pha Ra Bài (ACTION): Chuyển thẳng sang DISCARD và tạo frame đòi bỏ bài
    expect(state.currentPhase).toBe(PHASES.DISCARD);
    expect(state.priorityStack.peek().type).toBe('ASK_DISCARD');
    expect(p0.judgementArea.length).toBe(0); // Đã giải phóng Hỗn Loạn
    expect(state.logs.some(l => l.message.includes('Do hiệu ứng [Hỗn Loạn]'))).toBe(true);
  });

  it('6. Hỗn Loạn: Phán xét RA CƠ (♥) -> Thoát Hỗn Loạn, vào Pha Hành Động bình thường', () => {
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    const honLoanCard = { id: 'hon_loan_1', name: 'Hỗn Loạn', idKey: 'hon_loan', type: 'delayed_trick' };

    p0.judgementArea.push(honLoanCard);

    // Đặt lá bài phán xét là Cơ (♥)
    state.drawPile.push({ id: 'judge_heart', name: 'Đào', suit: 'heart', color: 'red' });

    const sm = new StateMachine(state);
    sm.startTurn(0);

    // Thoát Hỗn Loạn thành công -> Vào Pha ACTION bình thường
    expect(state.currentPhase).toBe(PHASES.ACTION);
    expect(p0.judgementArea.length).toBe(0);
  });

  it('7. Sấm Sét: Lật Bích 2-9 nổ 3 HP; Lật ngoài khoảng thì chuyển sang người tiếp theo', () => {
    const state = createMockGame(3);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const samSetCard = { id: 'sam_set_1', name: 'Sấm Sét', idKey: 'sam_set', type: 'delayed_trick' };

    p0.judgementArea.push(samSetCard);

    // Test 7a: Lật ra Rô (không nổ) -> chuyển sang p1
    state.drawPile.push({ id: 'judge_diamond', name: 'Đào', suit: 'diamond', color: 'red', rank: 5 });
    TrickRules.resolveJudgementPhase(state, 0);

    expect(p0.hp).toBe(4);
    expect(p0.judgementArea.length).toBe(0);
    expect(p1.judgementArea.length).toBe(1); // Sấm Sét đã bay sang p1!

    // Test 7b: Lật ra Bích 7 (nổ 3 HP) cho p1
    state.drawPile.push({ id: 'judge_spade_7', name: 'Sấm', suit: 'spade', color: 'black', rank: 7 });
    TrickRules.resolveJudgementPhase(state, 1);

    expect(p1.hp).toBe(1); // 4 - 3 = 1
    expect(p1.judgementArea.length).toBe(0); // Đã nổ và đưa vào discardPile
  });
});
