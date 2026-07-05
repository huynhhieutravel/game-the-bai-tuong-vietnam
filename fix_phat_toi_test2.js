const fs = require('fs');
let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      if (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_quan_co') {
          dispatcher.dispatchAction({
              type: 'ACTION_REACT',
              payload: { playerId: 1, responseType: 'skip' }
          });
      }`,
`      if (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_quan_co') {
          dispatcher.dispatchAction({
              type: 'ACTION_REACT',
              payload: { playerId: 0, responseType: 'skip' }
          });
      }`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
