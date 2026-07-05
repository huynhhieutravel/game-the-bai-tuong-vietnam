// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import GameView from '../game/GameView';
import * as GameProvider from '../../contexts/GameProvider';
import * as SelectionProvider from '../../contexts/SelectionProvider';
import { PHASES } from '../../data/gameData';

vi.mock('../../contexts/GameProvider', () => ({
  useGameState: vi.fn(),
  useGameAPI: vi.fn(),
  useGameController: vi.fn(),
}));

vi.mock('../../contexts/SelectionProvider', () => ({
  useSelection: vi.fn(),
}));

describe('GameView Component', () => {
  const mockPlayers = [
    { id: 0, isAlive: true, name: 'Player 0', hand: [{ idx: 0, name: 'Chém', suit: '♠', color: 'black' }], hp: 3, maxHp: 3, equipment: [], draftHeroes: [{id: 1, faction: 'Lạc'}], hasDrafted: false },
    { id: 1, isAlive: true, name: 'Player 1', hand: [], hp: 3, maxHp: 3, equipment: [], draftHeroes: [], hasDrafted: false },
  ];

  it('renders GameView in DRAFT phase without crashing', () => {
    GameProvider.useGameState.mockReturnValue({
      players: mockPlayers,
      phase: PHASES.DRAFT,
      currentPlayerIndex: 0,
      deck: []
    });
    GameProvider.useGameAPI.mockReturnValue({ respond: vi.fn() });
    GameProvider.useGameController.mockReturnValue({ logs: [] });
    SelectionProvider.useSelection.mockReturnValue({
      selectedCardIndexes: [],
      selectedTargetIds: [],
      selectingTarget: false,
    });

    const { container } = render(
      <MemoryRouter>
        <GameView />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders GameView in ACTION phase without crashing', () => {
    GameProvider.useGameState.mockReturnValue({
      players: mockPlayers,
      phase: PHASES.ACTION,
      currentPlayerIndex: 0,
      deck: []
    });
    const { container } = render(
      <MemoryRouter>
        <GameView />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
