import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { PHASES } from '../../../constants/phases.js';

function createMockGame(playerCount = 3) {
  const state = new GameState({
    mode: 'standard',
    enableLog: true,
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: `Player ${i}`,
      hp: 3,
      maxHp: 4,
      hand: [],
      equipment: { weapon: null, armor: null, horse_defense: null, horse_attack: null },
      judgementArea: [],
      temporaryFlags: {},
      isAlive: true,
      revealedHeroes: [true, true],
      faction: 'lac',
      turnStats: { slashCount: 0, wineCount: 0 }
    }))
  });
  return state;
}

function passAllNegates(state) {
  while (!state.priorityStack.isEmpty()) {
    const frame = state.priorityStack.peek();
    if (!frame || frame.type !== 'ASK_NEGATE') break;
    const actorId = frame.currentActorId;
    TrickRules.respondNegate(state, actorId, null);
  }
}

describe('QA Toàn Diện Thẻ Bài Ảo & Chuyển Đổi Kỹ Năng (Virtual Cards & Skill Conversion QA Suite)', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    state = createMockGame(3);
    state.currentPhase = PHASES.ACTION;
    state.currentTurnPlayerId = 0;
    dispatcher = new DispatcherV4(state);
  });

  it('1. Rùa Vàng [Thần Hỏa]: Dùng [Ngựa Thần (+1)] đỏ làm [Hỏa Công] không được tự trang bị mà phải thi triển Hỏa Công', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    p0.heroes = [{ id: 'rua_vang', skills: ['than_hoa', 'linh_giam'] }];
    p0.skills = ['than_hoa', 'linh_giam'];

    const horseCard = { id: 'horse_def_1', name: 'Ngựa Thần (+1)', type: 'equip', subtype: 'equip_mount_def', suit: 'diamond', color: 'red', rank: 'A' };
    p0.hand = [horseCard];
    p1.hand = [{ id: 'hand_target_1', name: 'Chém', type: 'basic', suit: 'spade', color: 'black', rank: '7' }];

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: horseCard.id,
      virtualCardName: 'Hỏa Công',
      targets: [1]
    });

    // Ngựa không được gắn vào khu trang bị của p0
    expect(p0.equipment.horse_defense).toBeNull();
    // Ngựa phải bị bỏ khỏi tay
    expect(p0.hand.some(c => c.id === horseCard.id)).toBe(false);

    // Mọi người bỏ qua Hóa Giải
    passAllNegates(state);

    // Hỏa Công kích hoạt ASK_HOACONG_REVEAL
    const frame = state.priorityStack.peek();
    expect(frame).toBeTruthy();
    expect(frame.type).toBe('ASK_HOACONG_REVEAL');
    expect(frame.currentActorId).toBe(1);
  });

  it('2. Rùa Vàng [Thần Hỏa]: Dùng [Đào] đỏ làm [Hỏa Công] không được tự ăn hồi máu mà phải kích hoạt Hỏa Công', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    p0.heroes = [{ id: 'rua_vang', skills: ['than_hoa', 'linh_giam'] }];
    p0.skills = ['than_hoa', 'linh_giam'];
    p0.hp = 2; // Đang mất máu

    const peachCard = { id: 'peach_red_1', name: 'Đào', type: 'peach', suit: 'heart', color: 'red', rank: '8' };
    p0.hand = [peachCard];
    p1.hand = [{ id: 'hand_target_2', name: 'Né', type: 'basic', suit: 'heart', color: 'red', rank: '2' }];

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: peachCard.id,
      virtualCardName: 'Hỏa Công',
      targets: [1]
    });

    // Máu của p0 vẫn giữ nguyên 2, không bị ăn Đào nhầm
    expect(p0.hp).toBe(2);
    expect(p0.hand.some(c => c.id === peachCard.id)).toBe(false);

    // Mọi người bỏ qua Hóa Giải
    passAllNegates(state);

    // Kích hoạt frame Hỏa Công
    const frame = state.priorityStack.peek();
    expect(frame).toBeTruthy();
    expect(frame.type).toBe('ASK_HOACONG_REVEAL');
  });

  it('3. Rùa Vàng [Thần Hỏa]: Dùng [Rượu] đỏ làm [Hỏa Công] không được uống Rượu mà phải kích hoạt Hỏa Công', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    p0.heroes = [{ id: 'rua_vang', skills: ['than_hoa', 'linh_giam'] }];
    p0.skills = ['than_hoa', 'linh_giam'];

    const wineCard = { id: 'wine_red_1', name: 'Rượu', type: 'wine', suit: 'diamond', color: 'red', rank: '9' };
    p0.hand = [wineCard];
    p1.hand = [{ id: 'hand_target_3', name: 'Chém', type: 'basic', suit: 'club', color: 'black', rank: '3' }];

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: wineCard.id,
      virtualCardName: 'Hỏa Công',
      targets: [1]
    });

    // Không kích hoạt cờ wineActive
    expect(p0.temporaryFlags?.wineActive).toBeFalsy();
    expect(p0.turnStats?.wineCount || 0).toBe(0);

    // Mọi người bỏ qua Hóa Giải
    passAllNegates(state);

    const frame = state.priorityStack.peek();
    expect(frame).toBeTruthy();
    expect(frame.type).toBe('ASK_HOACONG_REVEAL');
  });

  it('4. Dã Tượng [Kỳ Tập]: Dùng [Bát Quái] đen làm [Tước Bài] không được tự gắn Giáp mà phải tước bài đối thủ', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    p0.heroes = [{ id: 'da_tuong', skills: ['ky_tap'] }];
    p0.skills = ['ky_tap'];

    const batQuaiCard = { id: 'bat_quai_black', name: 'Bát Quái', type: 'equip', subtype: 'equip_armor', suit: 'spade', color: 'black', rank: '2' };
    const enemyCard = { id: 'enemy_gold_card', name: 'Chém', type: 'basic', suit: 'spade', color: 'black', rank: '9' };
    p0.hand = [batQuaiCard];
    p1.hand = [enemyCard];

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: batQuaiCard.id,
      virtualCardName: 'Tước Bài',
      targets: [1],
      interactive: false
    });

    // Bát Quái không gắn vào người p0
    expect(p0.equipment.armor).toBeNull();
    // Bát Quái rời tay
    expect(p0.hand.some(c => c.id === batQuaiCard.id)).toBe(false);

    // Mọi người bỏ qua Hóa Giải
    passAllNegates(state);

    // Lá bài của p1 bị tước rơi vào discardPile
    expect(p1.hand.length).toBe(0);
    expect(state.discardPile.some(c => c.id === enemyCard.id)).toBe(true);
  });

  it('5. Chử Đồng Tử [Tiên Duyên]: Dùng [Liên Nỏ] ♣ làm [Xiềng Xích] (Rèn Lại) rút 1 bài và không tự trang bị nỏ', () => {
    const p0 = state.getPlayer(0);
    p0.heroes = [{ id: 'chu_dong_tu', skills: ['tien_duyen_chu_dong_tu'] }];
    p0.skills = ['tien_duyen_chu_dong_tu'];

    const lienNoCard = { id: 'lien_no_club', name: 'Liên Nỏ', type: 'equip', subtype: 'equip_weapon', suit: 'club', color: 'black', rank: '1' };
    const drawnCard = { id: 'deck_card_1', name: 'Đào', type: 'basic', suit: 'heart', color: 'red', rank: '5' };
    p0.hand = [lienNoCard];
    state.drawPile = [drawnCard];

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: lienNoCard.id,
      virtualCardName: 'Xiềng Xích',
      targets: [],
      reforge: true
    });

    // Không gắn Liên Nỏ lên người
    expect(p0.equipment.weapon).toBeNull();
    // Đã rèn lại rút 1 lá bài mới
    expect(p0.hand.some(c => c.id === drawnCard.id)).toBe(true);
    expect(p0.hand.some(c => c.id === lienNoCard.id)).toBe(false);
  });

  it('6. Chử Đồng Tử [Tiên Duyên]: Dùng [Liên Nỏ] ♣ làm [Xiềng Xích] khóa 2 mục tiêu thành công', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);
    p0.heroes = [{ id: 'chu_dong_tu', skills: ['tien_duyen_chu_dong_tu'] }];
    p0.skills = ['tien_duyen_chu_dong_tu'];

    const lienNoCard = { id: 'lien_no_club_2', name: 'Liên Nỏ', type: 'equip', subtype: 'equip_weapon', suit: 'club', color: 'black', rank: '1' };
    p0.hand = [lienNoCard];

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: lienNoCard.id,
      virtualCardName: 'Xiềng Xích',
      targets: [1, 2],
      reforge: false
    });

    // Mọi người bỏ qua Hóa Giải
    passAllNegates(state);

    // Cả 2 mục tiêu đều bị khóa xích
    expect(p1.isChained).toBe(true);
    expect(p2.isChained).toBe(true);
    expect(p0.equipment.weapon).toBeNull();
  });

  it('7. Công chúa An Tư [Hòa Thân]: Dùng [Rìu Đá] ♦ làm [Hỗn Loạn] đặt vào khu phán xét của địch', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    p0.heroes = [{ id: 'an_tu_cong_chua', skills: ['hoa_than_an_tu'] }];
    p0.skills = ['hoa_than_an_tu'];

    const riuDaCard = { id: 'riu_da_diamond', name: 'Rìu Đá', type: 'equip', subtype: 'equip_weapon', suit: 'diamond', color: 'red', rank: '10' };
    p0.hand = [riuDaCard];

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: riuDaCard.id,
      virtualCardName: 'Hỗn Loạn',
      targets: [1]
    });

    // Rìu Đá không gắn lên người p0
    expect(p0.equipment.weapon).toBeNull();
    // Đặt vào khu phán xét của p1
    expect(p1.judgementArea.some(c => c.name === 'Hỗn Loạn')).toBe(true);
  });

  it('8. Lý Thường Kiệt [Phá Thành]: Dùng thẻ trang bị khác màu phán xét làm [Quyết Đấu] mở ASK_SLASH_DUEL', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    p0.heroes = [{ id: 'ly_thuong_kiet', skills: ['pha_thanh', 'tien_phat'] }];
    p0.skills = ['pha_thanh', 'tien_phat'];
    p0.temporaryFlags = { phaThanhOppositeColor: 'red' }; // Lá phán xét là Đen -> được dùng bài Đỏ làm Quyết Đấu

    const redWeapon = { id: 'red_weapon_1', name: 'Phương Thiên Kích', type: 'equip', subtype: 'equip_weapon', suit: 'diamond', color: 'red', rank: 'Q' };
    p0.hand = [redWeapon];

    dispatcher.dispatch({
      type: 'ACTION_PLAY_CARD',
      playerId: 0,
      cardId: redWeapon.id,
      virtualCardName: 'Quyết Đấu',
      targets: [1]
    });

    // Vũ khí không gắn lên người
    expect(p0.equipment.weapon).toBeNull();

    // Mọi người bỏ qua Hóa Giải
    passAllNegates(state);

    // Kích hoạt trận Quyết Đấu
    const frame = state.priorityStack.peek();
    expect(frame).toBeTruthy();
    expect(frame.type).toBe('ASK_SLASH_DUEL');
    expect(frame.currentActorId).toBe(1);
  });
});
