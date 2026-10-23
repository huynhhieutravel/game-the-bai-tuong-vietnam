import { describe, it, expect } from 'vitest';
import { HeadlessRunner } from '../../simulation/HeadlessRunner.js';

describe('HeadlessRunner v4 (Tầng 3 QA - Giả Lập Trận Đấu Tự Động)', () => {
  it('chạy hoàn tất 1 ván đấu bot đầy đủ từ đầu đến cuối mà không gặp lỗi', () => {
    const result = HeadlessRunner.runSingleGame(4, 1500);
    expect(['LORD', 'REBEL', 'DRAW_OR_TIMEOUT']).toContain(result.winner);
    expect(result.turns).toBeGreaterThan(0);
  });

  it('chạy hàng loạt 50 ván đấu bot tự động: 0 lỗi exception, 0 deadlock kẹt game', () => {
    const results = HeadlessRunner.runBatch(50, 4);

    // BẮT BUỘC: 0 lỗi ngoại lệ (Zero Exception)
    expect(results.errors).toEqual([]);
    expect(results.total).toBe(50);

    // Tổng số trận có kết quả rõ ràng (Lord thắng hoặc Rebel thắng)
    const decisiveGames = results.lordWins + results.rebelWins;
    expect(decisiveGames).toBeGreaterThan(0);
  }, 15000); // Cho phép tối đa 15s cho 50 trận
});
