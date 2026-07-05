const fs = require('fs');
let code = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');

code = code.replace(
`            const skillName = resolveSkillId(req.type, req);
            
            const skillConfig = SkillRegistry[skillName];`,
`            const skillName = resolveSkillId(req.type, req);
            console.log("RESOLVED SKILL NAME:", skillName);
            const skillConfig = SkillRegistry[skillName];`
);

fs.writeFileSync('client/src/engine/core/Dispatcher.js', code);
console.log("Success");
