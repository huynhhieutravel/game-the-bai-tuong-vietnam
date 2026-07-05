const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`         const sourceCard = state.discardPile.find(c => c.id === payload.cardId) || 
                            state.deck.find(c => c.id === payload.cardId) || // fallback`,
`         const cardId = payload.sourceCardId || payload.cardId;
         const sourceCard = state.discardPile.find(c => c.id === cardId) || 
                            state.deck.find(c => c.id === cardId) || // fallback`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
