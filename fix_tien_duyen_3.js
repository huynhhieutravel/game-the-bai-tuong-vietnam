const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
    'targetIds: targets,',
    'targets: targets,'
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
