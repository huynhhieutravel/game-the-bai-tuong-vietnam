import { describe, it, expect, vi } from 'vitest';
import { Dispatcher } from '../core/Dispatcher.js';
import { PlayCardAction, ReactAction } from '../core/Actions.js';
import { CardRegistry } from '../registries/CardRegistry.js';
import { EquipRegistry } from '../registries/EquipRegistry.js';
import { getDistance } from '../rangeSystem.js';

function createTestState(overrides = {}) {
  const p0 = {
    id: 0, hp: 3, maxHp: 3, isAlive: true,
    hand: overrides.p0Hand || [],
    equipment: overrides.p0Equip || [],
    judges: [],
    gender: 'Nam'
  };
  const p1 = {
    id: 1, hp: 3, maxHp: 3, isAlive: true,
    hand: overrides.p1Hand || [],
    equipment: overrides.p1Equip || [],
    judges: [],
    gender: 'Nữ'
  };
  const p2 = {
    id: 2, hp: 3, maxHp: 3, isAlive: true,
    hand: overrides.p2Hand || [], 
    equipment: overrides.p2Equip || [], 
    judges: [], gender: 'Nam'
  };

  return {
    players: [p0, p1, p2],
    currentTurn: 0,
    waitingForResponse: null,
    reactionStack: [],
    actionQueue: [],
    history: [],
    deck: [],
    discardPile: []
  };
}

