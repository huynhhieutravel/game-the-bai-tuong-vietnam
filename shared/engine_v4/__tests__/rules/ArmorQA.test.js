import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CardDeck } from '../../cards/CardDeck.js';
import { CARDS, CARD_TYPES, CARD_SUBTYPES, getCardSubType } from '../../../data/gameData.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Thẻ Bài Trang Bị: Phòng Cụ (Armor QA Suite v4)', () => {
  const createMockGameState = (customPlayers = null) => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `c_draw_${i}`,
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
        hp: 3,
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
        name: 'Người chơi 2 (Rùa Vàng)',
        hp: 3,
        maxHp: 3,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        heroes: [{ id: 'rua-vang', skills: ['than_giap'] }],
        skills: ['than_giap'],
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
  // PHẦN 1: PHÂN BỔ VÀ NHẬN DIỆN PHÒNG CỤ
  // ==========================================
  describe('1. Danh Mục và Nhận Diện Phòng Cụ (Armor Taxonomy)', () => {
    it('toàn bộ 3 loại Giáp được nhận diện chính xác là CARD_SUBTYPES.EQUIP_ARMOR', () => {
      const bagua = { name: 'Bát Quái', type: CARD_TYPES.EQUIP };
      const blackShield = { name: 'Hắc Thuẫn', type: CARD_TYPES.EQUIP };
      const silverLion = { name: 'Bạch Ngân', type: CARD_TYPES.EQUIP };

      expect(getCardSubType(bagua)).toBe(CARD_SUBTYPES.EQUIP_ARMOR);
      expect(getCardSubType(blackShield)).toBe(CARD_SUBTYPES.EQUIP_ARMOR);
      expect(getCardSubType(silverLion)).toBe(CARD_SUBTYPES.EQUIP_ARMOR);
    });

    it('bộ bài tiêu chuẩn chứa chính xác các lá bài Giáp theo thiết kế chuẩn', () => {
      const deck = CardDeck.getStandardDeck();
      const baguaCards = deck.filter(c => c.name === 'Bát Quái');
      const blackShieldCards = deck.filter(c => c.name === 'Hắc Thuẫn');

      expect(baguaCards.length).toBe(2);
      expect(blackShieldCards.length).toBe(1);
    });
  });

  // ==========================================
  // PHẦN 2: BÁT QUÁI (EIGHT TRIGRAMS)
  // ==========================================
  describe('2. Bát Quái (Eight Trigrams: Phán Xét Đỏ = 1 Né)', () => {
    it('phán xét ĐỎ (Cơ ♥ / Rô ♦) né thành công cú Chém mà không mất bài trên tay', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'bagua_1', name: 'Bát Quái', type: 'armor' };
      p1.hand = [{ id: 'keep_peach', name: 'Đào' }];

      // Đặt lá phán xét ở đỉnh drawPile là Cơ 8 Đỏ (drawCardFromDeck dùng pop nên lá push cuối cùng sẽ được rút đầu tiên)
      state.drawPile.push({ id: 'judge_red', name: 'Đào', suit: 'heart', color: 'red', rank: 8 });

      const slashCard = { id: 's1', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      p0.hand.push(slashCard);

      CombatRules.playSlash(state, 0, 1, slashCard);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // p1 dùng Bát Quái phán xét
      const res = CombatRules.respondDodge(state, 1, null, { useBagua: true });

      expect(res.baguaSuccess).toBe(true);
      expect(res.dodged).toBe(true);
      expect(p1.hp).toBe(3); // Không mất máu
      expect(p1.hand.length).toBe(1); // Bài trên tay vẫn giữ nguyên
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('phán xét ĐEN (Bích ♠ / Nhép ♣) thất bại, người chơi vẫn có quyền đánh lá Né từ tay để né', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'bagua_2', name: 'Bát Quái', type: 'armor' };
      const dodgeOnHand = { id: 'dodge_hand', name: 'Né', type: 'dodge' };
      p1.hand.push(dodgeOnHand);

      // Đặt lá phán xét ở đỉnh drawPile là Bích 10 Đen
      state.drawPile.push({ id: 'judge_black', name: 'Chém', suit: 'spade', color: 'black', rank: 10 });

      const slashCard = { id: 's2', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      p0.hand.push(slashCard);

      CombatRules.playSlash(state, 0, 1, slashCard);

      // Bước 1: Dùng Bát Quái phán xét -> Đen (thất bại)
      const resBagua = CombatRules.respondDodge(state, 1, null, { useBagua: true });
      expect(resBagua.baguaSuccess).toBe(false);
      expect(resBagua.dodged).toBe(false);

      // Frame ASK_DODGE vẫn còn trên stack chờ xử lý
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().context.baguaAttempted).toBe(true);

      // Bước 2: Đánh lá Né từ trên tay
      const resDodge = CombatRules.respondDodge(state, 1, dodgeOnHand);
      expect(resDodge.dodged).toBe(true);
      expect(p1.hp).toBe(3);
      expect(p1.hand.length).toBe(0);
    });

    it('phán xét Bát Quái chỉ được thực hiện tối đa 1 lần cho mỗi lượt yêu cầu Né', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'bagua_3', name: 'Bát Quái', type: 'armor' };
      state.drawPile.push({ id: 'j_fail', suit: 'spade', color: 'black' });

      CombatRules.playSlash(state, 0, 1, { id: 's3', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red' });

      // Lần 1: Thất bại
      CombatRules.respondDodge(state, 1, null, { useBagua: true });

      // Cố phán xét lần 2 -> Tung ngoại lệ
      expect(() => {
        CombatRules.respondDodge(state, 1, null, { useBagua: true });
      }).toThrow(/Bát Quái chỉ được phán xét một lần/);
    });

    it('Bát Quái kích hoạt được khi đối mặt với cẩm nang Loạn Tiễn', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'bagua_rain', name: 'Bát Quái', type: 'armor' };
      state.drawPile.push({ id: 'judge_red_rain', suit: 'heart', color: 'red' });

      const rainCard = { id: 'rain_bagua', idKey: 'loan_tien', name: 'Loạn Tiễn', type: 'trick' };
      p0.hand.push(rainCard);

      TrickRules._executeTrickEffect(state, 0, [1], rainCard);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().context.reason).toBe('van-tien');

      const res = CombatRules.respondDodge(state, 1, null, { useBagua: true });
      expect(res.baguaSuccess).toBe(true);
      expect(res.dodged).toBe(true);
      expect(p1.hp).toBe(3); // Không mất máu từ Loạn Tiễn
    });

    it('đối mặt đòn Chém bắt 2 Né (Nguyễn Xí - Phá Quân): Bát Quái cung cấp 1 Né, cần thêm 1 Né từ tay', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.skills = ['pha_quan_nguyen_xi'];
      p1.equipment.armor = { id: 'bagua_pha_quan', name: 'Bát Quái', type: 'armor' };

      const dodgeHand = { id: 'd_hand', name: 'Né', type: 'dodge' };
      p1.hand.push(dodgeHand);

      state.drawPile.push({ id: 'j_red', suit: 'diamond', color: 'red' });

      const slashCard = { id: 'slash_pq', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      p0.hand.push(slashCard);

      CombatRules.playSlash(state, 0, 1, slashCard);
      expect(state.priorityStack.peek().context.requiredDodges).toBe(2);

      // Phán xét Bát Quái Đỏ -> Cung cấp 1/2 Né
      const resBagua = CombatRules.respondDodge(state, 1, null, { useBagua: true });
      expect(resBagua.baguaSuccess).toBe(true);
      expect(resBagua.pendingMoreDodges).toBe(true);
      expect(state.priorityStack.peek().context.dodgesProvided).toBe(1);

      // Đánh tiếp 1 Né từ tay -> Hoàn tất 2/2 Né
      const resHand = CombatRules.respondDodge(state, 1, dodgeHand);
      expect(resHand.dodged).toBe(true);
      expect(p1.hp).toBe(3);
    });
  });

  // ==========================================
  // PHẦN 3: HẮC THUẪN (RENWANG SHIELD)
  // ==========================================
  describe('3. Hắc Thuẫn (Renwang Shield: Miễn Nhiễm 100% Chém Đen)', () => {
    it('miễn nhiễm tuyệt đối trước lá Chém màu Đen (Bích ♠, Nhép ♣)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'black_shield_1', name: 'Hắc Thuẫn', type: 'armor' };

      // Chém Bích Đen
      const blackSlash = { id: 's_spade', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      p0.hand.push(blackSlash);

      const res = CombatRules.playSlash(state, 0, 1, blackSlash);

      expect(res.success).toBe(false);
      expect(res.reason).toBe('ARMOR_IMMUNE');
      expect(state.priorityStack.isEmpty()).toBe(true); // Không mở frame ASK_DODGE
      expect(p1.hp).toBe(3); // Không mất máu
    });

    it('Chém màu Đỏ (Cơ ♥, Rô ♦) vẫn tấn công bình thường và yêu cầu Né', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'black_shield_2', name: 'Hắc Thuẫn', type: 'armor' };

      const redSlash = { id: 's_heart', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
      p0.hand.push(redSlash);

      const res = CombatRules.playSlash(state, 0, 1, redSlash);

      expect(res.success).not.toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });

    it('Hắc Thuẫn KHÔNG chặn đọ Chém trong Quyết Đấu (Duel)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'black_shield_duel', name: 'Hắc Thuẫn', type: 'armor' };
      const duelCard = { id: 'duel_armor', idKey: 'quyet_dau', name: 'Quyết Đấu', type: 'trick' };
      p0.hand.push(duelCard);

      TrickRules._executeTrickEffect(state, 0, [1], duelCard);
      // p1 không có Chém trong Quyết Đấu
      const resDuel = TrickRules.respondDuel(state, 1, null);

      expect(resDuel.continued).toBe(false);
      expect(p1.hp).toBe(2); // 3 - 1 = 2 (vẫn nhận sát thương Duel dù mang Hắc Thuẫn)
    });

    it('Hắc Thuẫn KHÔNG chặn cẩm nang Dã Man hay Loạn Tiễn', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p1.equipment.armor = { id: 'black_shield_barb', name: 'Hắc Thuẫn', type: 'armor' };
      const barbCard = { id: 'barb_armor', idKey: 'da_man', name: 'Dã Man', type: 'trick' };
      p0.hand.push(barbCard);

      TrickRules._executeTrickEffect(state, 0, [1], barbCard);
      // p1 không ra Chém cản Dã Man
      const res = TrickRules.respondBarbarian(state, 1, null);

      expect(res.defended).toBe(false);
      expect(p1.hp).toBe(2); // Bị mất 1 HP
    });
  });

  // ==========================================
  // PHẦN 4: BẠCH NGÂN (SILVER LION)
  // ==========================================
  describe('4. Bạch Ngân (Silver Lion: Khóa Trần Sát Thương Dồn & Hồi Máu Khi Rời Người)', () => {
    it('khóa trần sát thương dồn lớn hơn 1 (như Sấm Sét 3 HP, Chém có Rượu 2 HP) xuống còn đúng 1 HP', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      p1.equipment.armor = { id: 'bach_ngan_armor', name: 'Bạch Ngân', type: 'armor' };

      // 1. Sát thương Sấm Sét (3 HP)
      CombatRules.applyDamage(state, null, 1, 3, 'lightning');
      expect(p1.hp).toBe(2); // 3 - 1 = 2 (chỉ mất đúng 1 HP thay vì 3)

      // 2. Sát thương Chém dồn Rượu (2 HP)
      CombatRules.applyDamage(state, 0, 1, 2, 'slash');
      expect(p1.hp).toBe(1); // 2 - 1 = 1 (chỉ mất đúng 1 HP thay vì 2)
    });

    it('hồi 1 HP khi bị Cướp Bài lấy giáp', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.hp = 2; // Bị thương: 2/4 HP
      p1.equipment.armor = { id: 'bn_steal', name: 'Bạch Ngân', type: 'armor' };

      const stealCard = { id: 'st_1', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      p0.hand.push(stealCard);

      TrickRules._executeTrickEffect(state, 0, [1], stealCard, { targetCardId: 'bn_steal' });

      expect(p1.equipment.armor).toBeNull();
      expect(p1.hp).toBe(3); // 2 + 1 = 3 HP
      expect(p0.hand.some(c => c.id === 'bn_steal')).toBe(true);
    });

    it('hồi 1 HP khi bị Tước Bài hủy giáp', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.hp = 1; // 1/4 HP
      p1.equipment.armor = { id: 'bn_dismantle', name: 'Bạch Ngân', type: 'armor' };

      const dismantleCard = { id: 'dm_1', idKey: 'tuoc_bai', name: 'Tước Bài', type: 'trick' };
      p0.hand.push(dismantleCard);

      TrickRules._executeTrickEffect(state, 0, [1], dismantleCard, { targetCardId: 'bn_dismantle' });

      expect(p1.equipment.armor).toBeNull();
      expect(p1.hp).toBe(2); // 1 + 1 = 2 HP
      expect(state.discardPile.some(c => c.id === 'bn_dismantle')).toBe(true);
    });

    it('hồi 1 HP khi trang bị Giáp mới đè lên Giáp Bạch Ngân cũ', () => {
      const state = createMockGameState();
      const dispatcher = new DispatcherV4(state);
      const p1 = state.getPlayer(1);
      p1.hp = 2; // 2/4 HP
      p1.equipment.armor = { id: 'bn_old', name: 'Bạch Ngân', type: 'equip', subtype: 'equip_armor' };

      const newArmor = { id: 'new_bagua', name: 'Bát Quái', type: 'equip', subtype: 'equip_armor' };
      p1.hand.push(newArmor);

      dispatcher.dispatchAction({ type: 'PLAY_CARD', playerId: 1, cardId: 'new_bagua' });

      expect(p1.equipment.armor.id).toBe('new_bagua');
      expect(p1.hp).toBe(3); // 2 + 1 = 3 HP
      expect(state.discardPile.some(c => c.id === 'bn_old')).toBe(true);
    });

    it('khi đang đầy máu (Max HP), hồi máu Bạch Ngân không làm vượt quá Max HP', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.hp = 4; // 4/4 HP đầy
      p1.equipment.armor = { id: 'bn_full', name: 'Bạch Ngân', type: 'armor' };

      const dismantleCard = { id: 'dm_2', idKey: 'tuoc_bai', name: 'Tước Bài', type: 'trick' };
      p0.hand.push(dismantleCard);

      TrickRules._executeTrickEffect(state, 0, [1], dismantleCard, { targetCardId: 'bn_full' });

      expect(p1.hp).toBe(4); // Vẫn giữ nguyên 4/4
    });
  });

  // ==========================================
  // PHẦN 5: BẤT BIẾN Ô GIÁP & THẦN GIÁP RÙA VÀNG
  // ==========================================
  describe('5. Bất Biến Ô Giáp & Kỹ Năng Thần Giáp (Rùa Vàng)', () => {
    it('Rùa Vàng khi KHÔNG CÓ GIÁP tự động kích hoạt Thần Giáp phán xét Đỏ né đòn', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2); // Rùa Vàng

      p0.equipment.weapon = { id: 'w_range3', name: 'Thanh Long Đao', range: 3 };
      expect(p2.equipment.armor).toBeNull();
      state.drawPile.push({ id: 'j_turtle_red', suit: 'heart', color: 'red' });

      const slashCard = { id: 's_turtle', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red' };
      p0.hand.push(slashCard);

      CombatRules.playSlash(state, 0, 2, slashCard);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // Rùa Vàng dùng Thần Giáp
      const res = CombatRules.respondDodge(state, 2, null, { useBagua: true });
      expect(res.baguaSuccess).toBe(true);
      expect(res.dodged).toBe(true);
      expect(p2.hp).toBe(3); // Không mất máu
    });

    it('Rùa Vàng trang bị Hắc Thuẫn: Giáp Hắc Thuẫn thay thế trực tiếp và có hiệu lực chặn Chém Đen', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      p0.equipment.weapon = { id: 'w_range3', name: 'Thanh Long Đao', range: 3 };
      p2.equipment.armor = { id: 'turtle_shield', name: 'Hắc Thuẫn', type: 'armor' };

      const blackSlash = { id: 's_black_turtle', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
      p0.hand.push(blackSlash);

      // Chém đen lên Rùa Vàng mang Hắc Thuẫn -> Bị chặn đứng trực tiếp
      const res = CombatRules.playSlash(state, 0, 2, blackSlash);
      expect(res.success).toBe(false);
      expect(res.reason).toBe('ARMOR_IMMUNE');
      expect(p2.hp).toBe(3);
    });

    it('Rùa Vàng trang bị Bạch Ngân: Khóa trần sát thương dồn về 1 HP', () => {
      const state = createMockGameState();
      const p2 = state.getPlayer(2);

      p2.equipment.armor = { id: 'turtle_silver', name: 'Bạch Ngân', type: 'armor' };

      // Chịu 3 sát thương Sấm Sét
      CombatRules.applyDamage(state, null, 2, 3, 'lightning');
      expect(p2.hp).toBe(2); // 3 - 1 = 2 (Bạch Ngân khóa trần còn 1)
    });
  });
});
