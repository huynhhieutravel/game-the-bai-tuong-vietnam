const { createTestDispatcher, createCard } = require('./client/src/engine/__tests__/testHelper.js');

const dispatcher = createTestDispatcher({
  mainHeroId: 'do-doc-bao',
  playerCount: 2,
  p0Hand: [],
  p1Hand: []
});

dispatcher.state.players[0].revealedHeroes = [true, false];

dispatcher.state.actionQueue = [{ type: 'EVENT_PHASE_DRAW', payload: { targetId: 0 } }];
dispatcher.tick();

console.log("waitingForResponse:", dispatcher.state.waitingForResponse);

dispatcher.dispatchAction({
  type: 'ACTION_SKILL_RESPONSE',
  payload: { playerId: 0, doProvide: true, targetId: 1 }
});

console.log("P1 HP:", dispatcher.state.players[1].hp);
