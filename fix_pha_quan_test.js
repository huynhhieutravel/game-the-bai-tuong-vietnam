const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
  /const \{ dispatcher, p0, p1 \} = setupGame\('nguyen-xi', 'p0-sub', 'p1-main', 'p1-sub'\);/g,
  `const { createTestDispatcher, createCard } = require('./testHelper');
    const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-xi' });
    const p0 = dispatcher.state.players[0];
    const p1 = dispatcher.state.players[1];`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
