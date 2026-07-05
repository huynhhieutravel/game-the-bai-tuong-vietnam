const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const leNganTest = `
  describe('Lê Ngân (Sơn)', () => {
    it('Trung Dũng: Đánh 1 lá bài và tuyên bố là 1 lá bài khác (Không ai nghi ngờ)', () => {
      const { createTestState, createTestDispatcher, createCard } = require('./testHelper');
      const blackCard = createCard('Chém', 'Cơ bản', '♠', '2', 'black');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'le-ngan',
          playerCount: 2,
          p0Hand: [blackCard],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      
      dispatcher.state.currentPlayerIndex = 0;
      dispatcher.state.currentPhase = 'action';
      
      dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          payload: { playerId: 0, skillId: 'trung-dung', options: { cardIdx: 0, virtualCardName: 'Đào', targetId: 0 } }
      });
      
      // Lúc này sẽ push ask_nghi_ngo cho player 1
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_nghi_ngo');
      
      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 1, responseType: 'skip' }
      });
      
      // Không ai nghi ngờ, Đào được dùng
      // Vì p0 đang max HP (4) nên HP không tăng, nhưng lá bài được chuyển vào playedCards / discardPile
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile.length).toBe(1);
    });
  });
`;

testCode = testCode.replace("});", leNganTest + "\n});");

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
