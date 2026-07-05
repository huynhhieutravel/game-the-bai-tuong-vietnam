const fs = require('fs');
let content = fs.readFileSync('client/src/App.jsx', 'utf8');

// Replace both occurrences of the activeActorId / targetId resolution
content = content.replace(
    /activeActorId = req\.responderId \?\? \(req\.askQueue && req\.askQueue\[0\]\) \?\? req\.targetId \?\? gameState\.currentPlayerIndex;/g,
    "activeActorId = (req.askQueue && req.askQueue.length > 0 ? req.askQueue[0] : req.responderId) ?? req.targetId ?? gameState.currentPlayerIndex;"
);

content = content.replace(
    /targetId = req\.responderId \?\? \(req\.askQueue && req\.askQueue\[0\]\) \?\? req\.targetId \?\? req\.sourceId;/g,
    "targetId = (req.askQueue && req.askQueue.length > 0 ? req.askQueue[0] : req.responderId) ?? req.targetId ?? req.sourceId;"
);

fs.writeFileSync('client/src/App.jsx', content);
