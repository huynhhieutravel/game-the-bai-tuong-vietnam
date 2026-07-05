const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

const newTest = `
    it('Thần Hỏa: Đánh bài Đỏ làm Hỏa Công', () => {
      const pDao = createCard('Đào', 'Cơ bản', '♥', '3', 'red');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'rua-vang',
          playerCount: 2,
          p0Hand: [pDao],
          p1Hand: [createCard('Né')]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { 
            playerId: 0, 
            cardId: pDao.id, 
            virtualCardName: 'Hỏa Công',
            targets: [1] 
        }
      });
      
      const askShowCard = dispatcher.state.waitingForResponse;
      expect(askShowCard).toBeDefined();
      expect(askShowCard.type).toBe('ask_show_card');
    });
  });
`;

code = code.replace(/  \}\);\n\}\);\s*$/, newTest + "});\n");
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
