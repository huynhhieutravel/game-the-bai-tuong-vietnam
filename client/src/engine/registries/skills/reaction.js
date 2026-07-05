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

export const reactionSkills = {
  'tre-nga': {
    id: 'tre-nga',
    name: 'Tre Ngà',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      ON_TARGETED_SLASH: (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.sourceId) return false;
         const player = state.players.find(p => p.id === playerId);
         if (payload.treNgaProcessed) return false;
         payload.treNgaProcessed = true; // Đánh dấu đã xử lý để không bị lặp vô hạn
         
         const target = state.players.find(p => p.id === payload.targetId);
         if (!target || !target.isAlive) return false;
         
         // Tiến hành phán xét
         if (state.deck.length === 0) {
            state.deck = [...state.discardPile].reverse();
            state.discardPile = [];
         }
         const judgeCard = state.deck.pop();
         state.discardPile.push(judgeCard);
         
         // Tre Ngà: phán xét (mô phỏng Thiết Kỵ)
         const suit = judgeCard.suit;
         const isRed = suit === 'heart' || suit === 'diamond';
         
         if (isRed) {
            // Đỏ: Yêu cầu mục tiêu bỏ 1 lá bài mới được né
            dispatcher.state.reactionStack.push({
               type: 'EVENT_ASK_TRE_NGA_DISCARD',
               payload: { sourceId: player.id, targetId: payload.targetId, judgeSuit: suit, dodgeEventPayload: payload }
            });
            return true; // Báo hiệu đã chèn Event mới
         } else {
            // Đen: Tre Ngà không hiệu lực, Né bình thường (DO_ASK_DODGE đã nằm sẵn trong Stack)
            return false;
         }
      }
    },
    onReact: (dispatcher, state, payload) => {
      const req = state.waitingForResponse;
      if (!req || req.type !== 'ask_tre_nga_discard') return;
      
      const target = state.players.find(p => p.id === req.targetId);
      
      if (payload.doDiscard && payload.cardIndexSelected !== undefined) {
         // Người chơi bỏ bài thành công
         const discardedCard = target.hand.splice(payload.cardIndexSelected, 1)[0];
         state.discardPile.push(discardedCard);
         
         {
            dispatcher.addLog(`${target.name} đã bỏ 1 lá bài ${discardedCard.suit} để hóa giải hiệu ứng khóa [Né] của [Tre Ngà]!`, 'normal');
            
            // Xong Tre Ngà, khôi phục lại Dodge event
            dispatcher.applyEffect(Effects.SetWaitingEffect(null));
            req.dodgeEventPayload.treNgaProcessed = true;
            dispatcher.state.reactionStack.push({
               type: 'EVENT_ASK_DODGE',
               payload: req.dodgeEventPayload
            });
         }
      } else {
         // Chịu chém (Không thể né)
         {
            dispatcher.addLog(`💥 ${target.name} không thể (hoặc không muốn) bỏ bài phán xét, không thể dùng [Né]!`, 'danger');
            
            dispatcher.applyEffect(Effects.SetWaitingEffect(null));
            req.dodgeEventPayload.treNgaProcessed = true;
            req.dodgeEventPayload.unavoidable = true; // Khóa Né!
            dispatcher.state.reactionStack.push({
               type: 'EVENT_ASK_DODGE',
               payload: req.dodgeEventPayload
            });
         }
      }
    },
    turnResetFlags: [],
  },

  'hoa-tien': {
    id: 'hoa-tien',
    name: 'Hóa Tiên',
    type: SKILL_TYPES.PASSIVE, // Kích hoạt bị động khi Hấp Hối
    hooks: {
      DYING: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.hoaTienUsed) return false; // Chỉ dùng 1 lần (tương tự Niết Bàn)
         
         // Đẩy Ask Hóa Tiên lên đầu (đè lên DO_DYING đang ở trong Stack)
         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_hoa_tien', targetId: player.id, skillId: 'hoa-tien' } }
         });
         return true; // Báo hiệu đã chèn
      }
    },
    onReact: (dispatcher, state, payload) => {
      const req = state.waitingForResponse;
      if (!req || req.type !== 'ask_hoa_tien') return;
      
      const target = state.players.find(p => p.id === req.targetId);
      
      if (payload.doProvide || payload.responseType === 'yes') {
         // Thực thi Hóa Tiên
         dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'hoaTienUsed', true));
         
         // 1. Vứt toàn bộ bài (tay + trang bị + phán xét)
         const allCards = [...target.hand, ...target.equipment, ...(target.judgementArea || [])];
         allCards.forEach(c => {
             const zone = target.hand.includes(c) ? 'hand' : (target.equipment.includes(c) ? 'equipment' : 'judgementArea');
             {
                 dispatcher.applyEffect(Effects.MoveCardEffect(c.id, zone, 'discardPile', target.id));
             }
         });
         
         // 2. Hồi 3 HP (qua Reducer)
         const newHp = Math.min(3, target.maxHp);
         dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'hp', newHp));
         
         // 3. Rút 3 lá
         {
             dispatcher.applyEffect(Effects.DrawCardEffect(target.id, 3));
             dispatcher.addLog(`🌟 ${target.name} đã hóa thành Tiên! Hồi 3 HP và rút 3 lá bài!`, 'important');
         }
         
         dispatcher.applyEffect(Effects.SetWaitingEffect(null));
         // Bỏ qua EVENT_DYING (vì đã hồi máu) -> Không cần push lại EVENT_DYING
         // Vì EVENT_DYING vẫn còn nằm trong Stack (chưa bị pop nếu hook trả về true)
         // Khi vòng lặp tiếp tục, nó sẽ chạy lại EVENT_DYING, nhưng do HP > 0 nên nó sẽ tự hủy!
      } else {
         // Không dùng Hóa Tiên
         dispatcher.applyEffect(Effects.SetWaitingEffect(null));
         // Tiếp tục EVENT_DYING
      }
    },
    turnResetFlags: [],
  },

  'uy-chan': {
    id: 'uy-chan',
    name: 'Uy Chấn (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (payload.targetId !== player.id) return false;
         if (player.askedUyChan) return false;
         if (payload.sourceId === undefined || payload.sourceId === player.id) return false;

         const sourceCard = state.discardPile.find(c => c.id === payload.sourceCardId);
         if (sourceCard && (sourceCard.suit === 'heart' || sourceCard.suit === 'diamond')) {
            dispatcher.state.reactionStack.push({
               type: 'EVENT_TRIGGER_SKILL_ASK',
               payload: { request: { type: 'ask_uy_chan', sourceId: player.id, targetId: payload.sourceId } }
            });
            return true;
         }
         return false;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_uy_chan') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedUyChan', true));

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide) {
          const target = state.players.find(p => p.id === req.targetId);
          if (target) {
             {
                 dispatcher.addLog(`🐉 Đinh Bộ Lĩnh dùng [Uy Chấn] uy hiếp ${target.name}!`, 'important');
                 
                 if (payload.choice === 'heal' || payload.option === 'heal') {
                     dispatcher.applyEffect(Effects.RecoverEffect(player.id, 1));
                     dispatcher.addLog(`✨ ${player.name} được hồi 1 HP!`, 'success');
                 } else {
                     dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 2));
                     dispatcher.addLog(`✨ ${player.name} rút 2 lá bài!`, 'success');
                 }
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          }
       }
    },
    turnResetFlags: ['askedUyChan'],
  },

  'gian-hung': {
    id: 'gian-hung',
    name: 'Gian Hùng',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         // Nếu Tào Tháo là người bị trừ máu và sát thương gây ra bởi 1 lá bài
         if (payload.targetId === playerId && payload.sourceCardId) {
            // TODO: Ở Phase 5 (UI), đẩy 1 Event hỏi Tào Tháo có muốn nhặt bài không
            // Hiện tại: Auto nhặt (để test logic)
            const cardInDiscard = state.discardPile.find(c => c.id === payload.sourceCardId);
            
            if (cardInDiscard) {
               
                  dispatcher.applyEffect(Effects.MoveCardEffect(
                     payload.sourceCardId, 
                     'discardPile', 
                     'hand', 
                     null, 
                     playerId
                  ));
               
               console.log(`[Gian Hùng] Tào Tháo (${playerId}) đã nhặt lá bài ${payload.sourceCardId}!`);
            }
         }
      }
    }
  },

  'an-bang': {
    id: 'an-bang',
    name: 'An Bang',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      END_PHASE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.anBangUsed) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_an_bang', sourceId: player.id } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_an_bang') return;
       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetFlagEffect(req.sourceId, 'anBangUsed', true));
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide || payload.doUse) {
          dispatcher.applyEffect(Effects.SetFlagEffect(req.sourceId, 'anBangUsed', true));
          dispatcher.applyEffect(Effects.DrawCardEffect(req.sourceId, 1));
          dispatcher.addLog(`🕊️ Huyền Trân Công Chúa dùng [An Bang] rút 1 lá bài!`, 'important');
          
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['anBangUsed'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'duong-quan': {
    id: 'duong-quan',
    name: 'Dưỡng Quân',
    type: SKILL_TYPES.PASSIVE,
    canTriggerUnrevealed: true,
    hooks: {
      TURN_BEGIN: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.duongQuanUsed) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_duong_quan', sourceId: player.id } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_duong_quan') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'duongQuanUsed', true));

       if (payload.canceled || !payload.doUse || !payload.choices || payload.choices.length === 0) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
           // Lựa chọn Dưỡng Quân
           let slashCount = 0;
           for (const choice of payload.choices) {
               if (choice.type === 'opt1') {
                   dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'skipJudgePhase', true));
                   dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'skipDrawPhase', true));
                   slashCount++;
                   dispatcher.addLog(`💪 Dương Đình Nghệ chọn Bỏ qua Phán Xét & Rút Bài để [Chém] ảo!`, 'important');
               } else if (choice.type === 'opt2') {
                   dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'skipActionPhase', true));
                   if (choice.equipId && player.equipment[choice.equipId]) {
                       const discardedEquip = player.equipment[choice.equipId];
                       player.equipment[choice.equipId] = null;
                       state.discardPile.push(discardedEquip);
                   }
                   slashCount++;
                   dispatcher.addLog(`💪 Dương Đình Nghệ chọn Bỏ qua Hành Động & bỏ trang bị để [Chém] ảo!`, 'important');
               } else if (choice.type === 'opt3') {
                   dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'skipDiscardPhase', true));
                   dispatcher.applyEffect(Effects.TurnOverEffect(player.id));
                   slashCount++;
                   dispatcher.addLog(`💪 Dương Đình Nghệ chọn Bỏ qua Bỏ Bài & Lật Mặt để [Chém] ảo!`, 'important');
               }
           }
           
           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           
           // Phát sinh các Slash ảo
           for (let i = payload.choices.length - 1; i >= 0; i--) {
               const choice = payload.choices[i];
               const targetId = choice.targetId;
               if (targetId !== undefined && targetId !== null && !isNaN(targetId)) {
                   dispatcher.state.reactionStack.push({
                       type: 'EVENT_ACTION_PLAY_CARD',
                       payload: {
                           playerId: player.id,
                           targets: [targetId],
                           virtualCardName: 'Chém',
                           cardId: `virtual_slash_${Math.random()}`
                       }
                   });
               }
           }
       }
    },
    turnResetFlags: ['duongQuanUsed'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'phat-tam': {
    id: 'phat-tam',
    name: 'Phật Tâm',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      TURN_BEGIN: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.phatTamUsed) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_phat_tam', sourceId: player.id, drawnCards: player.phatTamDrawn || [] } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_phat_tam') return;

       const player = state.players.find(p => p.id === req.sourceId);
       
       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'phatTamUsed', true));
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide && payload.cardIndices) {
          {
             const cardIndices = payload.cardIndices.sort((a,b) => b - a);
             cardIndices.forEach(idx => {
                const card = player.hand[idx];
                if (card) dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'hand', player.id, payload.targetId));
             });
             
             dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'phatTamUsed', true));
             dispatcher.addLog(`🙏 Nguyên Phi Ỷ Lan dùng [Phát Tâm] phân phát bài!`, 'important');
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          }
       }
    },
    turnResetFlags: ['phatTamUsed', 'phatTamDrawn'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'pha-thanh': {
    id: 'pha-thanh',
    name: 'Phá Thành',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      DRAW_PHASE: (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         const player = state.players.find(p => p.id === playerId);
         if (player.phaThanhUsed) return false;

         // Interrupt draw_phase
         dispatcher.state.waitingForResponse = null;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_pha_thanh', sourceId: playerId } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_pha_thanh') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'phaThanhUsed', true));

       if (payload.canceled) {
          // Khôi phục lại trạng thái rút bài nếu hủy kỹ năng
          dispatcher.state.waitingForResponse = { type: 'draw_phase', responderId: player.id, targetId: player.id };
       } else if (payload.doProvide) {
          // Phá thành: Thay vì rút bài, chọn 1 mục tiêu mất 1 máu
          dispatcher.addLog(`💥 Đô Đốc Bảo dùng [Phá Thành] bỏ rút bài để đả thương!`, 'important');
          
          dispatcher.state.reactionStack.push({
              type: 'EVENT_DAMAGE',
              payload: { sourceId: player.id, targetId: payload.targetId, amount: 1, damageType: 'normal' }
          });
          
          // Hủy trạng thái chờ rút bài (bỏ qua rút bài)
          dispatcher.state.waitingForResponse = null;
       }
    },
    turnResetFlags: ['phaThanhUsed'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'doat-sao': {
    id: 'doat-sao',
    name: 'Đoạt Sáo',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      END_PHASE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.doatSaoUsed) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_doat_sao', sourceId: player.id } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req) return;

       if (req.type === 'ask_doat_sao') {
           const player = state.players.find(p => p.id === req.sourceId);
           dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'doatSaoUsed', true));

           if (payload.canceled || !payload.doUse) {
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           } else {
              dispatcher.applyEffect(Effects.TurnOverEffect(player.id));
              dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 4));
              dispatcher.addLog(`⭐ ${player.name} dùng [Đoạt Sáo] lật mặt và rút 4 bài!`, 'important');
              
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
              
              // Chuyển sang bước chọn 1 lá để bỏ
              dispatcher.state.reactionStack.push({
                 type: 'EVENT_TRIGGER_SKILL_ASK',
                 payload: { request: { type: 'ask_doat_sao_discard', sourceId: player.id } }
              });
           }
       } else if (req.type === 'ask_doat_sao_discard') {
           const player = state.players.find(p => p.id === req.sourceId);
           if (payload.cardIndexSelected !== undefined) {
               const cardIdx = payload.cardIndexSelected;
               if (cardIdx !== -1 && cardIdx < player.hand.length) {
                   const card = player.hand[cardIdx];
                   if (card.type === 'equip_weapon' || card.type === 'equip_armor' || card.type === 'equip_mount_plus' || card.type === 'equip_mount_minus' || card.type === 'Vũ khí' || card.type === 'Giáp' || card.type === 'Ngựa') {
                       // Sử dụng trang bị
                       dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'equipment', player.id, player.id));
                       dispatcher.addLog(`⭐ ${player.name} dùng [Đoạt Sáo] sử dụng Trang bị [${card.name}]!`, 'success');
                   } else {
                       dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id, null));
                       dispatcher.addLog(`⭐ ${player.name} dùng [Đoạt Sáo] bỏ [${card.name}]!`, 'normal');
                   }
               }
           }
           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['doatSaoUsed'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'xa-than': {
    id: 'xa-than',
    name: 'Xả Thân',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      ON_TARGETED_SLASH: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedXaThan) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_xa_than', sourceId: player.id } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_xa_than') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedXaThan', true));

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide && payload.targetId !== undefined && payload.cardId !== undefined) {
          {
             // Bỏ 1 lá bài
             dispatcher.applyEffect(Effects.MoveCardEffect(payload.cardId, 'hand', 'discardPile', player.id, null));
             
             // Chuyển hướng mục tiêu của Ask Dodge và Damage
             const newTarget = state.players.find(p => p.id === payload.targetId);
             if (newTarget) {
                 const askDodgeEvent = state.reactionStack.find(e => e.type === 'EVENT_DO_ASK_DODGE');
                 if (askDodgeEvent) {
                     askDodgeEvent.payload.targetId = newTarget.id;
                 }
                 const damageEvent = state.reactionStack.find(e => e.type === 'EVENT_DAMAGE');
                 if (damageEvent) {
                     damageEvent.payload.targetId = newTarget.id;
                 }
                 
                 dispatcher.addLog(`✨ Công Chúa An Tư dùng [Xả Thân] chuyển sát thương sang ${newTarget.name}!`, 'important');
             }
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          }
       }
    },
    turnResetFlags: ['askedXaThan'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
  },

  'nam-quoc-son-ha': {
    id: 'nam-quoc-son-ha',
    name: 'Nam Quốc Sơn Hà',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedNqsh) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_nam_quoc_son_ha', sourceId: player.id, amount: payload.amount, damageSourceId: payload.sourceId, sourceCardId: payload.sourceCardId } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_nam_quoc_son_ha') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedNqsh', true));

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide) {
          {
             // Rút 1 lá
             dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 1));
             
             // Thu lấy lá bài gây sát thương (nếu có)
             if (req.sourceCardId) {
                let cardIndex = state.playedCards.findIndex(c => c.id === req.sourceCardId);
                if (cardIndex !== -1) {
                   dispatcher.applyEffect(Effects.MoveCardEffect(req.sourceCardId, 'playedCards', 'hand', null, player.id));
                } else {
                   cardIndex = state.discardPile.findIndex(c => c.id === req.sourceCardId);
                   if (cardIndex !== -1) {
                      dispatcher.applyEffect(Effects.MoveCardEffect(req.sourceCardId, 'discardPile', 'hand', null, player.id));
                   }
                }
             }
             
             dispatcher.addLog(`✨ ${player.name} dùng [Nam Quốc Sơn Hà] rút bài!`, 'important');
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          }
       }
    },
    turnResetFlags: ['askedNqsh'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => true }
  },

  'khoan-dan': {
    id: 'khoan-dan',
    name: 'Khoan Dân',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedKhoanDan) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_khoan_dan', sourceId: player.id } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_khoan_dan') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedKhoanDan', true));

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide && payload.targetId !== undefined) {
          const target = state.players.find(p => p.id === payload.targetId);
          if (target) {
             {
                const toDraw = Math.max(0, Math.min(target.maxHp, 5) - target.hand.length);
                if (toDraw > 0) {
                   dispatcher.applyEffect(Effects.DrawCardEffect(target.id, toDraw));
                   dispatcher.addLog(`✨ Khúc Thừa Dụ dùng [Khoan Dân] giúp ${target.name} rút ${toDraw} lá bài!`, 'important');
                }
                dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          }
       }
    },
    turnResetFlags: ['askedKhoanDan'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => true }
  },

  'hien-hau': {
    id: 'hien-hau',
    name: 'Hiền Hậu',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      ON_DAMAGE_CALC: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedHienHau) return false;
         
         const hasRed = player.hand.some(c => c.suit === 'heart' || c.suit === 'diamond');
         if (!hasRed) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_hien_hau', sourceId: player.id, amount: payload.amount, damageEventPayload: payload } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_hien_hau') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedHienHau', true));

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide && payload.targetId !== undefined && payload.cardId) {
          {
             // Bỏ 1 lá đỏ
             dispatcher.applyEffect(Effects.MoveCardEffect(payload.cardId, 'hand', 'discardPile', player.id, null));
             
             // Ngăn chặn sát thương
             if (req.damageEventPayload) {
                 req.damageEventPayload.isCancelled = true;
             }
             
             // Xử lý target
             const target = state.players.find(p => p.id === payload.targetId);
             if (target) {
                 dispatcher.addLog(`✨ Ngọc Hân dùng [Hiền Hậu] ngăn sát thương!`, 'important');
                 
                 if (payload.option === 1) {
                     // Mục tiêu mất 1 HP và rút bài
                     dispatcher.applyEffect(Effects.DamageEffect(player.id, target.id, 1, 'normal'));
                     if (target.hp <= 0) {
                         dispatcher.state.reactionStack.push({ type: 'EVENT_DYING', payload: { targetId: target.id, sourceId: player.id } });
                     } else {
                         const lostHp = Math.min(target.maxHp - target.hp, 5);
                         if (lostHp > 0) {
                             dispatcher.applyEffect(Effects.DrawCardEffect(target.id, lostHp));
                         }
                     }
                 } else {
                     // Mục tiêu hồi máu (giới hạn ở mức maxHp)
                     const heal = Math.min(target.maxHp - target.hp, req.amount);
                     if (heal > 0) {
                         target.hp += heal;
                         dispatcher.addLog(`✨ ${target.name} được hồi ${heal} HP!`, 'success');
                     }
                 }
             }
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          }
       }
    },
    turnResetFlags: ['askedHienHau'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
  },

  'doi-su': {
    id: 'doi-su',
    name: 'Đối Sứ',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedDoiSu) return false;
         if (payload.sourceId === undefined || payload.sourceId === player.id) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_doi_su', sourceId: player.id, damageSourceId: payload.sourceId } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_doi_su') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedDoiSu', true));

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide) {
          const damageSource = state.players.find(p => p.id === req.damageSourceId);
          if (damageSource && damageSource.hand.length > 0) {
             {
                 const randIdx = Math.floor(Math.random() * damageSource.hand.length);
                 const card = damageSource.hand[randIdx];
                 dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'hand', damageSource.id, player.id));
                 
                 dispatcher.addLog(`📜 Mạc Đĩnh Chi dùng [Đối Sử] lấy 1 lá bài của ${damageSource.name}!`, 'important');
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          } else {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          }
       }
    },
    turnResetFlags: ['askedDoiSu'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
  },

  'hoa-nghi': {
    id: 'hoa-nghi',
    name: 'Hòa Nghị',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedHoaNghi) return false;

         const drawnCards = [];
         for (let i = 0; i < payload.amount; i++) {
             if (state.deck.length === 0) {
                state.deck = [...state.discardPile].reverse();
                state.discardPile = [];
             }
             if (state.deck.length > 0) drawnCards.push(state.deck.pop());
         }

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_hoa_nghi', sourceId: player.id, drawnCards } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_hoa_nghi') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedHoaNghi', true));

       if (payload.canceled) {
          req.drawnCards.forEach(c => state.discardPile.push(c));
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide && payload.distribution) {
          payload.distribution.forEach(dist => {
             const card = req.drawnCards.find(c => c.id === dist.cardId);
             const target = state.players.find(p => p.id === dist.targetId);
             if (card && target) {
                 target.hand.push(card);
             }
          });
          req.drawnCards.forEach(c => {
             if (!payload.distribution.some(d => d.cardId === c.id)) {
                 state.discardPile.push(c);
             }
          });
          
          dispatcher.addLog(`🤝 Trần Nhật Duật dùng [Hòa Nghị] phân phối ${req.drawnCards.length} bài!`, 'important');
          
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['askedHoaNghi'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
  },

  'ho-chu': {
    id: 'ho-chu',
    name: 'Hộ Chủ (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      DYING: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedHoChu) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_ho_chu', sourceId: player.id } }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_ho_chu') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedHoChu', true));

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide) {
          
          if (state.deck.length === 0) {
             state.deck = [...state.discardPile].reverse();
             state.discardPile = [];
          }
          const trungCard = state.deck.pop();
          dispatcher.addLog(`🙏 Nguyễn Địa Lô dùng [Hô Chú], lật [Trung]: ${trungCard.suit} ${trungCard.rank}`, 'important');
          
          const existingTrungs = player.trungCards || [];
          const isDuplicate = existingTrungs.some(c => c.rank === trungCard.rank);
          
          if (!isDuplicate) {
             dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'trungCards', [...existingTrungs, trungCard]));
             dispatcher.applyEffect(Effects.RecoverEffect(player.id, 1));
             if (player.hp > 0) player.isDying = false;
             dispatcher.addLog(`✨ [Trung] không trùng điểm! Hồi 1 HP!`, 'success');
          } else {
             state.discardPile.push(trungCard);
             dispatcher.addLog(`❌ [Trung] trùng điểm! [Hô Chú] thất bại.`, 'danger');
          }
          
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['askedHoChu'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
  },

  'tien-phat': {
    id: 'tien-phat',
    name: 'Tiên Phát',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      'ON_ASK_DODGE': (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         
         const allies = state.players.filter(p => p.id !== playerId && p.isAlive && p.faction === 'Việt' && p.hand.some(c => c.name === 'Né' || c.virtualName === 'Né'));
         if (allies.length === 0) return false; // Không có ai giúp được
         
         dispatcher.addLog(`🔴 [Tiên Phát] kích hoạt! Đợi đồng minh Hệ Việt đánh [Né] giúp ${dispatcher.getHeroName(state.players.find(p => p.id === playerId))}!`, 'important');
         
         const currentReq = state.waitingForResponse;
         state.waitingForResponse = null;
         
         state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { 
               request: {
                  type: 'ask_tien_phat',
                  sourceId: playerId, // Lý Thường Kiệt
                  targetId: allies[0].id, // Người đầu tiên bị hỏi
                  originalReq: currentReq,
                  askQueue: allies.map(p => p.id)
               }
            }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_tien_phat') return;

        const target = state.players.find(p => p.id === req.targetId); // Người được nhờ đánh Né

        
            if (payload.doReact) {
                // Đồng minh đồng ý đánh Né thay
                const dodgeIdx = target.hand.findIndex(c => c.name === 'Né');
                if (dodgeIdx >= 0) {
                    const dodgeCard = target.hand.splice(dodgeIdx, 1)[0];
                    state.playedCards.push(dodgeCard);
                    dispatcher.addLog(`🛡️ ${target.name} đã dùng [Né] thay cho Chủ Công!`, 'success');
                    
                    state.waitingForResponse = req.originalReq;
                    
                    // Phát sự kiện đệ quy để handleResponseAction gốc nhận được Dodge
                    dispatcher.dispatchAction({
                        type: 'ACTION_SKILL_RESPONSE',
                        payload: { doReact: true, activeSkill: 'Tiên Phát' }
                    });
                }
            } else {
                // Đồng minh từ chối hoặc không có Né
                req.askQueue.shift();
                if (req.askQueue.length > 0) {
                    req.targetId = req.askQueue[0];
                } else {
                    dispatcher.addLog(`💔 Không ai đánh thay cho Chủ Công!`, 'danger');
                    // Trả về request gốc để tự chịu đòn
                    state.waitingForResponse = req.originalReq;
                    dispatcher.dispatchAction({
                        type: 'ACTION_SKILL_RESPONSE',
                        payload: { doReact: false }
                    });
                }
            }
        
    },
    aiConfig: { priority: 9, condition: (state, bot, targets) => false }
  },

  'banh-chung': {
    id: 'banh-chung',
    name: 'Bánh Chưng',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        TURN_BEGIN: (dispatcher, state, playerId, payload) => {
            if (playerId !== payload.targetId) return false; // Chỉ kích hoạt khi đến lượt của mình
            const player = state.players.find(p => p.id === playerId);
            if (player.banhChungUsed) return false;
            
            const alivePlayers = state.players.filter(p => p.isAlive).length;
            const viewCount = Math.min(alivePlayers, 5);
            
            if (state.deck.length < viewCount) {
                state.deck = [...state.deck, ...[...state.discardPile].reverse()];
                state.discardPile = [];
            }
            const viewedCards = state.deck.slice(-viewCount).reverse();
            
            dispatcher.applyEffect(Effects.SetWaitingEffect({
                type: 'ask_banh_chung',
                targetId: playerId,
                sourceId: playerId,
                viewedCards,
                viewCount,
            }));
            return true;
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_banh_chung') return;
        
        const player = state.players.find(p => p.id === req.targetId || p.id === req.sourceId);
        dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'banhChungUsed', true));
        
        // Sử dụng dispatcher.state vì applyEffect đã tạo state mới
        if (payload && payload.orderedCards) {
            dispatcher.state.deck = dispatcher.state.deck.slice(0, dispatcher.state.deck.length - req.viewCount);
            const bottomCards = payload.deckBottom ? [...payload.deckBottom].reverse() : [];
            const topCards = payload.deckTop ? [...payload.deckTop].reverse() : [];
            dispatcher.state.deck = [...bottomCards, ...dispatcher.state.deck, ...topCards];
            dispatcher.addLog(`✨ ${player.name} đã phát động [Bánh Chưng], xem và sắp xếp lại ${req.viewCount} lá bài!`, 'important');
        }
        
        dispatcher.state.waitingForResponse = null;
    },
    turnResetFlags: ['banhChungUsed'],
    aiConfig: { priority: 9, condition: () => false }
  },

  'xuan-huong': {
    id: 'xuan-huong',
    name: 'Xuân Hương',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        ON_EQUIP_LOST: (dispatcher, state, playerId, payload) => {
            const player = state.players.find(p => p.id === playerId);
            dispatcher.applyEffect(Effects.SetWaitingEffect({
                type: 'ask_xuan_huong',
                sourceId: playerId,
                interruptedEvent: state.waitingForResponse ? { ...state.waitingForResponse } : null
            }));
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_xuan_huong') return;
        
        const player = state.players.find(p => p.id === req.sourceId);
        
        
            if (payload.doUse) {
                dispatcher.addLog(`✨ ${player.name} dùng [Xuân Hương] rút 2 lá bài!`, 'important');
                
                    dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 2));
                    state.waitingForResponse = req.interruptedEvent || null;
                
            } else {
                state.waitingForResponse = req.interruptedEvent || null;
            }
        
    },
    aiConfig: { priority: 9, condition: () => false }
  },

  'khoi-nghia': {
    id: 'khoi-nghia',
    name: 'Khởi Nghĩa',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        DRAW_PHASE: (dispatcher, state, playerId, payload) => {
            if (playerId !== payload.targetId) return;
            const player = state.players.find(p => p.id === playerId);
            if (player.askedKhoiNghia) return;

            dispatcher.applyEffect(Effects.SetWaitingEffect({
                type: 'ask_khoi_nghia',
                sourceId: playerId
            }));
        },
        ON_DAMAGE_CALC: (dispatcher, state, playerId, payload) => {
            if (payload.sourceId !== playerId) return;
            const player = state.players.find(p => p.id === playerId);
            if (player && player.khoiNghiaActive && (payload.sourceCardId || payload.damageType === 'normal')) { // Chém or Quyết Đấu (which uses normal and doesn't specify weapon usually)
                payload.amount += 1;
                dispatcher.addLog(`✨ [Khởi Nghĩa] tăng 1 sát thương!`, 'important');
            }
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_khoi_nghia') return;
        
        const player = state.players.find(p => p.id === req.sourceId);
        dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedKhoiNghia', true));
        
        
            if (payload.doUse) {
                dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'khoiNghiaActive', true));
                dispatcher.addLog(`✨ ${player.name} dùng [Khởi Nghĩa]! Lượt này Chém/Quyết Đấu +1 ST.`, 'important');
                
                // Hủy Draw default
                const drawPayload = state.reactionStack.find(e => e.type === 'EVENT_APPLY_DRAW')?.payload;
                if (drawPayload) {
                    drawPayload.isCancelled = true;
                }
                
                // Rút 1 lá
                
                    dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 1));
                    dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                
            } else {
                dispatcher.applyEffect(Effects.SetWaitingEffect(null));
            }
        
    },
    turnResetFlags: ['askedKhoiNghia', 'khoiNghiaActive'],
    aiConfig: { priority: 9, condition: () => false }
  },

  'da-trach': {
    id: 'da-trach',
    name: 'Dạ Trạch',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        DRAW_PHASE: (dispatcher, state, playerId, payload) => {
            if (playerId !== payload.targetId) return;
            const player = state.players.find(p => p.id === playerId);
            if (player.askedDaTrach) return;

            dispatcher.applyEffect(Effects.SetWaitingEffect({
                type: 'ask_da_trach',
                sourceId: playerId
            }));
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_da_trach') return;
        
        const player = state.players.find(p => p.id === req.sourceId);
        dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedDaTrach', true));
        
        
            if (payload.doUse) {
                // Hủy Draw default
                const drawPayload = state.reactionStack.find(e => e.type === 'EVENT_APPLY_DRAW')?.payload;
                if (drawPayload) {
                    drawPayload.isCancelled = true;
                }
                
                if (payload.targets && payload.targets.length > 0) {
                    payload.targets.forEach(tId => {
                        const target = state.players.find(p => p.id === tId);
                        if (target && target.hand.length > 0) {
                            const randIdx = Math.floor(Math.random() * target.hand.length);
                            const stolen = target.hand.splice(randIdx, 1)[0];
                            player.hand.push(stolen);
                        }
                    });
                    dispatcher.addLog(`🦇 ${player.name} dùng [Dạ Trạch] cướp bài của ${payload.targets.length} người chơi!`, 'important');
                }
            }
            
            dispatcher.applyEffect(Effects.SetWaitingEffect(null));
        
    },
    turnResetFlags: ['askedDaTrach'],
    aiConfig: { priority: 9, condition: () => false }
  },

  'duyen-tien': {
    id: 'duyen-tien',
    name: 'Duyên Tiên',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      'ON_USE_CARD': (dispatcher, state, playerId, payload) => {
          const { sourceId, cardType, isDelayed, isReforge } = payload;
          if (sourceId !== playerId) return;
          if (cardType === 'trick' && !isDelayed && !isReforge) {
              const player = state.players.find(p => p.id === sourceId);
              if (player && isPlayerRevealed(player)) {
                  dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} phát động [Duyên Tiên], rút 1 lá bài do dùng Cẩm Nang!`, 'important');
                  dispatcher.state.reactionStack.push({ type: 'EVENT_DRAW_CARDS', payload: { targetId: sourceId, amount: 1 } });
              }
          }
      }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'no-than': {
    id: 'no-than',
    name: 'Nỏ Thần (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      ON_TARGETED_SLASH: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (payload.sourceId !== player.id) return false;
         
         const target = state.players.find(p => p.id === payload.targetId);
         if (!target || !target.isAlive) return false;
         
         let hasEffect = false;
         
         // 1. Nỏ Thần: Nếu số bài trên tay không ít hơn mục tiêu => Khóa Né
         if (player.hand.length >= target.hand.length) {
             const askDodgeIndex = dispatcher.state.reactionStack.findIndex(e => e.type === 'EVENT_DO_ASK_DODGE' && e.payload.targetId === target.id);
             if (askDodgeIndex !== -1) {
                dispatcher.state.reactionStack.splice(askDodgeIndex, 1);
                dispatcher.addLog(`🏹 ${dispatcher.getHeroName(player)} kích hoạt [Nỏ Thần]: Bài trên tay (${player.hand.length}) ≥ mục tiêu (${target.hand.length}) => ${dispatcher.getHeroName(target)} BỊ KHÓA [NÉ]!`, 'important');
                hasEffect = true;
             }
         }
         
         // 2. Nỏ Thần: Nếu Sinh lực không nhiều hơn mục tiêu => Sát thương +1
         if (player.hp <= target.hp) {
             // Duyệt từ cuối ngăn xếp lên để tìm EVENT_DAMAGE tương ứng
             for (let i = dispatcher.state.reactionStack.length - 1; i >= 0; i--) {
                 const e = dispatcher.state.reactionStack[i];
                 if (e.type === 'EVENT_DAMAGE' && e.payload.targetId === target.id && e.payload.sourceId === player.id) {
                     e.payload.amount += 1;
                     dispatcher.addLog(`🏹 ${dispatcher.getHeroName(player)} kích hoạt [Nỏ Thần]: HP (${player.hp}) ≤ mục tiêu (${target.hp}) => Tăng thêm 1 điểm Sát thương!`, 'important');
                     hasEffect = true;
                     break;
                 }
             }
         }
         
         return hasEffect;
      }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'thong-ngon': {
    id: 'thong-ngon',
    name: 'Thông Ngôn',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        after_EVENT_TURN_END: (dispatcher, state, playerId, payload) => {
             state.players.forEach(p => { p.unlimitedRangeThisTurn = false; });
        },
        after_EVENT_APPLY_DRAW: (dispatcher, state, playerId, payload) => {
             const targetId = payload.targetId;
             const targetPlayer = state.players.find(p => p.id === targetId);
             
             
                 if (getPlayerFaction(targetPlayer) === 'Hà') {
                     const thongNgonPlayers = state.players.filter(p => p.id !== targetId && p.isAlive && p.hand.length > 0 && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.id === 'thong-ngon')));
                     
                     if (thongNgonPlayers.length > 0) {
                         state.waitingForResponse = {
                             type: 'ask_thong_ngon',
                             askQueue: thongNgonPlayers.map(p => p.id),
                             targetId: targetId
                         };
                         // Must set targetId of waitingForResponse to the first in askQueue for UI routing
                         state.waitingForResponse.sourceId = state.waitingForResponse.askQueue[0]; // Temporary, logic expects sourceId or targetId
                     }
                 }
             
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_thong_ngon') return;

        const currentAskerId = req.askQueue[0];
        
        if (payload.doReact && payload.cardIndexSelected !== undefined) {
             const asker = state.players.find(p => p.id === currentAskerId);
             const target = state.players.find(p => p.id === req.targetId);
             const card = asker.hand[payload.cardIndexSelected];
             
             asker.hand = asker.hand.filter((_, i) => i !== payload.cardIndexSelected);
             target.hand.push(card);
             
             target.unlimitedRangeThisTurn = true; // Flag for rangeSystem
             
             
                 dispatcher.addLog(`✨ ${asker.name} phát động [Thông Ngôn], đưa 1 lá bài cho ${target.name}! ${target.name} sẽ không bị giới hạn khoảng cách trong lượt này.`, 'important');
                 state.waitingForResponse = null;
             
        } else {
             req.askQueue.shift();
             if (req.askQueue.length > 0) {
                 req.sourceId = req.askQueue[0];
             } else {
                 state.waitingForResponse = null;
             }
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'ung-bien': {
    id: 'ung-bien',
    name: 'Ứng Biến',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        ON_DODGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
            if (player.id !== payload.sourceId) return false;
            
                dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 1));
                Object.assign(state, dispatcher.addLog(`⚡ ${dispatcher.getHeroName(player)} kích hoạt [Ứng Biến]: Đánh [Né] và rút 1 lá!`, 'info'));
            
            return true;
        },
        ON_USE_CARD: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
            if (player.id !== payload.sourceId) return false;
            const configName = payload.configName;
            if (configName === 'ne' || payload.virtualCardName === 'Né') {
                
                    dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 1));
                    Object.assign(state, dispatcher.addLog(`⚡ ${dispatcher.getHeroName(player)} kích hoạt [Ứng Biến]: Đánh [Né] và rút 1 lá!`, 'info'));
                
                return true;
            }
            return false;
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'khai-quoc': {
    id: 'khai-quoc',
    name: 'Khai Quốc',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      ON_CALCULATE_HAND_LIMIT: (state, playerId, currentLimit) => {
         let sonCount = 0;
         state.players.forEach(p => {
             if (!p.isAlive) return;
             const h1 = HeroRegistry[p.mainHeroId];
             const h2 = HeroRegistry[p.subHeroId];
             if (p.revealedHeroes && p.revealedHeroes[0] && h1 && h1.faction === 'Sơn') sonCount++;
             if (p.revealedHeroes && p.revealedHeroes[1] && h2 && h2.faction === 'Sơn') sonCount++;
         });
         return currentLimit + (sonCount * 2);
      }
    }
  },

  'phat-toi': {
    id: 'phat-toi',
    name: 'Phạt Tội',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      'ON_DODGE': (dispatcher, state, playerId, payload) => {
          const { sourceId, attackerId } = payload;
          if (playerId !== attackerId) return false; // Chỉ Đinh Điền (người chém) mới kích hoạt Phạt Tội
          
          if (!attackerId) return; // Không có người tấn công thì bỏ qua
          dispatcher.state.reactionStack.push({
              type: 'EVENT_TRIGGER_SKILL_ASK',
              payload: {
                  request: {
                      type: 'ask_phat_toi',
                      responderId: attackerId,
                      sourceId: attackerId,
                      targetId: sourceId
                  }
              }
          });
      }
    },
    onReact: (dispatcher, state, payload) => {
        const { playerId, doProvide, targetId } = payload || {};
        console.log("Phạt Tội payload:", payload, "targetId:", targetId, "playerId:", playerId);
        if (!doProvide) {
            state.waitingForResponse = null;
            return;
        }
        const player = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targetId);
        
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
            state.waitingForResponse = null;
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'dinh-quoc': {
    id: 'dinh-quoc',
    name: 'Định Quốc',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
        return !player.dinhQuocUsedThisTurn && player.hand.length > 0;
    },
    hooks: {
        after_EVENT_TURN_END: (dispatcher, state, playerId, payload) => {
             state.players.forEach(p => { p.dinhQuocUsedThisTurn = false; });
        }
    },
    onUse: (dispatcher, state, playerId, targets, options) => {
        if (!options || options.cardIdx === undefined) return;
        if (!targets || targets.length === 0) return;
        
        const sender = state.players.find(p => p.id === playerId);
        const target = state.players.find(p => p.id === targets[0]); 
        
        const card = sender.hand[options.cardIdx];
        sender.hand = sender.hand.filter((_, i) => i !== options.cardIdx);
        target.hand.push(card);
        
        dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));
        
        dispatcher.applyEffect(Effects.SetFlagEffect(sender.id, 'dinhQuocUsedThisTurn', true));
        
        
            Object.assign(state, addLog(state, `✨ ${sender.name} dùng [Định Quốc], giao 1 lá bài cho ${target.name}! ${target.name} hồi 1 HP (${target.hp}/${target.maxHp})`, 'important'));
        
    },
    aiConfig: { priority: 2, condition: () => false } // Will be handled explicitly in ai/botLogic.js
  },

  'pha-quan': {
    id: 'pha-quan',
    name: 'Phá Quân',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      'ON_TARGETED_SLASH': (dispatcher, state, playerId, payload) => {
          if (playerId !== payload.sourceId) return false;
          const { sourceId, targetId } = payload;
          const player = state.players.find(p => p.id === sourceId);
          if (player && isPlayerRevealed(player)) {
              payload.reqDodges = (payload.reqDodges || 1) + 1;
              const targetPlayer = state.players.find(p => p.id === targetId);
              dispatcher.addLog(`🛡️ [Phá Quân] kích hoạt: ${dispatcher.getHeroName(targetPlayer)} phải dùng 2 lá [Né] để tránh đòn!`, 'important');
          }
      },
      'ON_ASK_SLASH': (dispatcher, state, playerId, payload) => {
          if (payload.reason === 'quyet-dau') {
              const { sourceId, targetId } = payload;
              if (playerId !== sourceId) return false;
              
              const target = state.players.find(p => p.id === targetId);
              const source = state.players.find(p => p.id === sourceId);
              
              if (source && isPlayerRevealed(source)) {
                  payload.reqSlashes = (payload.reqSlashes || 1) + 1;
                  dispatcher.addLog(`⚔️ [Phá Quân] kích hoạt: ${dispatcher.getHeroName(target)} phải dùng 2 lá [Chém] để hưởng ứng!`, 'important');
              }
          }
      }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'ho-gia': {
    id: 'ho-gia',
    name: 'Hộ Giá (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      'ON_ASK_DODGE': (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         
         const allies = state.players.filter(p => p.id !== playerId && p.isAlive && p.faction === 'Sơn' && p.hand.some(c => c.name === 'Né'));
         if (allies.length === 0) return false; // Không có ai giúp được
         
         dispatcher.addLog(`👑 [Hộ Giá] kích hoạt! Đợi đồng minh Hệ Sơn đánh [Né] giúp ${dispatcher.getHeroName(state.players.find(p => p.id === playerId))}!`, 'important');
         
         // Tạo request mới chèn ngang
         const currentReq = state.waitingForResponse;
         state.waitingForResponse = null;
         
         state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { 
               request: {
                  type: 'ask_ho_gia',
                  sourceId: playerId, // Người dùng Hộ Giá
                  targetId: allies[0].id, // Người đầu tiên bị hỏi
                  originalReq: currentReq,
                  askQueue: allies.map(p => p.id)
               }
            }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_ho_gia') return;

        const target = state.players.find(p => p.id === req.targetId); // Người được nhờ đánh Né

        
            if (payload.doReact) {
                // Đồng minh đồng ý đánh Né thay
                const dodgeIdx = target.hand.findIndex(c => c.name === 'Né');
                if (dodgeIdx >= 0) {
                    const dodgeCard = target.hand.splice(dodgeIdx, 1)[0];
                    state.playedCards.push(dodgeCard);
                    dispatcher.addLog(`🛡️ ${target.name} đã dùng [Né] thay cho Chủ Công!`, 'success');
                    
                    state.waitingForResponse = req.originalReq;
                    
                    // Phát sự kiện đệ quy để handleResponseAction gốc nhận được Dodge
                    dispatcher.dispatchAction({
                        type: 'ACTION_SKILL_RESPONSE',
                        payload: { doReact: true, activeSkill: 'Hộ Giá' }
                    });
                }
            } else {
                // Đồng minh từ chối hoặc không có Né
                req.askQueue.shift();
                if (req.askQueue.length > 0) {
                    req.targetId = req.askQueue[0];
                } else {
                    dispatcher.addLog(`💔 Không ai đánh thay cho Chủ Công!`, 'danger');
                    // Trả về request gốc để tự chịu đòn
                    state.waitingForResponse = req.originalReq;
                    dispatcher.dispatchAction({
                        type: 'ACTION_SKILL_RESPONSE',
                        payload: { doReact: false }
                    });
                }
            }
        
    },
    aiConfig: { priority: 5, condition: () => false }
  }
};
