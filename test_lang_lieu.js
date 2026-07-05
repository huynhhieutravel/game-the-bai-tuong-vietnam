const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

const newTest = `
  describe('Lang Liêu (Bánh Chưng, Đạm Bạc)', () => {
    it('Bánh Chưng: Lấy bài khi bắt đầu lượt', () => {
      const c1 = createCard('C1');
      const c2 = createCard('C2');
      const c3 = createCard('C3');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'lang-lieu',
          playerCount: 3,
          deck: [c1, c2, c3] // Rút 3 lá vì có 3 người chơi sống
      });
      
      dispatcher.dispatchAction({
        type: 'EVENT_PHASE_START',
        payload: { targetId: 0, phase: 'turn_begin' }
      });
      
      const askEvent = dispatcher.state.waitingForResponse;
      expect(askEvent).toBeDefined();
      expect(askEvent.type).toBe('ask_banh_chung');
      expect(askEvent.viewCount).toBe(3);
      
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL_RESPONSE',
        payload: {
           orderedCards: true,
           deckTop: [c1, c2],
           deckBottom: [c3]
        }
      });
      
      expect(dispatcher.state.waitingForResponse).toBeNull();
      // c3 ở dưới cùng, c1, c2 ở trên
      expect(dispatcher.state.deck[0].id).toBe(c3.id);
      expect(dispatcher.state.deck[1].id).toBe(c1.id);
      expect(dispatcher.state.deck[2].id).toBe(c2.id);
    });

    it('Đạm Bạc: Không thể bị Chém / Quyết Đấu nếu hết bài', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'lang-lieu', // Player 0
          playerCount: 2,
          p0Hand: [] // Hết bài trên tay
      });
      
      const p1 = dispatcher.state.players[1];
      const p0 = dispatcher.state.players[0];
      
      // import { canTarget } from '../rangeSystem.js';
      // Mặc dù ta không có canTarget trong scope test, ta có thể test qua Validation.
      // Vì validation chưa chắc đã tích hợp, ta tạm kiểm tra rangeSystem logic.
      // Ta không cần test logic của rangeSystem trong bài test này nếu khó truy cập.
      // Thay vào đó test qua ACTION_PLAY_CARD
      const chem = createCard('Chém');
      p1.hand.push(chem);
      
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 1, cardId: chem.id, targets: [0] }
      });
      
      // Không có EVENT_ASK_DODGE vì target invalid
      const askDodge = dispatcher.state.reactionStack.find(e => e.type === 'EVENT_DO_ASK_DODGE');
      expect(askDodge).toBeUndefined();
    });
  });
});
`;

code = code.replace(/}\);\s*}\);\s*$/, newTest);
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
