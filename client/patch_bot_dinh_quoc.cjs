const fs = require('fs');
const file = 'src/engine/botAI.js';
let content = fs.readFileSync(file, 'utf8');

// Thêm import
const importLogic = `import { useActiveSkill } from './index';\n`;
content = importLogic + content;

// Cập nhật mảng activeSkills để động thêm Định Quốc
const oldActiveSkills = `    const activeSkills = bot.heroes?.flatMap((h, i) => bot.revealedHeroes[i] ? (h.skills || []) : []).map(s => s.name) || [];`;
const newActiveSkills = `    const activeSkills = bot.heroes?.flatMap((h, i) => bot.revealedHeroes[i] ? (h.skills || []) : []).map(s => s.name) || [];
    if (getPlayerFaction(bot) === 'Sơn') {
        const hasDinhQuocUser = newState.players.some(p => p.id !== bot.id && p.isAlive && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.name === 'Định Quốc')));
        if (hasDinhQuocUser && !activeSkills.includes('Định Quốc')) {
            activeSkills.push('Định Quốc');
        }
    }`;
content = content.replace(oldActiveSkills, newActiveSkills);

// Thêm logic dùng Định Quốc
const oldBotLogic = `    // Nhóm 1: Hỗ trợ & Khởi động`;
const newBotLogic = `    // Nhóm 1: Hỗ trợ & Khởi động
    if (activeSkills.includes('Định Quốc') && !bot.dinhQuocUsedThisTurn && bot.hand.length > 0) {
        const target = getAlivePlayers(newState).find(p => p.id !== bot.id && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.name === 'Định Quốc')));
        if (target && target.hp < target.maxHp) {
             bot.dinhQuocUsedThisTurn = true;
             return useActiveSkill(newState, bot.id, 'dinh-quoc', [target.id], { cardIdx: bot.hand.length - 1 });
        }
    }`;
content = content.replace(oldBotLogic, newBotLogic);

fs.writeFileSync(file, content);
