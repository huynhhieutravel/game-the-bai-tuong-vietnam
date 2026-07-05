const fs = require('fs');

// 1. Fix Định Quốc state mutation in SkillRegistry.js
let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');
skillCode = skillCode.replace(
`        sender.dinhQuocUsedThisTurn = true;`,
`        dispatcher.applyEffect(Effects.SetFlagEffect(sender.id, 'dinhQuocUsedThisTurn', true));`
);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);

// 2. Fix tests in heroes_son.test.js
let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

// Fix Phạt Tội: add currentPlayerIndex = 1
testCode = testCode.replace(
`      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.deck = [createCard('Chém', 'Cơ bản', '♠', '2', 'black')]; 
      
      dispatcher.dispatchAction({
          type: 'ACTION_PLAY_CARD',`,
`      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.deck = [createCard('Chém', 'Cơ bản', '♠', '2', 'black')]; 
      
      dispatcher.state.currentPlayerIndex = 1; // Cho p1 đánh
      
      dispatcher.dispatchAction({
          type: 'ACTION_PLAY_CARD',`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
