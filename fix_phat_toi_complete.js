const fs = require('fs');

// 1. TrickHandler.js
let trickCode = fs.readFileSync('client/src/engine/core/handlers/TrickHandler.js', 'utf8');
trickCode = trickCode.replace(
`            switch (reason) {
                case 'bat-quai':`,
`            switch (reason) {
                case 'phat-toi': {
                    // Đinh Điền (sourceId của req Phạt Tội) dùng Phạt Tội lên targetId
                    // Nhưng ở EVENT_JUDGE, sourceId là người dùng Phạt Tội, targetId là mục tiêu!
                    // Wait, EVENT_JUDGE_RESOLVE có event.payload: { targetId, reason, sourceId }
                    // judgeCard is dispatcher.state.currentJudgeCard
                    const judgeCard = dispatcher.state.currentJudgeCard;
                    const target = dispatcher.state.players.find(p => p.id === targetId);
                    const source = dispatcher.state.players.find(p => p.id === sourceId);
                    dispatcher.addLog(\`⚖️ [Phạt Tội] phán xét ra \${judgeCard.suit} \${judgeCard.rank} (\${judgeCard.color})!\`, 'important');
                    
                    if (judgeCard.suit === '♠') {
                        dispatcher.addLog(\`⚡ \${dispatcher.getHeroName(target)} nhận 2 sát thương Lôi vì [Phạt Tội]!\`, 'damage');
                        dispatcher.state.reactionStack.push({
                            type: 'EVENT_DAMAGE',
                            payload: { sourceId: sourceId, targetId: targetId, amount: 2, damageType: 'lightning' }
                        });
                    } else if (judgeCard.suit === '♣') {
                        dispatcher.applyEffect(Effects.RecoverEffect(sourceId, 1));
                        dispatcher.addLog(\`💖 \${dispatcher.getHeroName(source)} hồi 1 HP và gây 1 sát thương Lôi cho \${dispatcher.getHeroName(target)}!\`, 'heal');
                        dispatcher.state.reactionStack.push({
                            type: 'EVENT_DAMAGE',
                            payload: { sourceId: sourceId, targetId: targetId, amount: 1, damageType: 'lightning' }
                        });
                    } else {
                        dispatcher.addLog(\`💨 Phán xét \${judgeCard.suit}! \${dispatcher.getHeroName(target)} bình an vô sự.\`, 'normal');
                    }
                    break;
                }
                case 'bat-quai':`
);
fs.writeFileSync('client/src/engine/core/handlers/TrickHandler.js', trickCode);

// 2. Dispatcher.js: Remove hardcoded ask_phat_toi
let dispatcherCode = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');
dispatcherCode = dispatcherCode.replace(
`            // ============== LOGIC ASK PHAT TOI ==============
            if (waitingType === 'ask_phat_toi') {
                if (data && data.targetId !== undefined && data.targetId !== null) {
                    const target = this.state.players.find(p => p.id === data.targetId);
                    const player = this.state.players.find(p => p.id === req.sourceId);
                    this.addLog(\`✨ \${this.getHeroName(player)} phát động [Phạt Tội] lên \${this.getHeroName(target)}!\`, 'important');
                    
                    if (this.state.deck.length === 0) {
                        this.state.deck = [...this.state.discardPile].reverse();
                        this.state.discardPile = [];
                    }
                    const judgeCard = this.state.deck.pop();
                    this.state.discardPile.push(judgeCard);
                    this.addLog(\`⚖️ [Phạt Tội] phán xét: \${judgeCard.suit} \${judgeCard.rank} (\${judgeCard.color})!\`, 'important');
                    
                    if (judgeCard.suit === '♠') {
                        this.addLog(\`⚡ \${this.getHeroName(target)} nhận 2 sát thương Lôi vì [Phạt Tội]!\`, 'damage');
                        this.state.reactionStack.push({
                            type: 'EVENT_DAMAGE',
                            payload: { sourceId: player.id, targetId: target.id, amount: 2, damageType: 'lightning' }
                        });
                    } else if (judgeCard.suit === '♣') {
                        this.applyEffect(Effects.RecoverEffect(player.id, 1));
                        this.addLog(\`💖 \${this.getHeroName(player)} hồi 1 HP và gây 1 sát thương Lôi cho \${this.getHeroName(target)}!\`, 'heal');
                        this.state.reactionStack.push({
                            type: 'EVENT_DAMAGE',
                            payload: { sourceId: player.id, targetId: target.id, amount: 1, damageType: 'lightning' }
                        });
                    } else {
                        this.addLog(\`💨 Phán xét \${judgeCard.suit}! \${this.getHeroName(target)} bình an vô sự.\`, 'normal');
                    }
                    this.state.waitingForResponse = null;
                    return;
                }
            }`,
``);
fs.writeFileSync('client/src/engine/core/Dispatcher.js', dispatcherCode);

// 3. SkillRegistry.js: Fix EVENT_JUDGE payload to include sourceId
let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');
skillCode = skillCode.replace(
`            dispatcher.state.reactionStack.push({
                type: 'EVENT_JUDGE',
                payload: { targetId, reason: 'phat-toi' }
            });`,
`            dispatcher.state.reactionStack.push({
                type: 'EVENT_JUDGE',
                payload: { targetId, reason: 'phat-toi', sourceId: playerId }
            });`
);
fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);

console.log("Success");
