import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Nguyễn Trãi (nguyen_trai) — Bình Ngô & Tâm Công', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = (p0Hand = [{ id: 'c1', name: 'Chém', suit: 'spade', rank: 7 }]) => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Nguyễn Trãi',
          heroId: 'nguyen_trai',
          faction: 'ha',
          hp: 3,
          maxHp: 3,
          skills: ['binh_ngo', 'tam_cong'],
          hand: [...p0Hand]
        },
        {
          id: 1,
          name: 'Mục Tiêu',
          hp: 4,
          maxHp: 4,
          hand: []
        }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Lá 1', suit: 'heart', rank: 1 },
        { id: 'deck_2', name: 'Lá 2', suit: 'club', rank: 2 },
        { id: 'deck_3', name: 'Lá 3', suit: 'diamond', rank: 3 }
      ],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  it('Bình Ngô: Giai đoạn Rút bài được rút 3 lá bài', () => {
    const { state, dispatcher } = setupGame();
    const nguyenTrai = state.getPlayer(0);

    globalHeroRegistry.dispatchTrigger('DRAW_PHASE', {
      sourceId: 0,
      actorId: 0
    }, state);

    expect(nguyenTrai.temporaryFlags.drawCardCount).toBe(3);
  });

  it('Tâm Công: Kích hoạt tạo PriorityFrame ASK_SUIT nhắm vào mục tiêu', () => {
    const { state, dispatcher } = setupGame();

    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'tam_cong',
        targets: [1]
      }
    });

    const frame = state.priorityStack.peek();
    expect(frame).toBeDefined();
    expect(frame.type).toBe('ASK_SUIT');
    expect(frame.currentActorId).toBe(1);
    expect(frame.context.sourceId).toBe(0);
  });

  it('Tâm Công: Mục tiêu đoán sai chất bài -> Nhận 1 sát thương và nhận lá bài', () => {
    const { state, dispatcher } = setupGame([{ id: 'c1', name: 'Chém', suit: 'spade', rank: 7 }]);
    const target = state.getPlayer(1);

    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'tam_cong',
        targets: [1]
      }
    });

    // Mục tiêu đoán chất Cơ (♥) trong khi lá bài là Bích (spade) -> Đoán sai!
    dispatcher.dispatch({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'confirm',
        data: {
          suit: '♥'
        }
      }
    });

    expect(target.hp).toBe(3); // 4 -> 3 (nhận 1 sát thương)
    expect(target.hand.length).toBe(1); // Nhận lá bài
    expect(target.hand[0].id).toBe('c1');
  });

  it('Tâm Công: Mục tiêu đoán đúng chất bài -> An toàn nhận bài mà không bị sát thương', () => {
    const { state, dispatcher } = setupGame([{ id: 'c1', name: 'Chém', suit: 'spade', rank: 7 }]);
    const target = state.getPlayer(1);

    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'tam_cong',
        targets: [1]
      }
    });

    // Mục tiêu đoán chất Bích (♠) trùng với lá bài
    dispatcher.dispatch({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'confirm',
        data: {
          suit: '♠'
        }
      }
    });

    expect(target.hp).toBe(4); // Vẫn giữ nguyên 4 HP
    expect(target.hand.length).toBe(1); // Nhận lá bài an toàn
  });

  it('Tâm Công: Chặn lạm dụng nhiều lần trong một lượt (giới hạn 1 lần/lượt)', () => {
    const { state, dispatcher } = setupGame([
      { id: 'c1', name: 'Chém', suit: 'spade', rank: 7 },
      { id: 'c2', name: 'Né', suit: 'heart', rank: 8 }
    ]);

    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'tam_cong',
        targets: [1]
      }
    });

    // Phản hồi lần 1
    dispatcher.dispatch({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'confirm',
        data: { suit: '♠' }
      }
    });

    const nguyenTrai = state.getPlayer(0);
    const skill = globalHeroRegistry.getSkill('tam_cong');
    expect(skill.canUse(state, { owner: nguyenTrai })).toBe(false);
  });

  it('Tâm Công: Báo không thể dùng khi Nguyễn Trãi hết bài trên tay', () => {
    const { state, dispatcher } = setupGame([]);
    const nguyenTrai = state.getPlayer(0);
    const skill = globalHeroRegistry.getSkill('tam_cong');

    expect(skill.canUse(state, { owner: nguyenTrai })).toBe(false);

    expect(() => {
      dispatcher.dispatch({
        type: 'ACTION_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'tam_cong',
          targets: [1]
        }
      });
    }).toThrow('[Tâm Công] Bạn không có bài trên tay để đối thủ rút!');
  });

  it('Tâm Công: Có thể sử dụng bình thường sau khi đã đánh 1 lá Chém trong cùng lượt (không bị chặn bởi assertSlashLimit)', () => {
    const { state, dispatcher } = setupGame([
      { id: 'c_slash', name: 'Chém', suit: 'spade', rank: 7 },
      { id: 'c_card', name: 'Hóa Giải', suit: 'heart', rank: 8 }
    ]);
    const nguyenTrai = state.getPlayer(0);

    // Đánh 1 lá Chém trước
    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      payload: {
        sourceId: 0,
        cardId: 'c_slash',
        targetIds: [1]
      }
    });

    expect(nguyenTrai.turnStats?.slashCount).toBe(1);

    // Kế tiếp dùng Tâm Công lên người chơi 1 -> Phải thành công không lỗi!
    expect(() => {
      dispatcher.dispatch({
        type: 'ACTION_SKILL',
        payload: {
          playerId: 0,
          skillId: 'tam_cong',
          targets: [1]
        }
      });
    }).not.toThrow();

    const frame = state.priorityStack.peek();
    expect(frame?.type).toBe('ASK_SUIT');
    expect(frame?.targetId).toBe(1);
  });

  it('Tâm Công: Khớp chất dạng từ tiếng Anh (heart / diamond / spade / club) với chất bài tiếng Việt', () => {
    const { state, dispatcher } = setupGame([{ id: 'c1', name: 'Chém', suit: 'heart', rank: 7 }]);
    const target = state.getPlayer(1);

    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: { playerId: 0, skillId: 'tam_cong', targets: [1] }
    });

    // Bot trả về dạng 'heart'
    dispatcher.dispatch({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'confirm',
        data: { suit: 'heart' }
      }
    });

    // Khớp chất an toàn -> không mất máu
    expect(target.hp).toBe(4);
    expect(target.hand.length).toBe(1);
  });
});
