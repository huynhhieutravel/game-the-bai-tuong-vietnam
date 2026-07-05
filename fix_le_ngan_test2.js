const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          payload: { playerId: 0, skillId: 'trung-dung', options: { cardIdx: 0, virtualCardName: 'Đào', targetId: 0 } }
      });
      
      // Lúc này sẽ push ask_nghi_ngo cho player 1
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_nghi_ngo');`,
`      dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          payload: { playerId: 0, skillId: 'trung-dung', options: {} }
      });
      
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_trung_dung');
      
      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 0, responseType: 'play', data: { cardIndex: 0, virtualCardName: 'Đào', targetId: 0 } }
      });
      
      // Lúc này sẽ push ask_nghi_ngo cho player 1
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_nghi_ngo');`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
