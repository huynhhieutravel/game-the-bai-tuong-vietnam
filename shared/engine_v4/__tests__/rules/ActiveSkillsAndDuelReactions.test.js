import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine } from '../../core/StateMachine.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { toViewModel } from '../../application/GameViewMapperV4.js';

describe('ActiveSkillsAndDuelReactions Test Suite', () => {
  let state;
  let dispatcher;

  const resolveNegateStack = () => {
    while (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_NEGATE') {
      const currentActor = state.priorityStack.peek().currentActorId;
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: currentActor, responseType: 'skip', data: {} }
      });
    }
  };

  beforeEach(() => {
    state = new GameState({
      players: [
        { id: 0, name: 'Player 0', hp: 3, maxHp: 3, gender: 'male', hand: [], skills: [], revealedHeroes: [true, true], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, judgementArea: [], temporaryFlags: {} },
        { id: 1, name: 'Player 1', hp: 3, maxHp: 3, gender: 'male', hand: [], skills: [], revealedHeroes: [true, true], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, judgementArea: [], temporaryFlags: {} },
        { id: 2, name: 'Player 2', hp: 3, maxHp: 3, gender: 'male', hand: [], skills: [], revealedHeroes: [true, true], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, judgementArea: [], temporaryFlags: {} },
        { id: 3, name: 'Player 3', hp: 3, maxHp: 3, gender: 'male', hand: [], skills: [], revealedHeroes: [true, true], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, judgementArea: [], temporaryFlags: {} }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Chém', suit: 'spade', rank: 7, color: 'black' },
        { id: 'deck_2', name: 'Né', suit: 'heart', rank: 2, color: 'red' }
      ]
    });
    dispatcher = new DispatcherV4(state);
  });

  it('1. Quyết Đấu (Duel) qua DispatcherV4 với ASK_SLASH_DUEL hoạt động trơn tru', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.hand.push({ id: 'c_duel', name: 'Quyết Đấu', type: 'trick' });
    p1.hand.push({ id: 'c_slash_1', name: 'Chém', type: 'slash' });

    // Player 0 plays Quyết Đấu targeting Player 1
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 0, cardId: 'c_duel', targetIds: [1] }
    });

    // Resolve ASK_NEGATE first
    resolveNegateStack();

    expect(state.priorityStack.peek()).toBeTruthy();
    expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');

    // Test GameViewMapper mapping
    const vm = toViewModel(state, 1);
    expect(vm.waitingForResponse.type).toBe('ask_slash');
    expect(vm.waitingForResponse.reason).toBe('quyet-dau');
    expect(vm.waitingForResponse.trickType).toBe('duel');

    // Player 1 responds with Chém
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, responseType: 'provide', data: { cardId: 'c_slash_1' } }
    });

    // Now it should be Player 0's turn to respond to Duel
    expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');
    expect(state.priorityStack.peek().currentActorId).toBe(0);

    // Player 0 has no Chém and skips -> Player 0 takes 1 damage
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'skip', data: { canceled: true } }
    });

    expect(p0.hp).toBe(2);
    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('2. Dã Man Xâm Nhập (Nam Man) qua DispatcherV4 với ASK_SLASH_RESPONSE', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);
    const p3 = state.getPlayer(3);

    p0.hand.push({ id: 'c_barbarian', name: 'Dã Man', type: 'trick' });
    p1.hand.push({ id: 'c_slash_p1', name: 'Chém', type: 'slash' });

    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 0, cardId: 'c_barbarian', targetIds: [1, 2, 3] }
    });

    resolveNegateStack();

    // Peek should be ASK_SLASH_RESPONSE
    const frame = state.priorityStack.peek();
    expect(frame.type).toBe('ASK_SLASH_RESPONSE');
    expect(frame.context.reason).toBe('nam-man');

    // Theo đúng chiều kim đồng hồ: Player 1 phản hồi trước tiên
    // Player 1 responds with Chém -> defended, hp stays 3
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, responseType: 'provide', data: { cardId: 'c_slash_p1' } }
    });
    expect(p1.hp).toBe(3);
    expect(p1.hand.length).toBe(0);

    // Player 2 giải quyết tiếp theo -> responds with skip -> takes 1 damage
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 2, responseType: 'skip', data: {} }
    });
    expect(p2.hp).toBe(2);

    // Player 3 giải quyết cuối cùng -> responds with skip -> takes 1 damage
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 3, responseType: 'skip', data: {} }
    });
    expect(p3.hp).toBe(2);
    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('3. Loạn Tiễn (Vạn Tiễn Quy Tâm) gán chuẩn reason van-tien và không kích hoạt vũ khí chém', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    // p0 equips Rìu Đá
    p0.equipment.weapon = { id: 'riu_da_1', name: 'Rìu Đá', key: 'riu-da' };
    p0.hand.push({ id: 'c1', name: 'Bài 1' }, { id: 'c2', name: 'Bài 2' });
    p0.hand.push({ id: 'c_rain', name: 'Loạn Tiễn', type: 'trick' });

    p1.hand.push({ id: 'c_dodge_p1', name: 'Né', type: 'dodge' });

    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 0, cardId: 'c_rain', targetIds: [1] }
    });

    resolveNegateStack();

    const vm = toViewModel(state, 1);
    expect(vm.waitingForResponse.type).toBe('ask_dodge');
    expect(vm.waitingForResponse.reason).toBe('van-tien');

    // Respond to all players in LIFO stack: player 1 dodges, others take damage
    while (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_DODGE') {
      const actorId = state.priorityStack.peek().currentActorId;
      if (actorId === 1) {
        dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 1, responseType: 'provide', data: { cardId: 'c_dodge_p1' } }
        });
      } else {
        dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: actorId, responseType: 'skip', data: {} }
        });
      }
    }

    expect(p1.hp).toBe(3); // unharmed
    expect(p0.hand.length).toBe(2); // didn't discard cards for axe
  });

  it('4. Diệu Dược (Tuệ Tĩnh) kích hoạt qua useSkill mở ASK_DIEU_DUOC và hồi máu chính xác', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    p1.hp = 1; // damaged

    p0.hand.push({ id: 'card_heal_cost', name: 'Bài Rác', rank: 5 });

    // P0 triggers Diệu Dược without params (as human clicking ActionBar)
    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: { playerId: 0, skillId: 'dieu-duoc' }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_DIEU_DUOC');
    const vm = toViewModel(state, 0);
    expect(vm.waitingForResponse.type).toBe('ask_dieu_duoc');

    // P0 selects card and target 1
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { targetId: 1, cardIndexSelected: 0 }
      }
    });

    expect(p1.hp).toBe(2);
    expect(p0.hand.length).toBe(0);
    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('5. Hòa Thân (Huyền Trân) ép 2 tướng Nam Quyết Đấu', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);
    p1.gender = 'male';
    p2.gender = 'male';

    p0.hand.push({ id: 'cost_card', name: 'Lá Bài' });

    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: { playerId: 0, skillId: 'hoa-than' }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_HOA_THAN');

    // P0 reacts choosing targetA: 1, targetB: 2
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { targetA: 1, targetB: 2, cardId: 'cost_card' }
      }
    });

    resolveNegateStack();

    // Must have launched a Duel between 1 and 2
    expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');
    expect(state.priorityStack.peek().targetId).toBe(2);
  });

  it('6. Bình Loạn (Nguyễn Bặc) bỏ 2 lá cùng chất phát động Loạn Tiễn', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.hand.push(
      { id: 'heart_1', name: 'Đào', suit: 'heart', color: 'red' },
      { id: 'heart_2', name: 'Chém', suit: 'heart', color: 'red' }
    );

    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: { playerId: 0, skillId: 'binh-loan' }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_BINH_LOAN');

    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { cardIndexes: [0, 1] }
      }
    });

    resolveNegateStack();

    // Should have popped ASK_BINH_LOAN and launched ASK_DODGE (from Loạn Tiễn)
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().context.reason).toBe('van-tien');
    expect(p0.hand.length).toBe(0);
  });

  it('7. Chương Dương (Trần Quang Khải) tháo trang bị làm Hóa Giải', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    // p1 plays Cướp Bài
    p1.hand.push({ id: 'c_steal', name: 'Cướp Bài', type: 'trick' });
    p0.hand.push({ id: 'c_valuable', name: 'Thần Kiếm' });
    p0.equipment.weapon = { id: 'w_chuong_duong', name: 'Bát Quái', key: 'bat_quai' };

    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 1, cardId: 'c_steal', targetIds: [0] }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');

    // p0 uses weapon as Hóa Giải
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { cardId: 'w_chuong_duong', doNegate: true }
      }
    });

    expect(p0.equipment.weapon).toBeNull(); // removed from equipment
    expect(state.discardPile.some(c => c.id === 'w_chuong_duong')).toBe(true);
  });

  it('8. Thủy Tổ (Lạc Long Quân) giao 2 lá bài cho đồng minh và nhận thưởng 1 bài cơ bản', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.hp = 2; // damaged
    p0.hand.push({ id: 'gift_1', name: 'Bài 1' }, { id: 'gift_2', name: 'Bài 2' });

    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: { playerId: 0, skillId: 'thuy-to' }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_THUY_TO');

    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: {
          selectedAlly: 1,
          selectedCardIds: ['gift_1', 'gift_2']
        }
      }
    });

    expect(p1.hand.length).toBe(2);
    expect(p0.hand.length).toBe(0);

    // Received bonus frame
    expect(state.priorityStack.peek().type).toBe('ASK_THUY_TO_BONUS');

    // Use free Đào to heal
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 0,
        responseType: 'provide',
        data: { virtualCardName: 'Đào' }
      }
    });

    expect(p0.hp).toBe(3);
    expect(state.priorityStack.isEmpty()).toBe(true);
  });
});
