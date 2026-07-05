const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const regex = /'quan-co': \{[\s\S]*?(?=\s*'dinh-quoc': \{)/;

const newQuanCo = `'quan-co': {
    id: 'quan-co',
    name: 'Quân Cơ',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const { playerId, responseType, data } = payload;
        const player = state.players.find(p => p.id === playerId);
        const isSkipReq = !data || responseType === 'skip' || responseType === 'cancel' || !data.cardId;
        
        const req = state.waitingForResponse;
        
        if (!isSkipReq) {
            const playedCard = player.hand.find(c => c.id === data.cardId);
            if (playedCard && playedCard.color === 'black') {
                const oldJudgeCard = state.currentJudgeCard;
                state.currentJudgeCard = playedCard;
                player.hand = player.hand.filter(c => c.id !== playedCard.id);
                state.discardPile.push(oldJudgeCard);
                dispatcher.addLog(\`☯️ \${dispatcher.getHeroName(player)} kích hoạt [Quân Cơ], đổi bài phán xét thành [\${playedCard.name}]!\`, 'success');
                
                // Nếu Quân Cơ được dùng, vòng lặp hỏi chấm dứt
                state.waitingForResponse = null;
                return;
            }
        }
        
        // Bỏ qua hoặc bài không hợp lệ (không phải đen)
        // Chuyển sang người tiếp theo nếu có askQueue
        if (req && req.askQueue && req.askQueue.length > 1) {
             req.askQueue.shift();
             req.responderId = req.askQueue[0];
             // Tiếp tục chờ người tiếp theo
        } else {
             // Hết hàng đợi
             state.waitingForResponse = null;
        }
    }
  },`;

code = code.replace(regex, newQuanCo + '\n');
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
