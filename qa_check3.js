const fs = require('fs');
const heroRegistryRaw = fs.readFileSync('./client/src/engine/registries/HeroRegistry.js', 'utf8');

const heroRegex = /"([^"]+)":\s*{([^}]+)}/g;
let match;
console.log("\n=== TÌM LỖI: Thuộc tính tướng ===");
while ((match = heroRegex.exec(heroRegistryRaw)) !== null) {
    const heroId = match[1];
    const heroBody = match[2];
    
    if (heroId === 'SkillRegistry') continue; // Bỏ qua nếu có nhầm lẫn

    if (!heroBody.includes('"name":')) console.log(`LỖI: Tướng '${heroId}' thiếu name!`);
    if (!heroBody.includes('"maxHp":')) console.log(`LỖI: Tướng '${heroId}' thiếu maxHp!`);
    if (!heroBody.includes('"faction":')) console.log(`LỖI: Tướng '${heroId}' thiếu faction!`);
    if (!heroBody.includes('"gender":')) console.log(`LỖI: Tướng '${heroId}' thiếu gender!`);
    if (!heroBody.includes('"image":')) console.log(`LỖI: Tướng '${heroId}' thiếu image!`);
}
console.log("=== KẾT THÚC QA TƯỚNG ===");
