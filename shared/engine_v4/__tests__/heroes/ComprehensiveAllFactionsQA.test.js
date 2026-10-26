import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { LAC_HEROES } from '../../heroes/lac/index.js';
import { VIET_HEROES } from '../../heroes/viet/index.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { SON_HEROES } from '../../heroes/son/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../core/StateMachine.js';
import { canPlayCard } from '../../rules/TargetResolverV4.js';
import { TrickRules } from '../../rules/TrickRules.js';

describe('QA Toàn Diện Hệ Thống Kỹ Năng Tướng (Comprehensive Hero Skills Audit)', () => {
  beforeEach(() => {
    LAC_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
    VIET_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
    HA_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
    SON_HEROES.forEach(h => globalHeroRegistry.registerHero(h));
  });

  const setupTestGame = (playerOverrides = []) => {
    const defaultPlayers = [
      {
        id: 0,
        name: 'Player 0',
        hp: 4,
        maxHp: 4,
        revealedHeroes: [true, true],
        hand: [],
        equipment: {}
      },
      {
        id: 1,
        name: 'Player 1',
        hp: 4,
        maxHp: 4,
        revealedHeroes: [true, true],
        hand: [],
        equipment: {}
      },
      {
        id: 2,
        name: 'Player 2',
        hp: 4,
        maxHp: 4,
        revealedHeroes: [true, true],
        hand: [],
        equipment: {}
      }
    ];

    const mergedPlayers = defaultPlayers.map((p, idx) => ({
      ...p,
      ...(playerOverrides[idx] || {})
    }));

    const state = new GameState({
      players: mergedPlayers,
      drawPile: [
        { id: 'c1', name: 'Lá Bài 1', suit: 'spade', color: 'black', rank: 3 },
        { id: 'c2', name: 'Lá Bài 2', suit: 'club', color: 'black', rank: 7 },
        { id: 'c3', name: 'Lá Bài 3', suit: 'heart', color: 'red', rank: 9 },
        { id: 'c4', name: 'Lá Bài 4', suit: 'diamond', color: 'red', rank: 10 }
      ],
      discardPile: [],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });

    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  describe('1. Lạc Long Quân — Thủy Tổ Edge Case (Chặn kích hoạt khi 0 lá bài trên tay)', () => {
    it('Ném lỗi rõ ràng khi phát động Thủy Tổ mà không có bài trên tay', () => {
      const { state, dispatcher } = setupTestGame([
        { heroId: 'lac_long_quan', skills: ['thuy_to'], hand: [] }
      ]);

      expect(() => {
        dispatcher.dispatch({
          type: 'ACTION_USE_SKILL',
          throwOnError: true,
          payload: {
            playerId: 0,
            skillId: 'thuy_to'
          }
        });
      }).toThrow(/Bạn không có bài trên tay để chia/);

      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('Kích hoạt thành công frame ASK_THUY_TO khi có ít nhất 1 lá bài trên tay', () => {
      const { state, dispatcher } = setupTestGame([
        { heroId: 'lac_long_quan', skills: ['thuy_to'], hand: [{ id: 'card_1', name: 'Chém', suit: 'spade', rank: 5 }] }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'thuy_to'
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_THUY_TO');
    });
  });

  describe('2. Trần Khánh Dư — Vân Đồn (Đấu Điểm Modal & Cơ chế Thắng/Thua)', () => {
    it('Phát động Vân Đồn đẩy frame ASK_VAN_DON và phản hồi đấu điểm thắng (Rank cao hơn)', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'tran_khanh_du',
          skills: ['van_don'],
          hand: [{ id: 'my_k', name: 'Ngựa K', suit: 'heart', rank: 'K' }]
        },
        {
          hand: [{ id: 'opp_2', name: 'Đao 2', suit: 'spade', rank: '2' }]
        }
      ]);

      // Player 0 phát động Vân Đồn nhắm vào Player 1
      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'van_don',
          targets: [1]
        }
      });

      expect(state.priorityStack.peek().type).toBe('ASK_VAN_DON');

      // Player 0 phản hồi cardId qua Modal
      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 0,
          cardId: 'my_k'
        }
      });

      // Player 1 (đối thủ) phản hồi bài đọ điểm
      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 1,
          cardId: 'opp_8'
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      const p0 = state.getPlayer(0);
      expect(p0.temporaryFlags?.vanDonWin).toBe(true);
      expect(p0.temporaryFlags?.vanDonLose).toBeUndefined();
    });

    it('Phản hồi đấu điểm thua hoặc hòa (Rank nhỏ hơn hoặc bằng)', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'tran_khanh_du',
          skills: ['van_don'],
          hand: [{ id: 'my_3', name: 'Né 3', suit: 'club', rank: '3' }]
        },
        {
          hand: [{ id: 'opp_10', name: 'Chém 10', suit: 'diamond', rank: '10' }]
        }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'van_don',
          targets: [1]
        }
      });

      // Player 0 chọn bài
      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 0,
          cardId: 'my_3'
        }
      });

      // Player 1 chọn bài
      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 1,
          cardId: 'opp_10'
        }
      });

      const p0 = state.getPlayer(0);
      expect(p0.temporaryFlags?.vanDonLose).toBe(true);
      expect(p0.temporaryFlags?.vanDonWin).toBeUndefined();
    });
  });

  describe('3. Công chúa An Tư — Hòa Thân (Chuyển hóa bài ♦ thành Hỗn Loạn qua Modal & Trang bị)', () => {
    it('Phát động Hòa Thân không kèm target đẩy frame ASK_HOA_THAN_AN_TU', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'cong_chua_an_tu',
          skills: ['hoa_than_an_tu'],
          hand: [{ id: 'd_card', name: 'Đào Rô', suit: 'diamond', rank: 8 }]
        }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'hoa_than_an_tu'
        }
      });

      expect(state.priorityStack.peek().type).toBe('ASK_HOA_THAN_AN_TU');

      // Phản hồi Modal gán Hỗn Loạn lên Player 1
      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 0,
          targetId: 1,
          cardId: 'd_card'
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      const p1 = state.getPlayer(1);
      expect(p1.judgementArea.some(c => c.name === 'Hỗn Loạn')).toBe(true);
    });

    it('Dùng trang bị chất ♦ để đặt Hỗn Loạn qua Modal', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'cong_chua_an_tu',
          skills: ['hoa_than_an_tu'],
          hand: [],
          equipment: {
            weapon: { id: 'dia_long_dao', name: 'Địa Long Đao', type: 'equip', suit: 'diamond', rank: 5 }
          }
        }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'hoa_than_an_tu'
        }
      });

      expect(state.priorityStack.peek().type).toBe('ASK_HOA_THAN_AN_TU');

      // Phản hồi Modal từ equip
      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 0,
          targetId: 1,
          cardFrom: 'equip',
          cardIndex: 0
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      const p0 = state.getPlayer(0);
      expect(p0.equipment.weapon).toBeUndefined();
      const p1 = state.getPlayer(1);
      expect(p1.judgementArea.some(c => c.name === 'Hỗn Loạn')).toBe(true);
    });
  });

  describe('4. Nguyễn Địa Lô — Can Gián (Tự mất 1 HP giúp đồng minh rút 2 bài)', () => {
    it('Phát động Can Gián không target đẩy frame ASK_CAN_GIAN và phản hồi mất 1 HP cho đồng minh rút bài', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'nguyen_dia_lo',
          skills: ['can_gian'],
          hp: 3
        },
        {
          hp: 4,
          hand: []
        }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'can_gian'
        }
      });

      expect(state.priorityStack.peek().type).toBe('ASK_CAN_GIAN');

      // Phản hồi cứu Player 1
      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 0,
          doUse: true,
          targetId: 1
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      const p0 = state.getPlayer(0);
      const p1 = state.getPlayer(1);
      expect(p0.hp).toBe(2);
      expect(p1.hand.length).toBe(2);
    });

    it('Chặn Can Gián khi sinh lực chỉ còn 1 HP', () => {
      const { dispatcher } = setupTestGame([
        {
          heroId: 'nguyen_dia_lo',
          skills: ['can_gian'],
          hp: 1
        }
      ]);

      expect(() => {
        dispatcher.dispatch({
          type: 'ACTION_USE_SKILL',
          throwOnError: true,
          payload: {
            playerId: 0,
            skillId: 'can_gian'
          }
        });
      }).toThrow(/Sinh lực phải lớn hơn 1 để Can Gián/);
    });
  });

  describe('5. Trần Nhật Duật — Thông Ngôn (Thu hồi lá bài phán xét sau khi có hiệu lực)', () => {
    it('Frame ASK_THONG_NGON thu hồi lá phán xét từ discardPile về tay', () => {
      const judgeCard = { id: 'judge_s_5', name: 'Lá Phán Xét', suit: 'spade', rank: 5 };
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'tran_nhat_duat',
          skills: ['thong_ngon'],
          hand: []
        }
      ]);

      state.discardPile.push(judgeCard);

      state.priorityStack.push({
        type: 'ASK_THONG_NGON',
        sourceId: 0,
        targetId: 0,
        currentActorId: 0,
        priorityQueue: [0],
        context: { judgeCard }
      });

      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 0,
          doUse: true
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      const p0 = state.getPlayer(0);
      expect(p0.hand.some(c => c.id === 'judge_s_5')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'judge_s_5')).toBe(false);
    });
  });

  describe('6. Nguyên Phi Ỷ Lan — Phật Tâm (Chuỗi phán xét Đen liên tiếp)', () => {
    it('Frame ASK_PHAT_TAM phán xét rút các lá Đen liên tiếp và thu về tay khi gặp lá Đỏ', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'nguyen_phi_y_lan',
          skills: ['phat_tam'],
          hand: []
        }
      ]);

      // drawPile pop từ cuối: muốn b1 (Đen) -> b2 (Đen) -> r1 (Đỏ) -> mảng [r1, b2, b1]
      state.drawPile = [
        { id: 'r1', name: 'Đỏ', suit: 'heart', color: 'red', rank: 2 },
        { id: 'b2', name: 'Đen 2', suit: 'club', color: 'black', rank: 4 },
        { id: 'b1', name: 'Đen 1', suit: 'spade', color: 'black', rank: 7 }
      ];

      state.priorityStack.push({
        type: 'ASK_PHAT_TAM',
        sourceId: 0,
        targetId: 0,
        currentActorId: 0,
        priorityQueue: [0]
      });

      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 0,
          doUse: true
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      const p0 = state.getPlayer(0);
      expect(p0.hand.length).toBe(2);
      expect(p0.hand.some(c => c.id === 'b1')).toBe(true);
      expect(p0.hand.some(c => c.id === 'b2')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'r1')).toBe(true);
    });
  });

  describe('7. Nguyễn Trãi — Tâm Công Edge Case (Chặn kích hoạt khi bài tay rỗng)', () => {
    it('Ném lỗi rõ ràng khi dùng Tâm Công mà Nguyễn Trãi không còn bài trên tay', () => {
      const { state, dispatcher } = setupTestGame([
        { heroId: 'nguyen_trai', skills: ['tam_cong'], hand: [] },
        { heroId: 'son_tinh', hand: [{ id: 'c1', name: 'Né', suit: 'heart' }] }
      ]);

      expect(() => {
        dispatcher.dispatch({
          type: 'ACTION_USE_SKILL',
          throwOnError: true,
          payload: {
            playerId: 0,
            skillId: 'tam_cong',
            targets: [1]
          }
        });
      }).toThrow(/Bạn không có bài trên tay để đối thủ rút/);
    });

    it('Kích hoạt ASK_SUIT thành công khi có bài trên tay và đẩy vào priorityStack', () => {
      const { state, dispatcher } = setupTestGame([
        { heroId: 'nguyen_trai', skills: ['tam_cong'], hand: [{ id: 'c1', name: 'Chém', suit: 'heart', rank: 7 }] },
        { heroId: 'son_tinh', hand: [] }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'tam_cong',
          targets: [1]
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(false);
      expect(state.priorityStack.peek().type).toBe('ASK_SUIT');
      expect(state.priorityStack.peek().currentActorId).toBe(1);
    });
  });

  describe('8. Hồ Xuân Hương — Duyên Thơ (Kiểm tra giới tính & hồi phục HP)', () => {
    it('Kích hoạt frame ASK_DUYEN_THO khi có 2 lá bài trên tay và có tướng Nam bị thương', () => {
      const { state, dispatcher } = setupTestGame([
        { heroId: 'ho_xuan_huong', gender: 'female', skills: ['duyen_tho'], hp: 2, maxHp: 3, hand: [{ id: 'c1' }, { id: 'c2' }] },
        { heroId: 'thanh_giong', gender: 'male', hp: 2, maxHp: 4, hand: [] }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'duyen_tho',
          targets: [1]
        }
      });

      expect(state.priorityStack.peek().type).toBe('ASK_DUYEN_THO');
    });
  });

  describe('9. Trần Nhật Duật — Hòa Nghị (Bảo toàn 2 lá bài về tay)', () => {
    it('Phản hồi ASK_HOA_NGHI với canceled hoặc doUse false bảo toàn bài rút trên tay', () => {
      const { state, dispatcher } = setupTestGame([
        { heroId: 'tran_nhat_duat', skills: ['hoa_nghi'], hand: [{ id: 'draw_1', name: 'Bài 1' }, { id: 'draw_2', name: 'Bài 2' }] }
      ]);

      state.priorityStack.push({
        type: 'ASK_HOA_NGHI',
        sourceId: 0,
        targetId: 0,
        currentActorId: 0,
        priorityQueue: [0]
      });

      dispatcher.dispatch({
        type: 'ACTION_REACT',
        throwOnError: true,
        payload: {
          playerId: 0,
          doUse: false
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      const p0 = state.getPlayer(0);
      expect(p0.hand.length).toBe(2);
    });
  });

  describe('10. Thần Trụ Trời — Khai Thiên (Chuyển hóa bài đỏ thành Chém)', () => {
    it('Đánh lá bài Đỏ bất kỳ (Cẩm Nang hoặc Trang Bị) với virtualCardName Chém', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'than_tru_troi',
          skills: ['khai_thien'],
          hand: [{ id: 'red_trick', name: 'Vô Trung Sinh Hữu', color: 'red', suit: 'heart', rank: 7 }]
        },
        {
          heroId: 'tue_tinh',
          hp: 3,
          maxHp: 3,
          hand: []
        }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_PLAY_CARD',
        throwOnError: true,
        payload: {
          playerId: 0,
          cardId: 'red_trick',
          targetId: 1,
          virtualCardName: 'Chém',
          asSlash: true
        }
      });

      // TargetResolver/PriorityStack đẩy ASK_DODGE cho target 1
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(1);
    });
  });

  describe('11. Ngọc Hân Công Chúa — Quốc Sắc Synergy Matrix (Chất Bích chuyển thành Cơ/Đỏ kết hợp các tướng)', () => {
    it('11.1. Quốc Sắc + Khai Thiên: Thẻ Spade ♠ được canPlayCard và đánh ra như [Chém] trong pha Ra bài', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          subHeroId: 'than_tru_troi',
          skills: ['quoc_sac', 'khai_thien'],
          hand: [{ id: 'spade_trick', name: 'Vô Trung Sinh Hữu', color: 'black', suit: 'spade', rank: 7 }]
        },
        {
          heroId: 'tue_tinh',
          hp: 3,
          maxHp: 3,
          hand: []
        }
      ]);

      const check = canPlayCard(state, 0, 'Chém', 'spade_trick');
      expect(check.valid).toBe(true);

      dispatcher.dispatch({
        type: 'ACTION_PLAY_CARD',
        throwOnError: true,
        payload: {
          playerId: 0,
          cardId: 'spade_trick',
          targetId: 1,
          virtualCardName: 'Chém',
          asSlash: true
        }
      });

      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect(state.priorityStack.peek().targetId).toBe(1);
    });

    it('11.2. Quốc Sắc + Khai Thiên: Thẻ Spade ♠ dùng để đáp trả Quyết Đấu (ASK_SLASH_DUEL)', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          subHeroId: 'than_tru_troi',
          skills: ['quoc_sac', 'khai_thien'],
          hand: [{ id: 'spade_card', name: 'Đao Bích', color: 'black', suit: 'spade', rank: 5 }]
        },
        {
          heroId: 'tue_tinh',
          hand: []
        }
      ]);

      // Push ASK_SLASH_DUEL cho player 0
      state.priorityStack.push({
        type: 'ASK_SLASH_DUEL',
        sourceId: 1,
        targetId: 0,
        currentActorId: 0,
        priorityQueue: [0],
        context: { attackerId: 1, currentResponderId: 0 }
      });

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'spade_card'
      });

      // Player 0 đã đáp trả thành công lá Spade như Chém, quyền chuyển sang Player 1
      expect(state.priorityStack.peek().currentActorId).toBe(1);
    });

    it('11.3. Quốc Sắc + Khai Thiên: Thẻ Spade ♠ dùng để đáp trả Nam Man Xâm Nhập (ASK_SLASH_RESPONSE)', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          subHeroId: 'than_tru_troi',
          skills: ['quoc_sac', 'khai_thien'],
          hand: [{ id: 'spade_card', name: 'Bài Bích', color: 'black', suit: 'spade', rank: 8 }]
        }
      ]);

      state.priorityStack.push({
        type: 'ASK_SLASH_RESPONSE',
        sourceId: 1,
        targetId: 0,
        currentActorId: 0,
        priorityQueue: [0],
        context: { reason: 'barbarian' }
      });

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'spade_card'
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(state.getPlayer(0).hand.length).toBe(0);
    });

    it('11.4. Quốc Sắc + Nam Dược: Thẻ Spade ♠ dùng như [Đào] cứu đồng đội hấp hối (ASK_PEACH)', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          subHeroId: 'tue_tinh',
          skills: ['quoc_sac', 'nam_duoc'],
          hand: [{ id: 'spade_card', name: 'Bài Bích', color: 'black', suit: 'spade', rank: 9 }]
        },
        {
          id: 1,
          name: 'Đồng Minh',
          hp: 0,
          maxHp: 4,
          hand: []
        }
      ]);

      // Turn hiện tại là của player 1 (ngoài lượt của Player 0)
      state.currentTurnPlayerId = 1;
      state.priorityStack.push({
        type: 'ASK_PEACH',
        sourceId: 1,
        targetId: 1,
        currentActorId: 0,
        priorityQueue: [0],
        context: { dyingPlayerId: 1 }
      });

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        cardId: 'spade_card',
        doSave: true
      });

      expect(state.getPlayer(1).hp).toBe(1);
      expect(state.getPlayer(0).hand.length).toBe(0);
    });

    it('11.5. Quốc Sắc + Thần Hỏa: Thẻ Spade ♠ dùng làm [Hỏa Công] đánh vào đối thủ', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          subHeroId: 'rua_vang',
          skills: ['quoc_sac', 'than_hoa'],
          hand: [{ id: 'spade_card', name: 'Thẻ Bích', color: 'black', suit: 'spade', rank: 10 }]
        },
        {
          heroId: 'dinh_tien_hoang',
          hand: [{ id: 'target_card', name: 'Target Hand', suit: 'heart', color: 'red' }]
        }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_PLAY_CARD',
        throwOnError: true,
        payload: {
          playerId: 0,
          cardId: 'spade_card',
          targetId: 1,
          virtualCardName: 'Hỏa Công',
          asFireAttack: true
        }
      });

      // Trick bắt đầu bằng cơ hội Hóa Giải (ASK_NEGATE)
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
      TrickRules.respondNegate(state, 0, null);
      TrickRules.respondNegate(state, 1, null);
      TrickRules.respondNegate(state, 2, null);

      expect(state.priorityStack.peek().type).toBe('ASK_HOACONG_REVEAL');
      expect(state.priorityStack.peek().currentActorId).toBe(1);
    });

    it('11.6. Quốc Sắc + Kỳ Tập: Thẻ Spade ♠ (đã thành Đỏ) KHÔNG thể dùng làm [Tước Bài], nhưng thẻ Club ♣ vẫn dùng được', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          subHeroId: 'da_tuong',
          skills: ['quoc_sac', 'ky_tap'],
          hand: [
            { id: 'spade_card', name: 'Thẻ Bích', color: 'black', suit: 'spade', rank: 2 },
            { id: 'club_card', name: 'Thẻ Nhép', color: 'black', suit: 'club', rank: 4 }
          ]
        },
        {
          id: 1,
          hand: [{ id: 'target_card', name: 'Bị Tước' }]
        }
      ]);

      // Thử dùng Spade cho Kỳ Tập -> phải ném lỗi vì Spade đã xem như Heart (Đỏ)
      expect(() => {
        dispatcher.dispatch({
          type: 'ACTION_USE_SKILL',
          throwOnError: true,
          payload: {
            playerId: 0,
            skillId: 'ky_tap',
            cardIds: ['spade_card'],
            targets: [1]
          }
        });
      }).toThrow('Đen');

      // Dùng Club cho Kỳ Tập -> Thành công phát động Tước Bài
      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'ky_tap',
          cardIds: ['club_card'],
          targets: [1]
        }
      });

      // Bỏ qua Hóa Giải để hoàn tất Tước Bài
      expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
      TrickRules.respondNegate(state, 0, null);
      TrickRules.respondNegate(state, 1, null);
      TrickRules.respondNegate(state, 2, null);

      expect(state.getPlayer(1).hand.length).toBe(0);
    });

    it('11.7. Quốc Sắc + Bình Loạn: 1 thẻ Spade ♠ và 1 thẻ Heart ♥ được xem là cùng chất và phát động Loạn Tiễn', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          subHeroId: 'nguyen_bac',
          skills: ['quoc_sac', 'binh_loan'],
          hand: [
            { id: 'spade_card', name: 'Thẻ Bích', color: 'black', suit: 'spade', rank: 3 },
            { id: 'heart_card', name: 'Thẻ Cơ', color: 'red', suit: 'heart', rank: 6 }
          ]
        },
        {
          id: 1,
          hand: []
        }
      ]);

      dispatcher.dispatch({
        type: 'ACTION_USE_SKILL',
        throwOnError: true,
        payload: {
          playerId: 0,
          skillId: 'binh_loan',
          cardIds: ['spade_card', 'heart_card']
        }
      });

      // Phát động thành công Loạn Tiễn (ArrowRain) -> đẩy ASK_DODGE cho các đối thủ còn sống
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
      expect([1, 2]).toContain(state.priorityStack.peek().targetId);
    });

    it('11.8. Quốc Sắc + Quân Cơ: Thẻ Spade ♠ KHÔNG thể dùng thay phán xét vì không còn là Đen', () => {
      const { state, dispatcher } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          subHeroId: 'dinh_dien',
          skills: ['quoc_sac', 'quan_co'],
          hand: [{ id: 'spade_card', name: 'Thẻ Bích', color: 'black', suit: 'spade', rank: 3 }]
        },
        {
          id: 1,
          hand: []
        }
      ]);

      state.priorityStack.push({
        type: 'ASK_CHANGE_JUDGE',
        sourceId: 0,
        targetId: 1,
        currentActorId: 0,
        priorityQueue: [0],
        context: {
          judgeCard: { id: 'old_judge', name: 'Sấm Sét', suit: 'spade', rank: 5 },
          delayedCard: { id: 'sam_set' },
          candidateIds: [0],
          candidateIndex: 0
        }
      });

      expect(() => {
        TrickRules.respondChangeJudge(state, 0, state.getPlayer(0).hand[0]);
      }).toThrow('Đen');
    });

    it('11.9. Hỏa Công Kích Hỏa: Khi bài lộ là Heart ♥, người phát động có Quốc Sắc có thể bỏ Spade ♠ để kích hỏa', () => {
      const { state } = setupTestGame([
        {
          heroId: 'ngoc_han_cong_chua',
          skills: ['quoc_sac'],
          hand: [{ id: 'spade_card', name: 'Thẻ Bích', color: 'black', suit: 'spade', rank: 4 }]
        },
        {
          id: 1,
          hp: 3,
          maxHp: 3,
          hand: []
        }
      ]);

      state.priorityStack.push({
        type: 'ASK_HOACONG_DISCARD',
        sourceId: 0,
        targetId: 1,
        currentActorId: 0,
        priorityQueue: [0],
        context: {
          revealedCard: { id: 'heart_rev', name: 'Thẻ Cơ Lộ', suit: 'heart', color: 'red' }
        }
      });

      const res = TrickRules.respondHoaCongDiscard(state, 0, state.getPlayer(0).hand[0]);
      expect(res.success).toBe(true);
      expect(state.getPlayer(1).hp).toBe(2); // Dính 1 sát thương Lửa
    });
  });
});
