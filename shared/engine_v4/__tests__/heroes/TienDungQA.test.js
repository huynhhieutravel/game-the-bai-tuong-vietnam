import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { canPlayCard } from '../../rules/TargetResolverV4.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Tiên Dung (Tien Dung QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'heart',
      rank: 5,
      color: 'red'
    }));

    const players = [
      {
        id: 0,
        name: 'Tiên Dung',
        hp: 3,
        maxHp: 3,
        gender: 'female',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'tien_dung',
        heroes: [{ id: 'tien_dung', skills: ['duyen_tien', 'tien_duyen_khoang_cach'] }],
        skills: ['duyen_tien', 'tien_duyen_khoang_cach'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Nam - Cự ly 1)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'ha',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Người chơi 2 (Nam - Cự ly 2)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'viet',
        mainHeroId: 'ngo_quyen',
        heroes: [{ id: 'ngo_quyen', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Người chơi 3 (Nữ - Cự ly 1)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'son',
        mainHeroId: 'trieu_thi_trinh',
        heroes: [{ id: 'trieu_thi_trinh', skills: [] }],
        skills: [],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    const state = new GameState({ players, drawPile });
    state.activePlayerId = 0;
    return state;
  };

  // ==========================================
  // PHẦN 1: DUYÊN TIÊN (RÚT BÀI KHI CHƠI CẨM NANG THƯỜNG)
  // ==========================================
  describe('1. Duyên Tiên: Rút 1 Lá Bài Khi Sử Dụng Cẩm Nang Thường', () => {
    it('khi Tiên Dung dùng [Vô Trung Sinh Hữu]: rút 2 lá từ bài + 1 lá từ Duyên Tiên', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);

      const voTrungCard = { id: 'vt_card', idKey: 'vo_trung', name: 'Vô Trung Sinh Hữu', type: 'trick' };
      p0.hand = [voTrungCard];

      dispatcher.dispatchAction({
        type: 'PLAY_CARD',
        playerId: 0,
        cardId: 'vt_card'
      });

      // Ngay khi kích hoạt, Duyên Tiên đã rút 1 lá bài:
      expect(p0.hand.length).toBe(1);

      // Mở vòng hỏi Hóa Giải (ASK_NEGATE), các người chơi bỏ qua
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
      TrickRules.respondNegate(state, 0, null);
      TrickRules.respondNegate(state, 1, null);
      TrickRules.respondNegate(state, 2, null);
      TrickRules.respondNegate(state, 3, null);

      // Hiệu ứng Vô Trung hoàn tất rút thêm 2 lá -> Tổng cộng đúng 3 lá bài!
      expect(p0.hand.length).toBe(3);
    });

    it('khi Tiên Dung dùng [Quyết Đấu]: rút 1 lá bài từ Duyên Tiên', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const duelCard = { id: 'duel_td', idKey: 'quyet_dau', name: 'Quyết Đấu', type: 'trick' };
      p0.hand = [duelCard];

      TrickRules.playDuel(state, 0, 1, duelCard);
      // Đã vứt Quyết Đấu và rút 1 lá bài từ Duyên Tiên
      expect(p0.hand.length).toBe(1);
    });

    it('khi Tiên Dung dùng liên tiếp nhiều lá Cẩm Nang Thường trong cùng 1 lượt: Duyên Tiên rút bài cho TỪNG LÁ (frequency: unlimited)', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);

      p0.hand = [
        { id: 't1', idKey: 'tuoc_bai', name: 'Tước Bài', type: 'trick' },
        { id: 't2', idKey: 'quyet_dau', name: 'Quyết Đấu', type: 'trick' },
        { id: 't3', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' }
      ];

      // Đánh lá 1: Tước Bài
      dispatcher.dispatchAction({ type: 'PLAY_CARD', playerId: 0, cardId: 't1', targetIds: [1] });
      // Đã đánh 1 lá (-1) và rút 1 lá (+1) -> Số lá vẫn là 3
      expect(p0.hand.length).toBe(3);
      while (!state.priorityStack.isEmpty()) state.priorityStack.pop();

      // Đánh lá 2: Quyết Đấu
      dispatcher.dispatchAction({ type: 'PLAY_CARD', playerId: 0, cardId: 't2', targetIds: [1] });
      // Đã đánh thêm 1 lá (-1) và rút thêm 1 lá (+1) -> Số lá vẫn là 3
      expect(p0.hand.length).toBe(3);
      while (!state.priorityStack.isEmpty()) state.priorityStack.pop();

      // Đánh lá 3: Cướp Bài
      dispatcher.dispatchAction({ type: 'PLAY_CARD', playerId: 0, cardId: 't3', targetIds: [1] });
      // Đã đánh thêm 1 lá (-1) và rút thêm 1 lá (+1) -> Số lá vẫn là 3
      expect(p0.hand.length).toBe(3);
    });

    it('khi Tiên Dung đặt cẩm nang trì hoãn [Sấm Sét]: KHÔNG kích hoạt Duyên Tiên', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const lightningCard = { id: 'lightning_td', idKey: 'sam_set', name: 'Sấm Sét', type: 'delayed_trick' };
      p0.hand = [lightningCard];

      TrickRules.playLightning(state, 0, lightningCard);
      // Sấm Sét chuyển vào khu phán xét, không kích hoạt Duyên Tiên nên bài tay là 0
      expect(p0.hand.length).toBe(0);
      expect(p0.judgementArea.length).toBe(1);
    });
  });

  // ==========================================
  // PHẦN 2: TIÊN DUYÊN CỰ LY (VÔ HẠN CỰ LY CẨM NANG)
  // ==========================================
  describe('2. Tiên Duyên: Cẩm Nang Vô Hạn Cự Ly (Không Giới Hạn Khoảng Cách)', () => {
    it('Tiên Dung có thể dùng [Cướp Bài] lên người chơi ở khoảng cách 2 (hoặc xa hơn)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2); // Nam ở cự ly 2
      p2.hand = [{ id: 'target_card', name: 'Chém' }];

      const stealCard = { id: 'steal_td', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      p0.hand = [stealCard];

      // canPlayCard xác nhận hợp lệ
      const check = canPlayCard(state, 0, 'Cướp Bài', 'steal_td');
      expect(check.valid).toBe(true);

      // Thực thi Cướp Bài lên p2 ở cự ly 2
      TrickRules.playSteal(state, 0, 2, stealCard);
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
      expect(state.priorityStack.peek().targetId).toBe(2);
    });

    it('người chơi thông thường không có Tiên Duyên không thể dùng Cướp Bài ở cự ly 2', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1); // Người chơi 1
      const p3 = state.getPlayer(3); // Cách p1 cự ly 2
      p3.hand = [{ id: 'p3_card', name: 'Chém' }];

      const stealCard = { id: 'steal_p1', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      p1.hand = [stealCard];

      const check = canPlayCard(state, 1, 'Cướp Bài', 'steal_p1');
      // Không có mục tiêu hợp lệ trong cự ly 1
      expect(check.valid).toBe(false);
    });
  });

  // ==========================================
  // PHẦN 3: TIÊN DUYÊN PHÒNG THỦ (+1 CỰ LY KHÁC GIỚI)
  // ==========================================
  describe('3. Tiên Duyên: Người Khác Giới Tính Đến Tiên Dung +1 Cự Ly', () => {
    it('khoảng cách từ người chơi Nam đến Tiên Dung (Nữ) được tăng thêm 1', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Tiên Dung (Nữ)
      const p1 = state.getPlayer(1); // Nam (liền kề, khoảng cách gốc = 1)

      const dist = RangeSystem.calculateDistance(p1, p0, state.getAlivePlayers());
      expect(dist).toBe(2); // 1 gốc + 1 khác giới = 2
    });

    it('khoảng cách từ người chơi Nữ đến Tiên Dung (Nữ) không bị tăng', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Tiên Dung (Nữ)
      const p3 = state.getPlayer(3); // Nữ (liền kề, khoảng cách gốc = 1)

      const dist = RangeSystem.calculateDistance(p3, p0, state.getAlivePlayers());
      expect(dist).toBe(1); // Cùng giới tính Nữ -> không tăng, khoảng cách là 1
    });
  });
});
