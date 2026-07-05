const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

testCode = testCode.replace(
`    // P1 plays first dodge
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, cardId: p1.hand[0].id }
    });
    
    dispatcher.tick();
    
    // We will just expect they still need a dodge.
    expect(dispatcher.state.waitingForResponse).not.toBeNull();
    expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');`,
`    // P1 plays first dodge
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, cardId: p1.hand[0].id }
    });
    
    dispatcher.tick();
    
    console.log("AFTER FIRST DODGE. reactionStack size:", dispatcher.state.reactionStack.length);
    console.log("waitingForResponse:", dispatcher.state.waitingForResponse);
    
    // We will just expect they still need a dodge.
    expect(dispatcher.state.waitingForResponse).not.toBeNull();
    expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
