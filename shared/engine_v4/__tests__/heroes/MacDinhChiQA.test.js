import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Mạc Đĩnh Chi (mac_dinh_chi) — Đối Sứ & Ứng Biến', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Mạc Đĩnh Chi',
          heroId: 'mac_dinh_chi',
          faction: 'ha',
          gender: 'male',
          hp: 3,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: ['doi_su', 'ung_bien'],
          hand: [
            { id: 'red_peach', name: 'Đào Đỏ', suit: 'heart', color: 'red', rank: 5 }
          ]
        },
        {
          id: 1,
          name: 'Kẻ Tấn Công',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: [
            { id: 'atk_card', name: 'Bài Kẻ Địch', suit: 'diamond', rank: 8 }
          ]
        }
      ],
      drawPile: [],
      discardPile: [],
      currentTurnPlayerId: 1,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  describe('1. Đối Sứ (Thu bài của kẻ gây sát thương)', () => {
    it('Khi nhận sát thương từ kẻ có bài, Mạc Đĩnh Chi thu 1 lá bài từ tay kẻ đó', () => {
      const { state, dispatcher } = setupGame();
      const mdc = state.getPlayer(0);
      const enemy = state.getPlayer(1);

      expect(enemy.hand.length).toBe(1);
      expect(mdc.hand.length).toBe(1);

      // Kẻ địch gây 1 sát thương lên Mạc Đĩnh Chi
      CombatRules.applyDamage(state, 1, 0, 1, 'slash');

      expect(state.priorityStack.peek().type).toBe('ASK_DOI_SU');

      // Mạc Đĩnh Chi phản hồi đồng ý dùng Đối Sứ
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(enemy.hand.length).toBe(0);
      expect(mdc.hand.length).toBe(2);
      expect(mdc.hand.some(c => c.id === 'atk_card')).toBe(true);
    });
  });

  describe('2. Ứng Biến (Thay thế lá bài phán xét bằng bất kỳ lá bài nào)', () => {
    it('Mạc Đĩnh Chi dùng lá bài Đỏ trên tay thay thế lá phán xét Sấm Sét nguy hiểm thành công', () => {
      const { state, dispatcher } = setupGame();
      const mdc = state.getPlayer(0);

      // Cài đặt lá Sấm Sét nổ (Bích 5)
      const dangerousJudge = { id: 'j_spade_5', name: 'Bích 5 Nổ Sét', suit: 'spade', rank: 5 };
      const delayedCard = { id: 'lightning_card', name: 'Sấm Sét', idKey: 'sam_set' };

      // Giả lập mở phán xét cẩm nang Sấm Sét
      state.drawPile = [dangerousJudge];
      state.players[1].judgementArea = [delayedCard];

      // Chạy phán xét cho Player 1
      TrickRules.resolveJudgementPhase(state, 1);

      // Mạc Đĩnh Chi nhận được yêu cầu ASK_CHANGE_JUDGE
      expect(state.priorityStack.peek().type).toBe('ASK_CHANGE_JUDGE');
      expect(state.priorityStack.peek().currentActorId).toBe(0);

      // Mạc Đĩnh Chi dùng lá red_peach (Đỏ) để cứu đồng minh/mục tiêu
      const redCard = mdc.hand.find(c => c.id === 'red_peach');
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'red_peach'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      // Lá dangerousJudge vào discardPile
      expect(state.discardPile.some(c => c.id === 'j_spade_5')).toBe(true);
      // Mạc Đĩnh Chi đã mất lá red_peach
      expect(mdc.hand.some(c => c.id === 'red_peach')).toBe(false);
      // Player 1 không bị nổ Sấm Sét (không mất 3 máu, vẫn 4 HP)
      expect(state.getPlayer(1).hp).toBe(4);
    });
  });
});
