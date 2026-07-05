const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`      // Đồng ý rút
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { doUse: true } }
      });`,
`      // Đồng ý rút
      console.log("==TRƯỚC KHI REACT==", dispatcher.state.waitingForResponse);
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { doUse: true } }
      });
      console.log("==SAU KHI REACT==", dispatcher.state.waitingForResponse);
      console.log("==STATE PLAYERS==", dispatcher.state.players[0]);`
);
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
