const fs = require('fs');

// 1. Dispatcher.js
let dispatcherCode = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');
dispatcherCode = dispatcherCode.replace(
`           this.resolveEvent(event);
           loopCount++;
           console.log("[TICK] loopCount:", loopCount, "event.type:", event.type, "waitingForResponse is:", this.state.waitingForResponse ? this.state.waitingForResponse.type : null);
           if (this.state.waitingForResponse) {
                const req = this.state.waitingForResponse;`,
`           this.resolveEvent(event);
           loopCount++;
           if (this.state.waitingForResponse) {
                const req = this.state.waitingForResponse;`
);
fs.writeFileSync('client/src/engine/core/Dispatcher.js', dispatcherCode);

// 2. CombatHandler.js
let combatHandler = fs.readFileSync('client/src/engine/core/handlers/CombatHandler.js', 'utf8');
combatHandler = combatHandler.replace(
`      case 'EVENT_DO_ASK_DODGE': {
         const { sourceId, targetId, unavoidable, reason, reqDodges } = payload;
         console.log("[EVENT_DO_ASK_DODGE] reqDodges:", reqDodges, "isCancelled:", payload.isCancelled, "unavoidable:", unavoidable);
         if (payload.isCancelled) return true;`,
`      case 'EVENT_DO_ASK_DODGE': {
         const { sourceId, targetId, unavoidable, reason, reqDodges } = payload;
         if (payload.isCancelled) return true;`
);
fs.writeFileSync('client/src/engine/core/handlers/CombatHandler.js', combatHandler);

// 3. SkillRegistry.js
let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');
skillRegistry = skillRegistry.replace(
`      'ON_TARGETED_SLASH': (dispatcher, state, playerId, payload) => {
          console.log("[PHA QUAN] ON_TARGETED_SLASH called. playerId:", playerId, "sourceId:", payload.sourceId);
          if (playerId !== payload.sourceId) return false;
          const { sourceId, targetId } = payload;
          const player = state.players.find(p => p.id === sourceId);
          console.log("[PHA QUAN] isPlayerRevealed:", isPlayerRevealed(player));
          if (player && isPlayerRevealed(player)) {`,
`      'ON_TARGETED_SLASH': (dispatcher, state, playerId, payload) => {
          if (playerId !== payload.sourceId) return false;
          const { sourceId, targetId } = payload;
          const player = state.players.find(p => p.id === sourceId);
          if (player && isPlayerRevealed(player)) {`
);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);

console.log("Cleanup Success");
