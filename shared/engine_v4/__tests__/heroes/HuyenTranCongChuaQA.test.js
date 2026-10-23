import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('QA Toàn Diện Tướng Hệ Sơn: Huyền Trân Công Chúa (Huyen Tran Cong Chua QA Suite v4)', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    // Đăng ký tướng hệ Sơn vào globalHeroRegistry
    for (const hero of SON_HEROES) {
      if (!globalHeroRegistry.getHero(hero.id)) {
        globalHeroRegistry.registerHero(hero);
      }
    }

    state = new GameState({
      players: [
        {
          id: 0,
          name: 'Huyền Trân Công Chúa (P0)',
          heroId: 'huyen_tran_cong_chua',
          mainHeroId: 'huyen_tran_cong_chua',
          subHeroId: null,
          faction: 'son',
          rawFaction: 'son',
          gender: 'female',
          hp: 3,
          maxHp: 3,
          skills: ['hoa_than_huyen_tran', 'an_bang'],
          hand: [{ id: 'card_discard_1', name: 'Bỏ' }],
          revealedHeroes: [true, false]
        },
        {
          id: 1,
          name: 'Tướng Nam 1 (P1)',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          hand: [{ id: 'slash_p1', type: 'slash', name: 'Chém P1' }]
        },
        {
          id: 2,
          name: 'Tướng Nam 2 (P2)',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          hand: [{ id: 'slash_p2', type: 'slash', name: 'Chém P2' }]
        },
        {
          id: 3,
          name: 'Nữ Tướng (P3)',
          gender: 'female',
          hp: 3,
          maxHp: 3,
          hand: []
        }
      ],
      drawPile: Array.from({ length: 30 }, (_, i) => ({ id: `card_${i}`, name: `Thẻ ${i}` })),
      currentTurnPlayerId: 0,
      phase: PHASES.ACTION
    });

    dispatcher = new DispatcherV4(state);
  });

  it('1. Đăng ký đầy đủ thuộc tính Huyền Trân Công Chúa trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('huyen_tran_cong_chua');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Huyền Trân Công Chúa');
    expect(['son', 'Sơn'].includes(hero.faction) || hero.rawFaction === 'son').toBe(true);
    expect(hero.gender).toBe('female');
    expect(hero.hp).toBe(3);
    expect(hero.maxHp).toBe(3);
    expect(hero.skills.some(s => s.id === 'hoa_than_huyen_tran')).toBe(true);
    expect(hero.skills.some(s => s.id === 'an_bang')).toBe(true);
  });

  describe('2. Hòa Thân (Bỏ 1 bài ép 2 tướng Nam Quyết Đấu)', () => {
    it('2.1. Trực tiếp: Bỏ 1 bài ép 2 tướng Nam Quyết Đấu thành công', () => {
      const p0 = state.getPlayer(0);

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'hoa_than_huyen_tran',
        cardIds: ['card_discard_1'],
        targets: [1, 2]
      });

      // Lá bài bỏ đã được đưa vào discardPile
      expect(p0.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'card_discard_1')).toBe(true);

      // Quyết Đấu là cẩm nang, mở frame hỏi Hóa Giải (ASK_NEGATE) trước
      const topFrame = state.priorityStack.peek();
      expect(topFrame).toBeDefined();
      expect(topFrame.type).toBe('ASK_NEGATE');

      // Giải quyết bỏ qua Hóa Giải cho tất cả người chơi trong priorityQueue
      while (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_NEGATE') {
        const frame = state.priorityStack.peek();
        dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          playerId: frame.currentActorId,
          data: { isCancelOrSkip: true }
        });
      }

      // Sau khi giải quyết Negate, bước vào trận đấu Quyết Đấu (ASK_SLASH_DUEL) cho targetB (P2)
      const duelFrame = state.priorityStack.peek();
      expect(duelFrame).toBeDefined();
      expect(duelFrame.type).toBe('ASK_SLASH_DUEL');
      expect(duelFrame.targetId).toBe(2);
    });

    it('2.2. Trực tiếp: Chặn nếu 1 trong 2 mục tiêu là nữ giới', () => {
      const p0 = state.getPlayer(0);

      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'hoa_than_huyen_tran',
          cardIds: ['card_discard_1'],
          targets: [1, 3], // P3 là female
          throwOnError: true
        });
      }).toThrow(/tướng Nam/);

      expect(p0.hand.length).toBe(1); // Không mất bài
    });

    it('2.3. Trực tiếp: Giới hạn mỗi lượt 1 lần', () => {
      const p0 = state.getPlayer(0);
      p0.hand.push({ id: 'card_discard_2', name: 'Bỏ 2' });

      // Lần 1 thành công
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'hoa_than_huyen_tran',
        cardIds: ['card_discard_1'],
        targets: [1, 2]
      });

      // Lần 2 trong cùng lượt bị chặn
      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'hoa_than_huyen_tran',
          cardIds: ['card_discard_2'],
          targets: [1, 2],
          throwOnError: true
        });
      }).toThrow(/Mỗi lượt chỉ được sử dụng 1 lần/);
    });

    it('2.4. Modal ASK_HOA_THAN: Chọn 2 tướng Nam và phản hồi cardId phát động Quyết Đấu', () => {
      const p0 = state.getPlayer(0);

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'hoa_than_huyen_tran'
      });

      expect(state.priorityStack.peek().type).toBe('ASK_HOA_THAN');

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: {
          targetA: 1,
          targetB: 2,
          cardId: 'card_discard_1'
        }
      });

      expect(p0.hand.length).toBe(0);
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');

      while (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_NEGATE') {
        const frame = state.priorityStack.peek();
        dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          playerId: frame.currentActorId,
          data: { isCancelOrSkip: true }
        });
      }

      expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');
    });

    it('2.5. Modal ASK_HOA_THAN: Chọn Hủy (skip) an toàn', () => {
      const p0 = state.getPlayer(0);

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'hoa_than_huyen_tran'
      });

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: {
          isCancelOrSkip: true
        }
      });

      expect(p0.hand.length).toBe(1);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });

  describe('3. An Bang (Cuối lượt được rút 1 lá bài)', () => {
    it('3.1. Cuối lượt (END_PHASE): Huyền Trân Công Chúa tự động rút 1 lá bài', () => {
      const p0 = state.getPlayer(0);
      p0.hand = [];
      state.drawPile = [{ id: 'card_an_bang_1', name: 'Lộc An Bang' }];
      state.currentTurnPlayerId = 0;

      const sm = new StateMachine(state);
      sm._runPhaseEnd();

      expect(p0.hand.length).toBe(1);
      expect(p0.hand[0].id).toBe('card_an_bang_1');
    });

    it('3.2. Chống nhảy ké: Không kích hoạt An Bang khi kết thúc lượt của người chơi khác', () => {
      const p0 = state.getPlayer(0);
      p0.hand = [];
      state.drawPile = [{ id: 'card_other_turn', name: 'Thẻ Khác' }];
      state.currentTurnPlayerId = 1;

      globalHeroRegistry.dispatchTrigger('END_PHASE', { sourceId: 1 }, state);

      expect(p0.hand.length).toBe(0); // Huyền Trân không được rút ké
    });
  });
});
