const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`        dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'dieuDuocUsedThisTurn', true));
        
        dispatcher.state.reactionStack.push({
           type: 'EVENT_HEAL',
           payload: { sourceId: playerId, targetId: targets[0], amount: 1 }
        });`,
`        dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'dieuDuocUsedThisTurn', true));
        dispatcher.applyEffect(Effects.RecoverEffect(targets[0], 1));`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
