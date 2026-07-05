const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

code = code.replace(
`      expect(dispatcher.state.deck[1].id).toBe(c1.id);
      expect(dispatcher.state.deck[2].id).toBe(c2.id);`,
`      expect(dispatcher.state.deck[1].id).toBe(c2.id); // c2 rút thứ 2
      expect(dispatcher.state.deck[2].id).toBe(c1.id); // c1 ở trên cùng, rút đầu tiên`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
