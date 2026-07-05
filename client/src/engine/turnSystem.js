import { PHASES } from '../data/gameData';
import { addLog, getAlivePlayers, isPlayerRevealed, getHandLimit } from './gameState';
import { dealDamage } from './cardEffects';
import { applyPassiveSkills, triggerSkill, SKILL_TRIGGERS } from './skillSystem';
import { SkillRegistry } from './registries/SkillRegistry';

export function drawCards(state, count = 2) {
  const newState = { ...state };
  const player = newState.players[newState.currentPlayerIndex];

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
  Object.assign(newState, addLog(newState, `${player.name} rút ${count} lá bài`, 'normal'));
  return newState;
}

export function advancePhase(state) {
  let newState = { ...state };
  
  // Áp dụng Tỏa Định Kỹ liên tục
  newState = applyPassiveSkills(newState);
  
  // Clear playedCards and push them to discardPile at phase change
  if (newState.playedCards && newState.playedCards.length > 0) {
     newState.discardPile = [...newState.discardPile, ...newState.playedCards];
     newState.playedCards = [];
  }

  const player = newState.players[newState.currentPlayerIndex];

  if (!player.isAlive) {
    return nextTurn(newState);
  }

  switch (newState.phase) {
    case PHASES.BEGIN:
      newState = triggerSkill(SKILL_TRIGGERS.TURN_BEGIN, newState, player);
      
      // (Bánh Chưng đã được chuyển sang SkillRegistry.js)
      
      newState.banhChungUsed = false; // Reset cờ cho lượt sau
      if (player.skipJudgePhase) {
         player.skipJudgePhase = false;
         newState.phase = player.skipDrawPhase ? (player.skipActionPhase ? PHASES.DISCARD : PHASES.ACTION) : PHASES.DRAW;
         Object.assign(newState, addLog(newState, `⏩ ${player.name} bị bỏ qua Giai đoạn Phán xét!`, 'important'));
      } else {
         newState.phase = PHASES.JUDGE;
      }
      break;
    case PHASES.JUDGE:
      if (player.judgementArea && player.judgementArea.length > 0) {
        // Resolve judgements
        let skipAction = false;
        
        while (player.judgementArea.length > 0) {
          const card = player.judgementArea.pop(); // Process last added first
          
          if (newState.deck.length === 0) {
            newState.deck = [...newState.discardPile].reverse();
            newState.discardPile = [];
          }
          
          const judgeCard = newState.deck.pop();
          newState.discardPile.push(judgeCard);
          Object.assign(newState, addLog(newState, `⚖️ Phán xét [${card.name}] của ${player.name}: Rút được ${judgeCard.suit} ${judgeCard.rank}`, 'important'));
          
          if (card.name === 'Sấm Sét') {
            const isSpade = judgeCard.suit === '♠';
            const rankVal = parseInt(judgeCard.rank);
            const is2to9 = !isNaN(rankVal) && rankVal >= 2 && rankVal <= 9;
            
            if (isSpade && is2to9) {
              Object.assign(newState, addLog(newState, `⚡ Sấm Sét giáng xuống! ${player.name} mất 3 HP!`, 'damage'));
              newState = dealDamage(newState, player.id, 3, { damageType: 'lightning' });
              newState.discardPile.push(card);
            } else {
              Object.assign(newState, addLog(newState, `☁️ Sấm Sét bay qua.`, 'normal'));
              // Move to next alive player
              let nextIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
              while (!newState.players[nextIndex].isAlive) {
                nextIndex = (nextIndex + 1) % newState.players.length;
              }
              const nextTarget = newState.players[nextIndex];
              if (!nextTarget.judgementArea) nextTarget.judgementArea = [];
              if (!nextTarget.judgementArea.some(c => c.name === 'Sấm Sét')) {
                 nextTarget.judgementArea.push(card);
                 Object.assign(newState, addLog(newState, `➡️ [Sấm Sét] chuyển sang ${nextTarget.name}`, 'normal'));
              } else {
                 newState.discardPile.push(card);
              }
            }
          } 
          else if (card.name === 'Hỗn Loạn') {
            if (judgeCard.suit === '♥') {
              Object.assign(newState, addLog(newState, `✅ Hỗn Loạn thất bại! (Bốc được Cơ)`, 'normal'));
            } else {
              Object.assign(newState, addLog(newState, `🌀 Hỗn Loạn thành công! ${player.name} mất giai đoạn Ra Bài.`, 'danger'));
              skipAction = true;
            }
            newState.discardPile.push(card);
          }
        }
        
        if (skipAction) {
          player.skipActionPhase = true;
        }
      }
      
      if (player.skipDrawPhase) {
         player.skipDrawPhase = false;
         newState.phase = player.skipActionPhase ? PHASES.DISCARD : PHASES.ACTION;
         if (player.skipActionPhase) {
            player.skipActionPhase = false;
         }
         Object.assign(newState, addLog(newState, `⏩ ${player.name} bị bỏ qua Giai đoạn Rút bài!`, 'important'));
      } else {
         newState.phase = PHASES.DRAW;
      }
      break;
    case PHASES.DRAW:
      const drawPayload = { skillUsed: false, drawCount: 2 };
      newState = triggerSkill(SKILL_TRIGGERS.DRAW_PHASE, newState, player, drawPayload);
      
      if (newState.waitingForResponse) {
          return newState; // Dừng lại chờ người chơi phản hồi
      }
      
      if (!drawPayload.skillUsed) {
         newState = drawCards(newState, drawPayload.drawCount);
      }

      if (player.skipActionPhase) {
        player.skipActionPhase = false;
        if (player.skipDiscardPhase) {
           player.skipDiscardPhase = false;
           newState.phase = PHASES.END;
           Object.assign(newState, addLog(newState, `⏩ ${player.name} bị bỏ qua Giai đoạn Bỏ bài!`, 'important'));
        } else {
           newState.phase = PHASES.DISCARD;
        }
        Object.assign(newState, addLog(newState, `⏩ ${player.name} bị bỏ qua Giai đoạn Ra Bài!`, 'important'));
      } else {
        newState.phase = PHASES.ACTION;
      }
      break;
    case PHASES.ACTION:
      if (player.skipDiscardPhase) {
         player.skipDiscardPhase = false;
         newState.phase = PHASES.END;
         Object.assign(newState, addLog(newState, `⏩ ${player.name} bị bỏ qua Giai đoạn Bỏ bài!`, 'important'));
      } else {
         const hasNhiepChinh = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'nhiep-chinh'));
         if (hasNhiepChinh && !player.hasAttackedThisTurn && !player.hasPlayedSlashThisTurn) {
             Object.assign(newState, addLog(newState, `✨ ${player.name} phát động [Nhiếp Chính], bỏ qua Giai đoạn Bỏ bài do không dùng Chém!`, 'important'));
             newState.phase = PHASES.END;
         } else {
             newState.phase = PHASES.DISCARD;
         }
      }
      break;
    case PHASES.DISCARD:
      newState = discardExcess(newState);
      newState.phase = PHASES.END;
      break;
    case PHASES.END:
      newState = triggerSkill(SKILL_TRIGGERS.END_PHASE, newState, player);
      if (newState.waitingForResponse) {
          return newState;
      }
      return nextTurn(newState);
  }

  return newState;
}

