const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const newTest = `
    it('Diệu Dược: Bỏ 1 lá bơm 1 máu', () => {
      const pDao = createCard('Đào', 'Cơ bản', '♥', '3', 'red');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'tue-tinh', // Player 0
          playerCount: 2,
          p0Hand: [pDao],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[1].hp = 3; // P1 bị mất 1 máu
      
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { 
            playerId: 0, 
            skillId: 'dieu-duoc', 
            targets: [1],
            options: { cardIdx: 0 }
        }
      });
      
      // Kiểm tra xem máu p1 có tăng lên 4 không
      expect(dispatcher.state.players[1].hp).toBe(4);
      // Kiểm tra cờ dieuDuocUsedThisTurn
      expect(dispatcher.state.players[0].dieuDuocUsedThisTurn).toBe(true);
      // Kiểm tra mất bài
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile[0].id).toBe(pDao.id);
    });
  });
});
`;

code = code.replace(/  \}\);\n\n\}\);\s*$/, newTest);
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
