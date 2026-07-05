const fs = require('fs');

// Fix Dispatcher targetId falsy check
let dispatcherCode = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');
dispatcherCode = dispatcherCode.replace(
`const targets = payload.targets || (payload.targetId ? [payload.targetId] : []);`,
`const targets = payload.targets || (payload.targetId !== undefined ? [payload.targetId] : []);`
);
fs.writeFileSync('client/src/engine/core/Dispatcher.js', dispatcherCode);

// Fix Quân Cơ logs
let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');
skillCode = skillCode.replace(
`            const playedCard = player.hand.find(c => c.id === data.cardId);
            if (playedCard && playedCard.color === 'black') {`,
`            const playedCard = player.hand.find(c => c.id === data.cardId);
            console.log('Quân Cơ onReact: playedCard=', playedCard ? playedCard.id : 'null', 'color=', playedCard ? playedCard.color : 'null');
            if (playedCard && playedCard.color === 'black') {`
);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);
console.log("Success");
