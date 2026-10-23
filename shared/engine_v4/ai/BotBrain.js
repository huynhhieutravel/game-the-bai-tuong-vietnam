/**
 * BotBrain.js
 * Trí Tuệ Nhân Tạo Bot Đơn Định & Chống Kẹt Game trong Việt Sát v4.
 * Tích hợp Universal AI Fallback và nhận diện chính xác vai trò, cự ly.
 */

import { RangeSystem } from '../rules/RangeSystem.js';
import { globalHeroRegistry } from '../heroes/HeroRegistry.js';

export class BotBrain {
  /**
   * Ra quyết định trong Pha Hành động (Action Phase)
   */
  static decideAction(state, botId) {
    const bot = state.getPlayer(botId);
    if (!bot || !bot.isAlive) return { type: 'END_ACTION_PHASE' };

    const alivePlayers = state.getAlivePlayers();

    // 1. Nếu bị thương và có Đào trên tay -> Tự ăn Đào hồi máu
    if (bot.hp < bot.maxHp) {
      const peachCard = bot.hand.find(c => c.type === 'peach' || c.name === 'Đào');
      if (peachCard) {
        return {
          type: 'PLAY_CARD',
          cardId: peachCard.id,
          targetId: bot.id
        };
      }
    }

    // 2. Trang bị vũ khí/giáp/ngựa nếu có trên tay
    const equipCard = bot.hand.find(c => c.type === 'equip' || ['weapon', 'armor', 'horse_attack', 'horse_defense'].includes(c.type));
    if (equipCard) {
      return {
        type: 'PLAY_CARD',
        cardId: equipCard.id,
        targetId: bot.id
      };
    }

    // 2.5 Cẩm nang (Tricks)
    const trickCard = bot.hand.find(c => (c.type === 'trick' || c.type === 'TRICK') && c.name !== 'Hóa Giải' && c.idKey !== 'hoa_giai');
    if (trickCard && Math.random() < 0.6) {
      const candidates = alivePlayers.filter(p => p.id !== bot.id);
      const enemyTargets = this._sortTargetsByPriority(bot, candidates);

      if (trickCard.name === 'Mượn Đao') {
        const weaponOwner = candidates.find(p => p.equipment?.weapon && !this._isKnownAlly(bot, p)) || candidates.find(p => p.equipment?.weapon);
        if (weaponOwner) {
          const validVictim = candidates.find(p => p.id !== weaponOwner.id && !this._isKnownAlly(bot, p));
          if (validVictim) {
            return {
              type: 'PLAY_CARD',
              cardId: trickCard.id,
              targetId: weaponOwner.id,
              targetIds: [weaponOwner.id, validVictim.id]
            };
          }
        }
      } else if (enemyTargets.length > 0) {
        return {
          type: 'PLAY_CARD',
          cardId: trickCard.id,
          targetId: enemyTargets[0].id
        };
      }
    }

    // 3. Nếu chưa đánh Chém và có Chém trên tay -> Tìm mục tiêu hợp lệ trong tầm
    const hasCrossbow = bot.equipment?.weapon?.id === 'crossbow';
    const canSlash = hasCrossbow || (bot.turnStats?.slashCount || 0) < 1;

    // 2.8 Nếu chuẩn bị Chém và có Rượu trên tay và chưa uống Rượu -> Uống Rượu để buff +1 sát thương!
    if (canSlash && !bot.temporaryFlags?.wineActive && (bot.turnStats?.wineCount || 0) < 1) {
      const slashCard = bot.hand.find(c => c.type === 'slash' || c.name === 'Chém');
      const wineCard = bot.hand.find(c => c.type === 'wine' || c.name === 'Rượu');
      if (slashCard && wineCard) {
        const validTargets = RangeSystem.getValidSlashTargets(bot, alivePlayers, slashCard);
        const enemyTargets = this._sortTargetsByPriority(bot, validTargets.filter(t => t.id !== bot.id));
        if (enemyTargets.length > 0) {
          return {
            type: 'PLAY_CARD',
            cardId: wineCard.id,
            targetId: bot.id
          };
        }
      }
    }

    if (canSlash) {
      const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
      const hasKhaiThien = globalHeroRegistry.hasSkill(bot, 'khai_thien', true);
      const isRed = c => c && (c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
      const slashCard = bot.hand.find(c => c.type === 'slash' || c.name === 'Chém') || 
        (hasDoiNui ? bot.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
        (hasKhaiThien ? bot.hand.find(c => isRed(c) && c.type !== 'peach' && c.name !== 'Đào') : null);
      if (slashCard) {
        const validTargets = RangeSystem.getValidSlashTargets(bot, alivePlayers, slashCard);
        const enemyTargets = this._sortTargetsByPriority(bot, validTargets.filter(t => t.id !== bot.id));
        if (enemyTargets.length > 0) {
          return {
            type: 'PLAY_CARD',
            cardId: slashCard.id,
            targetId: enemyTargets[0].id
          };
        }
      }
    }

    // Mặc định: Không còn hành động nào hợp lý -> Kết thúc pha
    return { type: 'END_ACTION_PHASE' };
  }

  /**
   * Helper kiểm tra đồng minh đã lộ diện cùng phe (Faction Loyalty)
   */
  static _isKnownAlly(bot, target) {
    if (!target || target.id === bot.id) return true;
    // Dã Tâm không có đồng minh và không ai là đồng minh của Dã Tâm
    if (bot.isDaTam || target.isDaTam) return false;
    const isRevealed = target.revealedHeroes?.some(Boolean);
    return isRevealed && Boolean(target.faction) && target.faction !== 'none' && target.faction === bot.faction;
  }

  /**
   * Helper kiểm tra kẻ thù đã lộ diện khác phe
   */
  static _isKnownEnemy(bot, target) {
    if (!target || target.id === bot.id) return false;
    // Nếu bot là Dã Tâm -> tất cả người khác là kẻ thù
    if (bot.isDaTam) return true;
    // Nếu target là Dã Tâm -> target là kẻ thù của mọi người
    if (target.isDaTam) return true;
    const isRevealed = target.revealedHeroes?.some(Boolean);
    return isRevealed && Boolean(target.faction) && target.faction !== 'none' && target.faction !== bot.faction;
  }

  /**
   * Sắp xếp mục tiêu theo độ ưu tiên: Kẻ địch lộ diện (máu thấp trước) -> Người chơi ẩn -> Tuyệt đối không đánh đồng minh
   */
  static _sortTargetsByPriority(bot, candidates) {
    const nonAllies = candidates.filter(t => !this._isKnownAlly(bot, t));
    if (nonAllies.length === 0) return [];

    const knownEnemies = nonAllies.filter(t => this._isKnownEnemy(bot, t));
    const hiddenPlayers = nonAllies.filter(t => !this._isKnownEnemy(bot, t));

    knownEnemies.sort((a, b) => a.hp - b.hp);
    hiddenPlayers.sort((a, b) => a.hp - b.hp);

    return [...knownEnemies, ...hiddenPlayers];
  }

  /**
   * Phản hồi khi có yêu cầu từ PriorityStack (Né, Đào, Bỏ bài, v.v.)
   */
  static decideReaction(state, botId, frame) {
    const bot = state.getPlayer(botId);
    if (!bot || !bot.isAlive) {
      return { type: 'ACTION_REACT', canceled: true };
    }

    switch (frame.type) {
      case 'ASK_DODGE': {
        const hasBaguaArmor = bot.equipment?.armor && (
          bot.equipment.armor.name === 'Bát Quái' ||
          bot.equipment.armor.id === 'bat_quai' ||
          bot.equipment.armor.key === 'bat_quai'
        );
        const hasThanGiap = !bot.equipment?.armor && globalHeroRegistry.hasSkill(bot, 'than_giap', true);

        if ((hasBaguaArmor || hasThanGiap) && !frame.context.baguaAttempted) {
          return {
            type: 'ACTION_REACT',
            useBagua: true
          };
        }

        const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
        const dodgeCard = bot.hand.find(c => c.type === 'dodge' || c.name === 'Né') || (hasDoiNui ? bot.hand.find(c => c.type === 'slash' || c.name === 'Chém') : null);
        return {
          type: 'ACTION_REACT',
          dodgeCard: dodgeCard || null
        };
      }

      case 'ASK_PEACH': {
        // Chỉ cứu bản thân hoặc cứu đồng minh cùng phe đã lộ diện, tuyệt đối không cứu kẻ địch hay Dã Tâm
        const victim = state.getPlayer(frame.targetId);
        const isSelf = frame.targetId === bot.id;
        const isAlly = victim && this._isKnownAlly(bot, victim);
        let healCard = bot.hand.find(c => c.type === 'peach' || c.name === 'Đào');
        if (!healCard && isSelf) {
          healCard = bot.hand.find(c => c.type === 'wine' || c.name === 'Rượu');
        }

        if (healCard && (isSelf || isAlly)) {
          return {
            type: 'ACTION_REACT',
            peachCard: healCard
          };
        }
        return {
          type: 'ACTION_REACT',
          peachCard: null
        };
      }

      case 'ASK_NEGATE': {
        const card = frame.context?.card;
        const targetId = frame.targetId;
        const target = targetId !== null && targetId !== undefined ? state.getPlayer(targetId) : null;
        const hasLinhGiam = globalHeroRegistry.hasSkill(bot, 'linh_giam', true);
        const isBlack = c => c && (c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
        const negateCard = bot.hand.find(c => c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') || (hasLinhGiam ? bot.hand.find(isBlack) : null);

        if (!negateCard) {
          return { type: 'ACTION_REACT', negateCard: null };
        }

        // Hóa giải cẩm nang gây hại nếu mục tiêu là bản thân hoặc đồng minh
        const isHarmful = card && ['Sấm Sét', 'Hỗn Loạn', 'Quyết Đấu', 'Cướp Bài', 'Tước Bài', 'Nam Man Xâm Nhập', 'Loạn Tiễn'].includes(card.name);
        if (isHarmful) {
          if (target && this._isKnownAlly(bot, target)) {
            return { type: 'ACTION_REACT', negateCard };
          }
          return { type: 'ACTION_REACT', negateCard: null };
        }

        // Hóa giải cẩm nang có lợi nếu mục tiêu là kẻ địch
        if (target && this._isKnownEnemy(bot, target)) {
          return { type: 'ACTION_REACT', negateCard };
        }

        return { type: 'ACTION_REACT', negateCard: null };
      }

      case 'ASK_TRE_NGA_DISCARD': {
        const requiredSuit = frame.context?.judgeSuit;
        const matchCard = bot.hand?.find(c => (
          c.suit === requiredSuit ||
          (requiredSuit === 'heart' && (c.suit === '♥' || c.suit === 'heart')) ||
          (requiredSuit === 'diamond' && (c.suit === '♦' || c.suit === 'diamond')) ||
          (requiredSuit === 'spade' && (c.suit === '♠' || c.suit === 'spade')) ||
          (requiredSuit === 'club' && (c.suit === '♣' || c.suit === 'club'))
        ));

        if (matchCard) {
          return {
            type: 'ACTION_REACT',
            doDiscard: true,
            cardId: matchCard.id
          };
        }
        return {
          type: 'ACTION_REACT',
          doDiscard: false
        };
      }

      case 'ASK_DISCARD': {
        const excess = frame.context.cardsToDiscard;
        // Thuật toán Cân Bằng Công - Thủ (Balanced Combat Discard):
        // Giữ lại: Đào (100) > Giữ 1-2 Chém (85) > Né (80) > Rượu (70) > Hóa Giải (65) > Trang bị (50) > Chém dư (40) > Cẩm nang khác (20)
        let keptSlashCount = 0;
        const getPriority = (card) => {
          const name = card.name || '';
          const isSlash = name === 'Chém' || card.type === 'slash';
          const isPeach = name === 'Đào' || card.type === 'peach';
          const isDodge = name === 'Né' || card.type === 'dodge';

          if (isPeach) return 100;
          if (isSlash) {
            keptSlashCount++;
            return keptSlashCount <= 2 ? 85 : 40;
          }
          if (isDodge) return 80;
          if (name === 'Rượu' || card.type === 'wine') return 70;
          if (name === 'Hóa Giải' || card.idKey === 'hoa_giai') return 65;
          if (card.type === 'equip' || ['weapon', 'armor', 'horse_attack', 'horse_defense'].includes(card.type)) return 50;
          return 20;
        };

        const sortedHand = [...bot.hand].sort((a, b) => getPriority(a) - getPriority(b));
        const cardIdsToDiscard = sortedHand.slice(0, excess).map(c => c.id);
        return {
          type: 'ACTION_REACT',
          discardCardIds: cardIdsToDiscard
        };
      }

      case 'ASK_SLASH_DUEL': {
        const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
        const hasKhaiThien = globalHeroRegistry.hasSkill(bot, 'khai_thien', true);
        const isRed = c => c && (c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
        const slashCard = bot.hand.find(c => c.type === 'slash' || c.name === 'Chém') ||
          (hasDoiNui ? bot.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
          (hasKhaiThien ? (bot.hand.find(c => isRed(c) && c.type !== 'peach' && c.name !== 'Đào') || bot.hand.find(isRed)) : null);
        return {
          type: 'ACTION_REACT',
          slashCard: slashCard || null
        };
      }

      case 'ASK_SLASH_RESPONSE': {
        const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
        const hasKhaiThien = globalHeroRegistry.hasSkill(bot, 'khai_thien', true);
        const isRed = c => c && (c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
        const slashCard = bot.hand.find(c => c.type === 'slash' || c.name === 'Chém') ||
          (hasDoiNui ? bot.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
          (hasKhaiThien ? (bot.hand.find(c => isRed(c) && c.type !== 'peach' && c.name !== 'Đào') || bot.hand.find(isRed)) : null);
        return {
          type: 'ACTION_REACT',
          slashCard: slashCard || null
        };
      }

      case 'ASK_BORROW_SLASH': {
        const slashCard = bot.hand.find(c => c.type === 'slash' || c.name === 'Chém');
        const targetBId = frame.context?.targetBId;
        const targetB = targetBId !== null && targetBId !== undefined ? state.getPlayer(targetBId) : null;

        if (slashCard && (!targetB || !this._isKnownAlly(bot, targetB))) {
          return {
            type: 'ACTION_REACT',
            slashCard
          };
        }
        return {
          type: 'ACTION_REACT',
          slashCard: null
        };
      }

      case 'ASK_BANH_CHUNG': {
        const viewedCards = frame.context?.viewedCards || [];
        const top = [];
        const bottom = [];
        for (const c of viewedCards) {
          if (c.name === 'Đào' || c.type === 'peach' || c.name === 'Chém' || c.type === 'slash' || c.name === 'Né' || c.type === 'dodge') {
            top.push(c);
          } else {
            bottom.push(c);
          }
        }
        return {
          type: 'ACTION_REACT',
          orderedCards: true,
          deckTop: top,
          deckBottom: bottom
        };
      }

      case 'ASK_DA_TRACH': {
        const opponents = state.getAlivePlayers ? 
          state.getAlivePlayers().filter(p => p.id !== bot.id && p.hand && p.hand.length > 0 && !this._isKnownAlly(bot, p)) : [];
        if (opponents.length > 0) {
          const targetIds = opponents.slice(0, 2).map(p => p.id);
          return {
            type: 'ACTION_REACT',
            doUse: true,
            targets: targetIds
          };
        }
        return {
          type: 'ACTION_REACT',
          doUse: false,
          canceled: true
        };
      }

      case 'ASK_KHOI_NGHIA': {
        const hasCombatCard = bot.hand && bot.hand.some(c => 
          c.type === 'slash' || c.name === 'Chém' || c.name === 'Quyết Đấu' || c.trickType === 'quyet_dau'
        );
        return {
          type: 'ACTION_REACT',
          doUse: !!hasCombatCard
        };
      }

      default:
        // Universal AI Fallback: Chống kẹt game vĩnh viễn
        return {
          type: 'ACTION_REACT',
          canceled: true,
          reason: 'UNIVERSAL_FALLBACK'
        };
    }
  }
}
