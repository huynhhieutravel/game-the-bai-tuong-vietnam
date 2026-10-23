import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('QA Toàn Diện Tướng Hệ Sơn: Đinh Điền (Dinh Dien QA Suite v4)', () => {
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
          name: 'Đinh Điền (P0)',
          heroId: 'dinh_dien',
          mainHeroId: 'dinh_dien',
          subHeroId: null,
          faction: 'son',
          rawFaction: 'son',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          skills: ['phat_toi_dinh_dien', 'quan_co', 'dinh_quoc'],
          hand: [],
          revealedHeroes: [true, false],
          judgementArea: []
        },
        {
          id: 1,
          name: 'Kẻ Tấn Công / Đối Thủ (P1)',
          faction: 'viet',
          rawFaction: 'viet',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          hand: []
        },
        {
          id: 2,
          name: 'Đồng Minh Sơn (P2)',
          faction: 'son',
          rawFaction: 'son',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          hand: [
            { id: 'dodge_p2', type: 'dodge', name: 'Né' },
            { id: 'lightning_p2', idKey: 'sam_set', name: 'Sấm Sét', type: 'delayed_trick' },
            { id: 'slash_p2', type: 'slash', name: 'Chém' }
          ]
        }
      ],
      drawPile: Array.from({ length: 30 }, (_, i) => ({ id: `card_${i}`, name: `Thẻ ${i}` })),
      currentTurnPlayerId: 0,
      phase: PHASES.ACTION
    });

    dispatcher = new DispatcherV4(state);
  });

  it('1. Đăng ký đầy đủ thuộc tính Đinh Điền trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('dinh_dien');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Đinh Điền');
    expect(['son', 'Sơn'].includes(hero.faction) || hero.rawFaction === 'son').toBe(true);
    expect(hero.gender).toBe('male');
    expect(hero.hp).toBe(3);
    expect(hero.maxHp).toBe(3);
    expect(hero.skills.some(s => s.id === 'phat_toi_dinh_dien')).toBe(true);
    expect(hero.skills.some(s => s.id === 'quan_co')).toBe(true);
    expect(hero.skills.some(s => s.id === 'dinh_quoc')).toBe(true);
  });

  describe('2. Phạt Tội (Khi Né thành công, phạt kẻ tấn công mất 1 HP hoặc rút 1 bài)', () => {
    it('2.1. Phạt Tội: Khi Đinh Điền Né thành công, kẻ tấn công bị mất 1 HP', () => {
      const p0 = state.getPlayer(0);
      const attacker = state.getPlayer(1);
      attacker.hp = 3;

      globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p0.id,
        target: p0,
        card: { id: 'dodge_used', type: 'dodge', name: 'Né' }
      }, state);

      expect(attacker.hp).toBe(2); // Kẻ tấn công bị trừ 1 HP
    });

    it('2.2. Phạt Tội: Lựa chọn rút bài thay vì trừ máu kẻ tấn công', () => {
      const p0 = state.getPlayer(0);
      const attacker = state.getPlayer(1);
      attacker.hp = 3;
      p0.hand = [];
      state.drawPile = [{ id: 'card_draw_pt', name: 'Quân Nhu' }];

      globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p0.id,
        target: p0,
        card: { id: 'dodge_used', type: 'dodge', name: 'Né' },
        choice: 'draw'
      }, state);

      expect(attacker.hp).toBe(3); // Không trừ máu
      expect(p0.hand.length).toBe(1); // Đinh Điền rút 1 bài
      expect(p0.hand[0].id).toBe('card_draw_pt');
    });

    it('2.3. Chống nhảy ké: Không kích hoạt Phạt Tội khi người Né thành công là người khác', () => {
      const p2 = state.getPlayer(2);
      const attacker = state.getPlayer(1);
      attacker.hp = 3;

      globalHeroRegistry.dispatchTrigger('ON_DODGE_SUCCESS', {
        sourceId: attacker.id,
        actor: attacker,
        targetId: p2.id,
        target: p2,
        card: { id: 'dodge_used', type: 'dodge', name: 'Né' }
      }, state);

      expect(attacker.hp).toBe(3); // Kẻ tấn công không bị phạt
    });
  });

  describe('3. Quân Cơ (Đánh bài Đen để thay thế bài phán xét trước khi có hiệu lực)', () => {
    it('3.1. Dùng bài Đen (Bích) thay thế bài phán xét thành công', () => {
      const p0 = state.getPlayer(0);
      const blackCard = { id: 'black_spade_2', suit: 'spades', color: 'black', rank: 2, name: 'Bích 2' };
      p0.hand = [blackCard];

      const initialJudgeCard = { id: 'judge_heart_5', suit: 'hearts', color: 'red', rank: 5, name: 'Cơ 5' };
      const delayedCard = { idKey: 'sam_set', name: 'Sấm Sét', type: 'delayed_trick' };

      state.priorityStack.push({
        type: 'ASK_CHANGE_JUDGE',
        sourceId: 0,
        targetId: 0,
        priorityQueue: [0],
        currentActorId: 0,
        context: {
          delayedCard,
          judgeCard: initialJudgeCard,
          candidateIds: [0],
          candidateIndex: 0
        }
      });

      const res = TrickRules.respondChangeJudge(state, 0, blackCard);
      expect(res.changed).toBe(true);
      expect(res.newCard.id).toBe('black_spade_2');
      expect(p0.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'judge_heart_5')).toBe(true);
    });

    it('3.2. Chặn dùng bài Đỏ để thay thế phán xét bằng Quân Cơ', () => {
      const p0 = state.getPlayer(0);
      const redCard = { id: 'red_heart_7', suit: 'hearts', color: 'red', rank: 7, name: 'Cơ 7' };
      p0.hand = [redCard];

      const initialJudgeCard = { id: 'judge_club_3', suit: 'clubs', color: 'black', rank: 3, name: 'Chuồn 3' };
      const delayedCard = { idKey: 'sam_set', name: 'Sấm Sét', type: 'delayed_trick' };

      state.priorityStack.push({
        type: 'ASK_CHANGE_JUDGE',
        sourceId: 0,
        targetId: 0,
        priorityQueue: [0],
        currentActorId: 0,
        context: {
          delayedCard,
          judgeCard: initialJudgeCard,
          candidateIds: [0],
          candidateIndex: 0
        }
      });

      expect(() => {
        TrickRules.respondChangeJudge(state, 0, redCard);
      }).toThrow(/màu Đen/);

      expect(p0.hand.length).toBe(1); // Bài Đỏ vẫn còn nguyên trên tay
    });
  });

  describe('4. Định Quốc (Chúa Công Kỹ: Tướng Sơn có thể đưa lá Né hoặc Sấm Sét cho Đinh Điền)', () => {
    it('4.1. Đồng minh Sơn tự nguyện dâng tặng lá [Né] cho Đinh Điền', () => {
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);
      expect(p2.hand.some(c => c.id === 'dodge_p2')).toBe(true);

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 2, // P2 (tướng Sơn)
        skillId: 'dinh_quoc',
        cardIds: ['dodge_p2']
      });

      // Lá Né đã chuyển từ P2 sang P0
      expect(p2.hand.some(c => c.id === 'dodge_p2')).toBe(false);
      expect(p0.hand.some(c => c.id === 'dodge_p2')).toBe(true);
    });

    it('4.2. Đồng minh Sơn tự nguyện dâng tặng lá [Sấm Sét] cho Đinh Điền', () => {
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 2,
        skillId: 'dinh_quoc',
        cardIds: ['lightning_p2']
      });

      expect(p2.hand.some(c => c.id === 'lightning_p2')).toBe(false);
      expect(p0.hand.some(c => c.id === 'lightning_p2')).toBe(true);
    });

    it('4.3. Chặn đồng minh dâng tặng lá bài không hợp lệ (như [Chém])', () => {
      const p2 = state.getPlayer(2);

      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 2,
          skillId: 'dinh_quoc',
          cardIds: ['slash_p2'],
          throwOnError: true
        });
      }).toThrow(/Chỉ có thể dâng tặng lá \[Né\] hoặc \[Sấm Sét\]/);
    });

    it('4.4. Chặn tướng phe khác (phe Việt) dâng tặng bài qua Định Quốc', () => {
      const p1 = state.getPlayer(1);
      p1.hand = [{ id: 'dodge_viet', type: 'dodge', name: 'Né' }];

      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 1, // Phe Việt
          skillId: 'dinh_quoc',
          cardIds: ['dodge_viet'],
          throwOnError: true
        });
      }).toThrow(/Chỉ có tướng phe Sơn/);
    });

    it('4.5. Đinh Điền kêu gọi qua Modal ASK_DINH_QUOC, đồng minh dâng bài thành công', () => {
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      // Đinh Điền phát động kỹ năng gọi dâng bài
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'dinh_quoc'
      });

      expect(state.priorityStack.peek().type).toBe('ASK_DINH_QUOC');
      expect(state.priorityStack.peek().currentActorId).toBe(2);

      // P2 phản hồi dâng lá Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 2,
        data: {
          cardId: 'dodge_p2'
        }
      });

      expect(p2.hand.some(c => c.id === 'dodge_p2')).toBe(false);
      expect(p0.hand.some(c => c.id === 'dodge_p2')).toBe(true);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });
});
