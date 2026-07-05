/**
 * Test Helper — Tạo state giả lập cho Engine Tests
 * 
 * Mục đích: Cung cấp factory functions để tạo game state chuẩn,
 * không phụ thuộc vào randomization (deck cố định, heroes cố định).
 */

import { Dispatcher } from '../core/Dispatcher';
import { CARDS } from '../../data/gameData';

// ===== FACTORY: Tạo 1 lá bài cố định =====
let cardCounter = 0;
export function createCard(name, type = 'Cơ bản', suit = '♠', rank = '7', color = 'black') {
  return {
    id: `test-${name.toLowerCase().replace(/ /g, '-')}-${cardCounter++}`,
    name,
    type,
    suit,
    rank,
    color,
    emoji: '',
    desc: '',
  };
}

// Reset counter between tests
export function resetCardCounter() {
  cardCounter = 0;
}

// ===== FACTORY: Tạo state game 2 người chơi đơn giản =====
// Không skill phức tạp, deck cố định, để test core mechanics
export function createTestState(options = {}) {
  const {
    playerCount = 2,
    mainHeroId = 'son-tinh', // Sơn Tinh — skill đơn giản (Dời Núi)
    subHeroId = 'son-tinh',
    p0Hand = [],
    p1Hand = [],
    p0Hp = 4,
    p1Hp = 4,
    p0Equipment = [],
    p1Equipment = [],
    deck = [],
  } = options;

  // Tạo deck mặc định nếu không cung cấp (30 Chém + 15 Né + filler)
  const defaultDeck = deck.length > 0 ? deck : [
    ...Array(10).fill(null).map(() => createCard('Chém', 'Cơ bản', '♠', '7', 'black')),
    ...Array(5).fill(null).map(() => createCard('Né', 'Cơ bản', '♥', '2', 'red')),
    ...Array(3).fill(null).map(() => createCard('Đào', 'Cơ bản', '♥', '3', 'red')),
    ...Array(2).fill(null).map(() => createCard('Hóa Giải', 'Cẩm nang', '♠', 'J', 'black')),
  ];

  const players = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      name: `Player ${i}`,
      isBot: i !== 0,
      mainHeroId,
      subHeroId,
      isAlive: true,
      hp: i === 0 ? p0Hp : p1Hp,
      maxHp: 4,
      hand: i === 0 ? [...p0Hand] : (i === 1 ? [...p1Hand] : []),
      equipment: i === 0 ? [...p0Equipment] : (i === 1 ? [...p1Equipment] : []),
      judgement: [],
      judgementArea: [],
      isFlipped: false,
      isChained: false,
      isSilenced: false,
      isRevealed: true, // Pre-revealed for simpler tests
      revealedHeroes: [true, true],
      attackCountThisTurn: 0,
      drankWineThisTurn: false,
      drankWine: false,
      hasAttackedThisTurn: false,
      hasPlayedSlashThisTurn: false,
    });
  }

  return {
    seed: 12345,
    turn: 1,
    currentPlayerIndex: 0,
    currentPhase: 'action',
    deck: defaultDeck,
    discardPile: [],
    players,
    actionQueue: [],
    reactionStack: [],
    waitingForResponse: { type: 'play_phase', responderId: 0, targetId: 0 },
    history: [],
    playedCards: [],
    isGameOver: false,
    winner: null,
    hasFirstRevealHappened: true,
    logs: [],
  };
}

// ===== HELPER: Tạo Dispatcher từ test state =====
export function createTestDispatcher(options = {}) {
  const state = createTestState(options);
  return new Dispatcher(state);
}

// ===== HELPER: Lấy player từ state =====
export function getPlayer(dispatcher, id = 0) {
  return dispatcher.getState().players.find(p => p.id === id);
}

// ===== HELPER: Dispatch action và trả về state =====
export function dispatchAndGet(dispatcher, action) {
  dispatcher.dispatchAction(action);
  return dispatcher.getState();
}
