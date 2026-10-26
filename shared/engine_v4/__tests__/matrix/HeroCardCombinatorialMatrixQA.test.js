import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { Dispatcher } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { GameInvariants } from '../../core/Invariants.js';
import { PHASES } from '../../../constants/phases.js';

describe('🎯 Combinatorial Matrix QA: All Conversion Skills x All Card Archetypes', () => {
  let state;
  let dispatcher;

  // 10 Nguyên mẫu lá bài đại diện cho toàn bộ 108 lá trong game
  const CardArchetypes = {
    redWeapon: { id: 'rw1', name: 'Liên Nỏ', type: 'equip', subType: 'equip_weapon', suit: 'heart', color: 'red', number: 1 },
    blackWeapon: { id: 'bw1', name: 'Thanh Long Đao', type: 'equip', subType: 'equip_weapon', suit: 'spade', color: 'black', number: 2 },
    redArmor: { id: 'ra1', name: 'Bát Quái Trận', type: 'equip', subType: 'equip_armor', suit: 'heart', color: 'red', number: 3 },
    blackArmor: { id: 'ba1', name: 'Bạch Ngân', type: 'equip', subType: 'equip_armor', suit: 'club', color: 'black', number: 4 },
    redHorseAtk: { id: 'rh1', name: 'Xích Thố', type: 'equip', subType: 'equip_mount_atk', suit: 'diamond', color: 'red', number: 5 },
    blackHorseDef: { id: 'bh1', name: 'Tuyệt Ảnh', type: 'equip', subType: 'equip_mount_def', suit: 'spade', color: 'black', number: 6 },
    redPeach: { id: 'p1', name: 'Đào', type: 'basic', subType: 'peach', suit: 'heart', color: 'red', number: 7 },
    redWine: { id: 'w1', name: 'Rượu', type: 'basic', subType: 'wine', suit: 'diamond', color: 'red', number: 8 },
    blackSlash: { id: 's1', name: 'Chém', type: 'basic', subType: 'slash', suit: 'spade', color: 'black', number: 9 },
    redDodge: { id: 'd1', name: 'Né', type: 'basic', subType: 'dodge', suit: 'heart', color: 'red', number: 10 }
  };

  const passAllNegates = (currentState) => {
    while (!currentState.priorityStack.isEmpty()) {
      const frame = currentState.priorityStack.peek();
      if (!frame || frame.type !== 'ASK_NEGATE') break;
      const actorId = frame.currentActorId;
      TrickRules.respondNegate(currentState, actorId, null);
    }
  };

  const setupMatch = (hero0Skills = [], hero1Skills = []) => {
    state = new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0 (Tester)',
          hp: 3,
          maxHp: 4,
          skills: hero0Skills,
          heroes: [{ id: 'hero0', skills: hero0Skills }],
          revealedHeroes: [true, true],
          isAlive: true,
          turnStats: { slashCount: 0, wineCount: 0 },
          temporaryFlags: {},
          hand: [],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }
        },
        {
          id: 1,
          name: 'Player 1 (Target)',
          hp: 3,
          maxHp: 4,
          skills: hero1Skills,
          heroes: [{ id: 'hero1', skills: hero1Skills }],
          revealedHeroes: [true, true],
          isAlive: true,
          turnStats: { slashCount: 0, wineCount: 0 },
          temporaryFlags: {},
          hand: [{ id: 'target_card_1', name: 'Chém', type: 'basic', color: 'black' }],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }
        }
      ],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION,
      discardPile: [],
      drawPile: []
    });
    dispatcher = new Dispatcher(state);
    return { p0: state.getPlayer(0), p1: state.getPlayer(1) };
  };

  describe('Ma Trận 1: Thần Hỏa (Than Hoa) / Võ Thần — Mọi lá bài Đỏ làm [Hỏa Công]', () => {
    const redCards = [
      { name: 'Red Weapon (Liên Nỏ)', card: CardArchetypes.redWeapon, slot: 'weapon' },
      { name: 'Red Armor (Bát Quái)', card: CardArchetypes.redArmor, slot: 'armor' },
      { name: 'Red Mount (Xích Thố)', card: CardArchetypes.redHorseAtk, slot: 'horse_attack' },
      { name: 'Red Peach (Đào)', card: CardArchetypes.redPeach, slot: null },
      { name: 'Red Wine (Rượu)', card: CardArchetypes.redWine, slot: null },
      { name: 'Red Dodge (Né)', card: CardArchetypes.redDodge, slot: null }
    ];

    redCards.forEach(({ name, card, slot }) => {
      it(`Tự động kiểm định: Thần Hỏa dùng [${name}] làm Hỏa Công`, () => {
        const { p0, p1 } = setupMatch(['than_hoa', 'vo_than']);
        p0.hand = [{ ...card }];
        const initialHp = p0.hp;

        dispatcher.dispatch({
          type: 'ACTION_PLAY_CARD',
          playerId: 0,
          cardId: card.id,
          targetIds: [1],
          virtualCardName: 'Hỏa Công'
        });

        // 1. Invariant: Không bao giờ được mặc vào ô trang bị
        if (slot) {
          expect(p0.equipment[slot]).toBeNull();
        }
        // 2. Invariant: Không kích hoạt hồi máu của Đào hay uống Rượu
        expect(p0.hp).toBe(initialHp);
        expect(p0.temporaryFlags?.wineActive).toBeFalsy();

        // 3. Invariant: Không còn trên tay
        expect(p0.hand.some(c => c.id === card.id)).toBe(false);

        // 4. Giải phóng chuỗi Negate -> phải đến pha lật bài Hỏa Công
        passAllNegates(state);
        const frame = state.priorityStack.peek();
        expect(frame).toBeTruthy();
        expect(frame.type).toBe('ASK_HOACONG_REVEAL');
        expect(frame.targetId).toBe(1);
      });
    });
  });

  describe('Ma Trận 2: Kỳ Tập (Ky Tap) — Mọi lá bài Đen làm [Tước Bài]', () => {
    const blackCards = [
      { name: 'Black Weapon (Thanh Long Đao)', card: CardArchetypes.blackWeapon, slot: 'weapon' },
      { name: 'Black Armor (Bạch Ngân)', card: CardArchetypes.blackArmor, slot: 'armor' },
      { name: 'Black Mount (Tuyệt Ảnh)', card: CardArchetypes.blackHorseDef, slot: 'horse_defense' },
      { name: 'Black Slash (Chém Đen)', card: CardArchetypes.blackSlash, slot: null }
    ];

    blackCards.forEach(({ name, card, slot }) => {
      it(`Tự động kiểm định: Kỳ Tập dùng [${name}] làm Tước Bài`, () => {
        const { p0, p1 } = setupMatch(['ky_tap']);
        p0.hand = [{ ...card }];

        dispatcher.dispatch({
          type: 'ACTION_PLAY_CARD',
          playerId: 0,
          cardId: card.id,
          targetIds: [1],
          virtualCardName: 'Tước Bài'
        });

        // 1. Invariant: Không bị mặc vào slot trang bị
        if (slot) {
          expect(p0.equipment[slot]).toBeNull();
        }
        // 2. Invariant: Không còn trên tay
        expect(p0.hand.some(c => c.id === card.id)).toBe(false);

        // 3. Giải phóng Negate -> Hiệu ứng Tước bài hoàn tất, mục tiêu mất lá bài trên tay
        passAllNegates(state);
        expect(p1.hand.length).toBe(0);
        expect(state.discardPile.some(c => c.id === 'target_card_1')).toBe(true);
      });
    });
  });

  describe('Ma Trận 3: Dời Núi (Doi Nui) — Hoán đổi [Chém] và [Né]', () => {
    it('Dời Núi: Dùng lá [Né] làm [Chém] trong Pha Hành Động', () => {
      const { p0, p1 } = setupMatch(['doi_nui']);
      p0.hand = [{ ...CardArchetypes.redDodge }];

      dispatcher.dispatch({
        type: 'ACTION_PLAY_CARD',
        playerId: 0,
        cardId: CardArchetypes.redDodge.id,
        targetIds: [1],
        asSlash: true
      });

      // Assert: Lá Né đã được dùng làm Chém thành công
      expect(p0.hand.length).toBe(0);
      expect(p0.turnStats?.slashCount).toBe(1);

      // Mục tiêu phải nhận frame ASK_DODGE
      const frame = state.priorityStack.peek();
      expect(frame).toBeTruthy();
      expect(frame.type).toBe('ASK_DODGE');
      expect(frame.targetId).toBe(1);
    });
  });

  describe('Ma Trận 4: Phá Thành (Pha Thanh) — Khác màu làm [Quyết Đấu]', () => {
    it('Phá Thành: Dùng lá bài khác màu cẩm nang phán xét làm [Quyết Đấu]', () => {
      const { p0, p1 } = setupMatch(['pha_thanh']);
      // Giả sử cẩm nang phán xét là màu Đen -> Phá Thành kích hoạt với màu Đỏ
      p0.temporaryFlags = { phaThanhOppositeColor: 'red' };
      p0.hand = [{ ...CardArchetypes.redArmor }]; // Dùng Bát Quái Đỏ làm Quyết Đấu

      dispatcher.dispatch({
        type: 'ACTION_PLAY_CARD',
        playerId: 0,
        cardId: CardArchetypes.redArmor.id,
        targetIds: [1],
        virtualCardName: 'Quyết Đấu',
        asDuel: true
      });

      // Assert: Bát Quái Đỏ không bị mặc vào người, trở thành Quyết Đấu
      expect(p0.equipment.armor).toBeNull();
      expect(p0.hand.length).toBe(0);

      // Giải phóng Negate -> Đến lượt mục tiêu đánh Chém trong Quyết Đấu
      passAllNegates(state);
      const frame = state.priorityStack.peek();
      expect(frame).toBeTruthy();
      expect(frame.type).toBe('ASK_SLASH_DUEL');
      expect(frame.targetId).toBe(1);
    });
  });

  describe('Ma Trận 5: Chuỗi Hóa Giải — Cấm tuyệt đối tự Hóa Giải chính mình (No Self-Negate)', () => {
    it('Assert Invariant 6: Người vừa dùng Hóa Giải không bao giờ bị hỏi lại chính mình', () => {
      const { p0, p1 } = setupMatch([], []);
      p0.hand = [{ id: 'hg1', name: 'Hóa Giải', type: 'trick', idKey: 'hoa_giai' }];
      p1.hand = [{ id: 'hg2', name: 'Hóa Giải', type: 'trick', idKey: 'hoa_giai' }];

      // Đẩy 1 frame ASK_NEGATE ban đầu do p0 đánh Cẩm Nang
      state.priorityStack.push({
        type: 'ASK_NEGATE',
        sourceId: 0,
        targetId: 1,
        priorityQueue: [0, 1],
        context: {
          card: { id: 'c1', name: 'Hỏa Công' },
          negateCount: 0
        }
      });

      // p0 dùng Hóa Giải
      dispatcher.dispatch({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'hg1',
        doNegate: true
      });

      const frame = state.priorityStack.peek();
      expect(frame).toBeTruthy();
      expect(frame.context.negateCount).toBe(1);
      expect(frame.context.lastNegaterId).toBe(0);

      // NGƯỜI TIẾP THEO PHẢI LÀ P1, TUYỆT ĐỐI KHÔNG ĐƯỢC LÀ P0
      expect(frame.currentActorId).toBe(1);
      expect(frame.currentActorId).not.toBe(0);

      // Kiểm định assertNoSelfNegate trực tiếp
      expect(() => {
        GameInvariants.assertNoSelfNegate(frame, 0);
      }).toThrow('[INVARIANT_VIOLATION]');
    });
  });

  describe('Ma Trận 6: Chương Dương (Chuong Duong) — Dùng Trang bị làm [Hóa Giải]', () => {
    it('Chương Dương: Tháo Giáp đang mặc làm Hóa Giải', () => {
      const { p0, p1 } = setupMatch(['chuong_duong'], []);
      const armorCard = { ...CardArchetypes.blackArmor };
      p0.equipment.armor = armorCard;

      state.priorityStack.push({
        type: 'ASK_NEGATE',
        sourceId: 1,
        targetId: 0,
        priorityQueue: [0, 1],
        context: {
          card: { id: 'c1', name: 'Hỏa Công' },
          negateCount: 0
        }
      });

      dispatcher.dispatch({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: armorCard.id,
        doNegate: true
      });

      // Giáp trên người phải bị tháo ra
      expect(p0.equipment.armor).toBeNull();
      // Giáp phải bay vào Discard Pile
      expect(state.discardPile.some(c => c.id === armorCard.id)).toBe(true);

      const frame = state.priorityStack.peek();
      expect(frame.context.negateCount).toBe(1);
      expect(frame.context.lastNegaterId).toBe(0);
      expect(frame.currentActorId).toBe(1);
    });

    it('Chương Dương: Dùng Vũ khí trên tay làm Hóa Giải', () => {
      const { p0, p1 } = setupMatch(['chuong_duong'], []);
      const weaponCard = { ...CardArchetypes.blackWeapon };
      p0.hand = [weaponCard];

      state.priorityStack.push({
        type: 'ASK_NEGATE',
        sourceId: 1,
        targetId: 0,
        priorityQueue: [0, 1],
        context: {
          card: { id: 'c1', name: 'Hỏa Công' },
          negateCount: 0
        }
      });

      dispatcher.dispatch({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: weaponCard.id,
        doNegate: true
      });

      // Vũ khí không được mặc vào người mà phải bay vào discard pile
      expect(p0.equipment.weapon).toBeNull();
      expect(p0.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === weaponCard.id)).toBe(true);
    });
  });
});

