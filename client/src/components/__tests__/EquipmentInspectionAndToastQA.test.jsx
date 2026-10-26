// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerBoard } from '../game/PlayerBoard';
import GameView from '../game/GameView';
import * as GameProvider from '../../contexts/GameProvider';
import * as SelectionProvider from '../../contexts/SelectionProvider';
import { CARD_SUBTYPES, PHASES } from 'shared/data/gameData';

vi.mock('../../contexts/GameProvider', () => ({
  useGameState: vi.fn(),
  useGameAPI: vi.fn(),
  useGameController: vi.fn(),
}));

vi.mock('../../contexts/SelectionProvider', () => ({
  useSelection: vi.fn(),
}));

describe('QA Equipment Inspection & Toast Notification Enhancements', () => {
  const mockPlayer = {
    id: 1,
    name: 'Người chơi 2',
    isAlive: true,
    faction: 'Hà',
    isRevealed: true,
    heroes: [
      { id: 'nguyen-trai', name: 'Nguyễn Trãi', maxHp: 3, hp: 3, isRevealed: true, skills: [{ name: 'Bình Ngô', desc: 'Mô tả' }] }
    ],
    equipment: [
      {
        id: 'lien_no_1',
        name: 'Liên Nỏ',
        subType: CARD_SUBTYPES.EQUIP_WEAPON,
        suit: 'spade',
        rank: '2',
        color: 'black',
        attackRange: 1,
        desc: 'Có thể dùng vô hạn [Chém].'
      }
    ],
    judgementArea: [],
    hp: 3,
    maxHp: 3,
    handCount: 4,
    distanceFromMe: 1
  };

  const mockMe = {
    id: 0,
    name: 'Bạn',
    attackRange: 1,
    equipment: [],
    hand: [],
    heroes: [],
    draftHeroes: [],
    hasDrafted: true
  };

  const mockGameState = {
    phase: PHASES.ACTION,
    currentPlayerIndex: 0,
    players: [mockMe, mockPlayer],
    logs: [{ text: 'Game bắt đầu' }]
  };

  it('PlayerBoard: clicking equipment row triggers setHeroPopup with initialTab: equipment', () => {
    const setHeroPopup = vi.fn();
    const setCardPopup = vi.fn();

    const { container } = render(
      <PlayerBoard
        player={mockPlayer}
        gameState={mockGameState}
        me={mockMe}
        setHeroPopup={setHeroPopup}
        setCardPopup={setCardPopup}
      />
    );

    const equipRow = container.querySelector('.opponent-equipment-row');
    expect(equipRow).toBeTruthy();

    fireEvent.click(equipRow);
    expect(setHeroPopup).toHaveBeenCalledTimes(1);
    expect(setHeroPopup).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      initialTab: 'equipment'
    }));
  });

  it('PlayerBoard: clicking individual slot triggers setHeroPopup with initialTab: equipment and stops propagation', () => {
    const setHeroPopup = vi.fn();
    const setCardPopup = vi.fn();

    const { container } = render(
      <PlayerBoard
        player={mockPlayer}
        gameState={mockGameState}
        me={mockMe}
        setHeroPopup={setHeroPopup}
        setCardPopup={setCardPopup}
      />
    );

    const slots = container.querySelectorAll('.equip-slot');
    expect(slots.length).toBe(4);

    // Click on empty armor slot
    fireEvent.click(slots[1]);
    expect(setHeroPopup).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      initialTab: 'equipment'
    }));
  });

  it('GameView: triggers game-toast-popup on reveal notification and dismisses on close button', () => {
    GameProvider.useGameAPI.mockReturnValue({ respond: vi.fn() });
    GameProvider.useGameController.mockReturnValue({ logs: [] });
    SelectionProvider.useSelection.mockReturnValue({
      selectedCardIndexes: [],
      selectedTargetIds: [],
      selectingTarget: false,
    });

    const initialGameState = {
      phase: PHASES.ACTION,
      currentPlayerIndex: 0,
      players: [mockMe, mockPlayer],
      logs: [{ text: 'Bắt đầu ván đấu' }]
    };

    GameProvider.useGameState.mockReturnValue(initialGameState);

    const { container, rerender } = render(
      <MemoryRouter>
        <GameView />
      </MemoryRouter>
    );

    // Add a new reveal hero log
    const updatedGameState = {
      ...initialGameState,
      logs: [
        { text: 'Bắt đầu ván đấu' },
        { text: '👁️ Bạn đã lộ diện tướng [Nguyễn Trãi] (Phe Hà)!' }
      ]
    };
    GameProvider.useGameState.mockReturnValue(updatedGameState);

    rerender(
      <MemoryRouter>
        <GameView />
      </MemoryRouter>
    );

    // Check toast popup
    const toast = container.querySelector('.game-toast-popup');
    expect(toast).toBeTruthy();
    expect(toast.textContent).toContain('Bạn đã lộ diện tướng [Nguyễn Trãi] (Phe Hà)!');

    // Click close button
    const closeBtn = container.querySelector('.game-toast-close');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);

    // After clicking close, toast should disappear
    const toastAfterClose = container.querySelector('.game-toast-popup');
    expect(toastAfterClose).toBeNull();
  });

  it('GameView: inspecting opponent with initialTab: equipment displays all 4 equipment slots', () => {
    GameProvider.useGameAPI.mockReturnValue({ respond: vi.fn() });
    GameProvider.useGameController.mockReturnValue({ logs: [] });
    SelectionProvider.useSelection.mockReturnValue({
      selectedCardIndexes: [],
      selectedTargetIds: [],
      selectingTarget: false,
    });

    const gameState = {
      phase: PHASES.ACTION,
      currentPlayerIndex: 0,
      players: [mockMe, mockPlayer],
      logs: [{ text: 'Ván đấu đang diễn ra' }]
    };

    GameProvider.useGameState.mockReturnValue(gameState);

    const { container } = render(
      <MemoryRouter>
        <GameView />
      </MemoryRouter>
    );

    // Tap opponent equipment row
    const equipRow = container.querySelector('.opponent-equipment-row');
    expect(equipRow).toBeTruthy();
    fireEvent.click(equipRow);

    // Modal should now be open
    const modalHeader = screen.getByText(/Hồ Sơ: Người chơi 2/i);
    expect(modalHeader).toBeTruthy();

    // Equipment tab should be active
    const equipTabBtn = screen.getByText(/Trang Bị & Phán Xét/i);
    expect(equipTabBtn).toBeTruthy();

    // Verify all 4 slots are visible
    expect(screen.getAllByText(/Vũ Khí/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Phòng Cụ/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ngựa Công/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ngựa Thủ/i).length).toBeGreaterThanOrEqual(1);

    // Verify Liên Nỏ weapon is displayed with range and description
    expect(screen.getAllByText(/Liên Nỏ/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Tầm: 1/i)).toBeTruthy();
    expect(screen.getByText(/Có thể dùng vô hạn \[Chém\]/i)).toBeTruthy();

    // Switch to heroes tab
    const heroesTabBtn = screen.getByText(/Võ Tướng/i);
    fireEvent.click(heroesTabBtn);
    expect(screen.getByText(/Nguyễn Trãi/i)).toBeTruthy();
  });
});
