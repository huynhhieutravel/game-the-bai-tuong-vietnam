const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      console.log("Final hand:", dispatcher.state.players[0].hand.map(c => c.id));
      console.log("Final discardPile:", dispatcher.state.discardPile.map(c => c.id));
      console.log("Final playedCards:", dispatcher.state.playedCards.map(c => c.id));
      expect(dispatcher.state.players[0].hand.length).toBe(0);`,
`      expect(dispatcher.state.players[0].hand.length).toBe(0);`
);

testCode = testCode.replace(
`console.log("Trung Dung Final hand:", dispatcher.state.players[0].hand.map(c => c.id));
      console.log("Trung Dung Final discardPile:", dispatcher.state.discardPile.map(c => c.id));
      console.log("Trung Dung Final playedCards:", dispatcher.state.playedCards.map(c => c.id));
      console.log("Reaction stack left:", dispatcher.state.reactionStack.length);
      console.log("Action queue left:", dispatcher.state.actionQueue.length);
      
      expect(dispatcher.state.players[0].hp).toBe(3);`,
`expect(dispatcher.state.players[0].hp).toBe(3);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
