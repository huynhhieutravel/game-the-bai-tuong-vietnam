import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachine } from '../../core/StateMachine.js';
import { GameState } from '../../core/GameState.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { toViewModel } from '../../application/GameViewMapperV4.js';
import { PHASES } from '../../../constants/phases.js';

function createMockGame(playerCount = 3) {
  const state = new GameState({
    mode: 'standard',
    enableLog: true,
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: `Player ${i}`,
      hp: 4,
      maxHp: 4,
      hand: [],
      equipment: { weapon: null, armor: null, defensiveHorse: null, offensiveHorse: null },
      judgementArea: [],
      temporaryFlags: {},
      isAlive: true,
      revealedHeroes: [false, false]
    }))
  });
  return state;
}

describe('QA Hệ Thống Hỗn Loạn & Hóa Giải (Chaos & Negate QA)', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    state = createMockGame(3);
    dispatcher = new DispatcherV4(state);
  });

  it('1. Khi bị dùng [Hỗn Loạn], người có lá [Hóa Giải] được hỏi và vô hiệu hóa thành công', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    const chaosCard = { id: 'hon_loan_1', name: 'Hỗn Loạn', idKey: 'hon_loan', type: 'trick' };
    const negateCard = { id: 'hoa_giai_1', name: 'Hóa Giải', idKey: 'hoa_giai', type: 'trick' };

    p0.hand = [chaosCard];
    p1.hand = [negateCard];

    // p0 dùng Hỗn Loạn lên p1
    TrickRules.playChaos(state, 0, 1, chaosCard);

    // Frame ASK_NEGATE phải được đẩy lên priorityStack
    expect(state.priorityStack.isEmpty()).toBe(false);
    const frame = state.priorityStack.peek();
    expect(frame.type).toBe('ASK_NEGATE');
    expect(frame.context.isDelayedTrick).toBe(true);

    // p0 không dùng Hóa Giải (bỏ qua)
    TrickRules.respondNegate(state, 0, null);

    // Lượt hỏi chuyển sang p1 (người bị nhắm tới)
    expect(frame.currentActorId).toBe(1);

    // p1 dùng Hóa Giải
    TrickRules.respondNegate(state, 1, negateCard);

    // Những người chơi khác (p2, p0) bỏ qua không phản Hóa Giải
    TrickRules.respondNegate(state, 2, null);
    TrickRules.respondNegate(state, 0, null);

    // Chuỗi kết thúc: Hỗn Loạn bị hủy, rơi vào discardPile, KHÔNG nằm trong khu phán xét của p1
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p1.judgementArea.length).toBe(0);
    expect(state.discardPile.some(c => c.id === 'hon_loan_1')).toBe(true);
    expect(p1.hand.length).toBe(0); // Đã dùng lá Hóa Giải
  });

  it('2. Khi bị dùng [Hỗn Loạn], nếu mọi người bỏ qua Hóa Giải thì Hỗn Loạn được đặt vào khu phán xét', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    const chaosCard = { id: 'hon_loan_2', name: 'Hỗn Loạn', idKey: 'hon_loan', type: 'trick' };
    const negateCard = { id: 'hoa_giai_2', name: 'Hóa Giải', idKey: 'hoa_giai', type: 'trick' };

    p0.hand = [chaosCard];
    p1.hand = [negateCard];

    TrickRules.playChaos(state, 0, 1, chaosCard);

    // Tất cả mọi người bỏ qua
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, null);
    TrickRules.respondNegate(state, 2, null);

    // Hỗn Loạn rơi vào khu phán xét của p1
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p1.judgementArea.length).toBe(1);
    expect(p1.judgementArea[0].id).toBe('hon_loan_2');
    expect(p1.hand.length).toBe(1); // p1 vẫn giữ lá Hóa Giải
  });

  it('3. Khi bước vào Pha Phán Xét của [Hỗn Loạn], người có [Hóa Giải] được hỏi và giải trừ phán xét', () => {
    const p0 = state.getPlayer(0);
    const chaosCard = { id: 'hon_loan_judge', name: 'Hỗn Loạn', idKey: 'hon_loan', type: 'delayed_trick' };
    const negateCard = { id: 'hoa_giai_judge', name: 'Hóa Giải', idKey: 'hoa_giai', type: 'trick' };

    p0.judgementArea.push(chaosCard);
    p0.hand = [negateCard];

    // Bắt đầu xử lý Pha Phán Xét cho p0
    TrickRules.resolveJudgementPhase(state, 0);

    // Phải mở frame ASK_NEGATE với isJudgementNegate = true
    expect(state.priorityStack.isEmpty()).toBe(false);
    const frame = state.priorityStack.peek();
    expect(frame.type).toBe('ASK_NEGATE');
    expect(frame.context.isJudgementNegate).toBe(true);

    // p0 dùng ngay lá Hóa Giải để tự cứu mình
    TrickRules.respondNegate(state, 0, negateCard);

    // Những người khác (p1, p2) bỏ qua
    TrickRules.respondNegate(state, 1, null);
    TrickRules.respondNegate(state, 2, null);

    // Phán xét kết thúc: Hỗn Loạn bị hủy bỏ rơi vào discardPile, không bị phạt mất lượt
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p0.judgementArea.length).toBe(0);
    expect(p0.temporaryFlags?.skipActionPhase).toBeFalsy();
    expect(state.discardPile.some(c => c.id === 'hon_loan_judge')).toBe(true);
  });

  it('4. Trong Pha Hành Động, lá [Hóa Giải] bị đánh dấu isPlayable = false trên ViewModel', () => {
    const p0 = state.getPlayer(0);
    p0.hand = [
      { id: 'hg_1', name: 'Hóa Giải', idKey: 'hoa_giai', type: 'trick' },
      { id: 'chem_1', name: 'Chém', idKey: 'chem', type: 'basic' }
    ];
    state.currentTurnPlayerId = 0;
    state.currentPhase = PHASES.ACTION;

    const vm = toViewModel(state, 0);
    const hgCard = vm.players[0].hand.find(c => c.name === 'Hóa Giải');
    const chemCard = vm.players[0].hand.find(c => c.name === 'Chém');

    expect(hgCard.isPlayable).toBe(false);
    expect(hgCard.unplayableReason).toContain('phản ứng cẩm nang');
    expect(chemCard.isPlayable).toBe(true);
  });

  it('5. Trong Pha Hành Động, Dispatcher từ chối lệnh PLAY_CARD với lá [Hóa Giải]', () => {
    const p0 = state.getPlayer(0);
    const hgCard = { id: 'hg_try', name: 'Hóa Giải', idKey: 'hoa_giai', type: 'trick' };
    p0.hand = [hgCard];
    state.currentTurnPlayerId = 0;
    state.currentPhase = PHASES.ACTION;

    expect(() => {
      dispatcher.dispatchAction({ type: 'PLAY_CARD', payload: { playerId: 0, cardId: 'hg_try' }, throwOnError: true });
    }).toThrow(/phản ứng cẩm nang/);

    // Bài vẫn còn trên tay, tuyệt đối không bị auto-discard vô nghĩa
    expect(p0.hand.length).toBe(1);
    expect(p0.hand[0].id).toBe('hg_try');
  });

  it('6. Dispatcher hỗ trợ đầy đủ [Binh Lương Thốn Đoạn], đặt vào khu phán xét và mở cửa sổ Hóa Giải', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const starvCard = { id: 'starv_1', name: 'Binh Lương Thốn Đoạn', idKey: 'binh_luong', type: 'trick' };
    const hgCard = { id: 'hg_p1', name: 'Hóa Giải', idKey: 'hoa_giai', type: 'trick' };

    p0.hand = [starvCard];
    p1.hand = [hgCard];
    state.currentTurnPlayerId = 0;
    state.currentPhase = PHASES.ACTION;

    dispatcher.dispatchAction({
      type: 'PLAY_CARD',
      payload: { playerId: 0, cardId: 'starv_1', targetIds: [1] },
      throwOnError: true
    });

    // Mở ASK_NEGATE vì p1 có lá Hóa Giải
    expect(state.priorityStack.isEmpty()).toBe(false);
    expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
    expect(state.priorityStack.peek().context.isDelayedTrick).toBe(true);

    // Mọi người bỏ qua không hóa giải
    dispatcher.dispatchAction({ type: 'RESPOND_ACTION', payload: { playerId: 0, responseType: 'skip' } });
    dispatcher.dispatchAction({ type: 'RESPOND_ACTION', payload: { playerId: 1, responseType: 'skip' } });
    dispatcher.dispatchAction({ type: 'RESPOND_ACTION', payload: { playerId: 2, responseType: 'skip' } });

    // Binh Lương Thốn Đoạn rơi vào khu phán xét của p1
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p1.judgementArea.length).toBe(1);
    expect(p1.judgementArea[0].id).toBe('starv_1');
  });

  it('7. Pha Phán Xét của [Binh Lương Thốn Đoạn]: Phán xét KHÔNG PHẢI Nhép -> skipDrawPhase = true', () => {
    const p1 = state.getPlayer(1);
    const starvCard = { id: 'starv_judge', name: 'Binh Lương Thốn Đoạn', idKey: 'binh_luong', type: 'delayed_trick' };
    p1.judgementArea = [starvCard];

    // Cài bài trên cùng của drawPile là Cơ (không phải Nhép)
    state.drawPile = [{ id: 'judge_heart', name: 'Đào', suit: 'heart', color: 'red', rank: 7 }];

    TrickRules.resolveJudgementPhase(state, 1);

    expect(p1.temporaryFlags.skipDrawPhase).toBe(true);
    expect(p1.judgementArea.length).toBe(0);
    expect(state.discardPile.some(c => c.id === 'starv_judge')).toBe(true);
  });

  it('8. Nhánh fallback ném lỗi chuẩn xác, KHÔNG BAO GIỜ tự tiện discard bài của người chơi', () => {
    const p0 = state.getPlayer(0);
    const mysteryCard = { id: 'unknown_card_1', name: 'Bí Kíp Thần Kỳ', type: 'special' };
    p0.hand = [mysteryCard];
    state.currentTurnPlayerId = 0;
    state.currentPhase = PHASES.ACTION;

    expect(() => {
      dispatcher.dispatchAction({
        type: 'PLAY_CARD',
        payload: { playerId: 0, cardId: 'unknown_card_1' },
        throwOnError: true
      });
    }).toThrow(/không thể sử dụng trực tiếp trong Pha Hành Động/);

    // Bài tuyệt đối không bị mất khỏi tay
    expect(p0.hand.length).toBe(1);
    expect(p0.hand[0].id).toBe('unknown_card_1');
  });

  it('9. Phản ứng [Dã Man]: Dùng lá [Hóa Giải] tự cứu bản thân, không mất máu và không mất Chém', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const barbCard = { id: 'barb_1', name: 'Nam Man Xâm Nhập', idKey: 'da_man', type: 'trick' };
    const hgCard = { id: 'hg_self_save', name: 'Hóa Giải', idKey: 'hoa_giai', type: 'trick' };
    const slashCard = { id: 'slash_saved', name: 'Chém', idKey: 'chem', type: 'basic' };

    p0.hand = [barbCard];
    p1.hand = [hgCard, slashCard];
    p1.hp = 4;

    TrickRules.playBarbarian(state, 0, barbCard);

    // Frame ASK_SLASH_RESPONSE mở cho p1
    const frame = state.priorityStack.peek();
    expect(frame.type).toBe('ASK_SLASH_RESPONSE');
    expect(frame.targetId).toBe(1);

    // p1 phản ứng bằng lá Hóa Giải
    dispatcher.dispatchAction({
      type: 'RESPOND_ACTION',
      payload: {
        playerId: 1,
        responseType: 'react',
        data: { doReact: true, cardId: 'hg_self_save', virtualCardName: 'Hóa Giải' }
      }
    });

    // p1 không mất máu, lá Chém vẫn còn nguyên trên tay, chỉ mất lá Hóa Giải
    expect(p1.hp).toBe(4);
    expect(p1.hand.length).toBe(1);
    expect(p1.hand[0].id).toBe('slash_saved');
    expect(state.discardPile.some(c => c.id === 'hg_self_save')).toBe(true);
  });

  it('10. Phản ứng [Vạn Tiễn Quy Tâm]: Dùng lá [Hóa Giải] tự cứu bản thân, không mất máu và không mất Né', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const arrowCard = { id: 'arrow_1', name: 'Vạn Tiễn Quy Tâm', idKey: 'loan_tien', type: 'trick' };
    const hgCard = { id: 'hg_volley_save', name: 'Hóa Giải', idKey: 'hoa_giai', type: 'trick' };
    const dodgeCard = { id: 'dodge_saved', name: 'Né', idKey: 'ne', type: 'basic' };

    p0.hand = [arrowCard];
    p1.hand = [hgCard, dodgeCard];
    p1.hp = 4;

    TrickRules.playArrowRain(state, 0, arrowCard);

    // Frame ASK_DODGE mở cho p1
    const frame = state.priorityStack.peek();
    expect(frame.type).toBe('ASK_DODGE');
    expect(frame.context.reason).toBe('van-tien');

    // p1 phản ứng bằng lá Hóa Giải
    dispatcher.dispatchAction({
      type: 'RESPOND_ACTION',
      payload: {
        playerId: 1,
        responseType: 'react',
        data: { doReact: true, cardId: 'hg_volley_save', virtualCardName: 'Hóa Giải' }
      }
    });

    // p1 không mất máu, lá Né vẫn còn nguyên trên tay, chỉ mất lá Hóa Giải
    expect(p1.hp).toBe(4);
    expect(p1.hand.length).toBe(1);
    expect(p1.hand[0].id).toBe('dodge_saved');
    expect(state.discardPile.some(c => c.id === 'hg_volley_save')).toBe(true);
  });

  it('11. Quyết Đấu: Khi Người chơi 3 (hoặc 4) đánh ra Chém, toViewModel gán chính xác responderId = 0', () => {
    // Tạo bàn chơi 4 người: p0 (human), p1, p2, p3 (Người chơi 4)
    state = createMockGame(4);
    dispatcher = new DispatcherV4(state);

    const p0 = state.getPlayer(0);
    const p3 = state.getPlayer(3);

    const duelCard = { id: 'duel_p0', name: 'Quyết Đấu', idKey: 'quyet_dau', type: 'trick' };
    const slashP3 = { id: 'slash_p3', name: 'Chém', idKey: 'chem', type: 'basic' };
    const redPeachP0 = { id: 'peach_red_p0', name: 'Đào', suit: 'heart', color: 'red', rank: 9, type: 'basic' };

    p0.hand = [duelCard, redPeachP0];
    p3.hand = [slashP3];

    // p0 dùng Quyết Đấu lên p3
    TrickRules.playDuel(state, 0, 3, duelCard);

    // Mọi người bỏ qua Hóa Giải ban đầu
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, null);
    TrickRules.respondNegate(state, 2, null);
    TrickRules.respondNegate(state, 3, null);

    // Quyết Đấu bắt đầu: Người chơi 3 phải ra Chém trước
    expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');
    expect(state.priorityStack.peek().currentActorId).toBe(3);

    // Người chơi 3 phản hồi bằng lá Chém
    dispatcher.dispatchAction({
      type: 'RESPOND_ACTION',
      payload: {
        playerId: 3,
        responseType: 'react',
        data: { doReact: true, cardId: 'slash_p3' }
      }
    });

    // Lượt phản hồi trong Quyết Đấu phải quay về p0 (id: 0)
    const frame = state.priorityStack.peek();
    expect(frame).toBeTruthy();
    expect(frame.type).toBe('ASK_SLASH_DUEL');
    expect(frame.currentActorId).toBe(0);
    expect(frame.context.currentResponderId).toBe(0);

    // Kiểm tra toViewModel(state, 0)
    const vm = toViewModel(state, 0);
    expect(vm.waitingForResponse).toBeTruthy();
    expect(vm.waitingForResponse.type).toBe('ask_slash');
    expect(vm.waitingForResponse.reason).toBe('quyet-dau');
    // Đảm bảo không bị lỗi 0 falsy biến thành 3
    expect(vm.waitingForResponse.responderId).toBe(0);
    expect(vm.waitingForResponse.duelTargetId).toBe(3);
  });

  it('12. Quyết Đấu: Player 0 dùng bài Đỏ qua Khai Thiên đánh trả Quyết Đấu thành công', () => {
    state = createMockGame(4);
    dispatcher = new DispatcherV4(state);

    const p0 = state.getPlayer(0);
    const p3 = state.getPlayer(3);

    p0.revealedHeroes = [true, false];
    p0.skills = ['khai_thien'];
    const duelCard = { id: 'duel_test_2', name: 'Quyết Đấu', idKey: 'quyet_dau', type: 'trick' };
    const slashP3 = { id: 'slash_p3_2', name: 'Chém', idKey: 'chem', type: 'basic' };
    const redDodgeP0 = { id: 'dodge_red_p0', name: 'Né', suit: 'diamond', color: 'red', rank: 4, type: 'basic' };

    p0.hand = [duelCard, redDodgeP0];
    p3.hand = [slashP3];

    TrickRules.playDuel(state, 0, 3, duelCard);

    // Bỏ qua Hóa Giải ban đầu
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, null);
    TrickRules.respondNegate(state, 2, null);
    TrickRules.respondNegate(state, 3, null);

    // p3 đánh Chém
    dispatcher.dispatchAction({
      type: 'RESPOND_ACTION',
      payload: { playerId: 3, responseType: 'react', data: { doReact: true, cardId: 'slash_p3_2' } }
    });

    // p0 dùng lá Né màu đỏ làm Chém (Khai Thiên)
    dispatcher.dispatchAction({
      type: 'RESPOND_ACTION',
      payload: {
        playerId: 0,
        responseType: 'react',
        data: { doReact: true, cardId: 'dodge_red_p0', virtualCardName: 'Chém', activeSkill: 'Khai Thiên' }
      }
    });

    // p0 đã đánh trả Chém thành công -> Lượt chuyển tiếp lại sang p3
    const frame = state.priorityStack.peek();
    expect(frame.currentActorId).toBe(3);
    expect(frame.context.currentResponderId).toBe(3);
    expect(p0.hand.length).toBe(0); // Đã đánh duelCard khi kích hoạt và né đỏ khi phản ứng Quyết Đấu
    expect(state.discardPile.some(c => c.id === 'dodge_red_p0')).toBe(true);
  });
});
