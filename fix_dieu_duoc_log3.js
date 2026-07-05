const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`       const req = state.waitingForResponse;
       console.log("Diệu Dược onReact called! Payload:", payload, "Req:", req);
       if (!req || req.type !== 'ask_dieu_duoc') return;`,
`       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_dieu_duoc') return;`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
