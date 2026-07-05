const fs = require('fs');

let code = fs.readFileSync('client/src/engine/core/handlers/TrickHandler.js', 'utf8');

// Replace EVENT_JUDGE with a two-step process
code = code.replace(
`      case 'EVENT_JUDGE': {
         const { targetId, reason } = payload;
         
         const judgeCard = dispatcher.state.deck.length > 0 ? dispatcher.state.deck.pop() : { suit: '♠', rank: 2 }; 
         const targetName = dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId));
         dispatcher.addLog(\`⚖️ Phán Xét [\${reason}]: \${targetName} lật ra lá \${judgeCard.suit} \${judgeCard.rank}\`, 'info');

         if (reason === 'bat-quai') {`,
`      case 'EVENT_JUDGE': {
         const { targetId, reason } = payload;
         
         const judgeCard = dispatcher.state.deck.length > 0 ? dispatcher.state.deck.pop() : { suit: '♠', rank: 2 }; 
         dispatcher.state.currentJudgeCard = judgeCard;
         
         const targetName = dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId));
         dispatcher.addLog(\`⚖️ Phán Xét [\${reason}]: \${targetName} lật ra lá \${judgeCard.suit} \${judgeCard.rank}\`, 'info');
         
         // 1. Tạo hàng đợi những người có skill Quân Cơ (sau này có thể thêm Quỷ Tài)
         const aliveIds = dispatcher.state.players.filter(p => p.isAlive).map(p => p.id);
         const orderedIds = dispatcher.getOrderedTargets(targetId, aliveIds);
         
         const quanCoPlayers = orderedIds.filter(id => {
             const p = dispatcher.state.players.find(x => x.id === id);
             return p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.id === 'quan-co'));
         });
         
         // 2. Đẩy bước Resolve cuối cùng vào stack (LIFO -> thực hiện sau cùng)
         dispatcher.state.reactionStack.push({
             type: 'EVENT_JUDGE_RESOLVE',
             payload: { targetId, reason, originalCardId: payload.cardId }
         });
         
         // 3. Nếu có ai có thể đổi phán xét, hỏi họ
         if (quanCoPlayers.length > 0) {
             dispatcher.state.waitingForResponse = {
                 type: 'ask_quan_co',
                 askQueue: quanCoPlayers,
                 targetId: targetId,
                 reason: reason
             };
             // Setup responder đầu tiên
             dispatcher.state.waitingForResponse.responderId = quanCoPlayers[0];
         }
         return true;
      }
      
      case 'EVENT_JUDGE_RESOLVE': {
         const { targetId, reason, originalCardId } = payload;
         const targetName = dispatcher.getHeroName(dispatcher.state.players.find(p => p.id === targetId));
         
         const judgeCard = dispatcher.state.currentJudgeCard;
         if (!judgeCard) return true; // Safety
         
         // Bỏ bài phán xét vào mộ
         dispatcher.state.discardPile.push(judgeCard);
         dispatcher.state.currentJudgeCard = null;
         
         if (reason === 'bat-quai') {`
);

// We need to fix the reference to event.payload.cardId inside Sấm Sét
code = code.replace(
`               dispatcher.applyEffect(Effects.MoveCardEffect(event.payload.cardId, 'discardPile', 'judgement', null, nextPlayerId, 'sam-set'));`,
`               dispatcher.applyEffect(Effects.MoveCardEffect(originalCardId, 'discardPile', 'judgement', null, nextPlayerId, 'sam-set'));`
);

fs.writeFileSync('client/src/engine/core/handlers/TrickHandler.js', code);
console.log("Success");
