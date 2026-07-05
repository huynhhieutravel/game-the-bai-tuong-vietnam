const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`       if (!req || req.type !== 'ask_an_bang') return;

       if (payload.canceled) {`,
`       if (!req || req.type !== 'ask_an_bang') return;
       console.log("==AN BANG ON REACT==", payload);

       if (payload.canceled) {`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
