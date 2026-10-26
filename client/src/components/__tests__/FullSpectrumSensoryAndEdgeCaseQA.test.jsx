// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { ModalContainer } from '../modals/ModalContainer';
import { PlayerBoard } from '../game/PlayerBoard';
import MyHeroBar from '../game/MyHeroBar';
import { GameOverModal } from '../modals/GameOverModal';
import * as GameProvider from '../../contexts/GameProvider';

vi.mock('../../contexts/GameProvider', () => ({
  useGameState: vi.fn(),
  useGameAPI: vi.fn(),
}));

describe('Full-Spectrum Sensory & Edge-Case QA Suite (ADR 0081)', () => {
  let mockAPI;
  let basePlayers;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAPI = {
      respond: vi.fn(),
      playCard: vi.fn(),
      addLog: vi.fn()
    };
    GameProvider.useGameAPI.mockReturnValue(mockAPI);

    basePlayers = [
      {
        id: 0,
        name: 'Bạn',
        faction: 'Hà',
        isAlive: true,
        hp: 3,
        maxHp: 3,
        hand: [
          { id: 'dodge_1', name: 'Né', type: 'dodge', suit: 'diamond', rank: '7', color: 'red' },
          { id: 'sam_set_1', name: 'Sấm Sét', type: 'trick', idKey: 'sam_set', suit: 'spade', rank: 'A', color: 'black' },
          { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'spade', rank: '8', color: 'black' }
        ],
        equipment: { weapon: null, armor: null, mount_atk: null, mount_def: null },
        heroes: [
          { id: 'nguyen_trai', name: 'Nguyễn Trãi', hp: 3, maxHp: 3, faction: 'Hà' },
          { id: 'tran_khanh_du', name: 'Trần Khánh Dư', hp: 3, maxHp: 3, faction: 'Hà' }
        ],
        revealedHeroes: [true, true],
        isRevealed: true
      },
      {
        id: 1,
        name: 'Đối thủ Sơn',
        faction: 'Sơn',
        isAlive: true,
        hp: 4,
        maxHp: 4,
        hand: [{ id: 'card_x', name: 'Đào' }],
        equipment: { weapon: null, armor: null, mount_atk: null, mount_def: null },
        heroes: [
          { id: 'dinh_dien', name: 'Đinh Điền', hp: 4, maxHp: 4, faction: 'Sơn' },
          { id: 'son_tinh', name: 'Sơn Tinh', hp: 4, maxHp: 4, faction: 'Sơn' }
        ],
        revealedHeroes: [true, true],
        isRevealed: true
      },
      {
        id: 2,
        name: 'Đối thủ Tử Trận',
        faction: 'Lạc',
        isAlive: false,
        hp: 0,
        maxHp: 4,
        hand: [],
        equipment: { weapon: null, armor: null, mount_atk: null, mount_def: null },
        heroes: [
          { id: 'an_duong_vuong', name: 'An Dương Vương', hp: 4, maxHp: 4, faction: 'Lạc' },
          { id: 'cao_lo', name: 'Cao Lỗ', hp: 4, maxHp: 4, faction: 'Lạc' }
        ],
        revealedHeroes: [true, true],
        isRevealed: true
      }
    ];
  });

  describe('1. Kiểm Định Modal Kêu Gọi Định Quốc (DinhQuocModal)', () => {
    it('Khi Đinh Điền kêu gọi và responderId === 0: Hiện Modal Kêu Gọi Định Quốc với lá Né & Sấm Sét', () => {
      GameProvider.useGameState.mockReturnValue({
        players: basePlayers,
        waitingForResponse: {
          id: 'frame_dq_1',
          type: 'ask_dinh_quoc',
          responderId: 0,
          sourceId: 1
        }
      });

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getByText(/KÊU GỌI ĐỊNH QUỐC/i)).toBeTruthy();
      expect(screen.getByText(/Từ Chối/i)).toBeTruthy();
      expect(screen.getAllByText(/Né/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Sấm Sét/i).length).toBeGreaterThan(0);

      // Bấm Từ Chối
      fireEvent.click(screen.getByText(/Từ Chối/i));
      expect(mockAPI.respond).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 0,
        doReact: false,
        cancel: true
      }));
    });

    it('Khi chọn lá [Né] và bấm Dâng Bài: Gửi payload doReact: true kèm cardId', () => {
      GameProvider.useGameState.mockReturnValue({
        players: basePlayers,
        waitingForResponse: {
          id: 'frame_dq_2',
          type: 'ask_dinh_quoc',
          responderId: 0,
          sourceId: 1
        }
      });

      render(<ModalContainer mainPlayerId={0} />);

      const neCards = screen.getAllByText(/Né/i);
      // Index 0 là text trong phần mô tả, Index 1 là lá bài Né trong CardSelector
      const neCardItem = neCards[1] || neCards[0];
      fireEvent.click(neCardItem);

      const dangBaiBtn = screen.getByText(/Dâng Bài/i);
      expect(dangBaiBtn.disabled).toBe(false);
      fireEvent.click(dangBaiBtn);

      expect(mockAPI.respond).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 0,
        doReact: true,
        cardId: 'dodge_1'
      }));
    });
  });

  describe('2. Kiểm Định Dán Nhãn Tử Trận (PlayerBoard & MyHeroBar)', () => {
    it('PlayerBoard: Người chơi đã chết (id=2) phải có huy hiệu 💀 TỬ TRẬN và con dấu dập qua ảnh tướng', () => {
      const deadPlayer = basePlayers[2];
      render(
        <PlayerBoard
          player={deadPlayer}
          gameState={{ players: basePlayers }}
          me={basePlayers[0]}
          isCurrentTurn={false}
          targetSession={null}
          handleTargetClick={vi.fn()}
          setHeroPopup={vi.fn()}
          setCardPopup={vi.fn()}
        />
      );

      expect(screen.getAllByText(/💀 TỬ TRẬN/i).length).toBeGreaterThan(0);
    });

    it('PlayerBoard: Người chơi còn sống (id=1) KHÔNG ĐƯỢC có huy hiệu 💀 TỬ TRẬN', () => {
      const alivePlayer = basePlayers[1];
      render(
        <PlayerBoard
          player={alivePlayer}
          gameState={{ players: basePlayers }}
          me={basePlayers[0]}
          isCurrentTurn={false}
          targetSession={null}
          handleTargetClick={vi.fn()}
          setHeroPopup={vi.fn()}
          setCardPopup={vi.fn()}
        />
      );

      expect(screen.queryByText(/💀 TỬ TRẬN/i)).toBeNull();
      expect(screen.getAllByText(/SƠN/i).length).toBeGreaterThan(0);
    });

    it('MyHeroBar: Khi bạn còn sống thì hiển thị đúng tag PHE HÀ, khi chết thì đổi sang 💀 TỬ TRẬN', () => {
      const { rerender } = render(
        <MyHeroBar
          me={basePlayers[0]}
          gameState={{ players: basePlayers }}
          activePhase="action"
          handleRevealClick={vi.fn()}
          actionBar={<div>ActionBar</div>}
          playerHand={<div>PlayerHand</div>}
          setHeroPopup={vi.fn()}
          setCardPopup={vi.fn()}
          targetSession={null}
          handleTargetClick={vi.fn()}
        />
      );

      expect(screen.getByText(/PHE HÀ/i)).toBeTruthy();
      expect(screen.queryByText(/💀 TỬ TRẬN/i)).toBeNull();

      // Cập nhật Bạn bị tử trận
      const deadMe = { ...basePlayers[0], isAlive: false, hp: 0 };
      rerender(
        <MyHeroBar
          me={deadMe}
          gameState={{ players: basePlayers }}
          activePhase="action"
          handleRevealClick={vi.fn()}
          actionBar={<div>ActionBar</div>}
          playerHand={<div>PlayerHand</div>}
          setHeroPopup={vi.fn()}
          setCardPopup={vi.fn()}
          targetSession={null}
          handleTargetClick={vi.fn()}
        />
      );

      expect(screen.getByText(/💀 TỬ TRẬN/i)).toBeTruthy();
      expect(screen.getByText(/💀 BẠN ĐÃ TỬ TRẬN/i)).toBeTruthy();
    });
  });

  describe('3. Kiểm Định GameOverModal (Màn Hình Kết Thúc Trận)', () => {
    it('Hiển thị bảng điểm và danh hiệu CHIẾN THẮNG khi phe Hà thắng', () => {
      const onRestart = vi.fn();
      const onClose = vi.fn();
      const onHome = vi.fn();

      const gameOverGameState = {
        gameOver: true,
        winner: [0],
        players: basePlayers
      };

      render(
        <GameOverModal
          gameState={gameOverGameState}
          mainPlayerId={0}
          onRestart={onRestart}
          onClose={onClose}
          onHome={onHome}
        />
      );

      expect(screen.getByText(/CHIẾN THẮNG/i)).toBeTruthy();
      expect(screen.getByText(/PHE HÀ/i)).toBeTruthy();
      expect(screen.getByText(/🔄 Chơi Lại Ván Mới/i)).toBeTruthy();
      expect(screen.getByText(/📜 Xem Lại Bàn Đấu/i)).toBeTruthy();
      expect(screen.getByText(/🏠 Về Menu Chính/i)).toBeTruthy();

      // Bấm Chơi lại
      fireEvent.click(screen.getByText(/🔄 Chơi Lại Ván Mới/i));
      expect(onRestart).toHaveBeenCalled();

      // Bấm Xem lại bàn đấu
      fireEvent.click(screen.getByText(/📜 Xem Lại Bàn Đấu/i));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
