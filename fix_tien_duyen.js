const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

// Thay thế onUse của tien-duyen-active
const oldOnUse = `    onUse: (dispatcher, state, playerId, targets, options) => {
       const player = state.players.find(p => p.id === playerId);
       const cardId = options?.cardIds?.[0];
       if (!cardId) return;
       const card = player.hand.find(c => c.id === cardId && c.suit === '♣');
       if (!card) return;
       
       dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'playedCards', playerId, null));
       
       if (!targets || targets.length === 0) {
           dispatcher.addLog(\`✨ \${player.name} phát động [Tiên Duyên], rèn lại 1 lá bài ♣!\`, 'important');
           dispatcher.applyEffect(Effects.DrawCardEffect(playerId, 1));
       } else {
           dispatcher.addLog(\`✨ \${player.name} phát động [Tiên Duyên], dùng bài ♣ làm [Xiềng Xích]!\`, 'important');
           dispatcher.state.actionQueue.unshift({
               type: 'EVENT_ACTION_PLAY_CARD',
               payload: {
                   sourceId: playerId,
                   targetIds: targets,
                   cardId: cardId,
                   virtualCardName: 'Xiềng Xích',
                   isVirtual: true,
                   activeSkill: 'tien-duyen-active'
               }
           });
       }
    },`;

const newOnUse = `    onUse: (dispatcher, state, playerId, targets, options) => {
       const player = state.players.find(p => p.id === playerId);
       const cardId = options?.cardIds?.[0];
       if (!cardId) return;
       const card = player.hand.find(c => c.id === cardId && c.suit === '♣');
       if (!card) return;
       
       if (!targets || targets.length === 0) {
           dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId, null));
           dispatcher.addLog(\`✨ \${player.name} phát động [Tiên Duyên], rèn lại 1 lá bài ♣!\`, 'important');
           dispatcher.applyEffect(Effects.DrawCardEffect(playerId, 1));
       } else {
           // Cho phép ActionHandler tự xử lý di chuyển bài
           dispatcher.addLog(\`✨ \${player.name} phát động [Tiên Duyên], dùng bài ♣ làm [Xiềng Xích]!\`, 'important');
           dispatcher.state.actionQueue.unshift({
               type: 'EVENT_ACTION_PLAY_CARD',
               payload: {
                   sourceId: playerId,
                   targetIds: targets,
                   cardId: cardId,
                   virtualCardName: 'Xiềng Xích',
                   isVirtual: true,
                   activeSkill: 'tien-duyen-active'
               }
           });
       }
    },`;

code = code.replace(oldOnUse, newOnUse);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
