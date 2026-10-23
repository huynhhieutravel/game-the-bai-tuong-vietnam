import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Tướng Hệ Việt: Trần Quang Khải (Tran Quang Khai QA Suite v4)', () => {
  const createMockGameState = () => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `deck_card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: (i % 13) + 1,
      color: 'black'
    }));

    const players = [
      {
        id: 0,
        name: 'Trần Quang Khải',
        hp: 3,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        isFlipped: false,
        faction: 'viet',
        rawFaction: 'viet',
        mainHeroId: 'tran_quang_khai',
        heroes: [{ id: 'tran_quang_khai', skills: ['doat_sao', 'chuong_duong'] }],
        skills: ['doat_sao', 'chuong_duong'],
        revealedHeroes: [true, true],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Đồng Minh Việt',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'viet',
        rawFaction: 'viet',
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
        name: 'Kẻ Địch Đối Lập',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        isFaceUp: true,
        faction: 'ha',
        rawFaction: 'ha',
        mainHeroId: 'an_tu',
        heroes: [{ id: 'an_tu', skills: [] }],
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
    return state;
  };

  it('1. Đăng ký đầy đủ thuộc tính và kỹ năng Đoạt Sáo, Chương Dương trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('tran_quang_khai');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Trần Quang Khải');
    expect(hero.faction.toLowerCase()).toContain('việt');
    expect(hero.skills.some(s => s.id === 'doat_sao')).toBe(true);
    expect(hero.skills.some(s => s.id === 'chuong_duong')).toBe(true);
  });

  describe('2. Đoạt Sáo (Cuối lượt lật úp mặt tướng, rút 4 bài và chọn bỏ/trang bị 1 bài)', () => {
    it('2.1. Kích hoạt Đoạt Sáo: Lật úp mặt tướng, rút 4 bài, bỏ bài cơ bản và chuyển lượt', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      state.currentTurnPlayerId = 0;
      sm._runPhaseEnd();

      expect(state.priorityStack.isEmpty()).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_DOAT_SAO');
      expect(state.priorityStack.peek().currentActorId).toBe(0);

      // Đồng ý kích hoạt Đoạt Sáo
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true
      });

      const p0 = state.getPlayer(0);
      // Mặt tướng bị lật úp
      expect(p0.isFaceUp).toBe(false);
      expect(p0.isFlipped).toBe(true);
      // Rút đủ 4 lá bài
      expect(p0.hand.length).toBe(4);

      // Đã chuyển sang frame yêu cầu chọn bỏ 1 lá bài
      expect(state.priorityStack.isEmpty()).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_DOAT_SAO_DISCARD');

      // Chọn bỏ lá bài đầu tiên (lá cơ bản)
      const discardedCardId = p0.hand[0].id;
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: discardedCardId
      });

      // Lá bài đã vào discardPile và tay còn 3 lá
      expect(p0.hand.length).toBe(3);
      expect(state.discardPile.some(c => c.id === discardedCardId)).toBe(true);
      // Kết thúc lượt và chuyển sang Player 1
      expect(state.currentTurnPlayerId).toBe(1);
    });

    it('2.2. Đoạt Sáo: Nếu lá bài bỏ là Trang bị thì tự động trang bị vào người', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      state.currentTurnPlayerId = 0;
      sm._runPhaseEnd();

      // Đồng ý Đoạt Sáo
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true
      });

      const p0 = state.getPlayer(0);
      // Đưa 1 lá vũ khí vào bài tay
      const weaponCard = { id: 'eq_dao_long', name: 'Thanh Long Đao', type: 'weapon', subtype: 'equip_weapon' };
      p0.hand.push(weaponCard);

      // Chọn lá vũ khí
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'eq_dao_long'
      });

      // Không vào discardPile mà được trang bị trực tiếp vào slot weapon
      expect(p0.equipment.weapon).toBeDefined();
      expect(p0.equipment.weapon.id).toBe('eq_dao_long');
      expect(state.discardPile.some(c => c.id === 'eq_dao_long')).toBe(false);
      // Chuyển lượt sang Player 1
      expect(state.currentTurnPlayerId).toBe(1);
    });

    it('2.3. Từ chối Đoạt Sáo: Không lật mặt, không rút bài và chuyển lượt bình thường', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      state.currentTurnPlayerId = 0;
      sm._runPhaseEnd();

      // Từ chối Đoạt Sáo
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: false
      });

      const p0 = state.getPlayer(0);
      expect(p0.isFaceUp).toBe(true);
      expect(p0.hand.length).toBe(0);
      expect(state.currentTurnPlayerId).toBe(1);
    });
  });

  describe('3. Chương Dương (Dùng trang bị làm Hóa Giải)', () => {
    it('3.1. Dùng vũ khí đang trang bị làm lá Hóa Giải ngăn chặn Cướp Bài', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      // Trần Quang Khải có 1 vũ khí trang bị và 1 lá bài quý trên tay
      p0.equipment.weapon = { id: 'w_chuong_duong', name: 'Bát Quái', key: 'bat_quai' };
      p0.hand = [{ id: 'valuable_card', name: 'Bảo Vật' }];

      // Kẻ địch p2 dùng Cướp Bài nhắm vào p0
      p2.hand = [{ id: 'c_steal', name: 'Cướp Bài', type: 'trick' }];
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        sourceId: 2,
        cardId: 'c_steal',
        targetIds: [0]
      });

      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');

      // p0 kích hoạt Chương Dương tháo vũ khí làm Hóa Giải
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'w_chuong_duong',
        doNegate: true
      });

      // Vũ khí đã rời khỏi slot và vào discardPile
      expect(p0.equipment.weapon).toBeNull();
      expect(state.discardPile.some(c => c.id === 'w_chuong_duong')).toBe(true);

      // Kẻ địch không phản hồi thêm Hóa Giải
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 2,
        responseType: 'skip'
      });

      // Lá Cướp Bài bị vô hiệu hóa, bảo vật trên tay p0 vẫn còn nguyên
      expect(p0.hand.some(c => c.id === 'valuable_card')).toBe(true);
      expect(p2.hand.length).toBe(0);
    });

    it('3.2. Dùng giáp Bạch Ngân làm Hóa Giải: Tháo giáp đồng thời hồi phục 1 HP', () => {
      const state = createMockGameState();
      const sm = new StateMachine(state);
      const dispatcher = new DispatcherV4(state, sm);

      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);

      p0.hp = 2; // Đang mất máu (2/4)
      p0.equipment.armor = { id: 'armor_bach_ngan', name: 'Bạch Ngân', key: 'bach_ngan' };

      p2.hand = [{ id: 'c_dismantle', name: 'Tước Bài', type: 'trick' }];
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        sourceId: 2,
        cardId: 'c_dismantle',
        targetIds: [0]
      });

      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');

      // Tháo Bạch Ngân làm Hóa Giải
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'armor_bach_ngan',
        doNegate: true
      });

      // Giáp bị tháo
      expect(p0.equipment.armor).toBeNull();
      // Bạch Ngân kích hoạt hiệu ứng hồi 1 HP khi rời người -> HP tăng từ 2 lên 3!
      expect(p0.hp).toBe(3);
    });
  });
});
