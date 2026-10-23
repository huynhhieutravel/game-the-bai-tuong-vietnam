// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { GameProvider, useGameState, useGameController, useGameAPI } from '../../contexts/GameProvider';
import { PHASES } from 'shared/constants/phases';

function TestConsumer({ onStateChange }) {
  const gameState = useGameState();
  const controller = useGameController();
  const api = useGameAPI();

  React.useEffect(() => {
    if (gameState && onStateChange) {
      onStateChange(gameState, controller, api);
    }
  }, [gameState, controller, api, onStateChange]);

  return (
    <div>
      <div data-testid="phase">{gameState?.phase}</div>
      <div data-testid="player-count">{gameState?.players?.length}</div>
    </div>
  );
}

describe('GameProvider with Engine v4 Integration', () => {
  it('mounts in DRAFT phase and transitions to ACTION phase after drafting', () => {
    let capturedState = null;
    let capturedController = null;
    let capturedApi = null;

    const { getByTestId } = render(
      <GameProvider playerCount={4}>
        <TestConsumer onStateChange={(state, ctrl, api) => {
          capturedState = state;
          capturedController = ctrl;
          capturedApi = api;
        }} />
      </GameProvider>
    );

    // Initial state: DRAFT
    expect(getByTestId('phase').textContent).toBe(PHASES.DRAFT);
    expect(getByTestId('player-count').textContent).toBe('4');
    expect(capturedState.phase).toBe(PHASES.DRAFT);

    // Simulate hero selection for all 4 players
    act(() => {
      capturedController.selectDraftHeroes(0, 'lac_long_quan', 'son_tinh');
      capturedController.selectDraftHeroes(1, 'trieu_quang_phuc', 'phung_hung');
      capturedController.selectDraftHeroes(2, 'hai_ba_trung', 'le_loi');
      capturedController.selectDraftHeroes(3, 'dinh_tien_hoang', 'ngo_quyen');
    });

    // Now state should have transitioned into in-game ACTION phase
    expect(capturedState.phase).toBe(PHASES.ACTION);
    expect(getByTestId('phase').textContent).toBe(PHASES.ACTION);
    expect(capturedState.players[0].hand.length).toBeGreaterThan(0);
    expect(capturedApi).not.toBeNull();
  });
});
