const fs = require('fs');

const heroReg = require('./client/src/engine/registries/HeroRegistry.js').HeroRegistry;
const skillReg = require('./client/src/engine/registries/SkillRegistry.js').SkillRegistry;
const skillDesc = require('./client/src/engine/registries/SkillDescriptions.js').SkillDescriptions;
const skillIdToName = require('./client/src/engine/registries/SkillDescriptions.js').SkillIdToName;

const gameDataRaw = fs.readFileSync('./client/src/data/gameData.js', 'utf8');

// Phân tách phần code trước HEROES, phần HEROES, và phần sau
const heroesStartIdx = gameDataRaw.indexOf('export const HEROES = [');
if (heroesStartIdx === -1) {
    console.log('Không tìm thấy HEROES array');
    process.exit(1);
}
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

if (heroesEndIdx === -1) {
    console.log('Không parse được ngoặc của HEROES array');
    process.exit(1);
}

const beforeHeroes = gameDataRaw.substring(0, heroesStartIdx);
const afterHeroes = gameDataRaw.substring(heroesEndIdx + 1);

// Tạo mới chuỗi cho HEROES dựa trên HeroRegistry
let newHeroesStr = "export const HEROES = [\n";

// Để giữ bio, ta cần extract bio từ gameData cũ
const bioMap = {};
const oldHeroRegex = /id:\s*'([^']+)',.*?bio:\s*'([^']*)'/gs;
let match;
while ((match = oldHeroRegex.exec(gameDataRaw)) !== null) {
    bioMap[match[1]] = match[2];
}

const factions = ['Lạc', 'Việt', 'Hà', 'Sơn'];

for (let faction of factions) {
    newHeroesStr += `  // ${faction.toUpperCase()}\n`;
    const heroesInFaction = Object.values(heroReg).filter(h => h.faction.toLowerCase() === faction.toLowerCase());
    
    for (let hero of heroesInFaction) {
        newHeroesStr += `  {\n`;
        newHeroesStr += `    id: '${hero.id}', name: '${hero.name}', maxHp: ${hero.maxHp}, faction: '${hero.faction}', gender: '${hero.gender}', image: '${hero.image}',\n`;
        newHeroesStr += `    skills: [\n`;
        
        for (let skillId of (hero.skillIds || [])) {
            const skillDef = skillReg[skillId];
            const realName = skillDef ? skillDef.name : (skillIdToName[skillId] || skillId);
            const baseName = skillIdToName[skillId] || realName;
            let desc = (skillDef && skillDef.desc) ? skillDef.desc : (skillDesc[realName] || skillDesc[baseName] || '(Kỹ năng Engine mới chưa nạp mô tả)');
            
            // Xử lý xuống dòng trong desc để không bị lỗi cú pháp JS (nếu có)
            desc = desc.replace(/'/g, "\\'").replace(/\n/g, "\\n");
            
            newHeroesStr += `      { name: '${realName}', desc: '${desc}' },\n`;
        }
        
        const bio = bioMap[hero.id] ? bioMap[hero.id].replace(/'/g, "\\'") : '';
        newHeroesStr += `    ], bio: '${bio}',\n`;
        newHeroesStr += `  },\n`;
    }
}
newHeroesStr += "]";

const finalCode = beforeHeroes + newHeroesStr + afterHeroes;
fs.writeFileSync('./client/src/data/gameData.js', finalCode, 'utf8');
console.log('Đã cập nhật gameData.js thành công!');

