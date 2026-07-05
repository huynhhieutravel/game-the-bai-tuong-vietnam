const fs = require('fs');

let code = fs.readFileSync('client/src/engine/__tests__/testHelper.js', 'utf8');

code = code.replace(
`    hasFirstRevealHappened: true,
  };`,
`    hasFirstRevealHappened: true,
    logs: [],
  };`
);

fs.writeFileSync('client/src/engine/__tests__/testHelper.js', code);
console.log("Success");
