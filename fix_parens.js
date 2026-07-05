const fs = require('fs');
let content = fs.readFileSync('client/src/engine/ai/botLogic.js', 'utf8');

// Diệu Dược at 321
content = content.replace(/ask_dieu_duoc'\) \{\n            const allyInNeed = gameState\.players\.find\(p => p\.isAlive && p\.hp < p\.maxHp && \(p\.id === bot\.id \|\| \(\!bot\.isDaTam && p\.isRevealed && \!p\.isDaTam && getPlayerFaction\(p\) === getPlayerFaction\(bot\)\)\);/g, 
"ask_dieu_duoc') {\n            const allyInNeed = gameState.players.find(p => p.isAlive && p.hp < p.maxHp && (p.id === bot.id || (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot))));");

// Duyên Thơ at 330
content = content.replace(/ask_duyen_tho'\) \{\n            const allyInNeed = gameState\.players\.find\(p => p\.id \!\=\= bot\.id && p\.isAlive && p\.hp < p\.maxHp && \(p\.gender === 'Nam' \|\| \(p\.heroes && p\.heroes\[0\] && p\.heroes\[0\]\.gender === 'Nam'\)\) && \(\!bot\.isDaTam && p\.isRevealed && \!p\.isDaTam && getPlayerFaction\(p\) === getPlayerFaction\(bot\)\)\);/g, 
"ask_duyen_tho') {\n            const allyInNeed = gameState.players.find(p => p.id !== bot.id && p.isAlive && p.hp < p.maxHp && (p.gender === 'Nam' || (p.heroes && p.heroes[0] && p.heroes[0].gender === 'Nam')) && (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot)));");

// Diệu Dược at 398
content = content.replace(/includes\('Diệu Dược'\) && \!bot\.dieuDuocUsedThisTurn && bot\.hand\.length > 0\) \{\n            const allyInNeed = allAlive\.find\(p => p\.hp < p\.maxHp && \(p\.id === bot\.id \|\| \(\!bot\.isDaTam && p\.isRevealed && \!p\.isDaTam && getPlayerFaction\(p\) === getPlayerFaction\(bot\)\)\);/g, 
"includes('Diệu Dược') && !bot.dieuDuocUsedThisTurn && bot.hand.length > 0) {\n            const allyInNeed = allAlive.find(p => p.hp < p.maxHp && (p.id === bot.id || (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot))));");

// Duyên Thơ at 413
content = content.replace(/includes\('Duyên Thơ'\) && \!bot\.duyenThoUsedThisTurn && bot\.hand\.length >= 2 && bot\.hp < bot\.maxHp\) \{\n            const allyInNeed = allAlive\.find\(p => p\.id \!\=\= bot\.id && p\.hp < p\.maxHp && \(p\.gender === 'Nam' \|\| \(p\.heroes && p\.heroes\[0\] && p\.heroes\[0\]\.gender === 'Nam'\)\) && \(\!bot\.isDaTam && p\.isRevealed && \!p\.isDaTam && getPlayerFaction\(p\) === getPlayerFaction\(bot\)\)\);/g, 
"includes('Duyên Thơ') && !bot.duyenThoUsedThisTurn && bot.hand.length >= 2 && bot.hp < bot.maxHp) {\n            const allyInNeed = allAlive.find(p => p.id !== bot.id && p.hp < p.maxHp && (p.gender === 'Nam' || (p.heroes && p.heroes[0] && p.heroes[0].gender === 'Nam')) && (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot)));");

fs.writeFileSync('client/src/engine/ai/botLogic.js', content);
