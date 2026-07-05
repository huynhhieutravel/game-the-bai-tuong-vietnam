const fs = require('fs');
let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      if (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_quan_co') {`,
`      console.log("waitingForResponse after EVENT_JUDGE is:", dispatcher.state.waitingForResponse);
      if (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_quan_co') {`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
