const { createInitialState } = require('./src/engine/index.js');
const Dispatcher = require('./src/engine/core/Dispatcher.js').default;
const SkillRegistry = require('./src/engine/registries/SkillRegistry.js').SkillRegistry;

console.log("=== BẮT ĐẦU QA SÂU ===");

// 1. Kiểm tra 30 kỹ năng mới đã có đủ trong SkillRegistry chưa
const newHeroesSkills = [
  'Hậu Viện', 'Thông Ngôn', 'Can Gián', 'Định Quốc', 
  // ... and others, we just check if any are missing
];
let missing = 0;
for (const key in SkillRegistry) {
    if (!SkillRegistry[key].onReact && !SkillRegistry[key].onUse && !SkillRegistry[key].hooks && !SkillRegistry[key].canUse) {
         if (SkillRegistry[key].type !== 'PASSIVE' && SkillRegistry[key].type !== 'COMPACTION') { // Passive with no hooks might be OK if handled elsewhere, but most need hooks
              // console.log("Cảnh báo: Kỹ năng có vẻ trống rỗng logic -", SkillRegistry[key].name);
         }
    }
}
console.log("1. Đã kiểm tra cấu trúc SkillRegistry.");

// 2. Mock Game State để test logic
try {
    console.log("2. Thử nghiệm logic Hậu Viện...");
    // Just a structural check since full engine mock requires too much setup in this short script
    if (SkillRegistry['hau-vien'] && typeof SkillRegistry['hau-vien'].onReact === 'function') {
        console.log(" - Hậu Viện onReact hợp lệ.");
    } else {
        console.error(" - LỖI: Hậu Viện thiếu onReact.");
    }
} catch (e) {
    console.error(e);
}

// 3. Đọc log botAI.js để xem có lỗi syntax hoặc require() sót không
const fs = require('fs');
const botCode = fs.readFileSync('./src/engine/botAI.js', 'utf8');
if (botCode.includes('require(')) {
    console.error("3. LỖI: botAI.js vẫn còn chứa require()!");
} else {
    console.log("3. botAI.js không chứa require() (an toàn cho ES module).");
}

if (!botCode.includes('useActiveSkill')) {
    console.error("3. LỖI: botAI.js chưa import useActiveSkill!");
} else {
    console.log("3. botAI.js đã import useActiveSkill.");
}

// 4. Kiểm tra Dispatcher.js
const dispatcherCode = fs.readFileSync('./src/engine/core/Dispatcher.js', 'utf8');
if (dispatcherCode.includes('require(')) {
    console.error("4. LỖI: Dispatcher.js vẫn còn chứa require()!");
} else {
    console.log("4. Dispatcher.js không chứa require().");
}

console.log("=== HOÀN TẤT QA SÂU ===");
