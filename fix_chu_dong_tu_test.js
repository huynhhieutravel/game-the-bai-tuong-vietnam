const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

const oldTest = `  describe('Chử Đồng Tử (Tiên Duyên, Hỏa Tiễn)', () => {
    it('Hỏa Tiễn: Bỏ 1 lá bài Đỏ gây sát thương Hỏa', () => {
      const state = createTestState({ mainHeroId: 'chu-dong-tu' });
      state.players[0].hand = [createCard('Đào', 'Cơ bản', '♥', '3', 'red')];
      
      const dispatcher = createTestDispatcher({ deck: [] });
      dispatcher.state = state;
      
      // P0 dùng Hỏa Tiễn lên P1
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { 
           playerId: 0, 
           skillId: 'hoa-tien', 
           targets: [1],
           options: { cardIds: [state.players[0].hand[0].id] } 
        }
      });
      
      // Kiểm tra P1 bị 1 sát thương Hỏa
      // Vì Hỏa Tiễn không thể bị Né, nó tạo EVENT_DAMAGE trực tiếp!
      expect(dispatcher.state.players[1].hp).toBe(3); // 4 - 1
    });`;

const newTest = `  describe('Chử Đồng Tử (Tiên Duyên, Hóa Tiên)', () => {
    it('Hóa Tiên: Hồi sinh khi Hấp hối', () => {
      const state = createTestState({ mainHeroId: 'chu-dong-tu', playerCount: 2 });
      state.players[0].hp = 1;
      
      const dispatcher = createTestDispatcher({ deck: [
          createCard('Chém', 'Cơ bản', '♠', '2', 'black'),
          createCard('Chém', 'Cơ bản', '♠', '3', 'black'),
          createCard('Chém', 'Cơ bản', '♠', '4', 'black')
      ] });
      dispatcher.state = state;
      
      // Gây sát thương chết người
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL', // Dùng skill giả để trigger action loop
        payload: {} // Sẽ không làm gì nhưng ta chèn event vào reactionStack
      });
      
      dispatcher.state.reactionStack.unshift({
        type: 'EVENT_DAMAGE',
        payload: { sourceId: 1, targetId: 0, amount: 2, damageType: 'normal' }
      });
      
      dispatcher.processQueue();
      
      // Sẽ có EVENT_ASK_USE_SKILL cho Hóa Tiên
      expect(dispatcher.state.waitingForResponse).toBeDefined();
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_use_skill');
      expect(dispatcher.state.waitingForResponse.skillId).toBe('hoa-tien');
      
      // Người chơi đồng ý dùng
      dispatcher.dispatchAction({
         type: 'ACTION_REACT',
         payload: {
            playerId: 0,
            responseType: 'yes',
            data: {}
         }
      });
      
      // HP phục hồi về 3, bốc 3 lá
      expect(dispatcher.state.players[0].hp).toBe(3);
      expect(dispatcher.state.players[0].hand.length).toBe(3);
    });`;

code = code.replace(oldTest, newTest);
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
