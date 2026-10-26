/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameView from '../game/GameView.jsx';
import { BotRunnerV4, BOT_PACE_CONFIG } from '../../../../shared/engine_v4/application/BotRunnerV4.js';
import { TrickRules } from '../../../../shared/engine_v4/rules/TrickRules.js';
import { createGameState, selectDraftHeroes } from '../../../../shared/engine_v4/application/gameSetupV4.js';

describe('QA Pacing, Direct Impact Alert Banner & Live Ticker Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage = {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, val) { this._store[key] = String(val); },
      removeItem(key) { delete this._store[key]; },
      clear() { this._store = {}; }
    };
  });

  afterEach(() => {
    delete window.localStorage;
  });

  it('1. BotRunnerV4: Hỗ trợ cấu hình nhịp độ trận đấu (slow, normal, fast) chuẩn xác', () => {
    const mockAPI = { dispatcher: { state: {} } };
    const runner = new BotRunnerV4(mockAPI, 'normal');

    expect(runner.getPace()).toBe('normal');
    expect(runner.getDelay('action')).toBe(BOT_PACE_CONFIG.normal.action); // 1300ms
    expect(runner.getDelay('reaction')).toBe(BOT_PACE_CONFIG.normal.reaction); // 900ms

    runner.setPace('slow');
    expect(runner.getPace()).toBe('slow');
    expect(runner.getDelay('action')).toBe(1800);
    expect(runner.getDelay('reaction')).toBe(1200);

    runner.setPace('fast');
    expect(runner.getPace()).toBe('fast');
    expect(runner.getDelay('action')).toBe(700);
    expect(runner.getDelay('reaction')).toBe(600);
  });

  it('2. TrickRules: resolveSteal và resolveDismantle đính kèm metadata chi tiết về lá bài bị mất', () => {
    let state = createGameState(2);
    state = selectDraftHeroes(state, 0, 'tran_hung_dao', 'yet_kieu');
    state = selectDraftHeroes(state, 1, 'ngo_quyen', 'duong_dinh_nghe');

    const cardToSteal = { id: 'slash_spade_10', name: 'Chém', suit: '♠', rank: '10' };
    state.players[1].hand = [cardToSteal];
    state.players[0].hand = [];

    // Bot 0 cướp bài của Player 1
    const stolen = TrickRules.resolveSteal(state, 0, 1, 'slash_spade_10');
    expect(stolen).toEqual(cardToSteal);

    // Kiểm tra log cuối cùng có metadata
    const lastLog = state.logs[state.logs.length - 1];
    expect(lastLog.type).toBe('STEAL_CARD');
    expect(lastLog.victimId).toBe(1);
    expect(lastLog.thiefId).toBe(0);
    expect(lastLog.cardName).toBe('Chém');
    expect(lastLog.cardSuit).toBe('♠');
    expect(lastLog.cardRank).toBe('10');
  });

  it('3. GameView: Render Live Combat Action Ticker và nút điều chỉnh nhịp game trên Top Bar', () => {
    const mockGameState = {
      phase: 'action',
      currentPhase: 'action',
      turnCount: 1,
      currentPlayerIndex: 0,
      players: [
        { id: 0, name: 'Bạn', hp: 4, maxHp: 4, hand: [], equipment: {}, isAlive: true, isBot: false },
        { id: 1, name: 'Bot 1', hp: 4, maxHp: 4, hand: [], equipment: {}, isAlive: true, isBot: true },
        { id: 2, name: 'Bot 2', hp: 4, maxHp: 4, hand: [], equipment: {}, isAlive: true, isBot: true },
        { id: 3, name: 'Bot 3', hp: 4, maxHp: 4, hand: [], equipment: {}, isAlive: true, isBot: true }
      ],
      logs: [
        { message: 'Trận đấu bắt đầu' },
        { message: 'Bot 1 sử dụng cẩm nang [Vô Trung Sinh Hữu]' }
      ]
    };

    const mockGameAPI = {
      setBotPace: vi.fn(),
      respond: vi.fn(),
      endPhase: vi.fn()
    };

    render(
      <MemoryRouter>
        <GameView gameState={mockGameState} gameAPI={mockGameAPI} />
      </MemoryRouter>
    );

    // Kiểm tra Live Combat Ticker hiển thị log mới nhất
    expect(screen.getByText(/Bot 1 sử dụng cẩm nang \[Vô Trung Sinh Hữu\]/i)).toBeTruthy();
    expect(screen.getByText('Mới nhất')).toBeTruthy();

    // Kiểm tra nút tốc độ trên Top Bar (mặc định '⚖️ Chuẩn')
    const paceBtn = screen.getByTitle('Tùy chọn nhịp độ trận đấu');
    expect(paceBtn).toBeTruthy();
    expect(paceBtn.textContent).toContain('⚖️ Chuẩn');
  });

  it('4. GameView: Chuyển đổi nhịp game trong In-Game Menu lưu localStorage và gọi API setBotPace', () => {
    const mockGameState = {
      phase: 'action',
      currentPhase: 'action',
      turnCount: 2,
      currentPlayerIndex: 0,
      players: [
        { id: 0, name: 'Bạn', hp: 4, maxHp: 4, hand: [], equipment: {}, isAlive: true, isBot: false },
        { id: 1, name: 'Bot 1', hp: 4, maxHp: 4, hand: [], equipment: {}, isAlive: true, isBot: true }
      ],
      logs: []
    };

    const mockGameAPI = {
      setBotPace: vi.fn()
    };

    render(
      <MemoryRouter>
        <GameView gameState={mockGameState} gameAPI={mockGameAPI} />
      </MemoryRouter>
    );

    // Mở Menu
    const menuBtn = screen.getByTitle('Tùy chọn & Menu trận đấu');
    fireEvent.click(menuBtn);

    expect(screen.getByText(/NHỊP ĐỘ TRẬN ĐẤU/i)).toBeTruthy();

    // Bấm chọn "🐢 Chậm"
    const slowBtn = screen.getByText('🐢 Chậm');
    fireEvent.click(slowBtn);

    expect(mockGameAPI.setBotPace).toHaveBeenCalledWith('slow');
    expect(window.localStorage.getItem('viet_sat_game_pace')).toBe('slow');
  });

  it('5. GameView: Direct Impact Alert hiển thị thông tin lá bài bị mất và không bị xóa bởi waitingForResponse', () => {
    const initialLogs = [
      { message: 'Trận đấu bắt đầu' }
    ];

    const mockGameState = {
      phase: 'action',
      currentPhase: 'action',
      turnCount: 1,
      currentPlayerIndex: 1,
      players: [
        { id: 0, name: 'Bạn', hp: 4, maxHp: 4, hand: [], equipment: {}, isAlive: true, isBot: false },
        { id: 1, name: 'Bot 1', hp: 4, maxHp: 4, hand: [], equipment: {}, isAlive: true, isBot: true }
      ],
      logs: initialLogs
    };

    const { rerender } = render(
      <MemoryRouter>
        <GameView gameState={mockGameState} />
      </MemoryRouter>
    );

    // Bot 1 cướp lá Chém ♠10 trên tay của Bạn
    const updatedStateWithSteal = {
      ...mockGameState,
      logs: [
        ...initialLogs,
        {
          message: '🤏 Bot 1 đã cướp 1 lá bài (trên tay) của Bạn.',
          type: 'STEAL_CARD',
          victimId: 0,
          thiefId: 1,
          cardName: 'Chém',
          cardSuit: '♠',
          cardRank: '10',
          fromZoneDesc: 'trên tay'
        }
      ]
    };

    rerender(
      <MemoryRouter>
        <GameView gameState={updatedStateWithSteal} />
      </MemoryRouter>
    );

    // Phải xuất hiện Direct Impact Alert với đích danh lá bài bị mất
    expect(screen.getByText('BỊ CƯỚP BÀI!')).toBeTruthy();
    expect(screen.getByText(/Bot 1 đã cướp lá \[Chém ♠10\] \(trên tay\) của Bạn!/i)).toBeTruthy();

    // Giờ xuất hiện waitingForResponse (ví dụ Bot kích hoạt tiếp cẩm nang)
    const stateWithResponse = {
      ...updatedStateWithSteal,
      waitingForResponse: { type: 'ask_negate', responderId: 0 }
    };

    rerender(
      <MemoryRouter>
        <GameView gameState={stateWithResponse} />
      </MemoryRouter>
    );

    // Direct Impact Alert VẪN TỒN TẠI, không bị xóa đè bởi waitingForResponse!
    expect(screen.getByText('BỊ CƯỚP BÀI!')).toBeTruthy();
    expect(screen.getByText(/Bot 1 đã cướp lá \[Chém ♠10\]/i)).toBeTruthy();
  });
});
