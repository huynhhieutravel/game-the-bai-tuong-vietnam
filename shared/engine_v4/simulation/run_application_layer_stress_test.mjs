// @ts-check
import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { CardDeck } from '../cards/CardDeck.js';
import {
  Dispatcher,
  GameAPI,
  createGameState,
  selectDraftHeroes,
  toViewModel
} from '../application/index.js';
import { BotBrain } from '../ai/BotBrain.js';
import { PHASES } from '../../constants/phases.js';

console.log('🚀 Bắt đầu Đại Giả Lập 1.000 Trận Tầng Ứng Dụng (Application Layer & Dispatcher V4)...');

const allHeroes = globalHeroRegistry.getAllHeroes();
const heroesByFaction = {
  lac: allHeroes.filter(h => (h.faction || h.rawFaction || '').toLowerCase().includes('lạc') || (h.rawFaction || '') === 'lac'),
  viet: allHeroes.filter(h => (h.faction || h.rawFaction || '').toLowerCase().includes('việt') || (h.rawFaction || '') === 'viet'),
  ha: allHeroes.filter(h => (h.faction || h.rawFaction || '').toLowerCase().includes('hà') || (h.rawFaction || '') === 'ha'),
  son: allHeroes.filter(h => (h.faction || h.rawFaction || '').toLowerCase().includes('sơn') || (h.rawFaction || '') === 'son')
};

const factions = ['lac', 'viet', 'ha', 'son'];

const stats = {
  totalMatches: 1000,
  completedMatches: 0,
  timeouts: 0,
  deadlocks: 0,
  throttleBlocks: 0,
  errors: [],
  factionWins: { lac: 0, viet: 0, ha: 0, son: 0, draw: 0 },
  totalActions: 0,
  totalResponses: 0,
  totalTricks: 0
};

const startTime = Date.now();

