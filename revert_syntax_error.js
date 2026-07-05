const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const regex = /p1Hand: \[createCard\('Chém'\)\]\n\s*\n\s*describe\('Lê Ngân \(Sơn\)', \(\) => \{[\s\S]*?\}\);\n\n\}\);/g;

testCode = testCode.replace(regex, "p1Hand: [createCard('Chém')]\n      });");

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
