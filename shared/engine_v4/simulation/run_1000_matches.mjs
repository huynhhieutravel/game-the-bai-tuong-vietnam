import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { CardDeck } from '../cards/CardDeck.js';
import { GameState } from '../core/GameState.js';
import { StateMachine, PHASES } from '../core/StateMachine.js';
import { CombatRules } from '../rules/CombatRules.js';
import { TrickRules } from '../rules/TrickRules.js';
import { BotBrain } from '../ai/BotBrain.js';
import { GameInvariants } from '../core/Invariants.js';
import { getCardSubType } from '../../data/gameData.js';
import { isEquip } from '../../utils/translationHelper.js';

const MATCH_COUNT = parseInt(process.argv[2] || process.env.MATCHES || '1000', 10);
console.log(`🚀 Bắt đầu Đại Giả Lập ${MATCH_COUNT.toLocaleString()} Trận Đấu Song Tướng (Dual Heroes) Engine v4...`);

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

for (let g = 0; g < MATCH_COUNT; g++) {
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

      const prevCardLocations = new Map();
      state.drawPile?.forEach(c => c && prevCardLocations.set(c.id, 'drawPile'));
      state.discardPile?.forEach(c => c && prevCardLocations.set(c.id, 'discardPile'));
      for (const p of state.players) {
        p.hand?.forEach(c => c && prevCardLocations.set(c.id, `player_${p.id}_hand`));
        if (p.equipment) {
          for (const s in p.equipment) {
            if (p.equipment[s]) prevCardLocations.set(p.equipment[s].id, `player_${p.id}_equip_${s}`);
          }
        }
        p.judgementArea?.forEach(c => c && prevCardLocations.set(c.id, `player_${p.id}_judge`));
        p.trungCards?.forEach(c => c && prevCardLocations.set(c.id, `player_${p.id}_trung`));
      }

      const assertAllCards = (contextLabel) => {
        const present = new Set();
        state.drawPile?.forEach(c => c && present.add(c.id));
        state.discardPile?.forEach(c => c && present.add(c.id));
        for (const p of state.players) {
          p.hand?.forEach(c => c && present.add(c.id));
          if (p.equipment) {
            Object.values(p.equipment).forEach(c => c && present.add(c.id));
          }
          p.judgementArea?.forEach(c => c && present.add(c.id));
          p.trungCards?.forEach(c => c && present.add(c.id));
        }
        if (state.priorityStack?.stack) {
          for (const frame of state.priorityStack.stack) {
            if (frame.context?.card) present.add(frame.context.card.id);
            if (frame.context?.judgeCard) present.add(frame.context.judgeCard.id);
            if (frame.context?.delayedCard) present.add(frame.context.delayedCard.id);
            if (frame.context?.revealedCard) present.add(frame.context.revealedCard.id);
            if (Array.isArray(frame.context?.drawnCards)) {
              frame.context.drawnCards.forEach(c => c && present.add(c.id));
            }
          }
        }
        const missing = deck.filter(c => !present.has(c.id));
        if (missing.length > 0) {
          console.error(`💥 [STEP ${step} - ${contextLabel}] Missing:`, missing.map(c => `${c.id} (${c.name})`));
          console.error(`💥 Previous location:`, missing.map(c => `${c.id} was at: ${prevCardLocations.get(c.id)}`));
          console.error(`💥 Last 3 logs:`, state.logs.slice(-3).map(l => l.message));
          throw new Error(`[INVARIANT_VIOLATION] Lệch tại ${contextLabel}!`);
        }
      };

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
        } else if (frame.type === 'ASK_SLASH_RESPONSE') {
          const slashCard = state.getPlayer(actorId).hand?.find(c => c.type === 'slash' || c.name === 'Chém');
          if (slashCard) stats.totalSlashes++;
          TrickRules.respondBarbarian(state, actorId, slashCard || null);
        } else if (frame.type === 'ASK_NEGATE') {
          if (reaction.negateCard) stats.totalNegates++;
          TrickRules.respondNegate(state, actorId, reaction.negateCard);
        } else if (frame.type === 'ASK_BORROW_SLASH') {
          if (reaction.slashCard) stats.totalSlashes++;
          TrickRules.respondBorrowSlash(state, actorId, reaction.slashCard);
        } else if (frame.type === 'ASK_CHANGE_JUDGE') {
          TrickRules.respondChangeJudge(state, actorId, null);
          if (state.currentPhase === PHASES.JUDGE && state.priorityStack.isEmpty()) {
            stateMachine._completeJudgePhase();
          }
        } else if (frame.type === 'ASK_BOC_TRAM_TRUNG_SLASH') {
          CombatRules.respondBocTramTrungSlash(state, actorId, reaction.slashCard || null);
        } else if (frame.type === 'ASK_TIEN_PHAT') {
          CombatRules.respondTienPhat(state, actorId, reaction.dodgeCard || null);
        } else if (frame.type === 'ASK_HAU_VIEN') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          p.hp = Math.min(p.maxHp, p.hp + 1);
        } else if (frame.type === 'ASK_HOACONG_REVEAL') {
          const p = state.getPlayer(actorId);
          const card = p.hand && p.hand.length > 0 ? p.hand[0] : null;
          TrickRules.respondHoaCongReveal(state, actorId, card);
        } else if (frame.type === 'ASK_HOACONG_DISCARD') {
          const p = state.getPlayer(actorId);
          const { revealedCard } = frame.context;
          const matchCard = p.hand?.find(c => (c.suit && c.suit === revealedCard?.suit) || (c.color && c.color === revealedCard?.color));
          TrickRules.respondHoaCongDiscard(state, actorId, matchCard || null);
        } else if (frame.type === 'ASK_TRE_NGA_DISCARD') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const matchCard = p.hand?.find(c => c.suit === frame.context?.judgeSuit);
          if (matchCard) {
            state.discardFromHand(actorId, [matchCard.id]);
          } else if (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_DODGE') {
            CombatRules.respondDodge(state, actorId, null);
          }
        } else if (frame.type === 'ASK_DOAT_SAO') {
          state.priorityStack.pop();
          state.drawCards(actorId, 4);
          const p = state.getPlayer(actorId);
          if (p.hand && p.hand.length > 0) {
            state.priorityStack.push({
              type: 'ASK_DOAT_SAO_DISCARD',
              sourceId: actorId,
              targetId: actorId,
              currentActorId: actorId,
              priorityQueue: [actorId]
            });
          }
        } else if (frame.type === 'ASK_DOAT_SAO_DISCARD') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          if (p.hand && p.hand.length > 0) {
            state.discardFromHand(actorId, [p.hand[0].id]);
          }
          if (state.currentPhase === PHASES.END && state.priorityStack.isEmpty()) {
            stateMachine.nextTurn();
          }
        } else if (frame.type === 'ASK_HIEN_HAU') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          p.temporaryFlags = p.temporaryFlags || {};
          p.temporaryFlags.hienHauAttempted = true;
          CombatRules.applyDamage(
            state,
            frame.context.attackerId,
            actorId,
            frame.context.damageAmount,
            frame.context.reason,
            frame.context.isChainedPropagation
          );
          p.temporaryFlags.hienHauAttempted = false;
        } else if (frame.type === 'ASK_KHOAN_DAN') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const deficit = Math.max(0, Math.min(5, p.maxHp) - (p.hand ? p.hand.length : 0));
          if (deficit > 0) {
            state.drawCards(actorId, deficit);
          }
        } else if (frame.type === 'ASK_THAT_TRAM_SO_PUNISH') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          if (p.hand && p.hand.length >= 2) {
            state.discardFromHand(actorId, [p.hand[0].id, p.hand[1].id]);
          } else {
            CombatRules.applyDamage(state, frame.context.sourceId, actorId, 1, 'that_tram_so');
          }
        } else if (frame.type === 'ASK_DOI_SU') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const target = state.getPlayer(frame.targetId);
          if (target && target.hand && target.hand.length > 0) {
            p.hand.push(target.hand.pop());
          }
        } else if (frame.type === 'ASK_HOA_NGHI') {
          state.priorityStack.pop();
        } else if (frame.type === 'ASK_DA_TRACH') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          p.temporaryFlags = p.temporaryFlags || {};
          p.temporaryFlags.skipDrawPhase = true;
          const enemies = state.getAlivePlayers().filter(o => o.id !== actorId && o.hand && o.hand.length > 0);
          for (const target of enemies.slice(0, 2)) {
            p.hand.push(target.hand.pop());
          }
          if (state.currentPhase === PHASES.DRAW && state.priorityStack.isEmpty()) {
            stateMachine._completeDrawPhase();
          }
        } else if (frame.type === 'ASK_KHOI_NGHIA') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          p.temporaryFlags = p.temporaryFlags || {};
          p.temporaryFlags.drawCardCount = 1;
          p.temporaryFlags.bonusDamage = 1;
          if (state.currentPhase === PHASES.DRAW && state.priorityStack.isEmpty()) {
            stateMachine._completeDrawPhase();
          }
        } else if (frame.type === 'ASK_DUONG_QUAN_1') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const targets = (frame.context?.validTargets || []).filter(tid => {
            const t = state.getPlayer(tid);
            return t && t.isAlive && (!globalHeroRegistry.hasSkill(t, 'dam_bac', false) || (t.hand && t.hand.length > 0));
          });
          if (targets.length > 0 && Math.random() < 0.5) {
            CombatRules.playSlash(state, actorId, targets[0], { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
            if (state.currentPhase === PHASES.BEGIN && state.priorityStack.isEmpty()) {
              stateMachine._runPhaseAction();
            }
          } else {
            if (state.currentPhase === PHASES.BEGIN && state.priorityStack.isEmpty()) {
              stateMachine._completeBeginPhase();
            }
          }
        } else if (frame.type === 'ASK_DUONG_QUAN_3') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const targets = (frame.context?.validTargets || []).filter(tid => {
            const t = state.getPlayer(tid);
            return t && t.isAlive && (!globalHeroRegistry.hasSkill(t, 'dam_bac', false) || (t.hand && t.hand.length > 0));
          });
          const excess = (p?.hand?.length || 0) - (p?.hp || 0);
          if (targets.length > 0 && excess >= 2 && p?.isFaceUp) {
            p.isFaceUp = false;
            CombatRules.playSlash(state, actorId, targets[0], { name: 'Chém', virtual: true, infiniteRange: true }, { infiniteRange: true });
            if (state.currentPhase === PHASES.DISCARD && state.priorityStack.isEmpty()) {
              stateMachine._runPhaseEnd();
            }
          } else {
            if (state.currentPhase === PHASES.DISCARD && state.priorityStack.isEmpty()) {
              stateMachine._checkDiscardLimit(p);
            }
          }
        } else if (frame.type === 'ASK_PHA_THANH') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const judgeCard = state.drawCardFromDeck();
          if (judgeCard) {
            p.hand.push(judgeCard);
            p.temporaryFlags = p.temporaryFlags || {};
            p.temporaryFlags.skipDrawPhase = true;
            p.temporaryFlags.phaThanhOppositeColor = judgeCard.color === 'red' ? 'black' : 'red';
          }
          if (state.currentPhase === PHASES.DRAW && state.priorityStack.isEmpty()) {
            stateMachine._completeDrawPhase();
          }
        } else if (frame.type === 'ASK_NAM_QUOC_SON_HA') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          state.drawCards(actorId, 1);
          const dmgCard = frame.context?.damageCard;
          if (dmgCard && dmgCard.id && !dmgCard.virtual) {
            const idx = state.discardPile.findIndex(c => c.id === dmgCard.id);
            if (idx !== -1) {
              const [retrieved] = state.discardPile.splice(idx, 1);
              p.hand.push(retrieved);
            }
          }
        } else if (frame.type === 'ASK_TIEN_PHONG') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          if (p && p.hp > 1) {
            p.hp -= 1;
            const target = state.getPlayer(frame.targetId);
            if (target && target.isAlive) {
              CombatRules.applyDamage(state, actorId, target.id, 1, 'tien_phong');
            }
          }
        } else if (frame.type === 'ASK_SUIT') {
          state.priorityStack.pop();
          const asker = state.getPlayer(frame.context?.sourceId);
          const p = state.getPlayer(actorId);
          if (asker && asker.hand && asker.hand.length > 0) {
            const card = asker.hand.pop();
            p.hand.push(card);
            if (Math.random() > 0.25) {
              CombatRules.applyDamage(state, asker.id, actorId, 1, 'tam_cong');
            }
          }
        } else if (frame.type === 'ASK_HO_CHU') {
          state.priorityStack.pop();
          const card = state.drawCardFromDeck();
          if (card) {
            const p = state.getPlayer(actorId);
            p.trungCards = p.trungCards || [];
            const isDuplicate = p.trungCards.some(c => c.rank === card.rank);
            if (!isDuplicate) {
              p.trungCards.push(card);
              p.hp = Math.max(1, p.hp);
              if (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_PEACH') {
                state.priorityStack.pop();
              }
            } else {
              state.discardPile.push(card);
            }
          }
        } else if (frame.type === 'ASK_BANH_CHUNG') {
          state.priorityStack.pop();
          if (state.currentPhase === PHASES.BEGIN && state.priorityStack.isEmpty()) {
            stateMachine._completeBeginPhase();
          }
        } else if (frame.type === 'ASK_XA_THAN') {
          const p = state.getPlayer(actorId);
          const validTargets = frame.context?.validTargets || [];
          if (p && p.hand && p.hand.length > 0 && validTargets.length > 0) {
            CombatRules.respondXaThan(state, actorId, p.hand[0], validTargets[0]);
          } else {
            CombatRules.respondXaThan(state, actorId, null, null);
          }
        } else if (frame.type === 'ASK_VAN_DON') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const target = state.getPlayer(frame.targetId);
          if (p && target && p.hand?.length > 0 && target.hand?.length > 0) {
            const myCard = p.hand[0];
            const oppCard = target.hand[0];
            state.moveCard(myCard.id, { type: 'hand', playerId: actorId }, { type: 'discardPile' });
            state.moveCard(oppCard.id, { type: 'hand', playerId: target.id }, { type: 'discardPile' });

            const rankToNum = (r) => {
              if (typeof r === 'number') return r;
              if (!r) return 1;
              const s = String(r).trim().toUpperCase();
              if (s === 'A') return 1;
              if (s === 'J') return 11;
              if (s === 'Q') return 12;
              if (s === 'K') return 13;
              const n = parseInt(s, 10);
              return isNaN(n) ? 1 : n;
            };

            const myRank = rankToNum(myCard.rank);
            const oppRank = rankToNum(oppCard.rank);

            p.temporaryFlags = p.temporaryFlags || {};
            if (myRank > oppRank) {
              p.temporaryFlags.vanDonWin = true;
            } else {
              p.temporaryFlags.vanDonLose = true;
            }
          }
        } else if (frame.type === 'ASK_DUYEN_THO') {
          state.priorityStack.pop();
          const p = state.getPlayer(actorId);
          const validTargets = frame.context?.validTargets || [];
          if (p && p.hand && p.hand.length >= 2 && validTargets.length > 0) {
            state.discardFromHand(actorId, [p.hand[0].id, p.hand[1].id]);
            if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 1);
            const target = state.getPlayer(validTargets[0]);
            if (target && target.isAlive && target.hp < target.maxHp) {
              target.hp = Math.min(target.maxHp, target.hp + 1);
            }
            p.skillUsage = p.skillUsage || {};
            p.skillUsage.duyen_tho = p.skillUsage.duyen_tho || {};
            p.skillUsage.duyen_tho.usedThisTurn = true;
          }
        } else if (frame.type === 'ASK_WEAPON_SKILL') {
          const p = state.getPlayer(actorId);
          const weapon = frame.context?.weapon || frame.context?.weaponName;
          if (weapon === 'Rìu Đá' || weapon === 'Quán Thạch Phủ') {
            const target = state.getPlayer(frame.targetId);
            if (p && p.hand && p.hand.length >= 2 && target && Math.random() < 0.5) {
              const discards = [p.hand[0].id, p.hand[1].id];
              state.discardFromHand(actorId, discards);
              state.priorityStack.pop();
              CombatRules.applyDamage(state, actorId, target.id, frame.context?.damageAmount || 1, 'slash_penetrate', false, frame.context?.slashCard);
            } else {
              state.priorityStack.pop();
            }
          } else if (weapon === 'Thanh Long Đao') {
            const extraSlash = p?.hand?.find(c => c.type === 'slash' || c.name === 'Chém');
            const target = state.getPlayer(frame.targetId);
            if (p && extraSlash && target && Math.random() < 0.5) {
              state.discardFromHand(actorId, [extraSlash.id]);
              state.priorityStack.pop();
              state.priorityStack.push({
                type: 'ASK_DODGE',
                sourceId: actorId,
                targetId: target.id,
                priorityQueue: [target.id],
                context: {
                  card: extraSlash,
                  requiredDodges: 1,
                  dodgesProvided: 0,
                  damageAmount: 1
                }
              });
            } else {
              state.priorityStack.pop();
            }
          } else if (weapon === 'Song Kiếm') {
            const source = state.getPlayer(frame.sourceId);
            if (p && p.hand && p.hand.length > 0) {
              state.discardFromHand(actorId, [p.hand[0].id]);
              state.priorityStack.pop();
            } else {
              state.priorityStack.pop();
              if (source && source.isAlive) {
                state.drawCards(source.id, 1);
              }
            }
          } else {
            state.priorityStack.pop();
          }
        } else {
          if (frame.context?.judgeCard) state.discardPile.push(frame.context.judgeCard);
          if (frame.context?.delayedCard) state.discardPile.push(frame.context.delayedCard);
          state.priorityStack.pop();
        }

        assertAllCards('AFTER_FRAME_' + frame.type);
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
            try {
              CombatRules.playSlash(state, currentBotId, action.targetId, card);
            } catch (e) {
              stateMachine.endActionPhase();
            }
          } else if (card && (card.type === 'trick' || card.type === 'TRICK')) {
            stats.totalTricks++;
            try {
              TrickRules.playTrick(state, currentBotId, action.targetId !== undefined ? [action.targetId] : [], card, {
                targetCardId: action.targetCardId,
                zone: action.zone
              });
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
            const rawSubtype = getCardSubType(card);
            let slot = null;
            if (rawSubtype === 'equip_weapon' || card.type === 'weapon') slot = 'weapon';
            else if (rawSubtype === 'equip_armor' || card.type === 'armor') slot = 'armor';
            else if (rawSubtype === 'equip_mount_atk' || card.type === 'horse_attack') slot = 'horse_attack';
            else if (rawSubtype === 'equip_mount_def' || card.type === 'horse_defense') slot = 'horse_defense';

            if (slot) {
              const old = p.equipment[slot];
              if (old) {
                state.discardPile.push(old);
                if (isEquip(old, 'bach_ngan') || old.name === 'Bạch Ngân' || old.name === 'Bạch Ngân Sư Tử') {
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

        assertAllCards('AFTER_ACTION');
        continue;
      }

      // 3. Pha bỏ bài (DISCARD)
      if (state.currentPhase === PHASES.DISCARD) {
        stateMachine._runPhaseDiscard();
      }

      assertAllCards('AFTER_DISCARD');

      assertAllCards('END_OF_STEP');
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

    const progressInterval = Math.max(1, Math.floor(MATCH_COUNT / 5));
    if ((g + 1) % progressInterval === 0 || g + 1 === MATCH_COUNT) {
      console.log(`✅ Đã hoàn thành ${g + 1}/${MATCH_COUNT} trận mô phỏng... (Đang chạy mượt mà)`);
    }
  } catch (err) {
    stats.errors.push({ gameIndex: g, error: err.message, stack: err.stack });
    console.error(`❌ Lỗi tại trận ${g}:`, err.message);
  }
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n🎉 KẾT QUẢ MÔ PHỎNG ${MATCH_COUNT.toLocaleString()} TRẬN ĐẤU (Thời gian: ${elapsedSec}s):`);
console.log(`- Trận hoàn thành hợp lệ: ${stats.completedMatches}/${MATCH_COUNT}`);
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
