const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`    // P1 plays first dodge
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, cardId: p1.hand[0].id }
    });`,
`    // P1 plays first dodge
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, data: { cardId: p1.hand[0].id } }
    });`
);

testCode = testCode.replace(
`    // We expect them to take damage if they don't dodge the second time
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, doCancel: true }
    });`,
`    // We expect them to take damage if they don't dodge the second time
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, responseType: 'skip' }
    });`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
