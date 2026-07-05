const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`      expect(dispatcher.state.waitingForResponse.trickType).toBe('duel');`,
`      expect(dispatcher.state.waitingForResponse.trickType).toBe('quyet-dau');`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
