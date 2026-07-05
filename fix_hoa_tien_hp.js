const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const oldCode = `            // Bỏ toàn bộ bài trên tay, trang bị, phán xét
            const toDiscard = [...player.hand, ...player.equipment, ...(player.judgementArea || [])];
            toDiscard.forEach(card => {
               dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id)); // Đơn giản hóa, MoveCardEffect không quá khắt khe fromZone
            });
            player.hand = [];
            player.equipment = [];
            player.judgementArea = [];
            
            // Hồi sinh lực về 3
            player.hp = 3;
            
            // Rút 3 lá
            dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 3));
            
            // Hủy EVENT_DO_DYING dưới đáy (vì đã sống)
            const dyingIdx = state.reactionStack.findIndex(e => e.type === 'EVENT_DO_DYING' && e.payload.targetId === player.id);
            if (dyingIdx >= 0) state.reactionStack.splice(dyingIdx, 1);`;

const newCode = `            // Bỏ toàn bộ bài trên tay, trang bị, phán xét
            const toDiscard = [...player.hand, ...player.equipment, ...(player.judgementArea || [])];
            toDiscard.forEach(card => {
               dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id)); 
            });
            
            // Lấy lại player MỚI NHẤT sau khi applyEffect
            const updatedPlayer = dispatcher.state.players.find(p => p.id === req.targetId);
            updatedPlayer.hand = [];
            updatedPlayer.equipment = [];
            updatedPlayer.judgementArea = [];
            
            // Hồi sinh lực về 3
            updatedPlayer.hp = 3;
            
            // Rút 3 lá
            dispatcher.applyEffect(Effects.DrawCardEffect(updatedPlayer.id, 3));
            
            // Hủy EVENT_DO_DYING dưới đáy (vì đã sống)
            const dyingIdx = dispatcher.state.reactionStack.findIndex(e => e.type === 'EVENT_DO_DYING' && e.payload.targetId === req.targetId);
            if (dyingIdx >= 0) dispatcher.state.reactionStack.splice(dyingIdx, 1);`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
