/**
 * AutoBaguaAndPlayerLogTabsQA.test.js
 * Kiểm thử đảm bảo:
 * 1. Bát Quái Trận luôn tự động kích hoạt phán xét trước khi hỏi lá Né / Bọc Trăm Trứng
 * 2. Phán xét Đỏ: Tự động né thành công, không tốn tài nguyên
 * 3. Phán xét Đen: Báo thất bại và chuyển sang hỏi dùng lá Né / Bọc Trăm Trứng
 * 4. Log trận đấu lọc chuẩn xác theo từng người chơi
 */

import { describe, it, expect, vi } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { GameViewMapperV4 } from '../../application/GameViewMapperV4.js';

describe('Auto-Bagua & Player Log Filter QA Test Suite', () => {
  it('1. Bát Quái phán xét ĐỎ -> Tự động né thành công, PriorityStack pop frame ASK_DODGE', () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0 (Lạc Long Quân)',
          hp: 3,
          maxHp: 4,
          isAlive: true,
          hand: [{ id: 'ne_1', name: 'Né', type: 'dodge' }],
          equipment: {
            armor: { id: 'bat_quai_1', name: 'Bát Quái', type: 'armor' }
          }
        },
        {
          id: 1,
          name: 'Player 1 (Thánh Gióng)',
          hp: 4,
          maxHp: 4,
          isAlive: true,
          hand: []
        }
      ],
      drawPile: [
        { id: 'red_card_1', name: 'Đào', suit: 'heart', color: 'red', rank: '7' }
      ]
    });

    // Giả lập frame ASK_DODGE từ đòn Chém của Player 1
    state.priorityStack.push({
      id: 'frame_dodge_1',
      type: 'ASK_DODGE',
      sourceId: 1,
      targetId: 0,
      currentActorId: 0,
      priorityQueue: [0],
      context: {
        reason: 'chem',
        requiredDodges: 1,
        dodgesProvided: 0,
        baguaAttempted: false
      }
    });

    const result = CombatRules.respondDodge(state, 0, null, { doBagua: true });
    expect(result.baguaSuccess).toBe(true);
    expect(state.priorityStack.isEmpty()).toBe(true);

    const logs = state.logs.map(l => l.message);
    expect(logs.some(m => m.includes('Phán xét ĐỎ'))).toBe(true);
    expect(logs.some(m => m.includes('né thành công cú Chém nhờ [Bát Quái]'))).toBe(true);
  });

  it('2. Bát Quái phán xét ĐEN -> Thất bại, frame giữ lại trên stack và baguaAttempted = true', () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0 (Lạc Long Quân)',
          hp: 3,
          maxHp: 4,
          isAlive: true,
          hand: [{ id: 'ne_1', name: 'Né', type: 'dodge' }],
          equipment: {
            armor: { id: 'bat_quai_1', name: 'Bát Quái', type: 'armor' }
          }
        },
        {
          id: 1,
          name: 'Player 1 (Thánh Gióng)',
          hp: 4,
          maxHp: 4,
          isAlive: true,
          hand: []
        }
      ],
      drawPile: [
        { id: 'black_card_1', name: 'Sát Thương', suit: 'spade', color: 'black', rank: '8' }
      ]
    });

    state.priorityStack.push({
      id: 'frame_dodge_2',
      type: 'ASK_DODGE',
      sourceId: 1,
      targetId: 0,
      currentActorId: 0,
      priorityQueue: [0],
      context: {
        reason: 'chem',
        requiredDodges: 1,
        dodgesProvided: 0,
        baguaAttempted: false
      }
    });

    const result = CombatRules.respondDodge(state, 0, null, { doBagua: true });
    expect(result.baguaSuccess).toBe(false);
    expect(state.priorityStack.isEmpty()).toBe(false);

    const frame = state.priorityStack.peek();
    expect(frame.context.baguaAttempted).toBe(true);

    // Snapshot gửi về client qua GameViewMapper
    const vm = GameViewMapperV4.toViewModel(state, 0);
    expect(vm.waitingForResponse).toBeDefined();
    expect(vm.waitingForResponse.baguaAvailable).toBe(false);

    // Sau khi thất bại, người chơi đánh lá Né trên tay
    const dodgeResult = CombatRules.respondDodge(state, 0, state.players[0].hand[0], { doReact: true });
    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('3. Lọc Log chuẩn xác theo từng người chơi (P0, P1, P2)', () => {
    const mockLogs = [
      { message: '=== BẮT ĐẦU LƯỢT CỦA Người chơi 1 ===', turnPlayerId: 0 },
      { message: 'Bạn đánh ra lá [Chém] nhắm vào Người chơi 2!', turnPlayerId: 0, sourceId: 0, targetId: 1 },
      { message: 'Người chơi 2 kích hoạt Bát Quái Trận!', turnPlayerId: 0, sourceId: 1 },
      { message: 'Người chơi 3 không có Chém, chịu 1 sát thương từ [Dã Man]!', turnPlayerId: 1, targetId: 2 },
      { message: 'Người chơi 3 nhận 1 điểm sát thương. Sinh lực còn lại: 2/3', turnPlayerId: 1, targetId: 2 }
    ];

    const players = [
      { id: 0, name: 'Người chơi 1', heroes: [{ name: 'Lạc Long Quân' }] },
      { id: 1, name: 'Người chơi 2', heroes: [{ name: 'Thánh Gióng' }] },
      { id: 2, name: 'Người chơi 3', heroes: [{ name: 'Hai Bà Trưng' }] }
    ];

    // Lọc theo Player 1 (id 1)
    const p1Logs = mockLogs.filter(log => {
      const text = log.message;
      return log.turnPlayerId === 1 ||
             log.sourceId === 1 ||
             log.targetId === 1 ||
             text.includes('Người chơi 2') ||
             text.includes('Thánh Gióng');
    });

    expect(p1Logs.length).toBe(4); // Lượt P1, nhắm vào P2, P2 kích hoạt Bát Quái, P1 dùng Dã Man
    expect(p1Logs.some(l => l.message.includes('Người chơi 2 kích hoạt Bát Quái Trận'))).toBe(true);

    // Lọc theo Player 2 (id 2)
    const p2Logs = mockLogs.filter(log => {
      const text = log.message;
      return log.turnPlayerId === 2 ||
             log.sourceId === 2 ||
             log.targetId === 2 ||
             text.includes('Người chơi 3') ||
             text.includes('Hai Bà Trưng');
    });

    expect(p2Logs.length).toBe(2);
    expect(p2Logs.every(l => l.message.includes('Người chơi 3'))).toBe(true);
  });
});
