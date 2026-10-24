import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine } from '../../core/StateMachine.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { BotBrain } from '../../ai/BotBrain.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';

describe('QA Toàn Diện Bộ Não Chiến Thuật Bot AI (BotBrain Tactical Decision QA)', () => {
  const createMockState = (customPlayers = []) => {
    const drawPile = Array.from({ length: 60 }, (_, i) => ({
      id: `card_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: (i % 13) + 1,
      color: 'black'
    }));

    const defaultPlayers = [
      {
        id: 0,
        name: 'Bot 0',
        hp: 3,
        maxHp: 4,
        gender: 'male',
        faction: 'viet',
        isAlive: true,
        isBot: true,
        revealedHeroes: [true, true],
        mainHeroId: 'ngo_quyen',
        heroes: [{ id: 'ngo_quyen', skills: ['bach_dang', 'hau_vien'] }],
        skills: ['bach_dang', 'hau_vien'],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Bot 1 (Enemy 1)',
        hp: 3,
        maxHp: 4,
        gender: 'male',
        faction: 'ha',
        isAlive: true,
        isBot: true,
        revealedHeroes: [true, true],
        mainHeroId: 'trieu_quang_phuc',
        heroes: [{ id: 'trieu_quang_phuc', skills: ['da_trach'] }],
        skills: ['da_trach'],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 2,
        name: 'Bot 2 (Ally)',
        hp: 2,
        maxHp: 4,
        gender: 'female',
        faction: 'viet',
        isAlive: true,
        isBot: true,
        revealedHeroes: [true, true],
        mainHeroId: 'nguyen_phi_y_lan',
        heroes: [{ id: 'nguyen_phi_y_lan', skills: ['thinh_chinh', 'phat_tam'] }],
        skills: ['thinh_chinh', 'phat_tam'],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 3,
        name: 'Bot 3 (Enemy 2)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        faction: 'ha',
        isAlive: true,
        isBot: true,
        revealedHeroes: [true, true],
        mainHeroId: 'phung_hung',
        heroes: [{ id: 'phung_hung', skills: ['khoi_nghia'] }],
        skills: ['khoi_nghia'],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    const players = customPlayers.length > 0 ? customPlayers : defaultPlayers;
    const state = new GameState({
      players,
      drawPile,
      currentTurnPlayerId: 0
    });
    return state;
  };

  describe('1. Xác Thực Mục Tiêu Cẩm Nang & Bất Biến TargetResolver', () => {
    it('1.1. Cướp Bài chỉ nhắm mục tiêu cự ly <= 1 và có bài trên người', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1); // distance 1
      const p2 = state.getPlayer(2); // ally
      const p3 = state.getPlayer(3); // distance 1 (ngược chiều)

      p1.hand = [{ id: 'c1', name: 'Chém', type: 'slash' }];
      p3.hand = []; // enemy 2 không có bài
      p0.hand = [{ id: 'snatch_1', name: 'Cướp Bài', type: 'trick', idKey: 'cuop_bai' }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('PLAY_CARD');
      expect(action.cardId).toBe('snatch_1');
      expect(action.targetId).toBe(1); // Chỉ nhắm p1 có bài
    });

    it('1.2. Hỏa Công: Bot chỉ sử dụng khi mục tiêu có bài VÀ bot có ít nhất 1 lá bài khác để bỏ', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.mainHeroId = null;
      p0.heroId = null;
      p0.skills = [];
      p0.heroes = [];
      const p1 = state.getPlayer(1);
      p1.hand = [{ id: 'target_card', name: 'Chém', suit: 'heart' }];

      // Chỉ có duy nhất 1 lá Hỏa Công -> Không dùng vì không có bài bỏ
      p0.hand = [{ id: 'fire_1', name: 'Hỏa Công', type: 'trick', idKey: 'hoa_cong' }];
      const noAction = BotBrain.decideAction(state, 0);
      expect(noAction.type).toBe('END_ACTION_PHASE');

      // Có thêm 1 lá khác -> Đủ điều kiện phát động Hỏa Công lên kẻ địch
      p0.hand.push({ id: 'discard_card', name: 'Né', type: 'dodge', suit: 'diamond' });
      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('PLAY_CARD');
      expect(action.cardId).toBe('fire_1');
      expect(action.targetId).toBe(1);
    });

    it('1.3. Quyết Đấu không bao giờ nhắm vào Lang Liêu khi Lang Liêu đã hết bài trên tay (Đạm Bạc)', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      p1.mainHeroId = 'lang_lieu';
      p1.heroes = [{ id: 'lang_lieu', skills: ['dam_bac'] }];
      p1.skills = ['dam_bac'];
      p1.hand = []; // Hết bài -> Đạm Bạc miễn nhiễm Quyết Đấu

      const p3 = state.getPlayer(3); // Kẻ địch khác
      p3.hand = [{ id: 'c3', name: 'Chém' }];

      p0.hand = [{ id: 'duel_1', name: 'Quyết Đấu', type: 'trick', idKey: 'quyet_dau' }];
      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('PLAY_CARD');
      expect(action.targetId).toBe(3); // Nhắm vào p3 thay vì p1
    });

    it('1.4. Vô Trung Sinh Hữu luôn tự nhắm vào bản thân bot', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hand = [{ id: 'draw_trick', name: 'Vô Trung Sinh Hữu', type: 'trick', idKey: 'vo_trung' }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('PLAY_CARD');
      expect(action.targetId).toBe(0);
      expect(action.targetIds).toEqual([0]);
    });
  });

  describe('2. Nhận Diện & Sử Dụng Đúng Kỹ Năng Chủ Động (Active Skills)', () => {
    it('2.1. Diệu Dược (Tuệ Tĩnh): Chữa lành đồng minh bị thương bằng lá bài giá trị thấp nhất', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.mainHeroId = 'tue_tinh';
      p0.heroes = [{ id: 'tue_tinh', skills: ['dieu_duoc', 'nam_duoc'] }];
      p0.skills = ['dieu_duoc', 'nam_duoc'];
      p0.hp = 4; // Bot đầy máu
      p0.hand = [
        { id: 'peach_valuable', name: 'Đào', type: 'peach' },
        { id: 'dodge_keep', name: 'Né', type: 'dodge' },
        { id: 'slash_junk', name: 'Chém', type: 'slash' }
      ];

      const p2 = state.getPlayer(2); // Đồng minh đang có 2/4 HP
      expect(p2.hp).toBe(2);

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('USE_SKILL');
      expect(action.skillId).toBe('dieu_duoc');
      expect(action.targets).toEqual([2]); // Chữa lành đồng minh p2
      expect(action.cardIds).toEqual(['slash_junk']); // Hy sinh lá Chém thừa
    });

    it('2.2. Bạch Đằng (Ngô Quyền): Đổi bài trên tay khi có ít bài', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hand = [{ id: 'c1', name: 'Bài 1' }, { id: 'c2', name: 'Bài 2' }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('USE_SKILL');
      expect(action.skillId).toBe('bach_dang');
      expect(action.cardIds).toEqual(['c1', 'c2']);
    });

    it('2.3. Kỳ Tập (Dã Tượng): Dùng bài Đen tước bài kẻ địch', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hp = 4; // Đầy máu để không tự ăn Đào
      p0.mainHeroId = 'da_tuong';
      p0.heroes = [{ id: 'da_tuong', skills: ['ky_tap'] }];
      p0.skills = ['ky_tap'];
      p0.hand = [
        { id: 'red_card', name: 'Bài Đỏ', color: 'red', suit: 'heart' },
        { id: 'black_card', name: 'Sát Thương', color: 'black', suit: 'spade' }
      ];

      const p1 = state.getPlayer(1);
      p1.equipment.weapon = { id: 'w1', name: 'Liên Nỏ' };

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('USE_SKILL');
      expect(action.skillId).toBe('ky_tap');
      expect(action.cardIds).toEqual(['black_card']);
      expect(action.targets).toEqual([1]);
    });

    it('2.4. Hòa Thân (Công Chúa An Tư): Dùng bài Rô ♦ gài Hỗn Loạn lên kẻ địch', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.mainHeroId = 'cong_chua_an_tu';
      p0.heroes = [{ id: 'cong_chua_an_tu', skills: ['hoa_than_an_tu'] }];
      p0.skills = ['hoa_than_an_tu'];
      p0.hand = [{ id: 'diamond_card', name: 'Thường', suit: 'diamond', color: 'red' }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('USE_SKILL');
      expect(action.skillId).toBe('hoa_than_an_tu');
      expect(action.cardIds).toEqual(['diamond_card']);
      expect(action.targets).toEqual([1]); // Đặt lên enemy 1
    });

    it('2.5. Tiên Duyên (Chử Đồng Tử): Dùng bài Nhép ♣ như Xiềng Xích lên 2 kẻ địch', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.mainHeroId = 'chu_dong_tu';
      p0.heroes = [{ id: 'chu_dong_tu', skills: ['tien_duyen_chu_dong_tu'] }];
      p0.skills = ['tien_duyen_chu_dong_tu'];
      p0.hand = [{ id: 'club_card', name: 'Bài ♣', suit: 'club', color: 'black' }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('PLAY_CARD');
      expect(action.cardId).toBe('club_card');
      expect(action.virtualCardName).toBe('Xiềng Xích');
      expect(action.targetIds).toEqual([1, 3]); // Xích cả 2 kẻ địch p1 và p3
    });

    it('2.6. Lặn Sâu (Yết Kiêu): Mất 1 HP để rút 2 bài khi an toàn (3 HP)', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hp = 3;
      p0.maxHp = 4;
      p0.mainHeroId = 'yet_kieu';
      p0.heroes = [{ id: 'yet_kieu', skills: ['lan_sau'] }];
      p0.skills = ['lan_sau'];
      p0.hand = [{ id: 'c1', name: 'Bài 1' }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('USE_SKILL');
      expect(action.skillId).toBe('lan_sau');
    });

    it('2.7. Tự Chủ (Khúc Thừa Dụ): Thách đấu điểm kẻ địch nhiều HP hơn khi có bài cao điểm', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hp = 2; // HP 2
      p0.maxHp = 3;
      p0.mainHeroId = 'khuc_thua_du';
      p0.heroes = [{ id: 'khuc_thua_du', skills: ['tu_chu'] }];
      p0.skills = ['tu_chu'];
      p0.hand = [{ id: 'k_card', name: 'Bài K', rank: 13, suit: 'heart' }];

      const p3 = state.getPlayer(3);
      p3.hp = 4; // HP 4 > p0
      p3.hand = [{ id: 'enemy_card', name: 'Bài Địch', rank: 5 }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('USE_SKILL');
      expect(action.skillId).toBe('tu_chu');
      expect(action.targets).toContain(3);
    });

    it('2.8. Thính Chính (Nguyễn Phi Ỷ Lan): Dùng bài Đỏ hồi máu như Đào khi bị thương', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hp = 2; // Bị thương
      p0.maxHp = 4;
      p0.mainHeroId = 'nguyen_phi_y_lan';
      p0.heroes = [{ id: 'nguyen_phi_y_lan', skills: ['thinh_chinh'] }];
      p0.skills = ['thinh_chinh'];
      p0.hand = [{ id: 'red_slash', name: 'Chém Đỏ', type: 'slash', color: 'red', suit: 'diamond' }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('PLAY_CARD');
      expect(action.cardId).toBe('red_slash');
      expect(action.virtualCardName).toBe('Đào');
      expect(action.targetId).toBe(0);
    });

    it('2.9. Thần Hỏa (Rùa Vàng): Dùng bài Đỏ phát động Hỏa Công khi có bài bỏ', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hp = 3;
      p0.maxHp = 3;
      p0.mainHeroId = 'rua_vang';
      p0.heroes = [{ id: 'rua_vang', skills: ['than_hoa'] }];
      p0.skills = ['than_hoa'];
      p0.hand = [
        { id: 'red_card', name: 'Bài Đỏ', color: 'red', suit: 'heart' },
        { id: 'extra_card', name: 'Bài Bỏ', color: 'black', suit: 'spade' }
      ];

      const p1 = state.getPlayer(1);
      p1.hand = [{ id: 'target_hand', name: 'Bài Trên Tay' }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('PLAY_CARD');
      expect(action.cardId).toBe('red_card');
      expect(action.virtualCardName).toBe('Hỏa Công');
      expect(action.targetId).toBe(1);
    });

    it('2.10. Thủy Tổ (Lạc Long Quân): Tặng 2 bài cho đồng minh thiếu bài khi bài dư dả', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hp = 4;
      p0.maxHp = 4;
      p0.mainHeroId = 'lac_long_quan';
      p0.heroes = [{ id: 'lac_long_quan', skills: ['thuy_to'] }];
      p0.skills = ['thuy_to'];
      p0.hand = [
        { id: 'c1', name: 'Bài 1', rank: 2 },
        { id: 'c2', name: 'Bài 2', rank: 3 },
        { id: 'c3', name: 'Bài 3', rank: 4 },
        { id: 'c4', name: 'Bài 4', rank: 5 }
      ];

      const p2 = state.getPlayer(2); // ally
      p2.hand = [{ id: 'ally_c', name: 'Bài Đồng Minh' }]; // <= 2 bài

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('USE_SKILL');
      expect(action.skillId).toBe('thuy_to');
      expect(action.targets).toEqual([2]);
      expect(action.cardIds.length).toBe(2);
    });
  });

  describe('3. Chính Sách Chủ Động Hiển Lộ Tướng (Proactive Hero Reveal)', () => {
    it('3.1. Tự động lật tướng đầu tiên để giật thưởng Tiên Phong Cắm Cờ (+2 bài)', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.revealedHeroes = [false, false];
      state.hasPioneerRewardClaimed = false;

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('REVEAL_HERO');
      expect(action.heroIndex).toBe(0);
    });

    it('3.2. Không lật tướng nếu người chơi không có tướng gán (vanilla player)', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.mainHeroId = null;
      p0.heroId = null;
      p0.heroes = [];
      p0.revealedHeroes = [false, false];
      state.hasPioneerRewardClaimed = false;

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).not.toBe('REVEAL_HERO');
    });

    it('3.3. Tự động lật tướng sở hữu kỹ năng chủ động chiến đấu (vd: Sơn Tinh dời núi)', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.revealedHeroes = [false, true];
      state.hasPioneerRewardClaimed = true; // Tiên phong đã bị lấy
      p0.mainHeroId = 'son_tinh';
      p0.heroes = [{ id: 'son_tinh', skills: ['doi_nui'] }];

      const action = BotBrain.decideAction(state, 0);
      expect(action.type).toBe('REVEAL_HERO');
      expect(action.heroIndex).toBe(0);
    });
  });

  describe('4. Xử Lý Phản Hồi Chuyên Biệt Các Priority Frame (Specialized Reaction Stack)', () => {
    it('4.1. ASK_BOC_TRAM_TRUNG_DODGE: Đồng minh Lạc ra Né giùm cho Lạc Long Quân', () => {
      const state = createMockState();
      const p1 = state.getPlayer(1);
      p1.faction = 'lac';
      p1.hand = [{ id: 'dodge_ally', name: 'Né', type: 'dodge' }];

      const frame = { type: 'ASK_BOC_TRAM_TRUNG_DODGE', currentActorId: 1 };
      const reaction = BotBrain.decideReaction(state, 1, frame);
      expect(reaction.doProvide).toBe(true);
      expect(reaction.cardId).toBe('dodge_ally');
    });

    it('4.2. ASK_TIEN_PHAT: Lý Thường Kiệt bỏ lá Né để hóa giải cú Chém của kẻ địch', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hand = [{ id: 'dodge_tien_phat', name: 'Né', type: 'dodge' }];

      const frame = { type: 'ASK_TIEN_PHAT', currentActorId: 0 };
      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.doReact).toBe(true);
      expect(reaction.cardId).toBe('dodge_tien_phat');
    });

    it('4.3. ASK_HOACONG_DISCARD: Kẻ tấn công bỏ bài cùng chất khi nạn nhân là kẻ địch', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hand = [{ id: 'heart_card', name: 'Bài Cơ', suit: 'heart' }];

      const frame = {
        type: 'ASK_HOACONG_DISCARD',
        targetId: 1, // Kẻ địch p1
        context: { revealedCard: { suit: 'heart' } }
      };
      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.doReact).toBe(true);
      expect(reaction.cardId).toBe('heart_card');
    });

    it('4.4. ASK_HIEN_HAU: Ngọc Hân Công Chúa bỏ 1 bài ngăn đòn và phản sát thương lên kẻ địch', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hand = [{ id: 'discard_c', name: 'Bài Thường', type: 'basic' }];

      const frame = { type: 'ASK_HIEN_HAU', currentActorId: 0, targetId: 0 };
      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.doUse).toBe(true);
      expect(reaction.option).toBe(2);
      expect(reaction.targetId).toBe(1); // Phản đòn vào kẻ địch p1
    });

    it('4.5. ASK_CHANGE_JUDGE: Sấm Sét nhắm vào đồng minh -> Đổi bài khác Bích 2-9', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hand = [{ id: 'heart_safe', name: 'Bài Cơ', suit: 'heart', rank: 5 }];

      const frame = {
        type: 'ASK_CHANGE_JUDGE',
        currentActorId: 0,
        context: { judgeTargetId: 2, trickName: 'Sấm Sét' } // Đồng minh p2
      };
      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.doReact).toBe(true);
      expect(reaction.cardId).toBe('heart_safe');
    });

    it('4.6. ASK_HAU_VIEN: Ngô Quyền nhường Đào cho đồng minh đang bị thương', () => {
      const state = createMockState();
      const frame = { type: 'ASK_HAU_VIEN', currentActorId: 0 };
      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.doReact).toBe(true);
      expect(reaction.targetId).toBe(2); // Nhường cho đồng minh p2 (2/4 HP)
    });

    it('4.7. ASK_DUONG_QUAN_1: Dương Đình Nghệ bỏ qua phán xét/rút bài để Chém kẻ địch', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hp = 3;
      const frame = { type: 'ASK_DUONG_QUAN_1', currentActorId: 0 };
      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.doUse).toBe(true);
      expect(reaction.targetId).toBe(1); // Chém kẻ địch p1
      expect(reaction.canceled).toBe(false);
    });

    it('4.8. ASK_PHA_THANH: Đô Đốc Bảo / Đinh Điền phán xét nhận bài', () => {
      const state = createMockState();
      const frame = { type: 'ASK_PHA_THANH', currentActorId: 0 };
      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.doJudge).toBe(true);
      expect(reaction.canceled).toBe(false);
    });

    it('4.9. ASK_TRUNG_DUNG: Lê Ngân úp bài sử dụng như Đào khi bị thương', () => {
      const state = createMockState();
      const p0 = state.getPlayer(0);
      p0.hp = 2; // Bị thương
      p0.maxHp = 4;
      p0.hand = [{ id: 'useless_card', name: 'Lá Bài Thường' }];
      const frame = { type: 'ASK_TRUNG_DUNG', currentActorId: 0 };
      const reaction = BotBrain.decideReaction(state, 0, frame);
      expect(reaction.virtualCardName).toBe('Đào');
      expect(reaction.cardId).toBe('useless_card');
      expect(reaction.canceled).toBe(false);
    });
  });
});
