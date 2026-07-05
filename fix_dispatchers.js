const fs = require('fs');

let code = fs.readFileSync('client/src/components/game/GameView.jsx', 'utf8');

// Replace confirmDiscard
code = code.replace(
`    const dispatcher = new Dispatcher(gameState);
    const cardIds = selectedDiscards.map(idx => player.hand[idx].id);
    dispatcher.dispatchAction({ type: 'ACTION_DISCARD', payload: { playerId: 0, cardIds } });`,
`    const cardIds = selectedDiscards.map(idx => player.hand[idx].id);
    gameAPI.discardCards(0, cardIds);`
);

// Replace ACTION_PLAY_CARD block 1 (without targets)
code = code.replace(
`                       const dispatcher = new Dispatcher(gameState);
                       
                       if (isActionPending.current) return;
                       isActionPending.current = true;
                       
                       dispatcher.dispatchAction({
                           type: 'ACTION_PLAY_CARD',
                           payload: {
                               playerId: 0,
                               cardId: gameState.players[0].hand[selectedCard.index].id,
                               targets: [],
                               virtualCardName: selectedCard.virtualCardName
                           }
                       });`,
`                       if (isActionPending.current) return;
                       isActionPending.current = true;
                       
                       gameAPI.playCard(0, gameState.players[0].hand[selectedCard.index].id, [], { virtualCardName: selectedCard.virtualCardName });`
);

// Replace ACTION_PLAY_CARD block 2 (Xieng Xich)
code = code.replace(
`                       const dispatcher = new Dispatcher(gameState);
                       let finalTargets = [];
                       if (primaryTargetId !== null) finalTargets.push(primaryTargetId);
                       if (extraTargetId !== null) finalTargets.push(extraTargetId);
                       
                       if (isActionPending.current) return;
                       isActionPending.current = true;
                       
                       dispatcher.dispatchAction({
                           type: 'ACTION_PLAY_CARD',
                           payload: {
                               playerId: 0,
                               cardId: gameState.players[0].hand[selectedCard.index].id,
                               targets: finalTargets,
                               virtualCardName: 'Xiềng Xích'
                           }
                       });`,
`                       let finalTargets = [];
                       if (primaryTargetId !== null) finalTargets.push(primaryTargetId);
                       if (extraTargetId !== null) finalTargets.push(extraTargetId);
                       
                       if (isActionPending.current) return;
                       isActionPending.current = true;
                       
                       gameAPI.playCard(0, gameState.players[0].hand[selectedCard.index].id, finalTargets, { virtualCardName: 'Xiềng Xích' });`
);


fs.writeFileSync('client/src/components/game/GameView.jsx', code);
console.log("Replaced dispatchers in GameView.jsx");
