const fs = require('fs');
const file = 'src/engine/botAI.js';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `    if (req.type === 'ask_can_gian' && req.sourceId === bot.id) {
       const allAlive = getAlivePlayers(newState);
       const target = allAlive.find(p => p.id === req.targetId);
       const isEnemy = target && (!bot.isDaTam && target.isRevealed && getPlayerFaction(target) !== getPlayerFaction(bot));
       if (isEnemy && bot.hand.length > 0) {
           newState = handleResponse(newState, { doUse: true, cardIdx: 0 });
       } else {
           newState = handleResponse(newState, { doUse: false });
       }
       return newState;
    }`;

const newLogic = `    if (req.type === 'ask_can_gian' && req.askQueue && req.askQueue[0] === bot.id) {
       const { getPlayerFaction } = require('./gameState.js');
       const target = state.players.find(p => p.id === req.targetId);
       const isAlly = target && (!bot.isDaTam && target.isRevealed && getPlayerFaction(target) === getPlayerFaction(bot));
       if (isAlly && bot.hand.length > 0) {
           return { type: 'EVENT_ACTION_SKILL_RESPONSE', payload: { req, doReact: true, cardIndexSelected: 0 } };
       } else {
           return { type: 'EVENT_ACTION_SKILL_RESPONSE', payload: { req, doReact: false } };
       }
    }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
