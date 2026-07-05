const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`                 const indexes = [...payload.cardIndexes].sort((a, b) => b - a);
                 const discardedCards = [];
                 for (const idx of indexes) {
                     const card = player.hand.splice(idx, 1)[0];
                     discardedCards.push(card);
                     dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id, null));
                 }`,
`                 const cardIdsToMove = payload.cardIndexes.map(idx => player.hand[idx].id);
                 for (const cardId of cardIdsToMove) {
                     dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', player.id, null));
                 }`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
