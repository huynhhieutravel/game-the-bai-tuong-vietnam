import { describe, it, expect } from 'vitest';
import { GameState } from '../../../../shared/engine_v4/core/GameState.js';
import { TrickRules } from '../../../../shared/engine_v4/rules/TrickRules.js';
import { CombatRules } from '../../../../shared/engine_v4/rules/CombatRules.js';

describe('QA Clockwise AOE Resolution & Xiềng Xích Dynamic Counter', () => {
  const create4PlayerState = () => {
    const players = [
      { id: 0, name: 'Người chơi 1', hp: 4, maxHp: 4, isBot: false, hand: [] },
      { id: 1, name: 'Người chơi 2', hp: 3, maxHp: 3, isBot: true, hand: [{ id: 'd_1', name: 'Né', type: 'dodge' }] },
      { id: 2, name: 'Người chơi 3', hp: 3, maxHp: 3, isBot: true, hand: [] },
      { id: 3, name: 'Người chơi 4', hp: 3, maxHp: 3, isBot: true, hand: [{ id: 'd_4', name: 'Né', type: 'dodge' }] },
    ];
    const state = new GameState({ players, drawPile: [] });
    state.activePlayerId = 0;
    state.currentTurnPlayerId = 0;
    state.currentPhase = 'action';
    return state;
  };

  it('1. Loạn Tiễn (Arrow Rain) giải quyết chuẩn xác theo chiều kim đồng hồ: Người chơi 2 -> 3 -> 4', () => {
    const state = create4PlayerState();
    const rainCard = { id: 'rain_1', name: 'Loạn Tiễn', idKey: 'loan_tien', type: 'trick' };

    // Người chơi 1 (id: 0) đánh Loạn Tiễn
    TrickRules.playArrowRain(state, 0, rainCard);

    // Có 3 frame ASK_DODGE
    expect(state.priorityStack.size()).toBe(3);

    // Frame trên đỉnh (peek) BẮT BUỘC phải là Người chơi 2 (id: 1)
    const frameP2 = state.priorityStack.peek();
    expect(frameP2.targetId).toBe(1);

    // Người chơi 2 đánh Né
    CombatRules.respondDodge(state, 1, state.getPlayer(1).hand[0]);
    // Log phải ghi nhận né thành công [Loạn Tiễn]
    expect(state.logs.some(l => (l.message || l.text || '').includes('Người chơi 2 đã né thành công [Loạn Tiễn]!'))).toBe(true);

    // Frame tiếp theo phải là Người chơi 3 (id: 2)
    const frameP3 = state.priorityStack.peek();
    expect(frameP3.targetId).toBe(2);

    // Người chơi 3 không né -> nhận 1 sát thương
    CombatRules.respondDodge(state, 2, null);
    expect(state.getPlayer(2).hp).toBe(2);
    expect(state.logs.some(l => (l.message || l.text || '').includes('Người chơi 3 nhận 1 điểm sát thương (arrow_rain)'))).toBe(true);

    // Frame cuối cùng phải là Người chơi 4 (id: 3)
    const frameP4 = state.priorityStack.peek();
    expect(frameP4.targetId).toBe(3);

    // Người chơi 4 đánh Né
    CombatRules.respondDodge(state, 3, state.getPlayer(3).hand[0]);
    expect(state.logs.some(l => (l.message || l.text || '').includes('Người chơi 4 đã né thành công [Loạn Tiễn]!'))).toBe(true);
    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('2. Dã Man Xâm Nhập (Barbarian) giải quyết chuẩn xác theo chiều kim đồng hồ: Người chơi 2 -> 3 -> 4', () => {
    const state = create4PlayerState();
    const barbCard = { id: 'barb_1', name: 'Dã Man', idKey: 'da_man', type: 'trick' };

    // Người chơi 1 đánh Dã Man
    TrickRules.playBarbarian(state, 0, barbCard);
    expect(state.priorityStack.size()).toBe(3);

    // Thứ tự pop phải là 1 (Người chơi 2) -> 2 (Người chơi 3) -> 3 (Người chơi 4)
    expect(state.priorityStack.peek().targetId).toBe(1);
    TrickRules.respondBarbarian(state, 1, null);

    expect(state.priorityStack.peek().targetId).toBe(2);
    TrickRules.respondBarbarian(state, 2, null);

    expect(state.priorityStack.peek().targetId).toBe(3);
    TrickRules.respondBarbarian(state, 3, null);

    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('3. Khi người chơi ở vị trí khác (id: 2) đánh Loạn Tiễn -> Giải quyết theo chiều kim đồng hồ bắt đầu từ (id: 3) -> (id: 0) -> (id: 1)', () => {
    const state = create4PlayerState();
    const rainCard = { id: 'rain_2', name: 'Loạn Tiễn', idKey: 'loan_tien', type: 'trick' };

    // Người chơi 3 (id: 2) đánh Loạn Tiễn
    TrickRules.playArrowRain(state, 2, rainCard);
    expect(state.priorityStack.size()).toBe(3);

    // Thứ tự kim đồng hồ từ id 2: 3 -> 0 -> 1
    expect(state.priorityStack.peek().targetId).toBe(3);
    CombatRules.respondDodge(state, 3, null);

    expect(state.priorityStack.peek().targetId).toBe(0);
    CombatRules.respondDodge(state, 0, null);

    expect(state.priorityStack.peek().targetId).toBe(1);
    CombatRules.respondDodge(state, 1, null);

    expect(state.priorityStack.isEmpty()).toBe(true);
  });
});
