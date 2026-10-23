import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Ngô Quyền (ngo_quyen) — Bạch Đằng & Hậu Viện', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Ngô Quyền',
          heroId: 'ngo_quyen',
          faction: 'ha',
          hp: 3,
          maxHp: 4,
          skills: ['bach_dang', 'hau_vien'],
          hand: [
            { id: 'c1', name: 'Chém', type: 'slash', suit: 'spade', rank: 7 },
            { id: 'c2', name: 'Né', type: 'dodge', suit: 'diamond', rank: 8 },
            { id: 'c3', name: 'Rượu', type: 'wine', suit: 'heart', rank: 9 }
          ]
        },
        {
          id: 1,
          name: 'Yết Kiêu (Đồng minh Hà)',
          heroId: 'yet_kieu',
          faction: 'ha',
          hp: 3,
          maxHp: 4,
          skills: ['lan_sau'],
          hand: [
            { id: 'p1', name: 'Đào', type: 'peach', suit: 'heart', rank: 3 }
          ]
        },
        {
          id: 2,
          name: 'Kẻ Địch',
          heroId: 'dinh_bo_linh',
          faction: 'son',
          hp: 4,
          maxHp: 4,
          skills: [],
          hand: []
        }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Lá 1', suit: 'spade', rank: 1 },
        { id: 'deck_2', name: 'Lá 2', suit: 'heart', rank: 2 },
        { id: 'deck_3', name: 'Lá 3', suit: 'club', rank: 3 },
        { id: 'deck_4', name: 'Lá 4', suit: 'diamond', rank: 4 },
        { id: 'deck_5', name: 'Lá 5', suit: 'spade', rank: 5 },
        { id: 'deck_6', name: 'Lá 6', suit: 'heart', rank: 6 }
      ],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  it('Bạch Đằng: Bỏ toàn bộ bài trên tay nhận thưởng rút N + 1 lá bài mới', () => {
    const { state, dispatcher } = setupGame();
    const ngoQuyen = state.getPlayer(0);

    // Có 3 lá bài -> Bỏ hết 3 lá bài -> Rút 3 + 1 = 4 lá bài mới
    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'bach_dang'
      }
    });

    expect(ngoQuyen.hand.length).toBe(4);
    expect(ngoQuyen.skillUsage?.bach_dang?.usedThisTurn).toBe(true);
  });

  it('Bạch Đằng: Bỏ một phần số bài trên tay rút đúng số lượng lá bài đã bỏ (không có bonus)', () => {
    const { state, dispatcher } = setupGame();
    const ngoQuyen = state.getPlayer(0);

    // Có 3 lá -> Chọn bỏ 2 lá ('c1', 'c2')
    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'bach_dang',
        cardIds: ['c1', 'c2']
      }
    });

    // 1 lá còn lại + 2 lá rút mới = 3 lá
    expect(ngoQuyen.hand.length).toBe(3);
    expect(ngoQuyen.hand.some(c => c.id === 'c3')).toBe(true);
    expect(ngoQuyen.skillUsage?.bach_dang?.usedThisTurn).toBe(true);
  });

  it('Bạch Đằng: Chặn lạm dụng nhiều lần trong một lượt (giới hạn 1 lần/lượt)', () => {
    const { state, dispatcher } = setupGame();

    dispatcher.dispatch({
      type: 'ACTION_SKILL',
      payload: {
        playerId: 0,
        skillId: 'bach_dang',
        cardIds: ['c1']
      }
    });

    expect(() => {
      dispatcher.dispatch({
        type: 'ACTION_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'bach_dang',
          cardIds: ['c2']
        }
      });
    }).toThrow(/Mỗi lượt chỉ được sử dụng 1 lần/);
  });

  it('Bạch Đằng: Báo lỗi nếu kích hoạt khi không còn bài trên tay', () => {
    const { state, dispatcher } = setupGame();
    const ngoQuyen = state.getPlayer(0);
    ngoQuyen.hand = [];

    expect(() => {
      dispatcher.dispatch({
        type: 'ACTION_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'bach_dang'
        }
      });
    }).toThrow(/Không có bài trên tay/);
  });

  it('Hậu Viện: Khi đồng minh Hà ăn Đào và Ngô Quyền mất máu, khung ASK_HAU_VIEN xuất hiện', () => {
    const { state, dispatcher } = setupGame();
    state.currentTurnPlayerId = 1; // Lượt của Yết Kiêu

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      payload: {
        sourceId: 1,
        cardId: 'p1'
      }
    });

    const frame = state.priorityStack.peek();
    expect(frame).toBeDefined();
    expect(frame.type).toBe('ASK_HAU_VIEN');
    expect(frame.context.reason).toBe('hau_vien');
  });

  it('Hậu Viện: Đồng minh Hà chấp thuận nhường Đào -> Ngô Quyền hồi 1 HP và đồng minh rút 1 bài', () => {
    const { state, dispatcher } = setupGame();
    state.currentTurnPlayerId = 1;
    const yetKieu = state.getPlayer(1);
    const ngoQuyen = state.getPlayer(0);

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      payload: {
        sourceId: 1,
        cardId: 'p1'
      }
    });

    // Yết Kiêu đồng ý nhường Đào cho Ngô Quyền (targetId: 0)
    dispatcher.dispatch({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'confirm',
        data: {
          doReact: true,
          targetId: 0
        }
      }
    });

    expect(ngoQuyen.hp).toBe(4); // 3 -> 4 (hồi máu đầy đủ)
    expect(yetKieu.hand.length).toBe(1); // Rút 1 lá bài thưởng từ Hậu Viện
  });

  it('Hậu Viện: Đồng minh Hà từ chối nhường Đào -> Bản thân đồng minh tự hồi 1 HP', () => {
    const { state, dispatcher } = setupGame();
    state.currentTurnPlayerId = 1;
    const yetKieu = state.getPlayer(1);
    const ngoQuyen = state.getPlayer(0);

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      payload: {
        sourceId: 1,
        cardId: 'p1'
      }
    });

    // Yết Kiêu từ chối
    dispatcher.dispatch({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'skip',
        data: {
          doReact: false
        }
      }
    });

    expect(ngoQuyen.hp).toBe(3); // Giữ nguyên
    expect(yetKieu.hp).toBe(4); // Yết Kiêu tự hồi 1 HP (3 -> 4)
  });
});
