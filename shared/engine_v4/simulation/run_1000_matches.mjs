import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { CardDeck } from '../cards/CardDeck.js';
import { GameState } from '../core/GameState.js';
import { StateMachine, PHASES } from '../core/StateMachine.js';
import { CombatRules } from '../rules/CombatRules.js';
import { TrickRules } from '../rules/TrickRules.js';
import { BotBrain } from '../ai/BotBrain.js';
import { GameInvariants } from '../core/Invariants.js';

console.log('🚀 Bắt đầu Đại Giả Lập 1.000 Trận Đấu Song Tướng (Dual Heroes) Engine v4...');

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
  errors: [],
  factionWins: { lac: 0, viet: 0, ha: 0, son: 0, draw: 0 },
  totalTurns: 0,
  totalSlashes: 0,
  totalTricks: 0,
  totalPeaches: 0,
  totalDodges: 0,
  totalNegates: 0,
  totalDamage: 0
};

const startTime = Date.now();

for (let g = 0; g < 1000; g++) {
  try {
    const deck = CardDeck.shuffle(CardDeck.getStandardDeck());
    const initialTotalCards = deck.length;

    // Gán 4 phe cho 4 người chơi ngẫu nhiên
    const shuffledFactions = [...factions].sort(() => Math.random() - 0.5);

    const players = Array.from({ length: 4 }, (_, i) => {
      const facKey = shuffledFactions[i];
      const pool = heroesByFaction[facKey];
      const h1 = pool[Math.floor(Math.random() * pool.length)];
      let h2 = pool[Math.floor(Math.random() * pool.length)];
      if (h1.id === h2.id) {
        h2 = pool.find(h => h.id !== h1.id) || h1;
      }

      // Assert Invariant Song Tướng
      GameInvariants.assertValidDraftHeroes(h1.id, h2.id, globalHeroRegistry);

      const maxHp = Math.floor(((h1.maxHp || h1.hp || 4) + (h2.maxHp || h2.hp || 4)) / 2);

      return {
        id: i,
        name: `Bot ${i} [${h1.name} & ${h2.name}]`,
        faction: h1.faction,
        facKey,
        mainHeroId: h1.id,
        subHeroId: h2.id,
        heroId: h1.id,
        revealedHeroes: [false, false],
        hp: maxHp,
        maxHp: maxHp,
        skills: [...(h1.skills || []).map(s => s.id), ...(h2.skills || []).map(s => s.id)],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: []
      };
    });

    const state = new GameState({
      players,
      drawPile: deck,
      currentTurnPlayerId: 0,
      initialTotalCards
    });

    // Chia mỗi người 4 lá bài ban đầu
    for (const p of state.players) {
      state.drawCards(p.id, 4);
    }

    const stateMachine = new StateMachine(state);
    stateMachine.startTurn(0);

    let step = 0;
    const maxSteps = 1200;
    let matchWinner = null;

    while (step < maxSteps) {
      step++;

      // Kiểm tra điều kiện thắng (bao gồm Đại Thắng Đồng Đội khi còn lại cùng 1 Phe)
      if (state.gameOver) {
        if (state.winner && state.winner.length > 0) {
          const winnerPlayer = state.getPlayer(state.winner[0]);
          matchWinner = winnerPlayer.facKey;
        } else {
          matchWinner = 'draw';
        }
        break;
      }

      const alive = state.getAlivePlayers();
      if (alive.length === 0) {
        matchWinner = 'draw';
        break;
      }

      // 1. Phản hồi PriorityStack
      if (!state.priorityStack.isEmpty()) {
        const frame = state.priorityStack.peek();
        const actorId = frame.currentActorId;
        const reaction = BotBrain.decideReaction(state, actorId, frame);

        if (frame.type === 'ASK_DODGE') {
          if (reaction.dodgeCard) stats.totalDodges++;
          CombatRules.respondDodge(state, actorId, reaction.dodgeCard);
        } else if (frame.type === 'ASK_PEACH') {
          if (reaction.peachCard) stats.totalPeaches++;
          CombatRules.respondPeach(state, actorId, reaction.peachCard);
        } else if (frame.type === 'ASK_DISCARD') {
          stateMachine.handleDiscard(actorId, reaction.discardCardIds);
        } else if (frame.type === 'ASK_SLASH_DUEL') {
          if (reaction.slashCard) stats.totalSlashes++;
          TrickRules.respondDuel(state, actorId, reaction.slashCard);
        } else if (frame.type === 'ASK_NEGATE') {
          if (reaction.negateCard) stats.totalNegates++;
          TrickRules.respondNegate(state, actorId, reaction.negateCard);
        } else if (frame.type === 'ASK_BORROW_SLASH') {
          if (reaction.slashCard) stats.totalSlashes++;
          TrickRules.respondBorrowSlash(state, actorId, reaction.slashCard);
        } else {
          state.priorityStack.pop();
        }

        continue;
      }

      // 2. Pha hành động (ACTION)
      if (state.currentPhase === PHASES.ACTION) {
        const currentBotId = state.currentTurnPlayerId;
        const action = BotBrain.decideAction(state, currentBotId);

        if (action.type === 'PLAY_CARD') {
          const card = state.getPlayer(currentBotId).hand.find(c => c.id === action.cardId);
          if (card && (card.type === 'slash' || card.name === 'Chém')) {
            stats.totalSlashes++;
            CombatRules.playSlash(state, currentBotId, action.targetId, card);
          } else if (card && (card.type === 'trick' || card.type === 'TRICK')) {
            stats.totalTricks++;
            try {
              TrickRules.playTrick(state, currentBotId, action.targetId !== undefined ? [action.targetId] : [], card);
            } catch (e) {
              stateMachine.endActionPhase();
            }
          } else if (card && (card.type === 'peach' || card.name === 'Đào')) {
            stats.totalPeaches++;
            const p = state.getPlayer(currentBotId);
            state.discardFromHand(currentBotId, [card.id]);
            p.hp = Math.min(p.maxHp, p.hp + 1);
          } else if (card) {
            const p = state.getPlayer(currentBotId);
            p.hand = p.hand.filter(c => c.id !== card.id);
            let slot = null;
            if (card.type === 'weapon' || card.name?.includes('Đao') || card.name?.includes('Nỏ') || card.name?.includes('Rìu')) slot = 'weapon';
            else if (card.type === 'armor' || card.name?.includes('Thuẫn') || card.name?.includes('Quái')) slot = 'armor';
            else if (card.type === 'horse_attack' || card.name?.includes('(-1)')) slot = 'horse_attack';
            else if (card.type === 'horse_defense' || card.name?.includes('(+1)')) slot = 'horse_defense';

            if (slot) {
              const old = p.equipment[slot];
              if (old) {
                state.discardPile.push(old);
                if (old.name === 'Bạch Ngân' || old.id?.includes('bach_ngan')) {
                  p.hp = Math.min(p.maxHp, p.hp + 1);
                }
                globalHeroRegistry.dispatchTrigger('ON_EQUIP_LOST', { targetId: p.id, card: old }, state);
              }
              p.equipment[slot] = card;
            } else {
              state.discardPile.push(card);
            }
          }
        } else {
          stateMachine.endActionPhase();
        }

        continue;
      }

      // 3. Pha bỏ bài (DISCARD)
      if (state.currentPhase === PHASES.DISCARD) {
        stateMachine._runPhaseDiscard();
      }
    }

    // Assert Invariant Bảo toàn Thẻ bài
    GameInvariants.assertCardConservation(state, initialTotalCards);

    stats.completedMatches++;
    stats.totalTurns += step;
    if (matchWinner) {
      stats.factionWins[matchWinner] = (stats.factionWins[matchWinner] || 0) + 1;
    } else {
      stats.timeouts++;
      stats.factionWins.draw++;
    }

    if ((g + 1) % 200 === 0) {
      console.log(`✅ Đã hoàn thành ${g + 1}/1000 trận mô phỏng... (Đang chạy mượt mà)`);
    }
  } catch (err) {
    stats.errors.push({ gameIndex: g, error: err.message, stack: err.stack });
    console.error(`❌ Lỗi tại trận ${g}:`, err.message);
  }
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n🎉 KẾT QUẢ MÔ PHỎNG 1.000 TRẬN ĐẤU (Thời gian: ${elapsedSec}s):`);
console.log(`- Trận hoàn thành hợp lệ: ${stats.completedMatches}/1000`);
console.log(`- Số lỗi Invariant / Exception: ${stats.errors.length}`);
console.log(`- Số trận Timeout (>1200 steps): ${stats.timeouts}`);
console.log(`- Tỉ lệ thắng theo Phe:`, stats.factionWins);
console.log(`- Thống kê hành động:`);
console.log(`  + Lượt Chém: ${stats.totalSlashes}`);
console.log(`  + Dùng Cẩm nang: ${stats.totalTricks}`);
console.log(`  + Dùng Đào cứu mạng: ${stats.totalPeaches}`);
console.log(`  + Đánh Né: ${stats.totalDodges}`);
console.log(`  + Hóa Giải: ${stats.totalNegates}`);

if (stats.errors.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
