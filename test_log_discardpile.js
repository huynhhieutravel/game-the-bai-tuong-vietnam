const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`      expect(dispatcher.state.discardPile.find(c => c.id === blackCard.id)).toBeTruthy();`,
`      console.log('DiscardPile:', dispatcher.state.discardPile.map(c => c.id));
      expect(dispatcher.state.discardPile.find(c => c.id === blackCard.id)).toBeTruthy();`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
