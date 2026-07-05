const fs = require('fs');

let combatHandler = fs.readFileSync('client/src/engine/core/handlers/CombatHandler.js', 'utf8');

combatHandler = combatHandler.replace(
`      case 'EVENT_DO_ASK_DODGE': {
         const { sourceId, targetId, unavoidable, reason, reqDodges } = payload;
         if (payload.isCancelled) return true;`,
`      case 'EVENT_DO_ASK_DODGE': {
         const { sourceId, targetId, unavoidable, reason, reqDodges } = payload;
         console.log("[EVENT_DO_ASK_DODGE] reqDodges:", reqDodges, "isCancelled:", payload.isCancelled, "unavoidable:", unavoidable);
         if (payload.isCancelled) return true;`
);

fs.writeFileSync('client/src/engine/core/handlers/CombatHandler.js', combatHandler);
console.log("Success");
