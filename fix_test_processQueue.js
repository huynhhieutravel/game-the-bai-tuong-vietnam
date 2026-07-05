const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(/      dispatcher\.processQueue\(\);\n/g, '');

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
