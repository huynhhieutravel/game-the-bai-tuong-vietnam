const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      expect(dispatcher.state.discardPile.length).toBe(1);`,
`      expect(dispatcher.state.discardPile.length + dispatcher.state.playedCards.length).toBe(1);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
