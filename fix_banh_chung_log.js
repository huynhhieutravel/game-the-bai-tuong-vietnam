const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`        if (payload && payload.orderedCards) {
            state.deck = state.deck.slice(0, state.deck.length - req.viewCount);`,
`        console.log("BANH CHUNG ONREACT CALLED!", payload);
        if (payload && payload.orderedCards) {
            state.deck = state.deck.slice(0, state.deck.length - req.viewCount);`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
