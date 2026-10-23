import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Việt: Lý Thường Kiệt (Ly Thuong Kiet QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `deck_card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'heart',
      rank: (i % 13) + 1,
      color: 'red'
    }));

    const players = [
      {
        id: 0,
        name: 'Lý Thường Kiệt',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        rawFaction: 'viet',
        mainHeroId: 'ly_thuong_kiet',
        heroes: [{ id: 'ly_thuong_kiet', skills: ['nam_quoc_son_ha', 'tien_phat'] }],
        skills: ['nam_quoc_son_ha', 'tien_phat'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Đồng Minh Việt 1',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        rawFaction: 'viet',
        mainHeroId: 'phung_hung',
        heroes: [{ id: 'phung_hung', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [{ id: 'dodge_ally_1', name: 'Né', type: 'dodge' }],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Đồng Minh Việt 2',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        rawFaction: 'viet',
        mainHeroId: 'khuc_thua_du',
        heroes: [{ id: 'khuc_thua_du', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [{ id: 'dodge_ally_2', name: 'Né', type: 'dodge' }],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Kẻ Địch Phương Bắc',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
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
      }
    ];

    const state = new GameState({ players, drawPile });
    return state;
  };

  it('1. Đăng ký đầy đủ thuộc tính và kỹ năng trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('ly_thuong_kiet');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Lý Thường Kiệt');
    expect(hero.faction.toLowerCase()).toContain('việt');
    expect(hero.skills.some(s => s.id === 'nam_quoc_son_ha')).toBe(true);
    expect(hero.skills.some(s => s.id === 'tien_phat')).toBe(true);
  });

  describe('2. Nam Quốc Sơn Hà (Rút 1 bài & Thu lá bài gây sát thương)', () => {
    it('2.1. Nhận sát thương từ Chém: Rút 1 bài và thu hồi chính lá Chém từ discardPile', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const enemySlash = { id: 'lethal_slash', name: 'Chém', type: 'slash', suit: 'spade', rank: 7 };
      state.discardPile.push(enemySlash);

      // Kích hoạt sát thương lên Lý Thường Kiệt
      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: 3,
        targetId: 0,
        target: state.getPlayer(0),
        card: enemySlash
      }, state);

      expect(state.priorityStack.isEmpty()).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_NAM_QUOC_SON_HA');
      expect(state.priorityStack.peek().currentActorId).toBe(0);

      // Kích hoạt kỹ năng
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true
      });

      const ltk = state.getPlayer(0);
      // Rút 1 lá từ deck + 1 lá Chém thu hồi từ discardPile = 2 lá
      expect(ltk.hand.length).toBe(2);
      expect(ltk.hand.some(c => c.id === 'lethal_slash')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'lethal_slash')).toBe(false);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('2.2. Nhận sát thương không có lá bài vật lý (ảo): Rút 1 bài từ deck an toàn', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: 3,
        targetId: 0,
        target: state.getPlayer(0),
        card: null // Không có bài vật lý
      }, state);

      expect(state.priorityStack.peek().type).toBe('ASK_NAM_QUOC_SON_HA');

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true
      });

      const ltk = state.getPlayer(0);
      expect(ltk.hand.length).toBe(1); // Rút 1 bài từ bộ bài
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('2.3. Từ chối kích hoạt Nam Quốc Sơn Hà: Không rút bài', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const enemySlash = { id: 'lethal_slash', name: 'Chém', type: 'slash' };
      state.discardPile.push(enemySlash);

      globalHeroRegistry.dispatchTrigger('ON_DAMAGED', {
        sourceId: 3,
        targetId: 0,
        target: state.getPlayer(0),
        card: enemySlash
      }, state);

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: false
      });

      const ltk = state.getPlayer(0);
      expect(ltk.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'lethal_slash')).toBe(true);
    });
  });

  describe('3. Tiên Phát (Chúa Công Kỹ - Đồng minh Việt Né giùm)', () => {
    it('3.1. Đồng minh Việt ra lá Né cứu Lý Thường Kiệt thành công', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const enemy = state.getPlayer(3);
      const ltk = state.getPlayer(0);
      const ally1 = state.getPlayer(1);

      const slashCard = { id: 's_enemy', name: 'Chém', type: 'slash' };
      CombatRules.playSlash(state, enemy.id, ltk.id, slashCard);

      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().currentActorId).toBe(0);

      // Lý Thường Kiệt phát động Tiên Phát
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doTienPhat: true
      });

      expect(state.priorityStack.peek().type).toBe('ASK_TIEN_PHAT');
      expect(state.priorityStack.peek().currentActorId).toBe(1); // Đồng minh 1 được hỏi đầu tiên

      // Đồng minh 1 đồng ý ra lá Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        doProvide: true,
        cardId: 'dodge_ally_1'
      });

      // Lý Thường Kiệt không mất máu
      expect(ltk.hp).toBe(4);
      // Đồng minh 1 đã mất lá Né trên tay
      expect(ally1.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'dodge_ally_1')).toBe(true);
      // Stack hoàn toàn được giải phóng
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('3.2. Đồng minh 1 từ chối -> Chuyển lượt hỏi sang Đồng minh 2', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const enemy = state.getPlayer(3);
      const ltk = state.getPlayer(0);
      const ally2 = state.getPlayer(2);

      const slashCard = { id: 's_enemy', name: 'Chém', type: 'slash' };
      CombatRules.playSlash(state, enemy.id, ltk.id, slashCard);

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doTienPhat: true
      });

      expect(state.priorityStack.peek().currentActorId).toBe(1);

      // Đồng minh 1 từ chối
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        responseType: 'skip'
      });

      // Hệ thống tự động chuyển sang hỏi Đồng minh 2
      expect(state.priorityStack.peek().type).toBe('ASK_TIEN_PHAT');
      expect(state.priorityStack.peek().currentActorId).toBe(2);

      // Đồng minh 2 ra Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 2,
        doProvide: true,
        cardId: 'dodge_ally_2'
      });

      expect(ltk.hp).toBe(4);
      expect(ally2.hand.length).toBe(0);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('3.3. Tất cả đồng minh từ chối: Quay trở lại frame ASK_DODGE cho Lý Thường Kiệt', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state, new StateMachine(state));

      const enemy = state.getPlayer(3);
      const ltk = state.getPlayer(0);

      const slashCard = { id: 's_enemy', name: 'Chém', type: 'slash' };
      CombatRules.playSlash(state, enemy.id, ltk.id, slashCard);

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doTienPhat: true
      });

      // Đồng minh 1 từ chối
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        responseType: 'skip'
      });

      // Đồng minh 2 từ chối
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 2,
        responseType: 'skip'
      });

      // Hết đồng minh, frame ASK_TIEN_PHAT bị pop và quay lại ASK_DODGE cho LTK
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().currentActorId).toBe(0);

      // LTK không có Né, nhận sát thương
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        responseType: 'cancel'
      });

      expect(ltk.hp).toBe(3);
    });
  });
});
