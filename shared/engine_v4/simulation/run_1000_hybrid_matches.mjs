import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { LAC_HEROES } from '../heroes/lac/index.js';
import { VIET_HEROES } from '../heroes/viet/index.js';
import { HA_HEROES } from '../heroes/ha/index.js';
import { SON_HEROES } from '../heroes/son/index.js';
import { HeadlessRunner } from './HeadlessRunner.js';
import { BotBrain } from '../ai/BotBrain.js';
import { DispatcherV4 } from '../application/DispatcherV4.js';
import { toViewModel } from '../application/GameViewMapperV4.js';
import { StateMachine, PHASES } from '../core/StateMachine.js';
import { CombatRules } from '../rules/CombatRules.js';
import { TrickRules } from '../rules/TrickRules.js';
import { RangeSystem } from '../rules/RangeSystem.js';

console.log('🚀 Bắt đầu Đại Giả Lập 1.000 Trận Đấu Lai (Hybrid Human-Bot: Player 0 = Human qua ViewModel)...');

LAC_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
VIET_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
HA_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
SON_HEROES.forEach(h => globalHeroRegistry.registerHero(h));

const allHeroes = globalHeroRegistry.getAllHeroes();

const stats = {
  totalMatches: 1000,
  completedMatches: 0,
  timeouts: 0,
  errors: [],
  totalHumanReactions: 0,
  totalBotReactions: 0,
  humanReactionTypes: {},
  totalSteps: 0
};

const startTime = Date.now();

