import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { getAvailableTargets } from '../../rules/TargetResolverV4.js';
import { CARDS, CARD_TYPES, CARD_SUBTYPES, getCardSubType } from '../../../data/gameData.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../../constants/phases.js';

describe('QA Toàn Diện Thẻ Bài Trang Bị: Tọa Kỵ / Ngựa (Mount QA Suite v4)', () => {
  const createMockGameState = (customPlayers = null) => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: i % 4 === 0 ? 'heart' : (i % 4 === 1 ? 'diamond' : (i % 4 === 2 ? 'club' : 'spade')),
      rank: ((i % 13) + 1),
      color: (i % 4 < 2) ? 'red' : 'black'
    }));

    const players = customPlayers || [
      {
        id: 0,
        name: 'Người chơi 0 (Attacker)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 1 (Defender)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'viet',
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Người chơi 2 (Opponent)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'ha',
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Người chơi 3 (Third Party)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'son',
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    return new GameState({
      players,
      drawPile,
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
  };

  // ==========================================
  // PHẦN 1: PHÂN BỔ VÀ NHẬN DIỆN TỌA KỴ
  // ==========================================
  describe('1. Phân Bổ và Nhận Diện Tọa Kỵ (Mount Taxonomy & Deck Composition)', () => {
    it('nhận diện chính xác Subtype của Ngựa Tấn Công (-1) và Ngựa Phòng Thủ (+1)', () => {
      const atkHorse = { id: 'h_atk', name: 'Ngựa Chiến (-1)', type: CARD_TYPES.EQUIP };
      const defHorse = { id: 'h_def', name: 'Ngựa Thần (+1)', type: CARD_TYPES.EQUIP };

      expect(getCardSubType(atkHorse)).toBe(CARD_SUBTYPES.EQUIP_MOUNT_ATK);
      expect(getCardSubType(defHorse)).toBe(CARD_SUBTYPES.EQUIP_MOUNT_DEF);
    });

    it('bộ bài tiêu chuẩn 106 lá chứa đúng 3 Ngựa Chiến (-1) và 3 Ngựa Thần (+1)', () => {
      const atkHorses = CARDS.filter(c => c.name === 'Ngựa Chiến (-1)');
      const defHorses = CARDS.filter(c => c.name === 'Ngựa Thần (+1)');

      expect(atkHorses.length).toBe(3);
      expect(defHorses.length).toBe(3);

      atkHorses.forEach(h => {
        expect(getCardSubType(h)).toBe(CARD_SUBTYPES.EQUIP_MOUNT_ATK);
      });
      defHorses.forEach(h => {
        expect(getCardSubType(h)).toBe(CARD_SUBTYPES.EQUIP_MOUNT_DEF);
      });
    });
  });

  // ==========================================
  // PHẦN 2: HAI Ô TRANG BỊ ĐỘC LẬP & THAY THẾ NGỰA
  // ==========================================
  describe('2. Hai Ô Trang Bị Độc Lập & Thay Thế Ngựa (Dual Independent Mount Slots)', () => {
    it('người chơi có thể trang bị đồng thời cả 1 Ngựa Tấn Công và 1 Ngựa Phòng Thủ', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);

      const atkHorse = { id: 'h_atk_1', name: 'Ngựa Chiến (-1)', type: CARD_TYPES.EQUIP, subtype: CARD_SUBTYPES.EQUIP_MOUNT_ATK };
      const defHorse = { id: 'h_def_1', name: 'Ngựa Thần (+1)', type: CARD_TYPES.EQUIP, subtype: CARD_SUBTYPES.EQUIP_MOUNT_DEF };

      p0.hand = [atkHorse, defHorse];

      // Trang bị ngựa tấn công
      dispatcher.dispatch({ type: 'PLAY_CARD', payload: { playerId: 0, cardId: 'h_atk_1' } });
      expect(p0.equipment.horse_attack?.id).toBe('h_atk_1');
      expect(p0.equipment.horse_defense).toBeNull();

      // Trang bị ngựa phòng thủ
      dispatcher.dispatch({ type: 'PLAY_CARD', payload: { playerId: 0, cardId: 'h_def_1' } });
      expect(p0.equipment.horse_attack?.id).toBe('h_atk_1');
      expect(p0.equipment.horse_defense?.id).toBe('h_def_1');
      expect(p0.hand.length).toBe(0);
    });

    it('trang bị ngựa mới cùng ô sẽ thay thế ngựa cũ vào discardPile và kích hoạt ON_EQUIP_LOST', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p0 = state.getPlayer(0);

      // p0 sở hữu kỹ năng Xuân Hương của Hồ Xuân Hương (rút 2 bài khi mất trang bị)
      p0.mainHeroId = 'ho_xuan_huong';
      p0.heroes = [{ id: 'ho_xuan_huong', skills: ['xuan_huong'] }];
      p0.skills = ['xuan_huong'];

      const oldAtk = { id: 'old_atk', name: 'Ngựa Chiến (-1)', type: CARD_TYPES.EQUIP, subtype: CARD_SUBTYPES.EQUIP_MOUNT_ATK };
      const newAtk = { id: 'new_atk', name: 'Ngựa Chiến (-1)', type: CARD_TYPES.EQUIP, subtype: CARD_SUBTYPES.EQUIP_MOUNT_ATK };

      p0.equipment.horse_attack = oldAtk;
      p0.hand = [newAtk];

      dispatcher.dispatch({ type: 'PLAY_CARD', payload: { playerId: 0, cardId: 'new_atk' } });

      expect(p0.equipment.horse_attack.id).toBe('new_atk');
      expect(state.discardPile.some(c => c.id === 'old_atk')).toBe(true);
      // Khi old_atk bị đẩy vào discardPile, ON_EQUIP_LOST kích hoạt kỹ năng Xuân Hương rút 2 lá
      expect(p0.hand.length).toBe(2);
    });
  });

  // ==========================================
  // PHẦN 3: CÔNG THỨC TÍNH CỰ LY & SÀN CỰ LY TỐI THIỂU
  // ==========================================
  describe('3. Công Thức Cự Ly & Sàn Cự Ly Tối Thiểu (Distance Calculation & Floor Limit)', () => {
    it('bàn 4 người: khoảng cách gốc đối diện là 2, Ngựa Tấn Công (-1) rút ngắn còn 1', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      // Cự ly gốc giữa 0 và 2 là min(2, 4-2) = 2
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(2);

      // p0 trang bị Ngựa Chiến (-1)
      p0.equipment.horse_attack = { id: 'atk_1', name: 'Ngựa Chiến (-1)' };
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(1);
    });

    it('bàn 4 người: khoảng cách gốc kề bên là 1, Ngựa Phòng Thủ (+1) kéo giãn lên 2', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Cự ly gốc giữa 0 và 1 là 1
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(1);

      // p1 trang bị Ngựa Thần (+1)
      p1.equipment.horse_defense = { id: 'def_1', name: 'Ngựa Thần (+1)' };
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(2);
    });

    it('khi kẻ tấn công có Ngựa (-1) và mục tiêu có Ngựa (+1), hai hiệu ứng triệt tiêu nhau', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      p0.equipment.horse_attack = { id: 'atk_1', name: 'Ngựa Chiến (-1)' };
      p2.equipment.horse_defense = { id: 'def_1', name: 'Ngựa Thần (+1)' };

      // Cự ly gốc 2 - 1 (atk) + 1 (def) = 2
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(2);
    });

    it('sàn cự ly bất biến: cự ly giữa 2 người chơi khác nhau không bao giờ nhỏ hơn 1', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Cự ly gốc = 1. p0 có Ngựa (-1). 1 - 1 = 0 -> Phải bị chặn sàn ở 1
      p0.equipment.horse_attack = { id: 'atk_1', name: 'Ngựa Chiến (-1)' };
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(1);
    });
  });

  // ==========================================
  // PHẦN 4: CỘNG DỒN VỚI KỸ NĂNG TƯỚNG
  // ==========================================
  describe('4. Cộng Dồn Độc Lập Với Kỹ Năng Tướng (Hero Skill Stacking)', () => {
    it('Thánh Gióng (Thiết Mã -1) kết hợp Ngựa Chiến (-1): tổng giảm cự ly là -2', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Thánh Gióng
      const p2 = state.getPlayer(2);

      p0.heroes = [{ id: 'thanh-giong', skills: ['thiet_ma'] }];
      p0.skills = ['thiet_ma'];
      p0.equipment.horse_attack = { id: 'giong_horse', name: 'Ngựa Chiến (-1)' };

      // Bàn 5 người để có cự ly gốc 3: 0 -> 1 -> 2 -> 3
      const p4 = {
        id: 4, name: 'P4', hp: 4, maxHp: 4, gender: 'male', isAlive: true,
        faction: 'viet', revealedHeroes: [true, true], hand: [], equipment: {}
      };
      state.players.push(p4);

      // Cự ly gốc giữa 0 và 3 trong 5 người: min(|0-3|, 5-3) = min(3, 2) = 2
      // Cự ly gốc giữa 0 và 2: min(|0-2|, 5-2) = 2
      // Với cự ly gốc 2: 2 - 1 (Thiết Mã) - 1 (Ngựa) = 0 -> Sàn 1
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(1);

      // Kiểm tra khi mục tiêu có cự ly gốc 2 và mang Ngựa (+1):
      // Gốc 2 + 1 (def) - 2 (atk) = 1
      p2.equipment.horse_defense = { id: 'target_def', name: 'Ngựa Thần (+1)' };
      expect(RangeSystem.getDistance(state, 0, 2)).toBe(1);
    });

    it('Sơn Tinh (Dời Núi +1) kết hợp Ngựa Thần (+1): tổng tăng cự ly là +2', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1); // Sơn Tinh

      p1.heroes = [{ id: 'son-tinh', skills: ['doi_nui'] }];
      p1.skills = ['doi_nui'];
      p1.equipment.horse_defense = { id: 'son_horse', name: 'Ngựa Thần (+1)' };

      // Cự ly gốc giữa 0 và 1 là 1.
      // Dời Núi (+1) + Ngựa Thần (+1) => Cự ly hiệu dụng = 1 + 1 + 1 = 3
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(3);
    });

    it('Tiên Dung (Tiên Duyên +1 khi khác giới) kết hợp Ngựa Thần (+1): cự ly tăng thành 3', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0); // Nam
      const p1 = state.getPlayer(1); // Tiên Dung (Nữ)

      p1.heroes = [{ id: 'tien-dung', skills: ['tien_duyen_khoang_cach'] }];
      p1.skills = ['tien_duyen_khoang_cach'];
      p1.equipment.horse_defense = { id: 'td_horse', name: 'Ngựa Thần (+1)' };

      // p0 Nam, p1 Nữ => Khác giới tính
      // Cự ly gốc 1 + 1 (Tiên Duyên) + 1 (Ngựa) = 3
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(3);
    });
  });

  // ==========================================
  // PHẦN 5: RANH GIỚI CẨM NANG & BẮN HẠ NGỰA KỲ LÂN CUNG
  // ==========================================
  describe('5. Ranh Giới Cẩm Nang & Kỳ Lân Cung (Tricks & Kylin Bow Sniping)', () => {
    it('Cướp Bài không thể chọn mục tiêu kề bên nếu mục tiêu có Ngựa Thần (+1)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.hand = [{ id: 'card_to_steal', name: 'Đào' }];
      p1.equipment.horse_defense = { id: 'h_def_snatch', name: 'Ngựa Thần (+1)' };

      const snatchCard = { id: 'snatch_test', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      p0.hand = [snatchCard];

      // Khi p1 có Ngựa (+1), cự ly hiệu dụng = 2 > 1 -> Không thể cướp bài p1
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(2);
      const targets1 = getAvailableTargets(state, 0, 'Cướp Bài', 'snatch_test', []);
      expect(targets1.includes(1)).toBe(false);

      // Nếu p0 trang bị Ngựa Chiến (-1), cự ly trở lại 1 => p1 trở thành mục tiêu hợp lệ
      p0.equipment.horse_attack = { id: 'p0_atk', name: 'Ngựa Chiến (-1)' };
      expect(RangeSystem.getDistance(state, 0, 1)).toBe(1);
      const targets2 = getAvailableTargets(state, 0, 'Cướp Bài', 'snatch_test', []);
      expect(targets2.includes(1)).toBe(true);
    });

    it('Tước Bài không bị giới hạn cự ly và có thể loại bỏ Ngựa trong ô trang bị', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2); // Cự ly gốc 2

      p2.equipment.horse_defense = { id: 'dismantle_horse', name: 'Ngựa Thần (+1)' };

      const dismantleCard = { id: 'dismantle_test', idKey: 'tuoc_bai', name: 'Tước Bài', type: 'trick' };
      p0.hand = [dismantleCard];

      // p0 tước ngựa phòng thủ của p2
      TrickRules._executeTrickEffect(state, 0, [2], dismantleCard, { targetCardId: 'dismantle_horse' });

      expect(p2.equipment.horse_defense).toBeNull();
      expect(state.discardPile.some(c => c.id === 'dismantle_horse')).toBe(true);
    });

    it('Kỳ Lân Cung ưu tiên bắn hạ Ngựa Phòng Thủ (+1) trước khi bắn hạ Ngựa Tấn Công (-1)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // p0 trang bị Kỳ Lân Cung (Tầm 5)
      p0.equipment.weapon = { id: 'bow_1', idKey: 'ky_lan_cung', name: 'Kỳ Lân Cung', range: 5 };

      // p1 trang bị cả 2 con ngựa
      p1.equipment.horse_defense = { id: 'def_horse_target', name: 'Ngựa Thần (+1)' };
      p1.equipment.horse_attack = { id: 'atk_horse_target', name: 'Ngựa Chiến (-1)' };

      // p0 gây 1 sát thương Chém lên p1
      CombatRules.applyDamage(state, 0, 1, 1, 'slash');

      // Ngựa phòng thủ phải bị bắn rơi trước, ngựa tấn công còn nguyên
      expect(p1.equipment.horse_defense).toBeNull();
      expect(p1.equipment.horse_attack?.id).toBe('atk_horse_target');
      expect(state.discardPile.some(c => c.id === 'def_horse_target')).toBe(true);
    });

    it('Kỳ Lân Cung bắn hạ Ngựa Tấn Công (-1) khi mục tiêu không có Ngựa Phòng Thủ', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'bow_2', idKey: 'ky_lan_cung', name: 'Kỳ Lân Cung', range: 5 };
      p1.equipment.horse_attack = { id: 'atk_horse_only', name: 'Ngựa Chiến (-1)' };
      expect(p1.equipment.horse_defense).toBeNull();

      CombatRules.applyDamage(state, 0, 1, 1, 'slash');

      expect(p1.equipment.horse_attack).toBeNull();
      expect(state.discardPile.some(c => c.id === 'atk_horse_only')).toBe(true);
    });
  });
});
