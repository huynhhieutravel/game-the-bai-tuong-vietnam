// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useCardInteraction } from '../game/hooks/useCardInteraction';
import { useTargeting } from '../game/hooks/useTargeting';
import { PlayerHand } from '../game/PlayerHand';
import { CARD_TYPES } from 'shared/constants/cardTypes';

describe('QA Toàn Diện Kỹ Năng Chuyển Hóa & Chọn Mục Tiêu (Converting & Target Skills)', () => {
  const redCard = { id: 'c_red_1', name: 'Đào', type: CARD_TYPES.BASIC, suit: 'heart', color: 'red', rank: '7' };
  const blackCard = { id: 'c_black_1', name: 'Sát Khí', type: CARD_TYPES.BASIC, suit: 'spade', color: 'black', rank: '10' };
  const diamondCard = { id: 'c_dia_1', name: 'Quạt Ba Tiêu', type: CARD_TYPES.EQUIP, suit: 'diamond', color: 'red', rank: 'A' };
  const dodgeCard = { id: 'c_dodge_1', name: 'Né', type: CARD_TYPES.BASIC, suit: 'diamond', color: 'red', rank: '2' };

  const mockPlayer = {
    id: 0,
    name: 'Người Chơi',
    hp: 3,
    maxHp: 3,
    hand: [redCard, blackCard, diamondCard, dodgeCard],
    skills: ['hoa_than_an_tu'],
    heroes: [{ id: 'cong_chua_an_tu', name: 'Công chúa An Tư', skills: [{ id: 'hoa_than_an_tu', name: 'Hòa Thân' }] }]
  };

  const mockGameState = {
    phase: 'action',
    currentPlayerIndex: 0,
    waitingForResponse: null,
    players: [
      mockPlayer,
      { id: 1, name: 'Đối thủ 1', isAlive: true, hp: 3, maxHp: 3, hand: [{ id: 'c_enemy', name: 'Chém' }] },
      { id: 2, name: 'Đối thủ 2', isAlive: true, hp: 2, maxHp: 3, hand: [] }
    ]
  };

  it('1. Khai Thiên (slug khai_thien): Thẻ bài Đỏ biến thành Chém, thẻ bài Đen bị chặn', () => {
    let captured = null;
    function TestComponent() {
      const { handleCardClick } = useCardInteraction({
        gameState: mockGameState,
        gameAPI: { addLog: vi.fn() },
        activeSkill: 'khai_thien',
        targetSession: null,
        setTargetSession: (s) => { captured = s; },
        cancelTargeting: vi.fn(),
        mainPlayerId: 0
      });
      return <button onClick={() => handleCardClick(0)}>Click Red</button>;
    }
    const { getByRole } = render(<TestComponent />);
    fireEvent.click(getByRole('button'));
    expect(captured).not.toBeNull();
    expect(captured.virtualCardName).toBe('Chém');
    expect(captured.card.id).toBe(redCard.id);
  });

  it('2. Kỳ Tập (slug ky_tap): Thẻ bài Đen biến thành Tước Bài', () => {
    let captured = null;
    function TestComponent() {
      const { handleCardClick } = useCardInteraction({
        gameState: mockGameState,
        gameAPI: { addLog: vi.fn() },
        activeSkill: 'ky_tap',
        targetSession: null,
        setTargetSession: (s) => { captured = s; },
        cancelTargeting: vi.fn(),
        mainPlayerId: 0
      });
      return <button onClick={() => handleCardClick(1)}>Click Black</button>;
    }
    const { getByRole } = render(<TestComponent />);
    fireEvent.click(getByRole('button'));
    expect(captured).not.toBeNull();
    expect(captured.virtualCardName).toBe('Tước Bài');
    expect(captured.card.id).toBe(blackCard.id);
  });

  it('3. Hòa Thân (slug hoa_than): Thẻ bài Rô (♦) biến thành Hỗn Loạn', () => {
    let captured = null;
    function TestComponent() {
      const { handleCardClick } = useCardInteraction({
        gameState: mockGameState,
        gameAPI: { addLog: vi.fn() },
        activeSkill: 'hoa_than',
        targetSession: null,
        setTargetSession: (s) => { captured = s; },
        cancelTargeting: vi.fn(),
        mainPlayerId: 0
      });
      return <button onClick={() => handleCardClick(2)}>Click Diamond</button>;
    }
    const { getByRole } = render(<TestComponent />);
    fireEvent.click(getByRole('button'));
    expect(captured).not.toBeNull();
    expect(captured.virtualCardName).toBe('Hỗn Loạn');
    expect(captured.card.id).toBe(diamondCard.id);
  });

  it('4. Tâm Công (slug tam_cong): Chọn mục tiêu không ném lỗi card.id và gửi ACTION_USE_SKILL đúng định dạng', () => {
    const dispatchAction = vi.fn();
    const setTargetSession = vi.fn();
    const isActionPending = { current: false };

    const targetSession = {
      card: null,
      virtualCardName: null,
      targetingDef: { type: 'single' },
      step: 0,
      selectedTargets: [],
      validTargets: [1, 2]
    };

    function TestTargeting() {
      const { handleTargetClick } = useTargeting({
        gameState: mockGameState,
        gameAPI: { dispatcher: { dispatchAction } },
        activeSkill: 'tam_cong',
        targetSession,
        setTargetSession,
        isActionPending,
        mainPlayerId: 0
      });

      return <button onClick={() => handleTargetClick(1)}>Select Enemy 1</button>;
    }

    const { getByRole } = render(<TestTargeting />);
    fireEvent.click(getByRole('button'));

    expect(dispatchAction).toHaveBeenCalledWith({
      type: 'ACTION_USE_SKILL',
      payload: {
        playerId: 0,
        skillId: 'tam-cong',
        targets: [1]
      }
    });
    expect(setTargetSession).toHaveBeenCalledWith(null);
  });

  it('5. PlayerHand: Tướng kích hoạt Khai Thiên với slug khai_thien nhận diện đúng bài Đỏ là isPlayable và cho phép click', () => {
    const handleCardClick = vi.fn();
    const { container } = render(
      <PlayerHand
        me={mockPlayer}
        gameState={mockGameState}
        needsDiscard={false}
        isMyTurn={true}
        activeSkill="khai_thien"
        targetSession={null}
        selectedDiscards={[]}
        handleDiscardToggle={vi.fn()}
        handleCardClick={handleCardClick}
        handleUnplayableClick={vi.fn()}
        cancelTargeting={vi.fn()}
        confirmPlayCard={vi.fn()}
      />
    );

    const cards = container.querySelectorAll('.card');
    // Card 0 (red) is playable
    expect(cards[0].classList.contains('unplayable')).toBe(false);
    // Card 1 (black) is unplayable
    expect(cards[1].classList.contains('unplayable')).toBe(true);

    fireEvent.click(cards[0]);
    expect(handleCardClick).toHaveBeenCalledWith(0);
  });
});
