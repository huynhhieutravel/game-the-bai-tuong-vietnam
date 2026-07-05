const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`        const isSkipReq = !data || responseType === 'skip' || responseType === 'cancel' || !data.cardId;
        
        const req = state.waitingForResponse;`,
`        const isSkipReq = !data || responseType === 'skip' || responseType === 'cancel' || !data.cardId;
        console.log("Quân Cơ data:", data, "isSkipReq:", isSkipReq);
        const req = state.waitingForResponse;`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
