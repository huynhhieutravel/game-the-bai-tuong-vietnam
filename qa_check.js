const fs = require('fs');

const heroRegistryRaw = fs.readFileSync('./client/src/engine/registries/HeroRegistry.js', 'utf8');
const skillRegistryRaw = fs.readFileSync('./client/src/engine/registries/SkillRegistry.js', 'utf8');
const skillDescriptionsRaw = fs.readFileSync('./client/src/engine/registries/SkillDescriptions.js', 'utf8');

console.log("=== BẮT ĐẦU QA ===");

// Trích xuất HeroRegistry IDs
const heroIds = [...heroRegistryRaw.matchAll(/"id":\s*"([^"]+)"/g)].map(m => m[1]);
console.log(`Tìm thấy ${heroIds.length} tướng trong HeroRegistry.`);

// Trích xuất tất cả skillIds được gán cho tướng trong HeroRegistry
const assignedSkillIds = new Set();
const skillRegex = /"skillIds":\s*\[(.*?)\]/gs;
let match;
while ((match = skillRegex.exec(heroRegistryRaw)) !== null) {
    const skills = match[1].match(/"([^"]+)"/g);
    if (skills) {
        skills.forEach(s => assignedSkillIds.add(s.replace(/"/g, '')));
    }
}
console.log(`Tìm thấy ${assignedSkillIds.size} kỹ năng được gán cho Tướng.`);

// Trích xuất SkillRegistry IDs
const skillRegistryIds = [...skillRegistryRaw.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const skillRegistryIdSet = new Set(skillRegistryIds);
console.log(`Tìm thấy ${skillRegistryIds.length} kỹ năng trong SkillRegistry.`);

// Trích xuất SkillIdToName keys
const skillIdToNameRegex = /export const SkillIdToName = {([^}]+)}/s;
const skillIdToNameMatch = skillIdToNameRegex.exec(skillDescriptionsRaw);
let mappedSkillIds = new Set();
if (skillIdToNameMatch) {
    const maps = [...skillIdToNameMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
    maps.forEach(m => mappedSkillIds.add(m[1]));
}
console.log(`Tìm thấy ${mappedSkillIds.size} kỹ năng trong SkillIdToName.`);

// Trích xuất SkillDescriptions keys
const skillDescRegex = /export const SkillDescriptions = {([^}]+)}/s;
const skillDescMatch = skillDescRegex.exec(skillDescriptionsRaw);
let descSkillNames = new Set();
if (skillDescMatch) {
    const descs = [...skillDescMatch[1].matchAll(/"([^"]+)":\s*"/g)];
    descs.forEach(m => descSkillNames.add(m[1]));
}
console.log(`Tìm thấy ${descSkillNames.size} kỹ năng trong SkillDescriptions.`);

console.log("\n=== TÌM LỖI: Tướng có Kỹ năng nhưng KHÔNG TỒN TẠI trong SkillRegistry ===");
for (let skillId of assignedSkillIds) {
    if (!skillRegistryIdSet.has(skillId)) {
        console.log(`LỖI CHÍ MẠNG: Tướng có kỹ năng '${skillId}' nhưng KHÔNG CÓ TRONG SkillRegistry.js!`);
    }
}

console.log("\n=== TÌM LỖI: Kỹ năng có trong SkillRegistry nhưng KHÔNG CÓ TRONG SkillIdToName ===");
for (let skillId of skillRegistryIdSet) {
    if (!mappedSkillIds.has(skillId)) {
        console.log(`LỖI: Kỹ năng '${skillId}' thiếu map tên trong SkillIdToName (file SkillDescriptions.js)!`);
    }
}

