const fs = require('fs');

// Fix Phạt Tội request responderId
let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');
skillCode = skillCode.replace(
`                  request: {
                      type: 'ask_phat_toi',
                      sourceId: attackerId,
                      targetId: sourceId
                  }`,
`                  request: {
                      type: 'ask_phat_toi',
                      responderId: attackerId,
                      sourceId: attackerId,
                      targetId: sourceId
                  }`
);

// Change Quân Cơ back to onSkillResponse
skillCode = skillCode.replace(
`    onReact: (dispatcher, state, payload) => {
        const { playerId, responseType, data } = payload;`,
`    onSkillResponse: (dispatcher, state, playerId, data) => {
        const payload = { playerId, responseType: data ? 'play' : 'skip', data };
        const { responseType: unused1, data: unused2 } = payload;` // just tricking my inner logic inside onReact
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);
console.log("Success");
