import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { GameInvariants } from '../../core/Invariants.js';

describe('StateMachine & 6-Phase Turn Loop v4', () => {
  const createMockGame = () => {
    const drawPile = Array.from({ length: 20 }, (_, i) => ({
      id: `card_${i}`,
      name: `Thẻ ${i}`,
      type: 'basic'
    }));

    const gameState = new GameState({
      players: [
        { id: 0, name: 'Người chơi 0', hp: 3, maxHp: 3, hand: [] },
        { id: 1, name: 'Người chơi 1', hp: 4, maxHp: 4, hand: [] }
      ],
      drawPile,
      currentTurnPlayerId: 0
    });

    const stateMachine = new StateMachine(gameState);
    return { gameState, stateMachine };
  };

  it('tuần tự chuyển dịch từ BEGIN -> JUDGE -> DRAW -> ACTION và rút đúng 2 lá bài', () => {
    const { gameState, stateMachine } = createMockGame();
    const p0 = gameState.getPlayer(0);

    expect(p0.hand.length).toBe(0);

    // Bắt đầu lượt của Người chơi 0
    stateMachine.startTurn(0);

    // Vì không có cẩm nang phán xét, hệ thống tự động chạy qua BEGIN -> JUDGE -> DRAW -> dừng lại ở ACTION
    expect(gameState.currentPhase).toBe(PHASES.ACTION);
    expect(p0.hand.length).toBe(2); // Đã rút 2 lá trong Pha Rút bài
    expect(p0.turnStats.cardsDrawn).toBe(2);
  });

  it('xử lý chính xác Pha Bỏ bài (DISCARD) khi số bài trên tay vượt quá lượng HP', () => {
    const { gameState, stateMachine } = createMockGame();
    const p0 = gameState.getPlayer(0);
    p0.hp = 2; // HP = 2

    // Cho p0 có 4 lá bài trên tay
    p0.hand = [
      { id: 'c1', name: 'Lá 1' },
      { id: 'c2', name: 'Lá 2' },
      { id: 'c3', name: 'Lá 3' },
      { id: 'c4', name: 'Lá 4' }
    ];

    stateMachine.startTurn(0);
    // Sau khi bắt đầu lượt, p0 tự động rút thêm 2 lá trong DRAW phase -> tổng 6 lá
    expect(p0.hand.length).toBe(6);

    // Kết thúc Pha Hành động -> Chuyển sang DISCARD
    stateMachine.endActionPhase();
    expect(gameState.currentPhase).toBe(PHASES.DISCARD);

    // HP = 2, Bài = 6 -> Cần bỏ 4 lá
    const frame = gameState.priorityStack.peek();
    expect(frame).not.toBeNull();
    expect(frame.type).toBe('ASK_DISCARD');
    expect(frame.context.cardsToDiscard).toBe(4);

    // Bỏ sai số lượng bài -> Phải văng lỗi
    expect(() => {
      stateMachine.handleDiscard(0, ['c1', 'c2']); // chỉ bỏ 2 lá thay vì 4
    }).toThrow(/Cần bỏ chính xác 4 lá bài/);

    // Bỏ đủ 4 lá hợp lệ
    const idsToDiscard = [p0.hand[0].id, p0.hand[1].id, p0.hand[2].id, p0.hand[3].id];
    stateMachine.handleDiscard(0, idsToDiscard);

    // Bài trên tay còn lại đúng 2 lá (= HP)
    expect(p0.hand.length).toBe(2);
    expect(gameState.priorityStack.isEmpty()).toBe(true);

    // Sau khi bỏ xong, hệ thống tự động hoàn tất END phase và chuyển sang lượt của Người chơi 1
    expect(gameState.currentTurnPlayerId).toBe(1);
  });

  it('kiểm định Game Invariants: bắt lỗi vi phạm giới hạn Chém và Bỏ bài', () => {
    const p = {
      id: 0,
      name: 'Player 0',
      hp: 2,
      hand: [{ id: '1' }, { id: '2' }, { id: '3' }], // 3 lá > 2 HP
      turnStats: { slashCount: 2 }, // Đánh 2 chém không có Nỏ
      equipment: {}
    };

    // Bất biến Chém: Phải ném lỗi khi đánh > 1 Chém mà không có nỏ
    expect(() => {
      GameInvariants.assertSlashLimit(p);
    }).toThrow(/đã đánh 2 lá Chém mà không có Liên Nỏ/);

    // Trang bị Liên Nỏ -> Không bị lỗi nữa
    p.equipment.weapon = { id: 'crossbow', name: 'Liên Nỏ' };
    expect(() => {
      GameInvariants.assertSlashLimit(p);
    }).not.toThrow();

    // Bất biến Bỏ bài: 3 lá > 2 HP -> Phải ném lỗi
    expect(() => {
      GameInvariants.assertDiscardLimit(p);
    }).toThrow(/vượt quá giới hạn cho phép/);
  });
});
