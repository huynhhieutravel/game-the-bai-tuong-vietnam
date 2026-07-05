import { CARD_TYPES, PHASES, getCardSubType } from '../data/gameData';
import { addLog, getAlivePlayers, getPlayerGender, rankToNumber, getPlayerFaction, isPlayerRevealed, revealHero, getFactionCount } from './gameState';
import { canAttack, getDistance } from './rangeSystem';
import { applyPassiveSkills, triggerSkill, SKILL_TRIGGERS } from './skillSystem';
import { drawCards } from './turnSystem';

function removeEquipment(state, player, equipmentCard) {
  if (equipmentCard.name === 'Bạch Ngân') {
     if (player.hp < player.maxHp) {
         player.hp = Math.min(player.hp + 1, player.maxHp);
         Object.assign(state, addLog(state, `💖 [Bạch Ngân] rời khỏi người ${player.name}, hồi 1 HP!`, 'heal'));
     }
  }
}

export function checkAndRevealSkillHero(state, playerId, skillName) {
  if (!skillName) return state;
  let newState = { ...state };
  const player = newState.players[playerId];
  if (!player) return newState;
  
  // Check which hero has this skill
  let targetHeroIndex = -1;
  if (player.heroes && player.heroes.length > 0) {
      const matchSkill = (s) => s.id === skillName || s.name === skillName || s.name.includes(skillName);
      if (player.heroes[0]?.skills?.some(matchSkill) && !player.revealedHeroes[0]) {
          targetHeroIndex = 0;
      } else if (player.heroes[1]?.skills?.some(matchSkill) && !player.revealedHeroes[1]) {
          targetHeroIndex = 1;
      }
  }
  
  if (targetHeroIndex !== -1) {
      newState = revealHero(newState, playerId, targetHeroIndex);
      newState = applyPassiveSkills(newState);
  }
  
  return newState;
}

function drawCardFor(state, playerId, count) {
  const newState = { ...state };
  const player = newState.players[playerId];
  for (let i = 0; i < count; i++) {
    if (newState.deck.length === 0) {
      newState.deck = [...newState.discardPile].reverse();
      newState.discardPile = [];
      Object.assign(newState, addLog(newState, '🔄 Bộ bài được xáo lại', 'important'));
    }
    if (newState.deck.length > 0) {
      player.hand.push(newState.deck.pop());
    }
  }
  return newState;
}

function setOrResolveNextResponse(state, nextResponse) {
    let newState = { ...state };
    newState.waitingForResponse = nextResponse;
    if (nextResponse && nextResponse.type === 'dodge') {
        const target = newState.players[nextResponse.targetId];
        newState = triggerSkill(SKILL_TRIGGERS.ON_TARGETED_SLASH, newState, target, { sourceId: nextResponse.sourceId, cardPlayedId: nextResponse.card?.id });
    }
    return newState;
}

function processBagua(state, player) {
    if (state.deck.length === 0) {
        state.deck = [...state.discardPile].reverse();
        state.discardPile = [];
    }
    const judgeCard = state.deck.pop();
    state.discardPile.push(judgeCard);
    const isRed = judgeCard.color === 'red';
    Object.assign(state, addLog(state, `⚖️ [Bát Quái] phán xét: ${judgeCard.suit} ${judgeCard.rank} (${judgeCard.color})!`, 'important'));
    
    if (isRed) {
        Object.assign(state, addLog(state, `🛡️ [Bát Quái] thành công! Được tính là 1 lá [Né]!`, 'heal'));
    } else {
        Object.assign(state, addLog(state, `❌ [Bát Quái] thất bại! Bạn vẫn phải dùng [Né]!`, 'danger'));
    }
    return isRed;
}

function clearTrick(state) {
  if (state.waitingForResponse && state.waitingForResponse.type === 'save') return state; // DO NOT clear if we are in save state

  state.waitingForResponse = null;
  if (state.playedCards && state.playedCards.length > 0) {
    state.discardPile.push(...state.playedCards);
    state.playedCards = [];
  }
  return state;
}

export function forceClearTrick(state) {
  state.waitingForResponse = null;
  if (state.playedCards && state.playedCards.length > 0) {
    state.discardPile.push(...state.playedCards);
    state.playedCards = [];
  }
  return state;
}

export function processDeath(state, targetId) {
  let finalState = { ...state };
  const target = finalState.players[targetId];

  // 1. Lật toàn bộ tướng để lộ phe trước khi tính toán
  if (!target.revealedHeroes[0]) finalState = revealHero(finalState, target.id, 0);
  if (!target.revealedHeroes[1]) finalState = revealHero(finalState, target.id, 1);

  target.isAlive = false;
  target.isDying = false;
  const deadHeroNames = target.heroes.map(h => h.name).join(' & ');
  Object.assign(finalState, addLog(finalState, `💀 ${target.name} (${deadHeroNames}) đã tử trận!`, 'important'));

  finalState.discardPile.push(...target.hand, ...target.equipment, ...target.judgementArea);
  target.hand = [];
  target.equipment = [];
  target.judgementArea = [];

  // 2. Xử lý Thưởng - Phạt cho người giết
  if (target.lastDamagedBy !== undefined && target.lastDamagedBy !== target.id) {
     const killer = finalState.players[target.lastDamagedBy];
     if (killer && killer.isAlive) {
        const targetFaction = getPlayerFaction(target);
        const killerFaction = getPlayerFaction(killer);
        
        const isSameFaction = !killer.isDaTam && !target.isDaTam && (killerFaction === targetFaction);
        
        if (isSameFaction) {
           // Giết người CÙNG phe -> Bỏ hết bài trên tay và trang bị
           finalState.discardPile.push(...killer.hand, ...killer.equipment);
           killer.hand = [];
           killer.equipment = [];
           Object.assign(finalState, addLog(finalState, `⚠️ ÁC MỘNG! ${killer.name} đã giết đồng minh cùng phe ${targetFaction.toUpperCase()}! Bị phạt vứt toàn bộ bài!`, 'danger'));
        } else {
           // Giết người KHÁC phe -> Rút bài = Số người phe đó còn sống và ĐÃ LỘ DIỆN + 1 (người vừa chết)
           let revealedAlliesOfDead = 0;
           if (!target.isDaTam) {
              revealedAlliesOfDead = getFactionCount(targetFaction, finalState.players);
           }
           
           const rewardCount = revealedAlliesOfDead + 1;
           finalState = drawCardFor(finalState, killer.id, rewardCount);
           Object.assign(finalState, addLog(finalState, `🎁 LẬP CÔNG! ${killer.name} giết kẻ địch! Thưởng rút ${rewardCount} lá bài!`, 'important'));
        }
     }
  }

  const alivePlayers = getAlivePlayers(finalState);
  if (alivePlayers.length === 1) {
    finalState.gameOver = true;
    finalState.winner = alivePlayers[0];
    const winMsg = alivePlayers[0].isDaTam 
      ? `🏆 🐺 DÃ TÂM ${alivePlayers[0].name} ĐÃ ĐỘC CHIẾM THIÊN HẠ!` 
      : `🏆 ${alivePlayers[0].name} ĐÃ CHIẾN THẮNG!`;
    Object.assign(finalState, addLog(finalState, winMsg, 'important'));
  } else if (alivePlayers.length > 1) {
    const firstFaction = getPlayerFaction(alivePlayers[0]);
    const allSameFaction = alivePlayers.every(p => getPlayerFaction(p) === firstFaction);
    
    const hasRevealedDaTam = alivePlayers.some(p => p.isDaTam);
    const wouldHaveDaTam = alivePlayers.length > finalState.players.length / 2;

    if (allSameFaction && !hasRevealedDaTam && !wouldHaveDaTam) {
      finalState.gameOver = true;
      const winnersNames = alivePlayers.map(p => p.name).join(', ');
      finalState.winner = alivePlayers[0];
      Object.assign(finalState, addLog(finalState, `🏆 Phe ${firstFaction.toUpperCase()} (${winnersNames}) ĐÃ CHIẾN THẮNG!`, 'important'));
    }
  }
  return finalState;
}

