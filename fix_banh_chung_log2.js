const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`        state.waitingForResponse = null;`,
`        state.waitingForResponse = null;
        console.log("SET WAITING = NULL. reactionStack:", state.reactionStack.length, "actionQueue:", state.actionQueue.length);`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
