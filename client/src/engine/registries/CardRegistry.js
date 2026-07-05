// ==========================================
// Card Registry - Định nghĩa toàn bộ Thẻ bài (Cơ bản & Cẩm nang)
// ==========================================
import * as Effects from '../core/Effects';
import { canAttack, getDistance, canTarget } from '../rangeSystem';
import { HeroRegistry } from './HeroRegistry';

export const CARD_TYPES = {
  BASIC: 'basic',
  TRICK: 'trick',
  EQUIP: 'equip'
};

export const CardRegistry = {
  'chem': {
    id: 'chem',
    name: 'Chém',
    type: CARD_TYPES.BASIC,
    targeting: { type: 'single' },
    canPlay: (state, player) => {
      // Logic kiểm tra số lần Chém trong lượt, có Liên Nỏ không, v.v...
      const limit = (player.equipment.some(eq => eq.name === 'Liên Nỏ') || player.usedNhiepChinh) ? Infinity : 1;
      return (player.attackCountThisTurn || 0) < limit;
    },
    getValidTargets: (state, player, cardId) => {
      return state.players.filter(p => p.id !== player.id && p.isAlive && canAttack(state, player.id, p.id, cardId));
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      // 1. Vứt bài Chém từ tay vào mộ
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      
      // 2. Tăng bộ đếm Chém — qua Reducer, KHÔNG mutate trực tiếp
      const player = dispatcher.state.players.find(p => p.id === playerId);
      const currentCount = player ? (player.attackCountThisTurn || 0) : 0;
      dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'attackCountThisTurn', currentCount + 1));
      
      // 3. Tính sát thương (có Rượu thì +1)
      let damageAmount = 1;
      if (player && player.drankWine) {
          damageAmount++;
          dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'drankWine', false));
      }
      
      // 4. Ném sự kiện sát thương và sự kiện yêu cầu Né vào Ngăn xếp (LIFO)
      // Chú ý: Ném DamageEvent vào TRƯỚC (nằm dưới đáy), AskDodgeEvent vào SAU (nằm trên đỉnh)
      targets.forEach(targetId => {
         // Lên lịch Sát thương (Chờ xử lý nếu không có Né)
         dispatcher.state.reactionStack.push({
            type: 'EVENT_DAMAGE',
            payload: { sourceId: playerId, targetId, amount: damageAmount, damageType: 'normal', sourceCardId: cardId }
         });

         // Đòi Né
         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_DODGE', // Yêu cầu đánh lá Né
            payload: { sourceId: playerId, targetId, sourceCardId: cardId, reason: 'chem' }
         });
      });
    },
  },

  'ne': {
    id: 'ne',
    name: 'Né',
    type: CARD_TYPES.BASIC,
    targeting: { type: 'none' },
    canPlay: (state, player) => false, // Không thể chủ động đánh trong lượt
    canReact: (state, player, event) => {
      return event.type === 'ask_dodge' || event.type === 'ask_slash_or_dodge';
    },
    onReact: (state, player, event) => {
      // Trả về state giải quyết event
      return state;
    }
  },

  'dao': {
    id: 'dao',
    name: 'Đào',
    type: CARD_TYPES.BASIC,
    targeting: { type: 'self' },
    canPlay: (state, player) => player.hp < player.maxHp,
    getValidTargets: (state, player) => [player], // Chủ động đánh chỉ cho mình
    canReact: (state, player, event) => event.type === 'save',
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      // Tự hồi máu
      const targetId = targets && targets.length > 0 ? targets[0] : playerId;
      dispatcher.applyEffect(Effects.RecoverEffect(targetId, 1));
    },
    onReact: (dispatcher, state, playerId, event) => {
      // Logic cứu người khi Hấp hối
      dispatcher.applyEffect(Effects.RecoverEffect(event.payload.targetId, 1));
    }
  },

  'ruou': {
    id: 'ruou',
    name: 'Rượu',
    type: CARD_TYPES.BASIC,
    targeting: { type: 'self' },
    canPlay: (state, player) => !player.drankWineThisTurn,
    getValidTargets: (state, player) => [player],
    canReact: (state, player, event) => event.type === 'save' && event.dyingId === player.id,
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      // Đánh dấu uống rượu — qua Reducer, KHÔNG mutate trực tiếp
      dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'drankWine', true));
      dispatcher.applyEffect(Effects.SetFlagEffect(playerId, 'drankWineThisTurn', true));
      const player = dispatcher.state.players.find(p => p.id === playerId);
      dispatcher.addLog(`🍷 ${dispatcher.getHeroName(player)} uống Rượu! Sát thương [Chém] tiếp theo trong lượt này sẽ +1.`);
    }
  },

  // ================= CẨM NANG (TRICKS) =================
  'da-man': {
    id: 'da-man',
    name: 'Dã Man',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'aoe' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Nam man tự động chọn tất cả người chơi khác
      return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));

      // Lấy danh sách mục tiêu theo thứ tự vòng đánh (từ người tiếp theo)
      const targetIds = dispatcher.getOrderedTargets(playerId, targets);

      // Đẩy vào Ngăn xếp (LIFO). 
      // Phải đảo ngược mảng để người gần nhất (đẩy vào cuối) sẽ được lấy ra giải quyết đầu tiên.
      [...targetIds].reverse().forEach(targetId => {
         dispatcher.state.reactionStack.push({
            type: 'EVENT_DAMAGE',
            payload: { sourceId: playerId, targetId, amount: 1, damageType: 'normal', sourceCardId: cardId }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_SLASH', // Yêu cầu đánh lá Chém
            payload: { sourceId: playerId, targetId, sourceCardId: cardId, reason: 'nam-man' }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_NEGATE',
            payload: { sourceId: playerId, targetId, trickType: 'nam-man', sourceCardId: cardId }
         });
      });
    }
  },

  'loan-tien': {
    id: 'loan-tien',
    name: 'Loạn Tiễn',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'aoe' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));

      const targetIds = dispatcher.getOrderedTargets(playerId, targets);

      [...targetIds].reverse().forEach(targetId => {
         dispatcher.state.reactionStack.push({
            type: 'EVENT_DAMAGE',
            payload: { sourceId: playerId, targetId, amount: 1, damageType: 'normal', sourceCardId: cardId }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_DODGE', // Yêu cầu đánh lá Né
            payload: { sourceId: playerId, targetId, sourceCardId: cardId, reason: 'van-tien' }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_NEGATE',
            payload: { sourceId: playerId, targetId, trickType: 'van-tien', sourceCardId: cardId }
         });
      });
    }
  },

  'hoi-xuan': {
    id: 'hoi-xuan',
    name: 'Hồi Xuân',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'aoe' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Hồi máu cho tất cả người chơi còn sống đang bị mất máu
      return state.players.filter(p => p.isAlive && p.hp < p.maxHp);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));

      const targetIds = dispatcher.getOrderedTargets(playerId, targets);

      [...targetIds].reverse().forEach(targetId => {
         dispatcher.state.reactionStack.push({
            type: 'EVENT_HEAL',
            payload: { sourceId: playerId, targetId, amount: 1, sourceCardId: cardId }
         });

         dispatcher.state.reactionStack.push({
            type: 'EVENT_ASK_NEGATE',
            payload: { sourceId: playerId, targetId, trickType: 'hoi-xuan', sourceCardId: cardId }
         });
      });
    }
  },

  'tuoc-bai': {
    id: 'tuoc-bai',
    name: 'Tước Bài',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Bất kỳ ai có bài (trên tay, trang bị, hoặc phán xét)
      return state.players.filter(p => 
         p.id !== player.id && p.isAlive && 
         (p.hand.length > 0 || p.equipment.length > 0 || (p.judgementArea && p.judgementArea.length > 0))
      );
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      const targetId = targets[0];
      dispatcher.state.reactionStack.push({
         type: 'EVENT_DISMANTLE',
         payload: { sourceId: playerId, targetId, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'qua-ha', sourceCardId: cardId }
      });
    }
  },

  'cuop-bai': {
    id: 'cuop-bai',
    name: 'Cướp Bài',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Phải kiểm tra khoảng cách <= 1 (nếu không có kỹ năng Tiên Duyên)
      const checkTienDuyen = (heroId) => {
         if (!heroId) return false;
         const hero = HeroRegistry[heroId];
         return hero && hero.skillIds && hero.skillIds.includes('tien-duyen-passive');
      };
      const hasTienDuyen = (player.revealedHeroes && player.revealedHeroes[0] && checkTienDuyen(player.mainHeroId)) || 
                           (player.revealedHeroes && player.revealedHeroes[1] && checkTienDuyen(player.subHeroId));
      return state.players.filter(p => 
         p.id !== player.id && p.isAlive && 
         (p.hand.length > 0 || p.equipment.length > 0 || (p.judgementArea && p.judgementArea.length > 0)) &&
         (hasTienDuyen || getDistance(state, player.id, p.id) <= 1)
      );
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      const targetId = targets[0];
      dispatcher.state.reactionStack.push({
         type: 'EVENT_SNATCH',
         payload: { sourceId: playerId, targetId, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'thuan-thu', sourceCardId: cardId }
      });
    }
  },

  'quyet-dau': {
    id: 'quyet-dau',
    name: 'Quyết Đấu',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      const targetId = targets[0];
      
      // Quyết Đấu tự quản lý vòng lặp đả ngược thông qua EVENT_DUEL
      dispatcher.state.reactionStack.push({
         type: 'EVENT_DUEL',
         payload: { sourceId: playerId, targetId, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'quyet-dau', sourceCardId: cardId }
      });
    }
  },

  // ================= CẨM NANG HỎI/ĐÁP (TRICKS) =================
  'muon-dao': {
    id: 'muon-dao',
    name: 'Mượn Đao',
    type: CARD_TYPES.TRICK,
    targeting: { 
      type: 'sequence', 
      steps: [
        { 
          message: 'Chọn người cho mượn đao (phải có vũ khí)',
          filter: (state, player, selectedTargets) => state.players.filter(p => p.id !== player.id && p.isAlive && p.equipment.some(e => e.subType === 'Vũ khí' || e.type === 'Vũ khí' || e.type === 'equip_weapon'))
        },
        { 
          message: 'Chọn nạn nhân (phải trong tầm đánh của người mượn đao)',
          filter: (state, player, selectedTargets) => {
             const borrowerId = selectedTargets[0];
             const { canAttack } = require('../rangeSystem');
             return state.players.filter(p => p.id !== borrowerId && p.isAlive && canAttack(state, borrowerId, p.id));
          }
        }
      ] 
    },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
       // Legacy
       return state.players.filter(p => p.id !== player.id && p.isAlive && p.equipment.some(e => e.subType === 'Vũ khí' || e.type === 'Vũ khí' || e.type === 'equip_weapon'));
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      const targetId = targets[0]; // Người mượn đao
      // extraTargetId (Nạn nhân) tạm thời không hỗ trợ trong getValidTargets mặc định, 
      // UI sẽ ghép target2 vào payload nếu cần, ta giả sử UI gửi lên mảng targets = [targetId, extraTargetId]
      const extraTargetId = targets[1] || targets[0]; 
      
      // Đẩy Ask Negate lên đầu
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_SLASH',
         payload: { sourceId: targetId, targetId: extraTargetId, borrowerId: playerId, isMuonDao: true, sourceCardId: cardId, reason: 'muon-dao' }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'muon-dao', sourceCardId: cardId }
      });
    }
  },

  'vo-trung': {
    id: 'vo-trung',
    name: 'Vô Trung Sinh Hữu',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'self' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => [player],
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      dispatcher.state.reactionStack.push({
         type: 'EVENT_DRAW_CARDS',
         payload: { targetId: playerId, amount: 2, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId: playerId, trickType: 'vo-trung', sourceCardId: cardId }
      });
    }
  },

  'hoa-cong': {
    id: 'hoa-cong',
    name: 'Hỏa Công',
    type: CARD_TYPES.TRICK,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Bất kỳ ai có bài trên tay
      return state.players.filter(p => p.isAlive && p.hand.length > 0);
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      const targetId = targets[0];
      
      dispatcher.state.reactionStack.push({
         type: 'EVENT_HOA_CONG',
         payload: { sourceId: playerId, targetId, sourceCardId: cardId }
      });
      dispatcher.state.reactionStack.push({
         type: 'EVENT_ASK_NEGATE',
         payload: { sourceId: playerId, targetId, trickType: 'hoa-cong', sourceCardId: cardId }
      });
    }
  },

  'xieng-xich': {
    id: 'xieng-xich',
    name: 'Xiềng Xích', // Thiết Tác Liên Hoàn
    type: CARD_TYPES.TRICK,
    targeting: { type: 'multiple', min: 0, max: 2 },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => state.players.filter(p => p.isAlive),
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
      
      // Trọng chú: Nếu không chỉ định mục tiêu, rèn lại (rút 1 lá)
      if (!targets || targets.length === 0) {
          const player = dispatcher.state.players.find(p => p.id === playerId);
          dispatcher.applyEffect(Effects.DrawCardEffect(playerId, 1));
          dispatcher.addLog(`⛓️ ${dispatcher.getHeroName(player)} rèn lại [Xiềng Xích], rút 1 lá!`);
          return;
      }

      // Trọng Âm: Thiết tác hỗ trợ 1 hoặc 2 mục tiêu
      const orderedTargets = dispatcher.getOrderedTargets(playerId, targets);
      console.log('[DEBUG_CHEM] orderedTargets:', orderedTargets);
      [...orderedTargets].reverse().forEach(targetId => {
         console.log('[DEBUG_CHEM] Pushing EVENT_ASK_DODGE for', targetId);
         dispatcher.state.reactionStack.push({
             type: 'EVENT_CHAIN',
             payload: { sourceId: playerId, targetId, sourceCardId: cardId }
          });
          dispatcher.state.reactionStack.push({
             type: 'EVENT_ASK_NEGATE',
             payload: { sourceId: playerId, targetId, trickType: 'thi-thanh', sourceCardId: cardId }
          });
      });
    }
  },

  'hoa-giai': {
    id: 'hoa-giai',
    name: 'Hóa Giải', // Vô Giải Khả Kích
    type: CARD_TYPES.TRICK,
    canPlay: (state, player) => false, // Không thể play trực tiếp, chỉ dùng để React!
    getValidTargets: (state, player) => [],
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
        // Hóa giải xử lý ở EVENT_ACTION_REACT, không qua onPlay
    }
  },

  // ================= CẨM NANG PHÁN XÉT (DELAY TRICKS) =================
  'sam-set': {
    id: 'sam-set',
    name: 'Sấm Sét',
    type: CARD_TYPES.TRICK,
    isDelayed: true,
    targeting: { type: 'self' },
    canPlay: (state, player) => {
       // Không thể dùng nếu trên đầu đã có Sấm Sét
       return !player.judgementArea || !player.judgementArea.some(c => c.name === 'Sấm Sét');
    },
    getValidTargets: (state, player) => [player], // Tự đặt lên đầu mình
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'judgement', playerId, playerId));
    }
  },

  'binh-luong': {
    id: 'binh-luong',
    name: 'Binh Lương Thốn Đoạn',
    type: CARD_TYPES.TRICK,
    isDelayed: true,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Chỉ dùng lên người khác và người đó chưa bị Binh Lương (không giới hạn nếu có Tiên Duyên)
      const checkTienDuyen = (heroId) => {
         if (!heroId) return false;
         const hero = HeroRegistry[heroId];
         return hero && hero.skillIds && hero.skillIds.includes('tien-duyen-passive');
      };
      const hasTienDuyen = (player.revealedHeroes && player.revealedHeroes[0] && checkTienDuyen(player.mainHeroId)) || 
                           (player.revealedHeroes && player.revealedHeroes[1] && checkTienDuyen(player.subHeroId));
      return state.players.filter(p => 
         p.id !== player.id && p.isAlive && 
         (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Binh Lương Thốn Đoạn')) &&
         (hasTienDuyen || getDistance(state, player.id, p.id) <= 1)
      );
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      // Di chuyển vào vùng Phán xét của mục tiêu
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'judgement', playerId, targets[0]));
    }
  },

  'hon-loan': {
    id: 'hon-loan',
    name: 'Hỗn Loạn',
    type: CARD_TYPES.TRICK,
    isDelayed: true,
    targeting: { type: 'single' },
    canPlay: (state, player) => true,
    getValidTargets: (state, player) => {
      // Chỉ dùng lên người khác và người đó chưa bị Hỗn Loạn
      return state.players.filter(p => 
         p.id !== player.id && p.isAlive && 
         (!p.judgementArea || !p.judgementArea.some(c => c.name === 'Hỗn Loạn'))
      );
    },
    onPlay: (dispatcher, state, playerId, targets, cardId) => {
      dispatcher.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'judgement', playerId, targets[0]));
    }
  }
};
