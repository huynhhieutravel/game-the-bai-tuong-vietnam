import { CARDS, HEROES, PHASES } from '../data/gameData.js';

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGameState(playerCount = 4) {
  const deck = shuffle([...CARDS]);
  const shuffledHeroes = shuffle([...HEROES]);

  const players = Array.from({ length: playerCount }).map((_, i) => {
    const draftHeroes = shuffledHeroes.slice(i * 5, (i + 1) * 5);
    return {
      id: i,
      name: i === 0 ? 'Bạn' : `Người chơi ${i + 1}`,
      hero: null, // Will be set after drafting
      heroes: [], // Array of 2 selected heroes
      draftHeroes: draftHeroes,
      hp: 0,
      maxHp: 0,
      hand: [],
      equipment: [],
      judgementArea: [], // Sấm sét, Hỗn loạn
      isAlive: true,
      isBot: i !== 0,
      hasAttackedThisTurn: false,
      hasPlayedSlashThisTurn: false,
      attackCountThisTurn: 0,
      hasDrafted: false,
      isRevealed: false,
      revealedHeroes: [false, false],
      isDaTam: false,
      isFlipped: false,
      isChained: false,
      trungCards: [],
      isVip: i === 0, // VIP test mode cho player 0
    };
  });

  // Deal 4 cards to each player
  players.forEach(p => {
    for (let i = 0; i < 4; i++) {
      if (deck.length > 0) {
        p.hand.push(deck.pop());
      }
    }
  });

  return {
    players,
    deck,
    discardPile: [],
    currentPlayerIndex: 0,
    phase: PHASES.DRAFT,
    turn: 1,
    logs: [{ text: '⏳ Chọn Tướng Quốc Chiến!', type: 'important', timestamp: Date.now() }],
    playedCards: [], // Cards currently being resolved in the center
    gameOver: false,
    winner: null,
    waitingForResponse: null, // e.g. { type: 'dodge', targetId: 1, sourceId: 0, card: {...} }
    hasFirstRevealHappened: false,
  };
}

export function selectDraftHeroes(state, playerId, heroId1, heroId2) {
  let newState = { ...state };
  const player = newState.players.find(p => p.id === playerId);
  if (!player || player.hasDrafted) return newState;

  const h1 = player.draftHeroes.find(h => h.id === heroId1) || (player.isVip ? HEROES.find(h => h.id === heroId1) : null);
  const h2 = player.draftHeroes.find(h => h.id === heroId2) || (player.isVip ? HEROES.find(h => h.id === heroId2) : null);
  
  if (h1 && h2 && h1.faction === h2.faction) {
    player.heroes = [h1, h2];
    player.hero = h1; // Primary display hero
    player.maxHp = Math.floor((h1.maxHp + h2.maxHp) / 2);
    player.hp = player.maxHp;
    player.hasDrafted = true;
    Object.assign(newState, addLog(newState, `${player.name} đã chọn Phe ${h1.faction.toUpperCase()}!`, 'normal'));
  }

  // Check if everyone drafted
  const allDrafted = newState.players.every(p => p.hasDrafted);
  if (allDrafted) {
    newState.phase = PHASES.BEGIN;
    Object.assign(newState, addLog(newState, `⚔️ Mọi người đã chọn Tướng xong! Ván đấu bắt đầu!`, 'important'));
  }

  return newState;
}

