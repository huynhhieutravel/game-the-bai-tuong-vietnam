// ==========================================
// Reducer - Thay đổi State (Pure Functions)
// KHÔNG CÓ SIDE EFFECTS Ở ĐÂY (không setTimeout, không alert)
// ==========================================
import { SkillRegistry } from '../registries/SkillRegistry';
import { SeededRNG } from './SeededRNG';

function cloneState(state) {
  return JSON.parse(JSON.stringify(state)); 
}

export function reduce(state, effect) {
  const nextState = cloneState(state);

  switch (effect.type) {
    case 'DAMAGE': {
      const target = nextState.players.find(p => p.id === effect.targetId);
      if (target) {
        target.hp = Math.max(0, target.hp - effect.amount);
        nextState.history.push(`[DAMAGE] ${effect.sourceId} gây ${effect.amount} sát thương cho ${effect.targetId}`);
      }
      break;
    }

    case 'RECOVER': {
      const target = nextState.players.find(p => p.id === effect.targetId);
      if (target && target.hp < target.maxHp) {
        target.hp = Math.min(target.maxHp, target.hp + effect.amount);
        nextState.history.push(`[RECOVER] ${effect.targetId} hồi ${effect.amount} máu`);
      }
      break;
    }

    case 'TURN_OVER': {
      const target = nextState.players.find(p => p.id === effect.targetId);
      if (target) {
        target.isTurnedOver = !target.isTurnedOver;
        nextState.history.push(`[TURN_OVER] ${effect.targetId} lật mặt tướng (${target.isTurnedOver})`);
      }
      break;
    }

    case 'DRAW_CARD': {
      const target = nextState.players.find(p => p.id === effect.targetId);
      if (target) {
        // Nếu hết bài, trộn lại từ mộ (cần random)
        if (nextState.deck.length < effect.amount) {
           const rng = new SeededRNG(nextState.seed);
           nextState.deck = nextState.deck.concat(rng.shuffle(nextState.discardPile));
           nextState.discardPile = [];
           nextState.seed = rng.seed; // CỰC KỲ QUAN TRỌNG: Lưu lại trạng thái ngẫu nhiên mới
        }
        
        const drawnCards = nextState.deck.splice(0, effect.amount);
        target.hand.push(...drawnCards);
        nextState.history.push(`[DRAW] ${effect.targetId} rút ${drawnCards.length} lá bài`);
      }
      break;
    }

    case 'JUDGE': {
      const target = nextState.players.find(p => p.id === effect.targetId);
      if (target) {
        if (nextState.deck.length === 0) {
           const rng = new SeededRNG(nextState.seed);
           nextState.deck = rng.shuffle(nextState.discardPile);
           nextState.discardPile = [];
           nextState.seed = rng.seed; // CỰC KỲ QUAN TRỌNG
        }
        const judgeCard = nextState.deck.pop();
        // TODO: Chờ reaction đổi phán xét (như Ứng Biến, Quân Cơ)
        nextState.history.push(`[JUDGE] ${target.id} phán xét ra ${judgeCard.suit} ${judgeCard.rank}`);
      }
      break;
    }

    case 'RESET_TURN_FLAGS': {
      const target = nextState.players.find(p => p.id === effect.targetId);
      if (target) {
        target.attackCountThisTurn = 0;
        target.drankWineThisTurn = false;
        target.drankWine = false;
        target.hasAttackedThisTurn = false;
        target.hasPlayedSlashThisTurn = false;
        target.isSilenced = false;
        
        Object.values(SkillRegistry).forEach(skill => {
          if (skill.turnResetFlags) {
            skill.turnResetFlags.forEach(flag => {
              target[flag] = false;
            });
          }
        });
      }
      break;
    }

    case 'MOVE_CARD': {
      // Xóa bài khỏi nguồn
      let movedCard = null;
      if (effect.fromZone === 'hand') {
         const player = nextState.players.find(p => p.id === effect.fromPlayerId);
         if (player) {
            const cardIndex = player.hand.findIndex(c => c.id === effect.cardId);
            if (cardIndex !== -1) {
               [movedCard] = player.hand.splice(cardIndex, 1);
            }
         }
      } else if (effect.fromZone === 'judgement' || effect.fromZone === 'judgementArea') {
         const player = nextState.players.find(p => p.id === effect.fromPlayerId);
         if (player) {
            if (!player.judgementArea) player.judgementArea = [];
            const cardIndex = player.judgementArea.findIndex(c => c.id === effect.cardId);
            if (cardIndex !== -1) {
               [movedCard] = player.judgementArea.splice(cardIndex, 1);
            }
         }
      } else if (effect.fromZone === 'discardPile') {
         const cardIndex = nextState.discardPile.findIndex(c => c.id === effect.cardId);
         if (cardIndex !== -1) {
            [movedCard] = nextState.discardPile.splice(cardIndex, 1);
         }
      } else if (effect.fromZone === 'equipment') {
         const player = nextState.players.find(p => p.id === effect.fromPlayerId);
         if (player) {
            const cardIndex = player.equipment.findIndex(c => c.id === effect.cardId);
            if (cardIndex !== -1) {
               [movedCard] = player.equipment.splice(cardIndex, 1);
            }
         }
      } else if (effect.fromZone === 'playedCards') {
         if (nextState.playedCards) {
             const cardIndex = nextState.playedCards.findIndex(c => c.id === effect.cardId);
             if (cardIndex !== -1) {
                [movedCard] = nextState.playedCards.splice(cardIndex, 1);
             }
         }
      }

      if (!movedCard) break;

      // Nếu có virtualCardName, đóng dấu lên lá bài (để dùng cho các vùng tồn tại lâu dài)
      if (effect.virtualCardName) {
         movedCard.virtualName = effect.virtualCardName;
      } else {
         delete movedCard.virtualName; // Xóa dấu nếu di chuyển bình thường
      }

      // Thêm bài vào đích
      if (effect.toZone === 'discardPile') {
         nextState.discardPile.push(movedCard);
      } else if (effect.toZone === 'judgement' || effect.toZone === 'judgementArea') {
         const targetPlayer = nextState.players.find(p => p.id === effect.toPlayerId);
         if (targetPlayer) {
            if (!targetPlayer.judgementArea) targetPlayer.judgementArea = [];
            targetPlayer.judgementArea.push(movedCard);
         }
      } else if (effect.toZone === 'hand') {
         const targetPlayer = nextState.players.find(p => p.id === effect.toPlayerId);
         if (targetPlayer) {
            targetPlayer.hand.push(movedCard);
         }
      } else if (effect.toZone === 'equipment') {
         const targetPlayer = nextState.players.find(p => p.id === effect.toPlayerId);
         if (targetPlayer) {
            targetPlayer.equipment.push(movedCard);
         }
      } else if (effect.toZone === 'playedCards') {
         if (!nextState.playedCards) nextState.playedCards = [];
         nextState.playedCards.push(movedCard);
      }
      
      break;
    }

    case 'SET_FLAG': {
      // Thay cho: player.xxxUsedThisTurn = true
      // Usage: SetFlagEffect(playerId, 'tamCongUsedThisTurn', true)
      if (effect.playerId !== undefined && effect.playerId !== null) {
        const target = nextState.players.find(p => p.id === effect.playerId);
        if (target) {
          target[effect.flag] = effect.value;
        }
      } else {
        // Global flag (không thuộc player nào)
        nextState[effect.flag] = effect.value;
      }
      break;
    }

    case 'SET_WAITING': {
      // Thay cho: dispatcher.state.waitingForResponse = { ... }
      // Usage: SetWaitingEffect({ type: 'ask_xxx', sourceId: 0, ... })
      // Hoặc: SetWaitingEffect(null) để clear
      nextState.waitingForResponse = effect.value;
      break;
    }

    case 'ADD_LOG': {
      // Thay cho: dispatcher.addLog('...')
      // Usage: AddLogEffect('message', 'type')
      nextState.history.push(effect.message);
      break;
    }

    case 'PUSH_EVENT': {
      // Thay cho: dispatcher.state.reactionStack.push({ ... })
      // Usage: PushEventEffect({ type: 'EVENT_XXX', payload: { ... } })
      nextState.reactionStack.push(effect.event);
      break;
    }

    default:
      console.warn('Unknown effect type:', effect.type);
  }

  return nextState;
}
