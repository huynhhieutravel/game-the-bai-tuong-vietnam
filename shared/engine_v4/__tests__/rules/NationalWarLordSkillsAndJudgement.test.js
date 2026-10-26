import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { toViewModel } from '../../application/GameViewMapperV4.js';
import { GameInvariants } from '../../core/Invariants.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('NationalWarLordSkillsAndJudgement Test Suite', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    state = new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0 (Lạc - LLQ)',
          faction: 'lac',
          hp: 4,
          maxHp: 4,
          hand: [],
          skills: ['boc_tram_trung'],
          revealedHeroes: [true, false],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          temporaryFlags: {},
          turnStats: {}
        },
        {
          id: 1,
          name: 'Player 1 (Lạc Đồng Minh)',
          faction: 'lac',
          hp: 3,
          maxHp: 3,
          hand: [],
          skills: [],
          revealedHeroes: [true, false],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          temporaryFlags: {},
          turnStats: {}
        },
        {
          id: 2,
          name: 'Player 2 (Sơn 1)',
          faction: 'son',
          hp: 3,
          maxHp: 3,
          hand: [],
          skills: [],
          revealedHeroes: [true, false],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          temporaryFlags: {},
          turnStats: {}
        },
        {
          id: 3,
          name: 'Player 3 (Sơn 2)',
          faction: 'son',
          hp: 3,
          maxHp: 3,
          hand: [],
          skills: [],
          revealedHeroes: [true, false],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          temporaryFlags: {},
          turnStats: {}
        }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Thẻ Bài 1', suit: 'heart', rank: 5, color: 'red' },
        { id: 'deck_2', name: 'Thẻ Bài 2', suit: 'club', rank: 6, color: 'black' },
        { id: 'deck_3', name: 'Thẻ Bài 3', suit: 'diamond', rank: 7, color: 'red' },
        { id: 'deck_4', name: 'Thẻ Bài 4', suit: 'spade', rank: 8, color: 'black' }
      ]
    });
    dispatcher = new DispatcherV4(state);
  });

  describe('1. National War Kill Rewards & Friendly Fire Penalties', () => {
    it('Phần thưởng hạ địch: Thưởng số bài = số đồng minh đã lộ diện của nạn nhân + 1 (tối thiểu 2 lá)', () => {
      const killer = state.getPlayer(0); // Lạc
      const victim = state.getPlayer(2); // Sơn (có Player 3 là đồng minh Sơn đã lộ diện)
      killer.hand = [];

      CombatRules.handleDeath(state, victim.id, killer.id);

      // Victim có 1 đồng minh Sơn đã lộ diện (Player 3) -> reward = 1 + 1 = 2 lá
      expect(killer.hand.length).toBe(2);
      expect(victim.isAlive).toBe(false);
    });

    it('Hạ đồng minh cùng phe (Friendly fire): Bị phạt bỏ toàn bộ bài trên tay và toàn bộ trang bị', () => {
      const killer = state.getPlayer(0); // Lạc
      const victim = state.getPlayer(1); // Lạc đồng minh

      killer.hand = [
        { id: 'h1', name: 'Chém' },
        { id: 'h2', name: 'Né' }
      ];
      killer.equipment = {
        weapon: { id: 'eq_wp', name: 'Thanh Long Đao' },
        armor: { id: 'eq_ar', name: 'Bạch Ngân' },
        horse_attack: null,
        horse_defense: null
      };

      CombatRules.handleDeath(state, victim.id, killer.id);

      // Phạt bỏ sạch bài và trang bị
      expect(killer.hand.length).toBe(0);
      expect(killer.equipment.weapon).toBeNull();
      expect(killer.equipment.armor).toBeNull();
      expect(victim.isAlive).toBe(false);
    });
  });

  describe('2. Lạc Long Quân - Bọc Trăm Trứng', () => {
    it('Bọc Trăm Trứng (Dodge invariant): Lạc Long Quân bị Chém KHÔNG THỂ phát động Bọc Trăm Trứng khi cần Né, phải tự dùng lá Né', () => {
      const llq = state.getPlayer(0);
      const lacAlly = state.getPlayer(1);
      const enemy = state.getPlayer(2);
      enemy.equipment.weapon = { id: 'wp_bow', name: 'Kỳ Lân Cung', range: 3 };

      lacAlly.hand = [{ id: 'dodge_1', name: 'Né', type: 'dodge' }];
      llq.hand = [{ id: 'dodge_llq', name: 'Né', type: 'dodge' }];
      enemy.hand = [{ id: 'slash_1', name: 'Chém', type: 'slash' }];

      // Enemy Chém LLQ
      CombatRules.playSlash(state, enemy.id, llq.id, enemy.hand[0]);

      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // LLQ tự đánh lá Né của mình (không có Bọc Trăm Trứng cho Né)
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
          playerId: llq.id,
          responseType: 'react',
          data: { cardId: 'dodge_llq' }
        }
      });

      // Né thành công bằng chính bài của LLQ, đồng minh giữ nguyên bài
      expect(llq.hp).toBe(4);
      expect(llq.hand.length).toBe(0);
      expect(lacAlly.hand.length).toBe(1);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('Bọc Trăm Trứng (Slash in Duel): Đồng minh Lạc ra Chém thay LLQ trong Quyết Đấu', () => {
      const llq = state.getPlayer(0);
      const lacAlly = state.getPlayer(1);
      const enemy = state.getPlayer(2);

      lacAlly.hand = [{ id: 'slash_ally', name: 'Chém', type: 'slash' }];
      enemy.hand = [{ id: 'duel_card', name: 'Quyết Đấu', type: 'trick' }];

      // Bỏ qua ASK_NEGATE
      state.priorityStack.push({
        type: 'ASK_SLASH_DUEL',
        sourceId: enemy.id,
        targetId: llq.id,
        currentActorId: llq.id,
        priorityQueue: [llq.id],
        context: { attackerId: enemy.id, currentResponderId: llq.id }
      });

      // LLQ gọi Bọc Trăm Trứng
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
          playerId: llq.id,
          responseType: 'react',
          data: { callBocTramTrung: true }
        }
      });

      expect(state.priorityStack.peek().type).toBe('ASK_BOC_TRAM_TRUNG_SLASH');

      // Đồng minh ra Chém thay
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
          playerId: lacAlly.id,
          responseType: 'react',
          data: { doProvide: true, cardId: 'slash_ally' }
        }
      });

      // Lượt đọ Chém quay trở lại cho Enemy
      const duelFrame = state.priorityStack.peek();
      expect(duelFrame.type).toBe('ASK_SLASH_DUEL');
      expect(duelFrame.currentActorId).toBe(enemy.id);
      expect(lacAlly.hand.length).toBe(0);
    });
  });

  describe('3. Lý Thường Kiệt - Tiên Phát', () => {
    it('Tiên Phát (Dodge): Đồng minh Việt ra Né thay Lý Thường Kiệt', () => {
      const ltk = state.getPlayer(0);
      ltk.faction = 'viet';
      ltk.skills = ['tien_phat'];

      const vietAlly = state.getPlayer(1);
      vietAlly.faction = 'viet';
      vietAlly.hand = [{ id: 'dodge_ltk', name: 'Né', type: 'dodge' }];

      const enemy = state.getPlayer(2);
      enemy.equipment.weapon = { id: 'wp_bow', name: 'Kỳ Lân Cung', range: 3 };
      enemy.hand = [{ id: 'slash_ltk', name: 'Chém', type: 'slash' }];

      CombatRules.playSlash(state, enemy.id, ltk.id, enemy.hand[0]);

      // LTK kích hoạt Tiên Phát
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
          playerId: ltk.id,
          responseType: 'react',
          data: { doTienPhat: true }
        }
      });

      expect(state.priorityStack.peek().type).toBe('ASK_TIEN_PHAT');
      expect(state.priorityStack.peek().currentActorId).toBe(vietAlly.id);

      // Đồng minh Việt ra Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
          playerId: vietAlly.id,
          responseType: 'react',
          data: { doProvide: true, cardId: 'dodge_ltk' }
        }
      });

      expect(ltk.hp).toBe(4);
      expect(vietAlly.hand.length).toBe(0);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });

  describe('4. Ngô Quyền - Hậu Viện', () => {
    it('Hậu Viện: Đồng minh Hà ăn Đào có thể nhường cho Ngô Quyền đang bị thương và rút 1 bài', () => {
      const ngoQuyen = state.getPlayer(0);
      ngoQuyen.faction = 'ha';
      ngoQuyen.hp = 2; // Bị thương
      ngoQuyen.maxHp = 4;
      ngoQuyen.skills = ['hau_vien'];

      const haAlly = state.getPlayer(1);
      haAlly.faction = 'ha';
      haAlly.hp = 2;
      haAlly.maxHp = 3;
      haAlly.hand = [{ id: 'peach_1', name: 'Đào', type: 'peach' }];

      // Ally đánh lá Đào
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { sourceId: haAlly.id, cardId: 'peach_1' }
      });

      // Frame ASK_HAU_VIEN xuất hiện
      expect(state.priorityStack.peek().type).toBe('ASK_HAU_VIEN');
      expect(state.priorityStack.peek().context.targets).toContain(ngoQuyen.id);

      // Ally chọn nhường Đào cho Ngô Quyền
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
          playerId: haAlly.id,
          responseType: 'react',
          data: { doReact: true, targetId: ngoQuyen.id }
        }
      });

      // Ngô Quyền hồi phục 1 HP (2 -> 3)
      expect(ngoQuyen.hp).toBe(3);
      // Đồng minh rút 1 lá bài thưởng
      expect(haAlly.hand.length).toBe(1);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });

  describe('5. Judgement Intercept Window (Ứng Biến / Quân Cơ)', () => {
    it('Mạc Đĩnh Chi dùng Ứng Biến hoán đổi lá bài Phán Xét để cứu Sấm Sét không bị nổ', () => {
      const victim = state.getPlayer(0);
      victim.judgementArea = [{ id: 'sam_set_1', name: 'Sấm Sét', type: 'delayed_trick' }];

      const macDinhChi = state.getPlayer(1);
      macDinhChi.skills = ['ung_bien'];
      // Cầm 1 lá Cơ trên tay để đổi (chắc chắn defuse Sấm Sét vì Sấm Sét chỉ nổ khi là Bích 2-9)
      macDinhChi.hand = [{ id: 'safe_heart', name: 'Đào', suit: 'heart', rank: 5, color: 'red' }];

      // Cài đặt deck sao cho lá rút phán xét là Bích 7 (nếu không đổi sẽ nổ banh xác)
      state.drawPile = [{ id: 'lethal_spade', name: 'Chém', suit: 'spade', rank: 7, color: 'black' }];

      // Thực thi pha Phán Xét
      TrickRules.resolveJudgementPhase(state, victim.id);

      // Hệ thống phát hiện có candidate sở hữu Ứng Biến -> Đẩy ASK_CHANGE_JUDGE
      expect(state.priorityStack.peek().type).toBe('ASK_CHANGE_JUDGE');
      expect(state.priorityStack.peek().currentActorId).toBe(macDinhChi.id);

      // Mạc Đĩnh Chi đổi lá phán xét sang lá Cơ an toàn
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
          playerId: macDinhChi.id,
          responseType: 'react',
          data: { doReact: true, cardId: 'safe_heart' }
        }
      });

      // Sấm Sét không nổ, nạn nhân vẫn nguyên 4 HP
      expect(victim.hp).toBe(4);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });

  describe('6. Dynamic Max Hand Calculation & Discard Limit Invariant', () => {
    it('Nguyễn Bặc (Khai Quốc) tăng +2 Max Hand cho mỗi đồng minh Sơn còn sống', () => {
      const nguyenBac = state.getPlayer(2); // Sơn
      nguyenBac.hp = 3;
      nguyenBac.skills = ['khai_quoc'];

      // Player 3 là đồng minh Sơn còn sống -> Khai Quốc tăng 1 * 2 = +2 Max Hand -> effective = 3 + 2 = 5
      nguyenBac.hand = [
        { id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }, { id: 'c5' }
      ];

      // Assert Discard Limit không bị throw error dù handCount (5) > HP (3)
      expect(() => {
        GameInvariants.assertDiscardLimit(nguyenBac, state);
      }).not.toThrow();

      // Nếu vượt quá 5 lá (6 lá) thì phải throw error
      nguyenBac.hand.push({ id: 'c6' });
      expect(() => {
        GameInvariants.assertDiscardLimit(nguyenBac, state);
      }).toThrow(/vượt quá giới hạn cho phép/);
    });
  });
});
