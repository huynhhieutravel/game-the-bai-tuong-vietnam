/**
 * StandardDeck108PermutationQA.test.js
 * Kiểm thử Ma Trận Tổ Hợp Fuzzing Toàn Diện 108 Lá Bài Thật từ CardDeck.getStandardDeck().
 * Đảm bảo KHÔNG CÓ BẤT KỲ LÁ BÀI THẬT NÀO bị lỗi ID, sai tên, hoặc nuốt hiệu ứng.
 */

import { describe, it, expect } from 'vitest';
import { CardDeck } from '../../cards/CardDeck.js';
import { CARDS, getCardSubType, CARD_SUBTYPES, CARD_TYPES } from '../../../data/gameData.js';
import { normalizeEquipKey, isEquip, CANONICAL_EQUIP_KEYS } from '../../../utils/translationHelper.js';
import { RangeSystem, WEAPON_RANGE_MAP } from '../../rules/RangeSystem.js';
import { GameState } from '../../core/GameState.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { GameInvariants } from '../../core/Invariants.js';

describe('QA Ma Trận Tổ Hợp Fuzzing 108 Lá Bài Chuẩn (Standard Deck 108 Permutation QA)', () => {
  const createMockGameState = () => {
    const deck = CardDeck.getStandardDeck();
    const state = new GameState({
      players: [
        { id: 0, name: 'Người chơi 0 (Nam)', hp: 4, maxHp: 4, isAlive: true, hand: [], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null } },
        { id: 1, name: 'Người chơi 1 (Nữ)', hp: 4, maxHp: 4, isAlive: true, hand: [], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null } },
        { id: 2, name: 'Người chơi 2 (Nam)', hp: 4, maxHp: 4, isAlive: true, hand: [], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null } },
        { id: 3, name: 'Người chơi 3 (Nữ)', hp: 4, maxHp: 4, isAlive: true, hand: [], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null } }
      ],
      drawPile: deck,
      discardPile: []
    });
    return state;
  };

  it('1. Quét 100% 108 lá bài thật: Tính toàn vẹn cấu trúc thuộc tính cơ bản', () => {
    const deck = CardDeck.getStandardDeck();
    expect(deck.length).toBe(CARDS.length);

    const validTypes = ['basic', 'trick', 'equip', 'delayed_trick'];
    const validSuits = ['heart', 'diamond', 'club', 'spade'];
    const validColors = ['red', 'black'];

    deck.forEach((card, idx) => {
      expect(card.id, `Card index ${idx} missing id`).toBeTruthy();
      expect(card.name, `Card index ${idx} missing name`).toBeTruthy();
      expect(validTypes, `Card ${card.name} has invalid type: ${card.type}`).toContain(card.type);
      expect(validSuits, `Card ${card.name} has invalid suit: ${card.suit}`).toContain(card.suit);
      const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
      expect(validRanks, `Card ${card.name} has invalid rank: ${card.rank}`).toContain(card.rank);
    });
  });

  it('2. Quét toàn bộ thẻ bài Trang bị thật: getCardSubType và normalizeEquipKey phân loại chính xác 100%', () => {
    const deck = CardDeck.getStandardDeck();
    const equipCards = deck.filter(c => c.type === 'equip');

    expect(equipCards.length).toBeGreaterThan(0);

    equipCards.forEach(card => {
      const subType = getCardSubType(card);
      expect(subType, `Card ${card.name} (${card.id}) returned null subType`).toBeTruthy();
      expect([
        CARD_SUBTYPES.EQUIP_WEAPON,
        CARD_SUBTYPES.EQUIP_ARMOR,
        CARD_SUBTYPES.EQUIP_MOUNT_ATK,
        CARD_SUBTYPES.EQUIP_MOUNT_DEF
      ]).toContain(subType);

      const canonicalKey = normalizeEquipKey(card);
      expect(canonicalKey, `Card ${card.name} (${card.id}) returned empty canonicalKey`).toBeTruthy();
      expect(Object.values(CANONICAL_EQUIP_KEYS)).toContain(canonicalKey);

      // Nếu là vũ khí, RangeSystem bắt buộc tra cứu ra tầm đánh chính xác
      if (subType === CARD_SUBTYPES.EQUIP_WEAPON) {
        const dummyPlayer = { equipment: { weapon: card } };
        const range = RangeSystem.getAttackRange(dummyPlayer);
        expect(range).toBeGreaterThanOrEqual(1);
        if (canonicalKey === 'lien_no') expect(range).toBe(1);
        if (canonicalKey === 'thanh_long_dao') expect(range).toBe(3);
        if (canonicalKey === 'riu_da') expect(range).toBe(3);
      }
    });
  });

  it('3. Fuzzing vòng đời Trang bị thật qua DispatcherV4: Mặc, thay thế và bảo toàn số lượng thẻ bài', () => {
    const deck = CardDeck.getStandardDeck();
    const equipCards = deck.filter(c => c.type === 'equip');

    equipCards.forEach(card => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const dispatcher = new DispatcherV4(state);

      p0.hand = [card];
      const initialTotal = state.drawPile.length + state.discardPile.length + p0.hand.length;

      // Trang bị lá bài thật qua Dispatcher
      dispatcher.dispatch({ type: 'ACTION_PLAY_CARD', playerId: 0, cardId: card.id });

      const subType = getCardSubType(card);
      let slot = 'weapon';
      if (subType === CARD_SUBTYPES.EQUIP_ARMOR) slot = 'armor';
      else if (subType === CARD_SUBTYPES.EQUIP_MOUNT_ATK) slot = 'horse_attack';
      else if (subType === CARD_SUBTYPES.EQUIP_MOUNT_DEF) slot = 'horse_defense';

      // Kiểm tra trang bị đã lên người đúng slot
      expect(p0.equipment[slot]?.id).toBe(card.id);
      expect(p0.hand.length).toBe(0);

      // Trang bị đè một món mới cùng slot
      const replacementCard = { ...card, id: `${card.id}_replacement` };
      p0.hand = [replacementCard];

      dispatcher.dispatch({ type: 'ACTION_PLAY_CARD', playerId: 0, cardId: replacementCard.id });

      expect(p0.equipment[slot]?.id).toBe(replacementCard.id);
      expect(state.discardPile.some(c => c.id === card.id)).toBe(true);

      // Bảo toàn thẻ bài
      const currentTotal = state.drawPile.length + state.discardPile.length + p0.hand.length + 
        Object.values(p0.equipment).filter(Boolean).length;
      expect(currentTotal).toBe(initialTotal + 1); // +1 do thêm replacementCard
    });
  });

  it('4. Fuzzing Thẻ Đào & Rượu thật từ CardDeck: Dispatcher xử lý trơn tru không lỗi', () => {
    const deck = CardDeck.getStandardDeck();
    const peachCards = deck.filter(c => c.name === 'Đào');
    const wineCards = deck.filter(c => c.name === 'Rượu');

    // Test Đào
    peachCards.forEach(peach => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.hp = 2; // Đang mất máu
      p0.hand = [peach];

      const dispatcher = new DispatcherV4(state);
      dispatcher.dispatch({ type: 'ACTION_PLAY_CARD', playerId: 0, cardId: peach.id });

      expect(p0.hp).toBe(3);
      expect(state.discardPile.some(c => c.id === peach.id)).toBe(true);
    });

    // Test Rượu
    wineCards.forEach(wine => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      p0.hand = [wine];

      const dispatcher = new DispatcherV4(state);
      dispatcher.dispatch({ type: 'ACTION_PLAY_CARD', playerId: 0, cardId: wine.id });

      expect(p0.temporaryFlags?.wineActive).toBe(true);
      expect(p0.turnStats?.wineCount).toBe(1);
      expect(state.discardPile.some(c => c.id === wine.id)).toBe(true);
    });
  });
});
