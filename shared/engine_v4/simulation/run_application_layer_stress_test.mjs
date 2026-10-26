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

const MATCH_COUNT = parseInt(process.argv[2] || process.env.MATCHES || '1000', 10);
console.log(`🚀 Bắt đầu Đại Giả Lập ${MATCH_COUNT.toLocaleString()} Trận Tầng Ứng Dụng (Application Layer & Dispatcher V4)...`);

const allHeroes = globalHeroRegistry.getAllHeroes();
const heroesByFaction = {
  lac: allHeroes.filter(h => (h.faction || h.rawFaction || '').toLowerCase().includes('lạc') || (h.rawFaction || '') === 'lac'),
  viet: allHeroes.filter(h => (h.faction || h.rawFaction || '').toLowerCase().includes('việt') || (h.rawFaction || '') === 'viet'),
  ha: allHeroes.filter(h => (h.faction || h.rawFaction || '').toLowerCase().includes('hà') || (h.rawFaction || '') === 'ha'),
  son: allHeroes.filter(h => (h.faction || h.rawFaction || '').toLowerCase().includes('sơn') || (h.rawFaction || '') === 'son')
};

const factions = ['lac', 'viet', 'ha', 'son'];

const stats = {
  totalMatches: MATCH_COUNT,
  completedMatches: 0,
  timeouts: 0,
  deadlocks: 0,
  throttleBlocks: 0,
  errors: [],
  factionWins: { lac: 0, viet: 0, ha: 0, son: 0, draw: 0 },
  totalActions: 0,
  totalResponses: 0,
  totalTricks: 0,
  totalSkillExecutions: 0,
  skillMetrics: {},
  heroDraftCounts: {}
};

const startTime = Date.now();

for (let g = 0; g < MATCH_COUNT; g++) {
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
      stats.heroDraftCounts[h1.id] = (stats.heroDraftCounts[h1.id] || 0) + 1;
      stats.heroDraftCounts[h2.id] = (stats.heroDraftCounts[h2.id] || 0) + 1;
      rawState = selectDraftHeroes(rawState, i, h1.id, h2.id);
    }

    // 2. Khởi tạo Dispatcher & GameAPI với Throttle Proxy giống hệt GameProvider.jsx
    const dispatcher = new Dispatcher(rawState);
    const rawAPI = new GameAPI(dispatcher);

    let isSubmittingGlobal = false;
    let throttleWarnings = 0;

    // Dispatcher subscription reset cờ throttle và map ViewModel giống hệt GameProvider.jsx
    dispatcher.subscribe((engineState) => {
      isSubmittingGlobal = false;
      // KIỂM ĐỊNH TẦNG UI VIEWMODEL: Gọi toViewModel trên từng bước cho cả 4 góc nhìn người chơi (0, 1, 2, 3) kể cả khi còn sống hay đã tử trận
      for (let pId = 0; pId < 4; pId++) {
        toViewModel(engineState, pId);
      }
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
            targetCardId: action.targetCardId,
            zone: action.zone,
            ...(action.customData || {})
          });
          stats.totalActions++;
          stats.totalTricks++;
        } else if (action && action.type === 'USE_SKILL') {
          const sRes = proxiedAPI.useSkill(
            currentTurnId,
            action.skillId,
            action.cardIds || [],
            action.targets || [],
            action.options || {}
          );
          stats.totalActions++;
          stats.totalSkillExecutions++;
          const skey = action.skillId || 'unknown_skill';
          stats.skillMetrics[skey] = (stats.skillMetrics[skey] || 0) + 1;
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

    const progressInterval = Math.max(1, Math.floor(MATCH_COUNT / 5));
    if ((g + 1) % progressInterval === 0 || g + 1 === MATCH_COUNT) {
      console.log(`✅ Đã hoàn thành ${g + 1}/${MATCH_COUNT} trận tầng ứng dụng qua Dispatcher...`);
    }
  } catch (err) {
    stats.errors.push({ game: g, message: err.message, stack: err.stack });
    stats.deadlocks++;
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n🎉 KẾT QUẢ ĐẠI GIẢ LẬP ${MATCH_COUNT.toLocaleString()} TRẬN TẦNG ỨNG DỤNG DISPATCHER (Thời gian: ${duration}s):`);
console.log(`- Trận hoàn thành: ${stats.completedMatches + stats.timeouts}/${MATCH_COUNT}`);
console.log(`- Lỗi Ngoại Lệ / Deadlock: ${stats.deadlocks}`);
console.log(`- Lệnh bị Throttle chặn ngoài ý muốn: ${stats.throttleBlocks}`);
console.log(`- Số trận Timeout (>1000 steps): ${stats.timeouts}`);
console.log(`- Tỉ lệ thắng theo Phe:`, stats.factionWins);
console.log(`- Thống kê tương tác:`);
console.log(`  + Tổng hành động chủ động (Actions): ${stats.totalActions}`);
console.log(`  + Tổng phản hồi ngăn xếp (Responses): ${stats.totalResponses}`);
console.log(`  + Thẻ Cẩm nang thi triển (Tricks): ${stats.totalTricks}`);
console.log(`  + Tổng kích hoạt Kỹ Năng Chủ Động: ${stats.totalSkillExecutions}`);

console.log(`\n📊 BẢNG KIỂM ĐỊNH CHỐNG THOÁI HÓA ÂM THẦM KỸ NĂNG (ANTI-SILENT DEGRADATION AUDIT):`);
const sortedSkills = Object.entries(stats.skillMetrics).sort((a, b) => b[1] - a[1]);
if (sortedSkills.length > 0) {
  console.log(`- Top kỹ năng chủ động kích hoạt nhiều nhất:`);
  sortedSkills.slice(0, 10).forEach(([sId, count], idx) => {
    console.log(`  ${idx + 1}. [${sId}]: ${count} lần`);
  });
} else {
  console.log(`⚠️ Cảnh báo: Không có kỹ năng chủ động nào được ghi nhận!`);
}

if (stats.errors.length > 0) {
  console.error(`\n❌ Danh sách lỗi:`, stats.errors.slice(0, 5));
  process.exit(1);
}
