const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

const newTest = `
  describe('Tiên Dung (Duyên Tiên, Tiên Duyên)', () => {
    it('Duyên Tiên: Rút 1 lá khi dùng Cẩm Nang', () => {
      const cuopBai = createCard('Cướp Bài', 'Cẩm nang', '♠', '3', 'black');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'tien-dung',
          p0Hand: [cuopBai],
          deck: [createCard('Chém', 'Cơ bản', '♠', '3', 'black')]
      });
      const state = dispatcher.state;
      
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: {
           playerId: 0,
           cardId: cuopBai.id,
           targets: [1]
        }
      });
      
      // Lúc này dùng Cướp bài sẽ trigger Duyên Tiên -> Rút 1 lá
      // Vì vậy trên tay vẫn còn 1 lá bài mới rút
      expect(dispatcher.state.players[0].hand.length).toBe(1);
    });
    
    // Tiên Duyên passive (không giới hạn khoảng cách Cẩm Nang) thường được check trong DistanceCalculator hoặc checkValidTargets.
    // Tạm thời ta không có unit test ở Dispatcher cho khoảng cách vì nó thuộc về UI/Targeting validation, 
    // nhưng ta có thể check hàm canUseCard trên UI (giả lập).
  });
});
`;

code = code.replace(/}\);\s*}\);[\s]*$/, newTest);
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
