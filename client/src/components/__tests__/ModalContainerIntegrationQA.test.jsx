// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { ModalContainer } from '../modals/ModalContainer';
import * as GameProvider from '../../contexts/GameProvider';

vi.mock('../../contexts/GameProvider', () => ({
  useGameState: vi.fn(),
  useGameAPI: vi.fn(),
}));

describe('Tầng 3 QA: ModalContainer Integration QA (Kiểm định DOM & Nút Bấm Thực Tế)', () => {
  let mockAPI;
  let basePlayers;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAPI = {
      respond: vi.fn(),
      playCard: vi.fn()
    };
    GameProvider.useGameAPI.mockReturnValue(mockAPI);

    basePlayers = [
      {
        id: 0,
        name: 'Bạn',
        isAlive: true,
        hp: 4,
        maxHp: 4,
        hand: [
          { id: 'slash_1', name: 'Chém', type: 'basic', suit: 'spade', rank: 7, color: 'black' },
          { id: 'dodge_red_1', name: 'Né', type: 'basic', suit: 'diamond', rank: 4, color: 'red' },
          { id: 'peach_1', name: 'Đào', type: 'basic', suit: 'heart', rank: 9, color: 'red' }
        ],
        equipment: { weapon: null, armor: null, defensiveHorse: null, offensiveHorse: null },
        skills: ['khai_thien'],
        revealedHeroes: [true, false],
        isRevealed: true
      },
      {
        id: 3,
        name: 'Người chơi 4',
        isAlive: true,
        hp: 3,
        maxHp: 3,
        hand: [],
        equipment: { weapon: null, armor: null, defensiveHorse: null, offensiveHorse: null },
        skills: [],
        revealedHeroes: [true, false],
        isRevealed: true
      }
    ];
  });

  describe('1. Quyết Đấu (ASK_SLASH_DUEL / ask_slash): Pop-up & Nút đánh trả', () => {
    it('Khi responderId === 0: Modal Quyết Đấu BẮT BUỘC phải render trên DOM và hiển thị đối thủ', () => {
      GameProvider.useGameState.mockReturnValue({
        players: basePlayers,
        waitingForResponse: {
          id: 'duel_frame_1',
          type: 'ask_slash',
          reason: 'quyet-dau',
          trickType: 'duel',
          responderId: 0, // Bạn
          sourceId: 0,
          targetId: 3,
          opponentId: 3,
          duelTargetId: 3
        }
      });

      render(<ModalContainer mainPlayerId={0} />);

      // Phải có tiêu đề hoặc nội dung Quyết Đấu với Người chơi 4
      expect(screen.getAllByText(/Quyết Đấu/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Người chơi 4/i).length).toBeGreaterThan(0);

      // Phải có thẻ bài Chém trong danh sách
      const slashCardNodes = screen.getAllByText('Chém');
      expect(slashCardNodes.length).toBeGreaterThan(0);

      // Nhấp chọn lá Chém
      fireEvent.click(slashCardNodes[0]);

      // Nút xác nhận Đánh trả được enable
      const confirmBtn = screen.getByText(/Đánh trả!/i);
      expect(confirmBtn).toBeTruthy();

      // Bấm đánh Chém -> Gọi API respond
      fireEvent.click(confirmBtn);
      expect(mockAPI.respond).toHaveBeenCalled();
      const callArg = mockAPI.respond.mock.calls[0][0];
      expect(callArg.playerId).toBe(0);
    });

    it('Khi responderId === 3: Modal KHÔNG ĐƯỢC xuất hiện trên màn hình của Player 0', () => {
      GameProvider.useGameState.mockReturnValue({
        players: basePlayers,
        waitingForResponse: {
          id: 'duel_frame_2',
          type: 'ask_slash',
          reason: 'quyet-dau',
          trickType: 'duel',
          responderId: 3, // Người chơi 4
          sourceId: 0,
          targetId: 3,
          opponentId: 0
        }
      });

      render(<ModalContainer mainPlayerId={0} />);
      expect(screen.queryByText(/Quyết Đấu với Người chơi 4/i)).toBeNull();
    });
  });

  describe('2. Hóa Giải (ASK_NEGATE / ask_negate): Pop-up & Nút bấm', () => {
    it('Khi có cẩm nang và responderId === 0: Modal Hóa Giải render và nút Bỏ qua gửi doNegate: false', () => {
      const playersWithNegate = [
        {
          ...basePlayers[0],
          hand: [{ id: 'negate_1', name: 'Hóa Giải', type: 'trick', suit: 'heart', rank: 11, color: 'red' }]
        },
        basePlayers[1]
      ];

      GameProvider.useGameState.mockReturnValue({
        players: playersWithNegate,
        waitingForResponse: {
          id: 'negate_frame_1',
          type: 'ask_negate',
          responderId: 0,
          sourceId: 3,
          targetId: 0,
          card: { name: 'Hỗn Loạn' }
        }
      });

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getAllByText(/Hóa Giải/i).length).toBeGreaterThan(0);

      // Nút bỏ qua
      const skipBtn = screen.getByText(/Bỏ qua/i);
      expect(skipBtn).toBeTruthy();

      fireEvent.click(skipBtn);
      expect(mockAPI.respond).toHaveBeenCalled();
      const callArg = mockAPI.respond.mock.calls[0][0];
      expect(callArg.playerId).toBe(0);
      expect(callArg.doNegate).toBe(false);
    });
  });

  describe('3. Né Đòn (ASK_DODGE / ask_dodge): Pop-up & Nút bấm', () => {
    it('Khi bị Chém và responderId === 0: Modal Né xuất hiện', () => {
      GameProvider.useGameState.mockReturnValue({
        players: basePlayers,
        waitingForResponse: {
          id: 'dodge_frame_1',
          type: 'ask_dodge',
          reason: 'chem',
          responderId: 0,
          sourceId: 3,
          targetId: 0
        }
      });

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getAllByText(/Né/i).length).toBeGreaterThan(0);
      const skipBtn = screen.getByText(/Chịu đấm/i);
      expect(skipBtn).toBeTruthy();

      fireEvent.click(skipBtn);
      expect(mockAPI.respond).toHaveBeenCalled();
    });
  });

  describe('4. Kỹ năng Vũ khí (ASK_WEAPON_SKILL / ask_weapon_skill): Rìu Đá & Thanh Long Đao', () => {
    it('Khi kích hoạt Rìu Đá và responderId === 0: Modal vũ khí hiện nút Bỏ qua', () => {
      GameProvider.useGameState.mockReturnValue({
        players: basePlayers,
        waitingForResponse: {
          id: 'weapon_frame_1',
          type: 'ask_weapon_skill',
          weapon: 'Rìu Đá',
          responderId: 0,
          sourceId: 0,
          targetId: 3
        }
      });

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getAllByText(/Rìu Đá/i).length).toBeGreaterThan(0);
      const skipBtn = screen.getByText(/Bỏ qua/i);
      expect(skipBtn).toBeTruthy();

      fireEvent.click(skipBtn);
      expect(mockAPI.respond).toHaveBeenCalled();
      const callArg = mockAPI.respond.mock.calls[0][0];
      expect(callArg.playerId).toBe(0);
      expect(callArg.doUse).toBe(false);
    });
  });

  describe('5. Kêu gọi Định Quốc (ASK_DINH_QUOC / ask_dinh_quoc): Dâng bài cho Đinh Điền', () => {
    it('Khi responderId === 0: Modal Định Quốc hiển thị và cho phép chọn lá Né để dâng bài hoặc từ chối', () => {
      GameProvider.useGameState.mockReturnValue({
        players: basePlayers,
        waitingForResponse: {
          id: 'dq_frame_1',
          type: 'ask_dinh_quoc',
          responderId: 0,
          sourceId: 3
        }
      });

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getByText(/KÊU GỌI ĐỊNH QUỐC/i)).toBeTruthy();
      expect(screen.getByText(/Từ Chối/i)).toBeTruthy();

      // Click Từ Chối
      fireEvent.click(screen.getByText(/Từ Chối/i));
      expect(mockAPI.respond).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 0,
        doReact: false,
        cancel: true
      }));
    });
  });
});

