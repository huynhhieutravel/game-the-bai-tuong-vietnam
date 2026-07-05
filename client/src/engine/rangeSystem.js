import { HeroRegistry } from './registries/HeroRegistry.js';
import { getAlivePlayers, rankToNumber } from './gameState.js';

/**
 * Lấy khoảng cách giữa 2 người chơi
 * @param {Object} state Game State
 * @param {number} fromId ID người tấn công
 * @param {number} toId ID mục tiêu
 * @returns {number} Khoảng cách
 */
export function getDistance(state, fromId, toId) {
  if (typeof fromId !== 'number' || typeof toId !== 'number') {
    throw new Error(`[Type Error] getDistance expects IDs (numbers), got fromId: ${typeof fromId} (${fromId}), toId: ${typeof toId} (${toId})`);
  }
  if (fromId === toId) return 0;
  
  const fromPlayer = state.players[fromId];
  const toPlayer = state.players[toId];

  if (!fromPlayer.isAlive || !toPlayer.isAlive) return Infinity;

  const alivePlayers = getAlivePlayers(state);
  // Sort by id to maintain seating order
  alivePlayers.sort((a, b) => a.id - b.id);

  const fromIndex = alivePlayers.findIndex(p => p.id === fromId);
  const toIndex = alivePlayers.findIndex(p => p.id === toId);

  // Calculate shortest path around the table
  const n = alivePlayers.length;
  let rawDist = Math.abs(fromIndex - toIndex);
  rawDist = Math.min(rawDist, n - rawDist);

  // Apply modifiers
  let finalDist = rawDist;

  // From player's Attack Horse (-1)
  const hasAttackHorse = fromPlayer.equipment.some(eq => eq.name === 'Ngựa Chiến (-1)');
  const hasThietMa = fromPlayer.heroes?.some((h, i) => fromPlayer.revealedHeroes && fromPlayer.revealedHeroes[i] && h.skills?.some(s => s.id === 'thiet-ma'));
  const hasNgheAnKe = fromPlayer.heroes?.some((h, i) => fromPlayer.revealedHeroes && fromPlayer.revealedHeroes[i] && h.skills?.some(s => s.id === 'nghe-an-ke'));
  if (hasAttackHorse) finalDist -= 1;
  if (hasThietMa) finalDist -= 1;
  if (hasNgheAnKe) finalDist -= 1;

  // To player's Defense Horse (+1)
  const hasDefenseHorse = toPlayer.equipment.some(eq => eq.name === 'Ngựa Thần (+1)');
  if (hasDefenseHorse) finalDist += 1;

  // Apply Skill Modifiers
  if (fromPlayer.rangeModifiers && fromPlayer.rangeModifiers.attack) {
    finalDist -= fromPlayer.rangeModifiers.attack;
  }
  if (toPlayer.rangeModifiers && toPlayer.rangeModifiers.defense) {
    finalDist += toPlayer.rangeModifiers.defense;
  }

  return Math.max(1, finalDist); // Minimum distance is 1
}

/**
 * Lấy tầm đánh của người chơi
 * @param {Object} state Game State
 * @param {number} playerId ID người chơi
 * @returns {number} Tầm đánh
 */
export function getAttackRange(state, playerId) {
  if (typeof playerId !== 'number') {
    throw new Error(`[Type Error] getAttackRange expects playerId as a number, got: ${typeof playerId} (${playerId})`);
  }
  const player = state.players[playerId];
  if (!player || !player.isAlive) return 0;

  let range = 1; // Default range
  if (player.usedNhiepChinh) return Infinity;

  const weapon = player.equipment.find(eq => 
    ['Liên Nỏ', 'Thanh Long Đao', 'Rìu Đá', 'Phương Thiên Kích', 'Song Kiếm', 'Quạt Sắt'].includes(eq.name)
  );
  
  if (weapon) {
    if (weapon.name === 'Liên Nỏ') range = 1;
    else if (weapon.name === 'Thanh Long Đao') range = 3;
    else if (weapon.name === 'Rìu Đá') range = 3;
    else if (weapon.name === 'Phương Thiên Kích') range = 4;
    else if (weapon.name === 'Song Kiếm') range = 2;
    else if (weapon.name === 'Quạt Sắt') range = 2;
  }

  return range;
}

/**
 * Kiểm tra xem có thể tấn công không (dựa trên khoảng cách và tầm đánh)
 * @param {Object} state Game State
 * @param {number} fromId ID người tấn công
 * @param {number} toId ID mục tiêu
 * @param {string|null} cardId ID lá bài (để tính tầm đánh dựa trên chất/số)
 * @returns {boolean}
 */
export function canAttack(state, fromId, toId, cardId = null) {
  if (typeof fromId !== 'number' || typeof toId !== 'number') {
    throw new Error(`[Type Error] canAttack expects IDs (numbers), got fromId: ${typeof fromId} (${fromId}), toId: ${typeof toId} (${toId})`);
  }
  const fromPlayer = state.players[fromId];
  if (fromPlayer && fromPlayer.unlimitedRangeThisTurn) {
      return true;
  }
  
  const dist = getDistance(state, fromId, toId);
  let range = getAttackRange(state, fromId);
  
  const hasNoThanOrThuyTo = fromPlayer.heroes?.some((h, i) => fromPlayer.revealedHeroes && fromPlayer.revealedHeroes[i] && h.skills?.some(s => s.id === 'no-than' || s.id === 'thuy-to'));
  if (hasNoThanOrThuyTo && cardId) {
     const card = fromPlayer.hand.find(c => c.id === cardId);
     if (card) {
        range = Math.max(range, rankToNumber(card.rank));
     }
  }
  
  return dist <= range;
}

export function canTarget(state, fromId, toId, cardName, cardId = null) {
  const targetPlayer = state.players[toId];

  // Kỹ năng: Đạm Bạc (Lang Liêu)
  // Nếu không có bài trên tay, không thể là mục tiêu của Chém hoặc Quyết Đấu
  const checkDamBac = (heroId) => {
      if (!heroId) return false;
      const hero = HeroRegistry[heroId];
      return hero && hero.skillIds && hero.skillIds.includes('dam-bac');
  };
  const hasDamBac = (targetPlayer.revealedHeroes && targetPlayer.revealedHeroes[0] && checkDamBac(targetPlayer.mainHeroId)) || 
                    (targetPlayer.revealedHeroes && targetPlayer.revealedHeroes[1] && checkDamBac(targetPlayer.subHeroId));
  const isTargetRevealed = targetPlayer.revealedHeroes && (targetPlayer.revealedHeroes[0] || targetPlayer.revealedHeroes[1]);
  if (isTargetRevealed && hasDamBac && targetPlayer.hand.length === 0) {
    if (cardName === 'Chém' || cardName === 'Quyết Đấu') {
      return false;
    }
  }

  // Kỹ năng: Tiên Duyên (Tiên Dung) - Cẩm nang không giới hạn khoảng cách (Đã xử lý ở chỗ khác vì mặc định cẩm nang không check khoảng cách)
  
  if (cardName === 'Chém') {
    return canAttack(state, fromId, toId, cardId);
  }
  
  // Mặc định Cẩm Nang có thể chỉ định bất kỳ ai (trừ Thuận Thủ, Binh Lương... sẽ tự xử lý khoảng cách sau)
  return true;
}
