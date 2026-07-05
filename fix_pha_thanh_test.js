const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`    const { dispatcher } = createTestDispatcher([
      { id: 0, mainHeroId: 'do-doc-bao', hand: [], hp: 4, maxHp: 4 },
      { id: 1, mainHeroId: 'le-loi', hand: [], hp: 4, maxHp: 4 }
    ]);`,
`    const dispatcher = createTestDispatcher({
      mainHeroId: 'do-doc-bao',
      playerCount: 2,
      p0Hand: [],
      p1Hand: []
    });`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
