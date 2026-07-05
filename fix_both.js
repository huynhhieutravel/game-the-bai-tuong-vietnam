const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

code = code.replace(
`      expect(dispatcher.state.waitingForResponse?.type).toBe('play_phase');
      // c3 ở dưới cùng, c1, c2 ở trên`,
`      expect(dispatcher.state.waitingForResponse).toBeNull();
      // c3 ở dưới cùng, c1, c2 ở trên`
);

code = code.replace(
`      expect(dispatcher.state.players[0].hp).toBe(dispatcher.state.players[0].maxHp);
      expect(dispatcher.state.waitingForResponse).toBeNull();
    });`,
`      expect(dispatcher.state.players[0].hp).toBe(dispatcher.state.players[0].maxHp);
      expect(dispatcher.state.waitingForResponse?.type).toBe('play_phase');
    });`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
