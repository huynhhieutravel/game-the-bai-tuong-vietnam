import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { BotBrain } from '../../ai/BotBrain.js';

describe('QA Nâng Cấp Trí Tuệ Bot AI: Quyết Đấu An Toàn, Cứu Viện Đồng Minh & Quản Lý Rủi Ro (ADR 0099)', () => {
  const createMockState = (playersConfig = []) => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: (i % 13) + 1,
      color: 'black'
    }));

    const players = playersConfig.map((cfg, idx) => ({
      id: cfg.id ?? idx,
      name: cfg.name ?? `Player ${idx}`,
      hp: cfg.hp ?? 3,
      maxHp: cfg.maxHp ?? 4,
      gender: cfg.gender ?? 'male',
      faction: cfg.faction ?? 'viet',
      isAlive: cfg.isAlive ?? true,
      isBot: cfg.isBot ?? true,
      revealedHeroes: cfg.revealedHeroes ?? [true, true],
      mainHeroId: cfg.mainHeroId ?? 'ngo_quyen',
      heroes: [{ id: cfg.mainHeroId ?? 'ngo_quyen', skills: cfg.skills ?? [] }],
      skills: cfg.skills ?? [],
      hand: cfg.hand ?? [],
      equipment: cfg.equipment ?? { weapon: null, armor: null, horse_attack: null, horse_defense: null },
      judgementArea: cfg.judgementArea ?? [],
      chained: cfg.chained ?? false,
      temporaryFlags: cfg.temporaryFlags ?? {},
      turnStats: cfg.turnStats ?? { slashCount: 0, wineCount: 0 }
    }));

    return new GameState({
      players,
      deck: drawPile,
      discardPile: [],
      currentTurnPlayerId: players[0]?.id ?? 0
    });
  };

  it('1. Quyết Đấu An Toàn: Bot có 0 Chém trên tay và đối thủ có bài -> TUYỆT ĐỐI KHÔNG dùng Quyết Đấu', () => {
    const state = createMockState([
      {
        id: 0,
        name: 'Bot 0 (Actor)',
        hp: 3,
        faction: 'viet',
        hand: [
          { id: 'duel_1', name: 'Quyết Đấu', type: 'trick', subtype: 'single_trick', suit: 'spade', rank: 1 },
          { id: 'dodge_1', name: 'Né', type: 'dodge', suit: 'heart', rank: 2, color: 'red' }
        ]
      },
      {
        id: 1,
        name: 'Bot 1 (Enemy with Cards)',
        hp: 3,
        faction: 'ha',
        hand: [
          { id: 'c1', name: 'Chém', type: 'slash', suit: 'spade', rank: 5 },
          { id: 'c2', name: 'Né', type: 'dodge', suit: 'diamond', rank: 6 }
        ]
      }
    ]);

    const bot0 = state.getPlayer(0);
    const trickAction = BotBrain._decideTrickAction(state, bot0);
    // Vì Bot có 0 Chém và đối thủ có bài trên tay -> Quyết đấu bị chặn để tránh tự sát!
    expect(trickAction).toBeNull();
  });

  it('2. Đòn Trừng Phạt 100%: Bot có 0 Chém nhưng đối thủ có 0 lá bài trên tay -> Bot dùng Quyết Đấu gây sát thương miễn phí', () => {
    const state = createMockState([
      {
        id: 0,
        name: 'Bot 0 (Actor)',
        hp: 3,
        faction: 'viet',
        hand: [
          { id: 'duel_1', name: 'Quyết Đấu', type: 'trick', subtype: 'single_trick', suit: 'spade', rank: 1 },
          { id: 'peach_1', name: 'Đào', type: 'peach', suit: 'heart', rank: 12, color: 'red' }
        ]
      },
      {
        id: 1,
        name: 'Bot 1 (Empty Hand Enemy)',
        hp: 3,
        faction: 'ha',
        hand: [] // 0 bài trên tay
      }
    ]);

    const bot0 = state.getPlayer(0);
    const trickAction = BotBrain._decideTrickAction(state, bot0);
    expect(trickAction).not.toBeNull();
    expect(trickAction.cardId).toBe('duel_1');
    expect(trickAction.targetId).toBe(1);
  });

  it('3. Thứ tự tác chiến: Bot có 1 Chém và 1 Quyết Đấu, đối thủ có >= 2 bài -> Ưu tiên đánh Chém an toàn trước', () => {
    const state = createMockState([
      {
        id: 0,
        name: 'Bot 0 (Actor)',
        hp: 3,
        faction: 'viet',
        hand: [
          { id: 'duel_1', name: 'Quyết Đấu', type: 'trick', subtype: 'single_trick', suit: 'spade', rank: 1 },
          { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'club', rank: 8 }
        ]
      },
      {
        id: 1,
        name: 'Bot 1 (Enemy with Cards)',
        hp: 3,
        faction: 'ha',
        hand: [
          { id: 'c1', name: 'Chém', type: 'slash', suit: 'spade', rank: 5 },
          { id: 'c2', name: 'Né', type: 'dodge', suit: 'diamond', rank: 6 }
        ]
      }
    ]);

    const bot0 = state.getPlayer(0);
    // Trong chuỗi hành động decideAction:
    // Vì chỉ có 1 Chém và đối thủ có 2 bài, _decideTrickAction bỏ qua Quyết Đấu
    const trickAction = BotBrain._decideTrickAction(state, bot0);
    expect(trickAction).toBeNull();

    // Chuyển sang _decideSlashAction -> Đánh Chém trực diện an toàn!
    const slashAction = BotBrain._decideSlashAction(state, bot0);
    expect(slashAction).not.toBeNull();
    expect(slashAction.cardId).toBe('slash_1');
    expect(slashAction.targetId).toBe(1);
  });

  it('4. Combo Hủy Diệt: Bot có >= 2 Chém và 1 Quyết Đấu -> Dùng Quyết Đấu trước để ép bài, rồi Chém tiếp', () => {
    const state = createMockState([
      {
        id: 0,
        name: 'Bot 0 (Actor)',
        hp: 3,
        faction: 'viet',
        hand: [
          { id: 'duel_1', name: 'Quyết Đấu', type: 'trick', subtype: 'single_trick', suit: 'spade', rank: 1 },
          { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'club', rank: 8 },
          { id: 'slash_2', name: 'Chém', type: 'slash', suit: 'diamond', rank: 9 }
        ]
      },
      {
        id: 1,
        name: 'Bot 1 (Enemy)',
        hp: 3,
        faction: 'ha',
        hand: [
          { id: 'c1', name: 'Chém', type: 'slash', suit: 'spade', rank: 5 },
          { id: 'c2', name: 'Né', type: 'dodge', suit: 'diamond', rank: 6 }
        ]
      }
    ]);

    const bot0 = state.getPlayer(0);
    // Có >= 2 Chém -> Tự tin tung Quyết Đấu trước!
    const trickAction = BotBrain._decideTrickAction(state, bot0);
    expect(trickAction).not.toBeNull();
    expect(trickAction.cardId).toBe('duel_1');
    expect(trickAction.targetId).toBe(1);
  });

  it('5. Quản lý rủi ro Sấm Sét: Bot HP <= 2 và không có skill đổi bài phán xét -> KHÔNG tự đặt Sấm Sét', () => {
    const state = createMockState([
      {
        id: 0,
        name: 'Bot 0 (Actor low HP)',
        hp: 2, // Máu thấp nguy hiểm
        faction: 'viet',
        hand: [
          { id: 'lightning_1', name: 'Sấm Sét', type: 'trick', subtype: 'delayed_trick', suit: 'spade', rank: 1 }
        ]
      },
      {
        id: 1,
        name: 'Bot 1 (Enemy)',
        hp: 3,
        faction: 'ha',
        hand: [{ id: 'c1', name: 'Chém', type: 'slash', suit: 'spade', rank: 5 }]
      }
    ]);

    const bot0 = state.getPlayer(0);
    const trickAction = BotBrain._decideTrickAction(state, bot0);
    // Bị chặn để tránh tự nổ 3 HP chết bất đắc kỳ tử
    expect(trickAction).toBeNull();
  });

  it('6. Quản lý rủi ro Sấm Sét: Bot HP >= 3 an toàn -> Được phép đặt Sấm Sét', () => {
    const state = createMockState([
      {
        id: 0,
        name: 'Bot 0 (Healthy HP)',
        hp: 3,
        faction: 'viet',
        hand: [
          { id: 'lightning_1', name: 'Sấm Sét', type: 'trick', subtype: 'delayed_trick', suit: 'spade', rank: 1 }
        ]
      },
      {
        id: 1,
        name: 'Bot 1 (Enemy)',
        hp: 3,
        faction: 'ha',
        hand: [{ id: 'c1', name: 'Chém', type: 'slash', suit: 'spade', rank: 5 }]
      }
    ]);

    const bot0 = state.getPlayer(0);
    const trickAction = BotBrain._decideTrickAction(state, bot0);
    expect(trickAction).not.toBeNull();
    expect(trickAction.cardId).toBe('lightning_1');
    expect(trickAction.targetId).toBe(0);
  });

  it('7. Cứu Viện Đồng Minh: Đồng minh dính Sấm Sét trong khu phán xét -> Bot dùng Tước Bài / Cướp Bài gỡ bùa hại', () => {
    const state = createMockState([
      {
        id: 0,
        name: 'Bot 0 (Actor)',
        hp: 3,
        faction: 'viet',
        hand: [
          { id: 'dismantle_1', name: 'Tước Bài', type: 'trick', subtype: 'single_trick', suit: 'spade', rank: 3 }
        ]
      },
      {
        id: 1,
        name: 'Bot 1 (Ally afflicted by Lightning)',
        hp: 3,
        faction: 'viet', // Cùng phe Việt -> Đồng minh
        hand: [{ id: 'c1', name: 'Chém', type: 'slash', suit: 'heart', rank: 6 }],
        judgementArea: [
          { id: 'lightning_on_ally', name: 'Sấm Sét', type: 'trick', subtype: 'delayed_trick', suit: 'spade', rank: 2 }
        ]
      },
      {
        id: 2,
        name: 'Bot 2 (Enemy)',
        hp: 3,
        faction: 'ha',
        hand: [{ id: 'c2', name: 'Chém', type: 'slash', suit: 'club', rank: 9 }]
      }
    ]);

    const bot0 = state.getPlayer(0);
    const trickAction = BotBrain._decideTrickAction(state, bot0);
    expect(trickAction).not.toBeNull();
    expect(trickAction.cardId).toBe('dismantle_1');
    // Ưu tiên tuyệt đối nhắm vào Đồng minh ID 1 để tước lá Sấm Sét giải cứu!
    expect(trickAction.targetId).toBe(1);
    expect(trickAction.targetCardId).toBe('lightning_on_ally');
  });

  it('8. Ưu tiên Hỏa Công mục tiêu Xiềng Xích: Bot chọn kẻ địch bị xích để kích hoạt sát thương lây lan', () => {
    const state = createMockState([
      {
        id: 0,
        name: 'Bot 0 (Actor)',
        hp: 3,
        faction: 'viet',
        hand: [
          { id: 'fire_1', name: 'Hỏa Công', type: 'trick', subtype: 'single_trick', suit: 'heart', rank: 4 },
          { id: 'discard_cand', name: 'Né', type: 'dodge', suit: 'diamond', rank: 5 } // Có bài để bỏ
        ]
      },
      {
        id: 1,
        name: 'Bot 1 (Enemy Normal)',
        hp: 3,
        faction: 'ha',
        chained: false,
        hand: [{ id: 'c1', name: 'Chém', type: 'slash', suit: 'club', rank: 5 }]
      },
      {
        id: 2,
        name: 'Bot 2 (Enemy Chained)',
        hp: 3,
        faction: 'ha',
        chained: true, // Đang bị Xiềng Xích
        hand: [{ id: 'c2', name: 'Chém', type: 'slash', suit: 'diamond', rank: 7 }]
      }
    ]);

    const bot0 = state.getPlayer(0);
    const trickAction = BotBrain._decideTrickAction(state, bot0);
    expect(trickAction).not.toBeNull();
    expect(trickAction.cardId).toBe('fire_1');
    // Phải ưu tiên nhắm vào mục tiêu bị Xiềng Xích (ID 2)!
    expect(trickAction.targetId).toBe(2);
  });
});
