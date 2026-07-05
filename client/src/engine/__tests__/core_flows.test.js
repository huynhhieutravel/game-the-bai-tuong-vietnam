/**
 * ============================================
 * CHARACTERIZATION TESTS — Việt Sát Engine
 * ============================================
 * 
 * Mục đích: Ghi lại hành vi HIỆN TẠI của engine.
 * Chạy TRƯỚC refactor → tất cả phải PASS.
 * Sau refactor → chạy lại → nếu FAIL → biết ngay lỗi.
 * 
 * KHÔNG sửa engine để tests pass. Tests phải reflect hành vi thật.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Dispatcher } from '../core/Dispatcher';
import { PlayCardAction, ReactAction, EndPhaseAction, DiscardAction, DrawCardsAction } from '../core/Actions';
import { createTestState, createCard, resetCardCounter, getPlayer } from './testHelper';

beforeEach(() => {
  resetCardCounter();
});

// ============================================================
// TEST 1: Slash → Dodge → Damage Cancelled
// ============================================================
describe('Slash → Dodge → Damage Cancelled', () => {
  test('Player 0 Chém Player 1, Player 1 đánh Né → HP không đổi', () => {
    const slashCard = createCard('Chém', 'Cơ bản', '♠', '7', 'black');
    const dodgeCard = createCard('Né', 'Cơ bản', '♥', '2', 'red');

    const state = createTestState({
      p0Hand: [slashCard],
      p1Hand: [dodgeCard],
    });

    const dispatcher = new Dispatcher(state);

    // Player 0 đánh Chém lên Player 1
    dispatcher.dispatchAction(PlayCardAction(0, slashCard.id, [1], 'Chém'));

    // Engine phải đang chờ Player 1 đánh Né
    const stateAfterSlash = dispatcher.getState();
    expect(stateAfterSlash.waitingForResponse).not.toBeNull();
    expect(stateAfterSlash.waitingForResponse.type).toBe('ask_dodge');
    expect(stateAfterSlash.waitingForResponse.targetId).toBe(1);

    // Player 1 đánh Né
    dispatcher.dispatchAction(ReactAction(1, 'play', { cardId: dodgeCard.id, virtualCardName: 'Né' }));

    // HP của Player 1 không đổi
    const finalState = dispatcher.getState();
    const p1 = finalState.players.find(p => p.id === 1);
    expect(p1.hp).toBe(4);

    // Lá Né đã bị bỏ khỏi tay Player 1
    expect(p1.hand.length).toBe(0);
  });
});

// ============================================================
// TEST 2: Slash → No Dodge → Damage Applied
// ============================================================
describe('Slash → No Dodge → Damage Applied', () => {
  test('Player 0 Chém Player 1, Player 1 bỏ qua → mất 1 HP', () => {
    const slashCard = createCard('Chém', 'Cơ bản', '♠', '7', 'black');

    const state = createTestState({
      p0Hand: [slashCard],
      p1Hand: [], // Không có bài Né
    });

    const dispatcher = new Dispatcher(state);

    // Player 0 đánh Chém
    dispatcher.dispatchAction(PlayCardAction(0, slashCard.id, [1], 'Chém'));

    // Engine chờ Player 1 phản ứng
    const stateAfterSlash = dispatcher.getState();
    expect(stateAfterSlash.waitingForResponse).not.toBeNull();

    // Player 1 bỏ qua (không đánh Né)
    dispatcher.dispatchAction(ReactAction(1, 'skip', null));

    // Player 1 mất 1 HP
    const finalState = dispatcher.getState();
    const p1 = finalState.players.find(p => p.id === 1);
    expect(p1.hp).toBe(3); // 4 - 1 = 3
  });
});

// ============================================================
// TEST 3: Dying → Peach → Survive
// ============================================================
describe('Dying → Peach → Survive', () => {
  test('Player 1 bị Chém ở 1 HP, có người ném Đào → sống', () => {
    const slashCard = createCard('Chém', 'Cơ bản', '♠', '7', 'black');
    const peachCard = createCard('Đào', 'Cơ bản', '♥', '3', 'red');

    const state = createTestState({
      p0Hand: [slashCard],
      p1Hand: [peachCard],
      p1Hp: 1, // Player 1 chỉ còn 1 HP
    });

    const dispatcher = new Dispatcher(state);

    // Player 0 đánh Chém
    dispatcher.dispatchAction(PlayCardAction(0, slashCard.id, [1], 'Chém'));

    // Player 1 bỏ qua Né (không có)
    let s = dispatcher.getState();
    if (s.waitingForResponse && (s.waitingForResponse.type === 'ask_dodge' || s.waitingForResponse.type === 'dodge')) {
      dispatcher.dispatchAction(ReactAction(1, 'skip', null));
    }

    // Engine phải vào trạng thái Hấp Hối (ask_peach)
    s = dispatcher.getState();
    expect(s.waitingForResponse).not.toBeNull();
    expect(s.waitingForResponse.type).toBe('ask_peach');

    // Player 1 (hoặc ai đó) ném Đào cứu
    const askPeachResponderId = s.waitingForResponse.responderId ?? s.waitingForResponse.targetId ?? s.waitingForResponse.askQueue?.[0];
    dispatcher.dispatchAction(ReactAction(askPeachResponderId, 'play', { cardId: peachCard.id, virtualCardName: 'Đào' }));

    // Player 1 sống sót
    const finalState = dispatcher.getState();
    const p1 = finalState.players.find(p => p.id === 1);
    expect(p1.hp).toBeGreaterThan(0);
    expect(p1.isAlive).toBe(true);
  });
});

// ============================================================
// TEST 4: Dying → No Peach → Death
// ============================================================
describe('Dying → No Peach → Death', () => {
  test('Player 1 bị Chém ở 1 HP, không ai cứu → chết', () => {
    const slashCard = createCard('Chém', 'Cơ bản', '♠', '7', 'black');

    const state = createTestState({
      p0Hand: [slashCard],
      p1Hand: [], // Không có Đào
      p1Hp: 1,
    });

    const dispatcher = new Dispatcher(state);

    // Player 0 đánh Chém
    dispatcher.dispatchAction(PlayCardAction(0, slashCard.id, [1], 'Chém'));

    // Player 1 bỏ qua Né
    let s = dispatcher.getState();
    if (s.waitingForResponse && (s.waitingForResponse.type === 'ask_dodge' || s.waitingForResponse.type === 'dodge')) {
      dispatcher.dispatchAction(ReactAction(1, 'skip', null));
    }

    // Hấp Hối → Tất cả bỏ qua cứu
    s = dispatcher.getState();
    if (s.waitingForResponse && s.waitingForResponse.type === 'ask_peach') {
      // Hỏi vòng tròn, mỗi người skip
      let maxIterations = 10;
      while (s.waitingForResponse && s.waitingForResponse.type === 'ask_peach' && maxIterations > 0) {
        const responderId = s.waitingForResponse.responderId ?? s.waitingForResponse.targetId ?? s.waitingForResponse.askQueue?.[0];
        dispatcher.dispatchAction(ReactAction(responderId, 'skip', null));
        s = dispatcher.getState();
        maxIterations--;
      }
    }

    // Player 1 phải chết
    const finalState = dispatcher.getState();
    const p1 = finalState.players.find(p => p.id === 1);
    expect(p1.isAlive).toBe(false);
  });
});

// ============================================================
// TEST 5: Slash limit — Chỉ được Chém 1 lần/lượt
// ============================================================
describe('Slash Limit', () => {
  test('Player 0 Chém 2 lần liên tiếp → lần 2 bị từ chối', () => {
    const slash1 = createCard('Chém', 'Cơ bản', '♠', '7', 'black');
    const slash2 = createCard('Chém', 'Cơ bản', '♠', '8', 'black');

    const state = createTestState({
      p0Hand: [slash1, slash2],
      p1Hand: [],
    });

    const dispatcher = new Dispatcher(state);

    // Chém lần 1
    dispatcher.dispatchAction(PlayCardAction(0, slash1.id, [1], 'Chém'));

    // Skip dodge
    let s = dispatcher.getState();
    if (s.waitingForResponse && (s.waitingForResponse.type === 'ask_dodge')) {
      dispatcher.dispatchAction(ReactAction(1, 'skip', null));
    }

    // Xử lý dying nếu cần (HP 4 → 3, chưa chết)
    s = dispatcher.getState();

    // Chém lần 2 — phải bị chặn bởi canPlayCard
    const p0Before = dispatcher.getState().players.find(p => p.id === 0);
    const handLengthBefore = p0Before.hand.length;

    dispatcher.dispatchAction(PlayCardAction(0, slash2.id, [1], 'Chém'));

    // Lá Chém thứ 2 PHẢI vẫn còn trên tay (không được đánh ra)
    const p0After = dispatcher.getState().players.find(p => p.id === 0);
    expect(p0After.hand.length).toBe(handLengthBefore);
  });
});

// ============================================================
// TEST 6: Equipment → Replaces Old Same-Type
// ============================================================
describe('Equipment Replace', () => {
  test('Trang bị Vũ khí mới thay thế Vũ khí cũ', () => {
    const weapon1 = createCard('Thanh Long Đao', 'Trang bị', '♠', '5', 'black');
    weapon1.type = 'equip';
    const weapon2 = createCard('Rìu Đá', 'Trang bị', '♦', '5', 'red');
    weapon2.type = 'equip';

    const state = createTestState({
      p0Hand: [weapon2],
      p0Equipment: [weapon1],
    });

    const dispatcher = new Dispatcher(state);

    // Đánh trang bị mới
    dispatcher.dispatchAction(PlayCardAction(0, weapon2.id, [], 'Rìu Đá'));

    const p0 = dispatcher.getState().players.find(p => p.id === 0);

    // Phải chỉ còn 1 vũ khí (Rìu Đá mới)
    const weapons = p0.equipment.filter(e => 
      e.name === 'Thanh Long Đao' || e.name === 'Rìu Đá'
    );
    expect(weapons.length).toBeLessThanOrEqual(1);

    // Vũ khí cũ phải vào discardPile
    const discardHasOld = dispatcher.getState().discardPile.some(c => c.id === weapon1.id);
    expect(discardHasOld).toBe(true);
  });
});

// ============================================================
// TEST 7: Turn Phases — Execute in Correct Order
// ============================================================
describe('Turn Phases', () => {
  test('Bắt đầu lượt → các phase đúng thứ tự', () => {
    const state = createTestState();
    // Remove play_phase waiting to start fresh
    state.waitingForResponse = null;
    state.actionQueue = [];
    state.reactionStack = [];
    state.currentPhase = null;

    const dispatcher = new Dispatcher(state);

    // Bắt đầu lượt Player 0
    dispatcher.state.reactionStack.push({
      type: 'EVENT_TURN_START',
      payload: { playerId: 0 }
    });
    dispatcher.tick();

    // Engine phải đi qua các phase: start → judge → draw → (chờ rút bài)
    const s = dispatcher.getState();
    
    // Phải dừng lại ở một trong các phase chờ (draw_phase hoặc play_phase)
    expect(s.waitingForResponse).not.toBeNull();
    
    const validPhaseTypes = ['draw_phase', 'play_phase', 'ask_banh_chung', 'ask_da_trach', 'ask_khoi_nghia'];
    expect(validPhaseTypes).toContain(s.waitingForResponse.type);
  });
});

// ============================================================
// TEST 8: Discard Phase — Excess Cards Discarded
// ============================================================
describe('Discard Phase', () => {
  test('Bài trên tay > HP → phải bỏ bài dư', () => {
    // Player 0 có 6 lá bài, HP = 3 → phải bỏ 3 lá
    const cards = Array(6).fill(null).map((_, i) => createCard('Chém', 'Cơ bản', '♠', String(i + 2), 'black'));

    const state = createTestState({
      p0Hand: cards,
      p0Hp: 3,
    });

    // Set phase to discard manually
    state.waitingForResponse = null;
    state.currentPhase = 'discard';
    
    const dispatcher = new Dispatcher(state);

    // Push discard phase event
    dispatcher.state.reactionStack.push({
      type: 'EVENT_PHASE_DISCARD',
      payload: { targetId: 0 }
    });
    dispatcher.tick();

    // Engine phải chờ Player 0 chọn bài để bỏ
    const s = dispatcher.getState();
    expect(s.waitingForResponse).not.toBeNull();
    expect(s.waitingForResponse.type).toBe('discard_phase');
    expect(s.waitingForResponse.amount).toBe(3); // 6 bài - 3 HP = 3 bài phải bỏ

    // Player 0 chọn bỏ 3 lá đầu tiên
    const discardIds = cards.slice(0, 3).map(c => c.id);
    dispatcher.dispatchAction(DiscardAction(0, discardIds));

    // Verify: còn 3 lá trên tay
    const p0 = dispatcher.getState().players.find(p => p.id === 0);
    expect(p0.hand.length).toBe(3);
  });
});

// ============================================================
// TEST 9: Negate (Hóa Giải) — Vô hiệu hóa cẩm nang
// ============================================================
describe('Negate Chain', () => {
  test('Đánh Tước Bài → bị Hóa Giải → hiệu ứng bị hủy', () => {
    const dismantleCard = createCard('Tước Bài', 'Cẩm nang', '♠', '3', 'black');
    dismantleCard.type = 'trick';
    const negateCard = createCard('Hóa Giải', 'Cẩm nang', '♠', 'J', 'black');
    negateCard.type = 'trick';

    const state = createTestState({
      p0Hand: [dismantleCard],
      p1Hand: [negateCard, createCard('Chém', 'Cơ bản', '♠', '7', 'black')], // 1 Hóa Giải + 1 bài khác
    });

    const dispatcher = new Dispatcher(state);

    // Player 0 đánh Tước Bài lên Player 1
    dispatcher.dispatchAction(PlayCardAction(0, dismantleCard.id, [1], 'Tước Bài'));

    // Engine phải hỏi vòng tròn ai muốn Hóa Giải (ask_negate)
    let s = dispatcher.getState();
    expect(s.waitingForResponse).not.toBeNull();
    expect(s.waitingForResponse.type).toBe('ask_negate');

    // Player 1 đánh Hóa Giải
    dispatcher.dispatchAction(ReactAction(
      s.waitingForResponse.responderId ?? s.waitingForResponse.askQueue?.[0] ?? 1,
      'play',
      { cardId: negateCard.id, virtualCardName: 'Hóa Giải' }
    ));

    // Sau khi Hóa Giải xong và không ai Hóa Giải lại, hiệu ứng Tước Bài bị hủy
    // Phải skip hết vòng ask_negate
    s = dispatcher.getState();
    let maxIter = 10;
    while (s.waitingForResponse && s.waitingForResponse.type === 'ask_negate' && maxIter > 0) {
      const rid = s.waitingForResponse.responderId ?? s.waitingForResponse.askQueue?.[0];
      dispatcher.dispatchAction(ReactAction(rid, 'skip', null));
      s = dispatcher.getState();
      maxIter--;
    }

    // Player 1 vẫn còn bài (Tước Bài bị hủy, không mất bài)
    const p1 = dispatcher.getState().players.find(p => p.id === 1);
    // Player 1 đã mất Hóa Giải nhưng bài Chém vẫn còn
    const hasChem = p1.hand.some(c => c.name === 'Chém');
    expect(hasChem).toBe(true);
  });
});

// ============================================================
// TEST 10: Duel → Slash Exchange → Loser Takes Damage
// ============================================================
describe('Duel (Quyết Đấu)', () => {
  test('Player 0 Quyết Đấu Player 1, Player 1 không Chém → Player 1 mất HP', () => {
    const duelCard = createCard('Quyết Đấu', 'Cẩm nang', '♠', 'A', 'black');
    duelCard.type = 'trick';

    const state = createTestState({
      p0Hand: [duelCard],
      p1Hand: [], // Player 1 không có Chém
    });

    const dispatcher = new Dispatcher(state);

    // Player 0 đánh Quyết Đấu lên Player 1
    dispatcher.dispatchAction(PlayCardAction(0, duelCard.id, [1], 'Quyết Đấu'));

    // Phải có ask_negate trước (hỏi Hóa Giải)
    let s = dispatcher.getState();
    let maxIter = 15;
    
    // Skip negate vòng
    while (s.waitingForResponse && s.waitingForResponse.type === 'ask_negate' && maxIter > 0) {
      const rid = s.waitingForResponse.responderId ?? s.waitingForResponse.askQueue?.[0];
      dispatcher.dispatchAction(ReactAction(rid, 'skip', null));
      s = dispatcher.getState();
      maxIter--;
    }

    // Sau khi hết Hóa Giải, phải vào Duel logic: ask_slash cho Player 1
    // Player 1 không có Chém → skip
    if (s.waitingForResponse && (s.waitingForResponse.type === 'ask_slash' || s.waitingForResponse.type === 'duel_slash')) {
      dispatcher.dispatchAction(ReactAction(1, 'skip', null));
    }

    // Xử lý dying nếu cần (nếu HP rơi ≤ 0)
    s = dispatcher.getState();
    while (s.waitingForResponse && s.waitingForResponse.type === 'ask_peach' && maxIter > 0) {
      const rid = s.waitingForResponse.responderId ?? s.waitingForResponse.askQueue?.[0];
      dispatcher.dispatchAction(ReactAction(rid, 'skip', null));
      s = dispatcher.getState();
      maxIter--;
    }

    // Player 1 phải mất HP
    const p1 = dispatcher.getState().players.find(p => p.id === 1);
    expect(p1.hp).toBeLessThan(4);
  });
});
