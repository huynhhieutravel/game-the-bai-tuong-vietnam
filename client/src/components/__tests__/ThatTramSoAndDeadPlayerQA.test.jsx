// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThatTramSoPunishModal } from '../modals/ThatTramSoPunishModal';
import { RangeSystem } from '../../../../shared/engine_v4/rules/RangeSystem';
import { toViewModel } from '../../../../shared/engine_v4/application/GameViewMapperV4';

describe('QA: Chu Văn An - Thất Trảm Sớ Card Selection & Dead Player Range Calculation', () => {
  it('ThatTramSoPunishModal cho phép tự chọn 2 lá bài trên tay để bỏ hoặc chọn nhận sát thương', () => {
    const onConfirm = vi.fn();
    const gameState = {
      players: [
        {
          id: 0,
          name: 'Player 0',
          hand: [
            { id: 'card_1', name: 'Sát Thương 1', suit: 'spade', rank: 'A' },
            { id: 'card_2', name: 'Phòng Thủ 2', suit: 'heart', rank: '8' },
            { id: 'card_3', name: 'Bảo Bối 3', suit: 'diamond', rank: 'K' }
          ]
        }
      ]
    };
    const req = { type: 'ask_that_tram_so_punish', responderId: 0 };

    render(<ThatTramSoPunishModal req={req} gameState={gameState} onConfirm={onConfirm} />);

    // Kiểm tra tiêu đề modal
    expect(screen.getByText(/HÌNH PHẠT THẤT TRẢM SỚ/i)).toBeTruthy();

    // Nút Bỏ 2 lá ban đầu phải bị disable vì chưa chọn đủ 2 lá (0/2)
    const discardBtn = screen.getByText(/Bỏ 2 Lá Đã Chọn \(0\/2\)/i);
    expect(discardBtn.disabled).toBe(true);

    // Click chọn lá card_1 và card_3
    fireEvent.click(screen.getByText('Sát Thương 1'));
    expect(screen.getByText(/Bỏ 2 Lá Đã Chọn \(1\/2\)/i).disabled).toBe(true);

    fireEvent.click(screen.getByText('Bảo Bối 3'));
    const readyDiscardBtn = screen.getByText(/Bỏ 2 Lá Đã Chọn \(2\/2\)/i);
    expect(readyDiscardBtn.disabled).toBe(false);

    // Bấm nút bỏ bài
    fireEvent.click(readyDiscardBtn);
    expect(onConfirm).toHaveBeenCalledWith({
      option: 'discard',
      cardIds: ['card_1', 'card_3']
    });

    // Bấm nút nhận 1 sát thương
    fireEvent.click(screen.getByText(/Nhận 1 Sát Thương/i));
    expect(onConfirm).toHaveBeenCalledWith({
      option: 'damage'
    });
  });

  it('ThatTramSoPunishModal khi có dưới 2 lá bài thì không cho phép bỏ bài', () => {
    const onConfirm = vi.fn();
    const gameState = {
      players: [
        {
          id: 0,
          name: 'Player 0',
          hand: [{ id: 'card_1', name: 'Sát', suit: 'club', rank: '3' }]
        }
      ]
    };
    const req = { type: 'ask_that_tram_so_punish', responderId: 0 };

    render(<ThatTramSoPunishModal req={req} gameState={gameState} onConfirm={onConfirm} />);

    expect(screen.getByText(/không đủ 2 lá bài/i)).toBeTruthy();
    expect(screen.queryByText(/Bỏ 2 Lá Đã Chọn/i)).toBeNull();

    // Chỉ có thể bấm nhận sát thương
    fireEvent.click(screen.getByText(/Nhận 1 Sát Thương/i));
    expect(onConfirm).toHaveBeenCalledWith({ option: 'damage' });
  });

  it('RangeSystem.calculateDistance trả về 999 và không quăng Exception khi người chơi đã chết / không tồn tại trong danh sách sống', () => {
    const p0 = { id: 0, name: 'Alive 0', equipment: {}, skills: [] };
    const p1 = { id: 1, name: 'Alive 1', equipment: {}, skills: [] };
    const pDead = { id: 2, name: 'Dead 2', equipment: {}, skills: [] };

    const alivePlayers = [p0, p1];

    // Khoảng cách giữa 2 người sống tính toán bình thường
    expect(RangeSystem.calculateDistance(p0, p1, alivePlayers)).toBe(1);

    // Người chơi pDead không nằm trong alivePlayers -> không throw Error mà trả về 999
    expect(() => RangeSystem.calculateDistance(p0, pDead, alivePlayers)).not.toThrow();
    expect(RangeSystem.calculateDistance(p0, pDead, alivePlayers)).toBe(999);
    expect(RangeSystem.calculateDistance(pDead, p0, alivePlayers)).toBe(999);
  });

  it('GameViewMapperV4.toViewModel không crash khi có người chơi tử trận (đang hấp hối/chết)', () => {
    const mockState = {
      players: [
        { id: 0, name: 'Me (Alive)', isAlive: true, hp: 3, maxHp: 3, hand: [], equipment: {} },
        { id: 1, name: 'Dead Ally', isAlive: false, hp: 0, maxHp: 3, hand: [], equipment: {} },
        { id: 2, name: 'Enemy (Alive)', isAlive: true, hp: 4, maxHp: 4, hand: [], equipment: {} }
      ],
      currentTurnPlayerId: 0,
      phase: 'ACTION',
      turn: 1,
      logs: [],
      priorityStack: { isEmpty: () => true, peek: () => null }
    };

    // Chuyển đổi sang ViewModel không được throw error
    let vm;
    expect(() => {
      vm = toViewModel(mockState, 0);
    }).not.toThrow();

    expect(vm).toBeDefined();
    const deadPlayerVM = vm.players.find(p => p.id === 1);
    expect(deadPlayerVM.isAlive).toBe(false);
    expect(deadPlayerVM.distanceFromMe).toBe('-');
  });
});
