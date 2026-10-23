import { getAlivePlayers, addLog, isPlayerRevealed, getPlayerFaction, hasSkill, getPlayerGender } from '../../gameState.js';
import * as Effects from '../../core/Effects.js';
import { HeroRegistry } from '../HeroRegistry.js';
import { canUseSkill } from '../../rules/SkillRules.js';
import * as Actions from '../../core/Actions.js';
import { getAttackRange, getDistance } from '../../rangeSystem.js';
import { SKILL_TYPES } from './constants.js';
import { CARD_TYPES, CARD_SUBTYPES, CARD_SUITS } from '../../../constants/cardTypes.js';
import { getCardSubType } from '../../../data/gameData.js';
import { SeededRNG } from '../../core/SeededRNG.js';

const rankToNumber = (rank) => {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    return parseInt(rank) || 0;
};

export const combatSkills = {
  'thuy-to': {
    id: 'thuy-to',
    name: 'Thủy Tổ',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
      if (state.currentPlayerIndex !== player.id || player.hand.length === 0) return false;
      const validTargets = getAlivePlayers(state).filter(p => p.id !== player.id && !(player.thuyToTargetsThisTurn || []).includes(p.id));
      return validTargets.length > 0;
    },
    getValidTargets: (state, player) => {
      return getAlivePlayers(state).filter(p => p.id !== player.id && !(player.thuyToTargetsThisTurn || []).includes(p.id));
    },
    onUse: (dispatcher, state, playerId, targets) => {
      const player = state.players.find(p => p.id === playerId);
      dispatcher.applyEffect(Effects.SetWaitingEffect({
         type: 'ask_thuy_to',
         responderId: playerId, // Must be responderId for ModalContainer
         sourceId: playerId, // Thêm sourceId để onReact không bị lỗi
         maxCards: player.hand.length,
         targetsUsed: player.thuyToTargetsThisTurn || []
      }));
    },
    onReact: (dispatcher, state, payload) => {
      const req = (payload && payload.req) || state.waitingForResponse;
      if (!req) return;
      
      const sourceId = req.sourceId;
      const player = state.players.find(p => p.id === sourceId);
      
      if (req.type === 'ask_thuy_to') {
         if (payload.canceled) {
            dispatcher.applyEffect(Effects.SetWaitingEffect(null));
            return;
         }
         
         const { selectedAlly, selectedCards } = payload;
         if (selectedAlly !== undefined && selectedCards && selectedCards.length > 0) {
            if (!player.thuyToTargetsThisTurn) player.thuyToTargetsThisTurn = [];
            if (player.thuyToTargetsThisTurn.includes(selectedAlly)) {
                dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                return;
            }
            player.thuyToTargetsThisTurn.push(selectedAlly);
            dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'thuyToUsedThisTurn', true));
            
            const cardIdsToMove = payload.selectedCardIds || [...selectedCards].sort((a, b) => b - a).map(idx => player.hand[idx].id);
            
            {
               cardIdsToMove.forEach(cardId => {
                  dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'hand', sourceId, selectedAlly));
               });
               
               dispatcher.applyEffect(Effects.SetWaitingEffect(null));
               
               if (selectedCards.length >= 2 && !player.thuyToBonusUsed) {
                  dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'thuyToBonusUsed', true));
                  dispatcher.applyEffect(Effects.SetWaitingEffect({
                     type: 'ask_thuy_to_bonus',
                     sourceId: sourceId
                  }));
               } else {
               }
            }
         }
      } 
      else if (req.type === 'ask_thuy_to_bonus') {
         if (payload.canceled) {
            dispatcher.applyEffect(Effects.SetWaitingEffect(null));
            return;
         }
         
         const { virtualCardName, targetId } = payload;
         dispatcher.applyEffect(Effects.SetWaitingEffect(null));
         
         if (virtualCardName) {
            // Đây là đánh bài ảo, tạo virtual action
            {
               const targets = targetId !== undefined && targetId !== null && targetId !== '' ? [targetId] : [];
               
               // Cần tìm ID của lá bài cơ bản nếu muốn dùng PlayCardAction hợp lệ (chữ ký: index, cardId, targets, virtualCardName)
               // Nhưng thẻ bài không tồn tại (ảo), nên ta có thể nhét -1 hoặc null.
               dispatcher.dispatchAction(Actions.PlayCardAction(sourceId, 'virtual_thuy_to', targets, virtualCardName));
               
            }
         } else {
         }
      }
    },
    turnResetFlags: ['thuyToUsedThisTurn', 'thuyToTargetsThisTurn', 'thuyToBonusUsed'],
    aiConfig: {
      priority: 5,
      condition: (state, bot, targets) => false,
    }
  },



  'tu-chu': {
    id: 'tu-chu',
    name: 'Tự Chủ',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.tuChuUsedThisTurn) return false;
       if (player.hand.length === 0) return false;
       const validTargets = state.players.filter(p => p.id !== player.id && p.isAlive && p.hp > player.hp && p.hand.length > 0);
       return validTargets.length > 0;
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.id !== player.id && p.isAlive && p.hp > player.hp && p.hand.length > 0);
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_tu_chu', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || (req.type !== 'ask_tu_chu' && req.type !== 'ask_tu_chu_target')) return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (req.type === 'ask_tu_chu') {
           if (payload.canceled || !payload.doUse) {
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           } else if (payload.doUse && payload.targetId !== undefined && payload.cardIdx !== undefined) {
              dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'tuChuUsedThisTurn', true));
              const target = state.players.find(p => p.id === payload.targetId);
              
              if (!target || target.hand.length === 0) {
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                 return;
              }
              
              let pCardIdx = payload.cardId !== undefined ? player.hand.findIndex(c => c.id === payload.cardId) : payload.cardIdx;
              if (pCardIdx === -1) pCardIdx = 0;
              const playerCard = player.hand.splice(pCardIdx, 1)[0];
              
              const rng = new SeededRNG(state.seed);
              const randIdx = Math.floor(rng.next() * target.hand.length);
              state.seed = rng.seed;
              const targetCard = target.hand.splice(randIdx, 1)[0];
              
              state.playedCards.push(playerCard, targetCard);
              dispatcher.addLog(`⚔️ ${player.name} dùng [Tự Chủ] đấu điểm với ${target.name}!`, 'important');
              dispatcher.addLog(`${player.name} ra [${playerCard.name} - ${playerCard.suit}${playerCard.rank}]`, 'normal');
              dispatcher.addLog(`${target.name} ra [${targetCard.name} - ${targetCard.suit}${targetCard.rank}]`, 'normal');
              
              const pRank = rankToNumber(playerCard.rank);
              const tRank = rankToNumber(targetCard.rank);
              
              if (pRank > tRank) {
                  dispatcher.addLog(`🎉 ${player.name} THẮNG Đấu Điểm!`, 'success');
                  dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                  dispatcher.state.reactionStack.push({
                      type: 'EVENT_TRIGGER_SKILL_ASK',
                      payload: { request: { type: 'ask_tu_chu_target', sourceId: player.id, duelTargetId: target.id, skillId: 'tu-chu' } }
                  });
              } else {
                  dispatcher.addLog(`💔 ${player.name} KHÔNG THẮNG Đấu Điểm!`, 'danger');
                  dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                  dispatcher.state.reactionStack.push({
                      type: 'EVENT_DAMAGE',
                      payload: { sourceId: target.id, targetId: player.id, amount: 1, damageType: 'normal' }
                  });
               }
            } else {
               dispatcher.applyEffect(Effects.SetWaitingEffect(null));
            }
       } else if (req.type === 'ask_tu_chu_target') {
           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           if (!payload.canceled && payload.targetId !== undefined) {
               dispatcher.state.reactionStack.push({
                   type: 'EVENT_DAMAGE',
                   payload: { sourceId: req.duelTargetId, targetId: payload.targetId, amount: 1, damageType: 'normal' }
               });
               const duelTarget = state.players.find(p => p.id === req.duelTargetId);
               const finalTarget = state.players.find(p => p.id === payload.targetId);
               if (duelTarget && finalTarget) {
                   dispatcher.addLog(`🎯 ${player.name} ép ${duelTarget.name} gây 1 sát thương cho ${finalTarget.name}!`, 'danger');
               }
           }
       }
    },
    turnResetFlags: ['thuyToTargetsThisTurn', 'thuyToUsedThisTurn', 'thuyToBonusUsed'],
    aiConfig: { priority: 8, condition: (state, bot, targets) => {
        if (bot.vanDonUsedThisTurn || bot.hand.length === 0) return false;
        const enemies = state.players.filter(p => p.id !== bot.id && p.isAlive && p.hand.length > 0 && bot.role !== p.role);
        return enemies.length > 0;
    }}
  },

  'tien-phong': {
    id: 'tien-phong',
    name: 'Tiên Phong',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.tienPhongUsedThisTurn) return false;
       const hasWeapon = player.equipment.some(eq => {
           return getCardSubType(eq) === CARD_SUBTYPES.EQUIP_WEAPON;
       });
       if (player.hp <= 1 && !hasWeapon) return false;
       return true;
    },
    getValidTargets: (state, player) => {
       const atkRange = getAttackRange(state, player.id);
       return state.players.filter(p => p.id !== player.id && p.isAlive && getDistance(state, player.id, p.id) <= atkRange);
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_tien_phong', sourceId: playerId, targetId: targets[0], responderId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_tien_phong') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.doUse) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doUse && payload.targetId !== undefined && payload.costType !== undefined) {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'tienPhongUsedThisTurn', true));
          const target = state.players.find(p => p.id === payload.targetId);
          
          if (!target) {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             return;
          }
          
          
             {
                 let costPaid = false;
                 if (payload.costType === 'hp') {
                     dispatcher.addLog(`🩸 ${player.name} tự mất 1 HP để phát động [Tiên Phong]!`, 'damage');
                     dispatcher.state.reactionStack.push({
                         type: 'EVENT_DAMAGE',
                         payload: { sourceId: player.id, targetId: player.id, amount: 1, damageType: 'normal' }
                     });
                     costPaid = true;
                 } else if (payload.costType === 'weapon') {
                     const weapon = player.equipment.find(eq => getCardSubType(eq) === CARD_SUBTYPES.EQUIP_WEAPON);
                     if (weapon) {
                         dispatcher.applyEffect(Effects.MoveCardEffect(weapon.id, 'equipment', 'discardPile', player.id, null));
                         dispatcher.addLog(`🗡️ ${player.name} bỏ vũ khí [${weapon.name}] để phát động [Tiên Phong]!`, 'important');
                         costPaid = true;
                     }
                 }
                 
                 if (costPaid) {
                     dispatcher.addLog(`⚔️ [Tiên Phong] giáng xuống ${target.name}!`, 'important');
                     dispatcher.state.reactionStack.push({
                         type: 'EVENT_DAMAGE',
                         payload: { sourceId: player.id, targetId: target.id, amount: 1, damageType: 'normal' }
                     });
                 }
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          
       }
    },
    turnResetFlags: ['tienPhongUsedThisTurn'],
    aiConfig: { priority: 9, condition: (state, bot, targets) => false }
  },

  'dieu-duoc': {
    id: 'dieu-duoc',
    name: 'Diệu Dược',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.dieuDuocUsedThisTurn) return false;
       if (player.hand.length === 0) return false;
       const validTargets = state.players.filter(p => p.isAlive && p.hp < p.maxHp);
       return validTargets.length > 0;
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.isAlive && p.hp < p.maxHp);
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_dieu_duoc', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_dieu_duoc') return;

       const player = state.players.find(p => p.id === req.sourceId);
       const cardIdx = payload.cardIndex !== undefined ? payload.cardIndex : payload.cardIdx;

       if (payload.canceled || payload.targetId == null || cardIdx === undefined) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'dieuDuocUsedThisTurn', true));
          const target = state.players.find(p => p.id === payload.targetId);
          
          if (!target) {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             return;
          }
          
          
             {
                 const discardedCard = player.hand[cardIdx];
                 dispatcher.applyEffect(Effects.MoveCardEffect(discardedCard.id, 'hand', 'discardPile', player.id, null));
                 
                 dispatcher.addLog(`✨ ${player.name} phát động [Diệu Dược], bỏ ${discardedCard.name} để hồi 1 HP cho ${target.name}!`, 'heal');
                 dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          
       }
    },
    turnResetFlags: ['dieuDuocUsedThisTurn'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'chuong-duong': {
    id: 'chuong-duong',
    name: 'Chương Dương',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const req = (payload && payload.req) || state.waitingForResponse;
        if (!req) return;
        
        if (req.type === 'ask_chuong_duong_discard') {
            const player = state.players.find(p => p.id === req.sourceId);
            if (payload.doUse && (payload.cardIndexSelected !== undefined || payload.cardIds)) {
                if (payload.cardIds) {
                     payload.cardIds.forEach(cid => {
                         const idx = player.hand.findIndex(c => c.id === cid);
                         if (idx !== -1) {
                             const card = player.hand.splice(idx, 1)[0];
                             state.discardPile.push(card);
                         }
                     });
                 } else {
                     let cardIdx = payload.cardId !== undefined ? player.hand.findIndex(c => c.id === payload.cardId) : payload.cardIndexSelected;
                     if (cardIdx !== -1) {
                         const card = player.hand.splice(cardIdx, 1)[0];
                         state.discardPile.push(card);
                     }
                 }
                
                dispatcher.addLog(`🗑️ ${player.name} bỏ 1 lá bài để kích hoạt [Chương Dương]!`, 'important');
                
                state.waitingForResponse = {
                    type: 'ask_chuong_duong_move',
                    sourceId: player.id,
                    isSkippingTurn: req.isSkippingTurn
                };
            } else {
                state.waitingForResponse = null;
                if (req.isSkippingTurn) {
                    state.waitingForResponse = null;
                    dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId: req.sourceId } });
                }
            }
        }
        else if (req.type === 'ask_chuong_duong_move') {
            if (payload.doUse && payload.fromPlayerId !== undefined && payload.toPlayerId !== undefined && payload.cardType && payload.cardIdx !== undefined) {
                const player = state.players.find(p => p.id === req.sourceId);
                dispatcher.addLog(`✨ ${player.name} dùng [Chương Dương] di dời thẻ [${payload.cardType}]!`, 'success');
                // Assume moveEquipmentOrJudge is handled elsewhere or simplified
            }
            
            state.waitingForResponse = null;
            if (req.isSkippingTurn) {
                state.waitingForResponse = null;
                dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId: req.sourceId } });
            }
        }
    },
    aiConfig: { priority: 9, condition: () => false }
  },

  'hoa-than': {
    id: 'hoa-than',
    name: 'Hòa Thân',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.hoaThanUsedThisTurn) return false;
       if (player.hand.length === 0) return false;
       const maleCount = state.players.filter(p => p.id !== player.id && p.isAlive && (p.gender === 'Nam' || p.gender === 'Male')).length;
       return maleCount >= 2;
    },
    getValidTargets: (state, player) => {
       // Trong Hòa Thân, target là một mảng 2 người, UI sẽ tự lo phần pick. getValidTargets trả về những người có thể bị chọn.
       return state.players.filter(p => p.id !== player.id && p.isAlive && (p.gender === 'Nam' || p.gender === 'Male'));
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_hoa_than', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_hoa_than') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.targetA || !payload.targetB || payload.cardIndex === undefined) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'hoaThanUsedThisTurn', true));
          
          
             {
                 const discardedCard = player.hand[payload.cardIndex];
                 dispatcher.applyEffect(Effects.MoveCardEffect(discardedCard.id, 'hand', 'discardPile', player.id, null));
                 
                 const targetA = state.players.find(p => p.id === payload.targetA);
                 const targetB = state.players.find(p => p.id === payload.targetB);
                 
                 const suitEmoji = { 'Cơ': '♥️', 'Rô': '♦️', 'Bích': '♠️', 'Tép': '♣️' }[discardedCard.suit] || '';
                 dispatcher.addLog(`✨ ${player.name} vứt [${suitEmoji}${discardedCard.rank} ${discardedCard.name}] phát động [Hòa Thân], ép ${targetA.name} Quyết Đấu với ${targetB.name}!`, 'important');
                 
                 // Đẩy sự kiện dùng lá Quyết Đấu ảo
                 dispatcher.state.reactionStack.push({
                     type: 'EVENT_ACTION_PLAY_CARD',
                     payload: {
                         sourceId: targetA.id,
                         targetId: targetB.id,
                         cardId: null,
                         virtualCardName: 'Quyết Đấu',
                         isVirtual: true,
                         activeSkill: 'hoa-than'
                     }
                 });
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          
       }
    },
    turnResetFlags: ['hoaThanUsedThisTurn'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'hoa-than-an-tu': {
    id: 'hoa-than-an-tu',
    name: 'Hòa Thân',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       const hasDiamond = [...player.hand, ...(player.equipment || [])].some(c => c.suit === 'diamond' || c.suit === 'Rô' || c.suit === 'rô');
       if (!hasDiamond) return false;
       const validTargets = state.players.filter(p => p.id !== player.id && p.isAlive && (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Hỗn Loạn' || c.virtualName === 'hon-loan')));
       return validTargets.length > 0;
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.id !== player.id && p.isAlive && (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Hỗn Loạn' || c.virtualName === 'hon-loan')));
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_hoa_than_an_tu', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_hoa_than_an_tu') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || payload.targetId === undefined || payload.cardIndex === undefined || payload.cardFrom === undefined) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          const fromArea = payload.cardFrom === 'equip' ? 'equipment' : 'hand';
          const discardedCard = player[fromArea][payload.cardIndex];
          
          const target = state.players.find(p => p.id === payload.targetId);
          const suitEmoji = { 'Cơ': '♥️', 'Rô': '♦️', 'Bích': '♠️', 'Tép': '♣️', 'diamond': '♦️' }[discardedCard.suit] || '♦️';
          
          dispatcher.addLog(`✨ ${player.name} vứt [${suitEmoji}${discardedCard.rank} ${discardedCard.name}] phát động [Hòa Thân], ném [Hỗn Loạn] vào ${target.name}!`, 'important');
          
          dispatcher.state.reactionStack.push({
              type: 'EVENT_ACTION_PLAY_CARD',
              payload: {
                  sourceId: player.id,
                  targetId: target.id,
                  cardId: discardedCard.id,
                  virtualCardName: 'Hỗn Loạn',
                  isVirtual: true,
                  activeSkill: 'hoa-than-an-tu'
              }
          });
          
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    aiConfig: { priority: 8, condition: (state, bot, targets) => false }
  },

  'binh-loan': {
    id: 'binh-loan',
    name: 'Bình Loạn',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.hand.length < 2) return false;
       // Kiểm tra xem có 2 lá bài cùng chất không
       const suits = {};
       for (const card of player.hand) {
           suits[card.suit] = (suits[card.suit] || 0) + 1;
           if (suits[card.suit] >= 2) return true;
       }
       return false;
    },
    getValidTargets: (state, player) => {
       // Loạn Tiễn tự động đánh tất cả người chơi khác
       return [];
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_binh_loan', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_binh_loan') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.cardIndexes || payload.cardIndexes.length < 2) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
             const card1 = player.hand[payload.cardIndexes[0]];
             const card2 = player.hand[payload.cardIndexes[1]];
             if (!card1 || !card2 || card1.suit !== card2.suit) {
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                 return;
             }
             {
                 // Prefer cardIds if provided
                 const cardIdsToMove = payload.cardIds || payload.cardIndexes.map(idx => player.hand[idx].id);
                 for (const cardId of cardIdsToMove) {
                     dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', player.id, null));
                 }
                 
                 dispatcher.addLog(`✨ ${player.name} phát động [Bình Loạn], bỏ 2 lá bài cùng chất làm [Loạn Tiễn]!`, 'important');
                 
                 // Kích hoạt Loạn Tiễn
                 dispatcher.state.reactionStack.push({
                     type: 'EVENT_ACTION_PLAY_CARD',
                     payload: {
                         sourceId: player.id,
                         targetId: null,
                         cardId: null,
                         virtualCardName: 'Loạn Tiễn',
                         isVirtual: true,
                         activeSkill: 'binh-loan'
                     }
                 });
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          
       }
    },
    turnResetFlags: [],
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
  },

  'trung-dung': {
    id: 'trung-dung',
    name: 'Trung Dũng',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.trungDungUsedThisTurn) return false;
       if (player.hand.length === 0) return false;
       return true;
    },
    getValidTargets: (state, player) => {
       // Target depends on the virtual card (Chém, Loạn Tiễn, Đào, etc). UI handles it.
       return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_trung_dung', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req) return;

       if (req.type === 'ask_trung_dung') {
           const player = state.players.find(p => p.id === req.sourceId);

           if (payload.canceled) {
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           } else if (payload.virtualCardName && payload.cardIndex !== undefined) {
              const realCard = player.hand[payload.cardIndex];
              dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'trungDungUsedThisTurn', true));
              
              const nextAskQueue = state.players
                  .filter(p => p.isAlive && p.id !== player.id && !hasSkill(p, 'ho-gia'))
                  .map(p => p.id);
              console.log("TRUNG DUNG nextAskQueue:", nextAskQueue, "Players:", state.players.map(p => ({id: p.id, isAlive: p.isAlive, hasHoGia: hasSkill(p, 'ho-gia')})));
                  
              if (nextAskQueue.length > 0) {
                  dispatcher.applyEffect(Effects.SetWaitingEffect({
                      type: 'ask_nghi_ngo',
                      skillId: 'trung-dung',
                      sourceId: player.id,
                      targetId: payload.targetId,
                      virtualCardName: payload.virtualCardName,
                      realCardIndex: payload.cardIndex,
                      realCardName: realCard.name,
                      askQueue: nextAskQueue
                  }));
                  dispatcher.addLog(`✨ ${player.name} phát động [Trung Dũng], úp 1 lá bài và tuyên bố đó là [${payload.virtualCardName}]!`, 'important');
              } else {
                  dispatcher.addLog(`✨ ${player.name} phát động [Trung Dũng], úp 1 lá bài và tuyên bố đó là [${payload.virtualCardName}]!`, 'important');
                  dispatcher.addLog(`✅ Không ai có quyền nghi ngờ! Bài được tính là THẬT!`, 'success');
                  dispatcher.state.reactionStack.push({
                      type: 'EVENT_ACTION_PLAY_CARD',
                      payload: {
                          sourceId: player.id,
                          targetId: payload.targetId,
                          cardId: realCard.id,
                          virtualCardName: payload.virtualCardName,
                          isVirtual: true,
                          activeSkill: 'trung-dung'
                      }
                  });
                  dispatcher.applyEffect(Effects.SetWaitingEffect(null));
              }
           }
       } else if (req.type === 'ask_nghi_ngo') {
           const player = state.players.find(p => p.id === req.sourceId);
           const responderId = req.askQueue[0];
           const responder = state.players.find(p => p.id === responderId);
           
           if (payload.doDoubt) {
               dispatcher.addLog(`👁️ ${responder.name} đã NGHI NGỜ [Trung Dũng] của ${player.name}! Lật bài!`, 'danger');
               
               const realCard = player.hand[req.realCardIndex];
               if (realCard.name === req.virtualCardName) {
                   dispatcher.addLog(`✅ Bài THẬT! Kỹ năng thành công. ${responder.name} bị phạt nhận [Hộ Giá]!`, 'success');
                   responder.hasHoGia = true;
                   
                   dispatcher.state.reactionStack.push({
                       type: 'EVENT_ACTION_PLAY_CARD',
                       payload: {
                           sourceId: player.id,
                           targetId: req.targetId,
                           cardId: realCard.id,
                           virtualCardName: req.virtualCardName,
                           isVirtual: true,
                           activeSkill: 'trung-dung'
                       }
                   });
               } else {
                   dispatcher.addLog(`❌ Bài GIẢ! (${realCard.name}). Kỹ năng thất bại và lá bài bị bỏ đi!`, 'danger');
                   dispatcher.applyEffect(Effects.MoveCardEffect(realCard.id, 'hand', 'discardPile', player.id, null));
               }
               
               dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           } else {
               req.askQueue.shift();
               if (req.askQueue.length === 0) {
                   dispatcher.addLog(`✅ Không ai nghi ngờ! Bài được tính là THẬT!`, 'success');
                   const realCard = player.hand[req.realCardIndex];
                   dispatcher.state.reactionStack.push({
                       type: 'EVENT_ACTION_PLAY_CARD',
                       payload: {
                           sourceId: player.id,
                           targetId: req.targetId,
                           cardId: realCard.id,
                           virtualCardName: req.virtualCardName,
                           isVirtual: true,
                           activeSkill: 'trung-dung'
                       }
                   });
                   dispatcher.applyEffect(Effects.SetWaitingEffect(null));
               }
               // Else keep waiting for the next person in askQueue
           }
       }
    },
    turnResetFlags: ['trungDungUsedThisTurn'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'bach-dang': {
    id: 'bach-dang',
    name: 'Bạch Đằng',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.bachDangUsedThisTurn) return false;
       if (player.hand.length === 0) return false;
       return true;
    },
    getValidTargets: (state, player) => {
       return [];
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_bach_dang', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_bach_dang') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.cardIndexes || payload.cardIndexes.length === 0) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'bachDangUsedThisTurn', true));
          
          
             {
                 const isAll = payload.cardIds ? payload.cardIds.length === player.hand.length : payload.cardIndexes.length === player.hand.length;
                 const cardIdsToMove = payload.cardIds || payload.cardIndexes.map(idx => player.hand[idx].id);
                 
                 for (const cardId of cardIdsToMove) {
                     dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', player.id, null));
                 }
                 
                 let drawCount = cardIdsToMove.length;
                 if (isAll) drawCount += 1;
                 
                 dispatcher.addLog(`🌊 ${player.name} dùng [Bạch Đằng] bỏ ${payload.cardIndexes.length} lá, rút ${drawCount} lá!`, 'important');
                 dispatcher.applyEffect(Effects.DrawCardEffect(player.id, drawCount));
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          
       }
    },
    turnResetFlags: ['bachDangUsedThisTurn'],
    aiConfig: { priority: 5, condition: (state, bot, targets) => false }
  },

  'lan-sau': {
    id: 'lan-sau',
    name: 'Lặn Sâu',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       return true; // Không giới hạn số lần sử dụng
    },
    getValidTargets: (state, player) => {
       return [];
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_lan_sau', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_lan_sau') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.addLog(`🌊 ${player.name} dùng [Lặn Sâu], mất 1 HP rút 2 lá!`, 'danger');
          
          // Lặn Sâu: Đẩy Draw vào trước, Damage vào sau (LIFO -> Damage sẽ chạy trước)
          dispatcher.state.reactionStack.push({
              type: 'EVENT_DRAW_CARDS',
              payload: { targetId: player.id, amount: 2 }
          });
          
          dispatcher.state.reactionStack.push({
              type: 'EVENT_DAMAGE',
              payload: { sourceId: player.id, targetId: player.id, amount: 1, damageType: 'normal' }
          });
          
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['lanSauUsedThisTurn'],
    aiConfig: { priority: 9, condition: (state, bot, targets) => false }
  },

  'van-don': {
    id: 'van-don',
    name: 'Vân Đồn',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.vanDonUsedThisTurn) return false;
       if (player.hand.length === 0) return false;
       const validTargets = state.players.filter(p => p.id !== player.id && p.isAlive && p.hand.length > 0);
       return validTargets.length > 0;
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.id !== player.id && p.isAlive && p.hand.length > 0);
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_van_don', sourceId: playerId, targetId: targets[0], responderId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_van_don') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || payload.targetId == null || payload.cardIndex === undefined) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'vanDonUsedThisTurn', true));
          
          // Lấy lại state mới sau khi applyEffect
          const currentState = dispatcher.state;
          const currentPlayer = currentState.players.find(p => p.id === req.sourceId);
          const target = currentState.players.find(p => p.id === payload.targetId);
          
          if (!target || target.hand.length === 0) {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             return;
          }
          
             let pCardIdx = payload.cardId !== undefined ? currentPlayer.hand.findIndex(c => c.id === payload.cardId) : payload.cardIndex;
             if (pCardIdx === -1) pCardIdx = 0;
             const playerCard = currentPlayer.hand.splice(pCardIdx, 1)[0];
             const randIdx = Math.floor(Math.random() * target.hand.length);
             const targetCard = target.hand.splice(randIdx, 1)[0];
             
             currentState.playedCards.push(playerCard, targetCard);
             dispatcher.addLog(`⚔️ ${currentPlayer.name} dùng [Vân Đồn] đấu điểm với ${target.name}!`, 'important');
             dispatcher.addLog(`${currentPlayer.name} ra [${playerCard.name} - ${playerCard.suit}${playerCard.rank}]`, 'normal');
             dispatcher.addLog(`${target.name} ra [${targetCard.name} - ${targetCard.suit}${targetCard.rank}]`, 'normal');
             
             const pRank = rankToNumber(playerCard.rank);
             const tRank = rankToNumber(targetCard.rank);
             
             if (pRank > tRank) {
                 dispatcher.addLog(`🎉 ${currentPlayer.name} THẮNG Đấu Điểm! Trong lượt này được dùng thêm 1 lá [Chém], không giới hạn khoảng cách và chọn được 2 mục tiêu.`, 'success');
                 dispatcher.applyEffect(Effects.SetFlagEffect(currentPlayer.id, 'vanDonWin', true));
             } else {
                 dispatcher.addLog(`💔 ${currentPlayer.name} KHÔNG THẮNG Đấu Điểm! Trong lượt này không được dùng [Chém].`, 'danger');
                 dispatcher.applyEffect(Effects.SetFlagEffect(currentPlayer.id, 'vanDonLose', true));
             }
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          
       }
    },
    turnResetFlags: ['vanDonUsedThisTurn', 'vanDonWin', 'vanDonLose'],
    aiConfig: { priority: 8, condition: (state, bot, targets) => {
        if (bot.vanDonUsedThisTurn || bot.hand.length === 0) return false;
        const enemies = state.players.filter(p => p.id !== bot.id && p.isAlive && p.hand.length > 0 && bot.role !== p.role);
        return enemies.length > 0;
    }}
  },

  'duyen-tho': {
    id: 'duyen-tho',
    name: 'Duyên Thơ',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.duyenThoUsedThisTurn) return false;
       if (player.hand.length < 2) return false;
       const validTargets = state.players.filter(p => p.id !== player.id && p.isAlive && p.hp < p.maxHp && (getPlayerGender(p) === 'Nam' || getPlayerGender(p) === 'Male'));
       return validTargets.length > 0;
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.id !== player.id && p.isAlive && p.hp < p.maxHp && (getPlayerGender(p) === 'Nam' || getPlayerGender(p) === 'Male'));
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_duyen_tho', sourceId: playerId, targetId: targets[0], responderId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_duyen_tho') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || payload.targetId == null || !payload.cardIndexes || payload.cardIndexes.length < 2) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'duyenThoUsedThisTurn', true));
          const target = state.players.find(p => p.id === payload.targetId);
          
          if (!target) {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             return;
          }
          
          
             {
                 const cardIdsToMove = payload.cardIds || payload.cardIndexes.map(idx => player.hand[idx].id);
                 for (const cardId of cardIdsToMove) {
                     dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', player.id, null));
                 }
                 
                 dispatcher.addLog(`🌸 ${player.name} dùng [Duyên Thơ] hồi 1 HP cho bản thân và ${target.name}!`, 'heal');
                 dispatcher.applyEffect(Effects.RecoverEffect(player.id, 1));
                 dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          
       }
    },
    turnResetFlags: ['duyenThoUsedThisTurn'],
    aiConfig: { priority: 9, condition: (state, bot, targets) => false }
  },

  'thiet-ma': {
    id: 'thiet-ma',
    name: 'Thiết Mã',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'doi-nui': {
    id: 'doi-nui',
    name: 'Dời Núi',
    type: SKILL_TYPES.ACTIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'tien-duyen-active': {
    id: 'tien-duyen-active',
    name: 'Tiên Duyên',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (state.currentPlayerIndex !== player.id) return false;
       return player.hand.some(c => c.suit === CARD_SUITS.CLUB);
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.isAlive);
    },
    onUse: (dispatcher, state, playerId, targets, options) => {
       const player = state.players.find(p => p.id === playerId);
       const cardId = options?.cardIds?.[0];
       if (!cardId) return;
       const card = player.hand.find(c => c.id === cardId && c.suit === CARD_SUITS.CLUB);
       if (!card) return;
       if (targets && targets.length > 2) return;
       
       if (!targets || targets.length === 0) {
           dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId, null));
           dispatcher.addLog(`✨ ${player.name} phát động [Tiên Duyên], rèn lại 1 lá bài ♣!`, 'important');
           dispatcher.applyEffect(Effects.DrawCardEffect(playerId, 1));
       } else {
           dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'playedCards', playerId, null));
           dispatcher.addLog(`✨ ${player.name} phát động [Tiên Duyên], dùng bài ♣ làm [Xiềng Xích]!`, 'important');
           dispatcher.state.reactionStack.push({
               type: 'EVENT_ACTION_PLAY_CARD',
               payload: {
                   sourceId: playerId,
                   targets: targets,
                   cardId: null, // Truyền null vì đã vứt vật lý ở trên
                   virtualCardName: 'Xiềng Xích',
                   isVirtual: true,
                   activeSkill: 'tien-duyen-active'
               }
           });
       }

    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'tien-duyen-passive': {
    id: 'tien-duyen-passive',
    name: 'Tiên Duyên (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'khai-thien': {
    id: 'khai-thien',
    name: 'Khai Thiên',
    type: SKILL_TYPES.ACTIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'than-giap': {
    id: 'than-giap',
    name: 'Thần Giáp (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      before_EVENT_ASK_DODGE: (dispatcher, state, playerId, payload) => {
         // Kích hoạt khi bản thân bị yêu cầu Né và KHÔNG CÓ Bát Quái / Hắc Thuẫn
         if (payload.targetId === playerId && !payload.isBatQuaiJudged && !payload.unavoidable) {
            const player = state.players.find(p => p.id === playerId);
            if (player && !player.equipment.some(e => e.name === 'Bát Quái' || e.name === 'Hắc Thuẫn')) {
                dispatcher.state.reactionStack.push({
                   type: 'EVENT_ASK_DODGE',
                   payload: { ...payload, isBatQuaiJudged: true, baguaAvailable: false }
                });
                dispatcher.state.reactionStack.push({
                   type: 'EVENT_JUDGE',
                   payload: { targetId: playerId, reason: 'bat-quai' }
                });
                payload.isCancelled = true;
                return true;
            }
         }
      }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'than-hoa': {
    id: 'than-hoa',
    name: 'Thần Hỏa',
    type: SKILL_TYPES.ACTIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'linh-giam': {
    id: 'linh-giam',
    name: 'Linh Giám',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'hau-vien': {
    id: 'hau-vien',
    name: 'Hậu Viện',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const req = payload.req || state.waitingForResponse;
        if (!req || req.type !== 'ask_hau_vien') return;

        const player = state.players.find(p => p.id === req.sourceId); // The one who played Đào
        
        if (payload.doReact) {
             const target = state.players.find(p => p.id === payload.targetId); // The Hậu Viện user
             dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));
             
                 dispatcher.addLog(`✨ ${player.name} phát động [Hậu Viện], nhường [Đào] cho ${target.name}!`, 'heal');
                 
                     dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 1));
                     dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                 
             
        } else {
             dispatcher.applyEffect(Effects.RecoverEffect(player.id, 1));
             
                 dispatcher.addLog(`${player.name} dùng [Đào] hồi 1 HP (${player.hp}/${player.maxHp})`, 'heal');
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'ky-tap': {
    id: 'ky-tap',
    name: 'Kỳ Tập',
    type: SKILL_TYPES.ACTIVE,
    desc: 'Bạn có thể sử dụng một lá bài Đen như một lá [Tước Bài].',
    canUse: (state, player) => {
      // Cần có bài Đen trên tay (♠ hoặc ♣)
      const hasBlackCard = player.hand.some(c => c.color === 'black');
      if (!hasBlackCard) return false;
      // Cần có mục tiêu hợp lệ (ai đó có bài trên tay, trang bị, hoặc phán xét)
      const hasTarget = state.players.some(p => p.id !== player.id && p.isAlive && 
        (p.hand.length > 0 || p.equipment.length > 0 || (p.judgementArea && p.judgementArea.length > 0)));
      return hasTarget;
    },
    getValidTargets: (state, player) => {
      return state.players.filter(p => p.id !== player.id && p.isAlive && 
        (p.hand.length > 0 || p.equipment.length > 0 || (p.judgementArea && p.judgementArea.length > 0)));
    },
    // Kỳ Tập uses the UI activeSkill pattern: player activates → black cards show as Tước Bài → player selects target
    // The actual card play is handled by GameView using virtualCardName: 'Tước Bài'
    onActivate: (state, player) => {
      return { activeSkill: 'Kỳ Tập' };
    },
    aiConfig: { 
      priority: 7, 
      condition: (state, bot, targets) => {
        const hasBlack = bot.hand.some(c => c.color === 'black');
        return hasBlack && targets.length > 0;
      }
    }
  },

  'binh-ngo': {
    id: 'binh-ngo',
    name: 'Bình Ngô',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'nghe-an-ke': {
    id: 'nghe-an-ke',
    name: 'Nghệ An Kế (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'nhiep-chinh': {
    id: 'nhiep-chinh',
    name: 'Nhiếp Chính',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'nhiep-chinh-2': {
    id: 'nhiep-chinh-2',
    name: 'Nhiếp Chính 2',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'thiet-ve': {
    id: 'thiet-ve',
    name: 'Thiết Vệ',
    type: SKILL_TYPES.REACTION,
    hooks: {
      ON_TARGETED_SLASH: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.id === state.players[state.currentPlayerIndex].id) return false; // Chỉ kích hoạt trong lượt người khác
         if (player.askedThietVe) return false;
         
         if (player.hand.length + player.equipment.length > 0) {
            dispatcher.state.reactionStack.push({
               type: 'EVENT_TRIGGER_SKILL_ASK',
               payload: { request: { type: 'ask_thiet_ve', responderId: player.id, sourceId: player.id, skillId: 'thiet-ve', eventType: 'slash' }}
            });
            return true;
         }
         return false;
      },
      ON_TARGETED_DUEL: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.id === state.players[state.currentPlayerIndex].id) return false; // Chỉ kích hoạt trong lượt người khác
         if (player.askedThietVe) return false;
         
         if (player.hand.length + player.equipment.length > 0) {
            dispatcher.state.reactionStack.push({
               type: 'EVENT_TRIGGER_SKILL_ASK',
               payload: { request: { type: 'ask_thiet_ve', responderId: player.id, sourceId: player.id, skillId: 'thiet-ve', eventType: 'duel' }}
            });
            return true;
         }
         return false;
      },
      END_PHASE: (dispatcher, state, payload) => {
         const player = state.players.find(p => p.id === payload.targetId);
         if (player && player.askedThietVe) {
             dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedThietVe', false));
         }
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_thiet_ve') return;

       const player = state.players.find(p => p.id === req.sourceId);
       
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedThietVe', true));
       let cardId = payload.cardId;
       if (cardId === undefined && payload.cardIndexSelected !== undefined) {
           cardId = player.hand[payload.cardIndexSelected]?.id;
       }

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide && cardId !== undefined) {
          const cardZone = player.hand.some(c => c.id === cardId) ? 'hand' : 'equipment';
          dispatcher.applyEffect(Effects.MoveCardEffect(cardId, cardZone, 'discardPile', player.id, null));
          dispatcher.addLog(`🛡️ ${dispatcher.getHeroName(player)} kích hoạt [Thiết Vệ], bỏ 1 lá bài để vô hiệu hóa đòn tấn công!`, 'success');
          
          if (req.eventType === 'slash') {
                  const askDodgeEvent = dispatcher.state.reactionStack.findIndex(e => e.type === 'EVENT_ASK_DODGE' && e.payload.targetId === player.id);
                  if (askDodgeEvent >= 0) dispatcher.state.reactionStack.splice(askDodgeEvent, 1);
                  
                  const damageEvent = dispatcher.state.reactionStack.findIndex(e => e.type === 'EVENT_DAMAGE' && e.payload.targetId === player.id);
                  if (damageEvent >= 0) {
                      dispatcher.state.reactionStack[damageEvent].payload.isCancelled = true;
                  }
              } else if (req.eventType === 'duel') {
                  const askSlashEvent = dispatcher.state.reactionStack.findIndex(e => e.type === 'EVENT_ASK_SLASH' && e.payload.targetId === player.id);
                  if (askSlashEvent >= 0) dispatcher.state.reactionStack.splice(askSlashEvent, 1);
                  
                  const duelResolveEvent = dispatcher.state.reactionStack.findIndex(e => e.type === 'EVENT_DUEL_RESOLVE');
                  if (duelResolveEvent >= 0) {
                      dispatcher.state.reactionStack[duelResolveEvent].payload.slashReacted = false; // Prevents counter-attack
                      // We must also prevent the damage that EVENT_DUEL_RESOLVE causes when you fail to respond.
                      // We can just remove the EVENT_DUEL_RESOLVE entirely!
                      dispatcher.state.reactionStack.splice(duelResolveEvent, 1);
                  }
              }
              
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           }
    },
    aiConfig: { priority: 9, condition: () => true } // Luôn dùng Thiết Vệ nếu có thể
  },



  'can-gian': {
    id: 'can-gian',
    name: 'Can Gián',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_can_gian') return;

        const asker = state.players.find(p => p.id === req.sourceId);
        const target = state.players.find(p => p.id === req.targetId);
        
        if (payload.doUse) {
             dispatcher.applyEffect(Effects.LoseHpEffect(asker.id, 1));
             
             const updatedAsker = state.players.find(p => p.id === asker.id);
             if (updatedAsker && updatedAsker.hp <= 0) {
                 dispatcher.state.reactionStack.push({ type: 'EVENT_DYING', payload: { targetId: asker.id, sourceId: asker.id } });
             }

             if (target.isAlive) {
                 dispatcher.addLog(`✨ ${asker.name} phát động [Can Gián], mất 1 Sinh lực để ${target.name} rút 2 lá bài!`, 'important');
                 dispatcher.applyEffect(Effects.DrawCardEffect(target.id, 2));
             }
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(req.interruptedEvent || null));
        } else {
             dispatcher.applyEffect(Effects.SetWaitingEffect(req.interruptedEvent || null));
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'quoc-sac': {
    id: 'quoc-sac',
    name: 'Quốc Sắc (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'nam-duoc': {
    id: 'nam-duoc',
    name: 'Nam Dược',
    type: SKILL_TYPES.PASSIVE,
    aiConfig: { priority: 5, condition: () => false }
  },

  'quan-co': {
    id: 'quan-co',
    name: 'Quân Cơ',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const { playerId, doProvide, req, cardId } = payload;
        const player = state.players.find(p => p.id === playerId);
        const isSkipReq = !doProvide || !cardId;
        
        if (!isSkipReq) {
            const playedCard = player.hand.find(c => c.id === cardId);
            console.log('Quân Cơ onReact: playedCard=', playedCard ? playedCard.id : 'null', 'color=', playedCard ? playedCard.color : 'null');
            if (playedCard && playedCard.color === 'black') {
                const oldJudgeCard = state.currentJudgeCard;
                state.currentJudgeCard = playedCard;
                player.hand = player.hand.filter(c => c.id !== playedCard.id);
                if (oldJudgeCard) player.hand.push(oldJudgeCard);
                dispatcher.addLog(`☯️ ${dispatcher.getHeroName(player)} kích hoạt [Quân Cơ], đổi bài phán xét thành [${playedCard.name}]!`, 'success');
                
                // Nếu Quân Cơ được dùng, vòng lặp hỏi chấm dứt
                state.waitingForResponse = null;
                return;
            }
        }
        
        // Bỏ qua hoặc bài không hợp lệ (không phải đen)
        // Chuyển sang người tiếp theo nếu có askQueue
        if (req && req.askQueue && req.askQueue.length > 1) {
             req.askQueue.shift();
             req.responderId = req.askQueue[0];
             // Tiếp tục chờ người tiếp theo
        } else {
             // Hết hàng đợi
             state.waitingForResponse = null;
        }
    }
  }
};
