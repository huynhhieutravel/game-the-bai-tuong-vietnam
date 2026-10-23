import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES, CongChuaAnTu } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Công chúa An Tư (cong_chua_an_tu) — Hòa Thân & Xả Thân', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Công chúa An Tư',
          heroId: 'cong_chua_an_tu',
          faction: 'ha',
          gender: 'female',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: ['hoa_than_an_tu', 'xa_than'],
          hand: [
            { id: 'd1', name: 'Sát Thương', suit: 'diamond', rank: '7' },
            { id: 's1', name: 'Đao Kiếm', suit: 'spade', rank: '3' }
          ],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: []
        },
        {
          id: 1,
          name: 'Mục Tiêu / Đồng Minh',
          heroId: 'nguyen_trai',
          faction: 'ha',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: [],
          hand: [
            { id: 'dodge1', name: 'Né', type: 'dodge' }
          ],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: []
        },
        {
          id: 2,
          name: 'Kẻ Tấn Công',
          heroId: 'ngo_quyen',
          faction: 'ha',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          skills: [],
          hand: [
            { id: 'slash1', name: 'Chém', type: 'slash' }
          ],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: []
        }
      ],
      drawPile: [],
      discardPile: [],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  it('1. Cấu hình & Dữ liệu: Đảm bảo thông tin Hero và Skills chuẩn xác', () => {
    expect(CongChuaAnTu.id).toBe('cong_chua_an_tu');
    expect(['ha', 'Hà']).toContain(CongChuaAnTu.faction);
    expect(CongChuaAnTu.gender).toBe('female');
    expect(CongChuaAnTu.hp).toBe(3);
    expect(CongChuaAnTu.maxHp).toBe(3);

    const skillIds = CongChuaAnTu.skills.map(s => s.id);
    expect(skillIds).toContain('hoa_than_an_tu');
    expect(skillIds).toContain('xa_than');

    const hero = globalHeroRegistry.getHero('cong_chua_an_tu');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Công chúa An Tư');
  });

  it('2. Hòa Thân: Dùng bài chất Rô ♦ làm [Hỗn Loạn] qua ACTION_PLAY_CARD', () => {
    const { state, dispatcher } = setupGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    expect(p0.hand.some(c => c.id === 'd1')).toBe(true);

    // An Tư đánh lá d1 (chất Rô) làm Hỗn Loạn nhắm vào p1
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: {
        playerId: 0,
        cardId: 'd1',
        virtualCardName: 'Hỗn Loạn',
        asChaos: true,
        targets: [1]
      }
    });

    // Lá bài phải được chuyển sang judgementArea của p1
    expect(p1.judgementArea.length).toBe(1);
    expect(p1.judgementArea[0].name).toBe('Hỗn Loạn');
    expect(p1.judgementArea[0].id).toBe('d1');

    // Lá bài rời khỏi tay p0
    expect(p0.hand.some(c => c.id === 'd1')).toBe(false);

    // Bảo toàn lá bài: Lá bài CHƯA được đưa vào discardPile (chỉ đưa vào khi phán xét)
    expect(state.discardPile.some(c => c.id === 'd1')).toBe(false);
  });

  it('3. Hòa Thân: Kích hoạt qua ACTION_USE_SKILL và chặn lá bài không phải chất Rô', () => {
    const { state, dispatcher } = setupGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    // Kích hoạt lá bài không phải chất Rô (s1: spade) -> Phải ném lỗi
    expect(() => {
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'hoa_than_an_tu',
          cardIds: ['s1'],
          targets: [1]
        }
      });
    }).toThrow(/Chỉ có thể dùng lá bài chất Rô/);

    // Kích hoạt lá bài chất Rô (d1: diamond) -> Thành công
    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      throwOnError: true,
      payload: {
        playerId: 0,
        skillId: 'hoa_than_an_tu',
        cardIds: ['d1'],
        targets: [1]
      }
    });

    expect(p1.judgementArea.length).toBe(1);
    expect(p1.judgementArea[0].id).toBe('d1');
    expect(p0.hand.some(c => c.id === 'd1')).toBe(false);
  });

  it('4. Xả Thân: Khi bị Chém, bỏ 1 lá bài chuyển hướng Chém sang mục tiêu trong tầm', () => {
    const { state, dispatcher } = setupGame();
    const p0 = state.getPlayer(0); // An Tư
    const p1 = state.getPlayer(1); // Đồng minh trong tầm
    const p2 = state.getPlayer(2); // Kẻ tấn công

    state.currentTurnPlayerId = 2;

    // P2 Chém An Tư P0
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: {
        playerId: 2,
        cardId: 'slash1',
        targets: [0]
      }
    });

    // An Tư nhận yêu cầu ASK_XA_THAN
    expect(state.priorityStack.peek().type).toBe('ASK_XA_THAN');
    expect(state.priorityStack.peek().currentActorId).toBe(0);

    // An Tư bỏ lá s1, chuyển hướng sang P1
    dispatcher.dispatchAction({
      type: 'ACTION_RESPONSE',
      payload: {
        playerId: 0,
        data: {
          doUse: true,
          cardId: 's1',
          targetId: 1
        }
      }
    });

    // Đòn Chém chuyển sang P1, mở ASK_DODGE cho P1
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().currentActorId).toBe(1);

    // P1 đánh Né
    dispatcher.dispatchAction({
      type: 'ACTION_RESPONSE',
      payload: {
        playerId: 1,
        data: {
          doReact: true,
          cardId: 'dodge1'
        }
      }
    });

    // P1 né thành công, không ai mất máu
    expect(p0.hp).toBe(3);
    expect(p1.hp).toBe(3);
  });

  it('5. Xả Thân: Bỏ trang bị (Bạch Ngân) để chuyển hướng và hồi 1 HP', () => {
    const { state, dispatcher } = setupGame();
    const p0 = state.getPlayer(0); // An Tư
    p0.hp = 2; // Bị thương 1 HP
    p0.hand = []; // Hết bài trên tay
    p0.equipment.armor = { id: 'bach_ngan_1', name: 'Bạch Ngân', idKey: 'bach_ngan' };

    state.currentTurnPlayerId = 2;

    // P2 Chém An Tư P0
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: {
        playerId: 2,
        cardId: 'slash1',
        targets: [0]
      }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_XA_THAN');

    // An Tư bỏ trang bị Bạch Ngân chuyển hướng sang P1
    dispatcher.dispatchAction({
      type: 'ACTION_RESPONSE',
      payload: {
        playerId: 0,
        data: {
          doUse: true,
          cardId: 'bach_ngan_1',
          targetId: 1
        }
      }
    });

    // Bạch Ngân rời người giúp An Tư hồi phục lên 3 HP
    expect(p0.hp).toBe(3);
    expect(p0.equipment.armor).toBeNull();

    // P1 nhận đòn Chém
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().currentActorId).toBe(1);
  });

  it('6. Xả Thân: Từ chối chuyển hướng -> An Tư nhận ASK_DODGE', () => {
    const { state, dispatcher } = setupGame();
    state.currentTurnPlayerId = 2;

    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: {
        playerId: 2,
        cardId: 'slash1',
        targets: [0]
      }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_XA_THAN');

    // An Tư từ chối Xả Thân
    dispatcher.dispatchAction({
      type: 'ACTION_RESPONSE',
      payload: {
        playerId: 0,
        data: {
          canceled: true
        }
      }
    });

    // An Tư nhận yêu cầu ASK_DODGE
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().currentActorId).toBe(0);
  });

  it('7. Xả Thân: Chặn chuyển hướng sang mục tiêu không hợp lệ', () => {
    const { state, dispatcher } = setupGame();
    state.currentTurnPlayerId = 2;

    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: {
        playerId: 2,
        cardId: 'slash1',
        targets: [0]
      }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_XA_THAN');

    // Chuyển hướng sang player 999 không tồn tại
    expect(() => {
      dispatcher.dispatchAction({
        type: 'ACTION_RESPONSE',
        throwOnError: true,
        payload: {
          playerId: 0,
          data: {
            doUse: true,
            cardId: 's1',
            targetId: 999
          }
        }
      });
    }).toThrow(/không hợp lệ/);
  });
});