export function discardExcess(state) {
  const newState = { ...state };
  const player = newState.players[newState.currentPlayerIndex];
  const limit = getHandLimit(newState, player.id);
  
  if (player.isBot && player.hand.length > limit) {
    const getPriority = (card) => {
        if (card.name === 'Đào') return 10;
        if (card.name === 'Hóa Giải') return 9;
        if (card.name === 'Rượu') return 8;
        if (card.name === 'Né') return 7;
        if (card.name === 'Chém') return 6;
        if (card.type === 'trick') return 5;
        return 1;
    };
    
    // Sắp xếp bài ưu tiên cao ở đầu mảng, bài cùi bắp ở cuối mảng (để .pop() lấy ra vứt đi)
    player.hand.sort((a, b) => getPriority(b) - getPriority(a));
    
    while (player.hand.length > limit && player.hand.length > 0) {
      const discarded = player.hand.pop();
      newState.discardPile.push(discarded);
    }
  }
  
  return newState;
}

export function nextTurn(state) {
  const newState = { ...state };
  
  // Reset turn vars
  const currentPlayer = newState.players[newState.currentPlayerIndex];
  if (currentPlayer) {
    currentPlayer.hasAttackedThisTurn = false;
    currentPlayer.hasPlayedSlashThisTurn = false;
    currentPlayer.attackCountThisTurn = 0;
    currentPlayer.thuyToUsedThisTurn = false;
    currentPlayer.askedDaTrach = false;
    currentPlayer.askedKhoiNghia = false;
    currentPlayer.askedDuongQuan = false;
    currentPlayer.phatTamFinished = false;
    currentPlayer.khoiNghiaActive = false;
    currentPlayer.tuChuUsedThisTurn = false;
    currentPlayer.tienPhongUsedThisTurn = false;
    currentPlayer.askedDoatSao = false;
    
    // Add missing UsedThisTurn flags
    currentPlayer.bachDangUsedThisTurn = false;
    currentPlayer.dieuDuocUsedThisTurn = false;
    currentPlayer.duyenThoUsedThisTurn = false;
    currentPlayer.tamCongUsedThisTurn = false;
    currentPlayer.hoaThanUsedThisTurn = false;
    currentPlayer.binhLoanUsedThisTurn = false;
    currentPlayer.bocTramTrungUsedThisTurn = false;
    currentPlayer.trungDungUsedThisTurn = false;
    currentPlayer.vanDonUsedThisTurn = false;
    currentPlayer.thuyToTargetsThisTurn = [];
    currentPlayer.thuyToBonusUsed = false;
    currentPlayer.drankWineThisTurn = false;
    currentPlayer.drankWine = false;
    
    // Tự động reset flags từ SkillRegistry (cho các Kỹ năng đã migrate)
    Object.values(SkillRegistry).forEach(skill => {
      if (skill.turnResetFlags) {
        skill.turnResetFlags.forEach(flag => {
          currentPlayer[flag] = false;
        });
      }
    });
  }
  
  // Xóa bỏ các trạng thái tạm thời (Khóa kỹ năng)
  newState.players.forEach(p => {
    p.isSilenced = false;
  });

  // Find next alive
  let nextIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
  let safety = 0;
  while (!newState.players[nextIndex].isAlive && safety < newState.players.length) {
    nextIndex = (nextIndex + 1) % newState.players.length;
    safety++;
  }

  newState.currentPlayerIndex = nextIndex;
  newState.phase = PHASES.BEGIN;
  if (nextIndex === 0) newState.turn += 1;
  
  const nextPlayer = newState.players[nextIndex];
  const revealedNames = nextPlayer.heroes?.filter((h, i) => nextPlayer.revealedHeroes?.[i]).map(h => h.name) || [];
  const heroStr = revealedNames.length > 0 ? `(${revealedNames.join(' & ')})` : '(Tướng Ẩn)';
  Object.assign(newState, addLog(newState, `── Lượt của ${nextPlayer.name} ${heroStr} ──`, 'important'));

  if (nextPlayer.isFlipped) {
      nextPlayer.isFlipped = false;
      Object.assign(newState, addLog(newState, `🔄 ${nextPlayer.name} bị lật mặt tướng, phải bỏ qua lượt và tự lật ngửa lại!`, 'danger'));
      
      // Kích hoạt Chương Dương nếu có
      if (isPlayerRevealed(nextPlayer) && nextPlayer.heroes.some(h => h.skills.some(s => s.id === 'chuong-duong'))) {
          // Bỏ qua 1 lá bài để dời 1 trang bị/phán xét
          newState.waitingForResponse = {
              type: 'ask_chuong_duong_discard',
              sourceId: nextPlayer.id,
              isSkippingTurn: true // Cho biết đang ở đầu lượt bị skip
          };
          return newState; // Dừng lại chờ player vứt bài
      }
      
      return nextTurn(newState); // Gọi đệ quy để qua lượt
  }

  return newState;
}
