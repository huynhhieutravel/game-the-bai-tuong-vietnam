const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`      dispatcher.dispatchAction({
          type: 'ACTION_PLAY_CARD',
          payload: { playerId: 1, cardId: dispatcher.state.players[1].hand[0].id, targetId: 0 }
      });`,
`      console.log("Before dispatchAction");
      dispatcher.dispatchAction({
          type: 'ACTION_PLAY_CARD',
          payload: { playerId: 1, cardId: dispatcher.state.players[1].hand[0].id, targetId: 0 }
      });
      console.log("After dispatchAction, reactionStack:", dispatcher.state.reactionStack.length);
      console.log("waitingForResponse:", dispatcher.state.waitingForResponse);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
