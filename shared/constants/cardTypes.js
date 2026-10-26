/**
 * @typedef {string} CardType
 * @typedef {string} CardSubType
 */

/**
 * Các loại bài chính (Domain Language)
 * @type {Readonly<{BASIC: CardType, TRICK: CardType, EQUIP: CardType}>}
 */
export const CARD_TYPES = Object.freeze({
  BASIC: 'basic',
  TRICK: 'trick',
  EQUIP: 'equip'
});

/**
 * Các loại bài con dành riêng cho Trang bị (Domain Language)
 * @type {Readonly<{EQUIP_WEAPON: CardSubType, EQUIP_ARMOR: CardSubType, EQUIP_MOUNT_ATK: CardSubType, EQUIP_MOUNT_DEF: CardSubType}>}
 */
export const CARD_SUBTYPES = Object.freeze({
  TRICK_NORMAL: 'trick_normal',
  TRICK_DELAYED: 'trick_delayed',
  EQUIP_WEAPON: 'equip_weapon',
  EQUIP_ARMOR: 'equip_armor',
  EQUIP_MOUNT_ATK: 'equip_mount_atk',
  EQUIP_MOUNT_DEF: 'equip_mount_def'
});

export const CARD_SUITS = Object.freeze({
  SPADE: 'spade',
  HEART: 'heart',
  CLUB: 'club',
  DIAMOND: 'diamond'
});

import { normalizeSuit, getSuitEmoji, getSuitColor, isSameSuit, SUIT_EMOJIS, SUIT_LABELS } from '../utils/translationHelper.js';

export { normalizeSuit, getSuitEmoji, getSuitColor, isSameSuit, SUIT_EMOJIS, SUIT_LABELS };

