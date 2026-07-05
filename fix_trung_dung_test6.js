const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`                           const realCard = player.hand[req.realCardIndex];
                           
                           dispatcher.state.actionQueue.unshift({
                               type: 'EVENT_ACTION_PLAY_CARD',`,
`                           const realCard = player.hand[req.realCardIndex];
                           console.log("[DEBUG TRUNG DUNG] Dispatching PLAY_CARD with cardId:", realCard.id, "realCard:", realCard);
                           dispatcher.state.actionQueue.unshift({
                               type: 'EVENT_ACTION_PLAY_CARD',`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
