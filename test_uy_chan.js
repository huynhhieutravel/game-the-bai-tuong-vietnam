const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const newTest = `
  describe('Đinh Bộ Lĩnh (Uy Chấn)', () => {
    it('Uy Chấn: Khóa mục tiêu nếu cự ly vũ khí < 3', () => {
      const pChem1 = createCard('Chém');
      const pChem2 = createCard('Chém');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'dinh-bo-linh', // Player 0
          playerCount: 2,
          p0Hand: [],
          p1Hand: [pChem1, pChem2]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      
      // P1 đánh Chém P0
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { 
            playerId: 1, 
            cardId: pChem1.id, 
            targets: [0] 
        }
      });
      
      // P0 chịu sát thương
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'cancel' }
      });
      
      // Kiểm tra cờ askedUyChan
      expect(dispatcher.state.players[0].askedUyChan).toBe(true);
      
      // P1 định đánh Chém P0 lần nữa, nhưng khoảng cách P1 = 1 < 3
      // => P0 không phải là mục tiêu hợp lệ
      const validTargets = dispatcher.getCardTargets(1, pChem2.id);
      expect(validTargets).not.toContain(0);
      
      // Nếu P1 trang bị vũ khí cự ly 3 (Thương) thì đánh được
      dispatcher.state.players[1].equipment.push(createCard('Thương', 'Trang bị', '♠', 'Q', 'black', 'equip_weapon'));
      const validTargetsWithWeapon = dispatcher.getCardTargets(1, pChem2.id);
      expect(validTargetsWithWeapon).toContain(0);
    });
  });

});
`;

code = code.replace(/  \}\);\n\n\}\);\s*$/, newTest);
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
