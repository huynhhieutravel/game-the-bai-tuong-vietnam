import { canAttack, getDistance } from '../rangeSystem.js';
import { getPlayerFaction } from '../index.js';
import { getCardSubType } from '../../data/gameData.js';

function getAlivePlayers(state) {
    return state.players.filter(p => p.isAlive);
}

function getEnemyTargets(bot, potentialTargets, allAlive) {
    if (!bot.isRevealed) return [];
    
    let enemies = potentialTargets.filter(t => {
        if (!t.isRevealed) return false;
        if (bot.isDaTam) {
            // Dã Tâm coi tất cả mọi người là kẻ thù
            return t.id !== bot.id;
        } else {
            // Người thường coi Dã Tâm và người khác phe là kẻ thù
            return t.isDaTam || (t.isRevealed && !t.isDaTam && getPlayerFaction(t) !== getPlayerFaction(bot));
        }
    });

    // Tính toán số lượng thành viên còn sống của mỗi phe (tạm liên minh)
    const factionCount = {};
    allAlive.forEach(p => {
        if (!p.isRevealed) return;
        const faction = p.isDaTam ? 'DaTam' : getPlayerFaction(p);
        factionCount[faction] = (factionCount[faction] || 0) + 1;
    });

    // Sắp xếp mục tiêu ưu tiên: 1. Phe có số đông hơn (Tạm liên minh đánh kẻ thù mạnh nhất). 2. Máu thấp (1 HP). 3. Máu yếu hơn.
    enemies.sort((a, b) => {
        const factionA = a.isDaTam ? 'DaTam' : getPlayerFaction(a);
        const factionB = b.isDaTam ? 'DaTam' : getPlayerFaction(b);
        
        const countA = factionCount[factionA] || 0;
        const countB = factionCount[factionB] || 0;
        
        if (countA > countB) return -1;
        if (countA < countB) return 1;

        if (a.hp === 1 && b.hp > 1) return -1;
        if (b.hp === 1 && a.hp > 1) return 1;
        
        return a.hp - b.hp;
    });

    return enemies;
}

function shouldPlayAoE(bot, trickName, alivePlayers) {
   let allyImpact = 0;
   let enemyImpact = 0;
   
   for (const p of alivePlayers) {
       if (p.id === bot.id) continue;
       if (!p.isRevealed) continue;
       
       const isAlly = !bot.isDaTam && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot);
       const isEnemy = bot.isDaTam || p.isDaTam || getPlayerFaction(p) !== getPlayerFaction(bot);
       
       if (trickName === 'Hồi Xuân') {
           if (p.hp < p.maxHp) {
               if (isAlly) allyImpact += 1;
               else if (isEnemy) enemyImpact += 1.5;
           }
        } else {
            // Sát thương AoE (Nam Man, Vạn Tiễn)
            if (isAlly) {
                if (p.hp <= 1) allyImpact -= 10;
                else allyImpact -= 1.5;
            }
            else if (isEnemy) enemyImpact += 1;
        }
    }
    
    if (trickName === 'Hồi Xuân') {
        if (bot.hp < bot.maxHp) allyImpact += 2;
        return allyImpact >= enemyImpact;
    } else {
        return (enemyImpact + allyImpact) > 0;
    }
}

function getAllyTargets(bot, potentialTargets, allAlive) {
    if (!bot.isRevealed) return [];
    return potentialTargets.filter(t => {
        if (!t.isRevealed) return false;
        if (bot.isDaTam) {
            return t.isDaTam;
        } else {
            return !t.isDaTam && getPlayerFaction(t) === getPlayerFaction(bot);
        }
    });
}

