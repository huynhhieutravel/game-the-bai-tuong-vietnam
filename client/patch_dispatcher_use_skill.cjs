const fs = require('fs');
const file = 'src/engine/core/Dispatcher.js';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `         case 'EVENT_ACTION_USE_SKILL': {
            const { playerId, skillId, targets } = event.payload;
            const validation = canUseSkill(this.state, playerId, skillId);
            if (!validation.valid) {
               console.error(\`Invalid UseSkill: \${validation.reason}\`);
               return;
            }
            const skillConfig = SkillRegistry[skillId];
            if (skillConfig && skillConfig.onUse) {
               skillConfig.onUse(this, this.state, playerId, targets);
            }
            break;
         }`;

const newLogic = `         case 'EVENT_ACTION_USE_SKILL': {
            const { playerId, skillId, targets, options } = event.payload;
            const validation = canUseSkill(this.state, playerId, skillId);
            if (!validation.valid) {
               console.error(\`Invalid UseSkill: \${validation.reason}\`);
               return;
            }
            const skillConfig = SkillRegistry[skillId];
            if (skillConfig && skillConfig.onUse) {
               skillConfig.onUse(this, this.state, playerId, targets, options);
            }
            break;
         }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
