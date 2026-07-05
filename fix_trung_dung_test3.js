const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile.length + dispatcher.state.playedCards.length).toBe(1);`,
`      console.log("Final hand:", dispatcher.state.players[0].hand.map(c => c.id));
      console.log("Final discardPile:", dispatcher.state.discardPile.map(c => c.id));
      console.log("Final playedCards:", dispatcher.state.playedCards.map(c => c.id));
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile.length + dispatcher.state.playedCards.length).toBe(1);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
