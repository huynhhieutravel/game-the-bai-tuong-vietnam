const fs = require('fs');
let code = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');

code = code.replace(
`            // 6. Gọi logic từ CardRegistry
            const cardConfig = CardRegistry[configName];
            if (cardConfig && cardConfig.onPlay) {
               cardConfig.onPlay(this, this.state, playerId, finalTargets, cardId);
            }`,
`            // 6. Gọi logic từ CardRegistry
            const cardConfig = CardRegistry[configName];
            if (cardConfig && cardConfig.onPlay) {
               console.log('[DEBUG] Executing onPlay for', configName, 'targets:', finalTargets);
               cardConfig.onPlay(this, this.state, playerId, finalTargets, cardId);
            } else {
               console.log('[DEBUG] No onPlay found for', configName);
            }`
);

fs.writeFileSync('client/src/engine/core/Dispatcher.js', code);
