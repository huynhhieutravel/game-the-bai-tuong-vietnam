const fs = require('fs');
const file = 'src/engine/index.js';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `export function useActiveSkill(state, playerId, skillId, targets) {
   const dispatcher = new Dispatcher(state);
   dispatcher.dispatchAction(UseSkillAction(playerId, skillId, targets));
   return adaptStateToUI(dispatcher.getState());
}`;
const newLogic = `export function useActiveSkill(state, playerId, skillId, targets, options = {}) {
   const dispatcher = new Dispatcher(state);
   dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: { playerId, skillId, targets, options }
   });
   return adaptStateToUI(dispatcher.getState());
}`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
