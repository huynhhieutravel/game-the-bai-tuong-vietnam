const fs = require('fs');

const heroRegistryRaw = fs.readFileSync('./client/src/engine/registries/HeroRegistry.js', 'utf8');
const gameDataRaw = fs.readFileSync('./client/src/data/gameData.js', 'utf8');

const heroRegIds = [...heroRegistryRaw.matchAll(/"id":\s*"([^"]+)"/g)].map(m => m[1]);
const gameDataRegex = /id:\s*'([^']+)'/g;
let match;
let gameDataIds = [];
while ((match = gameDataRegex.exec(gameDataRaw)) !== null) {
    gameDataIds.push(match[1]);
}

const gameDataSet = new Set(gameDataIds);
const regSet = new Set(heroRegIds);

console.log("=== KIỂM TRA ĐỒNG BỘ TƯỚNG ===");
for (let id of heroRegIds) {
    if (!gameDataSet.has(id)) {
        console.log(`LỖI: Tướng '${id}' có trong HeroRegistry nhưng KHÔNG CÓ TRONG gameData.js!`);
    }
}

for (let id of gameDataIds) {
    // Chỉ lấy id tướng (thường không chứa số, và không phải là id thẻ bài như chem-0-...)
    if (!id.includes('-') || id.match(/^[a-z-]+$/)) {
        if (!regSet.has(id) && !['chem','ne','dao','ruou'].includes(id) && !id.includes('vukhi') && !id.includes('ngua')) {
             // check if it's actually a hero by seeing if it's in the HEROES array
        }
    }
}
