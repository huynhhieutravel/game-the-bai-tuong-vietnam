const fs = require('fs');

let code = fs.readFileSync('client/src/components/game/GameView.jsx', 'utf8');

code = code.replace(
`                       gameAPI.playCard(0, gameState.players[0].hand[selectedCard.index].id, finalTargets, { virtualCardName: 'Xiềng Xích' });
                               playerId: 0,
                               cardId: gameState.players[0].hand[selectedCard.index].id,
                               targets: finalTargets,
                               virtualCardName: selectedCard.virtualCardName,
                               isReforge: xiengXichTargets.length === 0
                           }
                       });`,
`                       gameAPI.playCard(0, gameState.players[0].hand[selectedCard.index].id, finalTargets, { 
                           virtualCardName: selectedCard.virtualCardName,
                           isReforge: xiengXichTargets.length === 0
                       });`
);

fs.writeFileSync('client/src/components/game/GameView.jsx', code);
console.log("Fixed syntax");
