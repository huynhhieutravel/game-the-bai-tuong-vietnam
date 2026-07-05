const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_banh_chung') return;
        
        const player = state.players.find(p => p.id === req.targetId || p.id === req.sourceId);
        dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'banhChungUsed', true));
        
        console.log("BANH CHUNG ONREACT CALLED!", payload);
        if (payload && payload.orderedCards) {
            state.deck = state.deck.slice(0, state.deck.length - req.viewCount);
            const bottomCards = payload.deckBottom ? [...payload.deckBottom].reverse() : [];
            const topCards = payload.deckTop ? [...payload.deckTop].reverse() : [];
            state.deck = [...bottomCards, ...state.deck, ...topCards];
            dispatcher.addLog(\`✨ \${player.name} đã phát động [Bánh Chưng], xem và sắp xếp lại \${req.viewCount} lá bài!\`, 'important');
        }
        
        state.waitingForResponse = null;
        console.log("SET WAITING = NULL. reactionStack:", state.reactionStack.length, "actionQueue:", state.actionQueue.length);
    },`,
`    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_banh_chung') return;
        
        const player = state.players.find(p => p.id === req.targetId || p.id === req.sourceId);
        dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'banhChungUsed', true));
        
        // Sử dụng dispatcher.state vì applyEffect đã tạo state mới
        if (payload && payload.orderedCards) {
            dispatcher.state.deck = dispatcher.state.deck.slice(0, dispatcher.state.deck.length - req.viewCount);
            const bottomCards = payload.deckBottom ? [...payload.deckBottom].reverse() : [];
            const topCards = payload.deckTop ? [...payload.deckTop].reverse() : [];
            dispatcher.state.deck = [...bottomCards, ...dispatcher.state.deck, ...topCards];
            dispatcher.addLog(\`✨ \${player.name} đã phát động [Bánh Chưng], xem và sắp xếp lại \${req.viewCount} lá bài!\`, 'important');
        }
        
        dispatcher.state.waitingForResponse = null;
    },`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
