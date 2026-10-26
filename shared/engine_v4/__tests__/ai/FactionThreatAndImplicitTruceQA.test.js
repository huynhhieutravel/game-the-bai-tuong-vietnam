import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { BotBrain } from '../../ai/BotBrain.js';

describe('QA Hệ Thống Chấm Điểm Đe Dọa Đa Chiều & Liên Minh Ngầm Quốc Chiến (ADR 0098)', () => {
  const createMockGameState = ({
    player0Hp = 3,
    player0Faction = 'lac',
    player0Cards = 4,
    player1Faction = 'viet',
    player2Faction = 'ha',
    player2Alive = true,
    player3Faction = 'ha',
    player3ViceSeal = true,
    bot1IsDaTam = false
  } = {}) => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: (i % 13) + 1,
      color: 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Bạn (Main Player)',
        hp: player0Hp,
        maxHp: 4,
        gender: 'male',
        faction: player0Faction,
        isAlive: true,
        isBot: false,
        revealedHeroes: [true, true],
        mainHeroId: 'an_duong_vuong',
        heroes: [{ id: 'an_duong_vuong', skills: [] }],
        skills: [],
        hand: Array.from({ length: player0Cards }, (_, i) => ({
          id: `p0_card_${i}`,
          name: 'Né',
          type: 'dodge',
          suit: 'heart',
          rank: 2,
          color: 'red'
        })),
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Bot 2',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        faction: player1Faction,
        isDaTam: bot1IsDaTam,
        isAlive: true,
        isBot: true,
        revealedHeroes: [true, true],
        mainHeroId: 'ngo_quyen',
        heroes: [{ id: 'ngo_quyen', skills: [] }],
        skills: [],
        hand: [
          { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'spade', rank: 7, color: 'black' },
          { id: 'duel_1', name: 'Quyết Đấu', type: 'trick', subtype: 'single_trick', suit: 'spade', rank: 1, color: 'black' },
          { id: 'steal_1', name: 'Cướp Bài', type: 'trick', subtype: 'single_trick', suit: 'diamond', rank: 3, color: 'red' },
          { id: 'dismantle_1', name: 'Tước Bài', type: 'trick', subtype: 'single_trick', suit: 'club', rank: 4, color: 'black' }
        ],
        equipment: {
          weapon: { id: 'w_bat_xa_mau', name: 'Bát Xà Mâu', attackRange: 3, range: 3 },
          armor: null,
          horse_attack: null,
          horse_defense: null
        },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Bot 3',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        faction: player2Faction,
        isAlive: player2Alive,
        isBot: true,
        revealedHeroes: [true, true],
        mainHeroId: 'trieu_quang_phuc',
        heroes: [{ id: 'trieu_quang_phuc', skills: [] }],
        skills: [],
        hand: [
          { id: 'p2_c1', name: 'Chém', type: 'slash', suit: 'heart', rank: 8, color: 'red' },
          { id: 'p2_c2', name: 'Né', type: 'dodge', suit: 'diamond', rank: 9, color: 'red' },
          { id: 'p2_c3', name: 'Đào', type: 'peach', suit: 'heart', rank: 10, color: 'red' }
        ],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Bot 4',
        hp: 3,
        maxHp: 3,
        gender: 'female',
        faction: player3Faction,
        isAlive: true,
        isBot: true,
        hasViceSeal: player3ViceSeal,
        revealedHeroes: [true, true],
        mainHeroId: 'ba_trieu',
        heroes: [{ id: 'ba_trieu', skills: [] }],
        skills: [],
        hand: [
          { id: 'p3_c1', name: 'Chém', type: 'slash', suit: 'club', rank: 5, color: 'black' },
          { id: 'p3_c2', name: 'Né', type: 'dodge', suit: 'diamond', rank: 6, color: 'red' },
          { id: 'p3_c3', name: 'Rượu', type: 'wine', suit: 'diamond', rank: 9, color: 'red' }
        ],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    const state = new GameState({
      players,
      deck: drawPile,
      discardPile: [],
      currentTurnPlayerId: 1
    });

    return state;
  };

  it('1. Tái hiện chuẩn 100% tình huống thực tế của User: Bot 2 (Phe Việt) KHÔNG ĐƯỢC CHÉM Bạn (Phe Lạc) khi Phe Hà áp đảo', () => {
    // 4 người chơi:
    // P0: Bạn (Phe Lạc, 3 HP, 4 lá bài)
    // P1: Bot 2 (Phe Việt, 3 HP, vũ khí Tầm 3 bao phủ cả bàn cờ)
    // P2: Bot 3 (Phe Hà, 3 HP)
    // P3: Bot 4 (Phe Hà, 3 HP, có Phó Ấn)
    const state = createMockGameState();
    const bot2 = state.getPlayer(1);
    const p0 = state.getPlayer(0);
    const p2 = state.getPlayer(2);
    const p3 = state.getPlayer(3);

    // Kiểm tra Threat Score
    const scoreP0 = BotBrain.calculateThreatScore(bot2, p0, state);
    const scoreP2 = BotBrain.calculateThreatScore(bot2, p2, state);
    const scoreP3 = BotBrain.calculateThreatScore(bot2, p3, state);

    // P2 và P3 thuộc Phe Hà (dominant, size = 2) -> Phải nhận +100 điểm dominant + (2*25) = +150
    // P3 có Phó Ấn -> Nhận thêm +25
    // P0 thuộc Phe Lạc (size = 1) trong khi Bot 2 là Phe Việt (size = 1) -> Liên minh ngầm kích hoạt: -80 điểm
    expect(scoreP0).toBeLessThan(0); // Bị phạt âm do liên minh ngầm
    expect(scoreP2).toBeGreaterThan(100);
    expect(scoreP3).toBeGreaterThan(125);
    expect(scoreP3).toBeGreaterThan(scoreP2); // P3 có Phó Ấn nên nguy hiểm nhất

    // Khi Bot 2 ra quyết định đánh Chém trong lượt:
    const action = BotBrain._decideSlashAction(state, bot2);
    expect(action).not.toBeNull();
    expect(action.type).toBe('PLAY_CARD');
    // TUYỆT ĐỐI KHÔNG ĐƯỢC LÀ P0 (BẠN)!
    expect(action.targetId).not.toBe(0);
    // Mục tiêu PHẢI LÀ P2 hoặc P3 (Phe Hà)
    expect([2, 3]).toContain(action.targetId);
  });

  it('2. Các cẩm nang đơn mục tiêu (Quyết Đấu, Cướp Bài, Tước Bài) cũng phải dồn hỏa lực vào Phe Áp Đảo (Phe Hà)', () => {
    const state = createMockGameState();
    const bot2 = state.getPlayer(1);

    // Xóa Chém để Bot chỉ còn các lá Trick
    bot2.hand = bot2.hand.filter(c => c.type === 'trick');

    const trickAction = BotBrain._decideTrickAction(state, bot2);
    expect(trickAction).not.toBeNull();
    expect(trickAction.type).toBe('PLAY_CARD');
    // Phải nhắm vào Phe Hà (P2 hoặc P3), không được nhắm vào P0
    expect(trickAction.targetId).not.toBe(0);
    expect([2, 3]).toContain(trickAction.targetId);
  });

  it('3. Ngoại lệ Liên Minh Ngầm: Khi kẻ địch phe thiểu số hấp hối (HP = 1), Bot có thể dứt điểm dọn bàn', () => {
    // P0 chỉ còn 1 HP
    const state = createMockGameState({ player0Hp: 1 });
    const bot2 = state.getPlayer(1);
    const p0 = state.getPlayer(0);

    const scoreP0 = BotBrain.calculateThreatScore(bot2, p0, state);
    // Khi HP = 1, liên minh ngầm (-80) được gỡ bỏ và cộng thêm +50 điểm finishing
    expect(scoreP0).toBeGreaterThan(0);
  });

  it('4. Phá vỡ thế áp đảo: Khi Phe Hà chỉ còn 1 thành viên sống sót (1v1v1 cân bằng), không còn phạt liên minh ngầm', () => {
    // P2 đã chết, Phe Hà chỉ còn P3
    const state = createMockGameState({ player2Alive: false });
    const bot2 = state.getPlayer(1);
    const p0 = state.getPlayer(0);
    const p3 = state.getPlayer(3);

    const scoreP0 = BotBrain.calculateThreatScore(bot2, p0, state);
    const scoreP3 = BotBrain.calculateThreatScore(bot2, p3, state);

    // Không còn dominant faction (mỗi phe chỉ 1 người)
    // Cả 2 đều là kẻ địch lộ diện bình thường, không ai bị trừ -80 điểm
    expect(scoreP0).toBeGreaterThan(0);
    expect(scoreP3).toBeGreaterThan(0);
  });

  it('5. Giao thức Tướng Dã Tâm (Lone Wolf): Bot Dã Tâm vẫn diệt Phe Áp Đảo trước để đưa về thế cờ tàn solo 1v1', () => {
    // Bot 2 là Dã Tâm (isDaTam: true)
    const state = createMockGameState({ bot1IsDaTam: true });
    const bot2 = state.getPlayer(1);
    const p0 = state.getPlayer(0);
    const p2 = state.getPlayer(2);
    const p3 = state.getPlayer(3);

    const scoreP0 = BotBrain.calculateThreatScore(bot2, p0, state);
    const scoreP2 = BotBrain.calculateThreatScore(bot2, p2, state);
    const scoreP3 = BotBrain.calculateThreatScore(bot2, p3, state);

    // Dã Tâm cũng nhận biết Phe Hà đang có 2 người áp đảo bàn cờ
    expect(scoreP2).toBeGreaterThan(scoreP0);
    expect(scoreP3).toBeGreaterThan(scoreP0);

    const action = BotBrain._decideSlashAction(state, bot2);
    expect([2, 3]).toContain(action.targetId);
    expect(action.targetId).not.toBe(0);
  });
});
