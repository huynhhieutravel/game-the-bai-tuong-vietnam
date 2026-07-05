const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`    const dispatcher = createTestDispatcher({
      mainHeroId: 'do-doc-bao',
      playerCount: 2,
      p0Hand: [],
      p1Hand: []
    });
    
    // Jump to DRAW phase manually for testing`,
`    const dispatcher = createTestDispatcher({
      mainHeroId: 'do-doc-bao',
      playerCount: 2,
      p0Hand: [],
      p1Hand: []
    });
    
    dispatcher.state.players[0].revealedHeroes = [true, false];
    
    // Jump to DRAW phase manually for testing`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
