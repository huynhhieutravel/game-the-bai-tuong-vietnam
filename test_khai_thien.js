const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

const newTest = `
  describe('Thần Trụ Trời (Khai Thiên)', () => {
    it('Khai Thiên: Đánh bài Đỏ làm Chém', () => {
      const pDao = createCard('Đào', 'Cơ bản', '♥', '3', 'red');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'than-tru-troi',
          playerCount: 2,
          p0Hand: [pDao],
          p1Hand: [createCard('Né')]
      });
      
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { 
            playerId: 0, 
            cardId: pDao.id, 
            virtualCardName: 'Chém',
            targets: [1] 
        }
      });
      
      const askDodge = dispatcher.state.waitingForResponse;
      expect(askDodge).toBeDefined();
      expect(askDodge.type).toBe('ask_dodge');
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile[0].id).toBe(pDao.id);
    });
  });
});
`;

code = code.replace(/}\);\s*}\);\s*$/, newTest);
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
