import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { TargetResolverV4, getTargetingDefinition } from '../../rules/TargetResolverV4.js';
import { CardDeck } from '../../cards/CardDeck.js';
import { CARDS, TRICK_CARDS_INFO, CARD_TYPES, CARD_SUBTYPES, getCardSubType } from '../../../data/gameData.js';
import { validateDeck } from '../../../validators/deckValidator.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Thẻ Bài Cẩm Nang (Trick Cards QA Suite v4)', () => {
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
        name: 'Người chơi 0 (Source)',
        hp: 3,
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
        name: 'Người chơi 1 (Target A)',
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
        name: 'Người chơi 2 (Target B)',
        hp: 2,
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
  // PHẦN 1: BỘ BÀI VÀ PHÂN BỔ THẺ CẨM NANG
  // ==========================================
  describe('1. Phân bổ Thẻ Bài Cẩm Nang trong Standard Deck (106 Cards)', () => {
    it('bộ bài tiêu chuẩn chứa chính xác 35 lá Cẩm nang (11 loại cẩm nang)', () => {
      const deck = CardDeck.getStandardDeck();
      expect(deck.length).toBe(106);

      const tricks = deck.filter(c => c.type === CARD_TYPES.TRICK);
      expect(tricks.length).toBe(35);

      const counts = {};
      for (const t of tricks) {
        counts[t.name] = (counts[t.name] || 0) + 1;
      }

      expect(counts['Quyết Đấu']).toBe(3);
      expect(counts['Cướp Bài']).toBe(5);
      expect(counts['Tước Bài']).toBe(5);
      expect(counts['Mượn Đao']).toBe(2);
      expect(counts['Loạn Tiễn']).toBe(1);
      expect(counts['Dã Man']).toBe(3);
      expect(counts['Hồi Xuân']).toBe(1);
      expect(counts['Hóa Giải']).toBe(4);
      expect(counts['Sấm Sét']).toBe(2);
      expect(counts['Hỗn Loạn']).toBe(3);
      expect(counts['Xiềng Xích']).toBe(6);

      const totalTricks = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(totalTricks).toBe(35);
    });

    it('phân loại chính xác Normal Trick vs Delayed Trick', () => {
      const normalTricks = ['Quyết Đấu', 'Cướp Bài', 'Tước Bài', 'Mượn Đao', 'Loạn Tiễn', 'Dã Man', 'Hồi Xuân', 'Hóa Giải', 'Xiềng Xích'];
      for (const name of normalTricks) {
        expect(getCardSubType({ name, type: CARD_TYPES.TRICK })).toBe(CARD_SUBTYPES.TRICK_NORMAL);
      }

      const delayedTricks = ['Sấm Sét', 'Hỗn Loạn'];
      for (const name of delayedTricks) {
        expect(getCardSubType({ name, type: CARD_TYPES.TRICK })).toBe(CARD_SUBTYPES.TRICK_DELAYED);
      }
    });

    it('deckValidator xác nhận tính toàn vẹn của 106 lá bài không có lỗi', () => {
      const validation = validateDeck(CARDS);
      expect(validation).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 2: QUYẾT ĐẤU (DUEL) & BẤT BIẾN RƯỢU
  // ==========================================
  describe('2. Quyết Đấu (Duel) & Bất biến Sát thương Rượu', () => {
    it('target ra Chém trước -> đổi lượt sang source -> source ra Chém -> target không có Chém -> target mất 1 HP', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const duelCard = { id: 'duel_1', idKey: 'quyet_dau', name: 'Quyết Đấu', type: 'trick' };
      const slashTarget = { id: 'slash_t', idKey: 'slash', name: 'Chém', type: 'slash' };
      const slashSource = { id: 'slash_s', idKey: 'slash', name: 'Chém', type: 'slash' };

      p0.hand.push(duelCard, slashSource);
      p1.hand.push(slashTarget);

      // p0 chơi Quyết Đấu lên p1 (bỏ qua Hóa Giải)
      TrickRules._executeTrickEffect(state, 0, [1], duelCard);
      expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');
      expect(state.priorityStack.peek().currentActorId).toBe(1);

      // Lượt 1: p1 ra Chém
      const res1 = TrickRules.respondDuel(state, 1, slashTarget);
      expect(res1.continued).toBe(true);
      expect(res1.nextPlayerId).toBe(0);

      // Lượt 2: p0 ra Chém
      const res2 = TrickRules.respondDuel(state, 0, slashSource);
      expect(res2.continued).toBe(true);
      expect(res2.nextPlayerId).toBe(1);

      // Lượt 3: p1 hết Chém (chọn null) -> p1 thua, mất 1 HP
      const res3 = TrickRules.respondDuel(state, 1, null);
      expect(res3.continued).toBe(false);
      expect(res3.loserId).toBe(1);
      expect(p1.hp).toBe(2); // 3 -> 2
      expect(p0.turnStats.damageDealt).toBe(1);
    });

    it('Rượu KHÔNG tăng sát thương cho Quyết Đấu (Decision Q5: Duel Non-wine Invariant)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      p0.drankWine = true;
      p0.turnStats.wineCount = 1;
      p0.temporaryFlags = { wineActive: true };

      const duelCard = { id: 'duel_wine', idKey: 'quyet_dau', name: 'Quyết Đấu', type: 'trick' };
      p0.hand.push(duelCard);

      TrickRules._executeTrickEffect(state, 0, [1], duelCard);
      // p1 không có Chém
      const res = TrickRules.respondDuel(state, 1, null);
      expect(res.continued).toBe(false);
      expect(p1.hp).toBe(2); // Giảm ĐÚNG 1 HP (không bị tăng lên 2)
      // Trạng thái rượu của p0 không bị tiêu hao bởi Duel
      expect(p0.drankWine).toBe(true);
    });

    it('Lang Liêu kích hoạt Đạm Bạc khi hết bài trên tay thì không thể bị chọn làm mục tiêu Quyết Đấu', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      p1.hand = []; // Hết bài trên tay
      p1.heroes = [{ id: 'lang-lieu', skills: ['dam_bac'] }];

      const targetDef = getTargetingDefinition(state, 0, 'quyet-dau');
      const validTargets = targetDef.filter(state, state.getPlayer(0));
      expect(validTargets.some(t => t.id === 1)).toBe(false);
    });
  });

  // ==========================================
  // PHẦN 3: CƯỚP BÀI (SNATCH / STEAL)
  // ==========================================
  describe('3. Cướp Bài (Steal) & Ràng buộc Cự ly <= 1', () => {
    it('chỉ có thể chọn mục tiêu trong cự ly <= 1', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);

      // p1 có bài, cự ly 1 -> hợp lệ
      p1.hand.push({ id: 'card_p1', name: 'Chém', type: 'slash' });
      // p2 có bài nhưng thêm ngựa phòng thủ +1 khiến cự ly từ p0 đến p2 > 1
      p2.hand.push({ id: 'card_p2', name: 'Né', type: 'dodge' });
      p2.equipment.horse_defense = { id: 'horse_def', name: 'Ngựa Thần (+1)' };

      const targetDef = getTargetingDefinition(state, 0, 'cuop-bai');
      const validTargets = targetDef.filter(state, p0);

      expect(validTargets.some(t => t.id === 1)).toBe(true);
      expect(validTargets.some(t => t.id === 2)).toBe(false);
    });

    it('cướp bài từ tay: bài chuyển từ tay mục tiêu sang tay người cướp', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const targetCard = { id: 'target_card_1', name: 'Đào', type: 'peach' };
      p1.hand.push(targetCard);

      const snatchCard = { id: 'snatch_1', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      p0.hand.push(snatchCard);

      TrickRules._executeTrickEffect(state, 0, [1], snatchCard, { targetCardId: 'target_card_1' });

      expect(p1.hand.some(c => c.id === 'target_card_1')).toBe(false);
      expect(p0.hand.some(c => c.id === 'target_card_1')).toBe(true);
    });

    it('cướp trang bị Bạch Ngân: trang bị chuyển sang tay người cướp và mục tiêu được hồi 1 HP', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.hp = 2; // Bị thương: 2/4 HP
      const bachNgan = { id: 'bach_ngan_1', name: 'Bạch Ngân', type: 'armor' };
      p1.equipment.armor = bachNgan;

      const snatchCard = { id: 'snatch_2', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      p0.hand.push(snatchCard);

      TrickRules._executeTrickEffect(state, 0, [1], snatchCard, { targetCardId: 'bach_ngan_1' });

      expect(p1.equipment.armor).toBeNull();
      expect(p0.hand.some(c => c.id === 'bach_ngan_1')).toBe(true);
      expect(p1.hp).toBe(3); // Hồi phục 1 HP từ nội tại Bạch Ngân rời khỏi người
    });

    it('cướp bài trong khu Phán xét: lấy cẩm nang trì hoãn trên người mục tiêu', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const delayedTrick = { id: 'hon_loan_judge', name: 'Hỗn Loạn', idKey: 'hon_loan', type: 'trick' };
      p1.judgementArea.push(delayedTrick);

      const snatchCard = { id: 'snatch_3', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      p0.hand.push(snatchCard);

      TrickRules._executeTrickEffect(state, 0, [1], snatchCard, { targetCardId: 'hon_loan_judge' });

      expect(p1.judgementArea).toHaveLength(0);
      expect(p0.hand.some(c => c.id === 'hon_loan_judge')).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 4: TƯỚC BÀI (DISMANTLE)
  // ==========================================
  describe('4. Tước Bài (Dismantle) & Toàn Cầu Cự Ly', () => {
    it('cho phép chọn mục tiêu ở bất kỳ khoảng cách nào (Global Range)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p3 = state.getPlayer(3);
      p3.hand.push({ id: 'card_p3', name: 'Rượu', type: 'wine' });
      p3.equipment.horse_defense = { id: 'horse_def_3', name: 'Ngựa Thần (+1)' };

      const targetDef = getTargetingDefinition(state, 0, 'tuoc-bai');
      const validTargets = targetDef.filter(state, p0);

      expect(validTargets.some(t => t.id === 3)).toBe(true);
    });

    it('tước bài từ trang bị đưa vào discardPile và kích hoạt hồi máu Bạch Ngân nếu có', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.hp = 1;
      p1.equipment.armor = { id: 'bach_ngan_dismantle', name: 'Bạch Ngân', type: 'armor' };

      const dismantleCard = { id: 'tuoc_1', idKey: 'tuoc_bai', name: 'Tước Bài', type: 'trick' };
      p0.hand.push(dismantleCard);

      TrickRules._executeTrickEffect(state, 0, [1], dismantleCard, { targetCardId: 'bach_ngan_dismantle' });

      expect(p1.equipment.armor).toBeNull();
      expect(state.discardPile.some(c => c.id === 'bach_ngan_dismantle')).toBe(true);
      expect(p1.hp).toBe(2); // Hồi 1 HP
    });
  });

  // ==========================================
  // PHẦN 5: MƯỢN ĐAO (BORROW SWORD)
  // ==========================================
  describe('5. Mượn Đao Giết Người (Borrow Sword) & Bất biến Passive Slash', () => {
    it('bắt buộc Target A phải có Vũ khí và Target B phải nằm trong tầm đánh của Target A', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);

      p1.equipment.weapon = { id: 'weapon_sword', name: 'Thanh Long Đao', range: 3 };

      const targetDef = getTargetingDefinition(state, 0, 'muon-dao');
      expect(targetDef.type).toBe('sequence');

      const step1Targets = targetDef.steps[0].filter(state, p0);
      expect(step1Targets.some(t => t.id === 1)).toBe(true);
      expect(step1Targets.some(t => t.id === 2)).toBe(false); // p2 không có vũ khí

      const step2Targets = targetDef.steps[1].filter(state, p0, [1]);
      expect(step2Targets.some(t => t.id === 2)).toBe(true);
    });

    it('Target A đồng ý Chém Target B -> isRedirected = true, không tiêu tốn lượt Chém của Target A', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);

      p1.equipment.weapon = { id: 'w_tl', name: 'Thanh Long Đao', range: 3 };
      p1.turnStats.slashCount = 1; // Giả sử p1 đã dùng hết 1 lượt Chém trong lượt của mình
      const slashCard = { id: 'slash_forced', name: 'Chém', type: 'slash' };
      p1.hand.push(slashCard);

      const borrowCard = { id: 'muon_dao_1', name: 'Mượn Đao', idKey: 'muon_dao', type: 'trick' };
      p0.hand.push(borrowCard);

      // Thực thi Mượn Đao
      TrickRules._executeTrickEffect(state, 0, [1, 2], borrowCard);
      expect(state.priorityStack.peek().type).toBe('ASK_BORROW_SLASH');

      // p1 đồng ý Chém p2
      const res = TrickRules.respondBorrowSlash(state, 1, slashCard);
      expect(res.slashed).toBe(true);

      // p1 không bị tăng slashCount vì là đòn chém cưỡng chế / chuyển hướng
      expect(p1.turnStats.slashCount).toBe(1);
      // Đòn Chém chuyển sang p2 đang chờ Né
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(2);
    });

    it('Target A từ chối Chém -> Vũ khí bị tước và chuyển vào tay người mượn đao (Source)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const weapon = { id: 'w_surrender', name: 'Rìu Đá', range: 3 };
      p1.equipment.weapon = weapon;

      const borrowCard = { id: 'muon_dao_2', name: 'Mượn Đao', idKey: 'muon_dao', type: 'trick' };
      p0.hand.push(borrowCard);

      TrickRules._executeTrickEffect(state, 0, [1, 2], borrowCard);
      const res = TrickRules.respondBorrowSlash(state, 1, null);

      expect(res.surrenderedWeapon).toBe(true);
      expect(p1.equipment.weapon).toBeNull();
      expect(p0.hand.some(c => c.id === 'w_surrender')).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 6: LOẠN TIỄN & DÃ MAN (AOE TRICKS)
  // ==========================================
  describe('6. Cẩm nang Toàn Bàn (AOE: Loạn Tiễn & Dã Man) & Hóa Giải Đơn Thể', () => {
    it('Loạn Tiễn thực thi ngay (bỏ qua negate chain toàn bàn), từng mục tiêu ra Né hoặc chịu 1 sát thương', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);
      const p3 = state.getPlayer(3);

      const rainCard = { id: 'rain_1', idKey: 'loan_tien', name: 'Loạn Tiễn', type: 'trick' };
      p0.hand.push(rainCard);

      // p1 có lá Né
      const dodge1 = { id: 'dodge_p1', name: 'Né', type: 'dodge' };
      p1.hand.push(dodge1);

      // Chơi Loạn Tiễn
      TrickRules.playArrowRain(state, 0, rainCard);

      // Vì là AOE: PriorityStack có 3 frames ASK_DODGE cho p3, p2, p1 (theo thứ tự lùi hoặc tiến)
      expect(state.priorityStack.size()).toBe(3);

      // Xử lý frame đỉnh: p3 không có Né -> chịu 1 damage
      const topFrame = state.priorityStack.peek();
      const topTargetId = topFrame.targetId;
      const topPlayer = state.getPlayer(topTargetId);
      const initialHp = topPlayer.hp;
      CombatRules.respondDodge(state, topTargetId, null);
      expect(topPlayer.hp).toBe(initialHp - 1);
    });

    it('Mục tiêu trong Loạn Tiễn có thể tự dùng lá [Hóa Giải] của riêng mình để bảo vệ bản thân (Single-target Hóa Giải)', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const rainCard = { id: 'rain_2', idKey: 'loan_tien', name: 'Loạn Tiễn', type: 'trick' };
      p0.hand.push(rainCard);

      const negateCard = { id: 'negate_self', idKey: 'hoa_giai', name: 'Hóa Giải', type: 'trick' };
      p1.hand.push(negateCard);

      TrickRules._executeTrickEffect(state, 0, [1], rainCard);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().context.reason).toBe('van-tien');

      // p1 dùng lá Hóa Giải để tự vệ
      const res = CombatRules.respondDodge(state, 1, negateCard);
      expect(res.dodged).toBe(true);
      expect(res.negatedSingle).toBe(true);
      expect(p1.hp).toBe(3); // Không mất máu
    });

    it('Dã Man: Mục tiêu có thể dùng Chém hoặc Hóa Giải đơn thể để cản đợt tấn công', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);

      const barbarianCard = { id: 'barb_1', idKey: 'da_man', name: 'Dã Man', type: 'trick' };
      p0.hand.push(barbarianCard);

      const slashCard = { id: 'slash_def', name: 'Chém', type: 'slash' };
      p1.hand.push(slashCard);
      const negateCard = { id: 'negate_def', idKey: 'hoa_giai', name: 'Hóa Giải', type: 'trick' };
      p2.hand.push(negateCard);

      TrickRules._executeTrickEffect(state, 0, [1, 2], barbarianCard);

      // Frame 1: p2 dùng Hóa Giải
      const resP2 = TrickRules.respondBarbarian(state, 2, negateCard);
      expect(resP2.defended).toBe(true);
      expect(resP2.negatedSingle).toBe(true);
      expect(p2.hp).toBe(2); // Không mất máu

      // Frame 2: p1 dùng Chém
      const resP1 = TrickRules.respondBarbarian(state, 1, slashCard);
      expect(resP1.defended).toBe(true);
      expect(p1.hp).toBe(3); // Không mất máu
    });
  });

  // ==========================================
  // PHẦN 7: HỒI XUÂN (PEACH GARDEN)
  // ==========================================
  describe('7. Hồi Xuân (Peach Garden)', () => {
    it('thực thi ngay lập tức, hồi 1 HP cho tất cả người chơi bị thương và không vượt quá Max HP', () => {
      const state = createMockGameState();
      // p0: 3/4 HP, p1: 3/4 HP, p2: 2/4 HP, p3: 4/4 HP (đầy máu)
      const gardenCard = { id: 'garden_qa', idKey: 'hoi_xuan', name: 'Hồi Xuân', type: 'trick' };
      state.getPlayer(0).hand.push(gardenCard);

      TrickRules.playPeachGarden(state, 0, gardenCard);

      expect(state.getPlayer(0).hp).toBe(4); // 3 -> 4
      expect(state.getPlayer(1).hp).toBe(4); // 3 -> 4
      expect(state.getPlayer(2).hp).toBe(3); // 2 -> 3
      expect(state.getPlayer(3).hp).toBe(4); // 4 -> 4 (không hồi quá Max HP)
    });
  });

  // ==========================================
  // PHẦN 8: VÔ TRUNG SINH HỮU (DRAW TWO)
  // ==========================================
  describe('8. Vô Trung Sinh Hữu (Draw Two)', () => {
    it('người chơi rút 2 lá bài từ drawPile khi cẩm nang thành công', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const drawCard = { id: 'vo_trung_1', idKey: 'vo_trung_sinh_huu', name: 'Vô Trung Sinh Hữu', type: 'trick' };
      p0.hand.push(drawCard);

      TrickRules.playTrick(state, 0, [0], drawCard);
      // Không ai Hóa Giải (mọi người skip)
      TrickRules.respondNegate(state, 0, null);
      TrickRules.respondNegate(state, 1, null);
      TrickRules.respondNegate(state, 2, null);
      TrickRules.respondNegate(state, 3, null);

      expect(p0.hand.length).toBe(2); // Đã rút 2 lá bài
    });

    it('Hóa Giải đơn thể chặn đứng Vô Trung Sinh Hữu thành công', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const drawCard = { id: 'vo_trung_2', idKey: 'vo_trung_sinh_huu', name: 'Vô Trung Sinh Hữu', type: 'trick' };
      p0.hand.push(drawCard);
      const negateCard = { id: 'negate_1', idKey: 'hoa_giai', name: 'Hóa Giải', type: 'trick' };
      p1.hand.push(negateCard);

      TrickRules.playTrick(state, 0, [0], drawCard);

      // p0 bỏ qua
      TrickRules.respondNegate(state, 0, null);
      // p1 dùng Hóa Giải
      TrickRules.respondNegate(state, 1, negateCard);
      // Kết thúc vòng hỏi Hóa Giải
      TrickRules.respondNegate(state, 0, null);
      TrickRules.respondNegate(state, 2, null);
      TrickRules.respondNegate(state, 3, null);

      expect(p0.hand.length).toBe(0); // Không rút được lá bài nào
    });
  });

  // ==========================================
  // PHẦN 9: XIỀNG XÍCH & TRUYỀN SÁT THƯƠNG
  // ==========================================
  describe('9. Xiềng Xích (Iron Chain) & Truyền Sát Thương Lôi Hỏa (Decisions Q2, Q3)', () => {
    it('cho phép xích / tháo xích 1 hoặc 2 mục tiêu', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);

      const chainCard = { id: 'chain_qa', idKey: 'xieng_xich', name: 'Xiềng Xích', type: 'trick' };

      TrickRules._executeTrickEffect(state, 0, [1, 2], chainCard);
      expect(p1.isChained).toBe(true);
      expect(p2.isChained).toBe(true);

      // Chơi lần 2 để tháo xích
      TrickRules._executeTrickEffect(state, 0, [1], chainCard);
      expect(p1.isChained).toBe(false);
      expect(p2.isChained).toBe(true);
    });

    it('Rèn Lại (Reforge): Không chọn mục tiêu -> bỏ lá bài rút 1 lá bài mới', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const chainCard = { id: 'chain_reforge', idKey: 'xieng_xich', name: 'Xiềng Xích', type: 'trick' };
      p0.hand.push(chainCard);

      TrickRules.playIronChain(state, 0, [], chainCard, { reforge: true });

      expect(p0.hand.length).toBe(1);
      expect(p0.hand[0].id).not.toBe('chain_reforge');
    });

    it('Sát thương HỎA (Fire) truyền qua toàn bộ người chơi đang bị xích và tháo xích tất cả', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);
      p1.isChained = true;
      p2.isChained = true;

      // Áp dụng 1 sát thương Hỏa lên p1
      CombatRules.applyDamage(state, 0, 1, 1, 'fire');

      expect(p1.hp).toBe(2); // 3 -> 2
      expect(p1.isChained).toBe(false); // Tháo xích p1

      expect(p2.hp).toBe(1); // 2 -> 1 (nhận sát thương truyền)
      expect(p2.isChained).toBe(false); // Tháo xích p2
    });

    it('Sát thương SẤM SÉT (Lightning) truyền qua toàn bộ người chơi đang bị xích và tháo xích tất cả', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);
      p1.isChained = true;
      p2.isChained = true;

      // Sấm sét đánh p1 3 damage
      CombatRules.applyDamage(state, null, 1, 3, 'lightning');

      expect(p1.hp).toBe(0); // 3 -> 0 (hấp hối)
      expect(p1.isChained).toBe(false);

      expect(p2.hp).toBe(-1); // 2 - 3 = -1 (nhận sát thương truyền lôi hỏa)
      expect(p2.isChained).toBe(false);
    });

    it('Sát thương Chém vật lý thông thường KHÔNG truyền qua xích và KHÔNG tháo xích', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      const p2 = state.getPlayer(2);
      p1.isChained = true;
      p2.isChained = true;

      // Chém bình thường (normal / slash)
      CombatRules.applyDamage(state, 0, 1, 1, 'slash');

      expect(p1.hp).toBe(2);
      expect(p1.isChained).toBe(true); // Vẫn còn xích

      expect(p2.hp).toBe(2); // p2 không bị ảnh hưởng
      expect(p2.isChained).toBe(true);
    });
  });

  // ==========================================
  // PHẦN 10: CẨM NANG TRÌ HOÃN (DELAYED TRICKS)
  // ==========================================
  describe('10. Cẩm nang Trì hoãn: Sấm Sét, Hỗn Loạn, Binh Lương Thốn Đoạn', () => {
    it('Sấm Sét: Phán xét Bích 2-9 nổ 3 sát thương lôi hỏa; nếu không nổ chuyển sang người kế tiếp', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const lightningCard = { id: 'lightning_card', name: 'Sấm Sét', idKey: 'sam_set', type: 'trick' };

      // Trường hợp 1: Không nổ (Cơ 7)
      const judgeSafe = { id: 'safe_judge', name: 'Đào', suit: 'heart', rank: 7, color: 'red' };
      TrickRules._finalizeDelayedJudgement(state, p0, lightningCard, judgeSafe);

      // Chuyển sang khu phán xét của p1
      expect(p0.judgementArea).toHaveLength(0);
      expect(p1.judgementArea.some(c => c.name === 'Sấm Sét')).toBe(true);
      expect(p0.hp).toBe(3); // Không mất máu

      // Trường hợp 2: NỔ TRÚNG (Bích 5)
      const judgeExplode = { id: 'explode_judge', name: 'Chém', suit: 'spade', rank: 5, color: 'black' };
      TrickRules._finalizeDelayedJudgement(state, p1, lightningCard, judgeExplode);

      expect(p1.hp).toBe(0); // 3 - 3 = 0
      expect(state.discardPile.some(c => c.name === 'Sấm Sét')).toBe(true);
    });

    it('Hỗn Loạn: Phán xét KHÔNG PHẢI CƠ -> mất Giai đoạn Ra bài; phán xét CƠ -> thoát thành công', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      const chaosCard = { id: 'chaos_card', name: 'Hỗn Loạn', idKey: 'hon_loan', type: 'trick' };

      // Phán xét Bích (không phải Cơ)
      const judgeFail = { id: 'judge_spade', suit: 'spade', rank: 10, color: 'black' };
      TrickRules._finalizeDelayedJudgement(state, p1, chaosCard, judgeFail);

      expect(p1.temporaryFlags.skipActionPhase).toBe(true);

      // Phán xét Cơ (thoát)
      p1.temporaryFlags.skipActionPhase = false;
      const judgePass = { id: 'judge_heart', suit: 'heart', rank: 8, color: 'red' };
      TrickRules._finalizeDelayedJudgement(state, p1, chaosCard, judgePass);

      expect(p1.temporaryFlags.skipActionPhase).toBe(false);
    });

    it('Binh Lương Thốn Đoạn: Phán xét KHÔNG PHẢI NHÉP -> mất Giai đoạn Rút bài; phán xét NHÉP -> thoát', () => {
      const state = createMockGameState();
      const p1 = state.getPlayer(1);
      const starvCard = { id: 'starv_card', name: 'Binh Lương Thốn Đoạn', idKey: 'binh_luong', type: 'trick' };

      // Phán xét Rô (không phải Nhép)
      const judgeFail = { id: 'judge_dia', suit: 'diamond', rank: 9, color: 'red' };
      TrickRules._finalizeDelayedJudgement(state, p1, starvCard, judgeFail);

      expect(p1.temporaryFlags.skipDrawPhase).toBe(true);

      // Phán xét Nhép (Club)
      p1.temporaryFlags.skipDrawPhase = false;
      const judgePass = { id: 'judge_club', suit: 'club', rank: 4, color: 'black' };
      TrickRules._finalizeDelayedJudgement(state, p1, starvCard, judgePass);

      expect(p1.temporaryFlags.skipDrawPhase).toBe(false);
    });

    it('Binh Lương Thốn Đoạn kiểm tra khoảng cách <= 1 khi đặt vào khu phán xét', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2); // Trong bàn 4 người (0, 1, 2, 3), ghế 2 đối diện ghế 0 (cự ly = 2)

      const starvCard = { id: 'starv_play', name: 'Binh Lương Thốn Đoạn', idKey: 'binh_luong', type: 'trick' };
      p0.hand.push(starvCard);

      expect(() => {
        TrickRules.playStarvation(state, 0, 2, starvCard);
      }).toThrow(/cự ly <= 1/);
    });
  });

  // ==========================================
  // PHẦN 11: HỎA CÔNG (FIRE ATTACK)
  // ==========================================
  describe('11. Hỏa Công (Fire Attack)', () => {
    it('mục tiêu để lộ 1 lá bài; người chơi bỏ 1 lá bài cùng chất gây 1 sát thương Lửa', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const fireTrick = { id: 'fc_1', name: 'Hỏa Công', idKey: 'hoa_cong', type: 'trick' };
      const targetCard = { id: 'target_heart', name: 'Đào', suit: 'heart', color: 'red' };
      const sourceCard = { id: 'source_heart', name: 'Chém', suit: 'heart', color: 'red' };

      p0.hand.push(fireTrick, sourceCard);
      p1.hand.push(targetCard);

      // Bắt đầu Hỏa Công
      TrickRules._executeTrickEffect(state, 0, [1], fireTrick);
      expect(state.priorityStack.peek().type).toBe('ASK_HOACONG_REVEAL');

      // Bước 1: p1 để lộ lá bài Cơ
      const resReveal = TrickRules.respondHoaCongReveal(state, 1, targetCard);
      expect(resReveal.success).toBe(true);
      expect(state.priorityStack.peek().type).toBe('ASK_HOACONG_DISCARD');

      // Bước 2: p0 bỏ lá bài Cơ cùng chất
      const resDiscard = TrickRules.respondHoaCongDiscard(state, 0, sourceCard);
      expect(resDiscard.success).toBe(true);
      expect(p1.hp).toBe(2); // 3 -> 2 (chịu 1 sát thương Lửa)
    });

    it('người ra bài không có bài cùng chất hoặc từ chối bỏ -> Hỏa Công không gây sát thương', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const fireTrick = { id: 'fc_2', name: 'Hỏa Công', idKey: 'hoa_cong', type: 'trick' };
      const targetCard = { id: 'target_spade', name: 'Chém', suit: 'spade', color: 'black' };
      const sourceCard = { id: 'source_heart_mismatch', name: 'Chém', suit: 'heart', color: 'red' };

      p0.hand.push(fireTrick, sourceCard);
      p1.hand.push(targetCard);

      TrickRules._executeTrickEffect(state, 0, [1], fireTrick);
      TrickRules.respondHoaCongReveal(state, 1, targetCard);

      // Bỏ lá bài sai chất
      const resMismatch = TrickRules.respondHoaCongDiscard(state, 0, sourceCard);
      expect(resMismatch.success).toBe(false);
      expect(resMismatch.reason).toBe('SUIT_MISMATCH');
      expect(p1.hp).toBe(3); // Không mất máu
    });
  });

  // ==========================================
  // PHẦN 12: BẤT BIẾN HÓA GIẢI (NEGATE PARITY)
  // ==========================================
  describe('12. Bất biến Chuỗi Hóa Giải (Negate Chain Parity)', () => {
    it('1 lần Hóa Giải (lẻ) làm vô hiệu hóa cẩm nang đơn thể', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const stealCard = { id: 'steal_negate_test', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      const cardOnP1 = { id: 'target_gold', name: 'Vàng', type: 'basic' };
      p0.hand.push(stealCard);
      p1.hand.push(cardOnP1);

      const negate1 = { id: 'neg_1', idKey: 'hoa_giai', name: 'Hóa Giải', type: 'trick' };
      p1.hand.push(negate1);

      TrickRules.playTrick(state, 0, [1], stealCard);

      // p0 không hóa giải
      TrickRules.respondNegate(state, 0, null);
      // p1 dùng Hóa Giải (lần 1 - lẻ)
      TrickRules.respondNegate(state, 1, negate1);
      // Kết thúc vòng hỏi
      TrickRules.respondNegate(state, 2, null);
      TrickRules.respondNegate(state, 3, null);
      TrickRules.respondNegate(state, 0, null);

      expect(p1.hand.some(c => c.id === 'target_gold')).toBe(true);
      expect(p0.hand.some(c => c.id === 'target_gold')).toBe(false);
    });

    it('2 lần Hóa Giải (chẵn) hóa giải lại Hóa Giải -> Cẩm nang vẫn có hiệu lực', () => {
      const state = createMockGameState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);

      const stealCard = { id: 'steal_negate_test_2', idKey: 'cuop_bai', name: 'Cướp Bài', type: 'trick' };
      const cardOnP1 = { id: 'target_gold_2', name: 'Vàng', type: 'basic' };
      p0.hand.push(stealCard);
      p1.hand.push(cardOnP1);

      const negate1 = { id: 'neg_1_p1', idKey: 'hoa_giai', name: 'Hóa Giải', type: 'trick' };
      p1.hand.push(negate1);
      const negate2 = { id: 'neg_2_p0', idKey: 'hoa_giai', name: 'Hóa Giải', type: 'trick' };
      p0.hand.push(negate2);

      TrickRules.playTrick(state, 0, [1], stealCard, { targetCardId: 'target_gold_2' });

      // p0 bỏ qua
      TrickRules.respondNegate(state, 0, null);
      // p1 ra Hóa Giải 1 (lần 1)
      TrickRules.respondNegate(state, 1, negate1);
      // Tiếp theo: p2, p3 bỏ qua -> lượt sang p0
      TrickRules.respondNegate(state, 2, null);
      TrickRules.respondNegate(state, 3, null);
      // p0 phản hồi lại bằng Hóa Giải 2 (lần 2 - chẵn -> khôi phục hiệu lực)
      TrickRules.respondNegate(state, 0, negate2);
      // Mọi người skip: p0, p1, p2, p3
      TrickRules.respondNegate(state, 0, null);
      TrickRules.respondNegate(state, 1, null);
      TrickRules.respondNegate(state, 2, null);
      const res = TrickRules.respondNegate(state, 3, null);
      expect(res.negated).toBe(false);

      // Cướp bài thành công
      expect(p0.hand.some(c => c.id === 'target_gold_2')).toBe(true);
      expect(p1.hand.some(c => c.id === 'target_gold_2')).toBe(false);
    });
  });
});
