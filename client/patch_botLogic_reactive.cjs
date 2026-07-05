const fs = require('fs');
const file = 'src/engine/ai/botLogic.js';
let content = fs.readFileSync(file, 'utf8');

const anchor = `        else if (req.type === 'ask_hoacong_reveal') {`;

const insertion = `        else if (req.type === 'ask_hau_vien') {
            const targets = req.targets;
            const allyInNeed = targets.find(id => {
                 const p = gameState.players.find(x => x.id === id);
                 return p && p.hp <= 1; // Prioritize those in critical condition
            });
            if (allyInNeed) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, targetId: allyInNeed } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_thong_ngon') {
            if (bot.hand.length > 0) {
                 return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, cardId: bot.hand[bot.hand.length - 1].id } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_can_gian') {
            const target = gameState.players.find(p => p.id === req.targetId);
            const isAlly = target && (bot.isDaTam ? false : (target.isRevealed && !target.isDaTam && getPlayerFaction(target) === getPlayerFaction(bot)));
            if (isAlly && bot.hand.length > 0) {
                 return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, cardId: bot.hand[bot.hand.length - 1].id } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
` + anchor;

content = content.replace(anchor, insertion);

// Now handle active skills for Định Quốc
const anchorActive = `        if (activeSkills.includes('Duyên Thơ') && !bot.duyenThoUsedThisTurn && bot.hand.length >= 2 && bot.hp < bot.maxHp) {`;

const insertionActive = `        // Định Quốc check (dynamic injection since it depends on allies)
        if (getPlayerFaction(bot) === 'Sơn' && !bot.dinhQuocUsedThisTurn && bot.hand.length > 0) {
            const hasDinhQuocAlly = allAlive.find(p => p.id !== bot.id && p.hp < p.maxHp && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.name === 'Định Quốc')));
            if (hasDinhQuocAlly) {
                bot.dinhQuocUsedThisTurn = true;
                return { type: 'ACTION_SKILL', payload: { playerId: bot.id, skillId: 'dinh-quoc', targets: [hasDinhQuocAlly.id], options: { cardIdx: bot.hand.length - 1 } } };
            }
        }

` + anchorActive;

content = content.replace(anchorActive, insertionActive);

fs.writeFileSync(file, content);