export function checkDying(state) {
  let newState = { ...state };
  // Nếu game đã over hoặc đang đợi response save thì không check nữa
  if (newState.gameOver || (newState.waitingForResponse && (newState.waitingForResponse.type === 'save' || newState.waitingForResponse.type === 'ask_hoa_tien'))) return newState;

  const dyingPlayer = newState.players.find(p => p.isAlive && p.isDying && p.hp <= 0);
  if (dyingPlayer) {
    newState = triggerSkill(SKILL_TRIGGERS.DYING, newState, dyingPlayer);
    if (newState.waitingForResponse) return newState;
    if (dyingPlayer.hp > 0) return checkDying(newState);

    const hasHoaTien = dyingPlayer.heroes?.some((h, i) => dyingPlayer.revealedHeroes[i] && h.skills?.some(s => s.id === 'hoa-tien'));
    if (hasHoaTien && !dyingPlayer.hoaTienUsed && !dyingPlayer.hoaTienDeclined) {
       newState.waitingForResponse = {
          type: 'ask_hoa_tien',
          targetId: dyingPlayer.id,
          interruptedEvent: newState.waitingForResponse
       };
       return newState;
    }
    
    // Tạo danh sách hỏi vòng quanh
    const askQueue = [];
    let idx = newState.currentPlayerIndex;
    for (let i = 0; i < newState.players.length; i++) {
      if (newState.players[idx].isAlive) {
        askQueue.push(newState.players[idx].id);
      }
      idx = (idx + 1) % newState.players.length;
    }
    
    const interruptedEvent = newState.waitingForResponse;
    newState.waitingForResponse = {
      type: 'save',
      dyingId: dyingPlayer.id,
      askQueue: askQueue,
      interruptedEvent: interruptedEvent
    };
    
    Object.assign(newState, addLog(newState, `🚨 ${dyingPlayer.name} đang hấp hối (HP: ${dyingPlayer.hp})! Chờ cấp cứu...`, 'danger'));
  }
  
  return newState;
}

export function loseEquipment(state, player, cardIdx, sourceId = undefined, discard = true) {
  let newState = { ...state };
  if (cardIdx >= 0 && cardIdx < player.equipment.length) {
      const card = player.equipment[cardIdx];
      player.equipment = player.equipment.filter((_, i) => i !== cardIdx);
      removeEquipment(newState, player, card);
      if (discard) {
          newState.discardPile.push(card);
      }
      newState = triggerSkill(SKILL_TRIGGERS.ON_EQUIP_LOST, newState, player, { card, sourceId });
  }
  return newState;
}

export function loseHandCards(state, player, cardIndexes, sourceId = undefined, discard = true) {
  let newState = { ...state };
  const sortedIdx = [...cardIndexes].sort((a,b) => b-a);
  const discarded = [];
  for (const idx of sortedIdx) {
     discarded.push(player.hand.splice(idx, 1)[0]);
  }
  if (discard) {
      newState.discardPile.push(...discarded);
  }
  if (discarded.length > 0) {
      newState = triggerSkill(SKILL_TRIGGERS.POST_DISCARD, newState, player, { cards: discarded, targetId: sourceId });
  }
  return newState;
}

export function processChainedDamageQueue(state) {
   const newState = { ...state };
   if (!newState.chainedDamageQueue || newState.chainedDamageQueue.length === 0) return newState;
   
   const nextDamage = newState.chainedDamageQueue.shift();
   
   // Gọi lại dealDamage cho nạn nhân bị xích
   // interruptedEvent null vì xử lý tuẫn tự, không chen ngang
   return dealDamage(newState, nextDamage.targetId, nextDamage.amount, { 
      sourceId: nextDamage.sourceId, 
      damageType: nextDamage.damageType,
      isSlashOrDuel: false,
      isChainedDamage: true
   });
}


export function dealDamage(state, targetId, amount, options = {}) {
  const newState = { ...state };
  const target = newState.players[targetId];
  const damageType = options.damageType || 'normal';
  let finalAmount = amount;

  if (options.sourceId !== undefined) {
      const source = newState.players[options.sourceId];
      if (source && source.khoiNghiaActive && options.isSlashOrDuel) {
          finalAmount += 1;
          Object.assign(newState, addLog(newState, `🔥 [Khởi Nghĩa] tăng sát thương lên +1!`, 'important'));
      }
      target.lastDamagedBy = options.sourceId;
  } else {
      target.lastDamagedBy = undefined;
  }

  target.hp = Math.max(0, target.hp - finalAmount);

  let finalState = newState;
  
  // Logic Xiềng Xích (Iron Chain)
  if (target.isChained && (damageType === 'fire' || damageType === 'lightning')) {
      target.isChained = false;
      Object.assign(finalState, addLog(finalState, `⛓️ ${target.name} bị đứt Xiềng Xích${!options.isChainedDamage ? ' và truyền sát thương' : ''}!`, 'important'));
      
      if (!options.isChainedDamage) {
          const chainedPlayers = finalState.players.filter(p => p.id !== target.id && p.isAlive && p.isChained);
          if (chainedPlayers.length > 0) {
              const queue = chainedPlayers.map(p => ({
                  targetId: p.id,
                  amount: finalAmount, // Dội sát thương ĐÃ TÍNH TOÁN (finalAmount) chứ không phải base amount
                  damageType: damageType,
                  sourceId: options.sourceId,
              }));
              if (finalState.chainedDamageQueue) {
                  finalState.chainedDamageQueue.push(...queue);
              } else {
                  finalState.chainedDamageQueue = queue;
              }
          }
      }
  }

  if (finalAmount > 0) {
    Object.assign(finalState, addLog(finalState, `${damageType === 'fire' ? '🔥' : damageType === 'lightning' ? '🌩️' : ''} ${target.name} mất ${finalAmount} HP! (${target.hp}/${target.maxHp})`, 'damage'));
    
    const interruptedEvent = options.interruptedEvent || finalState.waitingForResponse || null;
    finalState.waitingForResponse = null; // Clear to let ON_DAMAGE_CALC start fresh
    
    // Xóa cờ báo hiệu kỹ năng nhận sát thương để được hỏi lại
    target.askedKhoanDan = false;
    target.askedNqsh = false;
    // Trigger skills on taking damage (e.g., Khoan Dân, Nam Quốc Sơn Hà)
    finalState = triggerSkill(SKILL_TRIGGERS.ON_DAMAGE_CALC, finalState, target, { amount: finalAmount, sourceId: options.sourceId, interruptedEvent });
    if (!finalState.waitingForResponse) {
        finalState = triggerSkill(SKILL_TRIGGERS.POST_DAMAGE, finalState, target, { amount: finalAmount, sourceId: options.sourceId, interruptedEvent });
    }
    
    if (!finalState.waitingForResponse && interruptedEvent) {
        finalState.waitingForResponse = interruptedEvent;
    }
  }

  if (target.hp <= 0) {
    target.isDying = true;
  }

  return checkDying(finalState);
}

// Chuyển việc phát bài/bỏ bài Cẩm Nang vào 1 hàm để dùng chung
function resolveTrick(state, player, cardIndex, card, options = {}) {
  let newState = { ...state };
  
  if (!card.isCompletelyVirtual) {
      player.hand = player.hand.filter((_, i) => i !== cardIndex);
      
      if (options.isReforge) {
          newState.discardPile.push(card);
      } else {
          newState.playedCards.push(card);
      }
      
      if (card.type === 'trick' && !options.isReforge) {
         const hasDuyenTien = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'duyen-tien'));
         if (hasDuyenTien) {
             Object.assign(newState, addLog(newState, `✨ ${player.name} phát động [Duyên Tiên], rút 1 lá bài do dùng Cẩm Nang!`, 'important'));
             newState = drawCardFor(newState, player.id, 1);
         }
      }
  }
  
  return newState;
}

