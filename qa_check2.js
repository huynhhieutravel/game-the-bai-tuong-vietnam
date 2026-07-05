const fs = require('fs');
const skillRegistryRaw = fs.readFileSync('./client/src/engine/registries/SkillRegistry.js', 'utf8');
const skillDescriptionsRaw = fs.readFileSync('./client/src/engine/registries/SkillDescriptions.js', 'utf8');

const skillRegistryIds = [...skillRegistryRaw.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const skillRegistryIdSet = new Set(skillRegistryIds);

const skillIdToNameRegex = /export const SkillIdToName = {([^}]+)}/s;
const skillIdToNameMatch = skillIdToNameRegex.exec(skillDescriptionsRaw);
let mappedSkillIds = {};
if (skillIdToNameMatch) {
    const maps = [...skillIdToNameMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
    maps.forEach(m => mappedSkillIds[m[1]] = m[2]);
}

const skillDescRegex = /export const SkillDescriptions = {([^}]+)}/s;
const skillDescMatch = skillDescRegex.exec(skillDescriptionsRaw);
let descSkillNames = new Set();
if (skillDescMatch) {
    const descs = [...skillDescMatch[1].matchAll(/"([^"]+)":\s*"/g)];
    descs.forEach(m => descSkillNames.add(m[1]));
}

console.log("\n=== TÌM LỖI: Thiếu Description cho các skill có trong SkillRegistry ===");
for (let skillId of skillRegistryIdSet) {
    const baseName = mappedSkillIds[skillId];
    if (baseName && !descSkillNames.has(baseName)) {
        console.log(`LỖI: Kỹ năng '${skillId}' có tên gốc là '${baseName}' nhưng KHÔNG CÓ trong SkillDescriptions!`);
    } else if (!baseName) {
        console.log(`LỖI: Kỹ năng '${skillId}' không có tên gốc (thiếu trong SkillIdToName)!`);
    }
}
