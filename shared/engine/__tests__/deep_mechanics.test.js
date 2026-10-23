import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDispatcher, createCard, resetCardCounter } from './testHelper.js';

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

describe('Deep Mechanics QA', () => {

  describe('1. Mượn Đao Giết Người (Borrow Sword)', () => {
    it('Ép Target A chém Target B, nếu A chém thì B mất máu', () => {
      const borrowCard = createCard('Mượn Đao', 'Cẩm nang', 'club', 'Q');
      const weapon = createCard('Thanh Long Đao', 'Trang bị', 'spade', '5');
      weapon.subType = 'Vũ khí';
      const slashCard = createCard('Chém', 'Cơ bản', 'heart', '2');

      const dispatcher = createTestDispatcher({
        playerCount: 3,
        p0Hand: [borrowCard],
        p1Hand: [slashCard],
        p1Equipment: [weapon],
        p2Hand: []
      });
      dispatcher.state.players[1].equipment[0] = weapon; // Lắp vũ khí cho P1

      // P0 dùng Mượn Đao lên P1, ép P1 chém P2
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: borrowCard.id, targets: [1, 2] }
      });

      clearAskNegate(dispatcher);

      const askSlash = dispatcher.state.waitingForResponse;
      expect(askSlash).toBeDefined();
      expect(askSlash.type).toBe('ask_slash');
      expect(askSlash.responderId).toBe(1);

      // P1 đồng ý chém P2
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'play', data: { cardId: slashCard.id } }
      });

      // Lúc này vũ khí KHÔNG bị mất (vì đã chém)
      expect(dispatcher.state.players[1].equipment[0]).toBeDefined();

      // P2 sẽ bị hỏi Né
      const askDodge = dispatcher.state.waitingForResponse;
      expect(askDodge).toBeDefined();
      expect(askDodge.type).toBe('ask_dodge');
      expect(askDodge.responderId).toBe(2);

      // P2 không có Né, chịu đòn
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 2, responseType: 'cancel' }
      });

      // P2 mất máu
      expect(dispatcher.state.players[2].hp).toBe(3);
    });
  });

  describe('2. Khóa Xích (Chained)', () => {
    it('Sát thương thuộc tính (Hỏa) truyền qua tất cả mục tiêu bị khóa xích', () => {
      const dispatcher = createTestDispatcher({
        playerCount: 3,
        p0Hand: [],
        p1Hand: [],
        p2Hand: []
      });

      // P1 và P2 đang bị khóa xích
      dispatcher.state.players[1].isChained = true;
      dispatcher.state.players[2].isChained = true;

      // Đẩy EVENT_DAMAGE với damageType: 'fire' vào P1
      dispatcher.state.reactionStack.push({
         type: 'EVENT_DAMAGE',
         payload: { sourceId: 0, targetId: 1, amount: 1, damageType: 'fire' }
      });
      dispatcher.tick();

      // Cả P1 và P2 đều mất máu và đứt xích
      expect(dispatcher.state.players[1].hp).toBe(3);
      expect(dispatcher.state.players[2].hp).toBe(3);
      expect(dispatcher.state.players[1].isChained).toBe(false);
      expect(dispatcher.state.players[2].isChained).toBe(false);
    });
  });

  describe('3. Phán Xét Sấm Sét', () => {
    it('Sấm Sét nổ gây 3 sát thương lôi, truyền qua Khóa Xích', () => {
      const lightning = createCard('Sấm Sét', 'Cẩm nang', 'spade', 'A');
      lightning.virtualName = 'sam-set';
      // Tạo phán xét Bích 2-9 (Nổ sấm sét)
      const judgeCard = createCard('Chém', 'Cơ bản', 'spade', '5');

      const dispatcher = createTestDispatcher({
        playerCount: 2,
        p0Hand: [],
        p1Hand: [],
        deck: [judgeCard] // Lá bài tiếp theo bốc lên để phán xét
      });

      // Cài Sấm Sét vào P0
      dispatcher.state.players[0].judgementArea.push(lightning);
      
      // Xích cả 2
      dispatcher.state.players[0].isChained = true;
      dispatcher.state.players[1].isChained = true;

      // Bắt đầu lượt P0
      dispatcher.state.reactionStack.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
      dispatcher.tick();

      // Bỏ qua hỏi Hóa Giải cho Sấm Sét
      clearAskNegate(dispatcher);

      // P0 mất 3 máu, P1 cũng mất 3 máu vì bị xích
      expect(dispatcher.state.players[0].hp).toBe(1); // 4 - 3 = 1
      expect(dispatcher.state.players[1].hp).toBe(1); // 4 - 3 = 1
    });
  });

});
