const fs = require('fs');

// Fix Phạt Tội
let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');
testCode = testCode.replace(
`      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 0, responseType: 'play', data: { targetId: 1 } }
      });
      
      expect(dispatcher.state.players[1].hp).toBe(2);`,
`      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 1, responseType: 'play', data: { targetId: 0 } }
      });
      
      expect(dispatcher.state.players[0].hp).toBe(2);`
);

// For Quân Cơ, let's log player.hand
testCode = testCode.replace(
`      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 0, responseType: 'play', data: { cardId: blackCard.id } }
      });`,
`      console.log('Test dispatching ACTION_REACT. blackCard.id=', blackCard.id, 'Hand=', dispatcher.state.players[0].hand.map(c=>c.id));
      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 0, responseType: 'play', data: { cardId: blackCard.id } }
      });`
);
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
