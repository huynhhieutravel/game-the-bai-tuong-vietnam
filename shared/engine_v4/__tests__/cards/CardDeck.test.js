import { describe, it, expect } from 'vitest';
import { CardDeck } from '../../cards/CardDeck.js';

describe('CardDeck v4 (106 Lá Bài Chuẩn)', () => {
  it('nạp đầy đủ 106 lá bài chính thức từ gameData', () => {
    const deck = CardDeck.getStandardDeck();
    expect(deck.length).toBe(106);

    // Kiểm tra các loại bài cơ bản
    const slashes = deck.filter(c => c.name === 'Chém');
    const dodges = deck.filter(c => c.name === 'Né');
    const peaches = deck.filter(c => c.name === 'Đào');
    const wines = deck.filter(c => c.name === 'Rượu');

    expect(slashes.length).toBe(30);
    expect(dodges.length).toBe(15);
    expect(peaches.length).toBe(8);
    expect(wines.length).toBe(5);

    // Kiểm tra cẩm nang & trang bị
    const duels = deck.filter(c => c.name === 'Quyết Đấu');
    const crossBows = deck.filter(c => c.name === 'Liên Nỏ');
    expect(duels.length).toBe(3);
    expect(crossBows.length).toBe(2);
  });

  it('xáo bài bảo toàn 100% số lượng lá bài', () => {
    const deck = CardDeck.getStandardDeck();
    const shuffled = CardDeck.shuffle(deck);

    expect(shuffled.length).toBe(106);
    // Kiểm tra tính bảo toàn ID bài
    const originalIds = new Set(deck.map(c => c.id));
    shuffled.forEach(c => expect(originalIds.has(c.id)).toBe(true));
  });
});
