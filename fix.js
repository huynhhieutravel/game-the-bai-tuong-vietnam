const fs = require('fs');
const content = fs.readFileSync('client/src/engine/ai/botLogic.js', 'utf8');
const fixed = content.replace(/return \{\s+if \(activeSkills.includes\('Diệu Dược'\)/, 
`return { type: 'ACTION_REVEAL_HERO', payload: { playerId: bot.id, heroIndex: unrevealedIdx } };
        }

        // Kích hoạt các kỹ năng Tướng Chủ Động (Active Skills)
        const activeSkills = bot.heroes?.flatMap((h, i) => bot.revealedHeroes[i] ? (h.skills || []) : []).map(s => s.name) || [];
        
        if (activeSkills.includes('Diệu Dược')`);
fs.writeFileSync('client/src/engine/ai/botLogic.js', fixed);
