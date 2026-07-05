const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

code = code.replace(
`      expect(dispatcher.state.players[0].hand.length).toBe(1);
      expect(dispatcher.state.players[0].hand[0].name).toBe('Chém');
    });
  });
});

  describe('Tiên Dung (Duyên Tiên, Tiên Duyên)', () => {`,
`      expect(dispatcher.state.players[0].hand.length).toBe(1);
      expect(dispatcher.state.players[0].hand[0].name).toBe('Chém');
    });

  describe('Tiên Dung (Duyên Tiên, Tiên Duyên)', () => {`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
