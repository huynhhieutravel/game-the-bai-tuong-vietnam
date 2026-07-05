const fs = require('fs');

// 1. Dispatcher.js: Fix EVENT_ACTION_REACT to include playerId
let dispatcherCode = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');
dispatcherCode = dispatcherCode.replace(
`                 const skillPayload = data ? { ...data, doProvide: !isCanceled, canceled: isCanceled, req: req } : { doProvide: false, canceled: true, req: req };`,
`                 const skillPayload = data ? { playerId, ...data, doProvide: !isCanceled, canceled: isCanceled, req: req } : { playerId, doProvide: false, canceled: true, req: req };`
);
fs.writeFileSync('client/src/engine/core/Dispatcher.js', dispatcherCode);

// 2. SkillRegistry.js: Change onSkillResponse back to onReact
let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

// For phat-toi
skillCode = skillCode.replace(
`    onSkillResponse: (dispatcher, state, playerId, data) => {
        const { targetId } = data || {};
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);`,
`    onReact: (dispatcher, state, payload) => {
        const { targetId, playerId } = payload || {};
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);`
);

// For quan-co
skillCode = skillCode.replace(
`    onSkillResponse: (dispatcher, state, playerId, data) => {
        const responseType = data ? 'play' : 'skip';
        const player = state.players.find(p => p.id === playerId);
        const isSkipReq = !data || responseType === 'skip' || responseType === 'cancel' || !data.cardId;
        console.log("Quân Cơ data:", data, "isSkipReq:", isSkipReq);
        const req = state.waitingForResponse;
        
        if (!isSkipReq) {
            const playedCard = player.hand.find(c => c.id === data.cardId);`,
`    onReact: (dispatcher, state, payload) => {
        const { playerId, doProvide, req, cardId } = payload;
        const player = state.players.find(p => p.id === playerId);
        const isSkipReq = !doProvide || !cardId;
        
        if (!isSkipReq) {
            const playedCard = player.hand.find(c => c.id === cardId);`
);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);

console.log("Success");
