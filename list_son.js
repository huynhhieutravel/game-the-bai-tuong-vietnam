const fs = require('fs');
const registry = fs.readFileSync('client/src/engine/registries/HeroRegistry.js', 'utf8');
const lines = registry.split('\n');
let currentHero = null;
let currentFaction = null;
let inSkillIds = false;
let skillIds = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"name":')) {
        currentHero = line.split(':')[1].replace(/"/g, '').replace(/,/g, '').trim();
    }
    if (line.includes('"faction":')) {
        currentFaction = line.split(':')[1].replace(/"/g, '').replace(/,/g, '').trim();
    }
    if (line.includes('"skillIds":')) {
        inSkillIds = true;
        skillIds = [];
        continue;
    }
    if (inSkillIds && line.includes(']')) {
        inSkillIds = false;
        if (currentFaction === 'Sơn') {
            console.log(`- ${currentHero} (Sơn): ${skillIds.join(', ')}`);
        }
    }
    if (inSkillIds) {
        skillIds.push(line.replace(/"/g, '').replace(/,/g, '').trim());
    }
}
