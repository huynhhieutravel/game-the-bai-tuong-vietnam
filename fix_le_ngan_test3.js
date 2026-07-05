const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'le-ngan',
          playerCount: 2,
          p0Hand: [blackCard],
          p1Hand: []
      });`,
`      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'le-ngan',
          playerCount: 2,
          p0Hand: [blackCard],
          p1Hand: [],
          p0Hp: 2
      });`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
