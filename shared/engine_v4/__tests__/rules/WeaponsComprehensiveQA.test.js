import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { RangeSystem, WEAPON_RANGE_MAP } from '../../rules/RangeSystem.js';
import { canPlayCard, getTargetingDefinition } from '../../rules/TargetResolverV4.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { GameViewMapperV4 } from '../../application/GameViewMapperV4.js';
import { CardDeck } from '../../cards/CardDeck.js';
import { CARDS, CARD_TYPES, CARD_SUBTYPES, getCardSubType } from '../../../data/gameData.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { GameInvariants } from '../../core/Invariants.js';
import { normalizeEquipKey, isEquip } from '../../../utils/translationHelper.js';

describe('QA Toàn Diện Hệ Thống Trang Bị & Vũ Khí Chuẩn (All Weapons & Equipment QA Suite)', () => {
  const createMockGameState = (numPlayers = 4) => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_draw_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: i % 4 === 0 ? 'heart' : (i % 4 === 1 ? 'diamond' : (i % 4 === 2 ? 'club' : 'spade')),
      rank: ((i % 13) + 1),
      color: (i % 4 < 2) ? 'red' : 'black'
    }));

    const players = Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: `Người chơi ${i} (${i % 2 === 0 ? 'Nam' : 'Nữ'})`,
      hp: 4,
      maxHp: 4,
      gender: i % 2 === 0 ? 'male' : 'female',
      isAlive: true,
      faction: i % 2 === 0 ? 'lac' : 'viet',
      revealedHeroes: [true, true],
      hand: [],
      equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
      judgementArea: [],
      turnStats: { slashCount: 0, wineCount: 0 }
    }));

    const state = new GameState({ players, drawPile, currentPhase: PHASES.ACTION, activePlayerId: 0 });
    return state;
  };

  const standardDeck = CardDeck.getStandardDeck();

  // =========================================================================
  // PHẦN 1: BẢNG ÁNH XẠ VÀ TÍNH TẦM ĐÁNH TỰ ĐỘNG CỦA 7 LOẠI VŨ KHÍ
  // =========================================================================
  describe('1. Bảng ánh xạ tầm đánh của 7 loại vũ khí với mọi dạng ID / Dấu tiếng Việt', () => {
    it('1.1. normalizeEquipKey nhận diện chính xác 7 loại vũ khí, 3 phòng cụ và 2 thú cưỡi', () => {
      expect(normalizeEquipKey('Liên Nỏ')).toBe('lien_no');
      expect(normalizeEquipKey('liên-nỏ-0-123456')).toBe('lien_no');
      expect(normalizeEquipKey('crossbow')).toBe('lien_no');

      expect(normalizeEquipKey('Thanh Long Đao')).toBe('thanh_long_dao');
      expect(normalizeEquipKey('thanh-long-đao-0-123456')).toBe('thanh_long_dao');
      expect(normalizeEquipKey('dragon_blade')).toBe('thanh_long_dao');

      expect(normalizeEquipKey('Rìu Đá')).toBe('riu_da');
      expect(normalizeEquipKey('rìu-đá-0-123456')).toBe('riu_da');
      expect(normalizeEquipKey('Quán Thạch Phủ')).toBe('riu_da');
      expect(normalizeEquipKey('rock_axe')).toBe('riu_da');

      expect(normalizeEquipKey('Song Kiếm')).toBe('song_kiem');
      expect(normalizeEquipKey('song-kiếm-0-123456')).toBe('song_kiem');
      expect(normalizeEquipKey('twin_swords')).toBe('song_kiem');

      expect(normalizeEquipKey('Phương Thiên Kích')).toBe('phuong_thien_kich');
      expect(normalizeEquipKey('phương-thiên-kích-0-123456')).toBe('phuong_thien_kich');
      expect(normalizeEquipKey('sky_halberd')).toBe('phuong_thien_kich');

      expect(normalizeEquipKey('Quạt Sắt')).toBe('quat_sat');
      expect(normalizeEquipKey('quạt-sắt-0-123456')).toBe('quat_sat');
      expect(normalizeEquipKey('Cổ Đĩnh Đao')).toBe('quat_sat');

      expect(normalizeEquipKey('Kỳ Lân Cung')).toBe('ky_lan_cung');
      expect(normalizeEquipKey('kỳ-lân-cung-0-123456')).toBe('ky_lan_cung');
      expect(normalizeEquipKey('kirin_bow')).toBe('ky_lan_cung');

      expect(normalizeEquipKey('Bát Quái')).toBe('bat_quai');
      expect(normalizeEquipKey('bát-quái-0-123456')).toBe('bat_quai');
      expect(normalizeEquipKey('Hắc Thuẫn')).toBe('hac_thuan');
      expect(normalizeEquipKey('hắc-thuẫn-0-123456')).toBe('hac_thuan');
      expect(normalizeEquipKey('Bạch Ngân Sư Tử')).toBe('bach_ngan');
      expect(normalizeEquipKey('bạch-ngân-0-123456')).toBe('bach_ngan');

      expect(normalizeEquipKey('Ngựa Chiến (-1)')).toBe('ngua_chien');
      expect(normalizeEquipKey('Ngựa Thần (+1)')).toBe('ngua_than');
    });

    it('1.2. RangeSystem.getAttackRange trả về tầm đánh chính xác cho cả 7 vũ khí từ CardDeck', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);

      // Thử từng lá vũ khí thật
      const testWeapons = [
        { name: 'Liên Nỏ', expectedRange: 1 },
        { name: 'Song Kiếm', expectedRange: 2 },
        { name: 'Quạt Sắt', expectedRange: 2 },
        { name: 'Thanh Long Đao', expectedRange: 3 },
        { name: 'Rìu Đá', expectedRange: 3 },
        { name: 'Phương Thiên Kích', expectedRange: 4 },
        { name: 'Kỳ Lân Cung', expectedRange: 5 }
      ];

      for (const w of testWeapons) {
        p0.equipment.weapon = { id: `${normalizeEquipKey(w.name)}-test-0-12345`, name: w.name };
        expect(RangeSystem.getAttackRange(p0)).toBe(w.expectedRange);
      }
    });
  });

  // =========================================================================
  // PHẦN 2: LIÊN NỎ (REPEATING CROSSBOW: TẦM 1, VÔ HẠN CHÉM/LƯỢT)
  // =========================================================================
  describe('2. Liên Nỏ (Repeating Crossbow)', () => {
    it('khi trang bị Liên Nỏ thật từ CardDeck: cho phép đánh liên tiếp nhiều lá Chém và hiển thị sáng trên UI', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const realLienNo = standardDeck.find(c => c.name === 'Liên Nỏ');
      expect(realLienNo).toBeDefined();
      p0.equipment.weapon = realLienNo;

      const s1 = { id: 's1', name: 'Chém', type: 'slash' };
      const s2 = { id: 's2', name: 'Chém', type: 'slash' };
      p0.hand.push(s1, s2);

      // Chém phát 1
      CombatRules.playSlash(state, 0, 1, s1);
      expect(p0.turnStats.slashCount).toBe(1);

      // Sau phát 1: s2 vẫn hợp lệ và isPlayable = true
      const canPlay = canPlayCard(state, 0, s2.name, s2.id);
      expect(canPlay.valid).toBe(true);

      const vm = GameViewMapperV4.toViewModel(state, 0);
      const vmS2 = vm.players[0].hand.find(c => c.id === 's2');
      expect(vmS2.isPlayable).toBe(true);
      expect(vmS2.unplayableReason || '').toBe('');

      // Chém phát 2 không bị chặn bởi Invariant
      expect(() => GameInvariants.assertSlashLimit(p0)).not.toThrow();
    });
  });

  // =========================================================================
  // PHẦN 3: THANH LONG ĐAO (DRAGON BLADE: TẦM 3, CHÉM BỊ NÉ -> CHÉM TIẾP)
  // =========================================================================
  describe('3. Thanh Long Đao (Dragon Blade)', () => {
    it('3.1. Cho phép Chém mục tiêu ở khoảng cách 3', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2); // Khoảng cách trong bàn 4 người: 0 đến 2 = 2.
      // Tạo bàn 6 người để khoảng cách 0 đến 3 = 3
      const state6 = createMockGameState(6);
      const s0 = state6.getPlayer(0);
      const s3 = state6.getPlayer(3);
      const realDragon = standardDeck.find(c => c.name === 'Thanh Long Đao') || { id: 'thanh-long-đao-0-999', name: 'Thanh Long Đao' };
      s0.equipment.weapon = realDragon;

      const slash = { id: 's_dragon_reach', name: 'Chém', type: 'slash' };
      s0.hand.push(slash);

      expect(RangeSystem.getAttackRange(s0)).toBe(3);
      expect(RangeSystem.inSlashRange(s0, s3, state6.getAlivePlayers())).toBe(true);
      expect(() => CombatRules.playSlash(state6, 0, 3, slash)).not.toThrow();
    });

    it('3.2. Khi đòn Chém bị Né, kích hoạt ASK_WEAPON_SKILL và cho phép chém bồi qua DispatcherV4', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'thanh-long-đao-0-1792972291440_94', name: 'Thanh Long Đao' };
      const s1 = { id: 's1', name: 'Chém', type: 'slash' };
      const s2 = { id: 's2', name: 'Chém', type: 'slash' };
      p0.hand.push(s1, s2);

      CombatRules.playSlash(state, 0, 1, s1);
      // p1 né thành công
      CombatRules.respondDodge(state, 1, { id: 'dodge_1', name: 'Né' });

      // Frame ASK_WEAPON_SKILL được đẩy lên
      const topFrame = state.priorityStack.peek();
      expect(topFrame.type).toBe('ASK_WEAPON_SKILL');
      expect(topFrame.context.weapon).toBe('Thanh Long Đao');

      // Dispatcher nhận lệnh chém tiếp
      const dispatcher = new DispatcherV4(state);
      dispatcher.dispatch({ type: 'ACTION_REACT', playerId: 0, doUse: true, cardId: 's2' });

      // Đòn Chém 2 vung ra -> đẩy ASK_DODGE mới cho p1
      const nextFrame = state.priorityStack.peek();
      expect(nextFrame.type).toBe('ASK_DODGE');
      expect(nextFrame.targetId).toBe(1);
    });
  });

  // =========================================================================
  // PHẦN 4: RÌU ĐÁ (ROCK AXE: TẦM 3, BỎ 2 BÀI XUYÊN GIÁP)
  // =========================================================================
  describe('4. Rìu Đá (Rock Axe)', () => {
    it('khi Chém bị Né, người chơi chọn bỏ 2 lá bài xuyên giáp bắt buộc trúng đích', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'rìu-đá-0-1792972291440_95', name: 'Rìu Đá' };
      const s1 = { id: 's1', name: 'Chém', type: 'slash' };
      const cardA = { id: 'trash_a', name: 'Bài rác A' };
      const cardB = { id: 'trash_b', name: 'Bài rác B' };
      p0.hand.push(s1, cardA, cardB);

      CombatRules.playSlash(state, 0, 1, s1);
      CombatRules.respondDodge(state, 1, { id: 'dodge_1', name: 'Né' });

      expect(state.priorityStack.peek().type).toBe('ASK_WEAPON_SKILL');

      // Dispatcher kích hoạt Rìu Đá với 2 lá bài
      const dispatcher = new DispatcherV4(state);
      dispatcher.dispatch({ type: 'ACTION_REACT', playerId: 0, doUse: true, cardIds: ['trash_a', 'trash_b'] });

      // p1 bị trừ máu trực tiếp (xuyên giáp thành công)
      expect(p1.hp).toBe(3); // 4 - 1 = 3
      expect(p0.hand.length).toBe(0);
    });
  });

  // =========================================================================
  // PHẦN 5: SONG KIẾM (TWIN SWORDS: TẦM 2, TƯƠNG TÁC KHÁC GIỚI)
  // =========================================================================
  describe('5. Song Kiếm (Twin Swords)', () => {
    it('5.1. Nam chém Nữ: ép mục tiêu tự bỏ 1 lá bài trước khi có cơ hội Né', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0); // Nam
      const p1 = state.getPlayer(1); // Nữ

      p0.equipment.weapon = { id: 'song-kiếm-0-1792972291440_96', name: 'Song Kiếm' };
      const slash = { id: 'slash_1', name: 'Chém', type: 'slash' };
      p0.hand.push(slash);

      const p1Card = { id: 'p1_card', name: 'Lá bài của Nữ' };
      p1.hand.push(p1Card);

      CombatRules.playSlash(state, 0, 1, slash);

      // p1 bị ép bỏ lá bài
      expect(p1.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'p1_card')).toBe(true);
    });

    it('5.2. Nam chém Nam (cùng giới tính): không có hiệu ứng Song Kiếm', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0); // Nam
      const p2 = state.getPlayer(2); // Nam

      p0.equipment.weapon = { id: 'song-kiếm-0-1792972291440_96', name: 'Song Kiếm' };
      const slash = { id: 'slash_1', name: 'Chém', type: 'slash' };
      p0.hand.push(slash);

      const p2Card = { id: 'p2_card', name: 'Lá bài của Nam' };
      p2.hand.push(p2Card);

      CombatRules.playSlash(state, 0, 2, slash);
      expect(p2.hand.length).toBe(1); // Không bị ép bỏ bài
    });
  });

  // =========================================================================
  // PHẦN 6: PHƯƠNG THIÊN KÍCH (SKY HALBERD: TẦM 4, BÀI CUỐI QUÉT 3 MỤC TIÊU)
  // =========================================================================
  describe('6. Phương Thiên Kích (Sky Halberd)', () => {
    it('6.1. Khi là lá bài duy nhất trên tay: TargetResolver cho phép chọn tối đa 3 mục tiêu', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'phương-thiên-kích-0-1792972291440_97', name: 'Phương Thiên Kích' };

      const singleSlash = { id: 'last_slash', name: 'Chém', type: 'slash' };
      p0.hand = [singleSlash];

      const targetDef = getTargetingDefinition(state, 0, 'Chém', singleSlash);
      expect(targetDef.type).toBe('multiple');
      expect(targetDef.max).toBe(3);
    });

    it('6.2. Khi còn từ 2 lá bài trên tay trở lên: chỉ cho phép chọn 1 mục tiêu đơn', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'phương-thiên-kích-0-1792972291440_97', name: 'Phương Thiên Kích' };

      const slash = { id: 's1', name: 'Chém', type: 'slash' };
      const other = { id: 'o1', name: 'Đào', type: 'peach' };
      p0.hand = [slash, other];

      const targetDef = getTargetingDefinition(state, 0, 'Chém', slash);
      expect(targetDef.type).toBe('single');
    });
  });

  // =========================================================================
  // PHẦN 7: QUẠT SẮT / CỔ ĐĨNH ĐAO (TẦM 2, +1 SÁT THƯƠNG MỤC TIÊU HẾT BÀI)
  // =========================================================================
  describe('7. Quạt Sắt / Cổ Đĩnh Đao', () => {
    it('7.1. Mục tiêu không có bài trên tay: nhận 2 sát thương từ đòn Chém', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'quạt-sắt-0-1792972291440_98', name: 'Quạt Sắt' };
      p1.hand = []; // Hết bài trên tay

      CombatRules.applyDamage(state, 0, 1, 1, 'slash_normal');
      expect(p1.hp).toBe(2); // 4 - 2 = 2 (tăng +1 sát thương)
    });

    it('7.2. Mục tiêu còn bài trên tay: nhận đúng 1 sát thương cơ bản', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'quạt-sắt-0-1792972291440_98', name: 'Quạt Sắt' };
      p1.hand = [{ id: 'card_shield', name: 'Né' }];

      CombatRules.applyDamage(state, 0, 1, 1, 'slash_normal');
      expect(p1.hp).toBe(3); // 4 - 1 = 3
    });
  });

  // =========================================================================
  // PHẦN 8: KỲ LÂN CUNG (KIRIN BOW: TẦM 5, BẮN HẠ THÚ CƯỠI)
  // =========================================================================
  describe('8. Kỳ Lân Cung (Kirin Bow)', () => {
    it('khi Chém gây sát thương, ưu tiên bắn hạ Ngựa phòng thủ (+1) của đối thủ', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.equipment.weapon = { id: 'kỳ-lân-cung-0-1792972291440_99', name: 'Kỳ Lân Cung' };
      const horseDef = { id: 'h_def_1', name: 'Ngựa Thần (+1)' };
      const horseAtk = { id: 'h_atk_1', name: 'Ngựa Chiến (-1)' };
      p1.equipment.horse_defense = horseDef;
      p1.equipment.horse_attack = horseAtk;

      CombatRules.applyDamage(state, 0, 1, 1, 'slash_normal');

      // Ngựa phòng thủ bị bắn rơi vào discardPile
      expect(p1.equipment.horse_defense).toBeNull();
      expect(p1.equipment.horse_attack).not.toBeNull();
      expect(state.discardPile.some(c => c.id === 'h_def_1')).toBe(true);
    });
  });

  // =========================================================================
  // PHẦN 9: PHÒNG CỤ (BÁT QUÁI, HẮC THUẪN, BẠCH NGÂN SƯ TỬ)
  // =========================================================================
  describe('9. Phòng Cụ (Armor Interactions)', () => {
    it('9.1. Hắc Thuẫn: Miễn nhiễm hoàn toàn Chém màu Đen nhưng nhận sát thương Chém màu Đỏ', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'hắc-thuẫn-0-1792972291440_101', name: 'Hắc Thuẫn' };

      const blackSlash = { id: 'bs1', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      const redSlash = { id: 'rs1', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };

      // Chém đen -> ARMOR_IMMUNE
      const resBlack = CombatRules.playSlash(state, 0, 1, blackSlash);
      expect(resBlack.success).toBe(false);
      expect(resBlack.reason).toBe('ARMOR_IMMUNE');

      p0.turnStats.slashCount = 0; // Reset số lần chém trong lượt để thử chém đỏ

      // Chém đỏ -> Đẩy frame ASK_DODGE
      const resRed = CombatRules.playSlash(state, 0, 1, redSlash);
      expect(resRed.success).toBe(true);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });

    it('9.2. Bát Quái: Khi cần Né, phán xét Đỏ tự động Né thành công', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'bát-quái-0-1792972291440_100', name: 'Bát Quái' };
      const slash = { id: 's1', name: 'Chém', type: 'slash', color: 'red', suit: 'heart' };
      p0.hand.push(slash);

      CombatRules.playSlash(state, 0, 1, slash);

      // Cài đặt lá bài tiếp theo trên drawPile là màu Đỏ (Cơ)
      state.drawPile.push({ id: 'judge_red', name: 'Đào', suit: 'heart', color: 'red' });

      // Kích hoạt Bát Quái
      const result = CombatRules.respondDodge(state, 1, null, { useBagua: true });
      expect(result.dodged).toBe(true);
      expect(p1.hp).toBe(4); // Không mất máu
    });

    it('9.3. Bạch Ngân: Khi bị thay thế bằng giáp mới, hồi 1 HP an toàn', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      p0.hp = 2; // Đang mất máu

      const oldBachNgan = { id: 'bạch-ngân-sư-tử-0-1792972291440_102', name: 'Bạch Ngân Sư Tử' };
      p0.equipment.armor = oldBachNgan;

      const newArmor = { id: 'bát-quái-0-1792972291440_100', name: 'Bát Quái', type: 'equip' };
      p0.hand = [newArmor];

      const dispatcher = new DispatcherV4(state);
      dispatcher.dispatch({ type: 'ACTION_PLAY_CARD', playerId: 0, card: newArmor });

      // Bạch Ngân tháo ra -> hồi 1 HP (2 -> 3)
      expect(p0.hp).toBe(3);
      expect(p0.equipment.armor.name).toBe('Bát Quái');
      expect(state.discardPile.some(c => c.id === oldBachNgan.id)).toBe(true);
    });

    it('9.4. Bạch Ngân: Hóa giải sát thương dồn (nhiều hơn 1 HP chỉ nhận tối đa 1 HP)', () => {
      const state = createMockGameState(4);
      const p1 = state.getPlayer(1);
      p1.hp = 4;
      p1.equipment.armor = { id: 'bạch-ngân-sư-tử-0-1792972291440_102', name: 'Bạch Ngân Sư Tử' };

      // Gây 3 sát thương (VD: Rượu + Hỏa Chém)
      CombatRules.applyDamage(state, 0, 1, 3, 'slash');

      // Do có Bạch Ngân, chỉ bị trừ 1 HP (4 -> 3)
      expect(p1.hp).toBe(3);
    });
  });

  // =========================================================================
  // PHẦN 10: THÚ CƯỠI (NGỰA CHIẾN & NGỰA THẦN)
  // =========================================================================
  describe('10. Thú Cưỡi (Mount System)', () => {
    it('Ngựa Chiến (-1) giảm cự ly tấn công đi 1, Ngựa Thần (+1) tăng cự ly phòng thủ thêm 1', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      // Ban đầu trong bàn 4 người, khoảng cách 0 đến 1 = 1
      expect(RangeSystem.calculateDistance(p0, p1, state.getAlivePlayers())).toBe(1);

      // p1 trang bị Ngựa Thần (+1) -> khoảng cách tăng lên 2
      p1.equipment.horse_defense = { id: 'ngựa-thần-(+1)-0-104', name: 'Ngựa Thần (+1)' };
      expect(RangeSystem.calculateDistance(p0, p1, state.getAlivePlayers())).toBe(2);

      // p0 trang bị Ngựa Chiến (-1) -> khoảng cách giảm lại còn 1
      p0.equipment.horse_attack = { id: 'ngựa-chiến-(-1)-0-103', name: 'Ngựa Chiến (-1)' };
      expect(RangeSystem.calculateDistance(p0, p1, state.getAlivePlayers())).toBe(1);
    });
  });

  // =========================================================================
  // PHẦN 11: TƯƠNG TÁC VŨ KHÍ NÂNG CAO (MƯỢN ĐAO & ON_EQUIP_LOST)
  // =========================================================================
  describe('11. Tương Tác Vũ Khí Nâng Cao (Borrow Weapon & Equip Lost)', () => {
    it('11.1. Mượn Đao: khi mục tiêu không dùng Chém, tịch thu vũ khí và kích hoạt ON_EQUIP_LOST', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const targetWeapon = { id: 'thanh-long-đao-0-1792972291440_94', name: 'Thanh Long Đao' };
      p1.equipment.weapon = targetWeapon;
      p1.mainHeroId = 'ho_xuan_huong';
      p1.heroes = [{ id: 'ho_xuan_huong', skills: ['xuan_huong'] }];
      p1.skills = ['xuan_huong'];
      p1.hand = [];

      // P0 dùng Mượn Đao lên P1, nhắm P2
      state.priorityStack.push({
        type: 'ASK_BORROW_SLASH',
        sourceId: 0,
        targetId: 1,
        currentActorId: 1,
        priorityQueue: [1],
        context: { borrowerId: 0, targetBId: 2, weapon: targetWeapon }
      });

      // P1 từ chối chém -> giao nộp vũ khí cho P0
      const result = TrickRules.respondBorrowSlash(state, 1, null);
      expect(result.surrenderedWeapon).toBe(true);
      expect(p1.equipment.weapon).toBeNull();
      expect(p0.hand.some(c => c.id === targetWeapon.id)).toBe(true);
      // Phát sự kiện ON_EQUIP_LOST -> Hồ Xuân Hương rút 2 bài
      expect(p1.hand.length).toBe(2);
    });

    it('11.2. Song Kiếm ép mục tiêu bỏ Bạch Ngân: tự động hồi 1 HP và phát ON_EQUIP_LOST', () => {
      const state = createMockGameState(4);
      const p0 = state.getPlayer(0); // Nam
      const p1 = state.getPlayer(1); // Nữ
      p1.hp = 2; // Đang mất máu

      p0.equipment.weapon = { id: 'song-kiếm-0-1792972291440_96', name: 'Song Kiếm' };
      const targetArmor = { id: 'bạch-ngân-sư-tử-0-1792972291440_102', name: 'Bạch Ngân Sư Tử' };
      p1.equipment.armor = targetArmor;
      p1.mainHeroId = 'ho_xuan_huong';
      p1.heroes = [{ id: 'ho_xuan_huong', skills: ['xuan_huong'] }];
      p1.skills = ['xuan_huong'];
      p1.hand = []; // Hết bài trên tay -> buộc phải bỏ trang bị

      const slashCard = { id: 'c_slash_test', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      CombatRules.playSlash(state, 0, 1, slashCard, { interactiveSongKiem: false });

      // Bạch Ngân bị ép tháo -> hồi 1 HP (2 -> 3)
      expect(p1.hp).toBe(3);
      expect(p1.equipment.armor).toBeNull();
      // Phát sự kiện ON_EQUIP_LOST -> Hồ Xuân Hương rút 2 bài
      expect(p1.hand.length).toBe(2);
    });
  });
});
