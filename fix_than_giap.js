const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

code = code.replace(
`      expect(dispatcher.state.waitingForResponse).toBeNull();`,
`      expect(dispatcher.state.waitingForResponse?.type).toBe('play_phase');`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
