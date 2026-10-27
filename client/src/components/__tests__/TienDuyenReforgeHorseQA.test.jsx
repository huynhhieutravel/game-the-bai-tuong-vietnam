// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ActionBar } from '../game/ActionBar';
import { PlayerHand } from '../game/PlayerHand';
import { useCardInteraction } from '../game/hooks/useCardInteraction';
import { DispatcherV4 } from 'shared/engine_v4/application/DispatcherV4';
import { GameState } from 'shared/engine_v4/core/GameState.js';
import { CARD_TYPES } from 'shared/constants/cardTypes';

describe('QA Tiên Duyên (Chử Đồng Tử): Rèn Lại Ngựa Chất Chuồn (Club) & Tránh Lỗi x.card.id', () => {
  let mockMe;
  let mockGameState;
  let mockHorseClub;

  beforeEach(() => {
    mockHorseClub = {
      id: 'ngua-chien-club-101',
      name: 'Ngựa Chiến (-1)',
      type: CARD_TYPES.EQUIP,
      subtype: 'equip_mount_atk',
      suit: 'club',
      rank: 'K',
      color: 'black',
      desc: 'Giảm khoảng cách từ mình đến người khác đi 1.',
      isPlayable: false
    };

    mockMe = {
      id: 0,
      name: 'Chử Đồng Tử',
      isAlive: true,
      hp: 3,
      maxHp: 3,
      hand: [mockHorseClub],
      heroes: [
        {
          id: 'chu_dong_tu',
          name: 'Chử Đồng Tử',
          skills: [
            { id: 'tien_duyen_chu_dong_tu', name: 'Tiên Duyên', type: 'active', isUsable: true, isRevealed: true }
          ]
        }
      ],
      equipment: {}
    };

    mockGameState = {
      phase: 'ACTION',
      currentPlayerIndex: 0,
      waitingForResponse: null,
      players: [
        mockMe,
        { id: 1, name: 'Đối thủ', isAlive: true, hp: 3, maxHp: 3, hand: [] }
      ]
    };
  });

  it('1. Khu vực Client UI: Khi mới bấm Tiên Duyên (chưa chọn bài), targetSession.card = null -> Nút Rèn Lại KHÔNG được kích hoạt và không ném lỗi x.card.id', () => {
    const playCard = vi.fn();
    const cancelTargeting = vi.fn();
    const isActionPending = { current: false };

    // targetSession được sinh ra khi vừa bấm nút skill Tiên Duyên
    const targetSession = {
      card: null,
      virtualCardName: null,
      targetingDef: { type: 'single', filter: () => [], optional: true },
      step: 0,
      selectedTargets: [],
      validTargets: [],
      message: '✨ Hãy nhấp chọn 1 lá bài ♣ trên tay.'
    };

    const { queryByRole } = render(
      <ActionBar
        me={mockMe}
        gameState={mockGameState}
        isMyTurn={true}
        needsDiscard={false}
        targetSession={targetSession}
        activeSkill="Tiên Duyên"
        handleExecuteSkill={vi.fn()}
        cancelTargeting={cancelTargeting}
        gameAPI={{ playCard }}
        isActionPending={isActionPending}
      />
    );

    // Ở ActionBar, vì card là null nên không có nút xác nhận nào có thể submit gây lỗi x.card.id
    const confirmBtn = queryByRole('button', { name: /Xác Nhận|Rèn Lại|Dùng/i });
    expect(confirmBtn).toBeNull();
  });

  it('2. Khu vực Client UI: PlayerHand nhận diện lá Ngựa chất Chuồn là isPlayable khi activeSkill là Tiên Duyên (kể cả slug hay display name)', () => {
    const handleCardClick = vi.fn();

    const { getByText } = render(
      <PlayerHand
        me={mockMe}
        gameState={mockGameState}
        needsDiscard={false}
        isMyTurn={true}
        activeSkill="Tiên Duyên"
        targetSession={null}
        selectedDiscards={[]}
        handleDiscardToggle={vi.fn()}
        handleCardClick={handleCardClick}
        handleUnplayableClick={vi.fn()}
        cancelTargeting={vi.fn()}
        confirmPlayCard={vi.fn()}
      />
    );

    const horseElement = getByText('Ngựa Chiến (-1)');
    const cardContainer = horseElement.closest('.card');
    expect(cardContainer).not.toBeNull();
    // Không bị gán class unplayable vì là bài Chuồn có thể chuyển hóa bằng Tiên Duyên
    expect(cardContainer.classList.contains('unplayable')).toBe(false);

    // Click vào lá bài gọi handleCardClick(0)
    fireEvent.click(cardContainer);
    expect(handleCardClick).toHaveBeenCalledWith(0);
  });

  it('3. Khu vực Hook useCardInteraction: Nhấp lá Ngựa Chiến (♣) khi bật Tiên Duyên sẽ khởi tạo targetSession với virtualCardName Xiềng Xích và card đầy đủ', () => {
    let capturedSession = null;
    const setTargetSession = vi.fn(session => {
      capturedSession = session;
    });

    function TestCardInteraction() {
      const { handleCardClick } = useCardInteraction({
        gameState: mockGameState,
        gameAPI: { addLog: vi.fn() },
        activeSkill: 'Tiên Duyên',
        targetSession: null,
        setTargetSession,
        cancelTargeting: vi.fn(),
        mainPlayerId: 0
      });

      return (
        <button onClick={() => handleCardClick(0)}>Click Card 0</button>
      );
    }

    const { getByRole } = render(<TestCardInteraction />);
    fireEvent.click(getByRole('button'));

    expect(setTargetSession).toHaveBeenCalled();
    expect(capturedSession).not.toBeNull();
    expect(capturedSession.card.id).toBe('ngua-chien-club-101');
    expect(capturedSession.virtualCardName).toBe('Xiềng Xích');
    expect(capturedSession.targetingDef.type).toBe('multiple');
  });

  it('4. Khu vực Client UI: Sau khi lá Ngựa (♣) được chọn, Floating Action Pill trên PlayerHand hiển thị Rèn Lại và gọi confirmPlayCard an toàn', () => {
    const confirmPlayCard = vi.fn();
    const targetSession = {
      card: mockHorseClub,
      cardIndex: 0,
      virtualCardName: 'Xiềng Xích',
      targetingDef: { type: 'multiple', max: 2 },
      selectedTargets: [],
      validTargets: [1]
    };

    const { container } = render(
      <PlayerHand
        me={mockMe}
        gameState={mockGameState}
        needsDiscard={false}
        isMyTurn={true}
        activeSkill="Tiên Duyên"
        targetSession={targetSession}
        selectedDiscards={[]}
        handleDiscardToggle={vi.fn()}
        handleCardClick={vi.fn()}
        handleUnplayableClick={vi.fn()}
        cancelTargeting={vi.fn()}
        confirmPlayCard={confirmPlayCard}
      />
    );

    const confirmBtn = container.querySelector('.btn-card-floating-confirm');
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn.textContent.trim()).toBe('Rèn Lại');

    fireEvent.click(confirmBtn);
    expect(confirmPlayCard).toHaveBeenCalled();
  });

  it('5. Khu vực Engine Core (DispatcherV4): Rèn Lại lá Ngựa Chiến (♣) thành công, rút 1 lá mới và không tự trang bị lên người', () => {
    const rawState = {
      phase: 'ACTION',
      players: [
        {
          id: 0,
          name: 'Chử Đồng Tử',
          isAlive: true,
          hp: 3,
          maxHp: 3,
          heroes: [{ id: 'chu_dong_tu', name: 'Chử Đồng Tử', skills: ['tien_duyen_chu_dong_tu'] }],
          skills: ['tien_duyen_chu_dong_tu'],
          revealedHeroes: [true],
          hand: [mockHorseClub],
          equipment: {}
        },
        {
          id: 1,
          name: 'Đối thủ',
          isAlive: true,
          hp: 3,
          maxHp: 3,
          hand: [],
          heroes: [],
          equipment: {}
        }
      ],
      drawPile: [
        { id: 'deck_card_new', name: 'Đào', type: 'basic', suit: 'heart', color: 'red', rank: '7' }
      ],
      discardPile: [],
      logs: []
    };

    const state = new GameState(rawState);
    const dispatcher = new DispatcherV4(state);

    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: {
        sourceId: 0,
        cardId: mockHorseClub.id,
        targetIds: [],
        virtualCardName: 'Xiềng Xích',
        isReforge: true,
        reforge: true,
        asChain: true
      }
    });

    const p0 = state.getPlayer(0);
    // Lá Ngựa Chiến KHÔNG bị gắn vào ô equipment
    expect(p0.equipment?.horse_attack).toBeFalsy();
    // Lá Ngựa Chiến đã bị bỏ vào discardPile
    expect(state.discardPile.some(c => c.id === mockHorseClub.id)).toBe(true);
    // Người chơi đã rút lá mới từ drawPile
    expect(p0.hand.some(c => c.id === 'deck_card_new')).toBe(true);
    expect(p0.hand.some(c => c.id === mockHorseClub.id)).toBe(false);
  });
});
