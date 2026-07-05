const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const newTest = `
  describe('Nguyễn Bặc (Bình Loạn, Khai Quốc)', () => {
    it('Bình Loạn: Bỏ 2 lá cùng chất làm Loạn Tiễn', () => {
      const pHeart1 = createCard('Đào', 'Cơ bản', 'heart', '2', 'red', 'dao');
      const pHeart2 = createCard('Đào', 'Cơ bản', 'heart', '3', 'red', 'dao');
      const pSpade1 = createCard('Chém', 'Cơ bản', 'spade', '2', 'black', 'chem');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'nguyen-bac', // Player 0
          playerCount: 2,
          p0Hand: [pHeart1, pHeart2, pSpade1],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      
      // Kích hoạt Bình Loạn
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { playerId: 0, skillId: 'binh-loan', targets: [] }
      });
      
      // UI đợi yêu cầu
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_binh_loan');
      
      // Gửi 2 lá Heart
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { cardIndexes: [0, 1] } }
      });
      
      // Action queue sẽ có Loạn Tiễn
      const evt = dispatcher.state.actionQueue[0];
      expect(evt.type).toBe('EVENT_ACTION_PLAY_CARD');
      expect(evt.payload.virtualCardName).toBe('Loạn Tiễn');
      expect(evt.payload.activeSkill).toBe('binh-loan');
      
      // 2 lá bài biến mất khỏi tay và vào mộ
      expect(dispatcher.state.players[0].hand.length).toBe(1);
      expect(dispatcher.state.players[0].hand[0].id).toBe(pSpade1.id);
      expect(dispatcher.state.discardPile.length).toBe(2);
    });

    it('Khai Quốc: Tăng giới hạn bài trên tay', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'nguyen-bac', // Player 0 (Sơn)
          playerCount: 3,
          p0Hand: [],
          p1Hand: []
      });
      // P1 là Sơn, P2 là Thủy (mặc định Thủy Tinh)
      dispatcher.state.players[1].mainHeroId = 'dinh-bo-linh';
      
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[1].revealedHeroes = [true, false];
      dispatcher.state.players[2].revealedHeroes = [true, false];
      
      // Gọi getHandLimit() - hiện tại HP = 4. Có 2 tướng Sơn (P0, P1).
      // Giới hạn = 4 + (2 * 2) = 8
      const turnRules = require('../rules/TurnRules');
      const limit = turnRules.getHandLimit(dispatcher.state, 0);
      
      expect(limit).toBe(8);
    });
  });

});`;

code = code.replace(/  \}\);\n\n\}\);?\s*$/, newTest);
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
