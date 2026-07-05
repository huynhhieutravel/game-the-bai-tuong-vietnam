const fs = require('fs');

let combatHandler = fs.readFileSync('client/src/engine/core/handlers/CombatHandler.js', 'utf8');

combatHandler = combatHandler.replace(
`      case 'EVENT_DO_ASK_DODGE': {
         const { responderId, targetId, sourceId, reason, reqDodges } = payload;
         dispatcher.state.waitingForResponse = {
            type: 'ask_dodge',
            responderId,
            targetId,
            sourceId,
            reason,
            reqDodges
         };
         return true;
      }`,
`      case 'EVENT_DO_ASK_DODGE': {
         const { responderId, targetId, sourceId, reason, reqDodges } = payload;
         dispatcher.state.waitingForResponse = {
            type: 'ask_dodge',
            responderId,
            targetId,
            sourceId,
            reason,
            reqDodges
         };
         
         const hasHook = dispatcher.triggerHooks('ON_ASK_DODGE', payload);
         
         return true;
      }`
);

fs.writeFileSync('client/src/engine/core/handlers/CombatHandler.js', combatHandler);
console.log("Success");
