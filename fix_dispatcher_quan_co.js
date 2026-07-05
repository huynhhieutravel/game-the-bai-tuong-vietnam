const fs = require('fs');
let code = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');

// I need to find where ask_snatch or ask_negate is handled in ACTION_REACT, and add ask_quan_co
const snippet = `
            // ============== EARLY BYPASS CHO DISMANTLE / SNATCH ==============
            // Vì các event này chọn bài từ mục tiêu (target) chứ không phải đánh bài từ trên tay mình
            if (waitingType === 'ask_dismantle' || waitingType === 'ask_snatch') {`;
            
const replaceSnippet = `
            // ============== EARLY BYPASS CHO QUAN_CO ==============
            if (waitingType === 'ask_quan_co') {
                if (isSkip || !data || !data.cardId) {
                    // Chuyển sang người tiếp theo
                    if (req.askQueue.length > 0) req.askQueue.shift();
                    if (req.askQueue.length > 0) {
                        req.responderId = req.askQueue[0];
                        this.state.waitingForResponse = req;
                    } else {
                        this.state.waitingForResponse = null;
                    }
                    return;
                }
                
                // Đánh ra 1 lá Đen
                const player = this.state.players.find(p => p.id === playerId);
                const playedCard = player.hand.find(c => c.id === data.cardId);
                
                if (playedCard && (playedCard.suit === '♠' || playedCard.suit === '♣' || playedCard.color === 'black')) {
                    const oldJudgeCard = this.state.currentJudgeCard;
                    
                    this.addLog(\`♟️ \${this.getHeroName(player)} dùng [Quân Cơ], thay lá phán xét bằng \${playedCard.suit} \${playedCard.rank}!\`, 'important');
                    
                    // Lấy lá mới từ tay ra làm currentJudgeCard
                    this.state.currentJudgeCard = playedCard;
                    player.hand = player.hand.filter(c => c.id !== playedCard.id);
                    
                    // Lá phán xét cũ vào mộ
                    this.state.discardPile.push(oldJudgeCard);
                    
                    // Quân Cơ xong thì ngắt askQueue luôn
                    this.state.waitingForResponse = null;
                }
                return;
            }

            // ============== EARLY BYPASS CHO DISMANTLE / SNATCH ==============
            // Vì các event này chọn bài từ mục tiêu (target) chứ không phải đánh bài từ trên tay mình
            if (waitingType === 'ask_dismantle' || waitingType === 'ask_snatch') {`;

code = code.replace(snippet, replaceSnippet);

// We must also handle if responseType === 'skip' in ACTION_REACT bypass?
// Wait, the early bypass in Dispatcher.js for ACTION_REACT is BEFORE `const isSkip = ...`?
// Let's check where `const isSkip = ...` is defined.
