/**
 * ViewModelWeaponContractQA.test.js
 * Kiểm định Hợp đồng ViewModel & TargetResolver cho các Vũ khí & Trang bị Thật.
 * Chấm dứt vĩnh viễn tình trạng: Engine cho phép đánh nhưng ViewModel/canPlayCard khóa nút trên giao diện.
 */

import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CardDeck } from '../../cards/CardDeck.js';
import { toViewModel } from '../../application/GameViewMapperV4.js';
import { canPlayCard, getTargetingDefinition } from '../../rules/TargetResolverV4.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';

describe('QA Hợp Đồng ViewModel & Giao Diện Vũ Khí Thật (ViewModel Weapon Contract QA)', () => {
  const createMockGameState = () => {
    const deck = CardDeck.getStandardDeck();
    const state = new GameState({
      players: [
        { id: 0, name: 'Người chơi 0 (Nam)', hp: 4, maxHp: 4, isAlive: true, hand: [], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, turnStats: {} },
        { id: 1, name: 'Người chơi 1 (Nữ)', hp: 4, maxHp: 4, isAlive: true, hand: [], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, turnStats: {} },
        { id: 2, name: 'Người chơi 2 (Nam)', hp: 4, maxHp: 4, isAlive: true, hand: [], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, turnStats: {} },
        { id: 3, name: 'Người chơi 3 (Nữ)', hp: 4, maxHp: 4, isAlive: true, hand: [], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, turnStats: {} }
      ],
      drawPile: deck,
      discardPile: [],
      currentPlayerIndex: 0,
      currentPhase: 'ACTION'
    });
    return state;
  };

  it('1. Liên Nỏ Thật: canPlayCard và ViewModel luôn cho phép Chém liên tiếp nhiều lần trong lượt', () => {
    const state = createMockGameState();
    const p0 = state.getPlayer(0);

    const deck = CardDeck.getStandardDeck();
    const realCrossbow = deck.find(c => c.name === 'Liên Nỏ');
    const realSlashes = deck.filter(c => c.name === 'Chém').slice(0, 3);

    expect(realCrossbow, 'Phải tìm thấy Liên Nỏ trong bộ bài chuẩn').toBeTruthy();
    expect(realSlashes.length, 'Phải lấy đủ 3 lá Chém từ bộ bài chuẩn').toBe(3);

    // Trang bị Liên Nỏ thật
    p0.equipment.weapon = realCrossbow;
    p0.hand = [...realSlashes];

    const dispatcher = new DispatcherV4(state);

    // Lần 1: Chưa chém lần nào -> canPlayCard = true
    expect(canPlayCard(state, 0, realSlashes[0].id).valid).toBe(true);

    // Xuất chiêu Chém lần 1 vào Người chơi 1
    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: realSlashes[0].id,
      targetId: 1
    });

    expect(p0.turnStats?.slashCount).toBe(1);

    // Kiểm tra ViewModel sau lần Chém 1:
    const vm = toViewModel(state, 0);
    const meVM = vm.players.find(p => p.id === 0);
    expect(meVM.equipment.weapon.name).toBe('Liên Nỏ');

    // HỢP ĐỒNG QUAN TRỌNG NHẤT: Khi đã Chém lần 1, lá Chém thứ 2 trên tay VẪN BẮT BUỘC canPlay = true
    expect(canPlayCard(state, 0, realSlashes[1].id).valid).toBe(true);

    // Xuất chiêu Chém lần 2 vào Người chơi 1
    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: realSlashes[1].id,
      targetId: 1
    });

    expect(p0.turnStats?.slashCount).toBe(2);

    // HỢP ĐỒNG TIẾP TỤC: Lá Chém thứ 3 trên tay VẪN canPlay = true
    expect(canPlayCard(state, 0, realSlashes[2].id).valid).toBe(true);
  });

  it('2. Khi KHÔNG trang bị Liên Nỏ: canPlayCard lập tức khóa lá Chém sau lần Chém đầu tiên', () => {
    const state = createMockGameState();
    const p0 = state.getPlayer(0);

    const deck = CardDeck.getStandardDeck();
    const realDragonBlade = deck.find(c => c.name === 'Thanh Long Đao');
    const realSlashes = deck.filter(c => c.name === 'Chém').slice(0, 2);

    // Trang bị Thanh Long Đao (không phải Liên Nỏ)
    p0.equipment.weapon = realDragonBlade;
    p0.hand = [...realSlashes];

    const dispatcher = new DispatcherV4(state);

    // Chưa Chém -> canPlay = true
    expect(canPlayCard(state, 0, realSlashes[0].id).valid).toBe(true);

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: realSlashes[0].id,
      targetId: 1
    });

    expect(p0.turnStats?.slashCount).toBe(1);

    // HỢP ĐỒNG: Không có Liên Nỏ thì lá Chém thứ 2 bắt buộc canPlay = false
    expect(canPlayCard(state, 0, realSlashes[1].id).valid).toBe(false);
  });

  it('3. Phương Thiên Kích Thật: TargetResolver tự động mở khóa 3 mục tiêu khi là lá bài duy nhất', () => {
    const state = createMockGameState();
    const p0 = state.getPlayer(0);

    const phuongThien = { id: 'phương-thiên-kích-0-1792972291440_97', name: 'Phương Thiên Kích' };
    p0.equipment.weapon = phuongThien;

    const deck = CardDeck.getStandardDeck();
    const slash1 = deck.find(c => c.name === 'Chém');

    // Chỉ còn đúng 1 lá bài trên tay -> type: 'multiple', max: 3
    p0.hand = [slash1];
    const defSingle = getTargetingDefinition(state, 0, slash1.name, slash1);
    expect(defSingle.type).toBe('multiple');
    expect(defSingle.max).toBe(3);

    // Khi còn 2 lá bài trên tay -> type: 'single'
    p0.hand.push({ id: 'dummy_card', name: 'Đào', type: 'basic' });
    const defMulti = getTargetingDefinition(state, 0, slash1.name, slash1);
    expect(defMulti.type).toBe('single');
  });
});
