import { canAttack, getDistance, getAttackRange } from '../rangeSystem.js';
import { getPlayerFaction, getPlayerGender, hasSkillEvenIfHidden } from '../gameState.js';
import { getCardSubType } from '../../data/gameData.js';
import { getAvailableTargets } from '../rules/TargetResolver.js';

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
                const activeSkills = bot.skills ? bot.skills.map(s => s.name) : [];
                const hasThanGiap = activeSkills.includes('Thần Giáp');
                const hasPassiveBagua = hasThanGiap && !bot.equipment?.some(c => c.name === 'Bát Quái' || c.name === 'Hắc Thuẫn');
                const hasBagua = hasPassiveBagua || bot.equipment?.some(e => e.name === 'Bát Quái');
                if (hasBagua && req.baguaAvailable !== false) {
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doBagua: true } } };
                }
                
                const hasThinhChinh = bot.skills ? bot.skills.some(s => s.id === 'nhiep-chinh-2') : false;
                const hasDoiNui = activeSkills.includes('Dời Núi');
                
                const validDodges = bot.hand.filter(c => c.name === 'Né' || (hasThinhChinh && c.color === 'black') || (hasDoiNui && c.name === 'Chém'));
                if (validDodges.length >= (req.reqDodges || 1)) {
                    const dodgeIdx = bot.hand.findIndex(c => c.name === 'Né' || (hasThinhChinh && c.color === 'black') || (hasDoiNui && c.name === 'Chém'));
                    if (dodgeIdx >= 0) {
                        const chosenCard = bot.hand[dodgeIdx];
                        const activeSkill = (hasThinhChinh && chosenCard.name !== 'Né' && chosenCard.color === 'black') ? 'nhiep-chinh-2' : undefined;
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: chosenCard.id, virtualCardName: 'Né', activeSkill } } };
                    }
                }
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
            }
        else if (req.type === 'ask_slash' || req.type === 'duel_slash' || (req.type === 'aoe_trick' && req.trickType === 'barbarian') || req.type === 'borrow_sword') {
            const activeSkills = bot.skills ? bot.skills.map(s => s.name) : [];
            const hasDoiNui = activeSkills.includes('Dời Núi');
            const hasKhaiThien = activeSkills.includes('Khai Thiên');
            const numSlashes = bot.hand.filter(c => c.name === 'Chém' || (hasDoiNui && c.name === 'Né') || (hasKhaiThien && c.name !== 'Chém' && c.color === 'red')).length;
            console.log(`[DEBUG_BOT] Player ${bot.id} responding to ${req.type}. numSlashes=${numSlashes}, handSize=${bot.hand.length}, hasKhaiThien=${hasKhaiThien}`);
            if (numSlashes >= (req.reqSlashes || 1)) {
                const slashIdx = bot.hand.findIndex(c => c.name === 'Chém' || (hasDoiNui && c.name === 'Né') || (hasKhaiThien && c.name !== 'Chém' && c.color === 'red'));
                if (slashIdx >= 0) {
                    const chosenCard = bot.hand[slashIdx];
                    console.log(`[DEBUG_BOT] Player ${bot.id} chose ${chosenCard.id} from hand!`);
                    const activeSkill = (hasKhaiThien && chosenCard.name !== 'Chém' && chosenCard.color === 'red') ? 'khai-thien' : undefined;
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: chosenCard.id, virtualCardName: 'Chém', activeSkill } } };
                }
            }
            console.log(`[DEBUG_BOT] Player ${bot.id} SKIPS ${req.type}.`);
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: {} } };
        }
        else if (req.type === 'ask_peach' || req.type === 'save') {
            // req.targetId is the responder in ask_peach, so we MUST only use dyingId to check if it's self
            const isSelf = req.dyingId === bot.id;
            const target = gameState.players.find(p => p.id === req.dyingId);
            
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
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: bot.hand[redIdx].id, virtualCardName: 'Đào', activeSkill: 'nam-duoc' } } };
                    }
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', req: req, data: { doReact: false } } };
        }

        else if (req.type === 'ask_thiet_ve') {
            const trashIdx = bot.hand.findIndex(c => !['Đào', 'Hóa Giải', 'Chém', 'Né'].includes(c.name));
            if (trashIdx >= 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { canceled: false, cardIndexSelected: trashIdx } } };
            } else if (bot.hand.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { canceled: false, cardIndexSelected: 0 } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { canceled: true } } };
        }
        else if (req.type === 'ask_negate') {
            const activeSkills = bot.skills ? bot.skills.map(s => s.name) : [];
            const hasLinhGiam = activeSkills.includes('Linh Giám');
            const negateIdx = bot.hand.findIndex(c => c.name === 'Hóa Giải' || (hasLinhGiam && c.color === 'black'));
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
                    const chosenCard = bot.hand[negateIdx];
                    const activeSkill = (hasLinhGiam && chosenCard.name !== 'Hóa Giải' && chosenCard.color === 'black') ? 'linh-giam' : undefined;
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardId: chosenCard.id, virtualCardName: 'Hóa Giải', activeSkill } } };
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_can_gian') {
            // Can Gián: mất 1 HP để giúp tướng vừa mất bài rút 2 lá.
            // Bot sẽ dùng nếu HP > 1 (không mạo hiểm chết)
            if (bot.hp > 1) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_hien_hau') {
            // Hiền Hậu: bỏ 1 lá Cơ để ngăn sát thương và chọn hiệu ứng.
            const victim = gameState.players.find(p => p.id === req.damageEventPayload.targetId);
            let isAlly = false;
            if (victim && victim.isRevealed && bot.isRevealed) {
                if (victim.id === bot.id) isAlly = true;
                else if (bot.isDaTam && victim.isDaTam) isAlly = true;
                else if (!bot.isDaTam && !victim.isDaTam && getPlayerFaction(bot) === getPlayerFaction(victim)) isAlly = true;
            }
            if (isAlly) {
                const hasQuocSac = hasSkillEvenIfHidden(bot, 'quoc-sac');
                const heartCardIdx = bot.hand.findIndex(c => c.suit === 'heart' || (hasQuocSac && c.suit === 'spade'));
                if (heartCardIdx >= 0) {
                    // Tìm một kẻ thù làm mục tiêu cho Hiền Hậu
                    const validTargets = gameState.players.filter(p => p.id !== bot.id && p.isAlive);
                    const enemyTarget = validTargets.find(p => {
                        if (!p.isRevealed) return false;
                        if (p.isDaTam || bot.isDaTam) return true;
                        return getPlayerFaction(p) !== getPlayerFaction(bot);
                    }) || validTargets[0];
                    if (enemyTarget) {
                        return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true, targetId: enemyTarget.id, cardId: bot.hand[heartCardIdx].id, option: 1 } } };
                    }
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doProvide: false } } };
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
        else if (req.type === 'ask_doat_sao') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
        }
        else if (req.type === 'ask_doat_sao_discard') {
            if (bot.hand.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardIndexSelected: 0 } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_da_trach') {
            // Dạ Trạch: Chọn tối đa 2 kẻ địch để cướp bài
            const enemies = gameState.players.filter(p => p.id !== bot.id && p.isAlive && p.hand.length > 0 && (bot.isDaTam || (!p.isDaTam && p.isRevealed && getPlayerFaction(p) !== getPlayerFaction(bot))));
            if (enemies.length > 0) {
                // Randomly select up to 2 enemies
                const shuffled = enemies.sort(() => 0.5 - Math.random());
                const selectedEnemies = shuffled.slice(0, 2);
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, targets: selectedEnemies.map(e => e.id) } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_khoi_nghia') {
            const hasSlashOrDuel = bot.hand.some(c => c.name === 'Chém' || c.name === 'Quyết Đấu');
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: hasSlashOrDuel ? 'play' : 'cancel', data: { doUse: hasSlashOrDuel } } };
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
        else if (req.type === 'ask_phat_tam') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
        }
        else if (req.type === 'ask_hoa_nghi') {
            if (req.drawnCards && req.drawnCards.length > 0) {
                const distribution = req.drawnCards.map(c => ({ cardId: c.id, targetId: bot.id }));
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true, distribution } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doProvide: false } } };
        }
        else if (req.type === 'ask_doi_su') {
            const source = gameState.players.find(p => p.id === req.damageSourceId);
            const isEnemy = source && (!source.isRevealed || bot.role !== source.role);
            if (isEnemy && (source.hand.length > 0 || source.equipment.length > 0)) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
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
            const matchIdx = bot.hand.findIndex(c => c.suit === req.judgeSuit);
            if (matchIdx >= 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doDiscard: true, cardIndexSelected: matchIdx } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doDiscard: false } } };
        }
        else if (req.type === 'ask_suit') {
            const suits = ['spade', 'club', 'heart', 'diamond'];
            const randomSuit = suits[Math.floor(Math.random() * suits.length)];
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { suit: randomSuit } } };
        }
        else if (req.type === 'ask_nghi_ngo') {
            const doubt = Math.random() < 0.25; // 25% chance to doubt
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doDoubt: doubt } } };
        }
        else if (req.type === 'ask_thuy_to') {
            if (bot.hand.length >= 2) {
                const allies = gameState.players.filter(p => p.id !== bot.id && p.isAlive && (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot)));
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
            const enemies = gameState.players.filter(p => p.id !== bot.id && p.isAlive && (bot.isDaTam || (!p.isDaTam && p.isRevealed && getPlayerFaction(p) !== getPlayerFaction(bot))));
            const inRangeEnemies = enemies.filter(e => {
                try { return e.distanceFromMe <= bot.attackRange; } catch(err) { return true; }
            });
            if (inRangeEnemies.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { virtualCardName: 'Chém', targetId: inRangeEnemies[0].id } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { canceled: true } } };
        }
        else if (req.type === 'ask_boc_tram_trung_slash') {
            const hasDoiNui = bot.skills ? bot.skills.some(s => s.id === 'doi-nui') : false;
            const hasKhaiThien = bot.skills ? bot.skills.some(s => s.id === 'khai-thien') : false;
            
            const hasSlash = bot.hand.find(c => c.name === 'Chém' || (hasDoiNui && c.name === 'Né') || (hasKhaiThien && c.name !== 'Chém' && c.color === 'red'));
            if (hasSlash) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true, cardId: hasSlash.id } } };
            } else {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: false } } };
            }
        }
        else if (req.type === 'ask_boc_tram_trung_dodge') {
            const hasDoiNui = bot.skills ? bot.skills.some(s => s.id === 'doi-nui') : false;
            const hasThinhChinh = bot.skills ? bot.skills.some(s => s.id === 'nhiep-chinh-2') : false;
            
            const hasDodge = bot.hand.find(c => c.name === 'Né' || (hasThinhChinh && c.color === 'black') || (hasDoiNui && c.name === 'Chém'));
            if (hasDodge) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true, cardId: hasDodge.id } } };
            } else {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: false } } };
            }
        }
        else if (req.type === 'ask_phat_toi') {
            const enemies = gameState.players.filter(p => p.isAlive).filter(p => p.id !== bot.id && (getPlayerFaction(p) !== getPlayerFaction(bot) || bot.isDaTam));
            if (enemies.length > 0) {
                // Ưu tiên kẻ tấn công nếu là địch
                let targetIdToPunish = enemies[0].id;
                if (enemies.some(e => e.id === req.targetId)) {
                    targetIdToPunish = req.targetId;
                }
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId: targetIdToPunish } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { targetId: null } } };
        }
        else if (req.type === 'ask_change_judge') {
            const isQuanCo = req.skills.includes('quan-co');
            const targetPlayer = gameState.players.find(p => p.id === req.targetId);
            const isAlly = targetPlayer && (!bot.isDaTam && !targetPlayer.isDaTam && getPlayerFaction(targetPlayer) === getPlayerFaction(bot));
            
            const validCards = bot.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
                return (!isQuanCo || req.skills.length > 1) || c.color === 'black';
            });
            
            if (validCards.length > 0) {
                let cardToPlay = null;
                if (req.reason === 'sam-set') {
                    if (isAlly) {
                         cardToPlay = validCards.find(c => !(c.suit === 'spade' && (c.rank >= 2 && c.rank <= 9)));
                    } else {
                         cardToPlay = validCards.find(c => c.suit === 'spade' && (c.rank >= 2 && c.rank <= 9));
                    }
                } else if (req.reason === 'bat-quai') {
                    if (isAlly) cardToPlay = validCards.find(c => c.color === 'red');
                    else cardToPlay = validCards.find(c => c.color === 'black');
                } else if (req.reason === 'binh-luong') {
                    if (isAlly) cardToPlay = validCards.find(c => c.suit === 'club');
                    else cardToPlay = validCards.find(c => c.suit !== 'club');
                } else if (req.reason === 'pha-thanh') {
                    if (isAlly) cardToPlay = validCards.find(c => c.suit === 'heart'); // heart fails
                    else cardToPlay = validCards.find(c => c.suit !== 'heart'); // takes effect
                }
                
                if (cardToPlay) {
                    return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doReact: true, cardIndexSelected: cardToPlay.idx, cardId: cardToPlay.id, skillId: req.skills[0] } } };
                }
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doReact: false } } };
        }
        else if (req.type === 'ask_an_bang') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
        }
        else if (req.type === 'ask_hoa_than') {
            const males = gameState.players.filter(p => p.isAlive && p.id !== bot.id && (getPlayerGender(p) === 'Nam' || getPlayerGender(p) === 'Male'));
            if (males.length >= 2 && bot.hand.length > 0) {
                const enemies = males.filter(p => getPlayerFaction(p) !== getPlayerFaction(bot) || bot.isDaTam);
                let targetA, targetB;
                if (enemies.length >= 2) { targetA = enemies[0]; targetB = enemies[1]; }
                else if (enemies.length === 1) { targetA = enemies[0]; targetB = males.find(p => p.id !== targetA.id); }
                else { targetA = males[0]; targetB = males[1]; }
                let discardIdx = bot.hand.findIndex(c => !['Đào', 'Chém', 'Hóa Giải'].includes(c.name));
                if (discardIdx < 0) discardIdx = 0;
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetA: targetA.id, targetB: targetB.id, cardIndex: discardIdx } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_hoa_than_an_tu') {
            const validTargets = gameState.players.filter(p => p.id !== bot.id && p.isAlive && (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Hỗn Loạn' || c.virtualName === 'hon-loan')));
            const validCards = bot.hand.map((c, i) => ({...c, idx: i})).filter(c => c.suit === 'diamond' || c.suit === 'Rô' || c.suit === 'rô');
            const enemies = validTargets.filter(p => getPlayerFaction(p) !== getPlayerFaction(bot) || bot.isDaTam);
            if (enemies.length > 0 && validCards.length > 0) {
                // target enemy with most cards/highest HP
                const target = enemies.sort((a,b) => (b.hand.length + b.hp) - (a.hand.length + a.hp))[0];
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId: target.id, cardFrom: 'hand', cardIndex: validCards[0].idx } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_xa_than') {
            const enemies = getEnemyTargets(bot, gameState.players.filter(p => p.id !== bot.id && p.isAlive), gameState.players);
            if (enemies.length > 0 && bot.hand.length > 0) {
                // Find enemy in attack range
                const inRangeEnemies = enemies.filter(p => {
                    try { return p.distanceFromMe <= bot.attackRange; } catch(e) { return true; }
                });
                const target = inRangeEnemies.length > 0 ? inRangeEnemies[0] : enemies[0];
                let discardIdx = bot.hand.findIndex(c => !['Đào', 'Hóa Giải', 'Chém', 'Né'].includes(c.name));
                if (discardIdx < 0) discardIdx = 0;
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doProvide: true, targetId: target.id, cardId: bot.hand[discardIdx].id } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
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
            const allyInNeed = gameState.players.find(p => p.id !== bot.id && p.isAlive && p.hp < p.maxHp && (getPlayerGender(p) === 'Nam' || getPlayerGender(p) === 'Male') && (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot)));
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
        else if (req.type === 'ask_binh_loan') {
            const suits = {};
            let selectedIdxs = null;
            for (let i = 0; i < bot.hand.length; i++) {
                const c = bot.hand[i];
                if (!suits[c.suit]) suits[c.suit] = [];
                suits[c.suit].push(i);
                if (suits[c.suit].length >= 2) {
                    selectedIdxs = suits[c.suit].slice(0, 2);
                    break;
                }
            }
            if (selectedIdxs) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { cardIndexes: selectedIdxs } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_tam_cong') {
            const allAlive = getAlivePlayers(gameState);
            const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && p.hand.length > 0), allAlive);
            if (enemies.length > 0 && bot.hand.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId: enemies[0].id, cardIndexSelected: 0 } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_tu_chu_target') {
            const duelTarget = gameState.players.find(p => p.id === req.duelTargetId);
            const allAlive = getAlivePlayers(gameState);
            const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== duelTarget.id), allAlive);
            // Tự Chủ bắt duelTarget gây sát thương lên ai đó trong tầm đánh của duelTarget
            const inRangeEnemies = enemies.filter(e => getDistance(gameState, duelTarget.id, e.id) <= getAttackRange(gameState, duelTarget.id));
            if (inRangeEnemies.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId: inRangeEnemies[0].id } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_khoan_dan') {
            const allAlive = getAlivePlayers(gameState);
            const allies = getAllyTargets(bot, allAlive, allAlive);
            let bestAlly = null;
            let maxCardsGained = 0;
            allies.forEach(ally => {
                const targetLimit = Math.min(ally.maxHp, 5);
                const gained = targetLimit - ally.hand.length;
                if (gained > maxCardsGained) { maxCardsGained = gained; bestAlly = ally; }
            });
            if (bestAlly && maxCardsGained > 0) return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, targetId: bestAlly.id } } };
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        else if (req.type === 'ask_duong_quan') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel', data: { doUse: false } } };
        }
        
        else if (req.type === 'ask_van_don') {
            // Pick an enemy with cards in hand
            const enemies = gameState.players.filter(p => p.id !== bot.id && p.isAlive && p.hand.length > 0 && p.role !== bot.role);
            if (enemies.length === 0) return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
            const targetId = enemies[0].id;
            // Pick highest rank card
            let maxRank = -1;
            let cardIndex = 0;
            const rankToNum = { 'A':14, 'K':13, 'Q':12, 'J':11, '10':10, '9':9, '8':8, '7':7, '6':6, '5':5, '4':4, '3':3, '2':2 };
            bot.hand.forEach((c, idx) => {
                const r = rankToNum[c.rank] || 0;
                if (r > maxRank) { maxRank = r; cardIndex = idx; }
            });
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { targetId, cardIndex } } };
        }
        else if (req.type === 'ask_tien_phat') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_hien_ke') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', doUse: true } };
        }
        else if (req.type === 'ask_nam_quoc_son_ha') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
        }
        
        else if (req.type === 'ask_khai_quoc') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doDraw: bot.hand.length < 3 } } };
        }
        else if (req.type === 'ask_quan_co' || req.type === 'ask_quan_co_draw') {
            const validCards = bot.hand.map((c, idx) => ({ ...c, idx })).filter(c => c.color === 'black');
            if (validCards.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doReact: true, cardIndexSelected: validCards[0].idx, cardId: validCards[0].id } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_ho_gia') {
            const allies = gameState.players.filter(p => p.isAlive && p.id !== bot.id && getPlayerFaction(p) === 'Sơn' && p.hand.length > 0);
            if (allies.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_that_tram_so') {
            const enemies = getEnemyTargets(bot, getAlivePlayers(gameState).filter(p => p.id !== bot.id), getAlivePlayers(gameState));
            if (enemies.length > 0 && bot.hand.length > 0) {
                const discardIdx = bot.hand.findIndex(c => !['Đào', 'Chém', 'Hóa Giải'].includes(c.name));
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, targetId: enemies[0].id, cardIndexSelected: Math.max(0, discardIdx) } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_that_tram_so_punish') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { choice: bot.hp > 1 ? 'hp' : 'hero' } } };
        }
        else if (req.type === 'ask_ho_chu') {
            const target = gameState.players.find(p => p.id === req.targetId);
            if (target && !bot.isDaTam && getPlayerFaction(target) === getPlayerFaction(bot) && target.isKing && bot.hp > 1) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }

        else if (req.type === 'ask_xuan_huong') {
            const enemies = getEnemyTargets(bot, getAlivePlayers(gameState).filter(p => p.id !== bot.id), getAlivePlayers(gameState));
            if (enemies.length > 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, targetId: enemies[0].id } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_dam_bac') {
            if (bot.hand.length >= 2) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, cardIndexes: [0, 1] } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_pha_thanh') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true } } };
        }
        else if (req.type === 'ask_trung_dung') {
            const trashIdx = bot.hand.findIndex(c => !['Đào', 'Chém', 'Hóa Giải', 'Né'].includes(c.name));
            if (trashIdx >= 0) {
                return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doUse: true, declaredCard: 'Chém', cardIndex: trashIdx } } };
            }
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'cancel' } };
        }
        else if (req.type === 'ask_perfect_pair') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { usePair: true } } };
        }
        else if (req.type === 'ask_reveal_for_skill') {
            return { type: 'ACTION_REACT', payload: { playerId: bot.id, responseType: 'play', data: { doReveal: true } } };
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
        
        if (activeSkills.includes('Trung Dũng') && !bot.trungDungUsedThisTurn && bot.hand.length > 0) {
            const trashIdx = bot.hand.findIndex(c => !['Đào', 'Chém', 'Hóa Giải', 'Né'].includes(c.name));
            if (trashIdx >= 0) {
                bot.trungDungUsedThisTurn = true;
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'trung-dung', targets: [], options: { declaredCard: 'Chém', cardIndex: trashIdx } } };
            }
        }
        if (activeSkills.includes('Phạt Tội') && !bot.phatToiUsedThisTurn) {
            const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id), allAlive);
            if (enemies.length > 0) {
                bot.phatToiUsedThisTurn = true;
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'phat-toi', targets: [enemies[0].id] } };
            }
        }
        if (activeSkills.includes('Khởi Nghĩa') && !bot.khoiNghiaUsedThisTurn) {
            const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id), allAlive);
            if (enemies.length > 0) {
                bot.khoiNghiaUsedThisTurn = true;
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'khoi-nghia', targets: [] } };
            }
        }
        if (activeSkills.includes('Chương Dương') && !bot.chuongDuongUsedThisTurn) {
            const enemiesWithCards = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && p.hand.length > 0), allAlive);
            if (enemiesWithCards.length > 0) {
                bot.chuongDuongUsedThisTurn = true;
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'chuong-duong', targets: [enemiesWithCards[0].id] } };
            }
        }
        if (activeSkills.includes('Đoạt Sáo') && !bot.doatSaoUsedThisTurn) {
            const enemiesWithCards = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && p.equipment.length > 0), allAlive);
            if (enemiesWithCards.length > 0) {
                bot.doatSaoUsedThisTurn = true;
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'doat-sao', targets: [enemiesWithCards[0].id] } };
            }
        }

        if (activeSkills.includes('Hòa Thân') && !bot.hoaThanUsedThisTurn && bot.hand.length > 0) {
            // Check if it's the old Hoa Than (Huyền Trân) or new Hoa Than (An Tư)
            const hasAnTuSkill = bot.skills?.includes('hoa-than-an-tu') || bot.heroes?.some(h => h.skillIds?.includes('hoa-than-an-tu'));
            if (hasAnTuSkill) {
                const hasDiamond = bot.hand.some(c => c.suit === 'diamond' || c.suit === 'Rô' || c.suit === 'rô');
                const validEnemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Hỗn Loạn' || c.virtualName === 'hon-loan'))), allAlive);
                if (hasDiamond && validEnemies.length > 0) {
                    return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'hoa-than-an-tu', targets: [] } };
                }
            } else {
                const males = allAlive.filter(p => p.id !== bot.id && (getPlayerGender(p) === 'Nam' || getPlayerGender(p) === 'Male'));
                if (males.length >= 2) {
                    return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'hoa-than', targets: [] } };
                }
            }
        }
        if (activeSkills.includes('Diệu Dược') && !bot.dieuDuocUsedThisTurn && bot.hand.length > 0) {
            const allyInNeed = allAlive.find(p => p.hp < p.maxHp && (p.id === bot.id || (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot))));
            if (allyInNeed) {
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'dieu-duoc', targets: [allyInNeed.id] } };
            }
        }
        // Định Quốc check (dynamic injection since it depends on allies)
        if (getPlayerFaction(bot) === 'Sơn' && !bot.dinhQuocUsedThisTurn && bot.hand.length > 0) {
            const hasDinhQuocAlly = allAlive.find(p => p.id !== bot.id && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.id === 'dinh-quoc')));
            const validCardIdx = bot.hand.findIndex(c => c.name === 'Né' || c.name === 'Sấm Sét');
            if (hasDinhQuocAlly && validCardIdx >= 0) {
                bot.dinhQuocUsedThisTurn = true;
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'dinh-quoc', targets: [hasDinhQuocAlly.id], options: { cardIdx: validCardIdx } } };
            }
        }

        if (activeSkills.includes('Duyên Thơ') && !bot.duyenThoUsedThisTurn && bot.hand.length >= 2 && bot.hp < bot.maxHp) {
            const allyInNeed = allAlive.find(p => p.id !== bot.id && p.hp < p.maxHp && (getPlayerGender(p) === 'Nam' || getPlayerGender(p) === 'Male') && (!bot.isDaTam && p.isRevealed && !p.isDaTam && getPlayerFaction(p) === getPlayerFaction(bot)));
            
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
        if (activeSkills.includes('Lặn Sâu') && bot.hp > 1) {
            // Lặn Sâu không giới hạn số lần, bot dùng đến khi còn 1 HP, tỷ lệ 60% mỗi lần hỏi
            if (Math.random() < 0.6) {
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'lan-sau', targets: [] } };
            }
        }
        if (activeSkills.includes('Lặn Sâu') && bot.hp === 1 && bot.hand.filter(c => c.name === 'Đào').length >= 1) {
             // Đánh đổi liều mạng nếu có Đào
             if (Math.random() < 0.3) {
                 return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'lan-sau', targets: [] } };
             }
        }
        if (activeSkills.includes('Bạch Đằng') && !bot.bachDangUsedThisTurn && bot.hand.length > 0) {
            // Simple heuristic: if bot has some cards, just use it
            // The actual discard logic is in ask_bach_dang
            if (Math.random() < 0.7) { // 70% chance to try to use Bach Dang
                return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'bach-dang', targets: [] } };
            }
        }
        if (activeSkills.includes('Bình Loạn') && bot.hand.length >= 2) {
            const suits = {};
            let hasPair = false;
            for (const c of bot.hand) {
                suits[c.suit] = (suits[c.suit] || 0) + 1;
                if (suits[c.suit] >= 2) hasPair = true;
            }
            if (hasPair) {
                if (shouldPlayAoE(bot, 'Loạn Tiễn', allAlive) > 0) {
                    return { type: 'ACTION_USE_SKILL', payload: { playerId: bot.id, skillId: 'binh-loan', targets: [] } };
                }
            }
        }
        // Bot tự động mặc mọi trang bị trên tay
        const equipCards = bot.hand.filter(c => c.type === 'equip' || c.type === 'Trang bị');
        for (const equipCard of equipCards) {
            let shouldEquip = true;
            
            if (getCardSubType(equipCard) === 'Vũ khí') {
                const currentWeapon = bot.equipment.find(e => getCardSubType(e) === 'Vũ khí');
                // Nếu đang cầm vũ khí tốt (tầm xa hoặc Liên Nỏ) thì không thay bằng vũ khí dở hơn
                if (currentWeapon) {
                    if (currentWeapon.name === 'Liên Nỏ' && equipCard.name !== 'Liên Nỏ') {
                        // Trừ khi cần tầm xa để chém, nếu không thì giữ Liên Nỏ
                        shouldEquip = false; 
                    } else if (currentWeapon.range >= equipCard.range && equipCard.name !== 'Liên Nỏ') {
                        // Upgrade logic: if current weapon range is >= new weapon, don't equip unless new is Lien No
                        shouldEquip = false;
                    }
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
                const allowedIds = getAvailableTargets(gameState, bot.id, trick.name, trick.id);
                const validTargets = allAlive.filter(p => allowedIds.includes(p.id));
                
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
                // Hỏa Công requires discarding a card of the same suit. The bot should have at least 2 cards to play Hỏa Công.
                if (bot.hand.length >= 2) {
                    const allowedIds = getAvailableTargets(gameState, bot.id, trick.name, trick.id);
                    const validTargets = allAlive.filter(p => allowedIds.includes(p.id));
                    const enemies = getEnemyTargets(bot, validTargets, allAlive);
                    if (enemies.length > 0) {
                        targets = [enemies[0].id];
                        canPlay = true;
                    }
                }
            }
            else if (trick.name === 'Mượn Đao') {
                const allowedIds = getAvailableTargets(gameState, bot.id, trick.name, trick.id);
                const enemiesWithWeapon = getEnemyTargets(bot, allAlive.filter(p => allowedIds.includes(p.id)), allAlive);
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
            else if (trick.name === 'Sấm Sét') {
                if (!bot.judgementArea || !bot.judgementArea.some(c => c.name === 'Sấm Sét')) {
                    targets = [bot.id];
                    canPlay = true;
                }
            }
            else if (trick.name === 'Vô Trung Sinh Hữu') {
                targets = [bot.id];
                canPlay = true;
            }
            else if (trick.name === 'Hỗn Loạn' || trick.name === 'Binh Lương Thốn Đoạn') {
                const allowedIds = getAvailableTargets(gameState, bot.id, trick.name, trick.id);
                const validTargets = allAlive.filter(p => allowedIds.includes(p.id));
                const enemies = getEnemyTargets(bot, validTargets, allAlive);
                if (enemies.length > 0) {
                    targets = [enemies[0].id];
                    canPlay = true;
                }
            }
            else if (trick.name === 'Xiềng Xích') {
                const allowedIds = getAvailableTargets(gameState, bot.id, trick.name, trick.id);
                const enemies = getEnemyTargets(bot, allAlive.filter(p => p.id !== bot.id && !p.isChained && allowedIds.includes(p.id)), allAlive);
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
        const limit = (bot.equipment?.some(eq => eq.name === 'Liên Nỏ') || activeSkills.includes('Nỏ Thần')) ? Infinity : 1;
        if ((bot.attackCountThisTurn || 0) < limit) {
            const activeSkills = bot.skills ? bot.skills.map(s => s.name) : [];
            const hasDoiNui = activeSkills.includes('Dời Núi');
            const hasKhaiThien = activeSkills.includes('Khai Thiên');
            const attackIdx = bot.hand.findIndex(c => c.name === 'Chém' || (hasDoiNui && c.name === 'Né') || (hasKhaiThien && c.name !== 'Chém' && c.color === 'red'));
            if (attackIdx >= 0) {
                const slashCardId = bot.hand[attackIdx].id;
                const allowedIds = getAvailableTargets(gameState, bot.id, 'Chém', slashCardId);
                let validTargets = allAlive.filter(p => allowedIds.includes(p.id));
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

                    const chosenCard = bot.hand[attackIdx];
                    const activeSkill = (hasKhaiThien && chosenCard.name !== 'Chém' && chosenCard.color === 'red') ? 'khai-thien' : undefined;
                    return { 
                        type: 'ACTION_PLAY_CARD', 
                        payload: { playerId: bot.id, cardId: slashCardId, targets: [enemies[0].id], virtualCardName: 'Chém', activeSkill } 
                    };
                }
            }
        }
        
        // Không đánh được gì nữa -> End Phase
        return { type: 'ACTION_END_PHASE', payload: { playerId: bot.id } };
    }
    
    return null;
}
