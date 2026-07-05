const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const oldTrungDung = `
                       if (realCard.name === req.virtualCardName) {
                           dispatcher.addLog(\`✅ Bài THẬT! Kỹ năng thành công. \${responder.name} bị phạt nhận [Hộ Giá]!\`, 'success');
                           responder.hasHoGia = true;
                           
                           dispatcher.state.actionQueue.unshift({
                               type: 'EVENT_ACTION_PLAY_CARD',
                               payload: {
                                   sourceId: player.id,
                                   targetId: req.targetId,
                                   cardId: null,
                                   virtualCardName: req.virtualCardName,
                                   isVirtual: true,
                                   activeSkill: 'trung-dung'
                               }
                           });
                       } else {
                           dispatcher.addLog(\`❌ Bài GIẢ! (\${realCard.name}). Kỹ năng thất bại!\`, 'danger');
                       }
                       
                       dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                   }
               } else {
                   req.askQueue.shift();
                   if (req.askQueue.length === 0) {
                       dispatcher.addLog(\`✅ Không ai nghi ngờ! Bài được tính là THẬT!\`, 'success');
                       
                       {
                           const realCard = player.hand.splice(req.realCardIndex, 1)[0];
                           dispatcher.applyEffect(Effects.MoveCardEffect(realCard.id, 'hand', 'discardPile', player.id, null));
                           
                           dispatcher.state.actionQueue.unshift({
                               type: 'EVENT_ACTION_PLAY_CARD',
                               payload: {
                                   sourceId: player.id,
                                   targetId: req.targetId,
                                   cardId: null,
                                   virtualCardName: req.virtualCardName,
                                   isVirtual: true,
                                   activeSkill: 'trung-dung'
                               }
                           });
                           
                           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                       }
                   } else {
`;

const newTrungDung = `
                       if (realCard.name === req.virtualCardName) {
                           dispatcher.addLog(\`✅ Bài THẬT! Kỹ năng thành công. \${responder.name} bị phạt nhận [Hộ Giá]!\`, 'success');
                           responder.hasHoGia = true;
                           
                           dispatcher.state.actionQueue.unshift({
                               type: 'EVENT_ACTION_PLAY_CARD',
                               payload: {
                                   sourceId: player.id,
                                   targetId: req.targetId,
                                   cardId: realCard.id,
                                   virtualCardName: req.virtualCardName,
                                   isVirtual: true,
                                   activeSkill: 'trung-dung'
                               }
                           });
                       } else {
                           dispatcher.applyEffect(Effects.MoveCardEffect(realCard.id, 'hand', 'discardPile', player.id, null));
                           dispatcher.addLog(\`❌ Bài GIẢ! (\${realCard.name}). Kỹ năng thất bại!\`, 'danger');
                       }
                       
                       dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                   }
               } else {
                   req.askQueue.shift();
                   if (req.askQueue.length === 0) {
                       dispatcher.addLog(\`✅ Không ai nghi ngờ! Bài được tính là THẬT!\`, 'success');
                       
                       {
                           const realCard = player.hand[req.realCardIndex];
                           
                           dispatcher.state.actionQueue.unshift({
                               type: 'EVENT_ACTION_PLAY_CARD',
                               payload: {
                                   sourceId: player.id,
                                   targetId: req.targetId,
                                   cardId: realCard.id,
                                   virtualCardName: req.virtualCardName,
                                   isVirtual: true,
                                   activeSkill: 'trung-dung'
                               }
                           });
                           
                           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                       }
                   } else {
`;

skillRegistry = skillRegistry.replace(
    /const realCard = player.hand.splice\(req.realCardIndex, 1\)\[0\];\s*dispatcher.applyEffect\(Effects.MoveCardEffect\(realCard.id, 'hand', 'discardPile', player.id, null\)\);\s*if \(realCard.name === req.virtualCardName\) \{/g,
    "const realCard = player.hand[req.realCardIndex];\n                       if (realCard.name === req.virtualCardName) {"
);

skillRegistry = skillRegistry.replace(oldTrungDung, newTrungDung);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
