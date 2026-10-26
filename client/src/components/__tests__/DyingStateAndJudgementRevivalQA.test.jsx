/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerBoard } from '../game/PlayerBoard';
import MyHeroBar from '../game/MyHeroBar';
import { GameState } from 'shared/engine_v4/core/GameState';
import { StateMachine, PHASES } from 'shared/engine_v4/core/StateMachine';
import { DispatcherV4 } from 'shared/engine_v4/application/DispatcherV4';
import { CombatRules } from 'shared/engine_v4/rules/CombatRules';

describe('QA Trạng Thái Hấp Hối và Phục Hồi Pha Phán Xét (Dying State & Judgement Revival QA)', () => {
  it('1. PlayerBoard: Khi người chơi cạn máu nhưng chưa chết (hp <= 0, isAlive: true) -> Hiển thị ⚠️ HẤP HỐI, KHÔNG hiển thị TỬ TRẬN', () => {
    const dyingPlayer = {
      id: 2,
      name: 'Người chơi 2',
      faction: 'lac',
      hp: 0,
      maxHp: 4,
      isAlive: true,
      isRevealed: true,
      revealedHeroes: [true, true],
      heroes: [{ name: 'Sơn Tinh' }, { name: 'Cao Lỗ' }],
      hand: [],
      equipment: {}
    };

    const me = { id: 0, faction: 'ha', isAlive: true, attackRange: 1 };
    const gameState = { players: [me, dyingPlayer] };

    render(
      <PlayerBoard 
        player={dyingPlayer} 
        gameState={gameState} 
        me={me} 
        isCurrentTurn={false} 
        handleTargetClick={() => {}} 
        setHeroPopup={() => {}} 
      />
    );

    // Phải có nhãn HẤP HỐI
    const dyingBadges = screen.getAllByText(/HẤP HỐI/i);
    expect(dyingBadges.length).toBeGreaterThanOrEqual(1);

    // Tuyệt đối KHÔNG ĐƯỢC có nhãn TỬ TRẬN
    expect(screen.queryByText(/TỬ TRẬN/i)).toBeNull();

    // Tên người chơi không bị cắt cụt
    expect(screen.getByText('Người chơi 2')).toBeTruthy();
  });

  it('2. MyHeroBar: Khi bản thân cạn máu (me.hp <= 0, me.isAlive: true) -> Hiển thị ⚠️ BẠN ĐANG HẤP HỐI, KHÔNG hiển thị TỬ TRẬN', () => {
    const dyingMe = {
      id: 0,
      name: 'Bạn',
      faction: 'lac',
      hp: 0,
      maxHp: 4,
      isAlive: true,
      isRevealed: true,
      revealedHeroes: [true, true],
      heroes: [{ name: 'Lạc Long Quân' }, { name: 'Thần Trụ Trời' }],
      hand: [{ id: 'w1', name: 'Rượu', type: 'wine' }],
      equipment: {}
    };

    const gameState = { players: [dyingMe] };

    render(
      <MyHeroBar 
        me={dyingMe} 
        gameState={gameState} 
        activePhase="judge" 
        handleRevealClick={() => {}} 
        actionBar={null} 
        playerHand={null} 
        setHeroPopup={() => {}} 
      />
    );

    // Phải có thông báo HẤP HỐI
    expect(screen.getAllByText(/HẤP HỐI/i).length).toBeGreaterThanOrEqual(1);

    // Tuyệt đối KHÔNG hiển thị TỬ TRẬN
    expect(screen.queryByText(/TỬ TRẬN/i)).toBeNull();
  });

  it('3. Engine: Khi bị nổ Sấm Sét trong Giai đoạn Phán Xét và dùng Rượu tự cứu -> Thoát hấp hối và tự động chuyển pha Rút bài/Hành động (KHÔNG bị đứng hình)', () => {
    const state = new GameState({
      currentPhase: PHASES.JUDGE,
      players: [
        {
          id: 0,
          name: 'Bạn',
          gender: 'male',
          hp: 0, // Vừa bị nổ sấm sét rơi vào 0 HP
          maxHp: 4,
          isAlive: true,
          hand: [{ id: 'w1', name: 'Rượu', type: 'wine' }],
          equipment: {},
          judgementArea: [] // Sấm sét vừa nổ và đã vào discardPile
        },
        {
          id: 1,
          name: 'Đối thủ 1',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          isAlive: true,
          hand: [],
          equipment: {}
        }
      ]
    });

    state.currentTurnPlayerId = 0;
    state.currentPhase = PHASES.JUDGE;

    const stateMachine = new StateMachine(state);
    const dispatcher = new DispatcherV4(state, stateMachine);

    // Đẩy frame ASK_PEACH vào priorityStack (mô phỏng enterDyingState)
    state.priorityStack.push({
      type: 'ASK_PEACH',
      sourceId: null,
      targetId: 0,
      priorityQueue: [0, 1],
      currentActorId: 0,
      context: { dyingPlayerId: 0, hpNeeded: 1 }
    });

    // Bản thân dùng lá Rượu cứu chính mình qua Dispatcher
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'react',
        data: {
          doSave: true,
          cardId: 'w1'
        }
      }
    });

    // 1. Sinh lực được hồi lên 1
    expect(state.getPlayer(0).hp).toBe(1);

    // 2. Priority stack đã được giải tỏa sạch
    expect(state.priorityStack.isEmpty()).toBe(true);

    // 3. Quan trọng nhất: Phase KHÔNG BỊ KẸT ở JUDGE mà đã tự động hoàn tất và sang ACTION!
    expect(state.currentPhase).toBe(PHASES.ACTION);
  });
});
