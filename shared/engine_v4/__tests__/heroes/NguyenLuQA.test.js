import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine } from '../../core/StateMachine.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Việt: Nguyễn Lữ (Nguyen Lu QA Suite v4)', () => {
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
        name: 'Nguyễn Lữ',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'viet',
        rawFaction: 'viet',
        mainHeroId: 'nguyen_lu',
        heroes: [{ id: 'nguyen_lu', skills: ['tien_phong_nguyen_lu'] }],
        skills: ['tien_phong_nguyen_lu'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Kẻ Địch Cận Kề (Cự ly 1)',
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
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Kẻ Địch Xa Xôi (Cự ly 2)',
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
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Người Chơi Đệm',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'son',
        rawFaction: 'son',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    const state = new GameState({ players, drawPile });
    return state;
  };

  it('1. Đăng ký đầy đủ thuộc tính và kỹ năng Tiên Phong trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('nguyen_lu');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Nguyễn Lữ');
    expect(hero.faction.toLowerCase()).toContain('việt');
    expect(hero.skills.some(s => s.id === 'tien_phong_nguyen_lu')).toBe(true);
  });

  describe('2. Kỹ năng Tiên Phong (Mất 1 HP hoặc bỏ vũ khí -> Gây 1 sát thương lên người trong tầm)', () => {
    it('2.1. Đánh đổi 1 HP: Tự trừ 1 HP và gây 1 sát thương lên mục tiêu trong tầm (Cự ly 1)', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      // Nguyễn Lữ kích hoạt Tiên Phong nhắm vào kẻ địch cận kề (Player 1) bằng 1 HP
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'tien_phong_nguyen_lu',
        targets: [1],
        costType: 'hp'
      });

      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Nguyễn Lữ mất 1 HP: từ 4 xuống 3
      expect(p0.hp).toBe(3);
      // Kẻ địch bị nhận 1 sát thương: từ 4 xuống 3
      expect(p1.hp).toBe(3);
    });

    it('2.2. Đánh đổi Vũ khí: Tháo vũ khí trên người và gây 1 sát thương lên mục tiêu trong tầm', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2); // Cự ly 2

      // Trang bị vũ khí tầm 3 (Thanh Long Đao) cho Nguyễn Lữ
      p0.equipment.weapon = { id: 'wp_thanh_long', name: 'Thanh Long Đao', type: 'weapon', range: 3 };

      // Kích hoạt Tiên Phong nhắm vào Player 2 (cự ly 2) bằng cách hy sinh vũ khí
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'tien_phong_nguyen_lu',
        targets: [2],
        costType: 'weapon'
      });

      // Máu của Nguyễn Lữ giữ nguyên (4 HP)
      expect(p0.hp).toBe(4);
      // Vũ khí bị tháo khỏi người và đưa vào discardPile
      expect(p0.equipment.weapon).toBeNull();
      expect(state.discardPile.some(c => c.id === 'wp_thanh_long')).toBe(true);
      // Kẻ địch 2 nhận 1 sát thương: từ 4 xuống 3
      expect(p2.hp).toBe(3);
    });

    it('2.3. Ràng buộc Tầm đánh: Nếu mục tiêu nằm ngoài tầm đánh thì không cho phép phát động', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      // Không có vũ khí (tầm đánh mặc định = 1), mục tiêu Player 2 ở cự ly 2
      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'tien_phong_nguyen_lu',
          targets: [2],
          costType: 'hp',
          throwOnError: true
        });
      }).toThrowError(/nằm ngoài tầm đánh/);

      // Cả 2 đều không bị trừ máu
      expect(state.getPlayer(0).hp).toBe(4);
      expect(state.getPlayer(2).hp).toBe(4);
    });

    it('2.4. Kích hoạt qua Modal ASK_TIEN_PHONG và xác nhận hy sinh vũ khí', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'wp_dao', name: 'Đao', type: 'weapon', range: 1 };

      // Phát động skill không kèm costType -> Mở modal ASK_TIEN_PHONG
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'tien_phong_nguyen_lu',
        targets: [1]
      });

      expect(state.priorityStack.isEmpty()).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_TIEN_PHONG');
      expect(state.priorityStack.peek().currentActorId).toBe(0);

      // Người chơi xác nhận hy sinh vũ khí
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true,
        costType: 'weapon',
        targetId: 1
      });

      expect(p0.equipment.weapon).toBeNull();
      expect(state.getPlayer(1).hp).toBe(3);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('2.5. Hủy bỏ trong Modal ASK_TIEN_PHONG: Không ai mất máu hay trang bị', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'tien_phong_nguyen_lu',
        targets: [1]
      });

      expect(state.priorityStack.peek().type).toBe('ASK_TIEN_PHONG');

      // Hủy bỏ
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        responseType: 'cancel'
      });

      expect(state.getPlayer(0).hp).toBe(4);
      expect(state.getPlayer(1).hp).toBe(4);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });
});
