import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { LAC_HEROES } from '../../heroes/lac/index.js';
import { VIET_HEROES } from '../../heroes/viet/index.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('Hero Triggers Lifecycle & Special Combat Mechanics v4', () => {
  LAC_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  VIET_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  HA_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  SON_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  const createTestState = (p0Props = {}, p1Props = {}, p2Props = {}) => {
    return new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0',
          hp: 4,
          maxHp: 4,
          gender: 'male',
          hand: [],
          skills: [],
          revealedHeroes: [true, true],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          turnStats: { slashCount: 0, cardsDrawn: 0, damageDealt: 0, damageTaken: 0 },
          temporaryFlags: {},
          ...p0Props
        },
        {
          id: 1,
          name: 'Player 1',
          hp: 4,
          maxHp: 4,
          gender: 'female',
          hand: [],
          skills: [],
          revealedHeroes: [true, true],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          turnStats: { slashCount: 0, cardsDrawn: 0, damageDealt: 0, damageTaken: 0 },
          temporaryFlags: {},
          ...p1Props
        },
        {
          id: 2,
          name: 'Player 2',
          hp: 4,
          maxHp: 4,
          gender: 'male',
          hand: [],
          skills: [],
          revealedHeroes: [true, true],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          judgementArea: [],
          turnStats: { slashCount: 0, cardsDrawn: 0, damageDealt: 0, damageTaken: 0 },
          temporaryFlags: {},
          ...p2Props
        }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Chém', suit: 'spade', color: 'black', type: 'slash' },
        { id: 'deck_2', name: 'Né', suit: 'heart', color: 'red', type: 'dodge' },
        { id: 'deck_3', name: 'Đào', suit: 'heart', color: 'red', type: 'peach' },
        { id: 'deck_4', name: 'Cướp Bài', suit: 'diamond', color: 'red', type: 'trick' },
        { id: 'deck_5', name: 'Hóa Giải', suit: 'club', color: 'black', type: 'trick' }
      ],
      currentTurnPlayerId: 0
    });
  };

  it('1. DRAW_PHASE: Phùng Hưng (Khởi Nghĩa) rút 1 bài và nhận +1 sát thương', () => {
    const state = createTestState({
      skills: ['khoi_nghia'],
      mainHeroId: 'phung_hung'
    });
    const sm = new StateMachine(state);
    sm._runPhaseDraw();

    expect(state.priorityStack.peek().type).toBe('ASK_KHOI_NGHIA');
    const dispatcher = new DispatcherV4(state);
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { doUse: true }
      }
    });

    const p0 = state.getPlayer(0);
    expect(p0.temporaryFlags.bonusDamage).toBe(1);
    expect(p0.hand.length).toBe(1); // Rút 1 lá thay vì 2
  });

  it('2. DISCARD_PHASE: Tô Hiến Thành không dùng Chém thì được miễn bỏ bài', () => {
    const state = createTestState({
      skills: ['nhiep_chinh_to_hien_thanh'],
      mainHeroId: 'to_hien_thanh',
      hp: 1,
      hand: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }], // 3 bài trong khi HP = 1
      turnStats: { slashCount: 0 }
    });

    const sm = new StateMachine(state);
    sm._runPhaseDiscard();

    // Không bị đẩy frame ASK_DISCARD vào priorityStack, lượt tự động kết thúc và chuyển sang người kế tiếp
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(state.currentTurnPlayerId).toBe(1);
  });

  it('3. ON_SLASH_TARGET: Cao Lỗ (Nỏ Thần) cấm Né và tăng sát thương khi bài nhiều hơn và máu ít hơn', () => {
    const state = createTestState(
      {
        skills: ['no_than_cao_lo'],
        mainHeroId: 'cao_lo_lac',
        hp: 3,
        hand: [{ id: 's1', name: 'Chém', type: 'slash', rank: '10' }, { id: 'c2' }, { id: 'c3' }]
      },
      {
        hp: 4,
        hand: [{ id: 't1' }]
      }
    );

    const slashCard = state.getPlayer(0).hand[0];
    const res = CombatRules.playSlash(state, 0, 1, slashCard);

    expect(res.success).toBe(true);
    expect(res.unavoidable).toBe(true);
    // Mục tiêu nhận thẳng 2 sát thương mà không cần hỏi Né
    expect(state.getPlayer(1).hp).toBe(2); // 4 - 2 = 2
  });

  it('4. ON_SLASH_TARGET: Nguyễn Xí (Phá Quân) bắt mục tiêu dùng 2 lá Né', () => {
    const state = createTestState(
      {
        skills: ['pha_quan_nguyen_xi'],
        mainHeroId: 'nguyen_xi',
        hand: [{ id: 's1', name: 'Chém', type: 'slash' }]
      },
      {
        hand: [{ id: 'd1', name: 'Né', type: 'dodge' }, { id: 'd2', name: 'Né', type: 'dodge' }]
      }
    );

    const slashCard = state.getPlayer(0).hand[0];
    CombatRules.playSlash(state, 0, 1, slashCard);

    const frame = state.priorityStack.peek();
    expect(frame.type).toBe('ASK_DODGE');
    expect(frame.context.requiredDodges).toBe(2);

    // Né 1 lần -> Chưa đủ
    const res1 = CombatRules.respondDodge(state, 1, state.getPlayer(1).hand[0]);
    expect(res1.dodged).toBe(false);
    expect(res1.pendingMoreDodges).toBe(true);

    // Né lần 2 -> Đủ
    const res2 = CombatRules.respondDodge(state, 1, state.getPlayer(1).hand[0]);
    expect(res2.dodged).toBe(true);
  });

  it('5. ON_DODGE_SUCCESS: Đinh Điền (Phạt Tội) trừng phạt kẻ tấn công mất 1 HP khi Né thành công', () => {
    const state = createTestState(
      {
        hand: [{ id: 's1', name: 'Chém', type: 'slash' }]
      },
      {
        skills: ['phat_toi_dinh_dien'],
        mainHeroId: 'dinh_dien',
        hand: [{ id: 'd1', name: 'Né', type: 'dodge' }]
      }
    );

    const slashCard = state.getPlayer(0).hand[0];
    CombatRules.playSlash(state, 0, 1, slashCard);

    const dodgeCard = state.getPlayer(1).hand[0];
    CombatRules.respondDodge(state, 1, dodgeCard);

    // Kẻ tấn công Player 0 bị trừ 1 HP
    expect(state.getPlayer(0).hp).toBe(3); // 4 - 1 = 3
  });

  it('6. ON_DAMAGED: Lý Thường Kiệt (Nam Quốc Sơn Hà) rút 1 bài và thu hồi bài gây sát thương', () => {
    const state = createTestState(
      {},
      {
        skills: ['nam_quoc_son_ha'],
        mainHeroId: 'ly_thuong_kiet',
        hand: []
      }
    );

    const slashCard = { id: 's1', name: 'Chém', type: 'slash' };
    state.discardPile.push(slashCard);
    CombatRules.applyDamage(state, 0, 1, 1, 'slash', false, slashCard);

    expect(state.priorityStack.peek().type).toBe('ASK_NAM_QUOC_SON_HA');
    const dispatcher = new DispatcherV4(state);
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'provide',
        data: { doUse: true }
      }
    });

    const ltk = state.getPlayer(1);
    expect(ltk.hp).toBe(3);
    expect(ltk.hand.length).toBe(2); // Rút 1 lá bài từ drawPile + 1 lá thu hồi
  });

  it('7. ON_DYING: Chử Đồng Tử (Hóa Tiên) khi hấp hối hồi phục 3 HP, 3 bài và thoát chết', () => {
    const state = createTestState(
      {},
      {
        skills: ['hoa_tien'],
        mainHeroId: 'chu_dong_tu',
        hp: 1,
        hand: [{ id: 'junk_1' }],
        equipment: { weapon: { id: 'w1' }, armor: null, horse_attack: null, horse_defense: null }
      }
    );

    // Đòn đánh gây 2 sát thương khiến HP = -1
    CombatRules.applyDamage(state, 0, 1, 2, 'slash');

    const cdt = state.getPlayer(1);
    expect(cdt.hp).toBe(3); // Hồi đầy 3 HP!
    expect(cdt.hand.length).toBe(3); // Rút 3 lá bài mới
    expect(cdt.equipment.weapon).toBeNull(); // Trang bị cũ đã bị bỏ
    expect(state.priorityStack.isEmpty()).toBe(true); // Thoát khỏi ASK_PEACH
  });

  it('8. ON_TRICK_PLAYED: Tiên Dung (Duyên Tiên) rút 1 lá bài khi dùng cẩm nang thường', () => {
    const state = createTestState({
      skills: ['duyen_tien'],
      mainHeroId: 'tien_dung',
      hand: [{ id: 't1', name: 'Vô Trung Sinh Hữu', type: 'trick' }]
    });

    const trickCard = state.getPlayer(0).hand[0];
    TrickRules.playTrick(state, 0, [0], trickCard);

    // Mọi người bỏ qua Hóa Giải để giải phóng Vô Trung Sinh Hữu
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, null);
    TrickRules.respondNegate(state, 2, null);

    const tienDung = state.getPlayer(0);
    // Vô Trung Sinh Hữu rút 2 + Duyên Tiên kích hoạt rút 1 = 3 bài
    expect(tienDung.hand.length).toBe(3);
  });

  it('9. ON_EQUIP_LOST: Hồ Xuân Hương (Xuân Hương) rút 2 bài khi bị tước/cướp trang bị', () => {
    const state = createTestState(
      {
        hand: [{ id: 't_tuoc', name: 'Tước Bài', type: 'trick' }]
      },
      {
        skills: ['xuan_huong'],
        mainHeroId: 'ho_xuan_huong',
        hand: [],
        equipment: { weapon: { id: 'w1', name: 'Liên Nỏ' }, armor: null, horse_attack: null, horse_defense: null }
      }
    );

    // Player 0 tước trang bị của Player 1
    const trick = state.getPlayer(0).hand[0];
    TrickRules.playTrick(state, 0, [1], trick, { targetCardId: 'w1' });

    // Hóa giải không ai dùng -> giải quyết hiệu ứng tước bài
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, null);
    TrickRules.respondNegate(state, 2, null);

    const hxh = state.getPlayer(1);
    expect(hxh.equipment.weapon).toBeNull();
    expect(hxh.hand.length).toBe(2); // Kích hoạt Xuân Hương rút 2 bài!
  });

  it('10. Vũ khí Song Kiếm: Chém mục tiêu khác giới tính ép đối phương bỏ bài', () => {
    const state = createTestState(
      {
        gender: 'male',
        equipment: { weapon: { id: 'w_sk', name: 'Song Kiếm' }, armor: null, horse_attack: null, horse_defense: null },
        hand: [{ id: 's1', name: 'Chém', type: 'slash' }]
      },
      {
        gender: 'female',
        hand: [{ id: 'card_f1', name: 'Né' }]
      }
    );

    const slash = state.getPlayer(0).hand[0];
    CombatRules.playSlash(state, 0, 1, slash);

    // Target female bị ép bỏ 1 lá bài trước
    expect(state.getPlayer(1).hand.length).toBe(0);
  });

  it('11. Cẩm nang Hỏa Công: Đốt cháy mục tiêu và lan truyền qua Xiềng Xích', () => {
    const state = createTestState(
      {
        hand: [
          { id: 'hc_1', name: 'Hỏa Công', type: 'trick' },
          { id: 'match_card', name: 'Bài Đỏ Cùng Chất', suit: 'heart', color: 'red' }
        ]
      },
      {
        isChained: true,
        hand: [{ id: 't_reveal', name: 'Bài Lộ Diện', suit: 'heart', color: 'red' }]
      },
      {
        isChained: true
      }
    );

    const fireTrick = state.getPlayer(0).hand[0];
    TrickRules.playFireAttack(state, 0, 1, fireTrick);

    // Mọi người bỏ qua Hóa Giải
    TrickRules.respondNegate(state, 0, null);
    TrickRules.respondNegate(state, 1, null);
    TrickRules.respondNegate(state, 2, null);

    // Bước 1: Mục tiêu Player 1 để lộ 1 lá bài trên tay
    expect(state.priorityStack.peek().type).toBe('ASK_HOACONG_REVEAL');
    TrickRules.respondHoaCongReveal(state, 1, state.getPlayer(1).hand[0]);

    // Bước 2: Người dùng Hỏa Công Player 0 bỏ 1 lá bài cùng chất (Cơ / Heart)
    expect(state.priorityStack.peek().type).toBe('ASK_HOACONG_DISCARD');
    const matchHeartCard = state.getPlayer(0).hand.find(c => c.suit === 'heart');
    TrickRules.respondHoaCongDiscard(state, 0, matchHeartCard);

    // Player 1 bị dính 1 sát thương lửa và tháo xích
    expect(state.getPlayer(1).hp).toBe(3);
    expect(state.getPlayer(1).isChained).toBe(false);

    // Sát thương lửa lan truyền qua xiềng xích sang Player 2!
    expect(state.getPlayer(2).hp).toBe(3);
    expect(state.getPlayer(2).isChained).toBe(false);
  });

  it('12. Vũ khí Kỳ Lân Cung: Khi Chém trúng mục tiêu có Ngựa thì bắn hạ Ngựa vào chồng bài bỏ', () => {
    const state = createTestState(
      {
        id: 0,
        equipment: {
          weapon: { id: 'wp_bow', name: 'Kỳ Lân Cung', range: 5 }
        },
        hand: [{ id: 'slash_kirin', name: 'Chém', type: 'slash' }]
      },
      {
        id: 1,
        hp: 4,
        maxHp: 4,
        equipment: {
          horse_defense: { id: 'horse_def', name: 'Ngựa Thần (+1)' },
          horse_attack: { id: 'horse_atk', name: 'Ngựa Chiến (-1)' }
        },
        hand: []
      }
    );

    const slashCard = state.getPlayer(0).hand[0];
    CombatRules.playSlash(state, 0, 1, slashCard);

    // Player 1 không né
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    CombatRules.respondDodge(state, 1, null);

    // Player 1 nhận 1 sát thương và bị bắn hạ Ngựa phòng thủ trước
    expect(state.getPlayer(1).hp).toBe(3);
    expect(state.getPlayer(1).equipment.horse_defense).toBeNull();
    expect(state.getPlayer(1).equipment.horse_attack).not.toBeNull();
    expect(state.discardPile.some(c => c.id === 'horse_def')).toBe(true);
  });

  it('13. Thánh Gióng (Tre Ngà): Khi Chém, phán xét chất và yêu cầu đối thủ bỏ bài cùng chất mới được Né', () => {
    const state = createTestState(
      {
        id: 0,
        mainHeroId: 'thanh_giong',
        skills: ['tre_nga'],
        hand: [{ id: 'slash_tre_nga', name: 'Chém', type: 'slash' }]
      },
      {
        id: 1,
        hp: 4,
        maxHp: 4,
        hand: [
          { id: 'heart_card', name: 'Đào Viên', type: 'trick', suit: 'heart' },
          { id: 'dodge_1', name: 'Né', type: 'dodge', suit: 'diamond' }
        ]
      }
    );
    // Chuẩn bị drawPile để phán xét ra chất 'heart'
    state.drawPile = [{ id: 'judge_heart', name: 'Phán Xét Cơ', suit: 'heart' }];

    const slashCard = state.getPlayer(0).hand[0];
    CombatRules.playSlash(state, 0, 1, slashCard);

    // Frame trên đỉnh phải là ASK_TRE_NGA_DISCARD
    expect(state.priorityStack.peek().type).toBe('ASK_TRE_NGA_DISCARD');
    expect(state.priorityStack.peek().context.judgeSuit).toBe('heart');

    const dispatcher = new DispatcherV4(state);
    // Player 1 bỏ lá Cơ để giữ quyền Né
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'provide',
        data: { doDiscard: true, cardId: 'heart_card' }
      }
    });

    // Sau khi bỏ Cơ, frame kế tiếp là ASK_DODGE
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.getPlayer(1).hand.some(c => c.id === 'heart_card')).toBe(false);

    // Player 1 né thành công
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'provide',
        data: { dodgeCardId: 'dodge_1' }
      }
    });
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(state.getPlayer(1).hp).toBe(4);
  });

  it('14. Trần Quang Khải (Đoạt Sáo): END_PHASE lật mặt tướng rút 4 bài, bỏ 1 bài (tự động mặc nếu là Trang bị)', () => {
    const state = createTestState(
      {
        id: 0,
        skills: ['doat_sao'],
        isFaceUp: true,
        hand: []
      },
      { id: 1 }
    );
    state.drawPile = [
      { id: 'draw_c1', name: 'Sát', type: 'slash' },
      { id: 'draw_c2', name: 'Né', type: 'dodge' },
      { id: 'draw_c3', name: 'Đào', type: 'peach' },
      { id: 'wp_sword', name: 'Song Kiếm', type: 'equipment', subtype: 'equip_weapon' }
    ];

    // Trigger END_PHASE
    globalHeroRegistry.dispatchTrigger('END_PHASE', { actorId: 0, ownerId: 0 }, state);

    expect(state.priorityStack.peek().type).toBe('ASK_DOAT_SAO');

    const dispatcher = new DispatcherV4(state);
    // Player 0 chấp nhận dùng Đoạt Sáo
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { doUse: true }
      }
    });

    // Đã lật mặt, rút 4 bài và chuyển sang ASK_DOAT_SAO_DISCARD
    expect(state.getPlayer(0).isFaceUp).toBe(false);
    expect(state.getPlayer(0).hand.length).toBe(4);
    expect(state.priorityStack.peek().type).toBe('ASK_DOAT_SAO_DISCARD');

    // Chọn Song Kiếm để bỏ -> Vì là Trang bị, hệ thống tự động mặc vào slot weapon
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { cardId: 'wp_sword' }
      }
    });

    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(state.getPlayer(0).equipment.weapon?.id).toBe('wp_sword');
  });

  it('15. Khúc Thừa Dụ (Khoan Dân): Khi nhận sát thương, chọn 1 tướng rút bài cho bằng giới hạn HP', () => {
    const state = createTestState(
      {
        id: 0,
        skills: ['khoan_dan'],
        hp: 4,
        maxHp: 4,
        hand: []
      },
      {
        id: 1,
        hp: 3,
        maxHp: 4,
        hand: [{ id: 'card_dummy', name: 'Lá bài' }]
      }
    );
    state.drawPile = [
      { id: 'c1', name: 'Bài 1' },
      { id: 'c2', name: 'Bài 2' },
      { id: 'c3', name: 'Bài 3' },
      { id: 'c4', name: 'Bài 4' }
    ];

    // Player 0 nhận 1 sát thương
    CombatRules.applyDamage(state, 1, 0, 1, 'slash');

    expect(state.priorityStack.peek().type).toBe('ASK_KHOAN_DAN');

    const dispatcher = new DispatcherV4(state);
    // Chọn Player 1 (đang có 1 bài, maxHp 4 -> cần rút 3 lá để đủ 4)
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { doUse: true, targetId: 1 }
      }
    });

    expect(state.getPlayer(1).hand.length).toBe(4);
  });

  it('16. Ngọc Hân Công Chúa (Hiền Hậu): Bỏ lá bài Cơ chặn toàn bộ sát thương, ép mục tiêu khác chịu hiệu ứng', () => {
    const state = createTestState(
      { id: 0, hp: 4, maxHp: 4, hand: [] },
      {
        id: 1,
        skills: ['hien_hau'],
        hp: 3,
        maxHp: 3,
        hand: [{ id: 'heart_prevent', name: 'Hồng Nhan', suit: 'heart' }]
      }
    );

    // Player 0 gây sát thương lên Player 1
    CombatRules.applyDamage(state, 0, 1, 1, 'slash');

    // Chặn lại và đẩy ASK_HIEN_HAU
    expect(state.priorityStack.peek().type).toBe('ASK_HIEN_HAU');

    const dispatcher = new DispatcherV4(state);
    // Player 1 dùng Hiền Hậu: bỏ lá heart_prevent, ép Player 0 nhận 1 sát thương
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'provide',
        data: { doUse: true, cardId: 'heart_prevent', targetId: 0, option: 1 }
      }
    });

    // Player 1 không mất máu (vẫn 3 HP)
    expect(state.getPlayer(1).hp).toBe(3);
    // Player 0 nhận 1 sát thương (4 - 1 = 3 HP)
    expect(state.getPlayer(0).hp).toBe(3);
    expect(state.priorityStack.isEmpty()).toBe(true);
  });
});
