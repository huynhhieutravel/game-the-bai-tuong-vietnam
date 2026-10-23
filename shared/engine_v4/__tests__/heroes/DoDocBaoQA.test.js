import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('QA Toàn Diện Tướng Hệ Sơn: Đô Đốc Bảo (Do Doc Bao QA Suite v4)', () => {
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
          name: 'Đô Đốc Bảo (P0)',
          heroId: 'do_doc_bao',
          mainHeroId: 'do_doc_bao',
          subHeroId: null,
          faction: 'son',
          rawFaction: 'son',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          skills: ['pha_thanh'],
          hand: [],
          revealedHeroes: [true, false],
          judgementArea: []
        },
        {
          id: 1,
          name: 'Mục Tiêu Quyết Đấu (P1)',
          faction: 'viet',
          rawFaction: 'viet',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          hand: [{ id: 'slash_p1', type: 'slash', name: 'Chém' }]
        }
      ],
      drawPile: [
        { id: 'draw_card_1', name: 'Thẻ Bài 1' },
        { id: 'draw_card_2', name: 'Thẻ Bài 2' },
        { id: 'red_judge_card', suit: 'hearts', color: 'red', name: 'Đào Đỏ' }
      ],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.DRAW
    });

    dispatcher = new DispatcherV4(state);
  });

  it('1. Đăng ký đầy đủ thuộc tính Đô Đốc Bảo trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('do_doc_bao');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Đô đốc Bảo');
    expect(['son', 'Sơn'].includes(hero.faction) || hero.rawFaction === 'son').toBe(true);
    expect(hero.gender).toBe('male');
    expect(hero.hp).toBe(4);
    expect(hero.maxHp).toBe(4);
    expect(hero.skills.some(s => s.id === 'pha_thanh')).toBe(true);
  });

  describe('2. Phá Thành — Pha Rút bài (Phán xét nhận bài thay vì rút 2 bài)', () => {
    it('2.1. Ở Pha Rút bài, hệ thống kích hoạt trigger và đẩy frame ASK_PHA_THANH', () => {
      globalHeroRegistry.dispatchTrigger('DRAW_PHASE', { sourceId: 0 }, state);

      const topFrame = state.priorityStack.peek();
      expect(topFrame).toBeDefined();
      expect(topFrame.type).toBe('ASK_PHA_THANH');
    });

    it('2.2. Phản hồi doJudge: true -> Thu lá phán xét vào tay, đặt cờ opposite color là black', () => {
      const p0 = state.getPlayer(0);

      globalHeroRegistry.dispatchTrigger('DRAW_PHASE', { sourceId: 0 }, state);

      // Phản hồi phán xét nhận bài
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: {
          doJudge: true
        }
      });

      // P0 nhận được lá bài phán xét (red_judge_card)
      expect(p0.hand.length).toBe(1);
      expect(p0.hand[0].id).toBe('red_judge_card');
      expect(p0.temporaryFlags.phaThanhOppositeColor).toBe('black');
    });

    it('2.3. Phản hồi isCancelOrSkip: true -> Bỏ qua phán xét, rút 2 lá bài thông thường', () => {
      const p0 = state.getPlayer(0);

      globalHeroRegistry.dispatchTrigger('DRAW_PHASE', { sourceId: 0 }, state);

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: {
          isCancelOrSkip: true
        }
      });

      // Rút 2 lá bài thông thường (red_judge_card và draw_card_1)
      expect(p0.hand.length).toBe(2);
      expect(p0.temporaryFlags.phaThanhOppositeColor).toBeUndefined();
    });
  });

  describe('3. Phá Thành — Dùng bài khác màu như Quyết Đấu', () => {
    it('3.1. Sau khi phán xét ra bài Đỏ (opposite: black), dùng bài Đen trên tay làm Quyết Đấu thành công', () => {
      const p0 = state.getPlayer(0);
      state.currentPhase = PHASES.ACTION;
      p0.temporaryFlags.phaThanhOppositeColor = 'black';

      const blackCard = { id: 'black_card_1', suit: 'spades', color: 'black', name: 'Lá Bài Bích' };
      p0.hand = [blackCard];

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'pha_thanh',
        cardIds: ['black_card_1'],
        targets: [1]
      });

      // Lá bài Đen đã bị bỏ vào discardPile
      expect(p0.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'black_card_1')).toBe(true);

      // Quyết Đấu mở frame hỏi Hóa Giải (ASK_NEGATE)
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
    });

    it('3.2. Cố tình dùng bài cùng màu (bài Đỏ) khi yêu cầu bài Đen -> bị chặn', () => {
      const p0 = state.getPlayer(0);
      state.currentPhase = PHASES.ACTION;
      p0.temporaryFlags.phaThanhOppositeColor = 'black';

      const redCard = { id: 'red_card_invalid', suit: 'hearts', color: 'red', name: 'Lá Bài Cơ' };
      p0.hand = [redCard];

      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'pha_thanh',
          cardIds: ['red_card_invalid'],
          targets: [1],
          throwOnError: true
        });
      }).toThrow(/Chỉ có thể dùng bài màu Đen/);

      expect(p0.hand.length).toBe(1); // Bài vẫn còn nguyên
    });
  });
});
