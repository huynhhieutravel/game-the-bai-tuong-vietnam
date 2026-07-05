const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`       if (payload.canceled) {
          state.players.find(p => p.id === req.sourceId).anBangUsed = true;
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide || payload.doUse) {
          state.players.find(p => p.id === req.sourceId).anBangUsed = true;`,
`       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetFlagEffect(req.sourceId, 'anBangUsed', true));
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide || payload.doUse) {
          dispatcher.applyEffect(Effects.SetFlagEffect(req.sourceId, 'anBangUsed', true));`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
