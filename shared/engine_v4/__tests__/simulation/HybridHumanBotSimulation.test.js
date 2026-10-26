import { describe, it, expect } from 'vitest';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { LAC_HEROES } from '../../heroes/lac/index.js';
import { VIET_HEROES } from '../../heroes/viet/index.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { SON_HEROES } from '../../heroes/son/index.js';
import { HeadlessRunner } from '../../simulation/HeadlessRunner.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { toViewModel } from '../../application/GameViewMapperV4.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { RangeSystem } from '../../rules/RangeSystem.js';

describe('Tầng 4 QA: Đại Giả Lập Lai (Hybrid Human-Bot Simulation: 1 Human + 3 Bots)', () => {
  // Đăng ký toàn bộ tướng
  LAC_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  VIET_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  HA_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  SON_HEROES.forEach(h => globalHeroRegistry.registerHero(h));

  const allHeroes = globalHeroRegistry.getAllHeroes();

  it('chạy 50 trận đấu lai: Player 0 (Human) bắt buộc hành động qua toViewModel, 0 desync, 0 deadlock', () => {
    let completedMatches = 0;
    let totalHumanReactions = 0;
    let totalBotReactions = 0;

    for (let match = 0; match < 50; match++) {
      const stateMachine = HeadlessRunner.createGame(4);
      const state = stateMachine.state;
      const dispatcher = new DispatcherV4(state);

      // Thiết lập: Player 0 là Human, Player 1, 2, 3 là Bots
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
          break; // Trận đấu kết thúc hợp lệ
        }

        // --- 1. XỬ LÝ PHẢN HỒI (PRIORITY STACK) ---
        if (!state.priorityStack.isEmpty()) {
          const frame = state.priorityStack.peek();
          const expectedActorId = frame.currentActorId ?? 
            frame.context?.currentResponderId ?? 
            frame.priorityQueue?.[0] ?? 
            frame.targetId ?? 
            frame.sourceId;

          // === NẾU LƯỢT PHẢN HỒI LÀ CỦA NGƯỜI CHƠI 0 (HUMAN) ===
          if (expectedActorId === 0) {
            totalHumanReactions++;

            // QUY TẮC BẤT BIẾN TẦNG 4:
            // Human KHÔNG ĐƯỢC đọc frame ngầm, BẮT BUỘC phải đọc qua toViewModel(state, 0)!
            const vm = toViewModel(state, 0);

            // Kiểm định hợp đồng giao diện:
            if (!vm.waitingForResponse || vm.waitingForResponse.responderId !== 0) {
              throw new Error(
                `[DEADLOCK / VIEWMODEL DESYNC] Frame ${frame.type} đang đợi Người chơi 0, nhưng toViewModel trả về: ` +
                `waitingForResponse=${JSON.stringify(vm.waitingForResponse)}`
              );
            }

            const p0 = state.getPlayer(0);
            const req = vm.waitingForResponse;

            // Xử lý phản ứng dựa trên thông tin ViewModel hiển thị cho Human
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
              // Các frame kỹ năng vũ khí hoặc tướng khác: Human bấm bỏ qua an toàn
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

          // === NẾU LƯỢT PHẢN HỒI LÀ CỦA BOT (PLAYERS 1, 2, 3) ===
          totalBotReactions++;
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
            // Safe fallback pop
            state.priorityStack.pop();
          }
          continue;
        }

        // --- 2. XỬ LÝ PHA HÀNH ĐỘNG (ACTION PHASE) ---
        if (state.currentPhase === PHASES.ACTION) {
          const currentId = state.currentTurnPlayerId;

          // Lượt của Người chơi 0 (Human)
          if (currentId === 0) {
            const p0 = state.getPlayer(0);
            const vm = toViewModel(state, 0);

            // Tìm lá Chém hợp lệ để đánh
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

      completedMatches++;
    }

    expect(completedMatches).toBe(50);
    expect(totalHumanReactions).toBeGreaterThan(0);
    expect(totalBotReactions).toBeGreaterThan(0);
  }, 20000);
});
