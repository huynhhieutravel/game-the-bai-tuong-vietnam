const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      dispatcher.dispatchAction({
        type: 'ACTION_SKILL_RESPONSE',
        payload: { playerId: 1, doReact: true }
      });`,
`      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'play', data: { doReact: true } }
      });`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