export function revealHero(state, playerId, heroIndex) {
  const newState = { ...state };
  const target = newState.players[playerId];
  
  if (target.revealedHeroes[heroIndex]) return newState;
  
  target.revealedHeroes[heroIndex] = true;
  const isFirstRevealForPlayer = !target.isRevealed;
  target.isRevealed = true; // Derived state cho dễ check
  
  const heroRevealed = target.heroes[heroIndex];
  
  // Dã tâm (Careerist) Logic - Chỉ xét khi lật Tướng đầu tiên của người này
  if (isFirstRevealForPlayer) {
    const totalPlayers = newState.players.length;
    const sameFactionRevealed = newState.players.filter(p => 
      p.id !== target.id && 
      p.isAlive && 
      p.isRevealed && 
      !p.isDaTam && 
      getPlayerFaction(p) === heroRevealed.faction
    ).length;
    
    
    if (sameFactionRevealed + 1 > totalPlayers / 2) {
      target.isDaTam = true;
      Object.assign(newState, addLog(newState, `🐺 THAM VỌNG! ${target.name} lật tướng là phe ${heroRevealed.faction.toUpperCase()} nhưng do phe này đã quá đông, ${target.name} trở thành DÃ TÂM!`, 'important'));
    } else {
      Object.assign(newState, addLog(newState, `👁️ ${target.name} đã lộ diện là phe ${heroRevealed.faction.toUpperCase()}!`, 'important'));
    }

    // First Blood Bonus: Người lật tướng đầu tiên của Ván đấu được rút 2 lá bài
    if (!newState.hasFirstRevealHappened) {
      newState.hasFirstRevealHappened = true;
      drawCardsFor(newState, playerId, 2);
      Object.assign(newState, addLog(newState, `🎁 Tiên phong lật tướng! ${target.name} được rút 2 lá bài!`, 'important'));
    }
  } else {
    Object.assign(newState, addLog(newState, `👁️ ${target.name} đã lật thêm tướng ${heroRevealed.name}!`, 'normal'));
  }
  
  // Rule: If total max HP of both heroes has 0.5 remainder (odd sum), draw 1 card upon revealing BOTH heroes.
  if (target.revealedHeroes[0] && target.revealedHeroes[1]) {
    if (!target.hasReceivedHalfHpBonus) {
      target.hasReceivedHalfHpBonus = true;
      const totalRawHp = target.heroes[0].maxHp + target.heroes[1].maxHp;
      if (totalRawHp % 2 === 1) {
        drawCardsFor(newState, playerId, 1);
        Object.assign(newState, addLog(newState, `🎁 ${target.name} được rút 1 lá bài do dư 0.5 Sinh lực tối đa!`, 'important'));
      }
      
      // Châu Liên Bích Hợp
      const heroId1 = target.heroes[0].id;
      const heroId2 = target.heroes[1].id;
      const PERFECT_PAIRS = [
         // Dữ liệu trống để điền sau. Ví dụ: ['lac-long-quan', 'au-co']
      ];
      const isPerfectPair = PERFECT_PAIRS.some(pair => 
         (pair[0] === heroId1 && pair[1] === heroId2) || (pair[0] === heroId2 && pair[1] === heroId1)
      );
      
      if (isPerfectPair && !target.hasReceivedPerfectPairBonus && target.hp > 0) {
         target.hasReceivedPerfectPairBonus = true;
         // Nếu đang có pending event (ví dụ bị đánh), ta bọc nó lại
         const interruptedEvent = newState.waitingForResponse;
         newState.waitingForResponse = {
            type: 'ask_perfect_pair',
            targetId: playerId,
            askQueue: [playerId],
            interruptedEvent: interruptedEvent
         };
         Object.assign(newState, addLog(newState, `💖 ${target.name} lật trúng [Cặp Đôi Hoàn Hảo]!`, 'important'));
      }
    }
  }
  
  return newState;
}

// Helper to draw cards safely inside gameState.js
function drawCardsFor(state, playerId, count) {
  const player = state.players[playerId];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      state.deck = [...state.discardPile].reverse();
      state.discardPile = [];
    }
    if (state.deck.length > 0) {
      player.hand.push(state.deck.pop());
    }
  }
}

/**
 * Kiểm tra xem người chơi đã lật tướng chưa
 * @param {Object} player Object người chơi
 * @returns {boolean}
 */
export function isPlayerRevealed(player) {
  if (player !== undefined && player !== null && typeof player !== 'object') {
    throw new Error(`[Type Error] isPlayerRevealed expects a player object, got: ${typeof player} (${player})`);
  }
  if (!player || !player.revealedHeroes) return false;
  return player.revealedHeroes[0] || player.revealedHeroes[1];
}

