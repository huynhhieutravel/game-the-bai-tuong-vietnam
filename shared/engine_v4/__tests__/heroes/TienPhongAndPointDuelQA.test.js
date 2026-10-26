import { describe, it, expect, beforeEach } from 'vitest';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { GameState } from '../../core/GameState.js';
import { CombatRules } from '../../rules/CombatRules.js';

describe('QA Chuyên Sâu: Nguyễn Lữ (Tiên Phong) và Quy Tắc Đấu Điểm (Point Duel)', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    state = new GameState({
      players: [
        {
          id: 0,
          name: 'Player 0 (Nguyễn Lữ)',
          hp: 3,
          maxHp: 4,
          isAlive: true,
          role: 'rebel',
          skills: ['tien_phong_nguyen_lu'],
          hand: [
            { id: 'w_dao_long', name: 'Thanh Long Đao', type: 'equip', subtype: 'equip_weapon', suit: 'diamond', rank: '3' },
            { id: 'c_chem_1', name: 'Chém', type: 'basic', subtype: 'slash', suit: 'spade', rank: '2' }
          ],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          temporaryFlags: {},
          turnStats: {}
        },
        {
          id: 1,
          name: 'Player 1 (Trần Khánh Dư)',
          hp: 4,
          maxHp: 4,
          isAlive: true,
          role: 'lord',
          skills: ['van_don'],
          hand: [
            { id: 'c_q_spade', name: 'Tước Bài', type: 'trick', rank: 'Q', suit: 'spade' }
          ],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          temporaryFlags: {},
          turnStats: {}
        },
        {
          id: 2,
          name: 'Player 2 (Mục Tiêu)',
          hp: 3,
          maxHp: 3,
          isAlive: true,
          role: 'rebel',
          skills: [],
          hand: [
            { id: 'c_8_heart', name: 'Hóa Giải', type: 'trick', rank: '8', suit: 'heart' }
          ],
          equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
          temporaryFlags: {},
          turnStats: {}
        }
      ]
    });
    dispatcher = new DispatcherV4(state);
  });

  describe('1. Nguyễn Lữ - Tiên Phong: Bỏ Vũ Khí Trên Tay', () => {
    it('1.1. Bỏ vũ khí trên tay (Thanh Long Đao) khi mở Modal ASK_TIEN_PHONG: Nguyễn Lữ không mất máu, mục tiêu mất 1 HP', () => {
      // Phát động Tiên Phong không truyền costType -> Mở modal ASK_TIEN_PHONG
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'tien_phong',
        playerId: 0,
        targets: [1]
      });

      expect(state.priorityStack.peek().type).toBe('ASK_TIEN_PHONG');

      // Chọn bỏ vũ khí trên tay (Thanh Long Đao)
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        doUse: true,
        costType: 'weapon',
        cardId: 'w_dao_long'
      });

      // Frame được giải quyết
      expect(state.priorityStack.isEmpty()).toBe(true);
      // Nguyễn Lữ KHÔNG bị trừ HP (vẫn còn 3 HP)
      expect(state.getPlayer(0).hp).toBe(3);
      // Lá Thanh Long Đao không còn trên tay
      expect(state.getPlayer(0).hand.some(c => c.id === 'w_dao_long')).toBe(false);
      // Lá Thanh Long Đao đã vào discardPile
      expect(state.discardPile.some(c => c.id === 'w_dao_long')).toBe(true);
      // Mục tiêu Player 1 mất 1 HP (từ 4 xuống 3)
      expect(state.getPlayer(1).hp).toBe(3);
    });

    it('1.2. Kích hoạt trực tiếp Tiên Phong với costType = "weapon" và có vũ khí trên tay: Thành công', () => {
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'tien_phong',
        playerId: 0,
        targets: [1],
        options: { costType: 'weapon', cardId: 'w_dao_long' }
      });

      expect(state.getPlayer(0).hp).toBe(3);
      expect(state.getPlayer(1).hp).toBe(3);
      expect(state.getPlayer(0).hand.some(c => c.id === 'w_dao_long')).toBe(false);
    });

    it('1.3. Khi có cả vũ khí trang bị và vũ khí trên tay: Cho phép chỉ định lá cụ thể để bỏ', () => {
      const p0 = state.getPlayer(0);
      p0.equipment.weapon = { id: 'w_lien_no', name: 'Liên Nỏ', type: 'equip', subtype: 'equip_weapon' };

      // Bỏ lá vũ khí trên tay
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'tien_phong',
        playerId: 0,
        targets: [1],
        options: { costType: 'weapon', cardId: 'w_dao_long' }
      });

      // Vũ khí trang bị vẫn còn nguyên
      expect(p0.equipment.weapon?.id).toBe('w_lien_no');
      // Vũ khí trên tay bị bỏ
      expect(p0.hand.some(c => c.id === 'w_dao_long')).toBe(false);
      expect(p0.hp).toBe(3);
    });
  });

  describe('2. Quy Tắc Đấu Điểm (Point Duel) Chuẩn 2 Bước', () => {
    it('2.1. Trần Khánh Dư phát động Vân Đồn: Đẩy frame với priorityQueue gồm cả 2 bên [source, target]', () => {
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'van_don',
        playerId: 1,
        targets: [2]
      });

      const frame = state.priorityStack.peek();
      expect(frame.type).toBe('ASK_VAN_DON');
      expect(frame.currentActorId).toBe(1);
      expect(frame.priorityQueue).toEqual([1, 2]);
    });

    it('2.2. Trần Khánh Dư chọn bài trước -> Chuyển quyền cho mục tiêu Player 2 chọn bài', () => {
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'van_don',
        playerId: 1,
        targets: [2]
      });

      // Trần Khánh Dư (Player 1) chọn lá Q
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        cardId: 'c_q_spade'
      });

      // Frame KHÔNG được pop, mà chuyển quyền sang Player 2!
      const frame = state.priorityStack.peek();
      expect(frame).not.toBeNull();
      expect(frame.currentActorId).toBe(2);
      expect(frame.context.chosenCards[1]?.id).toBe('c_q_spade');

      // Player 2 (người bị thách đấu) chọn lá 8
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 2,
        cardId: 'c_8_heart'
      });

      // Frame hoàn tất và pop
      expect(state.priorityStack.isEmpty()).toBe(true);

      // Cả 2 lá bài đều đã vào discardPile (không tính là bị ép bỏ bài)
      expect(state.discardPile.some(c => c.id === 'c_q_spade')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'c_8_heart')).toBe(true);
      expect(state.getPlayer(1).hand.length).toBe(0);
      expect(state.getPlayer(2).hand.length).toBe(0);

      // Rank Q (12) > Rank 8 (8) -> Trần Khánh Dư THẮNG!
      expect(state.getPlayer(1).temporaryFlags.vanDonWin).toBe(true);
      expect(state.getPlayer(1).temporaryFlags.vanDonLose).toBeUndefined();
    });

    it('2.3. Quy tắc Điểm số Bằng Nhau: Tính là CẢ KHÔNG THẮNG VÀ KHÔNG THUA (HÒA)', () => {
      // Chuẩn bị 2 lá bài cùng rank 10
      state.getPlayer(1).hand = [{ id: 'card_10_spade', name: 'Sấm Sét', rank: '10', suit: 'spade' }];
      state.getPlayer(2).hand = [{ id: 'card_10_heart', name: 'Đào', rank: '10', suit: 'heart' }];

      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'van_don',
        playerId: 1,
        targets: [2]
      });

      // Player 1 ra lá 10
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 1,
        cardId: 'card_10_spade'
      });

      // Player 2 ra lá 10
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 2,
        cardId: 'card_10_heart'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      // Hai lá bằng nhau -> Trần Khánh Dư không thắng (bị cấm Chém do luật Vân Đồn quy định nếu không thắng)
      expect(state.getPlayer(1).temporaryFlags.vanDonWin).toBeUndefined();
      expect(state.getPlayer(1).temporaryFlags.vanDonLose).toBe(true);
      // Hai lá đều vào discardPile
      expect(state.discardPile.some(c => c.id === 'card_10_spade')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'card_10_heart')).toBe(true);
    });

    it('2.4. Tự Chủ (Khúc Thừa Dụ): Khi điểm số bằng nhau thì Hòa, không ai bị ép Chém', () => {
      const ktd = state.getPlayer(0);
      ktd.skills = ['tu_chu'];
      ktd.hp = 2; // HP thấp hơn Player 1 (4 HP)
      ktd.hand = [{ id: 'ktd_card_7', name: 'Chém', rank: '7', suit: 'spade' }];
      state.getPlayer(1).hand = [{ id: 'target_card_7', name: 'Né', rank: '7', suit: 'heart' }];

      // Đấu điểm Tự Chủ
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        targetId: 1,
        cardId: 'ktd_card_7',
        targetCardId: 'target_card_7'
      });

      // Hai lá rank 7 bằng nhau -> Hòa, không có đòn Chém nào được tung ra
      expect(state.getPlayer(0).hp).toBe(2);
      expect(state.getPlayer(1).hp).toBe(4);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });
});
