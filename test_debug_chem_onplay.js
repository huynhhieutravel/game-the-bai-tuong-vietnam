const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/CardRegistry.js', 'utf8');

code = code.replace(
`      const orderedTargets = dispatcher.getOrderedTargets(playerId, targets);
      
      [...orderedTargets].reverse().forEach(targetId => {
         dispatcher.state.reactionStack.push({`,
`      const orderedTargets = dispatcher.getOrderedTargets(playerId, targets);
      console.log('chem onPlay! orderedTargets:', orderedTargets);
      [...orderedTargets].reverse().forEach(targetId => {
         console.log('Pushing EVENT_ASK_DODGE for target', targetId);
         dispatcher.state.reactionStack.push({`
);

fs.writeFileSync('client/src/engine/registries/CardRegistry.js', code);
