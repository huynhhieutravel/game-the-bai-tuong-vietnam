import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Việt: Dương Đình Nghệ (Duong Dinh Nghe QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `deck_card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: (i % 13) + 1,
      color: 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Dương Đình Nghệ',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'viet',
        rawFaction: 'viet',
        mainHeroId: 'duong_dinh_nghe',
        heroes: [{ id: 'duong_dinh_nghe', skills: ['duong_quan', 'duong_quan_1', 'duong_quan_3'] }],
        skills: ['duong_quan', 'duong_quan_1', 'duong_quan_3'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Đồng Minh Việt',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'viet',
        rawFaction: 'viet',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Kẻ Địch Xa Xôi',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'ha',
        rawFaction: 'ha',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: {
          weapon: null,
          armor: null,
          horse_attack: null,
          horse_defense: { id: 'eq_horse_def', name: 'Ngựa Phòng Thủ (+1)', type: 'horse_defense' }
        },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    const state = new GameState({ players, drawPile });
    return state;
  };

  it('1. Khởi tạo & Đăng ký đầy đủ kỹ năng Dưỡng Quân trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('duong_dinh_nghe');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Dương Đình Nghệ');
    expect(hero.faction.toLowerCase()).toContain('việt');
    expect(hero.skills.some(s => s.id === 'duong_quan')).toBe(true);
    expect(hero.skills.some(s => s.id === 'duong_quan_1')).toBe(true);
    expect(hero.skills.some(s => s.id === 'duong_quan_3')).toBe(true);
  });

  it('2. Dưỡng Quân Option 1 (Pha Bắt đầu): Bỏ qua Phán xét & Rút bài để Chém thần tốc vô hạn cự ly', () => {
    const state = createMockGameState();
    const sm = new StateMachine(state);
    const dispatcher = new DispatcherV4(state, sm);

    state.currentTurnPlayerId = 0;
    
    // Đặt 1 cẩm nang trì hoãn vào khu phán xét để kiểm tra xem có bị bỏ qua không
    state.getPlayer(0).judgementArea.push({
      id: 'lightning_1',
      name: 'Sấm Sét',
      type: 'delayed_trick'
    });

    // Bắt đầu lượt
    sm._runPhaseBegin();

    // Kiểm tra đã đẩy frame ASK_DUONG_QUAN_1 vào stack
    expect(state.priorityStack.isEmpty()).toBe(false);
    const frame = state.priorityStack.peek();
    expect(frame.type).toBe('ASK_DUONG_QUAN_1');
    expect(frame.currentActorId).toBe(0);
    expect(frame.context.validTargets).toContain(2);

    // Người chơi chọn kích hoạt Dưỡng Quân 1 tấn công Kẻ Địch 2 (đang có ngựa +1 khoảng cách xa)
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 0,
      doUse: true,
      targetId: 2
    });

    // Đã phát động Chém thần tốc -> Stack xuất hiện ASK_DODGE cho mục tiêu 2
    expect(state.priorityStack.isEmpty()).toBe(false);
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().currentActorId).toBe(2);

    // Kẻ địch không có Né, nhận sát thương
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 2,
      responseType: 'cancel'
    });

    expect(state.getPlayer(2).hp).toBe(3);
    // Lá Sấm Sét trong khu phán xét vẫn còn nguyên vì đã bỏ qua Pha Phán xét
    expect(state.getPlayer(0).judgementArea.length).toBe(1);
    // Pha tiếp theo phải là Pha Ra bài (ACTION)
    expect(state.currentPhase).toBe(PHASES.ACTION);
  });

  it('3. Dưỡng Quân Option 1: Từ chối sử dụng thì tiếp tục lượt bình thường', () => {
    const state = createMockGameState();
    const sm = new StateMachine(state);
    const dispatcher = new DispatcherV4(state, sm);

    state.currentTurnPlayerId = 0;
    sm._runPhaseBegin();

    expect(state.priorityStack.peek().type).toBe('ASK_DUONG_QUAN_1');

    // Từ chối kích hoạt
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 0,
      doUse: false
    });

    // Tiến hành sang Pha Phán xét / Rút bài bình thường
    expect(state.priorityStack.isEmpty()).toBe(true);
    // Vì không có cẩm nang trì hoãn nên tự động sang Pha Rút bài rồi sang Action
    expect(state.currentPhase).toBe(PHASES.ACTION);
    // Đã rút bài bình thường (2 lá)
    expect(state.getPlayer(0).hand.length).toBe(2);
  });

  it('4. Dưỡng Quân Option 2 (Pha Ra bài): Bỏ trang bị trên người để Chém vô hạn cự ly và kết thúc Pha Ra bài', () => {
    const state = createMockGameState();
    const sm = new StateMachine(state);
    const dispatcher = new DispatcherV4(state, sm);

    state.currentTurnPlayerId = 0;
    state.currentPhase = PHASES.ACTION;

    // Trang bị 1 vũ khí
    state.getPlayer(0).equipment.weapon = { id: 'w_dao', name: 'Đao', type: 'weapon', range: 1 };

    // Kích hoạt Dưỡng Quân (Option 2)
    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      playerId: 0,
      skillId: 'duong_quan'
    });

    expect(state.priorityStack.peek().type).toBe('ASK_DUONG_QUAN_2');

    // Chọn bỏ vũ khí w_dao và nhắm vào Kẻ Địch 2
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 0,
      targetId: 2,
      cardId: 'w_dao'
    });

    // Trang bị đã bị bỏ vào discardPile
    expect(state.getPlayer(0).equipment.weapon).toBeNull();
    expect(state.discardPile.some(c => c.id === 'w_dao')).toBe(true);

    // Kẻ địch 2 bị yêu cầu Né
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().currentActorId).toBe(2);

    // Kẻ địch bỏ qua không Né
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 2,
      responseType: 'cancel'
    });

    expect(state.getPlayer(2).hp).toBe(3);
    // Pha Ra bài đã bị cưỡng chế kết thúc và chuyển sang DISCARD
    expect(state.currentPhase).toBe(PHASES.DISCARD);
  });

  it('5. Dưỡng Quân Option 3 (Pha Bỏ bài): Tự lật úp mặt tướng để bỏ qua Pha Bỏ bài và Chém thần tốc', () => {
    const state = createMockGameState();
    const sm = new StateMachine(state);
    const dispatcher = new DispatcherV4(state, sm);

    state.currentTurnPlayerId = 0;
    // Cho Dương Đình Nghệ cầm 6 lá bài trong khi chỉ có 4 HP (dư 2 lá cần bỏ)
    state.getPlayer(0).hand = Array.from({ length: 6 }, (_, i) => ({
      id: `h_card_${i}`,
      name: `Bài ${i}`,
      type: 'basic'
    }));

    // Bắt đầu Pha Bỏ bài
    sm._runPhaseDiscard();

    // Trigger ASK_DUONG_QUAN_3
    expect(state.priorityStack.isEmpty()).toBe(false);
    expect(state.priorityStack.peek().type).toBe('ASK_DUONG_QUAN_3');

    // Chấp nhận kích hoạt Dưỡng Quân 3
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 0,
      doUse: true,
      targetId: 2
    });

    // Mặt tướng bị lật úp
    expect(state.getPlayer(0).isFaceUp).toBe(false);

    // Chém được kích hoạt
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      playerId: 2,
      responseType: 'cancel'
    });

    expect(state.getPlayer(2).hp).toBe(3);
    // Tay vẫn còn nguyên 6 lá vì đã bỏ qua Pha Bỏ bài
    expect(state.getPlayer(0).hand.length).toBe(6);
    // Pha Bỏ bài bị bỏ qua, hoàn thành Pha Kết thúc và chuyển lượt sang người chơi tiếp theo (Player 1)
    expect(state.currentTurnPlayerId).toBe(1);
  });

  it('6. Dưỡng Quân Option 3: Nếu mặt tướng đã bị lật úp sẵn thì không kích hoạt được', () => {
    const state = createMockGameState();
    const sm = new StateMachine(state);

    state.currentTurnPlayerId = 0;
    state.getPlayer(0).isFaceUp = false; // Đã úp sẵn
    state.getPlayer(0).hand = Array.from({ length: 5 }, (_, i) => ({
      id: `h_card_${i}`,
      name: `Bài ${i}`,
      type: 'basic'
    }));

    sm._runPhaseDiscard();

    // Không có frame ASK_DUONG_QUAN_3, mà là frame ASK_DISCARD bình thường
    expect(state.priorityStack.peek().type).toBe('ASK_DISCARD');
  });
});