for (let match = 0; match < 1000; match++) {
  try {
    const stateMachine = HeadlessRunner.createGame(4);
    const state = stateMachine.state;
    const dispatcher = new DispatcherV4(state);

    // Gán tướng ngẫu nhiên: Player 0 là Human, Players 1..3 là Bot
    state.players.forEach((p, idx) => {
      const hero = allHeroes[(match * 4 + idx) % allHeroes.length];
      p.heroId = hero.id;
      p.isBot = idx !== 0;
      p.name = idx === 0 ? `Bạn [${hero.name}]` : `Bot ${idx} [${hero.name}]`;
      p.skills = (hero.skills || []).map(s => s.id);
      p.revealedHeroes = [true, false];
      p.isRevealed = true;
      p.hp = hero.hp;
      p.maxHp = hero.maxHp;
    });

    stateMachine.startTurn(0);

    let step = 0;
    const maxSteps = 800;

    while (step < maxSteps) {
      step++;

      const alive = state.getAlivePlayers();
      const lordAlive = alive.some(p => p.isLord);
      const rebelsAlive = alive.some(p => p.identity === 'rebel');

      if (!lordAlive || !rebelsAlive || alive.length <= 1 || state.gameOver) {
        break;
      }

      // --- 1. XỬ LÝ PHẢN HỒI (PRIORITY STACK) ---
      if (!state.priorityStack.isEmpty()) {
        const frame = state.priorityStack.peek();
        const expectedActorId = frame.currentActorId ?? 
          frame.context?.currentResponderId ?? 
          frame.priorityQueue?.[0] ?? 
          frame.targetId ?? 
          frame.sourceId;

        // === NẾU LƯỢT PHẢN HỒI LÀ CỦA PLAYER 0 (HUMAN) ===
        if (expectedActorId === 0) {
          stats.totalHumanReactions++;

          // BẢO CHỨNG TẦNG 4: Bắt buộc đọc thông qua toViewModel(state, 0)
          const vm = toViewModel(state, 0);

          if (!vm.waitingForResponse || vm.waitingForResponse.responderId !== 0) {
            throw new Error(
              `[DEADLOCK / VIEWMODEL DESYNC] Trận ${match + 1}, Step ${step}: Frame ${frame.type} chờ Player 0 nhưng toViewModel responderId=${vm.waitingForResponse?.responderId}`
            );
          }

          const req = vm.waitingForResponse;
          const reqType = req.type || 'unknown';
          stats.humanReactionTypes[reqType] = (stats.humanReactionTypes[reqType] || 0) + 1;

          const p0 = state.getPlayer(0);

          if (req.type === 'ask_slash') {
            const slashCard = p0.hand.find(c => c.type === 'slash' || c.name === 'Chém');
            dispatcher.dispatchAction({
              type: 'RESPOND_ACTION',
              payload: {
                playerId: 0,
                responseType: 'react',
                data: {
                  doReact: Boolean(slashCard),
                  cardId: slashCard ? slashCard.id : null
                }
              }
            });
          } else if (req.type === 'ask_dodge') {
            const dodgeCard = p0.hand.find(c => c.type === 'dodge' || c.name === 'Né');
            dispatcher.dispatchAction({
              type: 'RESPOND_ACTION',
              payload: {
                playerId: 0,
                responseType: 'react',
                data: {
                  doReact: Boolean(dodgeCard),
                  cardId: dodgeCard ? dodgeCard.id : null
                }
              }
            });
          } else if (req.type === 'ask_peach') {
            const peachCard = p0.hand.find(c => c.type === 'peach' || c.name === 'Đào');
            dispatcher.dispatchAction({
              type: 'RESPOND_ACTION',
              payload: {
                playerId: 0,
                responseType: 'react',
                data: {
                  cardId: peachCard ? peachCard.id : null,
                  canceled: !peachCard
                }
              }
            });
          } else if (req.type === 'ask_negate') {
            const negateCard = p0.hand.find(c => c.name === 'Hóa Giải' || c.idKey === 'hoa_giai');
            dispatcher.dispatchAction({
              type: 'RESPOND_ACTION',
              payload: {
                playerId: 0,
                responseType: 'react',
                data: {
                  doNegate: Boolean(negateCard),
                  cardId: negateCard ? negateCard.id : null
                }
              }
            });
          } else if (req.type === 'discard_phase') {
            const amount = req.amount || req.cardsToDiscard || 1;
            const discardIds = p0.hand.slice(0, amount).map(c => c.id);
            dispatcher.dispatchAction({
              type: 'DISCARD_CARDS',
              payload: { playerId: 0, cardIds: discardIds }
            });
          } else {
            dispatcher.dispatchAction({
              type: 'RESPOND_ACTION',
              payload: {
                playerId: 0,
                responseType: 'react',
                data: { canceled: true, doUse: false, doReact: false }
              }
            });
          }
          continue;
        }

        // === NẾU LƯỢT PHẢN HỒI LÀ CỦA BOT (1, 2, 3) ===
        stats.totalBotReactions++;
        const reaction = BotBrain.decideReaction(state, expectedActorId, frame);

        if (frame.type === 'ASK_DODGE') {
          CombatRules.respondDodge(state, expectedActorId, reaction.dodgeCard);
        } else if (frame.type === 'ASK_PEACH') {
          CombatRules.respondPeach(state, expectedActorId, reaction.peachCard);
        } else if (frame.type === 'ASK_DISCARD') {
          const bot = state.getPlayer(expectedActorId);
          const required = frame.context?.cardsToDiscard || 1;
          const ids = (bot.hand || []).slice(0, required).map(c => c.id);
          stateMachine.handleDiscard(expectedActorId, ids);
        } else if (frame.type === 'ASK_NEGATE') {
          TrickRules.respondNegate(state, expectedActorId, reaction.negateCard);
        } else if (frame.type === 'ASK_SLASH_DUEL') {
          TrickRules.respondDuel(state, expectedActorId, reaction.slashCard);
        } else {
          state.priorityStack.pop();
        }
        continue;
      }

      // --- 2. XỬ LÝ PHA HÀNH ĐỘNG (ACTION PHASE) ---
      if (state.currentPhase === PHASES.ACTION) {
        const currentId = state.currentTurnPlayerId;

        if (currentId === 0) {
          const p0 = state.getPlayer(0);
          const slashCard = p0.hand.find(c => c.type === 'slash' || c.name === 'Chém');
          const opponents = state.getAlivePlayers().filter(p => p.id !== 0);
          const inRangeTarget = slashCard ? opponents.find(opp => RangeSystem.inSlashRange(p0, opp, state.getAlivePlayers(), slashCard)) : null;

          if (slashCard && inRangeTarget && !p0.temporaryFlags?.slashUsedThisTurn) {
            try {
              CombatRules.playSlash(state, 0, inRangeTarget.id, slashCard);
            } catch (_) {
              stateMachine.endActionPhase();
            }
          } else {
            stateMachine.endActionPhase();
          }
          continue;
        }

        // Lượt của Bot
        const action = BotBrain.decideAction(state, currentId);
        if (action.type === 'PLAY_CARD') {
          const bot = state.getPlayer(currentId);
          const card = (bot.hand || []).find(c => c.id === action.cardId);
          if (card && card.type === 'slash' && action.targetId !== undefined) {
            const botTarget = state.getPlayer(action.targetId);
            if (botTarget && RangeSystem.inSlashRange(bot, botTarget, state.getAlivePlayers(), card)) {
              try {
                CombatRules.playSlash(state, currentId, action.targetId, card);
              } catch (_) {
                stateMachine.endActionPhase();
              }
            } else {
              stateMachine.endActionPhase();
            }
          } else {
            stateMachine.endActionPhase();
          }
        } else {
          stateMachine.endActionPhase();
        }
        continue;
      }

      // --- 3. XỬ LÝ PHA BỎ BÀI (DISCARD PHASE) ---
      if (state.currentPhase === PHASES.DISCARD) {
        stateMachine._runPhaseDiscard();
      }
    }

    stats.completedMatches++;
    stats.totalSteps += step;
    if (step >= maxSteps) {
      stats.timeouts++;
    }

    if ((match + 1) % 200 === 0) {
      console.log(`✅ Đã hoàn thành ${match + 1}/1000 trận mô phỏng Lai (Player 0 = Human qua ViewModel)...`);
    }
  } catch (err) {
    stats.errors.push({ match, error: err.message, stack: err.stack });
    console.error(`❌ Lỗi tại trận ${match}:`, err.message);
  }
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n🎉 KẾT QUẢ MÔ PHỎNG 1.000 TRẬN ĐẤU LAI (Thời gian: ${elapsedSec}s):`);
console.log(`- Trận hoàn thành hợp lệ: ${stats.completedMatches}/1000`);
console.log(`- Số lỗi ViewModel Contract / Deadlock: ${stats.errors.length}`);
console.log(`- Tổng phản xạ của Người chơi 0 (qua ViewModel): ${stats.totalHumanReactions}`);
console.log(`- Chi tiết loại phản xạ của Người chơi 0:`, stats.humanReactionTypes);
console.log(`- Tổng phản xạ của Bot: ${stats.totalBotReactions}`);
console.log(`- Số trận Timeout (>800 steps): ${stats.timeouts}`);

if (stats.errors.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
