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

export const systemSkills = {
  'tam-cong': {
    id: 'tam-cong',
    name: 'Tâm Công',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
      if (player.tamCongUsedThisTurn) return false;
      return player.hand.length > 0;
    },
    getValidTargets: (state, player) => {
      return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onUse: (dispatcher, state, playerId, targets) => {
      const targetId = targets[0];
      dispatcher.state.reactionStack.push({
         type: 'EVENT_TRIGGER_SKILL_ASK',
         payload: { request: { type: 'ask_suit', sourceId: playerId, targetId: targetId, skillId: 'tam-cong' } }
      });
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || req.type !== 'ask_suit' || req.skillId !== 'tam-cong') return;

       const player = state.players.find(p => p.id === req.sourceId);
       const target = state.players.find(p => p.id === req.targetId);

       if (payload.canceled || !payload.suit) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else {
          dispatcher.applyEffect(Effects.SetFlagEffect(player.id, 'tamCongUsedThisTurn', true));
          
          
              if (player.hand.length === 0) {
                 dispatcher.addLog(`🔮 ${target.name} chọn chất ${payload.suit}. Nhưng ${player.name} không còn lá bài nào để mở!`, 'important');
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
                 return;
              }
              const randomIndex = Math.floor(Math.random() * player.hand.length);
              const revealedCard = player.hand[randomIndex];
              
              dispatcher.addLog(`🔮 ${target.name} chọn chất ${payload.suit}. ${player.name} mở lá [${revealedCard.name}] chất ${revealedCard.suit}!`, 'important');
              
              if (revealedCard.suit !== payload.suit) {
                  dispatcher.addLog(`💥 Dự đoán sai! ${target.name} chịu 1 sát thương từ [Tâm Công]!`, 'damage');
                  dispatcher.state.reactionStack.push({
                      type: 'EVENT_DAMAGE',
                      payload: { sourceId: player.id, targetId: target.id, amount: 1, damageType: 'normal' }
                  });
              } else {
                  dispatcher.addLog(`✅ Dự đoán đúng! ${target.name} an toàn.`, 'normal');
              }
              
              dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          
       }
    },
    turnResetFlags: ['tamCongUsedThisTurn'],
    aiConfig: {
      priority: 8,
      condition: (state, bot, targets) => targets.length > 0,
    }
  },

  'boc-tram-trung': {
    id: 'boc-tram-trung',
    name: 'Bọc Trăm Trứng',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       const req = state.waitingForResponse;
       const hasLacAllies = state.players.some(p => p.id !== player.id && p.isAlive && getPlayerFaction(p) === 'Lạc');
       if (req && (req.type === 'ask_slash' || req.type === 'ask_dodge')) return hasLacAllies;
       
       const canSlash = player.equipment.some(e => e.name === 'Liên Nỗ' || e.name === 'Liên Nỏ') || (player.attackCountThisTurn || 0) === 0;
       return hasLacAllies && canSlash;
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onUse: (dispatcher, state, playerId, targets) => {
       const req = state.waitingForResponse;
       if (req && (req.type !== 'ask_slash' && req.type !== 'ask_dodge')) return;
       const lacAllies = state.players.filter(p => p.id !== playerId && p.isAlive && getPlayerFaction(p) === 'Lạc');
       
       if (lacAllies.length === 0) {
           dispatcher.addLog(`❌ Không có đồng minh phe Lạc nào để gọi Bọc Trăm Trứng!`, 'normal');
           return;
       }
       
       const isDodge = req && req.type === 'ask_dodge';
       const targetId = targets && targets.length > 0 ? targets[0] : (req ? req.sourceId : null);
       const playerName = state.players.find(p => p.id === playerId)?.name;
       dispatcher.addLog(`🐉 ${playerName} phát động [Bọc Trăm Trứng]! Gọi đồng minh Lạc đánh [${isDodge ? 'Né' : 'Chém'}] giùm!`, 'important');

       dispatcher.state.reactionStack.push({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { 
             request: { 
                type: isDodge ? 'ask_boc_tram_trung_dodge' : 'ask_boc_tram_trung_slash', 
                skillId: 'boc-tram-trung',
                sourceId: playerId, 
                targetId: targetId, 
                isDefensive: req ? true : false, 
                askQueue: lacAllies.map(p => p.id),
                originalReq: req
             } 
          }
       });
       dispatcher.applyEffect(Effects.SetWaitingEffect(null));
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || (req.type !== 'ask_boc_tram_trung_slash' && req.type !== 'ask_boc_tram_trung_dodge')) return;
       const responderId = req.askQueue[0];
       const responder = state.players.find(p => p.id === responderId);
       const llq = state.players.find(p => p.id === req.sourceId);

       if (payload.doProvide && payload.cardId) {
           const cardIndex = responder.hand.findIndex(c => c.id === payload.cardId);
           if (cardIndex >= 0) {
              const playedCard = responder.hand.splice(cardIndex, 1)[0];
              dispatcher.applyEffect(Effects.MoveCardEffect(playedCard.id, 'hand', 'playedCards', responder.id, null));
              
              const isSlash = req.type === 'ask_boc_tram_trung_slash';
              dispatcher.addLog(`🛡️ ${responder.name} đã đánh ra [${isSlash ? 'Chém' : 'Né'}] giùm ${llq.name}!`, 'important');
              
              if (req.isDefensive) {
                  dispatcher.applyEffect(Effects.SetWaitingEffect(req.originalReq));
                  dispatcher.resolveEvent({
                       type: 'EVENT_ACTION_REACT',
                      payload: { playerId: req.originalReq.responderId ?? llq.id, responseType: 'play', data: { virtualCardName: isSlash ? 'Chém' : 'Né', activeSkill: 'boc-tram-trung' } }
                  });
              } else {
                  dispatcher.state.reactionStack.push({
                      type: 'EVENT_ACTION_PLAY_CARD',
                      payload: {
                          sourceId: llq.id,
                          targetId: req.targetId,
                          cardId: null,
                          virtualCardName: isSlash ? 'Chém' : 'Né',
                          isVirtual: true,
                          activeSkill: 'boc-tram-trung'
                      }
                  });
                  state.waitingForResponse = null;
              }
           }
       } else {
           // Từ chối, chuyển người tiếp theo
          req.askQueue.shift();
          if (req.askQueue.length === 0) {
             
                 dispatcher.addLog(`❌ Không ai hưởng ứng [Bọc Trăm Trứng] của ${llq.name}!`, 'danger');
                 
                 if (req.isDefensive) {
                     state.waitingForResponse = req.originalReq;
                     if (state.waitingForResponse) {
                         state.waitingForResponse.bocTramTrungFailed = true; // Đánh dấu để không gọi lại
                     }
                 } else {
                     state.waitingForResponse = null;
                 }
             
          } else {
             // Cập nhật responderId cho người tiếp theo trong hàng đợi
             req.responderId = req.askQueue[0];
          }
       }
    },
    aiConfig: { priority: 7, condition: (state, bot, targets) => false }
  },

  'weapon-skill': {
    id: 'weapon-skill',
    name: 'Kỹ Năng Vũ Khí',
    type: SKILL_TYPES.TRIGGER,
    onReact: (dispatcher, state, payload) => {
        const req = state.waitingForResponse;
        if (!req || req.type !== 'ask_weapon_skill') return;
        
        if (payload.canceled || !payload.doUse) {
            state.waitingForResponse = null;
            return;
        }

        const weaponName = req.weapon;
        const player = state.players.find(p => p.id === req.sourceId);
        const target = state.players.find(p => p.id === req.targetId);
        
        if (!player || !target) {
            state.waitingForResponse = null;
            return;
        }
        
        if (weaponName === 'Thanh Long Đao') {
            let cardId = payload.cardIds?.[0];
            if (!cardId && payload.cardIndexes?.[0] !== undefined) {
                cardId = player.hand[payload.cardIndexes[0]]?.id;
            }
            if (!cardId) return;
            const card = player.hand.find(c => c.id === cardId);
            if (!card) return;
            
            const hasDoiNui = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'doi-nui'));
            const hasKhaiThien = player.heroes?.some((h, i) => player.revealedHeroes[i] && h.skills?.some(s => s.id === 'khai-thien'));
            
            let isValid = card.name === 'Chém';
            if (hasDoiNui && card.name === 'Né') isValid = true;
            if (hasKhaiThien && card.color === 'red') isValid = true;
            
            if (!isValid) return;

            // Remove card from hand manually since MoveCardEffect needs ID
            dispatcher.applyEffect(Effects.MoveCardEffect(card.id, 'hand', 'discardPile', player.id));
            dispatcher.addLog(`🐉 ${dispatcher.getHeroName(player)} kích hoạt [Thanh Long Đao], chém tiếp ${dispatcher.getHeroName(target)}!`, 'important');
            
            state.reactionStack.push({
               type: 'EVENT_DAMAGE',
               payload: { sourceId: player.id, targetId: target.id, amount: 1, damageType: 'slash' }
            });
            
            state.reactionStack.push({
                type: 'EVENT_ASK_DODGE',
                payload: { sourceId: player.id, targetId: target.id, cardPlayedId: card.id, reqDodges: 1 }
            });
            
            state.waitingForResponse = null;
        }
        else if (weaponName === 'Rìu Đá') {
            let cardIds = payload.cardIds || [];
            let equipIds = payload.equipIds || [];
            
            if (cardIds.length === 0 && payload.cardIndexes) {
                cardIds = payload.cardIndexes.map(idx => player.hand[idx]?.id).filter(Boolean);
            }
            if (equipIds.length === 0 && payload.equipIndexes) {
                equipIds = payload.equipIndexes.map(idx => player.equipment[idx]?.id).filter(Boolean);
            }
            
            if (cardIds.length + equipIds.length !== 2) return;
            
            cardIds.forEach(id => {
                const c = player.hand.find(card => card.id === id);
                if(c) dispatcher.applyEffect(Effects.MoveCardEffect(c.id, 'hand', 'discardPile', player.id));
            });
            equipIds.forEach(id => {
                const c = player.equipment.find(card => card.id === id);
                if(c) dispatcher.applyEffect(Effects.MoveCardEffect(c.id, 'equipment', 'discardPile', player.id));
            });
            
            dispatcher.addLog(`🪓 ${dispatcher.getHeroName(player)} kích hoạt [Rìu Đá], vứt 2 lá bài để chém xuyên Né!`, 'important');
            
            // Re-apply damage because dodge cancelled the original one
            state.reactionStack.push({
               type: 'EVENT_DAMAGE',
               payload: { sourceId: player.id, targetId: target.id, amount: 1, damageType: 'slash' }
            });
            
            state.waitingForResponse = null;
        }
        else if (weaponName === 'Quạt Sắt') {
            let cardIds = payload.cardIds || [];
            let equipIds = payload.equipIds || [];
            
            if (cardIds.length === 0 && payload.cardIndexes) {
                cardIds = payload.cardIndexes.map(idx => player.hand[idx]?.id).filter(Boolean);
            }
            if (equipIds.length === 0 && payload.equipIndexes) {
                equipIds = payload.equipIndexes.map(idx => player.equipment[idx]?.id).filter(Boolean);
            }

            if (cardIds.length + equipIds.length !== 2) return;
            
            cardIds.forEach(id => {
                const c = player.hand.find(card => card.id === id);
                if(c) dispatcher.applyEffect(Effects.MoveCardEffect(c.id, 'hand', 'discardPile', player.id));
            });
            equipIds.forEach(id => {
                const c = player.equipment.find(card => card.id === id);
                if(c) dispatcher.applyEffect(Effects.MoveCardEffect(c.id, 'equipment', 'discardPile', player.id));
            });
            
            dispatcher.addLog(`🔥 ${dispatcher.getHeroName(player)} kích hoạt [Quạt Sắt], vứt 2 lá bài để tăng thêm 1 sát thương hỏa!`, 'important');
            
            // Tăng sát thương (Event đang xử lý DAMAGE nên thay đổi baseDamage)
            // Note: with Quạt Sắt, it's called during ON_DAMAGE_CALC so we'd modify the EVENT_DAMAGE payload
            // This requires modifying the event on top of reaction stack
            const dmgEvent = state.reactionStack.findLast(e => e.type === 'EVENT_DAMAGE');
            if (dmgEvent) {
                dmgEvent.payload.amount += 1;
                dmgEvent.payload.damageType = 'fire';
            }
            
            state.waitingForResponse = null;
        }
        else if (weaponName === 'Song Kiếm') {
            let cardId = payload.cardIds?.[0];
            let equipId = payload.equipIds?.[0];
            
            if (!cardId && payload.cardIndexes?.[0] !== undefined) {
                cardId = player.hand[payload.cardIndexes[0]]?.id;
            }
            if (!equipId && payload.equipIndexes?.[0] !== undefined) {
                equipId = player.equipment[payload.equipIndexes[0]]?.id;
            }

            if (!cardId && !equipId) return;

            if (cardId) {
                dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', player.id));
            } else if (equipId) {
                dispatcher.applyEffect(Effects.MoveCardEffect(equipId, 'equipment', 'discardPile', player.id));
            }
            
            dispatcher.addLog(`⚔️ ${dispatcher.getHeroName(player)} tự bỏ 1 lá bài vì [Song Kiếm]!`, 'normal');
            
            // Re-trigger the dodge phase that was interrupted
            if (req.interruptedEvent) {
                state.waitingForResponse = req.interruptedEvent;
            } else {
                state.waitingForResponse = null;
            }
        }
    }
  }
};
