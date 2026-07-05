const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`          console.log("[PHA QUAN] ON_TARGETED_SLASH called. playerId:", playerId, "sourceId:", payload.sourceId);
          if (playerId !== payload.sourceId) return false;
          const { sourceId, targetId } = payload;
          const player = state.players.find(p => p.id === sourceId);
          if (player && isPlayerRevealed(player)) {`,
`          console.log("[PHA QUAN] ON_TARGETED_SLASH called. playerId:", playerId, "sourceId:", payload.sourceId);
          if (playerId !== payload.sourceId) return false;
          const { sourceId, targetId } = payload;
          const player = state.players.find(p => p.id === sourceId);
          console.log("[PHA QUAN] isPlayerRevealed:", isPlayerRevealed(player));
          if (player && isPlayerRevealed(player)) {`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
