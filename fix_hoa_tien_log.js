const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_hoa_tien') return;
        
        const player = state.players.find(p => p.id === req.targetId);`,
`    onReact: (dispatcher, state, payload) => {
        console.log("HOA TIEN ON REACT CALLED!", payload);
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_hoa_tien') {
            console.log("HOA TIEN EARLY RETURN", req);
            return;
        }
        
        const player = state.players.find(p => p.id === req.targetId);`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
