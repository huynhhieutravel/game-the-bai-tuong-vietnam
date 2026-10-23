import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Lạc: Chử Đồng Tử (Chu Dong Tu QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'club',
      rank: 6,
      color: 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Chử Đồng Tử',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        mainHeroId: 'chu_dong_tu',
        heroes: [{ id: 'chu_dong_tu', skills: ['tien_duyen_chu_dong_tu', 'hoa_tien'] }],
        skills: ['tien_duyen_chu_dong_tu', 'hoa_tien'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Kẻ địch 1)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
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
        name: 'Người chơi 2 (Kẻ địch 2)',
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
      }
    ];

    const state = new GameState({ players, drawPile });
    state.activePlayerId = 0;
    return state;
  };

  // ==========================================
  // PHẦN 1: HÓA TIÊN (HẠN ĐỊNH KỸ KHI HẤP HỐI)
  // ==========================================
  describe('1. Hóa Tiên: Hạn Định Kỹ Khi Rơi Vào Trạng Thái Hấp Hối', () => {
    it('khi Chử Đồng Tử nhận đòn chí tử (HP <= 0), Hóa Tiên tự kích hoạt hồi 3 HP và rút 3 bài', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.hp = 1;
      p0.hand = [{ id: 'old_hand_1', name: 'Rác' }];
      p0.equipment.weapon = { id: 'old_weapon', name: 'Kiếm Sắt' };
      p0.judgementArea = [{ id: 'old_lightning', name: 'Sấm Sét' }];

      // p1 dùng lá Chém gây 1 sát thương đưa Chử Đồng Tử về 0 HP
      const slash = { id: 's_deadly', name: 'Chém', type: 'slash', suit: 'spade', rank: 7 };
      p1.hand = [slash];

      CombatRules.playSlash(state, 1, 0, slash);
      // p0 không né
      CombatRules.respondDodge(state, 0, null);

      // Hóa Tiên tự động kích hoạt:
      expect(p0.isAlive).toBe(true);
      expect(p0.hp).toBe(3); // Hồi đầy 3 HP!
      expect(p0.equipment.weapon).toBeNull(); // Đã vứt bỏ vũ khí
      expect(p0.judgementArea.length).toBe(0); // Đã vứt bỏ sấm sét
      expect(p0.hand.length).toBe(3); // Rút 3 lá bài mới
      expect(state.priorityStack.isEmpty()).toBe(true); // Thoát khỏi trạng thái hấp hối, không kẹt ASK_PEACH
    });

    it('Hóa Tiên là Hạn Định Kỹ: không kích hoạt lần 2 trong cùng trận đấu', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Đánh dấu Hóa Tiên đã dùng trong trận
      p0.skillUsage = { hoa_tien: { usedThisGame: true } };
      p0.hp = 1;

      const slash = { id: 's_deadly_2', name: 'Chém', type: 'slash', suit: 'spade', rank: 7 };
      p1.hand = [slash];

      CombatRules.playSlash(state, 1, 0, slash);
      CombatRules.respondDodge(state, 0, null);

      // Lần này Hóa Tiên không kích hoạt -> Rơi vào ASK_PEACH thực sự
      expect(p0.hp).toBe(0);
      expect(state.priorityStack.peek().type).toBe('ASK_PEACH');
      expect(state.priorityStack.peek().targetId).toBe(0);
    });
  });

  // ==========================================
  // PHẦN 2: TIÊN DUYÊN (BÀI ♣ LÀM XIỀNG XÍCH)
  // ==========================================
  describe('2. Tiên Duyên: Sử Dụng Bài ♣ Làm [Xiềng Xích]', () => {
    it('Chử Đồng Tử dùng lá bài ♣ bất kỳ để xiềng xích 2 đối thủ qua DispatcherV4', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);

      // Chử Đồng Tử có lá Né chất ♣
      const clubDodge = { id: 'd_club', name: 'Né', type: 'dodge', suit: 'club', color: 'black', rank: 5 };
      p0.hand = [clubDodge];

      dispatcher.dispatchAction({
        type: 'PLAY_CARD',
        playerId: 0,
        cardId: 'd_club',
        targetIds: [1, 2],
        virtualCardName: 'Xiềng Xích'
      });

      // Mở vòng hỏi Hóa Giải (ASK_NEGATE)
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
      TrickRules.respondNegate(state, 0, null);
      TrickRules.respondNegate(state, 1, null);
      TrickRules.respondNegate(state, 2, null);

      // p1 và p2 đều bị xích
      expect(p1.isChained).toBe(true);
      expect(p2.isChained).toBe(true);
      expect(p0.hand.length).toBe(0);
    });

    it('Chử Đồng Tử có thể Rèn Lại (Reforge) lá bài ♣ rút 1 lá bài mới', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);

      const clubCard = { id: 'c_club_reforge', name: 'Chém', type: 'slash', suit: 'club', color: 'black', rank: 8 };
      p0.hand = [clubCard];

      // Rèn lại bằng cách gọi playIronChain với isIronChain = true, reforge = true (targetIds = [])
      TrickRules.playIronChain(state, 0, [], clubCard, { isIronChain: true, reforge: true });

      // Bài cũ bị bỏ, rút 1 lá bài mới
      expect(p0.hand.length).toBe(1);
      expect(p0.hand[0].id).not.toBe('c_club_reforge');
    });
  });
});
