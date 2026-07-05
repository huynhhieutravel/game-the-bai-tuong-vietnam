const fs = require('fs');
let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      console.log("waitingForResponse after EVENT_JUDGE is:", dispatcher.state.waitingForResponse);
      if (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_quan_co') {
          dispatcher.dispatchAction({
              type: 'ACTION_REACT',
              payload: { playerId: 0, responseType: 'skip' }
          });
      }`,
`      while (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_quan_co') {
          dispatcher.dispatchAction({
              type: 'ACTION_REACT',
              payload: { playerId: dispatcher.state.waitingForResponse.responderId, responseType: 'skip' }
          });
      }`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
