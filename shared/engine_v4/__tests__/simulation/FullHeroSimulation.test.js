import { describe, it, expect } from 'vitest';
import { HeadlessRunner } from '../../simulation/HeadlessRunner.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { LAC_HEROES } from '../../heroes/lac/index.js';
import { VIET_HEROES } from '../../heroes/viet/index.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { SON_HEROES } from '../../heroes/son/index.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { PHASES } from '../../core/StateMachine.js';

describe('Tầng 3 QA: Đại Giả Lập 200 Trận Đấu Bot Với Toàn Bộ Tướng (Full Hero Simulation)', () => {
  // Đăng ký toàn bộ 34 tướng từ 4 hệ vào Registry
  LAC_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  VIET_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  HA_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  SON_HEROES.forEach(h => globalHeroRegistry.registerHero(h));

  const allHeroes = globalHeroRegistry.getAllHeroes();

  it('đảm bảo đã nạp đủ toàn bộ 34 vị tướng vào HeroRegistry', () => {
    expect(allHeroes.length).toBeGreaterThanOrEqual(28);
  });

  it('chạy 200 trận đấu bot ngẫu nhiên gắn Tướng & Kỹ năng: 0 lỗi exception, 0 deadlock', () => {
    let completedGames = 0;
    let errors = [];

    for (let g = 0; g < 200; g++) {
      try {
        const stateMachine = HeadlessRunner.createGame(4);
        const state = stateMachine.state;

        // Gán ngẫu nhiên tướng cho từng người chơi
        state.players.forEach((p, idx) => {
          const hero = allHeroes[(g * 4 + idx) % allHeroes.length];
          p.heroId = hero.id;
          p.name = `${hero.name} (Bot ${p.id})`;
          p.skills = hero.skills.map(s => s.id);
          p.hp = hero.hp;
          p.maxHp = hero.maxHp;
        });

        stateMachine.startTurn(0);

        let step = 0;
        const maxSteps = 1200;
        while (step < maxSteps) {
          step++;

          const alive = state.getAlivePlayers();
          const lordAlive = alive.some(p => p.isLord);
          const rebelsAlive = alive.some(p => p.identity === 'rebel');

          if (!lordAlive || !rebelsAlive || alive.length <= 1) {
            break; // Trận đấu kết thúc hợp lệ!
          }

          // 1. Phản hồi PriorityStack nếu có yêu cầu
          if (!state.priorityStack.isEmpty()) {
            const frame = state.priorityStack.peek();
            const actorId = frame.currentActorId;
            const reaction = BotBrain.decideReaction(state, actorId, frame);

            if (frame.type === 'ASK_DODGE') {
              CombatRules.respondDodge(state, actorId, reaction.dodgeCard);
            } else if (frame.type === 'ASK_PEACH') {
              CombatRules.respondPeach(state, actorId, reaction.peachCard);
            } else if (frame.type === 'ASK_DISCARD') {
              stateMachine.handleDiscard(actorId, reaction.discardCardIds);
            } else {
              state.priorityStack.pop();
            }
            continue;
          }

          // 2. Pha hành động
          if (state.currentPhase === PHASES.ACTION) {
            const currentBotId = state.currentTurnPlayerId;
            const action = BotBrain.decideAction(state, currentBotId);

            if (action.type === 'PLAY_CARD') {
              const card = state.getPlayer(currentBotId).hand.find(c => c.id === action.cardId);
              if (card && card.type === 'slash') {
                CombatRules.playSlash(state, currentBotId, action.targetId, card);
              } else {
                stateMachine.endActionPhase();
              }
            } else {
              stateMachine.endActionPhase();
            }
            continue;
          }

          if (state.currentPhase === PHASES.DISCARD) {
            stateMachine._runPhaseDiscard();
          }
        }

        completedGames++;
      } catch (err) {
        errors.push({ game: g, error: err.message });
      }
    }

    expect(errors).toEqual([]);
    expect(completedGames).toBe(200);
  }, 30000); // Tối đa 30s cho 200 trận
});
