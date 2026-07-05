const fs = require('fs');

const heroRegistryRaw = fs.readFileSync('./client/src/engine/registries/HeroRegistry.js', 'utf8');
const skillRegistryRaw = fs.readFileSync('./client/src/engine/registries/SkillRegistry.js', 'utf8');
const skillDescriptionsRaw = fs.readFileSync('./client/src/engine/registries/SkillDescriptions.js', 'utf8');
const gameDataRaw = fs.readFileSync('./client/src/data/gameData.js', 'utf8');

// Parse HeroRegistry
const heroRegRegex = /"([^"]+)":\s*{\s*"id":\s*"([^"]+)",\s*"name":\s*"([^"]+)",\s*"maxHp":\s*(\d+),\s*"faction":\s*"([^"]+)",\s*"gender":\s*"([^"]+)",\s*"image":\s*"([^"]+)",[^\[]*"skillIds":\s*\[([^\]]+)\]/g;
const heroRegHeroes = [];
let m;
while ((m = heroRegRegex.exec(heroRegistryRaw)) !== null) {
    if (m[1] === 'SkillRegistry') continue;
    const skillIds = [...m[8].matchAll(/"([^"]+)"/g)].map(x => x[1]);
    heroRegHeroes.push({
        id: m[2], name: m[3], maxHp: m[4], faction: m[5], gender: m[6], image: m[7], skillIds
    });
}

// Parse SkillRegistry for names
const skillRegRegex = /id:\s*'([^']+)',\s*name:\s*'([^']+)'/g;
const skillIdToRegName = {};
while ((m = skillRegRegex.exec(skillRegistryRaw)) !== null) {
    skillIdToRegName[m[1]] = m[2];
}

// Parse SkillIdToName
const skillIdToNameRegex = /export const SkillIdToName = {([^}]+)}/s;
const skillIdToNameMatch = skillIdToNameRegex.exec(skillDescriptionsRaw);
let mappedSkillIds = {};
if (skillIdToNameMatch) {
    const maps = [...skillIdToNameMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
    maps.forEach(m => mappedSkillIds[m[1]] = m[2]);
}

// Parse SkillDescriptions (Fixed regex to handle escaped quotes!)
const skillDescRegex = /export const SkillDescriptions = {([^}]+)}/s;
const skillDescMatch = skillDescRegex.exec(skillDescriptionsRaw);
let descSkillMap = {};
if (skillDescMatch) {
    const descs = [...skillDescMatch[1].matchAll(/"([^"]+)":\s*"(.*?)(?<!\\)"/gs)];
    descs.forEach(m => descSkillMap[m[1]] = m[2]);
}

// Parse old gameData bios
const bioMap = {};
const oldHeroRegex = /id:\s*'([^']+)',.*?bio:\s*'([^']*)'/gs;
while ((match = oldHeroRegex.exec(gameDataRaw)) !== null) {
    bioMap[match[1]] = match[2];
}

// Generate new code
const heroesStartIdx = gameDataRaw.indexOf('export const HEROES = [');
let remaining = gameDataRaw.substring(heroesStartIdx);
let openBrackets = 0;
let heroesEndIdx = -1;
for (let i = 0; i < remaining.length; i++) {
    if (remaining[i] === '[') openBrackets++;
    else if (remaining[i] === ']') {
        openBrackets--;
        if (openBrackets === 0) {
            heroesEndIdx = heroesStartIdx + i;
            break;
        }
    }
}
const beforeHeroes = gameDataRaw.substring(0, heroesStartIdx);
const afterHeroes = gameDataRaw.substring(heroesEndIdx + 1);

let newHeroesStr = "export const HEROES = [\n";
const factions = ['Lạc', 'Việt', 'Hà', 'Sơn'];

for (let faction of factions) {
    newHeroesStr += `  // ${faction.toUpperCase()}\n`;
    const heroesInFaction = heroRegHeroes.filter(h => h.faction.toLowerCase() === faction.toLowerCase());
    
    for (let hero of heroesInFaction) {
        newHeroesStr += `  {\n`;
        newHeroesStr += `    id: '${hero.id}', name: '${hero.name}', maxHp: ${hero.maxHp}, faction: '${hero.faction}', gender: '${hero.gender}', image: '${hero.image}',\n`;
        newHeroesStr += `    skills: [\n`;
        
        for (let skillId of hero.skillIds) {
            const skillDefName = skillIdToRegName[skillId];
            const realName = skillDefName ? skillDefName : (mappedSkillIds[skillId] || skillId);
            const baseName = mappedSkillIds[skillId] || realName;
            let desc = descSkillMap[realName] || descSkillMap[baseName] || '(Kỹ năng Engine mới chưa nạp mô tả)';
            
            // Xử lý escaped quotes để xuất ra file JS đúng định dạng
            // Đầu tiên un-escape \", sau đó escape lại toàn bộ ' thành \' vì ta bọc string bằng '
            desc = desc.replace(/\\"/g, '"').replace(/'/g, "\\'").replace(/\n/g, "\\n");
            
            newHeroesStr += `      { name: '${realName}', desc: '${desc}' },\n`;
        }
        
        const bio = bioMap[hero.id] ? bioMap[hero.id].replace(/'/g, "\\'") : '';
        newHeroesStr += `    ], bio: '${bio}',\n`;
        newHeroesStr += `  },\n`;
    }
}
newHeroesStr += "]";

fs.writeFileSync('./client/src/data/gameData.js', beforeHeroes + newHeroesStr + afterHeroes, 'utf8');
console.log('Đã cập nhật gameData.js thành công bằng regex v2 script!');
