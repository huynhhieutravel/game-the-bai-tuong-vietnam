import { describe, it, expect, vi } from 'vitest';
import { GameState } from '../../../../shared/engine_v4/core/GameState.js';
import { TrickRules } from '../../../../shared/engine_v4/rules/TrickRules.js';
import { DispatcherV4 } from '../../../../shared/engine_v4/application/DispatcherV4.js';
import { toViewModel } from '../../../../shared/engine_v4/application/GameViewMapperV4.js';

describe('QA Snatch & Dismantle Interactive Modal and Toast Notifications', () => {
  const createTestState = () => {
    const drawPile = Array.from({ length: 20 }, (_, i) => ({
      id: `c_${i}`,
      name: `Bài ${i}`,
      type: 'basic',
      suit: 'spade',
      rank: 5
    }));

    const players = [
      {
        id: 0,
        name: 'Người chơi 1 (Human)',
        hp: 4,
        maxHp: 4,
        gender: 'male',
        isAlive: true,
        faction: 'lac',
        isBot: false,
        hand: [
          { id: 'tuoc_1', name: 'Tước Bài', type: 'trick' },
          { id: 'cuop_1', name: 'Cướp Bài', type: 'trick' }
        ],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      },
      {
        id: 1,
        name: 'Người chơi 2 (Opponent)',
        hp: 4,
        maxHp: 4,
        gender: 'female',
        isAlive: true,
        faction: 'ha',
        isBot: true,
        hand: [
          { id: 'target_hand_card_1', name: 'Chém', type: 'slash' },
          { id: 'target_hand_card_2', name: 'Né', type: 'dodge' }
        ],
        equipment: {
          weapon: { id: 'enemy_weapon_1', name: 'Thanh Long Đao', range: 3 },
          armor: { id: 'enemy_armor_1', name: 'Bát Quái Trận' },
          horse_attack: null,
          horse_defense: null
        },
        judgementArea: [{ id: 'judge_trick_1', name: 'Sấm Sét', type: 'trick' }],
        temporaryFlags: {},
        turnStats: { slashCount: 0, wineCount: 0 }
      }
    ];

    const state = new GameState({ players, drawPile });
    state.activePlayerId = 0;
    state.currentTurnPlayerId = 0;
    state.currentPhase = 'action';
    return state;
  };

  it('1. Người chơi Human dùng Tước Bài -> Đẩy frame ASK_DISMANTLE và toViewModel map sang ask_dismantle', () => {
    const state = createTestState();
    const dispatcher = new DispatcherV4(state);

    // Human chơi Tước Bài nhắm vào Người chơi 2
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 0, cardId: 'tuoc_1', targetIds: [1], interactive: true }
    });

    // 1. Phải có frame ASK_NEGATE trước
    expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');

    // Mọi người bỏ qua Hóa Giải
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'skip', data: { doNegate: false } }
    });
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, responseType: 'skip', data: { doNegate: false } }
    });

    // 2. Vì sourceId: 0 là Human (interactive === true) -> Phải đẩy frame ASK_DISMANTLE!
    expect(state.priorityStack.peek().type).toBe('ASK_DISMANTLE');

    // 3. toViewModel phải map thành waitingForResponse loại ask_dismantle cho Người chơi 0
    const vm = toViewModel(state, 0);
    expect(vm.waitingForResponse).toBeTruthy();
    expect(vm.waitingForResponse.type).toBe('ask_dismantle');
    expect(vm.waitingForResponse.responderId).toBe(0);
    expect(vm.waitingForResponse.targetId).toBe(1);

    // 4. Human chọn tháo Vũ Khí (enemy_weapon_1) của đối thủ
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { cardId: 'enemy_weapon_1', zone: 'equip' }
      }
    });

    // Sau khi phản hồi, frame kết thúc và vũ khí đối thủ bị phá hủy vào discardPile
    expect(state.getPlayer(1).equipment.weapon).toBeNull();
    expect(state.discardPile.some(c => c.id === 'enemy_weapon_1')).toBe(true);
    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('2. Người chơi Human dùng Cướp Bài -> Đẩy frame ASK_SNATCH và lấy đúng lá bài đã chọn vào tay', () => {
    const state = createTestState();
    const dispatcher = new DispatcherV4(state);

    // Human chơi Cướp Bài nhắm vào Người chơi 2
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 0, cardId: 'cuop_1', targetIds: [1], interactive: true }
    });

    // Bỏ qua Hóa Giải
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'skip', data: { doNegate: false } }
    });
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, responseType: 'skip', data: { doNegate: false } }
    });

    // Phải có frame ASK_SNATCH
    expect(state.priorityStack.peek().type).toBe('ASK_SNATCH');
    const vm = toViewModel(state, 0);
    expect(vm.waitingForResponse.type).toBe('ask_snatch');

    // Human chọn cướp cẩm nang Sấm Sét trong khu phán xét của đối thủ
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { cardId: 'judge_trick_1', zone: 'judge' }
      }
    });

    // Lá bài Sấm Sét được chuyển thẳng vào tay của Human (player 0)
    expect(state.getPlayer(1).judgementArea.length).toBe(0);
    expect(state.getPlayer(0).hand.some(c => c.id === 'judge_trick_1')).toBe(true);
  });

  it('3. Khi Bot dùng Tước Bài -> Tự động chọn và giải quyết không kẹt', () => {
    const state = createTestState();
    // Đảo bot làm người ra bài
    state.getPlayer(1).hand.push({ id: 'bot_tuoc', name: 'Tước Bài', type: 'trick' });
    const dispatcher = new DispatcherV4(state);

    // Trang bị giáp cho player 0 để bot phá
    state.getPlayer(0).equipment.armor = { id: 'p0_armor', name: 'Bát Quái Trận' };

    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 1, cardId: 'bot_tuoc', targetIds: [0] }
    });

    // Bỏ qua Hóa giải
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, responseType: 'skip', data: { doNegate: false } }
    });
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'skip', data: { doNegate: false } }
    });

    // Bot tự động thực thi phá giáp hoặc bài tay của player 0 mà không đẩy frame kẹt
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(state.discardPile.some(c => c.id === 'p0_armor' || c.name === 'Tước Bài')).toBe(true);
  });
});
