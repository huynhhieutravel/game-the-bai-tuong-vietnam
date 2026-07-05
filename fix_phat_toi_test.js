const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 1, responseType: 'play', data: { targetId: 0 } }
      });
      
      expect(dispatcher.state.players[0].hp).toBe(2);`,
`      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 1, responseType: 'play', data: { targetId: 0 } }
      });
      
      // Lúc này Đinh Điền có skill Quân Cơ nên hệ thống hỏi Đinh Điền có muốn đổi bài phán xét không
      if (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_quan_co') {
          dispatcher.dispatchAction({
              type: 'ACTION_REACT',
              payload: { playerId: 1, responseType: 'skip' }
          });
      }
      
      expect(dispatcher.state.players[0].hp).toBe(2);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
