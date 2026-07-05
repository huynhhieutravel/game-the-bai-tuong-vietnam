const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`                 const discardedCard = player.hand.splice(payload.cardIndex, 1)[0];
                 dispatcher.applyEffect(Effects.MoveCardEffect(discardedCard.id, 'hand', 'discardPile', player.id, null));`,
`                 const discardedCard = player.hand[payload.cardIndex];
                 dispatcher.applyEffect(Effects.MoveCardEffect(discardedCard.id, 'hand', 'discardPile', player.id, null));`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
