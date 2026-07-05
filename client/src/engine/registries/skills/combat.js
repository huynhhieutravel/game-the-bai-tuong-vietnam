import { getAlivePlayers, addLog, isPlayerRevealed, getPlayerFaction } from '../../gameState';
import * as Effects from '../../core/Effects';
import { HeroRegistry } from '../HeroRegistry';
import { canUseSkill } from '../../rules/SkillRules';
import * as Actions from '../../core/Actions';
import { getAttackRange, getDistance } from '../../rangeSystem';
import { SKILL_TYPES } from './constants.js';

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
      return state.currentPlayerIndex === player.id && player.hand.length > 0;
    },
    getValidTargets: (state, player) => {
      return getAlivePlayers(state).filter(p => p.id !== player.id);
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
      const req = state.waitingForResponse;
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
            player.thuyToTargetsThisTurn.push(selectedAlly);
            dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'thuyToUsedThisTurn', true));
            
            const sortedIdxs = [...selectedCards].sort((a, b) => b - a);
            const cardIdsToMove = sortedIdxs.map(idx => player.hand[idx].id);
            
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

  'that-tram-so': {
    id: 'that-tram-so',
    name: 'Thất Trảm Sớ',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_that_tram_so') return;
       const player = state.players.find(p => p.id === req.targetId);
       
       if (payload.doReact && payload.discardCards && payload.discardCards.length === 2) {
           payload.discardCards.forEach(cardId => {
               dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', player.id, null));
           });
           dispatcher.addLog(`✨ ${player.name} bỏ 2 lá bài để tránh [Thất Trảm Sớ]!`, 'info');
           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
           dispatcher.applyEffect(Effects.DamageEffect(req.sourceId, player.id, 1, 'normal'));
           if (player.hp <= 0) dispatcher.state.reactionStack.push({ type: 'EVENT_DYING', payload: { targetId: player.id, sourceId: req.sourceId } });
           dispatcher.addLog(`💥 ${player.name} mất 1 máu do [Thất Trảm Sớ]!`, 'important');
           
           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['askedThatTramSo'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
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
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_tu_chu') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.doUse) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doUse && payload.targetId !== undefined && payload.cardIdx !== undefined) {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'tuChuUsedThisTurn', true));
          const target = state.players.find(p => p.id === payload.targetId);
          
          if (!target || target.hand.length === 0) {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             return;
          }
          
          
             const playerCard = player.hand.splice(payload.cardIdx, 1)[0];
             const randIdx = Math.floor(Math.random() * target.hand.length);
             const targetCard = target.hand.splice(randIdx, 1)[0];
             
             state.playedCards.push(playerCard, targetCard);
             dispatcher.addLog(`⚔️ Ngô Quyền dùng [Tự Chủ] đấu điểm với ${target.name}!`, 'important');
             dispatcher.addLog(`${player.name} ra [${playerCard.name} - ${playerCard.suit}${playerCard.rank}]`, 'normal');
             dispatcher.addLog(`${target.name} ra [${targetCard.name} - ${targetCard.suit}${targetCard.rank}]`, 'normal');
             
             const pRank = rankToNumber(playerCard.rank);
             const tRank = rankToNumber(targetCard.rank);
             
             if (pRank > tRank) {
                 dispatcher.addLog(`🎉 ${player.name} THẮNG Đấu Điểm!`, 'success');
                 dispatcher.state.reactionStack.push({
                     type: 'EVENT_TRIGGER_SKILL_ASK',
                     payload: { request: { type: 'ask_tu_chu_target', sourceId: player.id, duelTargetId: target.id } }
                 });
             } else {
                 dispatcher.addLog(`💔 ${player.name} KHÔNG THẮNG Đấu Điểm!`, 'danger');
                 dispatcher.state.reactionStack.push({
                     type: 'EVENT_DAMAGE',
                     payload: { sourceId: target.id, targetId: player.id, amount: 1, damageType: 'normal' }
                 });
             }
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          
       }
    },
    turnResetFlags: ['tuChuUsedThisTurn'],
    aiConfig: { priority: 8, condition: (state, bot, targets) => false }
  },

  'tien-phong': {
    id: 'tien-phong',
    name: 'Tiên Phong',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.tienPhongUsedThisTurn) return false;
       const hasWeapon = player.equipment.some(eq => {
           return eq.subType === 'equip_weapon' || eq.type === 'equip_weapon' || eq.type === 'Vũ khí' || eq.subType === 'Vũ khí';
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
          payload: { request: { type: 'ask_tien_phong', sourceId: playerId, targetId: targets[0] } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
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
                     const weapon = player.equipment.find(eq => eq.subType === 'equip_weapon' || eq.type === 'equip_weapon' || eq.type === 'Vũ khí' || eq.subType === 'Vũ khí');
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
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_dieu_duoc') return;

       const player = state.players.find(p => p.id === req.sourceId);
       const cardIdx = payload.cardIndex !== undefined ? payload.cardIndex : payload.cardIdx;

       if (payload.canceled || !payload.targetId || cardIdx === undefined) {
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
        const req = state.waitingForResponse;
        if (!req) return;
        
        if (req.type === 'ask_chuong_duong_discard') {
            const player = state.players.find(p => p.id === req.sourceId);
            if (payload.doUse && payload.cardIndexSelected !== undefined) {
                // Here we manually drop the card
                const card = player.hand.splice(payload.cardIndexSelected, 1)[0];
                state.discardPile.push(card);
                
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
                    dispatcher.dispatchAction({ type: 'ACTION_END_PHASE', payload: { playerId: req.targetId } });
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
                dispatcher.dispatchAction({ type: 'ACTION_END_PHASE', payload: { playerId: req.targetId } });
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
       const req = state.waitingForResponse;
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
                 
                 dispatcher.addLog(`✨ ${player.name} phát động [Hòa Thân], ép ${targetA.name} Quyết Đấu với ${targetB.name}!`, 'important');
                 
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

  'binh-loan': {
    id: 'binh-loan',
    name: 'Bình Loạn',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.binhLoanUsedThisTurn) return false;
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
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_binh_loan') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.cardIndexes || payload.cardIndexes.length < 2) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'binhLoanUsedThisTurn', true));
          
          
             {
                 // Sort indexes descending to splice safely
                 const cardIdsToMove = payload.cardIndexes.map(idx => player.hand[idx].id);
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
    turnResetFlags: ['binhLoanUsedThisTurn'],
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
       const req = state.waitingForResponse;
       if (!req) return;

       if (req.type === 'ask_trung_dung') {
           const player = state.players.find(p => p.id === req.sourceId);

           if (payload.canceled) {
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           } else if (payload.virtualCardName && payload.cardIndex !== undefined && payload.targetId !== undefined) {
              const realCard = player.hand[payload.cardIndex];
              dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'trungDungUsedThisTurn', true));
              
              const nextAskQueue = state.players
                  .filter(p => p.isAlive && p.id !== player.id)
                  .map(p => p.id);
                  
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
              
           }
       } else if (req.type === 'ask_nghi_ngo') {
           const player = state.players.find(p => p.id === req.sourceId);
           const responderId = req.askQueue[0];
           const responder = state.players.find(p => p.id === responderId);
           
           
               if (payload.doDoubt) {
                   dispatcher.addLog(`👁️ ${responder.name} đã NGHI NGỜ [Trung Dũng] của ${player.name}! Lật bài!`, 'danger');
                   
                   {
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
                           dispatcher.addLog(`❌ Bài GIẢ! (${realCard.name}). Kỹ năng thất bại!`, 'danger');
                       }
                       
                       dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                   }
               } else {
                   req.askQueue.shift();
                   if (req.askQueue.length === 0) {
                       dispatcher.addLog(`✅ Không ai nghi ngờ! Bài được tính là THẬT!`, 'success');
                       
                       {
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
                   }
                   // Else keep waiting for the next person in askQueue, so do nothing here to pause dispatcher
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
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_bach_dang') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.cardIndexes || payload.cardIndexes.length === 0) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'bachDangUsedThisTurn', true));
          
          
             {
                 const isAll = payload.cardIndexes.length === player.hand.length;
                 const sortedIndexes = [...payload.cardIndexes].sort((a,b) => b-a);
                 
                 for (const idx of sortedIndexes) {
                     const card = player.hand.splice(idx, 1)[0];
                     dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id, null));
                 }
                 
                 let drawCount = payload.cardIndexes.length;
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
       if (player.lanSauUsedThisTurn) return false;
       return true;
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
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_lan_sau') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'lanSauUsedThisTurn', true));
          
          
             {
                 dispatcher.addLog(`🌊 ${player.name} dùng [Lặn Sâu], mất 1 HP rút 2 lá!`, 'danger');
                 
                 dispatcher.state.reactionStack.push({
                     type: 'EVENT_DAMAGE',
                     payload: { sourceId: player.id, targetId: player.id, amount: 1, damageType: 'normal' }
                 });
                 
                 dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 2));
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          
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
          payload: { request: { type: 'ask_van_don', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_van_don') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.targetId || payload.cardIndex === undefined) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'vanDonUsedThisTurn', true));
          const target = state.players.find(p => p.id === payload.targetId);
          
          if (!target || target.hand.length === 0) {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             return;
          }
          
          
             const playerCard = player.hand.splice(payload.cardIndex, 1)[0];
             const randIdx = Math.floor(Math.random() * target.hand.length);
             const targetCard = target.hand.splice(randIdx, 1)[0];
             
             state.playedCards.push(playerCard, targetCard);
             dispatcher.addLog(`⚔️ ${player.name} dùng [Vân Đồn] đấu điểm với ${target.name}!`, 'important');
             dispatcher.addLog(`${player.name} ra [${playerCard.name} - ${playerCard.suit}${playerCard.rank}]`, 'normal');
             dispatcher.addLog(`${target.name} ra [${targetCard.name} - ${targetCard.suit}${targetCard.rank}]`, 'normal');
             
             const pRank = rankToNumber(playerCard.rank);
             const tRank = rankToNumber(targetCard.rank);
             
             if (pRank > tRank) {
                 dispatcher.addLog(`🎉 ${player.name} THẮNG Đấu Điểm! ${target.name} chịu 1 sát thương!`, 'success');
                 dispatcher.state.reactionStack.push({
                     type: 'EVENT_DAMAGE',
                     payload: { sourceId: player.id, targetId: target.id, amount: 1, damageType: 'normal' }
                 });
             } else {
                 dispatcher.addLog(`💔 ${player.name} KHÔNG THẮNG Đấu Điểm! ${player.name} chịu 1 sát thương!`, 'danger');
                 dispatcher.state.reactionStack.push({
                     type: 'EVENT_DAMAGE',
                     payload: { sourceId: target.id, targetId: player.id, amount: 1, damageType: 'normal' }
                 });
             }
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          
       }
    },
    turnResetFlags: ['vanDonUsedThisTurn'],
    aiConfig: { priority: 8, condition: (state, bot, targets) => false }
  },

  'duyen-tho': {
    id: 'duyen-tho',
    name: 'Duyên Thơ',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       if (player.duyenThoUsedThisTurn) return false;
       if (player.hand.length < 2) return false;
       const validTargets = state.players.filter(p => p.id !== player.id && p.isAlive && p.hp < p.maxHp && (p.gender === 'Nam' || p.gender === 'Male'));
       return validTargets.length > 0;
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.id !== player.id && p.isAlive && p.hp < p.maxHp && (p.gender === 'Nam' || p.gender === 'Male'));
    },
    onUse: (dispatcher, state, playerId, targets) => {
       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { request: { type: 'ask_duyen_tho', sourceId: playerId } }
       });
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_duyen_tho') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.targetId || !payload.cardIndexes || payload.cardIndexes.length < 2) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'duyenThoUsedThisTurn', true));
          const target = state.players.find(p => p.id === payload.targetId);
          
          if (!target) {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             return;
          }
          
          
             {
                 const sortedIndexes = [...payload.cardIndexes].sort((a,b) => b-a);
                 for (const idx of sortedIndexes) {
                     const card = player.hand.splice(idx, 1)[0];
                     dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id, null));
                 }
                 
                 dispatcher.addLog(`🌸 ${player.name} dùng [Duyên Thơ] hồi 1 HP cho bản thân và ${target.name}!`, 'heal');
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
       return player.hand.some(c => c.suit === '♣');
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.isAlive);
    },
    onUse: (dispatcher, state, playerId, targets, options) => {
       const player = state.players.find(p => p.id === playerId);
       const cardId = options?.cardIds?.[0];
       if (!cardId) return;
       const card = player.hand.find(c => c.id === cardId && c.suit === '♣');
       if (!card) return;
       
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
    onReact: (dispatcher, state, payload) => {
        const { targetId, playerId, doProvide } = payload || {};
        console.log("Phạt Tội payload:", payload, "targetId:", targetId, "playerId:", playerId);
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);
        
        if (!doProvide) return; // Nếu chọn Skip thì bỏ qua

        if (target) {
            dispatcher.addLog(`⚡ ${dispatcher.getHeroName(player)} kích hoạt [Phạt Tội]!`);
            // Phán xét mục tiêu
            dispatcher.state.reactionStack.push({
                type: 'EVENT_JUDGE',
                payload: { targetId, reason: 'phat-toi', sourceId: playerId }
            });
            // Kết thúc request ask_phat_toi
            state.waitingForResponse = null;
        } else {
            // Nếu bỏ qua Phạt Tội
            state.waitingForResponse = null;
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

  'dam-bac': {
    id: 'dam-bac',
    name: 'Đạm Bạc (Tỏa Định Kỹ)',
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
        const req = state.waitingForResponse;
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
                 state.waitingForResponse = null;
             
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

  'thinh-chinh': {
    id: 'thinh-chinh',
    name: 'Thính Chính',
    type: SKILL_TYPES.PASSIVE,
    desc: 'Bạn có thể sử dụng hoặc đánh ra một lá bài Đen trên tay như [Né].',
    // Thính Chính is a conversion skill — treated in the UI layer
    // When player is asked to dodge (ask_dodge), the UI checks if they have this skill
    // and allows black cards to be played as Né (virtualCardName: 'Né')
    // This is similar to how Quốc Sắc converts ♠ → ♥ at the UI/CardRules level
    convertCard: (card) => {
      // Only convert black cards (♠, ♣)
      if (card.color === 'black') {
        return { ...card, virtualName: 'Né', isConverted: true };
      }
      return null;
    },
    aiConfig: { priority: 8, condition: () => false }
  },

  'can-gian': {
    id: 'can-gian',
    name: 'Can Gián',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_can_gian') return;

        const currentAskerId = req.askQueue[0];
        
        if (payload.doReact && payload.cardIndexSelected !== undefined) {
             const asker = state.players.find(p => p.id === currentAskerId);
             const target = state.players.find(p => p.id === req.targetId);
             const card = asker.hand[payload.cardIndexSelected];
             
             asker.hand = asker.hand.filter((_, i) => i !== payload.cardIndexSelected);
             target.hand.push(card);
             
             req.originalReq.isNegated = true;
             req.originalReq.askQueue = []; // Bỏ qua toàn bộ Hóa Giải (Vô T懈) phía sau
             
             
                 dispatcher.addLog(`✨ ${asker.name} phát động [Can Gián], đưa 1 lá bài cho ${target.name} và vô hiệu hóa Cẩm Nang!`, 'important');
                 state.waitingForResponse = req.originalReq; // Phục hồi lại event gốc (ask_negate) nhưng đã rỗng queue và bị negate
             
        } else {
             req.askQueue.shift();
             if (req.askQueue.length > 0) {
                 req.sourceId = req.askQueue[0];
             } else {
                 state.waitingForResponse = req.originalReq; // Trả về ask_negate bình thường
             }
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
                state.discardPile.push(oldJudgeCard);
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
