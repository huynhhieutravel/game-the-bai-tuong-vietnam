import { describe, it, expect } from 'vitest';
import { RangeSystem } from '../../rules/RangeSystem.js';

describe('RangeSystem v4', () => {
  const createMockPlayers = (count = 5) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      name: `Player ${i}`,
      equipment: {},
      skills: []
    }));
  };

  it('tính toán chính xác khoảng cách vòng tròn (Circle Distance) 5 người chơi', () => {
    const players = createMockPlayers(5);
    const p0 = players[0];

    // Khoảng cách từ 0 đến các người chơi:
    // 0 -> 1: min(1, 4) = 1
    // 0 -> 2: min(2, 3) = 2
    // 0 -> 3: min(3, 2) = 2
    // 0 -> 4: min(4, 1) = 1
    expect(RangeSystem.calculateDistance(p0, players[1], players)).toBe(1);
    expect(RangeSystem.calculateDistance(p0, players[2], players)).toBe(2);
    expect(RangeSystem.calculateDistance(p0, players[3], players)).toBe(2);
    expect(RangeSystem.calculateDistance(p0, players[4], players)).toBe(1);
    expect(RangeSystem.calculateDistance(p0, p0, players)).toBe(0);
  });

  it('áp dụng chính xác hiệu ứng Ngựa tấn công (-1) và Ngựa phòng thủ (+1)', () => {
    const players = createMockPlayers(5);
    const p0 = players[0];
    const p2 = players[2]; // bình thường khoảng cách là 2

    // Target p2 trang bị Ngựa phòng thủ (+1)
    p2.equipment.horse_defense = { id: 'ngua_than', name: 'Ngựa Thần (+1)' };
    expect(RangeSystem.calculateDistance(p0, p2, players)).toBe(3); // 2 + 1 = 3

    // Source p0 trang bị Ngựa tấn công (-1)
    p0.equipment.horse_attack = { id: 'ngua_chien', name: 'Ngựa Chiến (-1)' };
    expect(RangeSystem.calculateDistance(p0, p2, players)).toBe(2); // 3 - 1 = 2

    // Khoảng cách tối thiểu không bao giờ nhỏ hơn 1
    const p1 = players[1]; // bình thường = 1, có ngựa -1 vẫn là 1
    expect(RangeSystem.calculateDistance(p0, p1, players)).toBe(1);
  });

  it('xử lý kỹ năng Thiết Mã của Thánh Gióng (khoảng cách luôn -1)', () => {
    const players = createMockPlayers(5);
    const giong = players[0];
    giong.skills.push('thiet_ma');

    // Gióng nhìn sang p2 (bình thường cách 2) -> còn 1 (trong tầm tay không)
    expect(RangeSystem.calculateDistance(giong, players[2], players)).toBe(1);
    // Gióng nhìn sang p3 (bình thường cách 2) -> còn 1
    expect(RangeSystem.calculateDistance(giong, players[3], players)).toBe(1);
  });

  it('tính toán tầm đánh theo vũ khí và kỹ năng Nỏ Thần của Cao Lỗ', () => {
    const p = { id: 0, equipment: {}, skills: [] };
    // Tay không mặc định tầm = 1
    expect(RangeSystem.getAttackRange(p)).toBe(1);

    // Trang bị Thanh Long Đao (tầm = 3)
    p.equipment.weapon = { id: 'dragon_blade', name: 'Thanh Long Đao', range: 3 };
    expect(RangeSystem.getAttackRange(p)).toBe(3);

    // Kỹ năng Cao Lỗ: Nỏ Thần (tầm đánh bằng Rank lá Chém)
    p.skills.push('no_than_cao_lo');
    const slashCardRank10 = { type: 'slash', rank: 10 };
    expect(RangeSystem.getAttackRange(p, slashCardRank10)).toBe(10);

    const slashCardRank7 = { type: 'slash', rank: 7 };
    expect(RangeSystem.getAttackRange(p, slashCardRank7)).toBe(7);
  });

  it('lọc danh sách mục tiêu hợp lệ để Chém (Valid Slash Targets)', () => {
    const players = createMockPlayers(5);
    const p0 = players[0];

    // Tay không tầm 1: chỉ chém được p1 và p4
    let targets = RangeSystem.getValidSlashTargets(p0, players);
    expect(targets.map(t => t.id)).toEqual([1, 4]);

    // Trang bị vũ khí tầm 2: chém được toàn bàn [1, 2, 3, 4]
    p0.equipment.weapon = { id: 'twin_swords', name: 'Song Kiếm', range: 2 };
    targets = RangeSystem.getValidSlashTargets(p0, players);
    expect(targets.map(t => t.id)).toEqual([1, 2, 3, 4]);
  });
});