/**
 * Lấy phe của người chơi
 * @param {Object} player Object người chơi
 * @returns {string} Tên phe
 */
export function getPlayerFaction(player) {
  if (player !== undefined && player !== null && typeof player !== 'object') {
    throw new Error(`[Type Error] getPlayerFaction expects a player object, got: ${typeof player} (${player})`);
  }
  if (!player) return 'Lạc';
  if (player.isDaTam) return 'Dã Tâm';
  
  if (!player.revealedHeroes || (!player.revealedHeroes[0] && !player.revealedHeroes[1])) {
      return 'Ẩn';
  }
  
  if (player.faction) {
      return player.faction.normalize('NFC');
  }
  
  if (player.heroes && player.heroes.length > 0) {
      return player.heroes[0].faction ? player.heroes[0].faction.normalize('NFC') : 'Lạc';
  }
  
  return 'Lạc';
}

/**
 * Đếm số lượng người chơi còn sống, đã lật tướng, không phải Dã Tâm và thuộc phe cụ thể
 * @param {string} faction Tên phe cần đếm
 * @param {Array} players Mảng người chơi (thường là state.players)
 * @returns {number} Số lượng người chơi
 */
export function getFactionCount(faction, players) {
  if (!faction || !players || !Array.isArray(players)) return 0;
  return players.filter(p => 
    p.isAlive && 
    p.isRevealed && 
    !p.isDaTam && 
    getPlayerFaction(p) === faction
  ).length;
}

/**
 * Lấy danh sách người chơi còn sống
 * @param {Object} state Game State
 * @returns {Array} Mảng các object người chơi
 */
export function getAlivePlayers(state) {
  if (!state || typeof state !== 'object' || !state.players) {
     throw new Error(`[Type Error] getAlivePlayers expects a state object with players array`);
  }
  return state.players.filter(p => p.isAlive);
}

export function addLog(state, text, type = 'normal') {
  return {
    ...state,
    logs: [...state.logs, { text, type, timestamp: Date.now() }]
  };
}

/**
 * Lấy giới tính của người chơi
 * @param {Object} player Object người chơi
 * @returns {string} Giới tính
 */
export function getPlayerGender(player) {
  if (player !== undefined && player !== null && typeof player !== 'object') {
    throw new Error(`[Type Error] getPlayerGender expects a player object, got: ${typeof player} (${player})`);
  }
  if (!player || !player.revealedHeroes || !player.heroes || player.heroes.length === 0) return 'Không';
  
  const r0 = player.revealedHeroes[0];
  const r1 = player.revealedHeroes[1];
  if (!r0 && !r1) return 'Không';
  
  if (player.gender) return player.gender;
  
  if (r0 && r1) return player.heroes[0].gender || 'Không';
  if (r0) return player.heroes[0].gender || 'Không';
  if (r1) return player.heroes[1].gender || 'Không';
  return 'Không';
}

export function rankToNumber(rank) {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank) || 1;
}

export function getEffectiveSuit(player, card) {
  if (!card) return null;
  const hasQuocSac = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'quoc-sac'));
  if (hasQuocSac && card.suit === '♠') {
      return '♥';
  }
  return card.suit;
}

export function getHandLimit(state, playerId) {
  const player = state.players[playerId];
  if (!player || !player.isAlive) return 0;
  
  let limit = player.hp;
  
  // Nguyễn Bặc - Khai Quốc
  const hasKhaiQuoc = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.name.startsWith('Khai Quốc')));
  if (hasKhaiQuoc) {
      const sonAllies = getAlivePlayers(state).filter(p => getPlayerFaction(p) === 'Sơn').length;
      limit += (sonAllies * 2);
  }
  
  // Khúc Thừa Dụ - Hộ Chủ (Hà faction)
  // Later: if has Ho Chu, limit = number of 'Trung' cards.
  
  return limit >= 0 ? limit : 0;
}
