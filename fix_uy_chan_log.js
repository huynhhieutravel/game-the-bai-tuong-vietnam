const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`         const cardId = payload.sourceCardId || payload.cardId;
         const sourceCard = state.discardPile.find(c => c.id === cardId) || 
                            state.deck.find(c => c.id === cardId) || // fallback
                            null;

         if (!sourceCard || (sourceCard.name !== 'Chém' && sourceCard.name !== 'Quyết Đấu')) return false;`,
`         const cardId = payload.sourceCardId || payload.cardId;
         const sourceCard = state.discardPile.find(c => c.id === cardId) || 
                            state.deck.find(c => c.id === cardId) || // fallback
                            null;

         console.log("Uy Chấn hook! Card ID:", cardId, "Source Card:", sourceCard ? sourceCard.name : "NULL");

         if (!sourceCard || (sourceCard.name !== 'Chém' && sourceCard.name !== 'Quyết Đấu')) return false;`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
