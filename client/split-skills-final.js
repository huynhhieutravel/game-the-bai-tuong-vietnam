import fs from 'fs';
import path from 'path';
import * as acorn from 'acorn';

const sourceFile = 'src/engine/registries/SkillRegistry.js';
const outDir = 'src/engine/registries/skills';

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const content = fs.readFileSync(sourceFile, 'utf8');
const ast = acorn.parse(content, { ecmaVersion: 2022, sourceType: 'module' });

let registryNode = null;
for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.declarations) {
        const decl = node.declaration.declarations[0];
        if (decl.id.name === 'SkillRegistry' && decl.init.type === 'ObjectExpression') {
            registryNode = decl.init;
            break;
        }
    }
}

if (!registryNode) {
    console.error("Could not find SkillRegistry object.");
    process.exit(1);
}

const categories = {
    system: [],
    passive: [],
    reaction: [],
    combat: [],
    equipment: [] // Will leave empty if none
};

for (const prop of registryNode.properties) {
    if (prop.type === 'Property') {
        let key = null;
        if (prop.key.type === 'Identifier') key = prop.key.name;
        if (prop.key.type === 'Literal') key = prop.key.value;
        
        if (!key) continue;

        const raw = content.slice(prop.start, prop.end);
        
        let isPassive = false;
        let hasHooks = false;
        
        if (prop.value.type === 'ObjectExpression') {
            for (const subProp of prop.value.properties) {
                if (subProp.key?.name === 'isPassive' && subProp.value.value === true) {
                    isPassive = true;
                }
                if (subProp.key?.name === 'hooks') {
                    hasHooks = true;
                }
            }
        }

        if (key === 'weapon-skill' || key === 'tam-cong' || key === 'boc-tram-trung') {
            categories.system.push(raw);
        } else if (isPassive) {
            categories.passive.push(raw);
        } else if (hasHooks) {
            categories.reaction.push(raw);
        } else {
            categories.combat.push(raw);
        }
    }
}

const sharedImports = `import { getAlivePlayers, addLog, isPlayerRevealed, getPlayerFaction } from '../../gameState';
import * as Effects from '../../core/Effects';
import { HeroRegistry } from '../HeroRegistry';
import { canUseSkill } from '../../rules/SkillRules';
import * as Actions from '../../core/Actions';
import { getAttackRange, getDistance } from '../../rangeSystem';
import { SKILL_TYPES } from '../SkillRegistry';

const rankToNumber = (rank) => {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    return parseInt(rank) || 0;
};
`;

let importLines = [];
let exportKeys = [];

for (const [catName, skills] of Object.entries(categories)) {
    if (skills.length === 0) {
        fs.writeFileSync(path.join(outDir, `${catName}.js`), `export const ${catName}Skills = {};\n`);
    } else {
        const fileContent = `${sharedImports}\nexport const ${catName}Skills = {\n  ${skills.join(',\n\n  ')}\n};\n`;
        fs.writeFileSync(path.join(outDir, `${catName}.js`), fileContent);
    }
    importLines.push(`import { ${catName}Skills } from './skills/${catName}.js';`);
    exportKeys.push(`...${catName}Skills`);
}

const originalHeader = content.split('export const SkillRegistry =')[0];

const aggregateContent = `${originalHeader}
${importLines.join('\n')}

export const SkillRegistry = {
  ${exportKeys.join(',\n  ')}
};
`;

fs.writeFileSync(sourceFile, aggregateContent);
console.log('Successfully split SkillRegistry into categories!');
