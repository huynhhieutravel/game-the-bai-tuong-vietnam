const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { 
            playerId: 0, 
            responseType: 'play',
            cardIndex: 0,
            targetId: 1
        }
      });`,
`      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { 
            playerId: 0, 
            doReact: true,
            cardIndex: 0,
            targetId: 1
        }
      });`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
