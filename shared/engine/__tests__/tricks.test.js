import { createTestDispatcher, createCard, resetCardCounter } from './testHelper.js';
import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(() => {
  resetCardCounter();
});

function clearAskNegate(dispatcher) {
    while (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_negate') {
        dispatcher.dispatchAction({
            type: 'ACTION_REACT',
            payload: { playerId: dispatcher.state.waitingForResponse.responderId, responseType: 'cancel' }
        });
    }
}

describe('Trick Cards (Cẩm Nang) QA', () => {

  describe('1. Quyết Đấu (Duel)', () => {
    it('Người thắng Quyết Đấu không mất máu, người thua mất 1 HP', () => {
      const duelCard = createCard('Quyết Đấu', 'Cẩm nang', 'spade', 'A');
      const chemCard = createCard('Chém', 'Cơ bản', 'spade', '7');
      
      const dispatcher = createTestDispatcher({
        p0Hand: [duelCard, chemCard], // P0 có 1 Quyết Đấu, 1 Chém
        p1Hand: [] // P1 không có Chém
      });

      // P0 dùng Quyết Đấu lên P1
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: duelCard.id, targets: [1] }
      });

      clearAskNegate(dispatcher);

      // P1 bị hỏi Chém
      const askP1 = dispatcher.state.waitingForResponse;
      expect(askP1).toBeDefined();
      expect(askP1.type).toBe('ask_slash');
      expect(askP1.responderId).toBe(1);

      // P1 không có Chém nên bỏ qua
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'cancel' }
      });

      // P1 thua Quyết Đấu -> mất 1 HP
      expect(dispatcher.state.players[1].hp).toBe(3); // 4 - 1
      expect(dispatcher.state.players[0].hp).toBe(4);
    });
  });

  describe('2. Mượn Đao (Borrow Sword)', () => {
    it('Ép Target A chém Target B, nếu không chém bị cướp vũ khí', () => {
      const borrowCard = createCard('Mượn Đao', 'Cẩm nang', 'club', 'Q');
      const weapon = createCard('Thanh Long Đao', 'Trang bị', 'spade', '5');
      weapon.subType = 'Vũ khí';

      const dispatcher = createTestDispatcher({
        playerCount: 3,
        p0Hand: [borrowCard],
        p1Hand: [],
        p1Equipment: [weapon] // P1 có vũ khí
      });
      dispatcher.state.players[1].equipment[0] = weapon; // Đảm bảo lắp vũ khí

      // P0 dùng Mượn Đao lên P1 (ép P1 chém P2)
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: borrowCard.id, targets: [1, 2] }
      });

      clearAskNegate(dispatcher);
      const askSlash = dispatcher.state.waitingForResponse;
      expect(askSlash).toBeDefined();
      expect(askSlash.type).toBe('ask_slash');
      expect(askSlash.responderId).toBe(1);

      // P1 không chịu chém P2
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'cancel' }
      });

      // Vũ khí của P1 bị tước và chuyển sang P0
      expect(dispatcher.state.players[1].equipment.filter(e => e).length).toBe(0);
      expect(dispatcher.state.players[0].hand.find(c => c.id === weapon.id)).toBeDefined();
    });
  });

  describe('3. Hóa Giải (Negate)', () => {
    it('Hóa Giải chặn đứng Quyết Đấu', () => {
      const duelCard = createCard('Quyết Đấu', 'Cẩm nang', 'spade', 'A');
      const negateCard = createCard('Hóa Giải', 'Cẩm nang', 'spade', 'J');
      
      const dispatcher = createTestDispatcher({
        p0Hand: [duelCard],
        p1Hand: [negateCard] // P1 có Hóa Giải
      });

      // P0 dùng Quyết Đấu lên P1
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: duelCard.id, targets: [1] }
      });

      // Hệ thống hỏi Hóa Giải (từ P1 vì P1 là target)
      let askNegate = dispatcher.state.waitingForResponse;
      expect(askNegate).toBeDefined();
      expect(askNegate.type).toBe('ask_negate');
      expect(askNegate.responderId).toBe(1);

      // P1 dùng Hóa Giải
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'play', data: { cardId: negateCard.id } }
      });

      // Hệ thống hỏi Hóa Giải tiếp (từ P1 trước vì P1 vừa đánh)
      askNegate = dispatcher.state.waitingForResponse;
      expect(askNegate.type).toBe('ask_negate');
      expect(askNegate.responderId).toBe(1);

      // P1 bỏ qua
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'cancel' }
      });

      // Hệ thống hỏi Hóa Giải tiếp (từ P0)
      askNegate = dispatcher.state.waitingForResponse;
      expect(askNegate.type).toBe('ask_negate');
      expect(askNegate.responderId).toBe(0);

      // P0 bỏ qua
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'cancel' }
      });

      // Quyết Đấu bị hủy, P1 không bị hỏi Chém và không mất máu
      expect(dispatcher.state.waitingForResponse?.type).not.toBe('ask_slash');
      expect(dispatcher.state.players[1].hp).toBe(4);
    });
  });

  describe('4. Loạn Tiễn (Arrow Rain)', () => {
    it('Mọi người chơi khác phải đánh Né, không sẽ mất 1 HP', () => {
      const arrowCard = createCard('Loạn Tiễn', 'Cẩm nang', 'heart', 'A');
      const dodgeCard = createCard('Né', 'Cơ bản', 'diamond', '2');
      
      const dispatcher = createTestDispatcher({
        playerCount: 3,
        p0Hand: [arrowCard],
        p1Hand: [dodgeCard], // P1 có Né
        p2Hand: [] // P2 không có Né
      });

      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: arrowCard.id, targets: [] } // AOE
      });

      clearAskNegate(dispatcher);

      // Đang hỏi Né P1
      const askP1 = dispatcher.state.waitingForResponse;
      expect(askP1.type).toBe('ask_dodge');
      expect(askP1.responderId).toBe(1);

      // P1 dùng Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'play', data: { cardId: dodgeCard.id } }
      });

      clearAskNegate(dispatcher); // Clears Negate for P2!

      // Đang hỏi Né P2
      const askP2 = dispatcher.state.waitingForResponse;
      expect(askP2.type).toBe('ask_dodge');
      expect(askP2.responderId).toBe(2);

      // P2 bỏ qua
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 2, responseType: 'cancel' }
      });

      // Kết quả: P1 còn 4 máu, P2 mất 1 máu
      expect(dispatcher.state.players[1].hp).toBe(4);
      expect(dispatcher.state.players[2].hp).toBe(3);
    });
  });

  describe('5. Sấm Sét (Lightning)', () => {
    it('Sấm Sét nổ gây 3 sát thương', () => {
      const lightningCard = createCard('Sấm Sét', 'Cẩm nang', 'spade', 'A');
      lightningCard.subType = 'trick_delayed';
      
      const dispatcher = createTestDispatcher({
        p0Hand: [lightningCard],
        p1Hand: []
      });

      // Đặt Sấm Sét lên P0
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: lightningCard.id, targets: [0] }
      });

      // Chuyển sang lượt P0 (Bắt đầu lượt -> Phán xét)
      dispatcher.state.players[0].delayedTricks = [lightningCard]; // manually add to delayed tricks since PhaseHandler usually handles this
      
      // Giả lập Phán Xét rút ra Bích 2-9 (VD: ♠ 5)
      dispatcher.state.deck.push(createCard('Phán Xét', 'Cơ bản', 'spade', '5', 'black'));
      
      dispatcher.state.reactionStack.push({ type: 'EVENT_JUDGE', payload: { targetId: 0, reason: 'sam-set' } });
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, responseType: 'cancel' } }); 

      // Nổ! 4 HP - 3 HP = 1 HP
      expect(dispatcher.state.players[0].hp).toBe(1);
    });
  });

  describe('6. Cướp Bài (Snatch)', () => {
    it('Lấy một lá bài của mục tiêu', () => {
      const snatchCard = createCard('Cướp Bài', 'Cẩm nang', 'spade', '3');
      const targetCard = createCard('Chém', 'Cơ bản', 'spade', 'K');
      
      const dispatcher = createTestDispatcher({
        p0Hand: [snatchCard],
        p1Hand: [targetCard]
      });

      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: snatchCard.id, targets: [1] }
      });

      clearAskNegate(dispatcher);

      const askSnatch = dispatcher.state.waitingForResponse;
      expect(askSnatch.type).toBe('ask_snatch');
      expect(askSnatch.responderId).toBe(0); // P0 chọn bài để cướp

      // P0 chọn lấy lá Chém từ tay P1
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { cardId: targetCard.id, zone: 'hand' } }
      });

      expect(dispatcher.state.players[1].hand).toHaveLength(0);
      expect(dispatcher.state.players[0].hand.some(c => c.id === targetCard.id)).toBe(true);
    });
  });

  describe('7. Tước Bài (Dismantle)', () => {
    it('Phá hủy một lá bài của mục tiêu', () => {
      const dismantleCard = createCard('Tước Bài', 'Cẩm nang', 'spade', '3');
      const targetCard = createCard('Chém', 'Cơ bản', 'spade', 'K');
      
      const dispatcher = createTestDispatcher({
        p0Hand: [dismantleCard],
        p1Hand: [targetCard]
      });

      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: dismantleCard.id, targets: [1] }
      });

      clearAskNegate(dispatcher);

      const askDismantle = dispatcher.state.waitingForResponse;
      expect(askDismantle.type).toBe('ask_dismantle');

      // P0 chọn phá lá Chém
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { cardId: targetCard.id, zone: 'hand' } }
      });

      expect(dispatcher.state.players[1].hand).toHaveLength(0);
      expect(dispatcher.state.discardPile.some(c => c.id === targetCard.id)).toBe(true);
    });
  });

  describe('8. Hồi Xuân (Peach Garden)', () => {
    it('Hồi 1 HP cho tất cả người chơi bị mất máu', () => {
      const peachGarden = createCard('Hồi Xuân', 'Cẩm nang', 'heart', 'A');
      
      const dispatcher = createTestDispatcher({
        playerCount: 3,
        p0Hand: [peachGarden],
        p1Hand: []
      });

      dispatcher.state.players[0].hp = 3; // Mất 1 máu
      dispatcher.state.players[1].hp = 3; // Mất 1 máu
      dispatcher.state.players[2].hp = 4; // Full máu

      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: peachGarden.id, targets: [] }
      });

      clearAskNegate(dispatcher); // P0
      clearAskNegate(dispatcher); // P1
      clearAskNegate(dispatcher); // P2

      expect(dispatcher.state.players[0].hp).toBe(4);
      expect(dispatcher.state.players[1].hp).toBe(4);
      expect(dispatcher.state.players[2].hp).toBe(4); // Không thay đổi
    });
  });

  describe('9. Dã Man (Savage Assault)', () => {
    it('Yêu cầu mọi người đánh Chém, không thì mất máu', () => {
      const savageAssault = createCard('Dã Man', 'Cẩm nang', 'spade', 'A');
      const slashCard = createCard('Chém', 'Cơ bản', 'spade', 'K');
      
      const dispatcher = createTestDispatcher({
        playerCount: 3,
        p0Hand: [savageAssault],
        p1Hand: [slashCard],
        p2Hand: []
      });

      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: savageAssault.id, targets: [] }
      });

      clearAskNegate(dispatcher); // Cho P1

      const askSlash = dispatcher.state.waitingForResponse;
      expect(askSlash.type).toBe('ask_slash');
      expect(askSlash.responderId).toBe(1);

      // P1 đánh Chém
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'play', data: { cardId: slashCard.id } }
      });

      clearAskNegate(dispatcher); // Cho P2

      // P2 không có Chém
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 2, responseType: 'cancel' }
      });

      expect(dispatcher.state.players[1].hp).toBe(4);
      expect(dispatcher.state.players[2].hp).toBe(3);
    });
  });

  describe('10. Hỗn Loạn (Indulgence)', () => {
    it('Hỗn Loạn phán xét ra cơ/rô -> bỏ qua, ra bích/chuồn -> mất play phase', () => {
      const indulgence = createCard('Hỗn Loạn', 'Cẩm nang', 'spade', 'A');
      
      const dispatcher = createTestDispatcher({
        p0Hand: [indulgence],
        p1Hand: []
      });

      // P0 dùng Hỗn Loạn lên P1
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: indulgence.id, targets: [1] }
      });

      // P0 kết thúc lượt
      dispatcher.dispatchAction({
        type: 'ACTION_END_PHASE',
        payload: { playerId: 0, phase: 'action' }
      });

      // Lượt P1 bắt đầu, đến Phase Judge
      // Hệ thống hỏi Hóa Giải trước khi phán xét
      expect(dispatcher.state.waitingForResponse?.type).toBe('ask_negate');
      
      // Giả lập Phán Xét rút ra Cơ (Hủy Hỗn Loạn)
      dispatcher.state.deck.push(createCard('Phán Xét', 'Cơ bản', 'heart', '5', 'red'));
      
      // P1 bỏ qua Hóa Giải, P0 bỏ qua Hóa Giải
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, responseType: 'cancel' } });
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, responseType: 'cancel' } });
      
      // Phán xét ra Cơ -> Không bị mất Play Phase
      // P1 rút bài (Draw Phase)
      expect(dispatcher.state.waitingForResponse?.type).toBe('draw_phase');
      dispatcher.dispatchAction({ type: 'ACTION_DRAW_CARDS', payload: { playerId: 1 } });
      
      expect(dispatcher.state.waitingForResponse?.type).toBe('play_phase');
    });
  });

  describe('11. Vô Trung Sinh Hữu (Ex Nihilo)', () => {
    it('Rút 2 lá bài', () => {
      const dispatcher = createTestDispatcher({ playerCount: 2 });
      
      dispatcher.state.players[0].hand = [
        { id: 'vo-trung-1', name: 'Vô Trung Sinh Hữu', type: 'Cẩm nang' }
      ];
      dispatcher.state.deck = [
        { id: 'card-1', name: 'Chém', type: 'Cơ bản' },
        { id: 'card-2', name: 'Né', type: 'Cơ bản' }
      ];

      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: 'vo-trung-1', targets: [] }
      });
      
      dispatcher.tick();

      // P0 asks to negate, passes
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'skill_response', data: { doUse: false } }
      });
      dispatcher.tick();
      // P1 asks to negate, passes
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'skill_response', data: { doUse: false } }
      });
      dispatcher.tick();

      // Player 0 should have drawn 2 cards
      expect(dispatcher.state.players[0].hand.length).toBe(2);
      expect(dispatcher.state.players[0].hand[0].id).toBe('card-2'); // Deck is popped from the end
    });
  });

  describe('12. Hỏa Công (Fire Attack)', () => {
    it('Trưng bài tay, nếu đối phương bỏ cùng chất thì gây sát thương hỏa', () => {
      const dispatcher = createTestDispatcher({ 
        playerCount: 2,
        p0Hand: [
          { id: 'hoa-cong-1', name: 'Hỏa Công', type: 'Cẩm nang' },
          { id: 'red-card', name: 'Đào', type: 'Cơ bản', suit: 'heart' }
        ],
        p1Hand: [
          { id: 'target-card', name: 'Chém', type: 'Cơ bản', suit: 'heart' }
        ]
      });
      console.log('[DEBUG_TEST_SETUP] p1Hand:', dispatcher.getState().players[1].hand);

      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: 'hoa-cong-1', targets: [1] }
      });
      
      dispatcher.tick();

      clearAskNegate(dispatcher);

      // Target (P1) is asked to show a card
      const reqShow = dispatcher.state.waitingForResponse;
      expect(reqShow).toBeDefined();
      expect(reqShow.type).toBe('ask_hoacong_reveal');

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'skill_response', data: { cardId: 'target-card' } }
      });
      dispatcher.tick();

      // Source (P0) is asked to discard a card of the same suit
      const reqDiscard = dispatcher.state.waitingForResponse;
      expect(reqDiscard).toBeDefined();
      expect(reqDiscard.type).toBe('ask_hoacong_discard');
      
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'skill_response', data: { cardId: 'red-card' } }
      });
      dispatcher.tick();

      // P1 takes 1 fire damage
      expect(dispatcher.state.players[1].hp).toBe(3);
    });
  });

  describe('13. Xiềng Xích (Iron Chain)', () => {
    it('Liên kết hoặc giải trừ 2 mục tiêu', () => {
      const dispatcher = createTestDispatcher({ playerCount: 3 });
      
      dispatcher.state.players[0].hand = [
        { id: 'xieng-xich-1', name: 'Xiềng Xích', type: 'Cẩm nang' }
      ];

      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: 'xieng-xich-1', targets: [1, 2] }
      });
      
      dispatcher.tick();

      // Negate phases for Target 1
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, responseType: 'skill_response', data: { doUse: false } } }); dispatcher.tick();
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, responseType: 'skill_response', data: { doUse: false } } }); dispatcher.tick();
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, responseType: 'skill_response', data: { doUse: false } } }); dispatcher.tick();
      
      // Negate phases for Target 2
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, responseType: 'skill_response', data: { doUse: false } } }); dispatcher.tick();
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, responseType: 'skill_response', data: { doUse: false } } }); dispatcher.tick();
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, responseType: 'skill_response', data: { doUse: false } } }); dispatcher.tick();

      expect(dispatcher.state.players[1].isChained).toBe(true);
      expect(dispatcher.state.players[2].isChained).toBe(true);
    });
  });
});
