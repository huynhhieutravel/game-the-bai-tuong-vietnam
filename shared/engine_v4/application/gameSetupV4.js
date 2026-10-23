// @ts-check
/**
 * gameSetupV4.js
 * Quản lý khởi tạo trận đấu & giai đoạn Draft tướng cho Việt Sát v4.
 * Tích hợp chặt chẽ với HeroRegistry v4 và CardDeck v4.
 */

import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { CardDeck } from '../cards/CardDeck.js';
import { GameState } from '../core/GameState.js';
import { StateMachine, PHASES } from '../core/StateMachine.js';
import { SkillDescriptions, SkillIdToName } from '../../data/SkillDescriptions.js';

let draftSelections = {};

/**
 * Khởi tạo trạng thái ban đầu của ván đấu (giai đoạn Chọn Tướng - DRAFT)
 * @param {number} safeCount Số lượng người chơi (mặc định = 4)
 */
export function createGameState(safeCount = 4) {
  draftSelections = {};
  const rawCount = typeof safeCount === 'object' && safeCount !== null
    ? (safeCount.playerCount || safeCount.safeCount || 4)
    : Number(safeCount) || 4;
  const playerCount = Math.max(2, Math.min(8, rawCount));
  const sessionId = typeof safeCount === 'object' && safeCount !== null ? safeCount.sessionId : undefined;

  const allHeroes = globalHeroRegistry.getAllHeroes();
  const mainPlayerId = typeof window !== 'undefined' && window.playerId !== undefined ? window.playerId : 0;
  const heroesPerPlayer = playerCount >= 8 ? 4 : 5;

  let pool = [...allHeroes].sort(() => Math.random() - 0.5);

  const players = Array.from({ length: playerCount }).map((_, i) => {
    // Phân bổ tướng draft an toàn: đảm bảo mỗi người chơi có ít nhất 2 tướng cùng phe
    const byFaction = {};
    pool.forEach(h => {
      if (!byFaction[h.faction]) byFaction[h.faction] = [];
      byFaction[h.faction].push(h);
    });
    const eligibleFactions = Object.keys(byFaction).filter(f => byFaction[f].length >= 2);
    let chosenDraftHeroes = [];
    if (eligibleFactions.length > 0) {
      const chosenFaction = eligibleFactions[Math.floor(Math.random() * eligibleFactions.length)];
      const pair = byFaction[chosenFaction].slice(0, 2);
      const pairIds = new Set(pair.map(h => h.id));
      const remainingPool = pool.filter(h => !pairIds.has(h.id));
      const rest = remainingPool.slice(0, heroesPerPlayer - 2);
      chosenDraftHeroes = [...pair, ...rest];
      const chosenIds = new Set(chosenDraftHeroes.map(h => h.id));
      pool = pool.filter(h => !chosenIds.has(h.id));
    } else {
      chosenDraftHeroes = pool.slice(0, heroesPerPlayer);
      pool = pool.slice(heroesPerPlayer);
    }

    const draftHeroes = chosenDraftHeroes.map(h => {
      const resolvedSkills = (h.skills || []).map(skill => {
        const skillId = skill.id;
        const realName = skill.name || SkillIdToName[skillId] || skillId;
        const baseName = SkillIdToName[skillId] || realName;
        const desc = skill.description || SkillDescriptions[skillId] || SkillDescriptions[realName] || SkillDescriptions[baseName] || '(Chưa có mô tả)';
        return {
          id: skillId,
          name: realName,
          desc
        };
      });

      return {
        id: h.id,
        name: h.name,
        faction: h.faction,
        gender: h.gender || 'male',
        hp: h.hp || 4,
        maxHp: h.maxHp || 4,
        image: h.image,
        bio: h.bio,
        skills: resolvedSkills
      };
    });

    return {
      id: i,
      name: i === mainPlayerId ? 'Bạn' : `Người chơi ${i + 1}`,
      isBot: i !== mainPlayerId,
      isAlive: true,
      hasDrafted: false,
      draftHeroes,
      heroes: [{}, {}],
      revealedHeroes: [false, false],
      hp: 4,
      maxHp: 4,
      hand: [],
      equipment: [],
      judgementArea: [],
      isFlipped: false,
      isChained: false,
      isVip: i === 0
    };
  });

  return {
    phase: 'draft',
    sessionId,
    players,
    playedCards: [],
    logs: [],
    reactions: [],
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    turn: 1
  };
}

