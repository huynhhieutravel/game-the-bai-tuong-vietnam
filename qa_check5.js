const fs = require('fs');

const heroRegistryRaw = fs.readFileSync('./client/src/engine/registries/HeroRegistry.js', 'utf8');
const skillRegistryRaw = fs.readFileSync('./client/src/engine/registries/SkillRegistry.js', 'utf8');
const skillDescriptionsRaw = fs.readFileSync('./client/src/engine/registries/SkillDescriptions.js', 'utf8');
const gameDataRaw = fs.readFileSync('./client/src/data/gameData.js', 'utf8');

// Parse gameData.js HEROES (extract via regex)
const gameDataHeroes = [];
let m;
const heroRegex = /id:\s*'([^']+)',\s*name:\s*'([^']+)',[^\[]*skills:\s*\[([^\]]+)\]/g;
while ((m = heroRegex.exec(gameDataRaw)) !== null) {
    const id = m[1];
    const name = m[2];
    const skillsRaw = m[3];
    const skills = [...skillsRaw.matchAll(/name:\s*'([^']+)'/g)].map(x => x[1]);
    gameDataHeroes.push({ id, name, skills });
}

// Parse HeroRegistry
const heroRegRegex = /"([^"]+)":\s*{\s*"id":\s*"([^"]+)",\s*"name":\s*"([^"]+)",[^\[]*"skillIds":\s*\[([^\]]+)\]/g;
const heroRegHeroes = [];
while ((m = heroRegRegex.exec(heroRegistryRaw)) !== null) {
    const key = m[1];
    if (key === 'SkillRegistry') continue;
    const id = m[2];
    const name = m[3];
    const skillIds = [...m[4].matchAll(/"([^"]+)"/g)].map(x => x[1]);
    heroRegHeroes.push({ id, name, skillIds });
}

// Map skillId -> skillName in SkillRegistry
const skillRegRegex = /id:\s*'([^']+)',\s*name:\s*'([^']+)'/g;
const skillIdToRegName = {};
while ((m = skillRegRegex.exec(skillRegistryRaw)) !== null) {
    skillIdToRegName[m[1]] = m[2];
}

console.log("=== KIỂM TRA LỖI TÊN KỸ NĂNG (Wiki vs Engine) ===");
for (let hero of heroRegHeroes) {
    const gdHero = gameDataHeroes.find(h => h.id === hero.id);
    if (!gdHero) {
        console.log(`LỖI: Tướng '${hero.name}' không có trong gameData.js!`);
        continue;
    }
    
    const engineSkillNames = hero.skillIds.map(id => skillIdToRegName[id] || id);
    const wikiSkillNames = gdHero.skills;
    
    // So sánh
    engineSkillNames.forEach(es => {
        if (!wikiSkillNames.includes(es)) {
            console.log(`LỖI TÊN KỸ NĂNG: Tướng '${hero.name}' có skill '${es}' trong Engine nhưng Wiki (gameData) lại không có (hoặc viết sai tên)! Các skill trong Wiki: ${wikiSkillNames.join(', ')}`);
        }
    });
    
    wikiSkillNames.forEach(ws => {
        if (!engineSkillNames.includes(ws)) {
            console.log(`LỖI TÊN KỸ NĂNG: Tướng '${hero.name}' có skill '${ws}' trong Wiki nhưng Engine lại không có (hoặc viết sai tên)! Các skill trong Engine: ${engineSkillNames.join(', ')}`);
        }
    });
}

