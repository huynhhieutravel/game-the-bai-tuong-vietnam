const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
  `const { createTestDispatcher, createCard } = require('./testHelper');
    const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-xi' });`,
  `const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-xi' });`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
