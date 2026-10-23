import { getAlivePlayers, addLog, isPlayerRevealed, getPlayerFaction, hasSkill, hasSkillEvenIfHidden } from '../../gameState.js';
import { SeededRNG } from '../../core/SeededRNG.js';
import * as Effects from '../../core/Effects.js';
import { CARD_TYPES, CARD_SUITS } from '../../../constants/cardTypes.js';
import { HeroRegistry } from '../HeroRegistry.js';
import { canUseSkill } from '../../rules/SkillRules.js';
import * as Actions from '../../core/Actions.js';
import { getAttackRange, getDistance, canAttack } from '../../rangeSystem.js';
import { SKILL_TYPES } from './constants.js';

const rankToNumber = (rank) => {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    return parseInt(rank) || 0;
};

export const reactionSkills = {
  'xa-than': {
    id: 'xa-than',
    name: 'Xả Thân',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      ON_TARGETED_DISMANTLE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedXaThan) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_xa_than', sourceId: player.id, skillId: 'xa-than', targetEvent: 'EVENT_DISMANTLE' }}
         });
         return true;
      },
      ON_TARGETED_SNATCH: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (player.askedXaThan) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_xa_than', sourceId: player.id, skillId: 'xa-than', targetEvent: 'EVENT_SNATCH' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_xa_than') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedXaThan', true));

       if (payload.canceled || payload.doUse === false || !payload.doUse) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doUse && payload.cardId !== undefined) {
             // Bỏ 1 lá bài
             dispatcher.applyEffect(Effects.MoveCardEffect(payload.cardId, 'hand', 'discardPile', player.id, null));
             
             // Tìm event mục tiêu và hủy nó
             const targetEvent = dispatcher.state.reactionStack.find(e => e.type === req.targetEvent && e.payload.targetId === player.id);
             if (targetEvent) {
                 targetEvent.payload.isCancelled = true;
                 dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} dùng [Xả Thân] vô hiệu hóa cẩm nang!`, 'important');
             }
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['askedXaThan'],
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
  },





  'hien-ke': {
      id: 'hien-ke',
      name: 'Hiến Kế',
      type: SKILL_TYPES.REACTION,
      hooks: {
          ON_HAND_EMPTY: (dispatcher, state, playerId, payload) => {
              const player = state.players.find(p => p.id === payload.playerId);
              if (!player || !player.isAlive) return;

              if (hasSkill(player, 'hien-ke')) {
                  dispatcher.state.reactionStack.push({
                      type: 'EVENT_TRIGGER_SKILL_ASK',
                      payload: { request: { type: 'ask_hien_ke', sourceId: player.id, skillId: 'hien-ke' } }
                  });
              }
          }
      },
      onReact: (dispatcher, state, payload) => {
          const req = (payload && payload.req) || state.waitingForResponse;
          if (!req || req.type !== 'ask_hien_ke') return;

          const player = state.players.find(p => p.id === req.sourceId);
          if (payload.doReact || payload.doUse || (payload.responseType === 'play')) {
              dispatcher.addLog(`🤝 ${dispatcher.getHeroName(player)} kích hoạt [Hiến Kế], rút 1 lá bài!`, 'skill');
              dispatcher.state.reactionStack.push({
                  type: 'EVENT_DRAW_CARDS',
                  payload: { targetId: player.id, amount: 1 }
              });
          }
          state.waitingForResponse = null;
      }
  },
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
         
         // Khóa kỹ năng mục tiêu đến hết lượt
         target.isSkillsSuppressed = true;
         
         // Tre Ngà: phán xét
         const suit = judgeCard.suit;
         
         // Hủy bỏ Ask Dodge hiện tại (sẽ thay thế bằng cái mới sau khi Bỏ bài xong)
         payload.isCancelled = true;

         // Yêu cầu mục tiêu bỏ 1 lá bài cùng chất với lá phán xét
         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_TRE_NGA_DISCARD',
            payload: { sourceId: player.id, targetId: payload.targetId, judgeSuit: suit, dodgeEventPayload: payload }
         });
         return true; // Báo hiệu đã chèn Event mới
      }
    },
    onReact: (dispatcher, state, payload) => {
      const req = (payload && payload.req) || state.waitingForResponse;
      if (!req || req.type !== 'ask_tre_nga_discard') return;
      
      const target = state.players.find(p => p.id === req.targetId);
      
      const doDiscard = payload.responseType === 'play' || payload.data?.doDiscard || payload.doDiscard || payload.doProvide;
      let cardId = payload.data?.cardId || payload.cardId;
      if (cardId === undefined && (payload.cardIndexSelected !== undefined || payload.data?.cardIndexSelected !== undefined)) {
          const idx = payload.cardIndexSelected !== undefined ? payload.cardIndexSelected : payload.data.cardIndexSelected;
          cardId = target.hand[idx]?.id;
      }
      if (doDiscard && cardId !== undefined) {
         // Người chơi bỏ bài thành công
         const cardIndex = target.hand.findIndex(c => c.id === cardId);
         if (cardIndex === -1) {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             return; // Lỗi đồng bộ
         }
         dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', target.id));
         dispatcher.addLog(`${target.name} đã bỏ 1 lá bài để hóa giải hiệu ứng khóa [Né] của [Tre Ngà]!`, 'normal');
         
         // Xong Tre Ngà, khôi phục lại Dodge event và Damage event
         dispatcher.applyEffect(Effects.SetWaitingEffect(null));
         dispatcher.state.reactionStack.push({
             type: 'EVENT_DAMAGE',
             payload: { sourceId: req.dodgeEventPayload.sourceId, targetId: req.dodgeEventPayload.targetId, amount: req.dodgeEventPayload.reason === 'chem' ? 1 : req.dodgeEventPayload.baseDamage || 1, damageType: 'normal', sourceCardId: req.dodgeEventPayload.sourceCardId, reason: req.dodgeEventPayload.reason }
         });
         dispatcher.state.reactionStack.push({
             type: 'EVENT_DO_ASK_DODGE',
             payload: { ...req.dodgeEventPayload, treNgaProcessed: true, isCancelled: false }
         });
      } else {
         // Chịu chém (Không thể né)
         dispatcher.addLog(`💥 ${target.name} không thể (hoặc không muốn) bỏ bài phán xét, không thể dùng [Né]!`, 'danger');
         
         dispatcher.applyEffect(Effects.SetWaitingEffect(null));
         dispatcher.state.reactionStack.push({
             type: 'EVENT_DAMAGE',
             payload: { sourceId: req.dodgeEventPayload.sourceId, targetId: req.dodgeEventPayload.targetId, amount: req.dodgeEventPayload.reason === 'chem' ? 1 : req.dodgeEventPayload.baseDamage || 1, damageType: 'normal', sourceCardId: req.dodgeEventPayload.sourceCardId, reason: req.dodgeEventPayload.reason }
         });
         dispatcher.state.reactionStack.push({
             type: 'EVENT_DO_ASK_DODGE',
             payload: { ...req.dodgeEventPayload, treNgaProcessed: true, unavoidable: true, isCancelled: false }
         });
      }
    },
    turnResetFlags: [],
  },

  'hoa-tien': {
    id: 'hoa-tien',
    name: 'Hóa Tiên',
    type: SKILL_TYPES.LIMITED, // Hạn Định Kỹ, kích hoạt khi Hấp Hối
    hooks: {
      DYING: (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         const target = state.players.find(p => p.id === playerId);
         if (!target || target.hoaTienUsed) return false;
         
         const currentReq = state.waitingForResponse;
         state.waitingForResponse = null;
         
         dispatcher.state.reactionStack.push({
             type: 'EVENT_TRIGGER_SKILL_ASK',
             payload: { 
                 request: { 
                     type: 'ask_hoa_tien', 
                     targetId: playerId, 
                     sourceId: playerId, 
                     skillId: 'hoa-tien',
                     originalReq: currentReq
                 } 
             }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
      const target = state.players.find(p => p.id === payload.playerId);
      if (!target || target.hoaTienUsed) {
          state.waitingForResponse = state.waitingForResponse?.originalReq || null;
          return;
      }
      
      if (payload.responseType === 'skip' || payload.responseType === 'cancel') {
          state.waitingForResponse = state.waitingForResponse?.originalReq || null;
          return;
      }
      
      // Thực thi Hóa Tiên
      dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'hoaTienUsed', true));
      
      // Lật mặt tướng nếu đang ẩn
      const heroIdx = target.heroes?.findIndex(h => h?.skills?.some(s => s.id === 'hoa-tien'));
      if (heroIdx !== -1 && target.revealedHeroes && !target.revealedHeroes[heroIdx]) {
         target.revealedHeroes[heroIdx] = true;
      }
      
      state.waitingForResponse = null; // Bỏ qua ask_peach vì đã sống lại
      
      // 1. Vứt toàn bộ bài (tay + trang bị + phán xét)
      const allCards = [...target.hand, ...target.equipment, ...(target.judgementArea || [])];
      allCards.forEach(c => {
          const zone = target.hand.includes(c) ? 'hand' : (target.equipment.includes(c) ? 'equipment' : 'judgementArea');
          dispatcher.applyEffect(Effects.MoveCardEffect(c.id, zone, 'discardPile', target.id));
      });
      
      // 2. Hồi 3 HP (qua Reducer)
      const newHp = Math.min(3, target.maxHp);
      dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'hp', newHp));
      
      // Đưa tướng về trạng thái ban đầu (giải trừ Xiềng Xích, Lật úp nếu có)
      dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'isChained', false));
      dispatcher.applyEffect(Effects.SetFlagEffect(target.id, 'isFlipped', false));
      
      // 3. Rút 3 lá
      dispatcher.applyEffect(Effects.DrawCardEffect(target.id, 3));
      dispatcher.addLog(`🌟 ${target.name} đã hóa thành Tiên! Hồi 3 HP, giải trừ trạng thái và rút 3 lá bài!`, 'important');
      
      // Bỏ qua ask_peach hiện tại vì HP đã > 0, EVENT_DO_DYING sẽ tự check HP
    },
    turnResetFlags: ['askedHoaTien'],
  },

  'uy-chan': {
    id: 'uy-chan',
    name: 'Uy Chấn (Tỏa Định Kỹ)',
    type: SKILL_TYPES.PASSIVE,
    canTriggerUnrevealed: true,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (payload.targetId !== player.id) return false;
         if (player.hp <= 0 || !player.isAlive) return false;
         if (player.askedUyChan) return false;
         if (payload.sourceId === undefined || payload.sourceId === player.id) return false;
         if (payload.reason !== 'chem') return false;

         const sourceCard = state.discardPile.find(c => c.id === payload.sourceCardId);
         if (sourceCard && (sourceCard.suit === CARD_SUITS.HEART || sourceCard.suit === CARD_SUITS.DIAMOND || sourceCard.color === 'red')) {
            dispatcher.state.reactionStack.push({
               type: 'EVENT_TRIGGER_SKILL_ASK',
               payload: { request: { type: 'ask_uy_chan', sourceId: player.id, targetId: payload.sourceId, responderId: payload.sourceId, skillId: 'uy-chan' }}
            });
            return true;
         }
         return false;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_uy_chan') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedUyChan', true));

       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide) {
          const target = state.players.find(p => p.id === req.targetId);
          if (target) {
                 dispatcher.addLog(`🐉 ${dispatcher.getHeroName(player)} dùng [Uy Chấn] uy hiếp ${dispatcher.getHeroName(target)}!`, 'important');
                 
                 if (payload.choice === 'heal' || payload.option === 'heal') {
                     dispatcher.applyEffect(Effects.RecoverEffect(player.id, 1));
                     dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} được hồi 1 HP!`, 'success');
                 } else {
                     dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 1));
                     dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} rút 1 lá bài!`, 'success');
                 }
          }
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['askedUyChan'],
    aiConfig: { priority: 2, condition: () => false }
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
            payload: { request: { type: 'ask_an_bang', sourceId: player.id, skillId: 'an-bang' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_an_bang') return;
       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetFlagEffect(req.sourceId, 'anBangUsed', true));
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide || payload.doUse) {
          dispatcher.applyEffect(Effects.SetFlagEffect(req.sourceId, 'anBangUsed', true));
          dispatcher.applyEffect(Effects.DrawCardEffect(req.sourceId, 1));
          const player = state.players.find(p => p.id === req.sourceId);
          dispatcher.addLog(`🕊️ ${dispatcher.getHeroName(player)} dùng [An Bang] rút 1 lá bài!`, 'important');
          
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
            payload: { request: { type: 'ask_duong_quan', sourceId: player.id, skillId: 'duong-quan' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_duong_quan') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'duongQuanUsed', true));

       if (payload.canceled || !payload.doProvide || !payload.choices || payload.choices.length === 0) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
           // Lựa chọn Dưỡng Quân
           let slashCount = 0;
           for (const choice of payload.choices) {
               if (choice.type === 'opt1') {
                   dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'skipJudgePhase', true));
                   dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'skipDrawPhase', true));
                   slashCount++;
                   dispatcher.addLog(`💪 ${dispatcher.getHeroName(player)} chọn Bỏ qua Phán Xét & Rút Bài để [Chém] ảo!`, 'important');
               } else if (choice.type === 'opt2') {
                   dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'skipActionPhase', true));
                   if (choice.equipId && player.equipment[choice.equipId]) {
                       const discardedEquip = player.equipment[choice.equipId];
                       player.equipment[choice.equipId] = null;
                       state.discardPile.push(discardedEquip);
                   }
                   slashCount++;
                   dispatcher.addLog(`💪 ${dispatcher.getHeroName(player)} chọn Bỏ qua Hành Động & bỏ trang bị để [Chém] ảo!`, 'important');
               } else if (choice.type === 'opt3') {
                   dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'skipDiscardPhase', true));
                   dispatcher.applyEffect(Effects.TurnOverEffect(player.id));
                   slashCount++;
                   dispatcher.addLog(`💪 ${dispatcher.getHeroName(player)} chọn Bỏ qua Bỏ Bài & Lật Mặt để [Chém] ảo!`, 'important');
               }
           }
           
           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           
           // Phát sinh các Slash ảo
           const rng = new SeededRNG(state.seed);
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
                           cardId: `virtual_slash_${rng.next()}`,
                           activeSkill: 'duong-quan'
                       }
                   });
               }
           }
           state.seed = rng.seed;
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
         console.log('[DEBUG_PHAT_TAM] TURN_BEGIN triggered', playerId, payload);
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (!hasSkill(player, 'phat-tam') || player.isSkillsSuppressed) return false;
         
         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_phat_tam', sourceId: player.id, skillId: 'phat-tam' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_phat_tam') return;

       const player = state.players.find(p => p.id === req.sourceId);
       
       if (payload.canceled || !payload.doProvide) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.addLog(`🙏 ${dispatcher.getHeroName(player)} dùng [Phật Tâm]!`, 'important');
          
          if (state.deck.length === 0) {
              state.deck = [...state.discardPile].reverse();
              state.discardPile = [];
          }
          if (state.deck.length === 0) {
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
              return;
          }
          
          const judgeCard = state.deck.pop();
          const isBlack = judgeCard.color === 'black';
          
          dispatcher.addLog(`Phán xét: [${judgeCard.name}] chất ${judgeCard.suit}.`);
          
          if (isBlack) {
              player.hand.push(judgeCard);
              dispatcher.addLog(`✅ Bài đen! Nhận lá bài và có thể phán xét tiếp.`, 'success');
              
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
              dispatcher.state.reactionStack.push({
                 type: 'EVENT_TRIGGER_SKILL_ASK',
                 payload: { request: { type: 'ask_phat_tam', sourceId: player.id, skillId: 'phat-tam' }}
              });
          } else {
              state.discardPile.push(judgeCard);
              dispatcher.addLog(`❌ Bài đỏ! Kết thúc Phật Tâm.`, 'danger');
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          }
       }
    },
    aiConfig: { priority: 7, condition: () => true }
  },

  'pha-thanh': {
    id: 'pha-thanh',
    name: 'Phá Thành',
    type: SKILL_TYPES.ACTIVE,
    hooks: {
      DRAW_PHASE: (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         const player = state.players.find(p => p.id === playerId);
         if (player.phaThanhUsed) return false;

         // Interrupt draw_phase
         dispatcher.state.waitingForResponse = null;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_pha_thanh', sourceId: playerId, skillId: 'pha-thanh' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_pha_thanh') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'phaThanhUsed', true));

       if (payload.canceled) {
          // Khôi phục lại trạng thái rút bài nếu hủy kỹ năng
          dispatcher.state.waitingForResponse = { type: 'draw_phase', responderId: player.id, targetId: player.id };
       } else if (payload.doProvide) {
          // Phá thành: Thay vì rút bài, tiến hành phán xét
          dispatcher.addLog(`💥 ${dispatcher.getHeroName(player)} dùng [Phá Thành] bỏ rút bài để phán xét!`, 'important');
          
          dispatcher.state.reactionStack.push({
              type: 'EVENT_JUDGE',
              payload: { targetId: player.id, reason: 'pha-thanh', sourceId: player.id }
          });
          
          // Hủy trạng thái chờ rút bài (bỏ qua rút bài)
          dispatcher.state.waitingForResponse = null;
       }
    },
    turnResetFlags: ['phaThanhUsed', 'phaThanhColor'],
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
            payload: { request: { type: 'ask_doat_sao', sourceId: player.id, skillId: 'doat-sao' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req) return;

       if (req.type === 'ask_doat_sao') {
           const player = state.players.find(p => p.id === req.sourceId);
           dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'doatSaoUsed', true));

           console.log('[DEBUG_DOAT_SAO] payload:', payload);
           if (payload.canceled || !payload.doProvide) {
              console.log('[DEBUG_DOAT_SAO] Canceled or not doUse. Canceled:', payload.canceled, 'doUse:', payload.doUse);
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           } else {
              console.log('[DEBUG_DOAT_SAO] Applying effects for doat-sao');
              dispatcher.applyEffect(Effects.TurnOverEffect(player.id));
              dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 4));
              dispatcher.addLog(`⭐ ${dispatcher.getHeroName(player)} dùng [Đoạt Sáo] lật mặt và rút 4 bài!`, 'important');
              
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));

              
              // Chuyển sang bước chọn 1 lá để bỏ
              dispatcher.state.reactionStack.push({
                 type: 'EVENT_TRIGGER_SKILL_ASK',
                 payload: { request: { type: 'ask_doat_sao_discard', sourceId: player.id, skillId: 'doat-sao' }}
              });
           }
       } else if (req.type === 'ask_doat_sao_discard') {
           const player = state.players.find(p => p.id === req.sourceId);
            if (payload.cardId || payload.cardIndexSelected !== undefined) {
                const cardIdx = payload.cardId ? player.hand.findIndex(c => c.id === payload.cardId) : payload.cardIndexSelected;
                if (cardIdx !== -1 && cardIdx < player.hand.length) {
                   const card = player.hand[cardIdx];
                   if (card.type === CARD_TYPES.EQUIP) {
                       // Sử dụng trang bị
                       dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'equipment', player.id, player.id));
                       dispatcher.addLog(`⭐ ${dispatcher.getHeroName(player)} dùng [Đoạt Sáo] sử dụng Trang bị [${card.name}]!`, 'success');
                   } else {
                       dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id, null));
                       dispatcher.addLog(`⭐ ${dispatcher.getHeroName(player)} dùng [Đoạt Sáo] bỏ [${card.name}]!`, 'normal');
                   }
               }
           }
           dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    turnResetFlags: ['doatSaoUsed'],
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
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
            payload: { request: { type: 'ask_nam_quoc_son_ha', sourceId: player.id, amount: payload.amount, damageSourceId: payload.sourceId, sourceCardId: payload.sourceCardId, skillId: 'nam-quoc-son-ha' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_nam_quoc_son_ha') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedNqsh', true));

       if (!payload.doUse || payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doUse) {
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
             
             dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} dùng [Nam Quốc Sơn Hà] rút bài!`, 'important');
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          }
       } else {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
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
            payload: { request: { type: 'ask_khoan_dan', sourceId: player.id, skillId: 'khoan-dan' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_khoan_dan') return;

       const player = state.players.find(p => p.id === req.sourceId);
       dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedKhoanDan', true));

       if (!payload.doUse || payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doUse && payload.targetId !== undefined) {
          const target = state.players.find(p => p.id === payload.targetId);
          if (target) {
             {
                const toDraw = Math.max(0, Math.min(target.maxHp, 5) - target.hand.length);
                if (toDraw > 0) {
                   dispatcher.applyEffect(Effects.DrawCardEffect(target.id, toDraw));
                   dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} dùng [Khoan Dân] giúp ${dispatcher.getHeroName(target)} rút ${toDraw} lá bài!`, 'important');
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
         
         const hasRed = player.hand.some(c => {
             const suit = dispatcher.engine ? dispatcher.engine.getEffectiveSuit(player, c) : (hasSkillEvenIfHidden(player, 'quoc-sac') && (c.suit === CARD_SUITS.SPADE) ? CARD_SUITS.HEART : c.suit);
             return suit === CARD_SUITS.HEART;
         });
         if (!hasRed) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_hien_hau', sourceId: player.id, amount: payload.amount, damageEventPayload: payload, skillId: 'hien-hau' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_hien_hau') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || payload.doUse === false || payload.doProvide === false) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if ((payload.doProvide || payload.doUse) && payload.targetId !== undefined && (payload.cardId || payload.cardIdx !== undefined)) {
             // Bỏ 1 lá đỏ
             const cardIdToDiscard = payload.cardId || (player.hand[payload.cardIdx] && player.hand[payload.cardIdx].id);
             if (!cardIdToDiscard) {
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                 return;
             }
             dispatcher.applyEffect(Effects.MoveCardEffect(cardIdToDiscard, 'hand', 'discardPile', player.id, null));
             
             // Ngăn chặn sát thương bằng cách sửa Event trên Stack thật
             const applyDamageEvent = dispatcher.state.reactionStack.findLast(e => e.type === 'EVENT_APPLY_DAMAGE');
             if (applyDamageEvent) {
                 applyDamageEvent.payload.isCancelled = true;
             }
             
             // Xử lý target
             const target = state.players.find(p => p.id === payload.targetId);
             if (target) {
                 dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} dùng [Hiền Hậu] ngăn sát thương!`, 'important');
                 
                 if (payload.option === 1) {
                     // Lựa chọn 1: Mục tiêu nhận 1 điểm sát thương, sau đó rút X lá bài (X là số Sinh lực đã mất của họ, tối đa 5).
                     dispatcher.applyEffect(Effects.DamageEffect(player.id, target.id, 1, 'normal'));
                     const updatedTarget1 = dispatcher.state.players.find(p => p.id === target.id);
                     
                     if (updatedTarget1) {
                         const lostHp = Math.min(updatedTarget1.maxHp - updatedTarget1.hp, 5);
                         if (lostHp > 0) {
                             dispatcher.applyEffect(Effects.DrawCardEffect(target.id, lostHp));
                             dispatcher.addLog(`🃏 ${dispatcher.getHeroName(target)} rút ${lostHp} lá bài từ [Hiền Hậu]!`, 'info');
                         }
                     }

                     if (updatedTarget1 && updatedTarget1.hp <= 0) {
                         dispatcher.state.reactionStack.push({ type: 'EVENT_DYING', payload: { targetId: target.id, sourceId: player.id } });
                     }
                 } else {
                     // Lựa chọn 2: Tướng đó mất 1 điểm Sinh lực, sau đó thu lấy lá bài bạn vừa bỏ.
                     dispatcher.applyEffect(Effects.LoseHpEffect(target.id, 1));
                     const updatedTarget2 = dispatcher.state.players.find(p => p.id === target.id);
                     
                     dispatcher.applyEffect(Effects.MoveCardEffect(cardIdToDiscard, 'discardPile', 'hand', null, target.id));
                     dispatcher.addLog(`🤚 ${dispatcher.getHeroName(target)} thu lấy lá bài từ [Hiền Hậu]!`, 'info');

                     if (updatedTarget2 && updatedTarget2.hp <= 0) {
                         dispatcher.state.reactionStack.push({ type: 'EVENT_DYING', payload: { targetId: target.id, sourceId: player.id } });
                     }
                 }
             }
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
        } else {
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
        }
    },
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
         if (!hasSkill(player, 'doi-su') || player.isSkillsSuppressed) return false;
         if (payload.sourceId === undefined || payload.sourceId === player.id) return false;
         
         const source = state.players.find(p => p.id === payload.sourceId);
         if (!source || (source.hand.length === 0 && source.equipment.length === 0)) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_doi_su', sourceId: player.id, damageSourceId: payload.sourceId, skillId: 'doi-su' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_doi_su') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled || !payload.doProvide) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          const damageSource = state.players.find(p => p.id === req.damageSourceId);
          if (damageSource && (damageSource.hand.length > 0 || damageSource.equipment.length > 0)) {
              let targetZone = damageSource.hand.length > 0 ? 'hand' : 'equipment';
              let card;
              if (targetZone === 'hand') {
                  const randIdx = Math.floor(Math.random() * damageSource.hand.length);
                  card = damageSource.hand[randIdx];
              } else {
                  card = damageSource.equipment[0];
              }
              
              dispatcher.applyEffect(Effects.MoveCardEffect(card.id, targetZone, 'hand', damageSource.id, player.id));
              
              dispatcher.addLog(`📜 ${dispatcher.getHeroName(player)} dùng [Đối Sứ] thu lấy 1 lá bài của ${dispatcher.getHeroName(damageSource)}!`, 'important');
          }
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       }
    },
    aiConfig: { priority: 6, condition: (state, bot, targets) => true }
  },

  'that-tram-so': {
    id: 'that-tram-so',
    name: 'Thất Trảm Sớ',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (!hasSkill(player, 'that-tram-so') || player.isSkillsSuppressed) return false;
         if (payload.sourceId === undefined || payload.sourceId === player.id) return false;
         
         const source = state.players.find(p => p.id === payload.sourceId);
         if (!source || !source.isAlive) return false;

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_that_tram_so', sourceId: player.id, damageSourceId: payload.sourceId, skillId: 'that-tram-so' }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || (req.type !== 'ask_that_tram_so' && req.type !== 'ask_that_tram_so_punish')) return;

       if (req.type === 'ask_that_tram_so') {
           const chuVanAn = state.players.find(p => p.id === req.sourceId);
           const target = state.players.find(p => p.id === req.damageSourceId);
           
           if (payload.canceled || (!payload.doProvide && payload.playerId === chuVanAn.id)) {
               dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           } else if (payload.doUse && payload.playerId === chuVanAn.id) {
               dispatcher.addLog(`📜 ${dispatcher.getHeroName(chuVanAn)} dâng [Thất Trảm Sớ] lên ${dispatcher.getHeroName(target)}!`, 'important');
               dispatcher.applyEffect(Effects.SetWaitingEffect(null));
               // Phán xét Thất Trảm Sớ
               dispatcher.state.reactionStack.push({
                   type: 'EVENT_JUDGE',
                   payload: { targetId: chuVanAn.id, reason: 'that-tram-so', sourceId: chuVanAn.id, damageSourceId: target.id }
               });
           } else {
               dispatcher.applyEffect(Effects.DamageEffect(req.sourceId, target.id, 1, 'normal'));
               dispatcher.addLog(`💥 ${target.name} mất 1 máu do [Thất Trảm Sớ]!`, 'important');
               
               const updatedTarget = dispatcher.state.players.find(p => p.id === target.id);
               if (updatedTarget && updatedTarget.hp <= 0) {
                   dispatcher.state.reactionStack.push({ type: 'EVENT_DYING', payload: { targetId: target.id, sourceId: req.sourceId } });
               }
               
               dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           }
       } else if (req.type === 'ask_that_tram_so_punish') {
           const target = state.players.find(p => p.id === req.targetId);
           if (payload.doReact && payload.discardCards && payload.discardCards.length === 2) {
               payload.discardCards.forEach(cardId => {
                   dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', target.id, null));
               });
               dispatcher.addLog(`✨ ${target.name} bỏ 2 lá bài để tránh [Thất Trảm Sớ]!`, 'info');
               dispatcher.applyEffect(Effects.SetWaitingEffect(null));
           } else {
               dispatcher.applyEffect(Effects.SetWaitingEffect(null));
               dispatcher.state.reactionStack.push({
                   type: 'EVENT_DAMAGE',
                   payload: { sourceId: req.sourceId, targetId: target.id, amount: 1, damageType: 'normal', reason: 'that_tram_so' }
               });
           }
       }
    },
    aiConfig: { priority: 6, condition: (state, bot, targets) => true }
  },

  'hoa-nghi': {
    id: 'hoa-nghi',
    name: 'Hòa Nghị',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      POST_DAMAGE: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (!player || player.id !== payload.targetId) return false;
         
         if (!hasSkill(player, 'hoa-nghi') || player.isSkillsSuppressed) return false;

         if (state.deck.length < 2) {
            state.deck = [...state.deck, ...[...state.discardPile].reverse()];
            state.discardPile = [];
         }
         if (state.deck.length === 0) return false;
         
         const drawnCards = [];
         drawnCards.push(state.deck.pop());
         if (state.deck.length > 0) drawnCards.push(state.deck.pop());

         dispatcher.state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { request: { type: 'ask_hoa_nghi', sourceId: player.id, skillId: 'hoa-nghi', targetedPayload: payload, drawnCards }}
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
       const req = (payload && payload.req) || state.waitingForResponse;
       if (!req || req.type !== 'ask_hoa_nghi') return;

       const player = state.players.find(p => p.id === req.sourceId);

       if (payload.canceled) {
          req.drawnCards.forEach(c => state.discardPile.push(c));
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide && payload.distribution) {
          payload.distribution.forEach(dist => {
             const card = req.drawnCards.find(c => c.id === dist.cardId);
             const target = state.players.find(p => p.id === Number(dist.targetId));
             if (card && target) {
                 target.hand.push(card);
             }
          });
          req.drawnCards.forEach(c => {
             if (!payload.distribution.some(d => d.cardId === c.id)) {
                 state.discardPile.push(c);
             }
          });
          
          dispatcher.addLog(`🤝 ${dispatcher.getHeroName(player)} dùng [Hòa Nghị] phân phối ${req.drawnCards.length} bài!`, 'important');
          
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
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
    canTriggerUnrevealed: true,
    hooks: {
      DYING: (dispatcher, state, playerId, payload) => {
         const player = state.players.find(p => p.id === playerId);
         if (player.id !== payload.targetId) return false;
         if (!hasSkillEvenIfHidden(player, 'ho-chu') || player.isSkillsSuppressed) return false;

         if (state.deck.length === 0) {
            state.deck = [...state.discardPile].reverse();
            state.discardPile = [];
         }
         const trungCard = state.deck.pop();
         dispatcher.addLog(`🙏 ${player.name} kích hoạt [Hộ Chủ], lật [Trung]: ${trungCard.suit} ${trungCard.rank}`, 'important');
         
         const existingTrungs = player.trungCards || [];
         const isDuplicate = existingTrungs.some(c => c.rank === trungCard.rank);
         
         if (!isDuplicate) {
            dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'trungCards', [...existingTrungs, trungCard]));
            dispatcher.applyEffect(Effects.RecoverEffect(player.id, 1 - player.hp)); // Hồi phục ĐẾN 1 điểm sinh lực
            // Set isDying to false via effect
            dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'isDying', false));
            dispatcher.addLog(`✨ [Trung] không trùng điểm! Hồi phục đến 1 HP!`, 'success');
         } else {
            state.discardPile.push(trungCard);
            dispatcher.addLog(`❌ [Trung] trùng điểm! [Hộ Chủ] thất bại.`, 'danger');
         }
         
         return true;
      },
      MAX_CARDS_MODIFIER: (dispatcher, state, playerId, currentMax) => {
          const player = state.players.find(p => p.id === playerId);
          if (hasSkillEvenIfHidden(player, 'ho-chu') && player.trungCards && player.trungCards.length > 0) {
              return player.trungCards.length; // Giới hạn trữ bài bằng số lá Trung
          }
          return currentMax;
      }
    },
    aiConfig: { priority: 6, condition: (state, bot, targets) => false }
  },

  'tien-phat': {
    id: 'tien-phat',
    name: 'Tiên Phát',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      'ON_ASK_DODGE': (dispatcher, state, playerId, payload) => {
         if (playerId !== payload.targetId) return false;
         
         const allies = state.players.filter(p => p.id !== playerId && p.isAlive && getPlayerFaction(p) === 'Việt' && p.hand.some(c => c.name === 'Né' || c.virtualName === 'Né'));
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
                  responderId: allies[0].id,
                  originalReq: currentReq,
                  askQueue: allies.map(p => p.id),
                  skillId: 'tien-phat'
               }
            }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
        const req = (payload && payload.req) || state.waitingForResponse;
        if (!req || req.type !== 'ask_tien_phat') return;

        const target = state.players.find(p => p.id === req.targetId); // Người được nhờ đánh Né

        
            if (payload.doReact) {
                // Đồng minh đồng ý đánh Né thay
                const dodgeIdx = payload.cardId !== undefined ? target.hand.findIndex(c => c.id === payload.cardId) : target.hand.findIndex(c => c.name === 'Né');
                if (dodgeIdx >= 0) {
                    const dodgeCard = target.hand[dodgeIdx];
                    dispatcher.applyEffect(Effects.MoveCardEffect(dodgeCard.id, 'hand', 'playedCards', target.id, null, 'tien-phat'));
                    dispatcher.addLog(`🛡️ ${target.name} đã dùng [Né] thay cho Chủ Công!`, 'success');
                    
                    dispatcher.state.waitingForResponse = req.originalReq;
                    
                    // Phát sự kiện đệ quy để handleResponseAction gốc nhận được Dodge
                    dispatcher.resolveEvent({
                        type: 'EVENT_ACTION_REACT',
                        payload: { playerId: req.originalReq.responderId ?? req.sourceId, responseType: 'play', data: { virtualCardName: 'Né', activeSkill: 'tien-phat' } }
                    });
                }
            } else {
                // Đồng minh từ chối hoặc không có Né
                req.askQueue.shift();
                if (req.askQueue.length > 0) {
                    req.targetId = req.askQueue[0];
                    req.responderId = req.askQueue[0];
                } else {
                    dispatcher.addLog(`💔 Không ai đánh thay cho Chủ Công!`, 'danger');
                    // Trả về request gốc để tự chịu đòn
                    req.originalReq.tienPhatFailed = true;
                    dispatcher.state.waitingForResponse = req.originalReq;
                    dispatcher.applyEffect(Effects.SetWaitingEffect(req.originalReq));
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
                const rng = new SeededRNG(state.seed);
                state.deck = rng.shuffle(state.discardPile).concat(state.deck);
                state.discardPile = [];
                state.seed = rng.seed;
            }
            const viewedCards = state.deck.slice(-viewCount).reverse();
            
            dispatcher.applyEffect(Effects.SetWaitingEffect({
                type: 'ask_banh_chung',
                targetId: playerId,
                sourceId: playerId,
                viewedCards,
                viewCount,
                  skillId: 'banh-chung'
               }));
            return true;
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = (payload && payload.req) || state.waitingForResponse;
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
  'dam-bac': {
    id: 'dam-bac',
    name: 'Đạm Bạc',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        END_PHASE: (dispatcher, state, playerId, payload) => {
            if (playerId !== payload.targetId) return false;
            const player = state.players.find(p => p.id === playerId);
            
            // Đạm Bạc: Cuối lượt, nếu trên tay bạn không có Cẩm Nang, bạn có thể chọn 1 người. Người đó rút 2 lá bài.
            const hasTrick = player.hand.some(c => c.type === CARD_TYPES.TRICK);
            if (hasTrick) return false;
            
            dispatcher.applyEffect(Effects.SetWaitingEffect({
                type: 'ask_dam_bac',
                skillId: 'dam-bac',
                targetId: playerId,
                sourceId: playerId,
                min: 1,
                max: 1,
                message: 'Đạm Bạc: Bạn không có Cẩm Nang trên tay. Chọn 1 người để họ rút 2 lá bài.'
            }));
            return true;
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = (payload && payload.req) || state.waitingForResponse;
        if (!req || req.type !== 'ask_dam_bac' || req.skillId !== 'dam-bac') return;
        
        const player = state.players.find(p => p.id === req.targetId || p.id === req.sourceId);
        
        if (payload && payload.doUse && payload.targets && payload.targets.length === 1) {
             const targetId = payload.targets[0];
             const targetPlayer = state.players.find(p => p.id === targetId);
             dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} phát động [Đạm Bạc], cho ${dispatcher.getHeroName(targetPlayer)} rút 2 lá bài!`, 'important');
             dispatcher.applyEffect(Effects.DrawCardEffect(targetId, 2));
        }
        
        dispatcher.state.waitingForResponse = null;
    },
    aiConfig: { priority: 9, condition: () => false }
  },

  'xuan-huong': {
    id: 'xuan-huong',
    name: 'Xuân Hương',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
        ON_EQUIP_LOST: (dispatcher, state, playerId, payload) => {
            const player = state.players.find(p => p.id === playerId);
            if (player.id !== payload.sourceId) return false;
            if (!hasSkill(player, 'xuan-huong') || player.isSkillsSuppressed) return false;
            
            dispatcher.state.reactionStack.push({
               type: 'EVENT_TRIGGER_SKILL_ASK',
               payload: { request: { type: 'ask_xuan_huong', sourceId: player.id, skillId: 'xuan-huong' } }
            });
            return true;
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = (payload && payload.req) || state.waitingForResponse;
        if (!req || req.type !== 'ask_xuan_huong') return;
        
        const player = state.players.find(p => p.id === req.sourceId);
        
        if (payload.doReact) {
            dispatcher.addLog(`✨ ${player.name} dùng [Xuân Hương] rút 2 lá bài!`, 'important');
            dispatcher.applyEffect(Effects.DrawCardEffect(player.id, 2));
        }
        dispatcher.applyEffect(Effects.SetWaitingEffect(null));
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

            // Interrupt draw_phase to ask for Khoi Nghia first
            dispatcher.state.waitingForResponse = null;
            dispatcher.state.reactionStack.push({
                type: 'EVENT_TRIGGER_SKILL_ASK',
                payload: { request: { type: 'ask_khoi_nghia', sourceId: playerId, skillId: 'khoi-nghia',  } }
            });
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
        const req = (payload && payload.req) || state.waitingForResponse;
        if (!req || req.type !== 'ask_khoi_nghia') return;
        
        const player = state.players.find(p => p.id === req.sourceId);
        dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedKhoiNghia', true));
        
        
            if (!payload.doProvide || payload.canceled) {
                // Tiếp tục draw_phase thay vì restore để tránh hãm game
                dispatcher.state.waitingForResponse = null;
                dispatcher.state.reactionStack.push({ type: 'EVENT_ACTION_DRAW_CARDS', payload: { targetId: player.id } });
            } else if (payload.doUse) {
                dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'khoiNghiaActive', true));
                dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'khoiNghiaDrawLess', true));
                dispatcher.addLog(`✨ ${player.name} dùng [Khởi Nghĩa]! Lượt này Chém/Quyết Đấu +1 ST, rút ít hơn 1 bài.`, 'important');
                
                // Tiếp tục draw_phase bằng cách đẩy EVENT_ACTION_DRAW_CARDS
                dispatcher.state.waitingForResponse = null;
                dispatcher.state.reactionStack.push({ type: 'EVENT_ACTION_DRAW_CARDS', payload: { targetId: player.id } });
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

            // Interrupt draw_phase
            dispatcher.state.waitingForResponse = null;
            dispatcher.state.reactionStack.push({
                type: 'EVENT_TRIGGER_SKILL_ASK',
                payload: { request: { type: 'ask_da_trach', sourceId: playerId, skillId: 'da-trach' } }
            });
        }
    },
    onReact: (dispatcher, state, payload) => {
        const req = (payload && payload.req) || state.waitingForResponse;
        if (!req || req.type !== 'ask_da_trach') return;
        
        const player = state.players.find(p => p.id === req.sourceId);
        dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'askedDaTrach', true));
        
        
            if (!payload.doProvide || payload.canceled) {
                // Khôi phục lại trạng thái rút bài nếu hủy kỹ năng
                dispatcher.state.waitingForResponse = { type: 'draw_phase', responderId: player.id, targetId: player.id };
            } else if (payload.doUse) {
                // Đã dùng Dạ Trạch, kết thúc luôn (hủy rút bài mặc định bằng cách cho qua Play Phase)
                dispatcher.state.waitingForResponse = null;
                // Chuyển sang phase action
                dispatcher.state.phase = 'action';
                
                if (payload.targets && payload.targets.length > 0) {
                    payload.targets.forEach(tId => {
                        const target = state.players.find(p => p.id === tId);
                        if (target && target.hand.length > 0) {
                            const rng = new SeededRNG(state.seed);
                            const randIdx = Math.floor(rng.next() * target.hand.length);
                            state.seed = rng.seed;
                            const stolenId = target.hand[randIdx].id;
                            dispatcher.applyEffect(Effects.MoveCardEffect(stolenId, 'hand', 'hand', target.id, player.id, 'da-trach'));
                        }
                    });
                    dispatcher.addLog(`🦇 ${dispatcher.getHeroName(player)} dùng [Dạ Trạch] cướp bài của ${payload.targets.length} người chơi!`, 'important');
                }
            }
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
          if (cardType === CARD_TYPES.TRICK && !isDelayed && !isReforge) {
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
             const askDodgeEvent = dispatcher.state.reactionStack.find(e => e.type === 'EVENT_DO_ASK_DODGE' && e.payload.targetId === target.id);
             if (askDodgeEvent) {
                askDodgeEvent.payload.unavoidable = true;
                dispatcher.addLog(`🏹 ${dispatcher.getHeroName(player)} kích hoạt [Nỏ Thần]: Bài trên tay (${player.hand.length}) ≥ mục tiêu (${target.hand.length}) => ${dispatcher.getHeroName(target)} BỊ KHÓA [NÉ]!`, 'important');
                hasEffect = true;
             }
         }
         
         return hasEffect;
      },
      ON_DAMAGE_CALC: (dispatcher, state, playerId, payload) => {
         if (payload.sourceId !== playerId) return;
         if (!payload.isSlashOrDuel) return;
         
         const player = state.players.find(p => p.id === playerId);
         const target = state.players.find(p => p.id === payload.targetId);
         if (!player || !target) return;
         
         // Quyết Đấu không phải là Sát, nhưng Nỏ Thần chỉ ghi "Sát này gây thêm 1 sát thương"
         // Cần kiểm tra đúng là Sát!
         if (payload.damageType === 'normal' && payload.sourceCardId) {
             // Thường Sát có sourceCardId, Quyết Đấu gây sát thương trực tiếp
             // Nhưng isSlashOrDuel cover cả 2. Nỏ Thần chỉ kích hoạt cho Sát!
             const card = state.discardPile.find(c => c.id === payload.sourceCardId) || 
                          (state.playedCards && state.playedCards.find(c => c.id === payload.sourceCardId));
             console.log("[DEBUG_NOTHAN]", card); if (card && card.name !== 'Chém' && card.virtualName !== 'Chém') return;
             
             if (player.hp <= target.hp) {
                 payload.amount += 1;
                 dispatcher.addLog(`🏹 ${dispatcher.getHeroName(player)} kích hoạt [Nỏ Thần]: HP (${player.hp}) ≤ mục tiêu (${target.hp}) => Tăng thêm 1 điểm Sát thương!`, 'important');
             }
         }
      }
    },
    aiConfig: { priority: 5, condition: () => false }
  },

  'thong-ngon': {
    id: 'thong-ngon',
    name: 'Thông Ngôn',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      AFTER_JUDGEMENT: (dispatcher, state, playerId, payload) => {
         const { targetId, judgeCard } = payload;
         if (playerId !== targetId) return false;
         const player = state.players.find(p => p.id === targetId);
         if (!player || !hasSkill(player, 'thong-ngon') || player.isSkillsSuppressed) return;

         dispatcher.state.reactionStack.push({
             type: 'EVENT_TRIGGER_SKILL_ASK',
             payload: { request: { type: 'ask_thong_ngon', sourceId: targetId, skillId: 'thong-ngon', cardName: judgeCard.name, suit: judgeCard.suit, judgeCardId: judgeCard.id } }
         });
         return true; // We pause execution
      }
    },
    onReact: (dispatcher, state, payload) => {
        console.log('[DEBUG_THONG_NGON] onReact start. currentJudgeCard:', state.currentJudgeCard?.name);
        const req = (payload && payload.req) || state.waitingForResponse;
        if (!req || req.type !== 'ask_thong_ngon') return;

        const player = state.players.find(p => p.id === req.sourceId);
        
        if (payload.canceled || !payload.doProvide) {
             dispatcher.state.discardPile.push(state.currentJudgeCard);
             state.currentJudgeCard = null;
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
        } else {
             const card = state.currentJudgeCard;
             player.hand.push(card);
             state.currentJudgeCard = null;
             dispatcher.addLog(`✨ ${dispatcher.getHeroName(player)} dùng [Thông Ngôn] thu lấy lá bài phán xét [${card.name}]!`, 'success');
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
        }
    },
    aiConfig: { priority: 5, condition: () => true }
  },

  'ung-bien': {
    id: 'ung-bien',
    name: 'Ứng Biến',
    type: SKILL_TYPES.PASSIVE,
    onReact: (dispatcher, state, payload) => {
        const { playerId, doReact, doProvide, req, cardId, skillId } = payload;
        const player = state.players.find(p => p.id === playerId);
        const isSkipReq = !(doReact || doProvide) || !cardId;
        
        // Cả Quân Cơ và Ứng Biến đều dùng chung payload này, kiểm tra skillId
        if (!isSkipReq && (skillId === 'quan-co' || skillId === 'ung-bien')) {
            const playedCard = player.hand.find(c => c.id === cardId);
            // Quân Cơ chỉ được màu Đen, Ứng Biến được màu bất kỳ
            const isValidColor = skillId === 'ung-bien' || (playedCard && playedCard.color === 'black');
            
            if (playedCard && isValidColor) {
                const oldJudgeCard = state.currentJudgeCard;
                state.currentJudgeCard = playedCard;
                player.hand = player.hand.filter(c => c.id !== playedCard.id);
                
                if (skillId === 'quan-co') {
                    if (oldJudgeCard) player.hand.push(oldJudgeCard);
                } else {
                    if (oldJudgeCard) state.discardPile.push(oldJudgeCard);
                }
                
                const skillName = skillId === 'quan-co' ? 'Quân Cơ' : 'Ứng Biến';
                dispatcher.addLog(`☯️ ${dispatcher.getHeroName(player)} kích hoạt [${skillName}], đổi bài phán xét thành [${playedCard.name}]!`, 'success');
                
                // Nếu đổi bài thành công, chấm dứt hỏi
                state.waitingForResponse = null;
                return;
            }
        }
        
        // Bỏ qua hoặc bài không hợp lệ
        // Chuyển sang người tiếp theo nếu có askQueue
        if (req && req.askQueue && req.askQueue.length > 1) {
             req.askQueue.shift();
             req.responderId = req.askQueue[0];
             
             // Update valid skills for the new responder
             const nextPlayer = state.players.find(p => p.id === req.responderId);
             const nextSkills = [];
             if (hasSkill(nextPlayer, 'quan-co')) nextSkills.push('quan-co');
             if (hasSkill(nextPlayer, 'ung-bien')) nextSkills.push('ung-bien');
             req.skills = nextSkills;
        } else {
             // Hết hàng đợi
             state.waitingForResponse = null;
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
          if (playerId !== sourceId) return false; // Đinh Điền (người Né) mới kích hoạt Phạt Tội
          
          console.log(`[DEBUG] Phạt Tội kích hoạt cho ${playerId} (attacker: ${attackerId}, dodger: ${sourceId})`);
          dispatcher.state.reactionStack.push({
              type: 'EVENT_TRIGGER_SKILL_ASK',
              payload: {
                  request: {
                      type: 'ask_phat_toi',
                      responderId: sourceId,
                      sourceId: sourceId,
                      targetId: attackerId
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
    type: 'FACTION',
    canUse: (state, player) => {
        return !player.dinhQuocUsedThisTurn && player.hand.length > 0;
    },
    hooks: {
        after_EVENT_TURN_END: (dispatcher, state, playerId, payload) => {
             state.players.forEach(p => { p.dinhQuocUsedThisTurn = false; });
        }
    },
    onUse: (dispatcher, state, playerId, targets, options) => {
        console.log('[DEBUG] dinh-quoc onUse called with:', playerId, targets, options);
        if (!options || options.cardIdx === undefined) return;
        if (!targets || targets.length === 0) return;
        
        const sender = state.players.find(p => p.id === playerId);
        if (sender.dinhQuocUsedThisTurn) return; // Bảo vệ 2 lớp

        const target = state.players.find(p => p.id === targets[0]); 

        const card = sender.hand[options.cardIdx];
        if (card.name !== 'Né' && card.name !== 'Sấm Sét') return; // Cẩn thận kiểm tra backend

        sender.hand = sender.hand.filter((_, i) => i !== options.cardIdx);
        target.hand.push(card);
        
        dispatcher.applyEffect(Effects.SetFlagEffect(sender.id, 'dinhQuocUsedThisTurn', true));
        
        dispatcher.addLog(`✨ ${sender.name} dùng [Định Quốc], giao 1 lá bài cho ${target.name}!`, 'important');
    },
    aiConfig: { priority: 2, condition: () => false }
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
         if (allies.length === 0) return false;
         
         dispatcher.addLog(`👑 [Hộ Giá] kích hoạt! Đợi đồng minh Hệ Sơn đánh [Né] giúp ${dispatcher.getHeroName(state.players.find(p => p.id === playerId))}!`, 'important');
         
         const currentReq = state.waitingForResponse;
         state.waitingForResponse = null;
         
         state.reactionStack.push({
            type: 'EVENT_TRIGGER_SKILL_ASK',
            payload: { 
               request: {
                  type: 'ask_ho_gia',
                  sourceId: playerId,
                  targetId: allies[0].id,
                  responderId: allies[0].id,
                  originalReq: currentReq,
                  askQueue: allies.map(p => p.id)
               }
            }
         });
         return true;
      }
    },
    onReact: (dispatcher, state, payload) => {
        const req = (payload && payload.req) || state.waitingForResponse;
        if (!req || req.type !== 'ask_ho_gia') return;
        
        const target = state.players.find(p => p.id === req.targetId);
        
        if (target) {
            if (payload.doReact) {
                // Đồng minh đồng ý đánh Né thay
                const dodgeIdx = target.hand.findIndex(c => c.name === 'Né');
                if (dodgeIdx >= 0) {
                    const dodgeCard = target.hand.splice(dodgeIdx, 1)[0];
                    state.playedCards.push(dodgeCard);
                    
                    dispatcher.addLog(`🛡️ ${target.name} đã đánh 1 lá [Né] cho Chủ Công!`, 'success');
                    state.waitingForResponse = req.originalReq;
                    
                    // Phát sự kiện đệ quy để handleResponseAction gốc nhận được Dodge
                    dispatcher.resolveEvent({
                        type: 'EVENT_ACTION_REACT',
                        payload: { playerId: req.originalReq.responderId ?? req.sourceId, responseType: 'play', data: { virtualCardName: 'Né', activeSkill: 'Hộ Giá' } }
                    });
                }
            } else {
                req.askQueue.shift();
                if (req.askQueue.length > 0) {
                    req.responderId = req.askQueue[0];
                    req.targetId = req.askQueue[0];
                } else {
                    dispatcher.addLog(`💔 Không ai đánh thay cho Chủ Công!`, 'danger');
                    // Trả về request gốc để tự chịu đòn
                    state.waitingForResponse = req.originalReq;
                    dispatcher.resolveEvent({
                        type: 'EVENT_ACTION_REACT',
                        payload: { playerId: req.originalReq.responderId ?? req.sourceId, responseType: 'skip', data: { } }
                    });
                }
            }
        }
    },
    aiConfig: { priority: 5, condition: () => false }
  }
};
