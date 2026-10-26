/**
 * TricksComprehensiveAntiSyntheticQA.test.js
 * Kiểm định QA Toàn Diện Hệ Thống Cẩm Nang (Tricks) & Trì Hoãn (Delayed Tricks)
 * TUÂN THỦ NGUYÊN TẮC: Chống thiên kiến dữ liệu giả (Anti-Synthetic Fixture).
 * 100% Thẻ bài lấy trực tiếp từ CardDeck.getStandardDeck() (ID thật tiếng Việt có dấu).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { CardDeck } from '../../cards/CardDeck.js';
import { canPlayCard, getTargetingDefinition } from '../../rules/TargetResolverV4.js';
import { isDelayedTrick, isTrick, normalizeCardKey } from '../../../utils/translationHelper.js';

describe('QA Cẩm Nang & Trì Hoãn Toàn Diện (Anti-Synthetic Fixture QA)', () => {
  let state;
  let standardDeck;

  beforeEach(() => {
    state = new GameState({
      players: [
        { id: 0, name: 'Người chơi 0', hp: 3, maxHp: 3, isAlive: true, hand: [], equipment: {}, judgementArea: [] },
        { id: 1, name: 'Người chơi 1', hp: 3, maxHp: 3, isAlive: true, hand: [], equipment: {}, judgementArea: [] },
        { id: 2, name: 'Người chơi 2', hp: 3, maxHp: 3, isAlive: true, hand: [], equipment: {}, judgementArea: [] }
      ]
    });
    standardDeck = CardDeck.getStandardDeck();
  });

  it('1. Cẩm nang Trì hoãn Sấm Sét Thật: Tuyệt đối không thể gắn 2 lá Sấm Sét vào cùng 1 mục tiêu', () => {
    // Lấy 2 lá Sấm Sét thật từ Deck (ID dạng sấm-sét-0-..., sấm-sét-1-...)
    const lightningCards = standardDeck.filter(c => isDelayedTrick(c, 'sam_set'));
    expect(lightningCards.length).toBeGreaterThanOrEqual(2);

    const [l1, l2] = lightningCards;
    expect(l1.id).not.toBe(l2.id);
    expect(normalizeCardKey(l1)).toBe('sam_set');
    expect(normalizeCardKey(l2)).toBe('sam_set');

    const p0 = state.getPlayer(0);
    p0.hand = [l1, l2];

    // Lần 1: P0 đánh Sấm Sét lên chính mình
    expect(canPlayCard(state, 0, l1.id).valid).toBe(true);
    TrickRules.playTrick(state, 0, [0], l1);

    expect(p0.judgementArea.length).toBe(1);
    expect(p0.judgementArea[0].id).toBe(l1.id);
    expect(p0.hand.length).toBe(1);

    // Lần 2: P0 đã có Sấm Sét trong khu phán xét -> canPlayCard từ chối lá l2
    const checkCanPlay = canPlayCard(state, 0, l2.id);
    expect(checkCanPlay.valid).toBe(false);
    expect(checkCanPlay.reason).toContain('Sấm Sét');

    // Nếu cố tình gọi TrickRules.playTrick -> ném ngoại lệ chặn đứng
    expect(() => {
      TrickRules.playTrick(state, 0, [0], l2);
    }).toThrow(/Mục tiêu đã có cẩm nang trì hoãn này/);

    // Đảm bảo vẫn chỉ có đúng 1 lá Sấm Sét trong khu phán xét
    expect(p0.judgementArea.length).toBe(1);
  });

  it('2. Sấm Sét không nổ: Nhảy vòng thông minh bỏ qua người đã có Sấm Sét', () => {
    const lightningCards = standardDeck.filter(c => isDelayedTrick(c, 'sam_set'));
    const [l1, l2] = lightningCards;

    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);

    // P0 có l1 trong judgementArea, P1 cũng đã có l2 trong judgementArea
    p0.judgementArea = [l1];
    p1.judgementArea = [l2];

    // Chuẩn bị lá bài phán xét không nổ (chất Heart Cơ)
    const heartJudgeCard = standardDeck.find(c => c.suit === 'heart' || c.suit === '♥');
    state.drawPile = [heartJudgeCard];

    // Giải quyết phán xét cho P0
    TrickRules.resolveJudgementPhase(state, 0);

    // P0 thoát Sấm Sét -> Sấm Sét không thể nhảy vào P1 (vì P1 đã có l2) -> Nhảy thẳng sang P2!
    expect(p0.judgementArea.length).toBe(0);
    expect(p1.judgementArea.length).toBe(1);
    expect(p1.judgementArea[0].id).toBe(l2.id);
    expect(p2.judgementArea.length).toBe(1);
    expect(p2.judgementArea[0].id).toBe(l1.id);
  });

  it('3. Hỗn Loạn Thật (Delayed Trick): Không thể gắn 2 lá Hỗn Loạn vào cùng 1 mục tiêu', () => {
    const indulgenceCards = standardDeck.filter(c => isDelayedTrick(c, 'hon_loan'));
    expect(indulgenceCards.length).toBeGreaterThanOrEqual(2);

    const [h1, h2] = indulgenceCards;
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.hand = [h1, h2];

    // P0 dùng Hỗn Loạn h1 lên P1
    TrickRules.playTrick(state, 0, [1], h1);
    expect(p1.judgementArea.length).toBe(1);

    // P0 thử dùng Hỗn Loạn h2 lên P1 lần nữa -> Ném ngoại lệ
    expect(() => {
      TrickRules.playTrick(state, 0, [1], h2);
    }).toThrow(/Mục tiêu đã có cẩm nang trì hoãn này/);

    expect(p1.judgementArea.length).toBe(1);
  });

  it('4. Chuỗi Hóa Giải Thật (Real Negate Chain): Thẻ bài có ID tiếng Việt hóa giải và phản đòn chuẩn xác', () => {
    const duelCard = standardDeck.find(c => isTrick(c, 'quyet_dau'));
    const negateCards = standardDeck.filter(c => isTrick(c, 'hoa_giai'));
    expect(negateCards.length).toBeGreaterThanOrEqual(2);

    const [negate1, negate2] = negateCards;
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);

    p0.hand = [duelCard];
    p1.hand = [negate1];
    p2.hand = [negate2];

    // P0 dùng Quyết Đấu lên P1 -> Mở vòng hỏi Hóa Giải (ASK_NEGATE)
    TrickRules.playTrick(state, 0, [1], duelCard);

    let frame = state.priorityStack.peek();
    expect(frame).not.toBeNull();
    expect(frame.type).toBe('ASK_NEGATE');

    // P0 không hóa giải lá bài của chính mình
    // Chuyển tới P1: P1 dùng lá Hóa Giải negate1 thật
    TrickRules.respondNegate(state, 1, negate1);

    frame = state.priorityStack.peek();
    expect(frame.context.negateCount).toBe(1);
    expect(p1.hand.length).toBe(0);

    // P2 dùng tiếp lá Hóa Giải negate2 thật để phản đòn (Negate the Negate)
    TrickRules.respondNegate(state, 2, negate2);
    frame = state.priorityStack.peek();
    expect(frame.context.negateCount).toBe(2);
    expect(p2.hand.length).toBe(0);

    // Mọi người còn lại bỏ qua không hóa giải nữa
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, null);

    // Chuỗi hóa giải kết thúc với negateCount = 2 (chẵn -> Quyết Đấu vẫn được thực thi!)
    const activeFrame = state.priorityStack.peek();
    expect(activeFrame.type).toBe('ASK_SLASH_DUEL');
  });

  it('5. Cẩm nang Toàn Bàn Thật: Loạn Tiễn & Dã Man kích hoạt chuẩn xác với bài thật từ Deck', () => {
    const archeryCard = standardDeck.find(c => isTrick(c, 'loan_tien'));
    const dodgeCard = standardDeck.find(c => c.name === 'Né');
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);

    p0.hand = [archeryCard];
    p1.hand = [dodgeCard];
    p2.hand = [];

    // P0 dùng Loạn Tiễn
    TrickRules.playTrick(state, 0, [1, 2], archeryCard);

    // Loạn Tiễn là AOE, đẩy yêu cầu ASK_DODGE cho từng mục tiêu
    const frame = state.priorityStack.peek();
    expect(frame).not.toBeNull();
    expect(frame.type).toBe('ASK_DODGE');
    expect(frame.context.reason).toBe('van-tien');
  });

  it('6. Xiềng Xích Thật (Iron Chain): Hỗ trợ cả Rèn Lại (Reforge) lẫn Xích 2 mục tiêu', () => {
    const chainCards = standardDeck.filter(c => isTrick(c, 'xieng_xich'));
    expect(chainCards.length).toBeGreaterThanOrEqual(2);

    const [c1, c2] = chainCards;
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);

    p0.hand = [c1, c2];
    const initialDeckCount = state.drawPile.length;

    // A. Rèn lại: bỏ lá c1 rút 1 bài mới, không mở hỏi Hóa Giải
    TrickRules.playTrick(state, 0, [], c1, { reforge: true });
    expect(p0.hand.length).toBe(2); // Vừa bỏ 1 vừa rút 1 -> vẫn 2 lá
    expect(state.priorityStack.isEmpty()).toBe(true);

    // B. Xích 2 mục tiêu P1 và P2
    expect(p1.isChained).toBeFalsy();
    expect(p2.isChained).toBeFalsy();

    TrickRules.playTrick(state, 0, [1, 2], c2);

    // Kết thúc vòng hỏi Hóa Giải
    while (!state.priorityStack.isEmpty()) {
      const top = state.priorityStack.peek();
      if (top.type === 'ASK_NEGATE') {
        TrickRules.respondNegate(state, top.currentActorId, null);
      } else {
        break;
      }
    }

    expect(p1.isChained).toBe(true);
    expect(p2.isChained).toBe(true);
  });
});
