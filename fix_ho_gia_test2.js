const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`      p1.hand = [createCard('test-né-1', 'Né', 'diamonds', 2)];`,
`      p1.hand = [createCard('Né', 'Cơ bản', 'diamonds', '2', 'red')];`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
