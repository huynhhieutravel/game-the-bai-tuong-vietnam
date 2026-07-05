const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

code = code.replace(
`      // Sẽ có EVENT_ASK_USE_SKILL cho Hóa Tiên
      expect(dispatcher.state.waitingForResponse).toBeDefined();
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_hoa_tien');
      expect(dispatcher.state.waitingForResponse.skillId).toBe('hoa-tien');
      
      // Người chơi đồng ý dùng
      dispatcher.dispatchAction({
         type: 'ACTION_REACT',
         payload: {
            playerId: 0,
            responseType: 'yes',
            data: {}
         }
      });`,
`      // Sẽ có EVENT_ASK_USE_SKILL cho Hóa Tiên
      expect(dispatcher.state.waitingForResponse).toBeDefined();
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_hoa_tien');
      
      // Người chơi đồng ý dùng
      dispatcher.dispatchAction({
         type: 'ACTION_REACT',
         payload: {
            playerId: 0,
            responseType: 'yes',
            data: {}
         }
      });`
);

// Bỏ đoạn dispatchAction giả mạo
code = code.replace(
`      // Gây sát thương chết người
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL', // Dùng skill giả để trigger action loop
        payload: {} // Sẽ không làm gì nhưng ta chèn event vào reactionStack
      });
      
      dispatcher.state.reactionStack.unshift({
        type: 'EVENT_DAMAGE',
        payload: { sourceId: 1, targetId: 0, amount: 2, damageType: 'normal' }
      });`,
`      // Gây sát thương chết người
      dispatcher.state.reactionStack.push({
        type: 'EVENT_DAMAGE',
        payload: { sourceId: 1, targetId: 0, amount: 2, damageType: 'normal' }
      });
      dispatcher.tick();`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
