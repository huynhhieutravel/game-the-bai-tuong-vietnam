/**
 * CardDeck.js
 * Quản lý Bộ Bài Chuẩn (Standard Deck) của Việt Sát v4.
 * Tích hợp trực tiếp từ cơ sở dữ liệu thẻ bài chính thức (gameData.js).
 */

import { CARDS } from '../../data/gameData.js';

export class CardDeck {
  /**
   * Tạo một bản sao mới của bộ bài chuẩn (108 lá bài)
   */
  static getStandardDeck() {
    return CARDS.map((card, idx) => ({
      ...card,
      id: `${card.id}_${idx}`
    }));
  }

  /**
   * Xáo bài đơn định bằng thuật toán Fisher-Yates
   */
  static shuffle(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
