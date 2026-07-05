const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`    // Use Pha Thanh on P1
    dispatcher.dispatchAction({
      type: 'ACTION_SKILL_RESPONSE',
      payload: { playerId: 0, doProvide: true, targetId: 1 }
    });`,
`    // Use Pha Thanh on P1
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'play', data: { targetId: 1 } }
    });`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
