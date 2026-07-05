const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

// find all trailing `});`
code = code.replace(/(\}\);\s*)+$/, '});\n');

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