describe('Equipments - Armor & Horses', () => {
  it('1. Bát Quái > Yêu cầu phán xét khi bị đòi Né', () => {
    const slash = { id: 'slash-1', name: 'Chém', suit: '♠', type: 'basic' };
    const batQuai = { ...EquipRegistry['bat-quai'], id: 'bat-quai-1' };
    
    const state = createTestState({
      p0Hand: [slash],
      p1Equip: [batQuai]
    });
    
    // Giả lập thẻ phán xét ra Đỏ (Cơ)
    state.deck.push({ id: 'dao-do', name: 'Đào', type: 'basic', suit: 'heart', color: 'red' });
    
    const dispatcher = new Dispatcher(state);
    
    dispatcher.dispatchAction(PlayCardAction(0, slash.id, [1]));
    
    // Bát Quái phán xét Đỏ -> coi như đã ra Né
    expect(dispatcher.getState().players[1].hp).toBe(3);
    expect(dispatcher.getState().waitingForResponse).toBeNull();
  });

  it('2. Hắc Thuẫn > Vô hiệu hóa Chém đen', () => {
    const slashBlack = { id: 'slash-1', name: 'Chém', suit: '♠', color: 'black', type: 'basic' };
    const hacThuan = { ...EquipRegistry['hac-thuan'], id: 'hac-thuan-1' };
    
    const state = createTestState({
      p0Hand: [slashBlack],
      p1Equip: [hacThuan]
    });
    
    const dispatcher = new Dispatcher(state);
    dispatcher.dispatchAction(PlayCardAction(0, slashBlack.id, [1]));
    
    // Hắc Thuẫn đỡ tự động, không trừ máu, không cần Né
    expect(dispatcher.getState().waitingForResponse).toBeNull();
    expect(dispatcher.getState().players[1].hp).toBe(3);
  });
  
  it('3. Bạch Ngân > Giới hạn sát thương lớn nhất là 1, hồi máu khi tháo', () => {
    const fireAtk = { id: 'hoa-cong', name: 'Hỏa Công', suit: '♥', color: 'red', type: 'trick' };
    const discardCard = { id: 'dump', suit: '♥', color: 'red' };
    const bachNgan = { ...EquipRegistry['bach-ngan'], id: 'bach-ngan-1' };
    
    const state = createTestState({
      p0Hand: [fireAtk, discardCard],
      p1Hand: [{ id: 'target-card', suit: '♥', color: 'red' }],
      p1Equip: [bachNgan]
    });
    // Giả sử có một event gây 3 sát thương
    const dispatcher = new Dispatcher(state);
    
    // Gọi trực tiếp EVENT_DAMAGE với amount = 3
    dispatcher.getState().reactionStack.push({
        type: 'EVENT_DAMAGE',
        payload: { sourceId: 0, targetId: 1, amount: 3, damageType: 'normal' }
    });
    
    dispatcher.tick();
    
    // Máu bị trừ 1, vì Bạch Ngân giới hạn sát thương là 1
    expect(dispatcher.getState().players[1].hp).toBe(2);
    
    // Test tháo giáp Bạch Ngân -> hồi máu
    const effect = {
        type: 'MOVE_CARD',
        cardId: bachNgan.id,
        fromZone: 'equipment',
        toZone: 'discardPile',
        fromPlayerId: 1
    };
    dispatcher.applyEffect(effect);
    expect(dispatcher.getState().players[1].hp).toBe(3); // Hồi 1 máu từ 2 -> 3
  });

  it('4. Ngựa Chiến và Ngựa Thần > Thay đổi khoảng cách', () => {
    const nguaChien = { ...EquipRegistry['ngua-chien'], id: 'horse-atk', type: 'equip', subType: 'equip_mount_atk' };
    const nguaThan = { ...EquipRegistry['ngua-than'], id: 'horse-def', type: 'equip', subType: 'equip_mount_def' };
    
    const state = createTestState({
      p0Equip: [nguaChien], // p0 -1 distance
      p2Equip: [nguaThan]   // p2 +1 distance
    });
    
    // Distance from p0 to p1: base 1, nguaChien -1 -> 0, but min is 1
    let d01 = getDistance(state, 0, 1);
    expect(d01).toBe(1);
    
    // Distance from p0 to p2: base 1 (since 3 players, 0 and 2 are adjacent), nguaChien -1, nguaThan +1 -> 1
    let d02 = getDistance(state, 0, 2);
    expect(d02).toBe(1);
    
    // Distance from p1 to p2: base 1, p2 has nguaThan -> 1+1=2
    let d12 = getDistance(state, 1, 2);
    expect(d12).toBe(2);
    
    // Distance from p1 to p0: base 1, p0 has nguaChien (only affects P0's attack, not defense) -> 1
    let d10 = getDistance(state, 1, 0);
    expect(d10).toBe(1);
  });

  it('5. Ngựa Chiến và Ngựa Thần > Khoảng cách khi có người chết', () => {
    const nguaChien = { ...EquipRegistry['ngua-chien'], id: 'horse-atk', type: 'equip', subType: 'equip_mount_atk' };
    const nguaThan = { ...EquipRegistry['ngua-than'], id: 'horse-def', type: 'equip', subType: 'equip_mount_def' };
    
    const state = createTestState({
      p0Equip: [nguaChien], // p0 -1 distance
      p2Equip: [nguaThan]   // p2 +1 distance
    });
    
    // Add a 4th player
    state.players.push({
      id: 3, hp: 3, maxHp: 3, isAlive: true,
      hand: [], equipment: [], judges: []
    });

    // P0 -> P2 normally would be 2 (P0 - P1 - P2 or P0 - P3 - P2)
    // Distance from P0 to P2 = raw (2) - 1 (nguaChien) + 1 (nguaThan) = 2
    expect(getDistance(state, 0, 2)).toBe(2);

    // Now P1 dies
    state.players[1].isAlive = false;

    // The circle shrinks. The remaining players are P0, P2, P3.
    // The order is 0, 2, 3.
    // Index of P0 is 0. Index of P2 is 1. Index of P3 is 2.
    // Raw distance from P0 to P2 is now 1!
    // Distance from P0 to P2 = raw (1) - 1 (nguaChien) + 1 (nguaThan) = 1
    expect(getDistance(state, 0, 2)).toBe(1);
    
    // Distance from P0 to P3 = raw (1) - 1 (nguaChien) = 0, but min is 1
    // P0 index 0, P3 index 2. rawDist = 2. min(2, 3-2) = 1.
    // finalDist = 1 - 1 = 0. Math.max(1, 0) = 1.
    expect(getDistance(state, 0, 3)).toBe(1); // Minimum distance is always 1
  });
});
