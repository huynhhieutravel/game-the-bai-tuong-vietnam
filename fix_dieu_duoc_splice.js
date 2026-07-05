const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`                 const discardedCard = player.hand.splice(cardIdx, 1)[0];
                 dispatcher.applyEffect(Effects.MoveCardEffect(discardedCard.id, 'hand', 'discardPile', player.id, null));
                 
                 dispatcher.addLog(\`✨ \${player.name} phát động [Diệu Dược], bỏ \${discardedCard.name} để hồi 1 HP cho \${target.name}!\`, 'heal');
                 console.log("Diệu Dược: Bơm máu cho", target.id, "HP trước:", target.hp, "Max:", target.maxHp);
                 dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));
                 console.log("Diệu Dược: Bơm máu xong");`,
`                 const discardedCard = player.hand[cardIdx];
                 dispatcher.applyEffect(Effects.MoveCardEffect(discardedCard.id, 'hand', 'discardPile', player.id, null));
                 
                 dispatcher.addLog(\`✨ \${player.name} phát động [Diệu Dược], bỏ \${discardedCard.name} để hồi 1 HP cho \${target.name}!\`, 'heal');
                 dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
