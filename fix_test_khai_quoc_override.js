const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`      dispatcher.state.players[1].mainHeroId = 'dinh-bo-linh';`,
`      dispatcher.state.players[1].mainHeroId = 'dinh-bo-linh';
      dispatcher.state.players[2].mainHeroId = 'thuy-to';`
);

code = code.replace(
`      console.log(dispatcher.state.players.map(p => ({
        id: p.id,
        main: p.mainHeroId,
        sub: p.subHeroId,
        revealed: p.revealedHeroes
      })));
      const limit = getHandLimit(dispatcher.state, 0);`,
`      const limit = getHandLimit(dispatcher.state, 0);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
