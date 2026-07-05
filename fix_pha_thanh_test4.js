const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`      DRAW_PHASE: (dispatcher, state, playerId, payload) => {
         console.log("[PHA THANH] DRAW_PHASE triggered for playerId:", playerId, "targetId:", payload.targetId);
         if (playerId !== payload.targetId) return false;
         const player = state.players.find(p => p.id === playerId);
         console.log("[PHA THANH] player.phaThanhUsed:", player.phaThanhUsed);
         if (player.phaThanhUsed) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_pha_thanh', sourceId: playerId } }
         });
         return true;
      }`,
`      DRAW_PHASE: (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         const player = state.players.find(p => p.id === playerId);
         if (player.phaThanhUsed) return false;

         // Interrupt draw_phase
         dispatcher.state.waitingForResponse = null;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_pha_thanh', sourceId: playerId } }
         });
         return true;
      }`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
