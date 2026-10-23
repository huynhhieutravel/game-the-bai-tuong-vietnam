import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { RuaVang } from '../../heroes/lac/index.js';

describe('Equipment Passives, Bát Quái & Dã Tâm (Engine v4)', () => {
  const createMockGame = (playerCount = 4) => {
    const drawPile = Array.from({ length: 40 }, (_, i) => ({
      id: `card_${i}`,
      name: `Thẻ ${i}`,
      type: 'basic',
      suit: 'spade',
      color: 'black'
    }));

    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: `Người chơi ${i}`,
      hp: 4,
      maxHp: 4,
      faction: 'lac',
      hand: [],
      revealedHeroes: [false, false]
    }));

    const gameState = new GameState({
      players,
      drawPile,
      currentTurnPlayerId: 0
    });

    return gameState;
  };

  it('1. Bát Quái: Phán xét ra ĐỎ -> Tự động Né thành công không mất bài', () => {
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    // p1 trang bị Bát Quái
    p1.equipment.armor = { id: 'bat_quai_1', name: 'Bát Quái', type: 'armor' };

    // Đặt lá đỏ lên đầu drawPile
    state.drawPile.push({ id: 'red_judge', name: 'Đào', suit: 'heart', color: 'red' });

    const slash = { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'spade', color: 'black' };
    p0.hand.push(slash);
    CombatRules.playSlash(state, 0, 1, slash);

    // p1 phán xét Bát Quái
    const res = CombatRules.respondDodge(state, 1, null, { useBagua: true });
    expect(res.dodged).toBe(true);
    expect(res.baguaSuccess).toBe(true);
    expect(p1.hp).toBe(4);
    expect(state.priorityStack.isEmpty()).toBe(true);
  });

  it('2. Bát Quái: Phán xét ra ĐEN -> Thất bại, có thể đánh tiếp lá [Né] từ tay', () => {
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p1.equipment.armor = { id: 'bat_quai_1', name: 'Bát Quái', type: 'armor' };
    const dodgeInHand = { id: 'dodge_1', name: 'Né', type: 'dodge' };
    p1.hand.push(dodgeInHand);

    // Đặt lá đen lên đầu drawPile
    state.drawPile.push({ id: 'black_judge', name: 'Chém', suit: 'spade', color: 'black' });

    const slash = { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red' };
    p0.hand.push(slash);
    CombatRules.playSlash(state, 0, 1, slash);

    // Thử Bát Quái -> Đen -> Thất bại
    const res1 = CombatRules.respondDodge(state, 1, null, { useBagua: true });
    expect(res1.dodged).toBe(false);
    expect(res1.baguaSuccess).toBe(false);
    expect(state.priorityStack.isEmpty()).toBe(false); // Frame ASK_DODGE vẫn còn

    // Đánh lá Né từ trên tay
    const res2 = CombatRules.respondDodge(state, 1, dodgeInHand);
    expect(res2.dodged).toBe(true);
    expect(p1.hp).toBe(4);
    expect(p1.hand.length).toBe(0);
  });

  it('3. Thần Giáp (Rùa Vàng): Không có giáp -> Tự động dùng Bát Quái', () => {
    globalHeroRegistry.register(RuaVang);
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p1.mainHeroId = 'rua_vang';
    p1.revealedHeroes = [true, false];
    expect(p1.equipment.armor).toBeNull();

    // Đặt lá đỏ lên đầu deck
    state.drawPile.push({ id: 'red_judge', name: 'Đào', suit: 'diamond', color: 'red' });

    const slash = { id: 'slash_1', name: 'Chém', type: 'slash', suit: 'club', color: 'black' };
    p0.hand.push(slash);
    CombatRules.playSlash(state, 0, 1, slash);

    const res = CombatRules.respondDodge(state, 1, null, { useBagua: true });
    expect(res.dodged).toBe(true);
    expect(res.baguaSuccess).toBe(true);
  });

  it('4. Dã Tâm: Khi số người cùng phe lộ diện > N/2 -> Thoái hóa thành Dã Tâm', () => {
    const state = createMockGame(4); // 4 người -> maxAllowed = Math.floor(4/2) = 2
    const dispatcher = new DispatcherV4(state);

    // Người 0 lộ diện phe Lạc
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 0, heroIndex: 0 }
    });
    expect(state.getPlayer(0).isDaTam).toBeFalsy();

    // Người 1 lộ diện phe Lạc (tổng 2 <= 2)
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 1, heroIndex: 0 }
    });
    expect(state.getPlayer(1).isDaTam).toBeFalsy();

    // Người 2 lộ diện phe Lạc (tổng 3 > 2) -> Biến thành Dã Tâm!
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 2, heroIndex: 0 }
    });
    expect(state.getPlayer(2).isDaTam).toBe(true);
  });

  it('5. Dã Tâm: Không được chia sẻ chiến thắng đồng đội; chỉ thắng khi là người sống sót duy nhất', () => {
    const state = createMockGame(3);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);

    p0.faction = 'lac';
    p1.faction = 'lac';
    p2.faction = 'lac';
    p1.isDaTam = true;

    // Giết p2, chỉ còn p0 và p1(Dã Tâm) -> Game KHÔNG được kết thúc bằng Team Victory!
    CombatRules.handleDeath(state, 2);
    expect(state.gameOver).toBeFalsy();

    // Giết nốt p0, p1 là người sống sót duy nhất -> Dã Tâm toàn thắng!
    CombatRules.handleDeath(state, 0);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toEqual([1]);
  });

  it('6. Quạt Sắt: +1 Sát thương khi mục tiêu không có bài trên tay', () => {
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.equipment.weapon = { id: 'quat_sat_1', name: 'Quạt Sắt', type: 'weapon' };
    p1.hand = []; // Hết bài trên tay

    CombatRules.applyDamage(state, 0, 1, 1, 'slash');
    // Bị tăng thêm +1 sát thương -> Mất 2 HP (4 -> 2)
    expect(p1.hp).toBe(2);
  });

  it('7. Bạch Ngân: Giảm sát thương dư thừa xuống tối đa 1 HP & hồi 1 HP khi tháo giáp', () => {
    const state = createMockGame(2);
    const p1 = state.getPlayer(1);

    p1.equipment.armor = { id: 'bach_ngan_1', name: 'Bạch Ngân', type: 'armor' };
    // Đòn đánh gây 3 sát thương (như Sấm Sét hoặc Rượu + Kỹ năng)
    CombatRules.applyDamage(state, 0, 1, 3, 'lightning');
    // Bạch Ngân chặn, chỉ mất 1 HP (4 -> 3)
    expect(p1.hp).toBe(3);

    // Khi tháo giáp hoặc thay thế giáp mới bằng Dispatcher
    const dispatcher = new DispatcherV4(state);
    const newArmor = { id: 'new_armor', name: 'Hắc Thuẫn', type: 'equip_armor' };
    p1.hand.push(newArmor);

    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 1, cardId: newArmor.id }
    });

    // p1 được hồi 1 HP (3 -> 4)
    expect(p1.hp).toBe(4);
    expect(p1.equipment.armor.name).toBe('Hắc Thuẫn');
  });

  it('8. Rìu Đá: Vứt 2 bài để xuyên phá cú Né của đối phương', () => {
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.equipment.weapon = { id: 'riu_da_1', name: 'Rìu Đá', type: 'weapon' };
    p0.hand = [
      { id: 'c1', name: 'Lá 1' },
      { id: 'c2', name: 'Lá 2' },
      { id: 'slash_1', name: 'Chém', type: 'slash' }
    ];

    const slash = p0.hand[2];
    CombatRules.playSlash(state, 0, 1, slash);

    // p1 dùng Né
    const dodge = { id: 'dodge_1', name: 'Né', type: 'dodge' };
    p1.hand.push(dodge);

    const res = CombatRules.respondDodge(state, 1, dodge);
    // Rìu Đá tự động bỏ 2 lá bài và xuyên phá cú Né!
    expect(res.penetrated).toBe(true);
    expect(p0.hand.length).toBe(0); // Đã bỏ 2 lá còn lại
    expect(p1.hp).toBe(3); // Bị mất 1 HP
  });

  it('9. Thanh Long Đao: Chém bị Né -> Được Chém tiếp nếu còn bài Chém trên tay', () => {
    const state = createMockGame(2);
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.equipment.weapon = { id: 'thanh_long_1', name: 'Thanh Long Đao', type: 'weapon' };
    const slash1 = { id: 'slash_1', name: 'Chém', type: 'slash' };
    const slash2 = { id: 'slash_2', name: 'Chém', type: 'slash' };
    p0.hand = [slash1, slash2];

    CombatRules.playSlash(state, 0, 1, slash1);

    const dodge1 = { id: 'dodge_1', name: 'Né', type: 'dodge' };
    p1.hand.push(dodge1);

    const res = CombatRules.respondDodge(state, 1, dodge1);
    // Thanh Long Đao kích hoạt, đánh tiếp lá Chém thứ hai!
    expect(res.retriggeredSlash).toBe(true);
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(p0.hand.length).toBe(0); // Đã dùng cả 2 lá Chém
  });
});