// Bot logic return Action
export function getBotAction(gameState, bot) {
    // 1. Phản hồi các Event bị động (React)
    if (gameState.waitingForResponse && gameState.waitingForResponse.type !== 'play_phase') {
        const req = gameState.waitingForResponse;
        
        // --- BẢO VỆ LƯỢT PHẢN HỒI ---
        // Tránh tình trạng Bot "nhanh tay" trả lời thay cho người khác
        let activeActorId = null;
        // === responderId: Nguồn duy nhất xác định Bot nào cần act ===
        activeActorId = req.responderId ?? (req.askQueue && req.askQueue[0]) ?? req.targetId ?? req.sourceId;

        
        if (bot.id !== activeActorId) {
            return null; // Không phải lượt phản hồi của bot này, bỏ qua để nhường người khác
        }
        
        // Bỏ qua play_phase vì nó được xử lý ở block Main Phase bên dưới
        if (req.type === 'play_phase') {
            // Không xử lý ở đây, để logic trôi xuống block Main Phase
        }
        else {
            if (req.type === 'ask_dodge' || req.type === 'dodge' || (req.type === 'aoe_trick' && req.trickType === 'arrows')) {
                const hasBagua = bot.equipment?.some(e => e.name === 'Bát Quái');
                if (hasBagua && req.baguaAvailable !== false) {
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doBagua: true } } };
                }
                const dodgeIdx = bot.hand.findIndex(c => c.name === 'Né');
                if (dodgeIdx >= 0) {
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[dodgeIdx].id, virtualCardName: 'Né' } } };
                }
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
            }
        else if (req.type === 'ask_slash' || req.type === 'duel_slash' || (req.type === 'aoe_trick' && req.trickType === 'barbarian') || req.type === 'borrow_sword') {
            const slashIdx = bot.hand.findIndex(c => c.name === 'Chém');
            if (slashIdx >= 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[slashIdx].id, virtualCardName: 'Chém' } } };
            } else {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: {} } };
            }
        }
        else if (req.type === 'ask_peach' || req.type === 'save') {
            const isSelf = req.dyingId === bot.id || req.targetId === bot.id;
            const target = gameState.players.find(p => p.id === (req.dyingId || req.targetId));
            
            let shouldSave = isSelf;
            if (!isSelf && target && target.isRevealed && bot.isRevealed) {
                if (bot.isDaTam && target.isDaTam) shouldSave = true;
                if (!bot.isDaTam && !target.isDaTam && getPlayerFaction(bot) === getPlayerFaction(target)) shouldSave = true;
            }

            if (shouldSave) {
                const peachIdx = bot.hand.findIndex(c => c.name === 'Đào');
                if (peachIdx >= 0) {
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[peachIdx].id, virtualCardName: 'Đào' } } };
                }
                
                if (isSelf) {
                    const wineIdx = bot.hand.findIndex(c => c.name === 'Rượu');
                    if (wineIdx >= 0) {
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[wineIdx].id } } };
                    }
                }
                
                const hasNamDuoc = bot.heroes?.some(h => h.skills?.some(s => s.id === 'nam-duoc'));
                const isOutsideTurn = gameState.currentPlayerIndex !== bot.id;
                if (hasNamDuoc && isOutsideTurn) {
                    const redIdx = bot.hand.findIndex(c => c.color === 'red');
                    if (redIdx >= 0) {
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[redIdx].id, virtualCardName: 'Đào' } } };
                    }
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', req: req, data: { doReact: false } } };
        }
        else if (req.type === 'ask_negate') {
            const negateIdx = bot.hand.findIndex(c => c.name === 'Hóa Giải');
            if (negateIdx >= 0) {
                const target = gameState.players.find(p => p.id === req.targetId);
                let isTargetAlly = false;
                let isTargetEnemy = false;
                if (target && target.isRevealed && bot.isRevealed) {
                    if (target.id === bot.id) isTargetAlly = true;
                    else if (bot.isDaTam && target.isDaTam) isTargetAlly = true;
                    else if (!bot.isDaTam && !target.isDaTam && getPlayerFaction(bot) === getPlayerFaction(target)) isTargetAlly = true;
                    else isTargetEnemy = true;
                }

                let doNegate = false;
                if (!req.isNegated) {
                    const hurtsTarget = ['van-tien', 'nam-man', 'thuan-thu', 'qua-ha', 'quyet-dau', 'binh-luong', 'lac-bat', 'hoa-cong', 'muon-dao'].includes(req.trickType);
                    const helpsTarget = ['hoi-xuan', 'ngu-coc', 'vo-trung'].includes(req.trickType);
                    if ((hurtsTarget && isTargetAlly) || (helpsTarget && isTargetEnemy)) doNegate = true;
                } else {
                    const hurtsTarget = ['van-tien', 'nam-man', 'thuan-thu', 'qua-ha', 'quyet-dau', 'binh-luong', 'lac-bat', 'hoa-cong', 'muon-dao'].includes(req.trickType);
                    const helpsTarget = ['hoi-xuan', 'ngu-coc', 'vo-trung'].includes(req.trickType);
                    if ((hurtsTarget && isTargetEnemy) || (helpsTarget && isTargetAlly)) doNegate = true;
                }

                if (doNegate) {
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[negateIdx].id, virtualCardName: 'Hóa Giải' } } };
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'draw_phase') {
            return { type: 'ACTION_DRAW_CARDS', payload: { playerId: bot.id } };
        }
        else if (req.type === 'discard_phase') {
            const count = req.amount || 1;
            if (count > 0 && bot.hand.length > 0) {
                const cardsToDiscard = bot.hand.slice(0, count).map(c => c.id);
                return { type: 'ACTION_DISCARD', payload: { playerId: bot.id, cardIds: cardsToDiscard } };
            }
        }
        else if (req.type === 'ask_weapon_skill') {
            const isBotActive = (req.weapon === 'Song Kiếm' && req.targetId === bot.id) || (req.weapon !== 'Song Kiếm' && req.sourceId === bot.id);
            if (isBotActive) {
                if (req.weapon === 'Thanh Long Đao') {
                    const slashIdx = bot.hand.findIndex(c => c.name === 'Chém');
                    if (slashIdx >= 0) {
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, cardIndexes: [slashIdx], equipIndexes: [] } } };
                    }
                } else if (req.weapon === 'Rìu Đá' || req.weapon === 'Quạt Sắt') {
                    if (bot.hand.length >= 2) {
                        const trashIdxs = [];
                        bot.hand.forEach((c, idx) => { if (!['Đào', 'Hóa Giải'].includes(c.name) && trashIdxs.length < 2) trashIdxs.push(idx); });
                        if (trashIdxs.length === 2) {
                            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, cardIndexes: trashIdxs, equipIndexes: [] } } };
                        }
                    }
                } else if (req.weapon === 'Song Kiếm') {
                    if (bot.hand.length >= 1) {
                        const trashIdx = bot.hand.findIndex(c => !['Đào', 'Hóa Giải'].includes(c.name));
                        if (trashIdx >= 0) {
                            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, cardIndexes: [trashIdx], equipIndexes: [] } } };
                        }
                    }
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_uy_chan') {
            // Bot ưu tiên cho rút bài hơn là hồi máu (trừ khi Đinh Bộ Lĩnh sắp chết)
            const sourcePlayer = gameState.players.find(p => p.id === req.sourceId);
            const choice = (sourcePlayer && sourcePlayer.hp <= 1) ? 'heal' : 'draw';
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { choice } } };
        }
        else if (req.type === 'ask_dismantle' || req.type === 'ask_snatch') {
            const target = gameState.players.find(p => p.id === req.targetId);
            if (target) {
                const isAlly = (bot.isDaTam ? false : (!target.isDaTam && getPlayerFaction(target) === getPlayerFaction(bot)));
                if (isAlly) {
                    // Cứu đồng đội: Ưu tiên tháo gỡ khu vực phán xét (Binh Lương, Sấm Sét)
                    if (target.judgementArea && target.judgementArea.length > 0) {
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: target.judgementArea[0].id, zone: 'judge' } } };
                    }
                } else {
                    // Hại kẻ địch: Ưu tiên tháo trang bị hoặc bài trên tay (Tuyệt đối KHÔNG tháo Phán Xét của kẻ thù)
                    if (target.equipment && target.equipment.length > 0) {
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: target.equipment[0].id, zone: 'equip' } } };
                    } else if (target.hand && target.hand.length > 0) {
                        const randIdx = Math.floor(Math.random() * target.hand.length);
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: target.hand[randIdx].id, zone: 'hand' } } };
                    }
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_chuong_duong_discard') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_chuong_duong_move') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_doat_sao_discard') {
            if (bot.hand.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardIndexSelected: 0 } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_da_trach') {
            if (bot.hand.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true, cardIndexSelected: 0 } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doProvide: false } } };
        }
        else if (req.type === 'ask_khoi_nghia') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
        }
        else if (req.type === 'ask_hau_vien') {
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
        else if (req.type === 'ask_hoacong_reveal') {
            if (bot.hand.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doReveal: true, cardIndexSelected: 0 } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doReveal: false } } };
        }
        else if (req.type === 'ask_hoacong_discard') {
            const matchIdx = bot.hand.findIndex(c => c.suit === req.suit);
            if (matchIdx >= 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doDiscard: true, cardIndexSelected: matchIdx } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doDiscard: false } } };
        }
        else if (req.type === 'ask_hoa_tien') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { useSkill: true } } };
        }
        else if (req.type === 'ask_banh_chung') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { orderedCards: req.viewedCards.map(c => c.id), deckTop: req.viewedCards, deckBottom: [] } } };
        }
        else if (req.type === 'ask_tre_nga_discard') {
            const matchIdx = bot.hand.findIndex(c => c.suit === req.suit);
            if (matchIdx >= 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doDiscard: true, cardIndexSelected: matchIdx } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doDiscard: false } } };
        }
        else if (req.type === 'ask_suit') {
            const suits = ['♠', '♣', '♥', '♦'];
            const randomSuit = suits[Math.floor(Math.random() * suits.length)];
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { suit: randomSuit } } };
        }
        else if (req.type === 'ask_nghi_ngo') {
            const doubt = Math.random() < 0.25; // 25% chance to doubt
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doDoubt: doubt } } };
        }
        else if (req.type === 'ask_thuy_to') {
            if (bot.hand.length >= 2) {
                const allies = gameState.players.filter(p => p.id !== bot.id && p.isAlive && (!p.isDaTam && !bot.isDaTam || p.isDaTam === bot.isDaTam));
                if (allies.length > 0) {
                    const randomAlly = allies[Math.floor(Math.random() * allies.length)];
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { selectedAlly: randomAlly.id, selectedCards: [0, 1] } } };
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { canceled: true } } };
        }
        else if (req.type === 'ask_thuy_to_bonus') {
            if (bot.hp < bot.maxHp) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { virtualCardName: 'Đào', targetId: null } } };
            }
            const enemies = gameState.players.filter(p => p.id !== bot.id && p.isAlive && (bot.isDaTam ? !p.isDaTam : p.isDaTam));
            const inRangeEnemies = enemies.filter(e => {
                try { return e.distanceFromMe <= bot.attackRange; } catch(err) { return true; }
            });
            if (inRangeEnemies.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { virtualCardName: 'Chém', targetId: inRangeEnemies[0].id } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { canceled: true } } };
        }
        else if (req.type === 'ask_boc_tram_trung_slash') {
            const hasSlash = bot.hand.find(c => c.name === 'Chém');
            if (hasSlash) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true, cardId: hasSlash.id } } };
            } else {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: false } } };
            }
        }
        else if (req.type === 'ask_boc_tram_trung_dodge') {
            const hasDodge = bot.hand.find(c => c.name === 'Né');
            if (hasDodge) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true, cardId: hasDodge.id } } };
            } else {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: false } } };
            }
        }
        else if (req.type === 'ask_dieu_duoc') {
            const allyInNeed = gameState.players.find(p => p.isAlive && p.hp < p.maxHp && (p.id === bot.id || (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot))));
            if (allyInNeed && bot.hand.length > 0) {
                let discardIdx = bot.hand.findIndex(c => !['Đào', 'Chém', 'Hóa Giải'].includes(c.name));
                if (discardIdx < 0) discardIdx = 0;
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId: allyInNeed.id, cardIndex: discardIdx } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_duyen_tho') {
            const allyInNeed = gameState.players.find(p => p.id !== bot.id && p.isAlive && p.hp < p.maxHp && (p.gender === 'Nam' || (p.heroes && p.heroes[0] && p.heroes[0].gender === 'Nam')) && (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot)));
            if (allyInNeed && bot.hand.length >= 2) {
                const trashIdxs = [];
                bot.hand.forEach((c, idx) => { if (!['Đào', 'Hóa Giải'].includes(c.name) && trashIdxs.length < 2) trashIdxs.push(idx); });
                if (trashIdxs.length === 2) {
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId: allyInNeed.id, cardIndexes: trashIdxs } } };
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_tien_phong') {
            const allAlive = getAlivePlayers(gameState);
            const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && p.id !== req.sourceId), allAlive);
            if (enemies.length > 0) {
                const hasWeapon = bot.equipment?.some(eq => eq.subType === 'weapon');
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, targetId: enemies[0].id, costType: bot.hp > 1 ? 'hp' : 'weapon' } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_tu_chu') {
            const allAlive = getAlivePlayers(gameState);
            const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && p.hp > bot.hp && p.hand.length > 0), allAlive);
            if (enemies.length > 0 && bot.hand.length > 0) {
                const maxCardIdx = bot.hand.reduce((maxIdx, card, idx, arr) => {
                    const rankToNum = { 'A':14, 'K':13, 'Q':12, 'J':11 };
                    const getVal = r => rankToNum[r] || parseInt(r) || 0;
                    return getVal(card.rank) > getVal(arr[maxIdx].rank) ? idx : maxIdx;
                }, 0);
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, targetId: enemies[0].id, cardIdx: maxCardIdx } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_tam_cong') {
            const allAlive = getAlivePlayers(gameState);
            const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && p.hand.length > 0), allAlive);
            if (enemies.length > 0 && bot.hand.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId: enemies[0].id, cardIndexSelected: 0 } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        
        else if (req.type === 'ask_van_don') {
            const randIdx = Math.floor(Math.random() * bot.hand.length);
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId: req.sourceId, cardIndex: randIdx } } };
        }
        else if (req.type === 'ask_khai_quoc' || req.type === 'ask_tien_phat') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_nam_quoc_son_ha') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true } } };
        }
        else if (req.type === 'ask_weapon_skill' && req.weapon === 'Thanh Long Đao') {
            const slashIdx = bot.hand.findIndex(c => c.name === 'Chém');
            if (slashIdx >= 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[slashIdx].id, virtualCardName: 'Chém' } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        
        // Mặc định (Universal Fallback): Nếu có bất kỳ Event `ask_` nào chưa được code logic AI,
        // Bot sẽ tự động trả về lệnh Hủy/Bỏ qua thay vì im lặng gây Deadlock.
        console.warn(`[BOT AI] Unhandled request type: ${req.type}. Kích hoạt Universal Fallback (Bỏ qua).`);
        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', req: req, data: { canceled: true, doReact: false, doUse: false, doProvide: false } } };
        }
    }
    
    // 2. Main Phase (Action Queue rỗng, đang ở play_phase)
    if (gameState.currentPhase === 'action') {
        const allAlive = getAlivePlayers(gameState);
        
        // Bot tự động lật tướng nếu chưa lật hết
        if (bot.revealedHeroes && bot.revealedHeroes.includes(false)) {
            const unrevealedIdx = bot.revealedHeroes.findIndex(r => r === false);
            return { type: 'ACTION_REVEAL_HERO', payload: { playerId: bot.id, heroIndex: unrevealedIdx } };
        }

        // Kích hoạt các kỹ năng Tướng Chủ Động (Active Skills)
        const activeSkills = bot.heroes?.flatMap((h, i) => bot.revealedHeroes[i] ? (h.skills || []) : []).map(s => s.name) || [];
        
        if (activeSkills.includes('Diệu Dược') && !bot.dieuDuocUsedThisTurn && bot.hand.length > 0) {
            const allyInNeed = allAlive.find(p => p.hp < p.maxHp && (p.id === bot.id || (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot))));
            if (allyInNeed) {
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'dieu-duoc', targets: [allyInNeed.id] } };
            }
        }
        // Định Quốc check (dynamic injection since it depends on allies)
        if (getPlayerFaction(bot) === 'Sơn' && !bot.dinhQuocUsedThisTurn && bot.hand.length > 0) {
            const hasDinhQuocAlly = allAlive.find(p => p.id !== bot.id && p.hp < p.maxHp && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.id === 'dinh-quoc')));
            if (hasDinhQuocAlly) {
                bot.dinhQuocUsedThisTurn = true;
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'dinh-quoc', targets: [hasDinhQuocAlly.id], options: { cardIdx: bot.hand.length - 1 } } };
            }
        }

        if (activeSkills.includes('Duyên Thơ') && !bot.duyenThoUsedThisTurn && bot.hand.length >= 2 && bot.hp < bot.maxHp) {
            const allyInNeed = allAlive.find(p => p.id !== bot.id && p.hp < p.maxHp && (p.gender === 'Nam' || (p.heroes && p.heroes[0] && p.heroes[0].gender === 'Nam')) && (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot)));
            
            const trashIdxs = [];
            bot.hand.forEach((c, idx) => { if (!['Đào', 'Hóa Giải'].includes(c.name) && trashIdxs.length < 2) trashIdxs.push(idx); });
            
            if (allyInNeed && trashIdxs.length === 2) {
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'duyen-tho', targets: [allyInNeed.id] } };
            }
        }
        if (activeSkills.includes('Tiên Phong') && !bot.tienPhongUsedThisTurn) {
            const hasWeapon = bot.equipment.some(eq => getCardSubType(eq) === 'Vũ khí');
            if (bot.hp > 1 || hasWeapon) {
                const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id), allAlive);
                if (enemies.length > 0) {
                    return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'tien-phong', targets: [enemies[0].id] } };
                }
            }
        }
        if (activeSkills.includes('Tự Chủ') && !bot.tuChuUsedThisTurn && bot.hand.length > 0) {
            const validTargets = allAlive.filter(p => p.id !== bot.id && p.hp > bot.hp && p.hand.length > 0);
            const enemyTargets = getEnemyTargets(bot, validTargets, allAlive);
            if (enemyTargets.length > 0) {
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'tu-chu', targets: [enemyTargets[0].id] } };
            }
        }
        if (activeSkills.includes('Tâm Công') && !bot.tamCongUsedThisTurn && bot.hand.length > 0) {
            const validTargets = allAlive.filter(p => p.id !== bot.id && p.hand.length > 0);
            const enemyTargets = getEnemyTargets(bot, validTargets, allAlive);
            if (enemyTargets.length > 0) {
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'tam-cong', targets: [enemyTargets[0].id] } };
            }
        }
        // Bot tự động mặc mọi trang bị trên tay
        const equipIdx = bot.hand.findIndex(c => c.type === 'equip' || c.type === 'Trang bị');
        if (equipIdx >= 0) {
            const equipCard = bot.hand[equipIdx];
            let shouldEquip = true;
            
            if (getCardSubType(equipCard) === 'Vũ khí') {
                const currentWeapon = bot.equipment.find(e => getCardSubType(e) === 'Vũ khí');
                if (currentWeapon && ['Thanh Long Đao', 'Rìu Đá', 'Song Kiếm'].includes(currentWeapon.name) && currentWeapon.range >= equipCard.range) {
                    shouldEquip = false;
                }
            }
            
            if (shouldEquip) {
                return { type: 'ACTION_PLAY_CARD', payload: { playerId: bot.id, cardId: equipCard.id, targets: [], virtualCardName: equipCard.name } };
            }
        }
        
        // Thử đánh Cẩm nang (Trick)
        const tricks = bot.hand.filter(c => c.type === 'Cẩm nang' || c.type === 'trick');
        for (let trick of tricks) {
            let targets = [];
            let canPlay = false;
            
            if (trick.name === 'Cướp Bài' || trick.name === 'Tước Bài' || trick.name === 'Quyết Đấu') {
                const hasTienDuyen = bot.heroes?.some((h, i) => bot.revealedHeroes && bot.revealedHeroes[i] && h.skills?.some(s => s.id === 'tien-duyen-passive'));
                const validTargets = allAlive.filter(p => {
                    if (p.id === bot.id) return false;
                    if (trick.name === 'Quyết Đấu') return true;
                    
                    const hasCards = p.hand.length > 0 || p.equipment.length > 0 || (p.judgementArea && p.judgementArea.length > 0);
                    if (!hasCards) return false;
                    
                    if (trick.name === 'Cướp Bài') return hasTienDuyen || getDistance(gameState, bot.id, p.id) <= 1;
                    return true;
                });
                
                // Nếu là Tước Bài, kiểm tra xem có đồng đội nào đang dính Binh Lương/Sấm Sét không để cứu
                if (trick.name === 'Tước Bài') {
                    const allies = getAllyTargets(bot, validTargets, allAlive);
                    const allyInNeed = allies.find(p => p.judgementArea && p.judgementArea.some(c => c.name === 'Binh Lương Thốn Đoạn' || c.name === 'Sấm Sét'));
                    if (allyInNeed) {
                        targets = [allyInNeed.id];
                        canPlay = true;
                    }
                }
                
                // Nếu không cứu ai, thì đánh kẻ thù
                if (!canPlay) {
                    const enemies = getEnemyTargets(bot, validTargets, allAlive);
                    if (enemies.length > 0) {
                        targets = [enemies[0].id];
                        canPlay = true;
                    }
                }
            }
            else if (trick.name === 'Hỏa Công') {
                const validTargets = allAlive.filter(p => p.hand.length > 0);
                const enemies = getEnemyTargets(bot, validTargets, allAlive);
                if (enemies.length > 0) {
                    targets = [enemies[0].id];
                    canPlay = true;
                }
            }
            else if (trick.name === 'Mượn Đao') {
                const enemiesWithWeapon = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && p.equipment.some(e => e.subType === 'Vũ khí' || e.type === 'Vũ khí' || e.type === 'equip_weapon')), allAlive);
                if (enemiesWithWeapon.length > 0) {
                    const targetA = enemiesWithWeapon[0];
                    const validB = allAlive.filter(p => p.id !== targetA.id && canAttack(gameState, targetA.id, p.id));
                    const enemiesOfBot = getEnemyTargets(bot, validB, allAlive);
                    if (enemiesOfBot.length > 0) {
                        targets = [targetA.id, enemiesOfBot[0].id];
                        canPlay = true;
                    }
                }
            }
            else if (trick.name === 'Dã Man' || trick.name === 'Loạn Tiễn' || trick.name === 'Đào Viên Kết Nghĩa' || trick.name === 'Ngũ Cốc Phong Đăng' || trick.name === 'Hồi Xuân') {
                if (trick.name === 'Ngũ Cốc Phong Đăng' || shouldPlayAoE(bot, trick.name, allAlive)) {
                    targets = [];
                    canPlay = true;
                }
            }
            else if (trick.name === 'Sấm Sét' || trick.name === 'Vô Trung Sinh Hữu') {
                targets = [bot.id];
                canPlay = true;
            }
            else if (trick.name === 'Hỗn Loạn' || trick.name === 'Binh Lương Thốn Đoạn') {
                const validTargets = allAlive.filter(p => {
                    if (p.id === bot.id) return false;
                    if (p.judgementArea && p.judgementArea.some(c => c.name === trick.name)) return false;
                    
                    const hasTienDuyen = bot.heroes?.some((h, i) => bot.revealedHeroes && bot.revealedHeroes[i] && h.skills?.some(s => s.id === 'tien-duyen-passive'));
                    if (trick.name === 'Binh Lương Thốn Đoạn') return hasTienDuyen || getDistance(gameState, bot.id, p.id) <= 1;
                    return true;
                });
                const enemies = getEnemyTargets(bot, validTargets, allAlive);
                if (enemies.length > 0) {
                    targets = [enemies[0].id];
                    canPlay = true;
                }
            }
            else if (trick.name === 'Xiềng Xích') {
                const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && !p.isChained), allAlive);
                if (enemies.length >= 2) {
                    targets = [enemies[0].id, enemies[1].id];
                    canPlay = true;
                } else if (enemies.length === 1) {
                    targets = [enemies[0].id];
                    canPlay = true;
                }
            }
            
            if (canPlay) {
                return { 
                    type: 'ACTION_PLAY_CARD', 
                    payload: { playerId: bot.id, cardId: trick.id, targets: targets, virtualCardName: trick.name } 
                };
            }
        }
        
        // Đánh Đào (nếu máu chưa đầy)
        if (bot.hp < bot.maxHp) {
            const peachIdx = bot.hand.findIndex(c => c.name === 'Đào');
            if (peachIdx >= 0) {
                return { 
                    type: 'ACTION_PLAY_CARD', 
                    payload: { playerId: bot.id, cardId: bot.hand[peachIdx].id, targets: [bot.id], virtualCardName: 'Đào' } 
                };
            }
        }

        // Đánh Chém
        const limit = (bot.equipment?.some(eq => eq.name === 'Liên Nỏ') || bot.usedNhiepChinh) ? Infinity : 1;
        if ((bot.attackCountThisTurn || 0) < limit) {
            const attackIdx = bot.hand.findIndex(c => c.name === 'Chém');
            if (attackIdx >= 0) {
                const slashCardId = bot.hand[attackIdx].id;
                let validTargets = allAlive.filter(p => p.id !== bot.id && canAttack(gameState, bot.id, p.id, slashCardId));
                const enemies = getEnemyTargets(bot, validTargets, allAlive);
                if (enemies.length > 0) {
                    // Bot ưu tiên uống Rượu trước khi Chém nếu chưa uống
                    if (!bot.drankWineThisTurn) {
                        const wineIdx = bot.hand.findIndex(c => c.name === 'Rượu');
                        if (wineIdx >= 0) {
                            return { 
                                type: 'ACTION_PLAY_CARD', 
                                payload: { playerId: bot.id, cardId: bot.hand[wineIdx].id, targets: [bot.id], virtualCardName: 'Rượu' } 
                            };
                        }
                    }

                    return { 
                        type: 'ACTION_PLAY_CARD', 
                        payload: { playerId: bot.id, cardId: slashCardId, targets: [enemies[0].id], virtualCardName: 'Chém' } 
                    };
                }
            }
        }
        
        // Không đánh được gì nữa -> End Phase
        return { type: 'ACTION_END_PHASE', payload: { playerId: bot.id } };
    }
    
    return null;
}