export function playCard(state, cardIndex, targetId = null, extraTargetId = null, targetCardRef = null, options = {}) {
  let newState = { ...state };
  const player = newState.players[newState.currentPlayerIndex];
  
  if (options.activeSkill) {
      newState = checkAndRevealSkillHero(newState, player.id, options.activeSkill);
  }
  
  // 🐉 Xử lý đặc biệt Bọc Trăm Trứng (Chủ động)
  if (options.activeSkill === 'Bọc Trăm Trứng') {
      const lacAllies = getAlivePlayers(newState).filter(p => p.id !== player.id && getPlayerFaction(p) === 'Lạc');
      if (lacAllies.length === 0) {
          Object.assign(newState, addLog(newState, `❌ Không có đồng minh phe Lạc nào để gọi Bọc Trăm Trứng!`, 'normal'));
          return newState;
      }
      
      newState.waitingForResponse = {
          type: 'ask_boc_tram_trung_slash',
          sourceId: player.id,
          targetId: targetId,
          askQueue: lacAllies.map(p => p.id),
          isDefensive: false
      };
      Object.assign(newState, addLog(newState, `🐉 ${player.name} phát động [Bọc Trăm Trứng]! Gọi đồng minh Lạc đánh [Chém] giùm!`, 'important'));
      return newState;
  }
  
  let card;
  
  if (options.isCompletelyVirtual) {
      const virtualType = ['Chém', 'Né', 'Đào', 'Rượu'].includes(options.virtualCardName) ? CARD_TYPES.BASIC : CARD_TYPES.TRICK;
      card = { name: options.virtualCardName, type: virtualType, isVirtual: true, isCompletelyVirtual: true, suit: '♥', rank: 'A', activeSkill: options.activeSkill };
      
      // Nếu là Bọc Trăm Trứng thì log đã được ghi ở ask_boc_tram_trung_slash
      if (options.activeSkill !== 'Bọc Trăm Trứng') {
          Object.assign(newState, addLog(newState, `🌊 ${player.name} dùng quyền năng ảo đánh ra [${card.name}]!`, 'important'));
      }
  } else {
      card = player.hand[cardIndex];
      if (!card) return newState;

      if (options.activeSkill && options.virtualCardName && options.virtualCardName !== card.name) {
        const virtualType = ['Chém', 'Né', 'Đào', 'Rượu'].includes(options.virtualCardName) ? CARD_TYPES.BASIC : CARD_TYPES.TRICK;
        card = { ...card, name: options.virtualCardName, type: virtualType, isVirtual: true, originalName: card.name, activeSkill: options.activeSkill };
        Object.assign(newState, addLog(newState, `✨ ${player.name} kích hoạt [${options.activeSkill}], dùng ${card.originalName} như ${card.name}!`, 'important'));
      }
  }

  switch (card.type) {
    case CARD_TYPES.BASIC:
      if (card.name === 'Chém') {
        if (targetId === null) return newState;
        const target = newState.players[targetId];
        
        // Kiểm tra giới hạn 1 Chém / Lượt
        const hasCrossbow = player.equipment.some(eq => eq.name === 'Liên Nỏ');
        if (player.hasAttackedThisTurn && !hasCrossbow) {
           Object.assign(newState, addLog(newState, `❌ Bạn chỉ được dùng 1 lá Chém mỗi lượt (trừ khi có Liên Nỏ)!`, 'normal'));
           return newState;
        }
        
        let validTarget = canAttack(newState, player.id, targetId);
        const hasNoThan = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'no-than'));
        if (hasNoThan) {
            const dist = getDistance(newState, player.id, targetId);
            if (dist <= rankToNumber(card.rank)) {
                validTarget = true;
            }
        }
        
        if (!validTarget) {
           Object.assign(newState, addLog(newState, `❌ ${target.name} ngoài tầm đánh!`, 'normal'));
           return newState;
        }

        // Hắc Thuẫn logic
        const hasBlackShield = target.equipment.some(eq => eq.name === 'Hắc Thuẫn');
        if (hasBlackShield && card.color === 'black') {
           Object.assign(newState, addLog(newState, `🛡️ ${target.name} có [Hắc Thuẫn], miễn nhiễm [Chém] đen của ${player.name}!`, 'important'));
           player.attackCountThisTurn += 1;
           player.hasAttackedThisTurn = true;
           newState = resolveTrick(newState, player, cardIndex, card);
           return checkDying(newState); // end slash action with no effect
        }

        player.attackCountThisTurn += 1;
        player.hasAttackedThisTurn = true;
        
        newState = resolveTrick(newState, player, cardIndex, card);
        
        // Phương Thiên Kích logic
        const hasSkyHalberd = player.equipment.some(eq => eq.name === 'Phương Thiên Kích');
        // Lúc này bài Chém vừa được trừ đi, nên phải lấy độ dài lúc TRƯỚC khi trừ là 1, 
        // nhưng resolveTrick đã xoá khỏi hand rồi nên tay sẽ có độ dài 0
        if (hasSkyHalberd && player.hand.length === 0) {
             const otherTargets = getAlivePlayers(newState).filter(p => p.id !== player.id && p.id !== target.id && canAttack(newState, player.id, p.id));
             const extraTargets = otherTargets.slice(0, 2);
             
             if (extraTargets.length > 0) {
                 const allTargets = [target.id, ...extraTargets.map(t => t.id)];
                 Object.assign(newState, addLog(newState, `${player.name} phát động [Phương Thiên Kích], chém nhiều mục tiêu!`, 'important'));
                 
                 newState.waitingForResponse = {
                    type: 'aoe_trick',
                    trickType: 'sky_halberd',
                    targets: allTargets,
                    sourceId: player.id,
                    card: card,
                    damage: 1 // base damage
                 };
                 return newState;
             }
        }

        Object.assign(newState, addLog(newState, `${player.name} dùng [Chém] tấn công ${target.name}!`, 'damage'));
        
        let noDodge = false;
        let baseDmg = 1;
        
        if (hasNoThan) {
            if (player.hand.length >= target.hand.length) {
                noDodge = true;
                Object.assign(newState, addLog(newState, `🎯 [Nỏ Thần] kích hoạt: ${target.name} không thể dùng Né!`, 'important'));
            }
            if (player.hp <= target.hp) {
                baseDmg += 1;
                Object.assign(newState, addLog(newState, `💥 [Nỏ Thần] kích hoạt: Tăng 1 sát thương!`, 'important'));
            }
        }

        const hasPhaQuan = isPlayerRevealed(player) && player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'pha-quan'));
        let reqDodges = 1;
        if (hasPhaQuan) {
           reqDodges = 2;
           Object.assign(newState, addLog(newState, `🛡️ [Phá Quân] kích hoạt: ${target.name} phải dùng 2 lá [Né] để tránh đòn!`, 'important'));
        }

        /** @type {any} */
        let nextResponse = {
          type: 'dodge',
          targetId: target.id,
          sourceId: player.id,
          card: card,
          unavoidable: noDodge,
          baseDamage: baseDmg,
          requiredDodges: reqDodges
        };

        const hasTreNga = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'tre-nga'));
        if (hasTreNga && isPlayerRevealed(player)) {
           target.isSilenced = true;
           Object.assign(newState, addLog(newState, `🎋 ${player.name} vung [Tre Ngà]! Kỹ năng của ${target.name} bị khóa đến hết lượt!`, 'important'));
           
           if (newState.deck.length === 0) {
             newState.deck = [...newState.discardPile].reverse();
             newState.discardPile = [];
           }
           const judgeCard = newState.deck.pop();
           newState.discardPile.push(judgeCard);
           Object.assign(newState, addLog(newState, `⚖️ [Tre Ngà] Phán xét: Rút được ${judgeCard.suit} ${judgeCard.rank}`, 'important'));
           
           nextResponse = {
             type: 'ask_tre_nga_discard',
             targetId: target.id,
             sourceId: player.id,
             judgeSuit: judgeCard.suit,
             interruptedEvent: nextResponse
           };
        }
        
        // Song Kiếm logic
        const hasTwinSwords = player.equipment.some(eq => eq.name === 'Song Kiếm');
        const pGender = getPlayerGender(player);
        const tGender = getPlayerGender(target);
        
        if (hasTwinSwords && pGender !== 'Không' && tGender !== 'Không' && pGender !== tGender) {
            Object.assign(newState, addLog(newState, `${player.name} phát động [Song Kiếm] lên ${target.name}!`, 'important'));
            newState.waitingForResponse = {
               type: 'ask_weapon_skill',
               weapon: 'Song Kiếm',
               responderId: target.id,
               sourceId: player.id,
               targetId: target.id,
               interruptedEvent: nextResponse
            };
        } else {
            newState = setOrResolveNextResponse(newState, nextResponse);
        }
      } 
      else if (card.name === 'Đào') {
        if (player.hp < player.maxHp) {
          player.hand = player.hand.filter((_, i) => i !== cardIndex);
          newState.playedCards = [...newState.playedCards, card];

          const playerFaction = getPlayerFaction(player);
          const hauVienTargets = getAlivePlayers(newState).filter(p => p.id !== player.id && p.hp < p.maxHp && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.id === 'hau-vien')));

          if (playerFaction === 'Hà' && hauVienTargets.length > 0) {
             newState.waitingForResponse = {
                type: 'ask_hau_vien',
                sourceId: player.id,
                cardName: 'Đào',
                targets: hauVienTargets.map(p => p.id)
             };
          } else {
             player.hp = Math.min(player.hp + 1, player.maxHp);
             Object.assign(newState, addLog(newState, `${player.name} dùng [Đào] hồi 1 HP (${player.hp}/${player.maxHp})`, 'heal'));
          }
        }
      }
      else if (card.name === 'Rượu') {
        if (player.drankWine) {
           Object.assign(newState, addLog(newState, `❌ ${player.name} đã uống [Rượu] trong lượt này rồi, không thể dùng thêm!`, 'normal'));
           return newState;
        }
        player.hand = player.hand.filter((_, i) => i !== cardIndex);
        newState.playedCards = [...newState.playedCards, card];
        player.drankWine = true;
        Object.assign(newState, addLog(newState, `${player.name} uống [Rượu]! Sát thương Chém tiếp theo +1.`, 'important'));
      }
      break;

    case CARD_TYPES.EQUIP:
      player.hand = player.hand.filter((_, i) => i !== cardIndex);
      const equipType = card.name.includes('Ngựa') ? (card.name.includes('-1') ? 'Ngựa Chiến' : 'Ngựa Thần') : (card.name === 'Bát Quái' || card.name === 'Hắc Thuẫn' ? 'Giáp' : 'Vũ khí');
      
      const existingIdx = player.equipment.findIndex(e => {
        const eType = e.name.includes('Ngựa') ? (e.name.includes('-1') ? 'Ngựa Chiến' : 'Ngựa Thần') : (e.name === 'Bát Quái' || e.name === 'Hắc Thuẫn' ? 'Giáp' : 'Vũ khí');
        return eType === equipType;
      });

      if (existingIdx !== -1) {
        const removed = player.equipment[existingIdx];
        player.equipment = player.equipment.filter((_, i) => i !== existingIdx);
        removeEquipment(newState, player, removed);
        newState.discardPile = [...newState.discardPile, removed];
      }
      
      player.equipment = [...player.equipment, card];
      Object.assign(newState, addLog(newState, `${player.name} trang bị [${card.name}]`, 'normal'));
      break;

    case CARD_TYPES.TRICK:
      if (card.name === 'Quyết Đấu' && targetId !== null) {
        const target = newState.players[targetId];
        newState = resolveTrick(newState, player, cardIndex, card);
        Object.assign(newState, addLog(newState, `${player.name} dùng [Quyết Đấu] lên ${target.name}!`, 'important'));
        
        newState.waitingForResponse = {
          type: 'duel_slash',
          targetId: target.id,
          sourceId: player.id,
          card: card,
          duelTurnId: target.id
        };
      }
      else if (card.name === 'Hỏa Công' && targetId !== null) {
        const target = newState.players[targetId];
        
        // Hỏa Công requires the target to have at least 1 card in hand
        if (target.hand.length === 0) {
           Object.assign(newState, addLog(newState, `❌ ${target.name} không có bài trên tay, không thể dùng [Hỏa Công]!`, 'normal'));
           return newState;
        }

        newState = resolveTrick(newState, player, cardIndex, card);
        Object.assign(newState, addLog(newState, `🔥 ${player.name} dùng [Hỏa Công] lên ${target.name}!`, 'important'));
        
        newState.waitingForResponse = {
          type: 'ask_negate',
          trickType: 'hoacong',
          targetId: target.id,
          sourceId: player.id,
          card: card,
          askQueue: Array.from({length: newState.players.length}, (_, i) => (player.id + i) % newState.players.length).filter(id => newState.players[id].isAlive),
          interruptedEvent: {
             type: 'ask_hoacong_reveal',
             targetId: target.id,
             sourceId: player.id,
          }
        };
      }
      else if (card.name === 'Cướp Bài' && targetId !== null) {
        // Tiên Duyên (Tiên Dung): Vô hạn khoảng cách Cẩm Nang
        const hasTienDuyen = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'tien-duyen' && h.name === 'Tiên Dung'));
        
        // Range 1
        if (!hasTienDuyen && getDistance(newState, player.id, targetId) > 1) {
          Object.assign(newState, addLog(newState, `❌ ${newState.players[targetId].name} ngoài tầm Cướp Bài (khoảng cách > 1)!`, 'normal'));
          return newState;
        }
        const target = newState.players[targetId];
        if (target.hand.length === 0 && target.equipment.length === 0) {
          Object.assign(newState, addLog(newState, `❌ ${target.name} không có bài để cướp!`, 'normal'));
          return newState;
        }
        
        newState = resolveTrick(newState, player, cardIndex, card);
        Object.assign(newState, addLog(newState, `${player.name} dùng [Cướp Bài] lên ${target.name}!`, 'important'));
        
        // Go into Ask Negate mode first
        newState.waitingForResponse = {
          type: 'ask_negate',
          trickType: 'steal',
          targetId: target.id,
          sourceId: player.id,
          card: card,
          askQueue: getAlivePlayers(newState).map(p => p.id),
          isNegated: false,
          targetCardRef: targetCardRef
        };
      }
      else if (card.name === 'Tước Bài' && targetId !== null) {
        const target = newState.players[targetId];
        if (target.hand.length === 0 && target.equipment.length === 0 && (!target.judgementArea || target.judgementArea.length === 0)) {
          Object.assign(newState, addLog(newState, `❌ ${target.name} không có bài để tước!`, 'normal'));
          return newState;
        }

        newState = resolveTrick(newState, player, cardIndex, card);
        Object.assign(newState, addLog(newState, `${player.name} dùng [Tước Bài] lên ${target.name}!`, 'important'));
        
        newState.waitingForResponse = {
          type: 'ask_negate',
          trickType: 'dismantle',
          targetId: target.id,
          sourceId: player.id,
          card: card,
          askQueue: getAlivePlayers(newState).map(p => p.id),
          isNegated: false,
          targetCardRef: targetCardRef
        };
      }
      else if (card.name === 'Mượn Đao' && targetId !== null) {
        // targetId = người bị ép chém (A)
        // extraTargetId = mục tiêu bị chém (B) - for simplicity, auto pick nearest enemy of A
        const targetA = newState.players[targetId];
        
        // Check if A has a weapon
        const weaponIdx = targetA.equipment.findIndex(e => 
          !e.name.includes('Ngựa') && e.name !== 'Bát Quái' && e.name !== 'Hắc Thuẫn'
        );
        if (weaponIdx < 0) {
          Object.assign(newState, addLog(newState, `❌ ${targetA.name} không có vũ khí để mượn!`, 'normal'));
          return newState;
        }
        
        // Find a valid target for A to slash
        const slashTargets = getAlivePlayers(newState).filter(p => 
          p.id !== targetA.id && p.id !== player.id && canAttack(newState, targetA.id, p.id)
        );
        
        if (slashTargets.length === 0) {
          Object.assign(newState, addLog(newState, `❌ Không có mục tiêu hợp lệ cho ${targetA.name} chém!`, 'normal'));
          return newState;
        }
        
        if (extraTargetId === null) {
          Object.assign(newState, addLog(newState, `❌ Chưa chọn người bị chém!`, 'normal'));
          return newState;
        }
        
        newState = resolveTrick(newState, player, cardIndex, card);
        
        const victimB = newState.players[extraTargetId]; 
        Object.assign(newState, addLog(newState, `${player.name} dùng [Mượn Đao]! Ép ${targetA.name} chém ${victimB.name}!`, 'important'));
        
        newState.waitingForResponse = {
          type: 'borrow_sword',
          borrowerId: player.id,    // Người mượn đao
          targetAId: targetA.id,    // Người bị ép chém
          targetBId: victimB.id,    // Người bị chém
          card: card,
        };
      }
      else if (card.name === 'Loạn Tiễn' || card.name === 'Dã Man') {
        const allOtherPlayers = getAlivePlayers(newState).filter(p => p.id !== player.id);
        if (allOtherPlayers.length === 0) return newState;

        newState = resolveTrick(newState, player, cardIndex, card);
        Object.assign(newState, addLog(newState, `${player.name} tung ra [${card.name}]!`, 'important'));
        
        // Cần Hóa Giải trước
        newState.waitingForResponse = {
          type: 'ask_negate',
          trickType: card.name === 'Loạn Tiễn' ? 'arrow_rain' : 'barbarian',
          targetId: allOtherPlayers[0].id,
          sourceId: player.id,
          card: card,
          askQueue: getAlivePlayers(newState).map(p => p.id),
          aoeTargets: allOtherPlayers.map(p => p.id),
          isNegated: false
        };
      }
      else if (card.name === 'Xiềng Xích') {
         if (targetId === null) {
            newState = resolveTrick(newState, player, cardIndex, card, { isReforge: true });
            newState = drawCardFor(newState, player.id, 1);
            Object.assign(newState, addLog(newState, `⛓️ ${player.name} rèn lại [Xiềng Xích], rút 1 lá!`, 'important'));
         } else {
            newState = resolveTrick(newState, player, cardIndex, card);
            const targets = [targetId];
            if (extraTargetId !== null) targets.push(extraTargetId);
            
            let targetNames = targets.map(id => newState.players[id].name).join(' và ');
            Object.assign(newState, addLog(newState, `⛓️ ${player.name} dùng [Xiềng Xích] lên ${targetNames}!`, 'important'));
            
            newState.waitingForResponse = {
              type: 'ask_negate',
              trickType: 'xieng_xich',
              targetId: targets[0],
              sourceId: player.id,
              card: card,
              askQueue: getAlivePlayers(newState).map(p => p.id),
              aoeTargets: targets,
              isNegated: false
            };
         }
      }
      else if (card.name === 'Hồi Xuân') {
        newState = resolveTrick(newState, player, cardIndex, card);
        Object.assign(newState, addLog(newState, `🌸 ${player.name} dùng [Hồi Xuân]! Tất cả hồi 1 HP!`, 'important'));
        
        const allPlayers = getAlivePlayers(newState);
        // Cần Hóa Giải trước cho người đầu tiên
        newState.waitingForResponse = {
          type: 'ask_negate',
          trickType: 'peach_garden',
          targetId: allPlayers[0].id,
          sourceId: player.id,
          card: card,
          askQueue: getAlivePlayers(newState).map(p => p.id),
          aoeTargets: allPlayers.map(p => p.id),
          isNegated: false
        };
      }
      else if (card.name === 'Sấm Sét' || card.name === 'Hỗn Loạn') {
        if (targetId === null) targetId = player.id; // Self by default, or specific for Hỗn Loạn
        const target = newState.players[targetId];
        
        // Cannot have duplicate delayed tricks of same name
        if (target.judgementArea && target.judgementArea.some(c => c.name === card.name)) {
          Object.assign(newState, addLog(newState, `❌ ${target.name} đã có ${card.name} trong khu vực phán xét!`, 'normal'));
          return newState;
        }

        player.hand = player.hand.filter((_, i) => i !== cardIndex);
        if (!target.judgementArea) target.judgementArea = [];
        target.judgementArea.push(card);
        
        Object.assign(newState, addLog(newState, `${player.name} đặt [${card.name}] lên ${target.name}!`, 'important'));
      }
      break;
  }

  return newState;
}

