// ==========================================
// SeededRNG - Đảm bảo ngẫu nhiên đồng bộ (Multiplayer)
// Thuật toán: Mulberry32 (nhanh, đủ dùng cho game)
// ==========================================

export class SeededRNG {
  constructor(seed) {
    this.seed = seed;
  }

  // Khởi tạo từ string (ví dụ: tên phòng, timestamp)
  static fromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return new SeededRNG(hash);
  }

  // Trả về số thực từ 0 đến < 1
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Random số nguyên từ min đến max (bao gồm cả max)
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Xáo trộn mảng (Fisher-Yates)
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
