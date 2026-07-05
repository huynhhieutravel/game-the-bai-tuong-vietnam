const fs = require('fs');
const file = 'src/engine/core/Dispatcher.js';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `                         const { getPlayerFaction } = require('../../gameState.js');
                         if (targetPlayer && getPlayerFaction(targetPlayer) === 'Hà') {`;
const newLogic = `                         const isHa = targetPlayer && targetPlayer.heroes?.some((h, i) => targetPlayer.revealedHeroes[i] && h.faction === 'Hà');
                         if (isHa) {`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