function processTrick(state, trickType, sourceId, targetId, cardIndexSelected = null, targetCardRef = null) {
  let newState = { ...state };
  const source = newState.players[sourceId];
  const target = newState.players[targetId];

  if (trickType === 'steal' || trickType === 'dismantle') {
    let affectedCard = null;
    
    if (targetCardRef) {
       if (targetCardRef.zone === 'equip' && target.equipment.length > targetCardRef.index) {
          affectedCard = target.equipment[targetCardRef.index];
          newState = loseEquipment(newState, target, targetCardRef.index, sourceId, trickType === 'dismantle');
       } else if (targetCardRef.zone === 'judge' && target.judgementArea && target.judgementArea.length > targetCardRef.index) {
          affectedCard = target.judgementArea.splice(targetCardRef.index, 1)[0];
          if (trickType === 'dismantle') newState.discardPile.push(affectedCard);
       } else if (targetCardRef.zone === 'hand' && target.hand.length > targetCardRef.index) {
          affectedCard = target.hand[targetCardRef.index];
          newState = loseHandCards(newState, target, [targetCardRef.index], sourceId, trickType === 'dismantle');
       }
    } 
    
    if (!affectedCard) { // fallback
        if (target.hand.length > 0) {
          const idx = cardIndexSelected !== null ? cardIndexSelected : Math.floor(Math.random() * target.hand.length);
          affectedCard = target.hand[idx];
          newState = loseHandCards(newState, target, [idx], sourceId, trickType === 'dismantle');
        } else if (target.equipment.length > 0) {
          const idx = target.equipment.length - 1;
          affectedCard = target.equipment[idx];
          newState = loseEquipment(newState, target, idx, sourceId, trickType === 'dismantle');
        } else if (target.judgementArea && target.judgementArea.length > 0) {
          affectedCard = target.judgementArea.pop();
          if (trickType === 'dismantle') newState.discardPile.push(affectedCard);
        }
    }
    
    if (affectedCard) {
      if (trickType === 'steal') {
        source.hand.push(affectedCard);
        Object.assign(newState, addLog(newState, `${source.name} đã cướp 1 lá bài của ${target.name}!`, 'normal'));
      } else {
        Object.assign(newState, addLog(newState, `${source.name} đã tháo dỡ 1 lá bài của ${target.name}!`, 'normal'));
      }
    }
  }

  return newState;
}