/**
 * Xử lý hành động chọn cặp tướng Draft của một người chơi
 * @param {any} state 
 * @param {number} playerId 
 * @param {string} hero1Id 
 * @param {string} hero2Id 
 */
export function selectDraftHeroes(state, playerId, hero1Id, hero2Id) {
  let finalH1 = hero1Id;
  let finalH2 = hero2Id;

  let h1 = globalHeroRegistry.getHero(finalH1);
  let h2 = globalHeroRegistry.getHero(finalH2);

  // Nếu không hợp lệ hoặc khác phe hoặc trùng nhau -> Tự động tìm cặp tướng cùng phe đầu tiên
  if (!h1 || !h2 || h1.faction !== h2.faction || finalH1 === finalH2) {
    const p = state.players.find(pl => pl.id === playerId);
    if (p && p.draftHeroes) {
      const factions = {};
      p.draftHeroes.forEach(h => {
        if (!factions[h.faction]) factions[h.faction] = [];
        factions[h.faction].push(h);
      });
      let selectedPair = null;
      for (const fac in factions) {
        if (factions[fac].length >= 2) {
          selectedPair = [factions[fac][0].id, factions[fac][1].id];
          break;
        }
      }
      if (selectedPair) {
        finalH1 = selectedPair[0];
        finalH2 = selectedPair[1];
      } else {
        finalH1 = p.draftHeroes[0]?.id;
        finalH2 = p.draftHeroes[1]?.id || finalH1;
      }
      h1 = globalHeroRegistry.getHero(finalH1);
      h2 = globalHeroRegistry.getHero(finalH2);
    }
  }

  draftSelections[playerId] = [finalH1, finalH2];

  const newState = { ...state };
  newState.players = newState.players.map(p => p.id === playerId ? { ...p, hasDrafted: true } : p);

  // Nếu tất cả người chơi đã chọn xong -> Khởi tạo Trận Đấu chính thức với Engine v4
  if (newState.players.every(p => p.hasDrafted)) {
    const deck = CardDeck.shuffle(CardDeck.getStandardDeck());

    const initializedPlayers = newState.players.map(p => {
      const pair = draftSelections[p.id] || ['lac_long_quan', 'thanh_giong'];
      const heroA = globalHeroRegistry.getHero(pair[0]);
      const heroB = globalHeroRegistry.getHero(pair[1]);

      const heroSkills = [
        ...(heroA?.skills || []).map(s => s.id),
        ...(heroB?.skills || []).map(s => s.id)
      ];

      const maxHp = (heroA && heroB)
        ? Math.floor(((heroA.maxHp || heroA.hp || 4) + (heroB.maxHp || heroB.hp || 4)) / 2)
        : (heroA?.hp || 4);

      return {
        id: p.id,
        name: p.name,
        isBot: p.isBot ?? false,
        socketId: p.socketId || null,
        mainHeroId: heroA?.id || pair[0],
        subHeroId: heroB?.id || pair[1],
        heroId: heroA?.id || pair[0],
        faction: heroA?.faction || 'Lạc',
        identity: p.id === 0 ? 'lord' : 'rebel',
        isLord: p.id === 0,
        gender: heroA?.gender || 'male',
        hp: maxHp,
        maxHp: maxHp,
        isAlive: true,
        hand: [],
        equipment: {
          weapon: null,
          armor: null,
          horse_attack: null,
          horse_defense: null
        },
        judgementArea: [],
        skills: heroSkills,
        revealedHeroes: [false, false],
        isFlipped: false,
        isChained: false,
        isVip: p.id === 0
      };
    });

    const v4GameState = new GameState({
      sessionId: state.sessionId || null,
      players: initializedPlayers,
      drawPile: deck,
      currentTurnPlayerId: 0,
      initialTotalCards: deck.length
    });

    // Chia mỗi người chơi 4 lá bài khởi đầu
    for (const player of v4GameState.players) {
      v4GameState.drawCards(player.id, 4);
    }

    // Bắt đầu lượt đầu tiên cho người chơi 0
    v4GameState.currentPhase = PHASES.ACTION;
    v4GameState.addLog('Trận đấu bắt đầu! Lượt của Bạn.');

    return v4GameState;
  }

  return newState;
}