for (let g = 0; g < 1000; g++) {
  try {
    // 1. Khởi tạo Draft State
    let rawState = createGameState(4);

    // Chọn ngẫu nhiên tướng cho 4 người chơi
    const shuffledFactions = [...factions].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 4; i++) {
      const facKey = shuffledFactions[i];
      const pool = heroesByFaction[facKey];
      const h1 = pool[Math.floor(Math.random() * pool.length)];
      let h2 = pool[Math.floor(Math.random() * pool.length)];
      if (h1.id === h2.id) {
        h2 = pool.find(h => h.id !== h1.id) || h1;
      }
      rawState = selectDraftHeroes(rawState, i, h1.id, h2.id);
    }

    // 2. Khởi tạo Dispatcher & GameAPI với Throttle Proxy giống hệt GameProvider.jsx
    const dispatcher = new Dispatcher(rawState);
    const rawAPI = new GameAPI(dispatcher);

    let isSubmittingGlobal = false;
    let throttleWarnings = 0;

    // Dispatcher subscription reset cờ throttle giống GameProvider.jsx
    dispatcher.subscribe((engineState) => {
      isSubmittingGlobal = false;
    });

    const proxiedAPI = new Proxy(rawAPI, {
      get(target, propKey, receiver) {
        const origMethod = target[propKey];
        if (typeof origMethod === 'function') {
          return (...args) => {
            if (propKey === 'respond') {
              return origMethod.apply(target, args);
            }
            const isAuto = args[0] && args[0]._isAuto === true;
            if (!isAuto && isSubmittingGlobal) {
              throttleWarnings++;
              stats.throttleBlocks++;
              return;
            }
            if (!isAuto) {
              isSubmittingGlobal = true;
              setTimeout(() => {
                isSubmittingGlobal = false;
              }, 250);
            }
            return origMethod.apply(target, args);
          };
        }
        return Reflect.get(target, propKey, receiver);
      }
    });

    // 3. Vòng lặp trận đấu mô phỏng tương tác Client + Engine
    let step = 0;
    const maxSteps = 1000;
    let isGameOver = false;

    while (step < maxSteps && !isGameOver) {
      step++;
      const state = dispatcher.state;

      // Kiểm tra Game Over
      const alivePlayers = state.getAlivePlayers();
      if (alivePlayers.length <= 1) {
        isGameOver = true;
        stats.completedMatches++;
        if (alivePlayers.length === 1) {
          const winFac = alivePlayers[0].facKey || (alivePlayers[0].faction || '').toLowerCase();
          if (stats.factionWins[winFac] !== undefined) stats.factionWins[winFac]++;
        } else {
          stats.factionWins.draw++;
        }
        break;
      }

      // 4. Xử lý PriorityStack (Reaction Phase)
      const peeked = state.priorityStack?.peek?.();
      if (peeked) {
        const actorId = peeked.currentActorId ?? peeked.priorityQueue?.[0] ?? peeked.targetId;
        const actor = state.getPlayer(actorId);

        if (!actor || !actor.isAlive) {
          // Actor đã tử trận -> Auto-pass
          proxiedAPI.respond({ playerId: actorId, canceled: true, _isAuto: true });
          stats.totalResponses++;
          continue;
        }

        // Mô phỏng React useEffect auto-skip cho ASK_NEGATE giống ModalContainer.jsx
        if (peeked.type === 'ASK_NEGATE') {
          const hasNegate = actor.hand?.some(c => c.name === 'Hóa Giải' || c.idKey === 'hoa_giai');
          if (!hasNegate) {
            // Auto-skip tức thì ngay sau khi cẩm nang được đánh
            proxiedAPI.respond({ playerId: actorId, doNegate: false, _isAuto: true });
            stats.totalResponses++;
            continue;
          }
        }

        // Quyết định phản ứng qua BotBrain
        const reaction = BotBrain.decideReaction(state, actorId, peeked);

        if (peeked.type === 'ASK_DISCARD') {
          const required = peeked.context?.cardsToDiscard || 1;
          const discardIds = (reaction.discardCardIds && reaction.discardCardIds.length === required)
            ? reaction.discardCardIds
            : (actor.hand || []).slice(0, required).map(c => c.id);
          proxiedAPI.discardCards(actorId, discardIds);
          stats.totalResponses++;
        } else {
          const chosenCard = reaction.dodgeCard || reaction.peachCard || reaction.slashCard || reaction.negateCard || null;
          const chosenCardId = reaction.cardId || chosenCard?.id;
          const isCanceled = reaction.canceled !== undefined 
            ? reaction.canceled 
            : (!chosenCard && !chosenCardId && !reaction.useBagua && !reaction.doUse && !reaction.orderedCards && !reaction.doProvide && !reaction.doReact);

          proxiedAPI.respond({
            playerId: actorId,
            cardId: chosenCardId,
            canceled: isCanceled,
            _isAuto: true,
            ...reaction
          });
          stats.totalResponses++;
        }
        continue;
      }

      // 5. Xử lý Pha Lượt Chơi (Turn Phase)
      const currentTurnId = state.currentTurnPlayerId;
      const currentActor = state.getPlayer(currentTurnId);

      if (!currentActor || !currentActor.isAlive) {
        dispatcher.stateMachine.nextTurn();
        continue;
      }

      const phase = (state.currentPhase || '').toUpperCase();

      if (phase === 'START') {
        dispatcher.stateMachine._runPhaseJudge();
      } else if (phase === 'JUDGE') {
        if (state.priorityStack.isEmpty()) {
          dispatcher.stateMachine._completeJudgePhase();
        }
      } else if (phase === 'DRAW') {
        proxiedAPI.drawPhase(currentTurnId);
        stats.totalActions++;
      } else if (phase === 'ACTION') {
        const action = BotBrain.decideAction(state, currentTurnId);
        if (action && action.type === 'PLAY_CARD') {
          const targetIds = action.targetIds || (action.targetId !== undefined ? [action.targetId] : []);
          proxiedAPI.playCard(currentTurnId, action.cardId, targetIds, {
            virtualCardName: action.virtualCardName,
            asSlash: action.asSlash,
            asChain: action.asChain,
            ...(action.customData || {})
          });
          stats.totalActions++;
          stats.totalTricks++;
        } else if (action && action.type === 'USE_SKILL') {
          proxiedAPI.useSkill(
            currentTurnId,
            action.skillId,
            action.cardIds || [],
            action.targets || [],
            action.options || {}
          );
          stats.totalActions++;
        } else if (action && action.type === 'REVEAL_HERO') {
          proxiedAPI.revealHero(currentTurnId, action.heroIndex);
          stats.totalActions++;
        } else {
          proxiedAPI.endPhase(currentTurnId);
          stats.totalActions++;
        }
      } else if (phase === 'DISCARD') {
        if (state.priorityStack.isEmpty()) {
          dispatcher.stateMachine._checkDiscardLimit(currentActor);
        }
      } else if (phase === 'END') {
        dispatcher.stateMachine.nextTurn();
      }
    }

    if (step >= maxSteps && !isGameOver) {
      stats.timeouts++;
      stats.factionWins.draw++;
    }

    if ((g + 1) % 200 === 0) {
      console.log(`✅ Đã hoàn thành ${g + 1}/1000 trận tầng ứng dụng qua Dispatcher...`);
    }
  } catch (err) {
    stats.errors.push({ game: g, message: err.message, stack: err.stack });
    stats.deadlocks++;
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n🎉 KẾT QUẢ ĐẠI GIẢ LẬP 1.000 TRẬN TẦNG ỨNG DỤNG DISPATCHER (Thời gian: ${duration}s):`);
console.log(`- Trận hoàn thành: ${stats.completedMatches + stats.timeouts}/1000`);
console.log(`- Lỗi Ngoại Lệ / Deadlock: ${stats.deadlocks}`);
console.log(`- Lệnh bị Throttle chặn ngoài ý muốn: ${stats.throttleBlocks}`);
console.log(`- Số trận Timeout (>1000 steps): ${stats.timeouts}`);
console.log(`- Tỉ lệ thắng theo Phe:`, stats.factionWins);
console.log(`- Thống kê tương tác:`);
console.log(`  + Tổng hành động chủ động (Actions): ${stats.totalActions}`);
console.log(`  + Tổng phản hồi ngăn xếp (Responses): ${stats.totalResponses}`);
console.log(`  + Thẻ Cẩm nang thi triển (Tricks): ${stats.totalTricks}`);

if (stats.errors.length > 0) {
  console.error(`\n❌ Danh sách lỗi:`, stats.errors.slice(0, 5));
  process.exit(1);
}
