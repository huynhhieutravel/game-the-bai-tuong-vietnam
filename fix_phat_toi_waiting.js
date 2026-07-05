const fs = require('fs');

let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillCode = skillCode.replace(
`        if (target) {
            dispatcher.addLog(\`⚡ \${dispatcher.getHeroName(player)} kích hoạt [Phạt Tội]!\`);
            // Phán xét mục tiêu
            dispatcher.state.reactionStack.push({
                type: 'EVENT_JUDGE',
                payload: { targetId, reason: 'phat-toi', sourceId: playerId }
            });
        }`,
`        if (target) {
            dispatcher.addLog(\`⚡ \${dispatcher.getHeroName(player)} kích hoạt [Phạt Tội]!\`);
            // Phán xét mục tiêu
            dispatcher.state.reactionStack.push({
                type: 'EVENT_JUDGE',
                payload: { targetId, reason: 'phat-toi', sourceId: playerId }
            });
            // Kết thúc request ask_phat_toi
            state.waitingForResponse = null;
        } else {
            // Nếu bỏ qua Phạt Tội
            state.waitingForResponse = null;
        }`
);

// wait! if (!doProvide) return; doesn't clear waitingForResponse either!
// We should clear it for both skip and play!
skillCode = skillCode.replace(
`        console.log("Phạt Tội payload:", payload, "targetId:", targetId, "playerId:", playerId);
        if (!doProvide) return;`,
`        console.log("Phạt Tội payload:", payload, "targetId:", targetId, "playerId:", playerId);
        if (!doProvide) {
            state.waitingForResponse = null;
            return;
        }`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);
console.log("Success");
