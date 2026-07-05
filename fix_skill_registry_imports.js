const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const oldImports = `import { getAlivePlayers, addLog, isPlayerRevealed, getPlayerFaction } from '../gameState';
import { Effects } from '../core/Effects.js';
import { HeroRegistry } from './HeroRegistry.js';
import { SKILL_TYPES } from '../rules/SkillRules.js';
import * as Actions from '../core/Actions';`;

const newImports = `import { getAlivePlayers, addLog, isPlayerRevealed, getPlayerFaction } from '../gameState';
import * as Effects from '../core/Effects';
import { HeroRegistry } from './HeroRegistry';
import { SKILL_TYPES, canUseSkill } from '../rules/SkillRules';
import * as Actions from '../core/Actions';`;

code = code.replace(oldImports, newImports);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
