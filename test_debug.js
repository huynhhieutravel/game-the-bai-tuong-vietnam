const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

code = code.replace(
`      expect(dispatcher.state.waitingForResponse).toBeNull();`,
`      console.log("TEST: waitingForResponse is:", dispatcher.state.waitingForResponse);
      expect(dispatcher.state.waitingForResponse).toBeNull();`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
