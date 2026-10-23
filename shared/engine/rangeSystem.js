import { HeroRegistry } from './registries/HeroRegistry.js';
import { hasSkill } from './gameState.js';
import { getAlivePlayers, rankToNumber } from './gameState.js';
import { CARD_SUBTYPES, getCardSubType } from '../data/gameData.js';

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
  const hasAttackHorse = fromPlayer.equipment.some(eq => getCardSubType(eq) === CARD_SUBTYPES.EQUIP_MOUNT_ATK);
  const hasThietMa = hasSkill(fromPlayer, 'thiet-ma');
  if (hasAttackHorse) finalDist -= 1;
  if (hasThietMa) finalDist -= 1;

  // To player's Defense Horse (+1)
  const hasDefenseHorse = toPlayer.equipment.some(eq => getCardSubType(eq) === CARD_SUBTYPES.EQUIP_MOUNT_DEF);
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
  if (fromPlayer && (fromPlayer.unlimitedRangeThisTurn || fromPlayer.vanDonWin)) {
      return true;
  }
  
  const dist = getDistance(state, fromId, toId);
  let range = getAttackRange(state, fromId);
  
  const hasNoThan = hasSkill(fromPlayer, 'no-than');
  if (hasNoThan && cardId) {
     const card = fromPlayer.hand.find(c => c.id === cardId);
     if (card) {
        range = Math.max(range, rankToNumber(card.rank));
     }
  }
  
  const hasKhaiThien = hasSkill(fromPlayer, 'khai-thien');
  if (hasKhaiThien && cardId) {
     const card = fromPlayer.hand.find(c => c.id === cardId);
     if (card && card.color === 'red') {
         return true; // Khai Thiên: dùng bài Đỏ như Chém, không giới hạn tầm đánh
     }
  }
  
  return dist <= range;
}

export function canTarget(state, fromId, toId, cardName, cardId = null) {
  const targetPlayer = state.players[toId];

  // Kỹ năng: Đạm Bạc (Lang Liêu)
  // Nếu không có bài trên tay, không thể là mục tiêu của Chém hoặc Quyết Đấu
  const hasDamBac = hasSkill(targetPlayer, 'dam-bac');
  if (hasDamBac && targetPlayer.hand.length === 0) {
    if (cardName === 'Chém' || cardName === 'Quyết Đấu') {
      return false;
    }
  }

  // Trang bị: Hắc Thuẫn
  // Miễn nhiễm Chém Đen
  if (cardName === 'Chém' && cardId) {
      const fromPlayer = state.players[fromId];
      const card = fromPlayer?.hand.find(c => c.id === cardId) || fromPlayer?.equipment.find(c => c.id === cardId);
      if (card && card.color === 'black') {
          const hasHacThuan = targetPlayer.equipment.some(eq => eq.name === 'Hắc Thuẫn');
          if (hasHacThuan) {
              return false;
          }
      }
  }

  // Kỹ năng: Tiên Duyên (Tiên Dung) - Cẩm nang không giới hạn khoảng cách (Đã xử lý ở chỗ khác vì mặc định cẩm nang không check khoảng cách)
  
  if (cardName === 'Chém') {
    return canAttack(state, fromId, toId, cardId);
  }
  
  // Mặc định Cẩm Nang có thể chỉ định bất kỳ ai (trừ Thuận Thủ, Binh Lương... sẽ tự xử lý khoảng cách sau)
  return true;
}
