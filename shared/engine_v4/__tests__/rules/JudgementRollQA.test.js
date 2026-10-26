import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState';
import { StateMachine } from '../../core/StateMachine';
import { DispatcherV4 } from '../../application/DispatcherV4';
import { TrickRules } from '../../rules/TrickRules';
import { PHASES } from '../../core/StateMachine';

describe('QA Toàn Diện: Sự Kiện Rút Bài Phán Xét (Judgement Roll & Result Flow)', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    state = new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0 (Main)',
          hp: 4,
          maxHp: 4,
          hand: [],
          judgementArea: [],
          temporaryFlags: {},
          isAlive: true
        },
        {
          id: 1,
          name: 'Player 1',
          hp: 4,
          maxHp: 4,
          hand: [],
          judgementArea: [],
          temporaryFlags: {},
          isAlive: true
        }
      ]
    });
    dispatcher = new DispatcherV4(state);
  });

  it('1. Hỗn Loạn: Vào Pha Phán Xét tạo frame ASK_JUDGEMENT_ROLL cho người chơi', () => {
    const p0 = state.getPlayer(0);
    p0.judgementArea.push({
      id: 'trick_hon_loan_1',
      name: 'Hỗn Loạn',
      type: 'trick',
      delayed: true
    });

    state.currentPhase = PHASES.JUDGE;
    state.turnPlayerId = 0;

    // Kích hoạt phán xét tương tác
    TrickRules.resolveJudgementPhase(state, 0, { interactiveRoll: true });

    expect(state.priorityStack.isEmpty()).toBe(false);
    const frame = state.priorityStack.peek();
    expect(frame.type).toBe('ASK_JUDGEMENT_ROLL');
    expect(frame.currentActorId).toBe(0);
    expect(frame.context.cardName).toBe('Hỗn Loạn');
  });

  it('2. Hỗn Loạn: Rút trúng chất CƠ ♥ -> Thoát hiểm thành công, không mất Pha Ra Bài', () => {
    const p0 = state.getPlayer(0);
    p0.judgementArea.push({
      id: 'trick_hon_loan_1',
      name: 'Hỗn Loạn',
      type: 'trick',
      delayed: true
    });

    // Cài đặt lá bài trên đỉnh drawPile là Cơ ♥
    state.drawPile = [
      { id: 'card_heart_7', name: 'Đào', suit: 'heart', rank: 7, color: 'red' }
    ];

    TrickRules.resolveJudgementPhase(state, 0, { interactiveRoll: true });
    expect(state.priorityStack.peek().type).toBe('ASK_JUDGEMENT_ROLL');

    // Phản hồi Rút bài
    dispatcher.dispatch({
      type: 'ACTION_REACT',
      playerId: 0,
      doRoll: true
    });

    // Hệ thống chuyển sang frame hiển thị kết quả
    const resultFrame = state.priorityStack.peek();
    expect(resultFrame.type).toBe('ASK_JUDGEMENT_RESULT');
    expect(resultFrame.context.isSuccess).toBe(true);
    expect(resultFrame.context.judgeCard.suit).toBe('heart');

    // Xác nhận kết quả
    dispatcher.dispatch({
      type: 'ACTION_REACT',
      playerId: 0,
      confirmResult: true
    });

    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p0.temporaryFlags.skipActionPhase).toBeFalsy();
  });

  it('3. Hỗn Loạn: Rút trúng chất BÍCH ♠ -> Phán xét thất bại, bị khóa Pha Ra Bài', () => {
    const p0 = state.getPlayer(0);
    p0.judgementArea.push({
      id: 'trick_hon_loan_1',
      name: 'Hỗn Loạn',
      type: 'trick',
      delayed: true
    });

    // Cài đặt lá bài trên đỉnh drawPile là Bích ♠
    state.drawPile = [
      { id: 'card_spade_8', name: 'Chém', suit: 'spade', rank: 8, color: 'black' }
    ];

    TrickRules.resolveJudgementPhase(state, 0, { interactiveRoll: true });

    dispatcher.dispatch({
      type: 'ACTION_REACT',
      playerId: 0,
      doRoll: true
    });

    const resultFrame = state.priorityStack.peek();
    expect(resultFrame.type).toBe('ASK_JUDGEMENT_RESULT');
    expect(resultFrame.context.isSuccess).toBe(false);

    dispatcher.dispatch({
      type: 'ACTION_REACT',
      playerId: 0,
      confirmResult: true
    });

    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p0.temporaryFlags.skipActionPhase).toBe(true);
  });

  it('4. Sấm Sét: Rút trúng Bích 2-9 nổ trúng chịu 3 sát thương lôi hỏa', () => {
    const p0 = state.getPlayer(0);
    p0.judgementArea.push({
      id: 'trick_sam_set_1',
      name: 'Sấm Sét',
      type: 'trick',
      delayed: true
    });

    state.drawPile = [
      { id: 'card_spade_5', name: 'Chém', suit: 'spade', rank: 5, color: 'black' }
    ];

    TrickRules.resolveJudgementPhase(state, 0, { interactiveRoll: true });

    dispatcher.dispatch({
      type: 'ACTION_REACT',
      playerId: 0,
      doRoll: true
    });

    const resultFrame = state.priorityStack.peek();
    expect(resultFrame.type).toBe('ASK_JUDGEMENT_RESULT');
    expect(resultFrame.context.isSuccess).toBe(false);
    expect(p0.hp).toBe(1); // 4 HP - 3 Sát thương = 1 HP
  });

  it('5. Sấm Sét: Rút trúng Rô ♦ không nổ, chuyển sang khu phán xét người kế tiếp', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    p0.judgementArea.push({
      id: 'trick_sam_set_1',
      name: 'Sấm Sét',
      type: 'trick',
      delayed: true
    });

    state.drawPile = [
      { id: 'card_diamond_9', name: 'Né', suit: 'diamond', rank: 9, color: 'red' }
    ];

    TrickRules.resolveJudgementPhase(state, 0, { interactiveRoll: true });

    dispatcher.dispatch({
      type: 'ACTION_REACT',
      playerId: 0,
      doRoll: true
    });

    const resultFrame = state.priorityStack.peek();
    expect(resultFrame.type).toBe('ASK_JUDGEMENT_RESULT');
    expect(resultFrame.context.isSuccess).toBe(true);
    expect(p0.hp).toBe(4); // Không mất máu
    expect(p1.judgementArea.length).toBe(1); // Đã chuyển sang p1
  });
});