export function handleResponse(state, responsePayload) {
  let newState = { ...state };
  let req = newState.waitingForResponse;
  if (!req) return newState;

  // (Đã chuyển ask_tien_phat sang SkillRegistry.js)
  
  if (responsePayload && responsePayload.activeSkill) {
      newState.players.forEach(p => {
          newState = checkAndRevealSkillHero(newState, p.id, responsePayload.activeSkill);
      });
  }

  // Xử lý gọi Bọc Trăm Trứng trong pha phòng thủ
  if (responsePayload && responsePayload.callBocTramTrung) {
      const targetId = req.type === 'dodge' ? req.targetId : 
                       req.type === 'duel_slash' ? req.duelTurnId : 
                       req.type === 'aoe_trick' ? req.targets[0] : 
                       req.type === 'borrow_sword' ? req.targetAId : null;
                       
      if (targetId !== null) {
          const player = newState.players[targetId];
          const lacAllies = getAlivePlayers(newState).filter(p => p.id !== player.id && getPlayerFaction(p) === 'Lạc');
          if (lacAllies.length > 0) {
              newState = checkAndRevealSkillHero(newState, player.id, 'Bọc Trăm Trứng');
              Object.assign(newState, addLog(newState, `🐉 ${player.name} phát động [Bọc Trăm Trứng]! Gọi đồng minh Lạc đánh [Chém] giùm!`, 'important'));
              
              const interruptedEvent = { ...req };
              newState.waitingForResponse = {
                  type: 'ask_boc_tram_trung_slash',
                  sourceId: player.id,
                  targetId: null,
                  askQueue: lacAllies.map(p => p.id),
                  isDefensive: true,
                  interruptedEvent: interruptedEvent
              };
              return newState;
          }
      }
  }
  
  // (Bánh Chưng đã chuyển sang SkillRegistry.js)
  
  if (req.type === 'ask_reveal_for_skill') {
      const player = newState.players[req.targetId];
      if (responsePayload && responsePayload.reveal) {
          newState = revealHero(newState, player.id, req.heroIndex);
          Object.assign(newState, addLog(newState, `✨ ${player.name} đã lật tướng để dùng [${req.skillName}]!`, 'important'));
      } else {
          if (req.declinedFlag) {
              newState[req.declinedFlag] = true;
          }
      }
      newState.waitingForResponse = null;
      return newState;
  }

  // (Tre Ngà đã được chuyển sang SkillRegistry.js)
  
  // Xử lý Hỏa Công (Fire Attack)
  if (req.type === 'ask_hoacong_reveal') {
     const target = newState.players[req.targetId];
     const source = newState.players[req.sourceId];
     const { doReveal, cardIndex } = responsePayload;
     
     if (doReveal && cardIndex !== undefined) {
         const revealedCard = target.hand[cardIndex];
         Object.assign(newState, addLog(newState, `👁️ ${target.name} cho mọi người xem 1 lá bài: ${revealedCard.suit} ${revealedCard.rank}!`, 'important'));
         
         newState.waitingForResponse = {
            type: 'ask_hoacong_discard',
            targetId: target.id,
            sourceId: source.id,
            revealedSuit: revealedCard.suit
         };
     } else {
         Object.assign(newState, addLog(newState, `❌ Hỏa Công thất bại vì không chọn được bài lộ diện!`, 'normal'));
         newState = clearTrick(newState);
     }
     return newState;
  }

  if (req.type === 'ask_hoacong_discard') {
     const source = newState.players[req.sourceId];
     const target = newState.players[req.targetId];
     const { doDiscard, cardIndex } = responsePayload;
     
     if (doDiscard && cardIndex !== undefined) {
         const discardCard = source.hand.splice(cardIndex, 1)[0];
         newState.discardPile.push(discardCard);
         Object.assign(newState, addLog(newState, `🔥 ${source.name} bỏ 1 lá bài ${discardCard.suit} để phóng hỏa!`, 'important'));
         
         newState = clearTrick(newState);
         newState = dealDamage(newState, target.id, 1, { sourceId: req.sourceId, damageType: 'fire' });
         return checkDying(newState);
     } else {
         Object.assign(newState, addLog(newState, `❌ ${source.name} không bỏ bài, Hỏa Công không có tác dụng!`, 'normal'));
         newState = clearTrick(newState);
         return newState;
     }
  }
  
  // (Đã dọn dẹp ask_thuy_to sang SkillRegistry.js)

  // (Các skill ask_ cũ đã được chuyển sang SkillRegistry)
  

  
  // 0. Cấp Cứu (Save from death)
  if (req.type === 'save') {
    const { askerId, doSave, cardIndexSelected } = responsePayload;
    const dyingId = req.dyingId;
    const target = newState.players[dyingId];

      if (doSave) {
      const asker = newState.players[askerId];
      const saveCard = asker.hand.splice(cardIndexSelected, 1)[0];
      newState.playedCards.push(saveCard);
      
      target.hp += 1;
      const cardLogName = (saveCard.name === 'Đào' || saveCard.name === 'Rượu') ? `[${saveCard.name}]` : `[${saveCard.name}] như Đào`;
      Object.assign(newState, addLog(newState, `${asker.name} dùng ${cardLogName} cứu ${target.name}! HP: ${target.hp}/${target.maxHp}`, 'heal'));

      if (target.hp > 0) {
        target.isDying = false;
        Object.assign(newState, addLog(newState, `💖 ${target.name} đã qua cơn nguy kịch!`, 'important'));
        
        newState.waitingForResponse = req.interruptedEvent;
        // Đã cứu xong, xoá bài đã dùng cứu (bài cứu không nằm trên mặt bàn lâu)
        if (newState.playedCards && newState.playedCards.length > 0 && (!req.interruptedEvent || req.interruptedEvent.type !== 'aoe_trick')) {
           newState.discardPile.push(...newState.playedCards);
           newState.playedCards = [];
        }
        return checkDying(newState);
      }
    } else {
      req.askQueue = req.askQueue.filter(id => id !== askerId);
    }

    if (req.askQueue.length === 0 && target.hp <= 0) {
      newState = processDeath(newState, target.id);
      newState.waitingForResponse = req.interruptedEvent;
      return checkDying(newState);
    } else if (target.hp <= 0) {
      Object.assign(newState, addLog(newState, `Đợi ${newState.players[req.askQueue[0]].name} cấp cứu...`, 'normal'));
      return newState;
    }
    return checkDying(newState);
  }
  
  if (req.type === 'ask_weapon_skill') {
    const { doUse, cardIndexes, equipIndexes } = responsePayload;
    const source = newState.players[req.sourceId];
    const target = newState.players[req.targetId];

    if (!doUse) {
      newState = clearTrick(newState);
      return checkDying(newState);
    }

    // Process using skill
    if (req.weapon === 'Thanh Long Đao') {
       // doUse = true, cardIndexes = [index of Chém]
       const slashIdx = cardIndexes[0];
       const slashCard = source.hand.splice(slashIdx, 1)[0];
       newState.playedCards.push(slashCard);
       Object.assign(newState, addLog(newState, `${source.name} phát động [Thanh Long Đao], chém tiếp ${target.name}!`, 'important'));
       
       newState.waitingForResponse = {
         type: 'dodge',
         targetId: target.id,
         sourceId: source.id,
         card: slashCard,
       };
       return newState; // don't clear trick, we wait for dodge
    } else if (req.weapon === 'Rìu Đá') {
       // doUse = true, discard 2 cards
       const handIdx = cardIndexes || [];
       const eqIdx = equipIndexes || [];
       
       const toDiscard = [];
       // Sort descending to splice without messing up index
       [...handIdx].sort((a,b) => b-a).forEach(idx => {
          toDiscard.push(source.hand.splice(idx, 1)[0]);
       });
       [...eqIdx].sort((a,b) => b-a).forEach(idx => {
          const removed = source.equipment.splice(idx, 1)[0];
          toDiscard.push(removed);
          removeEquipment(newState, source, removed);
       });
       
       newState.discardPile.push(...toDiscard);
       Object.assign(newState, addLog(newState, `${source.name} phát động [Rìu Đá], bỏ 2 lá, sát thương bắt buộc trúng!`, 'important'));
       
       newState = clearTrick(newState);
       newState = dealDamage(newState, target.id, req.baseDamage || 1, { sourceId: req.sourceId, isSlashOrDuel: true });
       return checkDying(newState); // dealDamage already calls checkDying
    } else if (req.weapon === 'Quạt Sắt') {
       // discard 2 cards to pass damage
       const handIdx = cardIndexes || [];
       const eqIdx = equipIndexes || [];
       
       const toDiscard = [];
       [...handIdx].sort((a,b) => b-a).forEach(idx => {
          toDiscard.push(source.hand.splice(idx, 1)[0]);
       });
       [...eqIdx].sort((a,b) => b-a).forEach(idx => {
          const removed = source.equipment.splice(idx, 1)[0];
          toDiscard.push(removed);
          removeEquipment(newState, source, removed);
       });
       
       newState.discardPile.push(...toDiscard);
       Object.assign(newState, addLog(newState, `✨ ${source.name} phát động [Quạt Sắt], bỏ 2 lá để vô hiệu ${req.baseDamage || 1} sát thương!`, 'important'));
       
       newState = clearTrick(newState);
       return checkDying(newState);
    } else if (req.weapon === 'Song Kiếm') {
       // Target decided to discard 1 card
       const discardedCards = [];
       if (cardIndexes && cardIndexes.length > 0) {
         discardedCards.push(target.hand.splice(cardIndexes[0], 1)[0]);
       } else if (equipIndexes && equipIndexes.length > 0) {
         discardedCards.push(target.equipment.splice(equipIndexes[0], 1)[0]);
       }
       newState.discardPile.push(...discardedCards);
       Object.assign(newState, addLog(newState, `${target.name} chọn tự bỏ 1 lá bài vì [Song Kiếm].`, 'normal'));
       
       // Song Kiếm is triggered BEFORE the dodge phase.
       // So we need to restore the interrupted event (dodge)
       return setOrResolveNextResponse(newState, req.interruptedEvent);
    }
  }
  
  
  if (req.type === 'ask_negate') {
    const { askerId, doNegate, negateCardIndex, activeSkill, negateEquipIndex } = responsePayload;
    if (doNegate) {
       const asker = newState.players[askerId];
       let negateCard;
       
       if (negateEquipIndex !== undefined) {
           negateCard = asker.equipment.splice(negateEquipIndex, 1)[0];
       } else {
           negateCard = asker.hand.splice(negateCardIndex, 1)[0];
       }
       
       if (activeSkill === 'Linh Giám' || activeSkill === 'Chương Dương') {
          negateCard.isVirtual = true;
          negateCard.originalName = negateCard.name;
          negateCard.name = 'Hóa Giải';
          Object.assign(newState, addLog(newState, `✨ ${asker.name} phát động [${activeSkill}], dùng ${negateCard.originalName} làm Hóa Giải!`, 'important'));
       }
       
       newState.playedCards.push(negateCard);
       
       req.isNegated = !req.isNegated; // Đảo trạng thái Hóa Giải
       const status = req.isNegated ? 'VÔ HIỆU HÓA' : 'PHỤC HỒI';
       Object.assign(newState, addLog(newState, `🛡️ ${asker.name} dùng [Hóa Giải]! Cẩm nang bị ${status}!`, 'important'));
       
       const hasDuyenTien = asker.heroes?.some((h, i) => asker.revealedHeroes[i] && h.skills?.some(s => s.id === 'duyen-tien'));
       if (hasDuyenTien) {
           Object.assign(newState, addLog(newState, `✨ ${asker.name} phát động [Duyên Tiên], rút 1 lá bài do dùng Cẩm Nang!`, 'important'));
           newState = drawCardFor(newState, asker.id, 1);
       }
       
       // Đặt lại hàng đợi hỏi Hóa Giải cho tất cả mọi người
       req.askQueue = getAlivePlayers(newState).map(p => p.id);
       return checkDying(newState);
    } else {
       req.askQueue = req.askQueue.filter(id => id !== askerId);
       if (req.askQueue.length === 0) {
          // Không ai Hóa Giải nữa
          if (req.isNegated) {
              Object.assign(newState, addLog(newState, `🚫 Cẩm nang đối với ${newState.players[req.targetId].name} đã bị vô hiệu hóa!`, 'normal'));
              
              if (req.aoeTargets && req.aoeTargets.length > 0) {
                  req.aoeTargets.shift();
                  // Lọc bỏ người đã chết khỏi danh sách
                  req.aoeTargets = req.aoeTargets.filter(id => newState.players[id].isAlive);
                  if (req.aoeTargets.length === 0) {
                      newState = clearTrick(newState);
                  } else {
                      req.targetId = req.aoeTargets[0];
                      req.isNegated = false;
                      req.askQueue = getAlivePlayers(newState).map(p => p.id);
                  }
              } else {
                  newState = clearTrick(newState);
              }
          } else {
              // Cẩm nang CÓ HIỆU LỰC
              if (req.aoeTargets) {
                  if (req.trickType === 'peach_garden') {
                      const t = newState.players[req.targetId];
                      if (t.hp < t.maxHp) {
                          t.hp = Math.min(t.hp + 1, t.maxHp);
                          Object.assign(newState, addLog(newState, `🌸 ${t.name} được hồi 1 HP từ Hồi Xuân!`, 'heal'));
                      }
                      
                      req.aoeTargets.shift();
                      // Lọc bỏ người đã chết
                      req.aoeTargets = req.aoeTargets.filter(id => newState.players[id].isAlive);
                      if (req.aoeTargets.length === 0) {
                          newState = clearTrick(newState);
                      } else {
                          req.targetId = req.aoeTargets[0];
                          req.isNegated = false;
                          req.askQueue = getAlivePlayers(newState).map(p => p.id);
                      }
                  } else if (req.trickType === 'xieng_xich') {
                      const t = newState.players[req.targetId];
                      t.isChained = !t.isChained; // Toggle chain
                      Object.assign(newState, addLog(newState, `⛓️ ${t.name} đã bị ${t.isChained ? 'XÍCH' : 'THÁO XÍCH'}!`, 'important'));
                      
                      req.aoeTargets.shift();
                      // Lọc bỏ người đã chết
                      req.aoeTargets = req.aoeTargets.filter(id => newState.players[id].isAlive);
                      if (req.aoeTargets.length === 0) {
                          newState = clearTrick(newState);
                      } else {
                          req.targetId = req.aoeTargets[0];
                          req.isNegated = false;
                          req.askQueue = getAlivePlayers(newState).map(p => p.id);
                      }
                  } else {
                      // AoE đòi hỏi đánh bài (Loạn Tiễn / Dã Man / PT Kích)
                      req.aoeTargets.shift();
                      req.aoeTargets = req.aoeTargets.filter(id => newState.players[id].isAlive);
                      const nextTargetId = req.aoeTargets.length > 0 ? req.aoeTargets[0] : null;
                      
                      const interruptedNext = nextTargetId ? {
                         type: 'ask_negate',
                         trickType: req.trickType,
                         targetId: nextTargetId,
                         sourceId: req.sourceId,
                         card: req.card,
                         askQueue: getAlivePlayers(newState).map(p => p.id),
                         aoeTargets: req.aoeTargets,
                         isNegated: false
                      } : null;

                      newState.waitingForResponse = {
                         type: 'aoe_trick',
                         trickType: req.trickType,
                         targets: [req.targetId],
                         sourceId: req.sourceId,
                         card: req.card,
                         interruptedEvent: interruptedNext
                      };
                      return checkDying(newState);
                  }
              } else {
                  // Single target trick
                  newState = processTrick(newState, req.trickType, req.sourceId, req.targetId, responsePayload.cardIndexSelected, req.targetCardRef);
                  newState = clearTrick(newState);
              }
          }
       }
       return checkDying(newState);
    }
  }
  
  if (req.type === 'aoe_trick') {
    const targetId = req.targets[0];
    const target = newState.players[targetId];
    const doReact = responsePayload.doReact; // true if they played a card

    if (responsePayload.doBagua) {
       const isRed = processBagua(newState, target);
       if (isRed) {
           responsePayload.doReact = true;
           responsePayload.baguaSuccess = true;
       } else {
           req.baguaAvailable = false;
           return checkDying(newState);
       }
    }

    if (responsePayload.doReact || responsePayload.baguaSuccess) {
      const reqCardName = req.trickType === 'barbarian' ? 'Chém' : 'Né';
      if (req.trickType === 'barbarian') {
          target.hasPlayedSlashThisTurn = true;
      }
      if (!responsePayload.baguaSuccess) {
         if (responsePayload.activeSkill === 'Dời Núi' && responsePayload.virtualCardName === reqCardName) {
            const oppositeCardName = reqCardName === 'Chém' ? 'Né' : 'Chém';
            const cardIdx = target.hand.findIndex(c => c.name === oppositeCardName);
            if (cardIdx >= 0) {
               const played = target.hand.splice(cardIdx, 1)[0];
               played.isVirtual = true;
               played.originalName = played.name;
               played.name = reqCardName;
               newState.playedCards.push(played);
               Object.assign(newState, addLog(newState, `✨ ${target.name} phát động [Dời Núi], dùng ${played.originalName} làm ${reqCardName}!`, 'important'));
            }
         } else if (responsePayload.activeSkill === 'Bọc Trăm Trứng') {
            Object.assign(newState, addLog(newState, `✨ Nhờ [Bọc Trăm Trứng], ${target.name} xem như đã đánh [${reqCardName}] để đỡ!`, 'normal'));
         } else {
            const cardIdx = target.hand.findIndex(c => c.name === reqCardName);
            if (cardIdx >= 0) {
              const played = target.hand.splice(cardIdx, 1)[0];
              newState.playedCards.push(played);
              Object.assign(newState, addLog(newState, `${target.name} đánh [${reqCardName}] để đỡ!`, 'normal'));
            }
         }
      }
    } else {
      let dmg = req.damage || 1;
      // Trừ Rượu nếu là sky_halberd và có uống rượu
      if (req.trickType === 'sky_halberd' && newState.players[req.sourceId].drankWine) {
         dmg = 2;
         // Chỉ xoá drankWine ở target cuối cùng
         if (req.targets.length === 1) {
            newState.players[req.sourceId].drankWine = false;
         }
      }
      newState = dealDamage(newState, targetId, dmg, { sourceId: req.sourceId });
    }

    req.targets.shift(); // Move to next target
    if (req.targets.length === 0) {
       if (newState.waitingForResponse && newState.waitingForResponse.type === 'save') {
           if (req.interruptedEvent) {
               newState.waitingForResponse.interruptedEvent = req.interruptedEvent;
           } else {
               newState.waitingForResponse.interruptedEvent = null;
               if (newState.playedCards && newState.playedCards.length > 0) {
                   newState.discardPile.push(...newState.playedCards);
                   newState.playedCards = [];
               }
           }
       } else {
           if (req.interruptedEvent) {
              newState.waitingForResponse = req.interruptedEvent;
           } else {
              newState = clearTrick(newState);
           }
       }
    } else {
       // Ask next target
       Object.assign(newState, addLog(newState, `Đợi ${newState.players[req.targets[0]].name} phản ứng...`, 'normal'));
    }
    
    if ((responsePayload.doReact || responsePayload.baguaSuccess) && req.trickType !== 'barbarian') {
       const hasPhatToi = target.heroes?.some((h, i) => target.revealedHeroes[i] && h.skills?.some(s => s.id === 'phat-toi'));
       if (hasPhatToi) {
           Object.assign(newState, addLog(newState, `✨ ${target.name} phát động [Phạt Tội], có thể giáng sấm sét!`, 'important'));
           const interceptedResponse = newState.waitingForResponse ? { ...newState.waitingForResponse } : null;
           newState.waitingForResponse = {
               type: 'ask_phat_toi',
               sourceId: target.id,
               interruptedEvent: interceptedResponse
           };
       }
    }
    
    return checkDying(newState);
  }

  // Handle dodge for Slash
  if (req.type === 'dodge') {
    const target = newState.players[req.targetId];
    const source = newState.players[req.sourceId];
    
    // Rượu luôn bị tiêu hao cho dù Chém có trúng hay bị Né
    let dmg = req.baseDamage || 1;
    if (source.drankWine) {
      dmg += 1;
      source.drankWine = false; 
    }

    if (req.unavoidable) {
       // Cannot dodge
       responsePayload.doReact = false;
       responsePayload.doBagua = false;
    }

    if (responsePayload.doBagua) {
       const isRed = processBagua(newState, target);
       if (isRed) {
           responsePayload.doReact = true;
           responsePayload.baguaSuccess = true;
       } else {
           req.baguaAvailable = false;
           return checkDying(newState);
       }
    }

    if (responsePayload.doReact || responsePayload.baguaSuccess) {
      if (!responsePayload.baguaSuccess) {
         if (responsePayload.activeSkill === 'Dời Núi' && responsePayload.virtualCardName === 'Né') {
            const slashIdx = target.hand.findIndex(c => c.name === 'Chém');
            if (slashIdx >= 0) {
               const dodgeCard = target.hand.splice(slashIdx, 1)[0];
               dodgeCard.isVirtual = true;
               dodgeCard.originalName = dodgeCard.name;
               dodgeCard.name = 'Né';
               newState.playedCards.push(dodgeCard);
               Object.assign(newState, addLog(newState, `✨ ${target.name} phát động [Dời Núi], dùng ${dodgeCard.originalName} làm Né!`, 'important'));
            }
         } else {
            const dodgeIdx = target.hand.findIndex(c => c.name === 'Né');
            if (dodgeIdx >= 0) {
              const dodgeCard = target.hand.splice(dodgeIdx, 1)[0];
              newState.playedCards.push(dodgeCard);
              Object.assign(newState, addLog(newState, `${target.name} dùng [Né] tránh đòn!`, 'normal'));
            }
         }
      }
      
      if (req.requiredDodges > 1) {
          req.requiredDodges -= 1;
          Object.assign(newState, addLog(newState, `🛡️ ${target.name} cần thêm ${req.requiredDodges} lá [Né] nữa để chặn [Phá Quân]!`, 'warning'));
          return checkDying(newState); // Tiêp tục chờ thêm Né
      }
      
      Object.assign(newState, addLog(newState, `🛡️ ${target.name} đã né đòn thành công!`, 'success'));
      
      const hasGreenDragon = source.equipment.some(e => e.name === 'Thanh Long Đao');
      const hasRockAxe = source.equipment.some(e => e.name === 'Rìu Đá');
      
      let nextResponse = null;
      let shouldClearTrick = true;

      if (hasGreenDragon && source.hand.some(c => c.name === 'Chém')) {
          nextResponse = {
             type: 'ask_weapon_skill',
             weapon: 'Thanh Long Đao',
             responderId: source.id,
             sourceId: source.id,
             targetId: target.id
          };
         shouldClearTrick = false;
      } else if (hasRockAxe && source.hand.length + source.equipment.length >= 3) { // >=3 cause axe itself is 1
          nextResponse = {
             type: 'ask_weapon_skill',
             weapon: 'Rìu Đá',
             responderId: source.id,
             sourceId: source.id,
             targetId: target.id,
             baseDamage: dmg
          };
         shouldClearTrick = false;
      }

      if (shouldClearTrick) {
          newState = clearTrick(newState);
      }
      
      const hasPhatToi = target.heroes?.some((h, i) => target.revealedHeroes[i] && h.skills?.some(s => s.id === 'phat-toi'));
      if (hasPhatToi) {
          Object.assign(newState, addLog(newState, `✨ ${target.name} phát động [Phạt Tội], có thể giáng sấm sét!`, 'important'));
          newState.waitingForResponse = {
              type: 'ask_phat_toi',
              sourceId: target.id,
              interruptedEvent: nextResponse || null
          };
      } else if (nextResponse) {
          newState.waitingForResponse = nextResponse;
      }
      
      return checkDying(newState);
    } else {
      const hasIronFan = source.equipment.some(e => e.name === 'Quạt Sắt');
      if (hasIronFan && source.hand.length + source.equipment.length >= 3) {
          newState.waitingForResponse = {
             type: 'ask_weapon_skill',
             weapon: 'Quạt Sắt',
             responderId: source.id,
             sourceId: source.id,
             targetId: target.id,
             baseDamage: dmg
          };
         return newState;
      }
      
      // Clear trick BEFORE dealing damage so save doesn't restore a finished dodge event
      newState = clearTrick(newState);
      newState = dealDamage(newState, target.id, dmg, { sourceId: req.sourceId, isSlashOrDuel: true });
      return newState; // dealDamage calls checkDying
    }
    newState = clearTrick(newState);
    return checkDying(newState);
  } 
  
  // Handle duel
  if (req.type === 'duel_slash') {
    const target = newState.players[req.duelTurnId];
    const opponentId = req.duelTurnId === req.targetId ? req.sourceId : req.targetId;
    const opponent = newState.players[opponentId];
    const opponentHasPhaQuan = isPlayerRevealed(opponent) && opponent.heroes?.some((h, i) => opponent.revealedHeroes[i] && h.skills?.some(s => s.id === 'pha-quan'));
    
    if (req.requiredSlashes === undefined) {
        req.requiredSlashes = opponentHasPhaQuan ? 2 : 1;
    }

    if (responsePayload.doReact) {
       target.hasPlayedSlashThisTurn = true;
       if (responsePayload.activeSkill === 'Dời Núi' && responsePayload.virtualCardName === 'Chém') {
            const dodgeIdx = target.hand.findIndex(c => c.name === 'Né');
            if (dodgeIdx >= 0) {
               const slashCard = target.hand.splice(dodgeIdx, 1)[0];
               slashCard.isVirtual = true;
               slashCard.originalName = slashCard.name;
               slashCard.name = 'Chém';
               newState.playedCards.push(slashCard);
               Object.assign(newState, addLog(newState, `✨ ${target.name} phát động [Dời Núi], dùng ${slashCard.originalName} làm Chém!`, 'important'));
            }
       } else if (responsePayload.activeSkill === 'Bọc Trăm Trứng') {
            Object.assign(newState, addLog(newState, `✨ Nhờ [Bọc Trăm Trứng], ${target.name} xem như đã đánh trả 1 [Chém]!`, 'normal'));
       } else {
           const slashIdx = target.hand.findIndex(c => c.name === 'Chém');
           if (slashIdx >= 0) {
             const slashCard = target.hand.splice(slashIdx, 1)[0];
             newState.playedCards.push(slashCard);
             
             Object.assign(newState, addLog(newState, `${target.name} đánh trả 1 [Chém]!`, 'normal'));
           }
        }

        if (req.requiredSlashes > 1) {
            req.requiredSlashes -= 1;
            Object.assign(newState, addLog(newState, `🛡️ [Phá Quân] ép buộc: ${target.name} cần đánh thêm ${req.requiredSlashes} lá [Chém] nữa!`, 'warning'));
            return checkDying(newState);
        }

        newState.waitingForResponse.duelTurnId = opponentId;
        newState.waitingForResponse.requiredSlashes = undefined; // Reset cho lượt đáp trả của người kia
    } else {
      Object.assign(newState, addLog(newState, `${target.name} không có [Chém], thua Quyết Đấu!`, 'damage'));
      
      // Clear trick BEFORE dealing damage so save doesn't restore a finished duel event
      newState = clearTrick(newState);
      newState = dealDamage(newState, req.duelTurnId, 1, { sourceId: req.duelTurnId === req.targetId ? req.sourceId : req.targetId, isSlashOrDuel: true });
      return newState; // dealDamage calls checkDying
    }
    return newState;
  }

  // Handle Mượn Đao
  if (req.type === 'borrow_sword') {
    const targetA = newState.players[req.targetAId];
    const targetB = newState.players[req.targetBId];
    const borrower = newState.players[req.borrowerId];
    
    if (responsePayload.doReact) {
      targetA.hasPlayedSlashThisTurn = true;
      if (responsePayload.activeSkill === 'Bọc Trăm Trứng') {
         Object.assign(newState, addLog(newState, `✨ Nhờ [Bọc Trăm Trứng], ${targetA.name} xem như chém ${targetB.name} theo lệnh ${borrower.name}!`, 'damage'));
         
         const slashCard = newState.playedCards[newState.playedCards.length - 1];
         
         const hasBlackShield = targetB.equipment.some(eq => eq.name === 'Hắc Thuẫn');
         if (hasBlackShield && slashCard.color === 'black') {
            Object.assign(newState, addLog(newState, `🛡️ ${targetB.name} có [Hắc Thuẫn], miễn nhiễm [Chém] đen từ ${targetA.name}!`, 'important'));
            newState = clearTrick(newState);
            return checkDying(newState);
         }
         
         newState.waitingForResponse = {
           type: 'dodge',
           targetId: targetB.id,
           sourceId: targetA.id,
           card: slashCard,
         };
         return checkDying(newState);
      } else {
        // A agrees to slash B
        const slashIdx = responsePayload.cardIndexSelected !== undefined ? responsePayload.cardIndexSelected : targetA.hand.findIndex(c => c.name === 'Chém');
        if (slashIdx >= 0) {
          const slashCard = targetA.hand.splice(slashIdx, 1)[0];
          
          if (responsePayload.activeSkill === 'Dời Núi' && slashCard.name === 'Né') {
             slashCard.isVirtual = true;
             slashCard.originalName = slashCard.name;
             slashCard.name = 'Chém';
             Object.assign(newState, addLog(newState, `✨ ${targetA.name} phát động [Dời Núi], dùng Né làm Chém!`, 'important'));
          } else if (responsePayload.activeSkill === 'Khai Thiên') {
             slashCard.isVirtual = true;
             slashCard.originalName = slashCard.name;
             slashCard.name = 'Chém';
             Object.assign(newState, addLog(newState, `🪓 ${targetA.name} phát động [Khai Thiên], biến ${slashCard.originalName} Đỏ thành Chém!`, 'important'));
          }

          newState.playedCards.push(slashCard);
          Object.assign(newState, addLog(newState, `${targetA.name} chém ${targetB.name} theo lệnh ${borrower.name}!`, 'damage'));
          
          // Hắc Thuẫn logic cho mục tiêu B
          const hasBlackShield = targetB.equipment.some(eq => eq.name === 'Hắc Thuẫn');
          if (hasBlackShield && slashCard.color === 'black') {
             Object.assign(newState, addLog(newState, `🛡️ ${targetB.name} có [Hắc Thuẫn], miễn nhiễm [Chém] đen từ ${targetA.name}!`, 'important'));
             newState = clearTrick(newState);
             return checkDying(newState);
          }
          
          // Now B needs to dodge
          newState.waitingForResponse = {
            type: 'dodge',
            targetId: targetB.id,
            sourceId: targetA.id,
            card: slashCard,
          };
          return checkDying(newState);
        }
      }
    }
    
    // A refuses or can't slash -> give weapon to borrower
    const weaponIdx = targetA.equipment.findIndex(e => 
      !e.name.includes('Ngựa') && e.name !== 'Bát Quái' && e.name !== 'Hắc Thuẫn'
    );
    if (weaponIdx >= 0) {
      const weapon = targetA.equipment.splice(weaponIdx, 1)[0];
      borrower.hand.push(weapon);
      Object.assign(newState, addLog(newState, `${targetA.name} không chém, phải đưa [${weapon.name}] cho ${borrower.name}!`, 'important'));
    }
    
    newState = clearTrick(newState);
    return checkDying(newState);
  }

  return checkDying(newState);
}
