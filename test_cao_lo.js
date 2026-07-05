const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

const newTest = `
  describe('Cao Lỗ (Nỏ Thần)', () => {
    it('Nỏ Thần: Khóa né khi bài >= mục tiêu, và Sát thương +1 khi HP <= mục tiêu', () => {
      const chem = createCard('Chém', 'Cơ bản', '♠', '3', 'black');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'cao-lo',
          p0Hand: [chem, createCard('Né')],
          p1Hand: [createCard('Né')], // P0 có 2 lá, P1 có 1 lá => Khóa Né
          p0Hp: 3, p1Hp: 4 // P0 HP 3 <= P1 HP 4 => Damage +1
      });
      
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 0, cardId: chem.id, targets: [1] }
      });
      
      // Không có EVENT_DO_ASK_DODGE trong stack (đã bị xóa)
      // EVENT_DAMAGE amount = 2
      const damageEvent = dispatcher.state.reactionStack.find(e => e.type === 'EVENT_DAMAGE');
      expect(damageEvent).toBeDefined();
      expect(damageEvent.payload.amount).toBe(2);
      
      const askDodge = dispatcher.state.reactionStack.find(e => e.type === 'EVENT_DO_ASK_DODGE');
      expect(askDodge).toBeUndefined();
    });
  });
});
`;

code = code.replace(/}\);\s*}\);\s*$/, newTest);
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
