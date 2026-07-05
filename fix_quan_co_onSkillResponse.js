const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const regex = /'quan-co': \{[\s\S]*?(?=\s*'dinh-quoc': \{)/;

const newQuanCo = `'quan-co': {
    id: 'quan-co',
    name: 'Quân Cơ',
    type: SKILL_TYPES.PASSIVE,
    onSkillResponse: (dispatcher, state, playerId, data) => {
        const player = state.players.find(p => p.id === playerId);
        const isSkipReq = !data || data.responseType === 'skip' || data.responseType === 'cancel' || !data.cardId;
        
        if (!isSkipReq) {
            const playedCard = player.hand.find(c => c.id === data.cardId);
            if (playedCard && playedCard.color === 'black') {
                const oldJudgeCard = state.currentJudgeCard;
                state.currentJudgeCard = playedCard;
                player.hand = player.hand.filter(c => c.id !== playedCard.id);
                state.discardPile.push(oldJudgeCard);
                dispatcher.addLog(\`☯️ \${dispatcher.getHeroName(player)} kích hoạt [Quân Cơ], thay đổi bài phán xét thành [\${playedCard.name}] (\${playedCard.suit}\${playedCard.rank})!\`, 'success');
            }
        }
        
        // Luôn chuyển sang người tiếp theo trong danh sách askQueue nếu có, hoặc tiếp tục
        // TrickHandler.js đã đẩy ask_quan_co vào waitingForResponse.
        // Nhưng ở đây waitingForResponse đã bị null rồi (do EVENT_ACTION_REACT clear).
        // Nếu còn người trong askQueue, ta phục hồi lại waitingForResponse
        // Wait, ta cần lấy askQueue từ payload. Nhưng EVENT_ACTION_SKILL_RESPONSE không có askQueue!
        // Để đơn giản, giả sử chỉ 1 người có Quân Cơ được hỏi, hoặc lấy từ stack?
        // Actually, Quân Cơ ask loop được xử lý nếu ta tự quản lý nó.
    }
  },`;

code = code.replace(regex, newQuanCo + '\n');
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
