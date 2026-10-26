/**
 * BotBrain.js
 * Trí Tuệ Nhân Tạo Bot Đơn Định, Nhận Diện Kỹ Năng & Chống Kẹt Game trong Việt Sát v4.
 * Tích hợp Universal AI Fallback, Hero Reveal Policy, Active Skill Decision Engine
 * và xác thực mục tiêu chặt chẽ qua TargetResolverV4 & RangeSystem.
 */

import { RangeSystem } from '../rules/RangeSystem.js';
import { globalHeroRegistry, hasSkill, getPlayerGender } from '../heroes/HeroRegistry.js';
import { getAvailableTargets, getTargetingDefinition } from '../rules/TargetResolverV4.js';
import { isSameFaction, getCanonicalFaction, isEquip } from '../../utils/translationHelper.js';

function rankToNumber(rank) {
  if (typeof rank === 'number') return rank;
  if (!rank) return 0;
  const map = { A: 1, J: 11, Q: 12, K: 13 };
  return map[String(rank).toUpperCase()] || parseInt(rank, 10) || 0;
}

export class BotBrain {
  /**
   * Ra quyết định trong Pha Hành động (Action Phase)
   */
  static decideAction(state, botId) {
    const bot = state.getPlayer(botId);
    if (!bot || !bot.isAlive) return { type: 'END_ACTION_PHASE' };

    // Giới hạn an toàn chống vòng lặp hành động vô hạn trong cùng một lượt
    bot.turnStats = bot.turnStats || {};
    if ((bot.turnStats.botActionCount || 0) >= 12) {
      return { type: 'END_ACTION_PHASE' };
    }
    bot.turnStats.botActionCount = (bot.turnStats.botActionCount || 0) + 1;

    // 0. Chính sách Chủ Động Hiển Lộ Tướng (Proactive Hero Reveal Policy)
    const revealDecision = this._decideHeroReveal(state, bot);
    if (revealDecision) return revealDecision;

    // 1. Nếu bị thương và có Đào trên tay -> Tự ăn Đào hồi máu
    if (bot.hp < bot.maxHp) {
      const peachCard = bot.hand.find(c => c.type === 'peach' || c.name === 'Đào');
      if (peachCard) {
        return {
          type: 'PLAY_CARD',
          cardId: peachCard.id,
          targetId: bot.id,
          targetIds: [bot.id]
        };
      }
      // Thính Chính (Nguyễn Phi Ỷ Lan) - Dùng bài Đỏ như Đào khi bị thương
      if (hasSkill(bot, 'thinh_chinh')) {
        const isRed = c => {
          if (!c) return false;
          const col = globalHeroRegistry.getEffectiveColor(bot, c);
          return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
        };
        const redCard = bot.hand.find(c => isRed(c) && c.type !== 'peach' && c.name !== 'Đào');
        if (redCard) {
          return {
            type: 'PLAY_CARD',
            cardId: redCard.id,
            targetId: bot.id,
            targetIds: [bot.id],
            virtualCardName: 'Đào'
          };
        }
      }
    }

    // 2. Trang bị vũ khí/giáp/ngựa nếu có trên tay
    const equipCard = bot.hand.find(c => c.type === 'equip' || ['weapon', 'armor', 'horse_attack', 'horse_defense'].includes(c.type));
    if (equipCard) {
      return {
        type: 'PLAY_CARD',
        cardId: equipCard.id,
        targetId: bot.id,
        targetIds: [bot.id]
      };
    }

    // 3. Sử dụng Kỹ Năng Chủ Động Tấn Công / Khống Chế / Hồi Phục
    const combatSkillAction = this._decideActiveCombatSkill(state, bot);
    if (combatSkillAction) return combatSkillAction;

    // 4. Sử dụng Cẩm Nang (Tricks) với xác thực mục tiêu chặt chẽ qua TargetResolver
    const trickAction = this._decideTrickAction(state, bot);
    if (trickAction) return trickAction;

    // 5. Đánh Chém (Slash) kết hợp Uống Rượu (Wine Buff) & Vũ Khí Đặc Thù
    const slashAction = this._decideSlashAction(state, bot);
    if (slashAction) return slashAction;

    // 6. Kỹ Năng Làm Mới Tay Bài & Hỗ Trợ Đồng Minh Cuối Lượt (Bạch Đằng, Can Gián, Định Quốc)
    const refreshSkillAction = this._decideRefreshSkill(state, bot);
    if (refreshSkillAction) return refreshSkillAction;

    // Mặc định: Không còn hành động nào hợp lý -> Kết thúc pha
    return { type: 'END_ACTION_PHASE' };
  }

  /**
   * Quyết định lật mặt tướng chủ động (Proactive Hero Reveal)
   */
  static _decideHeroReveal(state, bot) {
    if (!bot.revealedHeroes) return null;
    const hasHeroAssigned = Boolean(bot.mainHeroId || bot.heroId || (bot.heroes && bot.heroes.length > 0));
    if (!hasHeroAssigned) return null;

    const unrevealed = [];
    if (!bot.revealedHeroes[0]) unrevealed.push(0);
    if (!bot.revealedHeroes[1]) unrevealed.push(1);
    if (unrevealed.length === 0) return null;

    // Danh sách các kỹ năng chủ động / chiến đấu cần hiển lộ tướng để kích hoạt
    const activeSkillIds = [
      'dieu_duoc', 'bach_dang', 'ky_tap', 'can_gian', 'hoa_than_an_tu',
      'hoa_than', 'hoa_than_huyen_tran', 'binh_loan', 'pha_thanh',
      'tien_phong', 'tien_phong_nguyen_lu', 'tam_cong', 'van_don',
      'duyen_tho', 'tien_duyen_chu_dong_tu', 'doi_nui', 'khai_thien',
      'no_than_cao_lo', 'thiet_ma', 'dinh_quoc', 'lan_sau', 'tu_chu',
      'thinh_chinh', 'than_hoa', 'thuy_to', 'chuong_duong', 'linh_giam',
      'duong_quan', 'trung_dung'
    ];

    // QUY TẮC QUỐC CHIẾN BẮT BUỘC:
    // Tướng đầu tiên lật mở BẮT BUỘC phải là Tướng Chính (slot 0).
    // Tuyệt đối không được phép lật Phó Tướng (slot 1) khi Tướng Chính chưa lộ diện.
    if (!bot.revealedHeroes[0]) {
      // 1. Nhận Thưởng Tiên Phong Cắm Cờ: Lật Tướng Chính
      if (!state.hasPioneerRewardClaimed) {
        return {
          type: 'REVEAL_HERO',
          heroIndex: 0
        };
      }

      // 2. Kích hoạt Kỹ Năng Chủ Động: Nếu Tướng Chính HOẶC Phó Tướng có skill cần dùng,
      // Bot bắt buộc phải lật Tướng Chính trước làm tiền đề lộ diện!
      const mainHeroId = bot.mainHeroId || bot.heroId;
      const subHeroId = bot.subHeroId;
      const mainHero = globalHeroRegistry.getHero(mainHeroId);
      const subHero = globalHeroRegistry.getHero(subHeroId);
      const hasAnyActiveSkill = [mainHero, subHero].some(hero => {
        if (!hero || !Array.isArray(hero.skills)) return false;
        return hero.skills.some(s => {
          const sId = (s.id || s).replace(/-/g, '_').toLowerCase();
          return activeSkillIds.includes(sId);
        });
      });

      if (hasAnyActiveSkill) {
        return {
          type: 'REVEAL_HERO',
          heroIndex: 0
        };
      }

      return null;
    }

    // Khi Tướng Chính đã lộ diện (bot.revealedHeroes[0] === true), lúc này mới xét lật Phó Tướng (slot 1)
    if (!bot.revealedHeroes[1]) {
      const subHeroId = bot.subHeroId;
      const subHero = globalHeroRegistry.getHero(subHeroId);
      if (subHero && Array.isArray(subHero.skills)) {
        const hasActiveSkill = subHero.skills.some(s => {
          const sId = (s.id || s).replace(/-/g, '_').toLowerCase();
          return activeSkillIds.includes(sId);
        });
        if (hasActiveSkill) {
          return {
            type: 'REVEAL_HERO',
            heroIndex: 1
          };
        }
      }
    }

    return null;
  }

  /**
   * Nhận diện và phát động Kỹ Năng Chủ Động Tấn Công / Khống Chế / Hồi Phục
   */
  static _decideActiveCombatSkill(state, bot) {
    if (bot.isSilenced || bot.temporaryFlags?.skillsSuppressed) return null;
    const alivePlayers = state.getAlivePlayers();

    // 1. Diệu Dược (Tuệ Tĩnh) - Cứu chữa đồng minh hoặc bản thân
    if (hasSkill(bot, 'dieu_duoc') && !bot.skillUsage?.dieu_duoc?.usedThisTurn && bot.hand?.length > 0) {
      const wounded = alivePlayers
        .filter(p => p.hp < p.maxHp && (p.id === bot.id || this._isKnownAlly(bot, p)))
        .sort((a, b) => a.hp - b.hp);
      if (wounded.length > 0) {
        // Lấy lá bài có giá trị thấp nhất
        const discardCard = this._pickLowestValueCard(bot);
        if (discardCard) {
          return {
            type: 'USE_SKILL',
            skillId: 'dieu_duoc',
            cardIds: [discardCard.id],
            targets: [wounded[0].id]
          };
        }
      }
    }

    // 2. Lặn Sâu (Yết Kiêu) - Mất 1 HP rút 2 lá bài khi máu an toàn
    if (hasSkill(bot, 'lan_sau') && (bot.hp >= 3 || (bot.hp === 2 && (bot.hand?.length || 0) <= 1))) {
      return {
        type: 'USE_SKILL',
        skillId: 'lan_sau',
        cardIds: [],
        targets: []
      };
    }

    // 2.5. Tự Chủ (Khúc Thừa Dụ) - Đấu điểm với kẻ địch có HP cao hơn khi có bài điểm cao
    if (hasSkill(bot, 'tu_chu') && !bot.skillUsage?.tu_chu?.usedThisTurn && (bot.hand?.length || 0) > 0) {
      const hasHighCard = bot.hand.some(c => rankToNumber(c.rank) >= 9);
      if (hasHighCard) {
        const higherHpEnemies = alivePlayers.filter(p => 
          p.id !== bot.id && 
          !this._isKnownAlly(bot, p) && 
          p.hp > bot.hp && 
          (p.hand?.length || 0) > 0
        );
        const sortedEnemies = this._sortTargetsByPriority(bot, higherHpEnemies);
        if (sortedEnemies.length > 0) {
          return {
            type: 'USE_SKILL',
            skillId: 'tu_chu',
            targets: [sortedEnemies[0].id]
          };
        }
      }
    }

    // 3. Kỳ Tập (Dã Tượng) - Dùng bài Đen như Tước Bài
    if (hasSkill(bot, 'ky_tap')) {
      const isBlack = c => {
        if (!c) return false;
        const col = globalHeroRegistry.getEffectiveColor(bot, c);
        return col ? col === 'black' : Boolean(c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
      };
      const blackCard = bot.hand.find(c => isBlack(c) && c.type !== 'peach' && c.name !== 'Đào');
      if (blackCard) {
        const potentialVictims = alivePlayers.filter(p => 
          p.id !== bot.id && 
          !this._isKnownAlly(bot, p) && 
          ((p.hand && p.hand.length > 0) || (p.equipment && Object.values(p.equipment).some(Boolean)) || (p.judgementArea && p.judgementArea.length > 0))
        );
        const sortedVictims = this._sortTargetsByPriority(bot, potentialVictims);
        if (sortedVictims.length > 0) {
          return {
            type: 'USE_SKILL',
            skillId: 'ky_tap',
            cardIds: [blackCard.id],
            targets: [sortedVictims[0].id]
          };
        }
      }
    }

    // 4. Hòa Thân (Công chúa An Tư) - Dùng bài Rô ♦ như Hỗn Loạn
    if (hasSkill(bot, 'hoa_than_an_tu') || hasSkill(bot, 'hoa-than-an-tu')) {
      const isDiamond = c => c && (c.suit === 'diamond' || c.suit === '♦');
      const diamondCard = bot.hand.find(isDiamond);
      if (diamondCard) {
        const targetsWithoutChaos = alivePlayers.filter(p => 
          p.id !== bot.id && 
          !this._isKnownAlly(bot, p) && 
          !hasSkill(p, 'nghe_an_ke') &&
          (!p.judgementArea || !p.judgementArea.some(j => j.name === 'Hỗn Loạn' || j.idKey === 'hon_loan'))
        );
        const sortedEnemies = this._sortTargetsByPriority(bot, targetsWithoutChaos);
        if (sortedEnemies.length > 0) {
          return {
            type: 'USE_SKILL',
            skillId: 'hoa_than_an_tu',
            cardIds: [diamondCard.id],
            targets: [sortedEnemies[0].id]
          };
        }
      }
    }

    // 5. Hòa Thân (Huyền Trân Công Chúa) - Ép 2 tướng Nam Quyết Đấu
    if ((hasSkill(bot, 'hoa_than_huyen_tran') || hasSkill(bot, 'hoa_than')) && !bot.skillUsage?.hoa_than?.usedThisTurn && bot.hand?.length > 0) {
      const maleEnemies = this._sortTargetsByPriority(
        bot,
        alivePlayers.filter(p => p.id !== bot.id && getPlayerGender(p) === 'male' && !this._isKnownAlly(bot, p) && !(hasSkill(p, 'dam_bac') && (!p.hand || p.hand.length === 0)))
      );
      if (maleEnemies.length >= 2) {
        const discardCard = this._pickLowestValueCard(bot);
        if (discardCard) {
          return {
            type: 'USE_SKILL',
            skillId: 'hoa_than',
            cardIds: [discardCard.id],
            targets: [maleEnemies[0].id, maleEnemies[1].id]
          };
        }
      }
    }

    // 6. Bình Loạn (Nguyễn Bặc) - Bỏ 2 lá cùng chất phát động Loạn Tiễn
    if (hasSkill(bot, 'binh_loan') && bot.hand?.length >= 2) {
      // Đảm bảo không có đồng minh nào hấp hối hoặc 1 HP trước khi bắn mưa tên
      const fragileAlly = alivePlayers.find(p => p.id !== bot.id && this._isKnownAlly(bot, p) && p.hp <= 1);
      if (!fragileAlly) {
        const suits = {};
        for (const c of bot.hand) {
          const s = c.suit;
          if (!suits[s]) suits[s] = [];
          suits[s].push(c);
        }
        for (const s in suits) {
          if (suits[s].length >= 2) {
            return {
              type: 'USE_SKILL',
              skillId: 'binh_loan',
              cardIds: [suits[s][0].id, suits[s][1].id]
            };
          }
        }
      }
    }

    // 7. Phá Thành (Đô Đốc Bảo) - Quyết Đấu mục tiêu kẻ địch
    if (hasSkill(bot, 'pha_thanh') && bot.hand?.length > 0) {
      const allowedColor = bot.temporaryFlags?.phaThanhOppositeColor;
      const isRed = c => c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦';
      const matchCard = bot.hand.find(c => {
        if (!allowedColor) return true;
        return allowedColor === 'red' ? isRed(c) : !isRed(c);
      });
      if (matchCard) {
        const validEnemies = alivePlayers.filter(p => 
          p.id !== bot.id && 
          !this._isKnownAlly(bot, p) && 
          !(hasSkill(p, 'dam_bac') && (!p.hand || p.hand.length === 0))
        );
        const sortedEnemies = this._sortTargetsByPriority(bot, validEnemies);
        if (sortedEnemies.length > 0) {
          return {
            type: 'USE_SKILL',
            skillId: 'pha_thanh',
            cardIds: [matchCard.id],
            targets: [sortedEnemies[0].id]
          };
        }
      }
    }

    // 8. Tiên Phong (Nguyễn Lữ) - Hy sinh vũ khí hoặc HP để gây 1 sát thương chắc chắn
    if ((hasSkill(bot, 'tien_phong_nguyen_lu') || hasSkill(bot, 'tien_phong'))) {
      const handWeapon = (bot.hand || []).find(c => c && (c.type === 'weapon' || c.subtype === 'equip_weapon' || c.subType === 'equip_weapon'));
      const hasWeapon = Boolean(bot.equipment?.weapon || handWeapon);
      const canCost = hasWeapon || bot.hp > 1;
      if (canCost) {
        const enemiesInRange = alivePlayers.filter(p => 
          p.id !== bot.id && 
          !this._isKnownAlly(bot, p) && 
          RangeSystem.inSlashRange(bot, p, alivePlayers)
        );
        const sortedEnemies = this._sortTargetsByPriority(bot, enemiesInRange);
        if (sortedEnemies.length > 0 && (sortedEnemies[0].hp <= 2 || hasWeapon)) {
          return {
            type: 'USE_SKILL',
            skillId: 'tien_phong',
            targets: [sortedEnemies[0].id],
            options: { 
              costType: hasWeapon ? 'weapon' : 'hp',
              cardId: bot.equipment?.weapon ? bot.equipment.weapon.id : (handWeapon ? handWeapon.id : undefined)
            }
          };
        }
      }
    }

    // 9. Tâm Công (Nguyễn Trãi) - Bắt kẻ địch đoán chất bài
    if (hasSkill(bot, 'tam_cong') && !bot.skillUsage?.tam_cong?.usedThisTurn && (bot.hand?.length || 0) > 0) {
      const targetEnemies = this._sortTargetsByPriority(
        bot,
        alivePlayers.filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p))
      );
      if (targetEnemies.length > 0) {
        return {
          type: 'USE_SKILL',
          skillId: 'tam_cong',
          targets: [targetEnemies[0].id]
        };
      }
    }

    // 10. Vân Đồn (Trần Khánh Dư) - Đấu điểm nhận 2 Chém vô hạn tầm
    if (hasSkill(bot, 'van_don') && !bot.temporaryFlags?.vanDonUsed) {
      const hasHighRank = bot.hand?.some(c => rankToNumber(c.rank) >= 9);
      if (hasHighRank) {
        const targetEnemies = this._sortTargetsByPriority(
          bot,
          alivePlayers.filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p) && p.hand?.length > 0)
        );
        if (targetEnemies.length > 0) {
          return {
            type: 'USE_SKILL',
            skillId: 'van_don',
            targets: [targetEnemies[0].id]
          };
        }
      }
    }

    // 11. Duyên Thơ (Hồ Xuân Hương) - Bỏ 2 bài ngâm thơ hồi 1 HP cho mình & tướng Nam
    if (hasSkill(bot, 'duyen_tho') && !bot.skillUsage?.duyen_tho?.usedThisTurn && bot.hand?.length >= 2) {
      const woundedMale = alivePlayers.find(p => getPlayerGender(p) === 'male' && p.hp < p.maxHp && (p.id === bot.id || this._isKnownAlly(bot, p)));
      if (bot.hp < bot.maxHp || woundedMale) {
        const targetMale = woundedMale || alivePlayers.find(p => getPlayerGender(p) === 'male');
        if (targetMale) {
          return {
            type: 'USE_SKILL',
            skillId: 'duyen_tho',
            cardIds: [bot.hand[0].id, bot.hand[1].id],
            targets: [targetMale.id]
          };
        }
      }
    }

    // 12. Tiên Duyên (Chử Đồng Tử) - Dùng bài ♣ làm Xiềng Xích
    if (hasSkill(bot, 'tien_duyen_chu_dong_tu')) {
      const clubCard = bot.hand.find(c => c.suit === 'club' || c.suit === '♣');
      if (clubCard) {
        const unchainedEnemies = this._sortTargetsByPriority(
          bot,
          alivePlayers.filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p) && !p.chained)
        );
        if (unchainedEnemies.length > 0) {
          const targets = unchainedEnemies.slice(0, 2).map(p => p.id);
          return {
            type: 'PLAY_CARD',
            cardId: clubCard.id,
            targetId: targets[0],
            targetIds: targets,
            virtualCardName: 'Xiềng Xích',
            asChain: true
          };
        }
      }
    }

    return null;
  }

  /**
   * Kỹ năng làm mới tay bài & hỗ trợ đồng minh (chỉ kích hoạt sau khi đã đánh Cẩm Nang / Chém)
   */
  static _decideRefreshSkill(state, bot) {
    if (bot.isSilenced || bot.temporaryFlags?.skillsSuppressed) return null;
    const alivePlayers = state.getAlivePlayers();

    // 1. Bạch Đằng (Ngô Quyền) - Đổi toàn bộ bài kém trên tay để lấy bài mới
    if (hasSkill(bot, 'bach_dang') && !bot.skillUsage?.bach_dang?.usedThisTurn && bot.hand?.length > 0) {
      if (bot.hand.length <= 3) {
        return {
          type: 'USE_SKILL',
          skillId: 'bach_dang',
          cardIds: bot.hand.map(c => c.id)
        };
      }
    }

    // 2. Can Gián (Trần Bình Trọng) - Mất 1 HP cho đồng minh rút 2 bài khi an toàn
    if (hasSkill(bot, 'can_gian') && bot.hp >= 3) {
      const cardStarvedAlly = alivePlayers.find(p => p.id !== bot.id && this._isKnownAlly(bot, p) && (p.hand?.length || 0) <= 2);
      if (cardStarvedAlly) {
        return {
          type: 'USE_SKILL',
          skillId: 'can_gian',
          targets: [cardStarvedAlly.id]
        };
      }
    }

    // 3. Định Quốc (Đinh Điền) - Chủ động kêu gọi đồng minh Sơn dâng bài
    if (hasSkill(bot, 'dinh_quoc') && (bot.hand?.length || 0) <= 2) {
      const hasSonAlly = alivePlayers.some(p => p.id !== bot.id && getCanonicalFaction(p.faction) === 'son');
      if (hasSonAlly) {
        return {
          type: 'USE_SKILL',
          skillId: 'dinh_quoc'
        };
      }
    }

    // 4. Thủy Tổ (Lạc Long Quân) - Cho bài đồng minh khi bài tay dư dả
    if (hasSkill(bot, 'thuy_to') && (bot.hand?.length || 0) >= 4) {
      const cardStarvedAlly = alivePlayers.find(p => p.id !== bot.id && this._isKnownAlly(bot, p) && (p.hand?.length || 0) <= 2);
      if (cardStarvedAlly) {
        const card1 = this._pickLowestValueCard(bot);
        const remaining = bot.hand.filter(c => c.id !== card1.id);
        const card2 = remaining[0];
        if (card1 && card2) {
          return {
            type: 'USE_SKILL',
            skillId: 'thuy_to',
            cardIds: [card1.id, card2.id],
            targets: [cardStarvedAlly.id]
          };
        }
      }
    }

    return null;
  }

  /**
   * Tương thích ngược: Ra quyết định kỹ năng chủ động tổng hợp
   */
  static _decideActiveSkill(state, bot) {
    return this._decideActiveCombatSkill(state, bot) || this._decideRefreshSkill(state, bot);
  }

  /**
   * Ra quyết định sử dụng Cẩm Nang (Tricks) với bộ lọc getAvailableTargets
   */
  static _decideTrickAction(state, bot) {
    const alivePlayers = state.getAlivePlayers();

    for (const card of bot.hand) {
      if (card.type !== 'trick' && card.type !== 'TRICK') continue;
      if (card.name === 'Hóa Giải' || card.idKey === 'hoa_giai') continue;

      const targeting = getTargetingDefinition(state, bot.id, card.name, card);

      // A. Cẩm nang bản thân (Self Tricks)
      if (targeting.type === 'self') {
        if (card.name === 'Vô Trung Sinh Hữu' || card.idKey === 'vo_trung') {
          return {
            type: 'PLAY_CARD',
            cardId: card.id,
            targetId: bot.id,
            targetIds: [bot.id]
          };
        }
        if (card.name === 'Sấm Sét' || card.idKey === 'sam_set') {
          const alreadyHas = bot.judgementArea && bot.judgementArea.some(j => j.name === 'Sấm Sét' || j.idKey === 'sam_set');
          if (!alreadyHas) {
            return {
              type: 'PLAY_CARD',
              cardId: card.id,
              targetId: bot.id,
              targetIds: [bot.id]
            };
          }
        }
      }

      // B. Cẩm nang diện rộng (AOE Tricks)
      else if (targeting.type === 'aoe') {
        if (card.name === 'Hồi Xuân' || card.idKey === 'hoi_xuan') {
          const woundedAllies = alivePlayers.filter(p => this._isKnownAlly(bot, p) && p.hp < p.maxHp).length;
          const woundedEnemies = alivePlayers.filter(p => this._isKnownEnemy(bot, p) && p.hp < p.maxHp).length;
          if (woundedAllies >= woundedEnemies || bot.hp <= 2) {
            return {
              type: 'PLAY_CARD',
              cardId: card.id,
              targetIds: []
            };
          }
        } else if (card.name === 'Dã Man' || card.idKey === 'da_man' || card.name === 'Loạn Tiễn' || card.idKey === 'loan_tien') {
          const lowHpAlly = alivePlayers.find(p => p.id !== bot.id && this._isKnownAlly(bot, p) && p.hp <= 1);
          if (!lowHpAlly) {
            return {
              type: 'PLAY_CARD',
              cardId: card.id,
              targetIds: []
            };
          }
        }
      }

      // C. Cẩm nang đa bước (Sequence: Mượn Đao)
      else if (targeting.type === 'sequence') {
        const validWeaponOwners = getAvailableTargets(state, bot.id, card.name, card.id)
          .map(id => state.getPlayer(id))
          .filter(p => p && !this._isKnownAlly(bot, p));

        for (const weaponOwner of validWeaponOwners) {
          const validVictims = getAvailableTargets(state, bot.id, card.name, card.id, [weaponOwner.id])
            .map(id => state.getPlayer(id))
            .filter(p => p && !this._isKnownAlly(bot, p));
          if (validVictims.length > 0) {
            const sortedVictims = this._sortTargetsByPriority(bot, validVictims);
            return {
              type: 'PLAY_CARD',
              cardId: card.id,
              targetId: weaponOwner.id,
              targetIds: [weaponOwner.id, sortedVictims[0].id]
            };
          }
        }
      }

      // D. Cẩm nang đơn mục tiêu (Single Target: Tước Bài, Cướp Bài, Quyết Đấu, Hỏa Công, Hỗn Loạn, v.v.)
      else if (targeting.type === 'single' || targeting.type === 'multiple') {
        const availableTargetIds = getAvailableTargets(state, bot.id, card.name, card.id);
        if (!availableTargetIds || availableTargetIds.length === 0) continue;

        const validCandidates = availableTargetIds
          .map(id => state.getPlayer(id))
          .filter(p => {
            if (!p || !p.isAlive || this._isKnownAlly(bot, p)) return false;
            if (['Cướp Bài', 'Hỗn Loạn'].includes(card.name) && (hasSkill(p, 'nghe_an_ke') || p.skills?.includes('nghe_an_ke'))) return false;
            return true;
          });

        if (validCandidates.length === 0) continue;

        const sortedEnemies = this._sortTargetsByPriority(bot, validCandidates);
        if (sortedEnemies.length === 0) continue;

        // Ràng buộc riêng của Hỏa Công: Bot phải có ít nhất 1 lá bài khác trên tay để sẵn sàng bỏ
        if (card.name === 'Hỏa Công' || card.idKey === 'hoa_cong') {
          const otherCards = bot.hand.filter(c => c.id !== card.id);
          if (otherCards.length === 0) continue;
        }

        const targetEnemy = sortedEnemies[0];
        return {
          type: 'PLAY_CARD',
          cardId: card.id,
          targetId: targetEnemy.id,
          targetIds: [targetEnemy.id]
        };
      }
    }

    // Thần Hỏa (Rùa Vàng): Dùng bài Đỏ như Hỏa Công
    if (hasSkill(bot, 'than_hoa') && (bot.hand?.length || 0) >= 2) {
      const isRed = c => c && (c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
      const redCard = bot.hand.find(c => isRed(c) && c.type !== 'peach' && c.name !== 'Đào');
      if (redCard) {
        const potentialVictims = alivePlayers.filter(p => 
          p.id !== bot.id && 
          !this._isKnownAlly(bot, p) && 
          (p.hand && p.hand.length > 0)
        );
        const sortedVictims = this._sortTargetsByPriority(bot, potentialVictims);
        if (sortedVictims.length > 0) {
          return {
            type: 'PLAY_CARD',
            cardId: redCard.id,
            targetId: sortedVictims[0].id,
            targetIds: [sortedVictims[0].id],
            virtualCardName: 'Hỏa Công',
            customData: { asFireAttack: true }
          };
        }
      }
    }

    return null;
  }

  /**
   * Ra quyết định đánh Chém (Slash) kết hợp Uống Rượu & Phương Thiên Kích / Vân Đồn
   */
  static _decideSlashAction(state, bot) {
    if (bot.temporaryFlags?.vanDonLose) return null;
    const botWeapon = bot.equipment?.weapon;
    const botWeaponId = String(botWeapon?.id || botWeapon?.idKey || botWeapon?.key || '');
    const hasCrossbow = isEquip(botWeapon, 'lien_no') ||
      botWeapon?.name === 'Liên Nỏ' || 
      botWeaponId === 'crossbow' || 
      botWeaponId.includes('lien-no') || 
      botWeaponId.includes('liên-nỏ') || 
      botWeaponId.includes('lien_no') ||
      Boolean(bot.temporaryFlags?.unlimitedSlash);
    const canSlash = hasCrossbow || (bot.turnStats?.slashCount || 0) < 1;
    if (!canSlash) return null;

    const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
    const hasKhaiThien = globalHeroRegistry.hasSkill(bot, 'khai_thien', true);
    const isRed = c => {
      if (!c) return false;
      const col = globalHeroRegistry.getEffectiveColor(bot, c);
      return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
    };

    const slashCard = bot.hand.find(c => c.type === 'slash' || c.name === 'Chém') || 
      (hasDoiNui ? bot.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
      (hasKhaiThien ? bot.hand.find(c => isRed(c) && c.type !== 'peach' && c.name !== 'Đào') : null);

    if (!slashCard) return null;

    const alivePlayers = state.getAlivePlayers();
    const validTargets = RangeSystem.getValidSlashTargets(bot, alivePlayers, slashCard);
    const validEnemies = validTargets.filter(t => {
      if (t.id === bot.id) return false;
      if (this._isKnownAlly(bot, t)) return false;
      // Lang Liêu Đạm Bạc khi hết bài trên tay không thể bị chọn làm mục tiêu
      if (globalHeroRegistry.hasSkill(t, 'dam_bac', true) && (!t.hand || t.hand.length === 0)) return false;
      return true;
    });

    const sortedEnemies = this._sortTargetsByPriority(bot, validEnemies);
    if (sortedEnemies.length === 0) return null;

    // Rượu buff trước khi Chém nếu chưa uống và có Rượu trên tay
    if (!bot.temporaryFlags?.wineActive && (bot.turnStats?.wineCount || 0) < 1) {
      const wineCard = bot.hand.find(c => c.type === 'wine' || c.name === 'Rượu');
      if (wineCard) {
        return {
          type: 'PLAY_CARD',
          cardId: wineCard.id,
          targetId: bot.id,
          targetIds: [bot.id]
        };
      }
    }

    // Kiểm tra hiệu ứng Phương Thiên Kích (last card in hand -> up to 3 targets)
    const isLastCard = bot.hand.length === 1 && bot.hand[0].id === slashCard.id;
    const hasPhuongThienKich = isEquip(bot.equipment?.weapon, 'phuong_thien_kich') || bot.equipment?.weapon?.name === 'Phương Thiên Kích' || bot.equipment?.weapon?.idKey === 'phuong_thien_kich';
    const hasVanDon = bot.temporaryFlags?.vanDonWin;

    let chosenTargets = [sortedEnemies[0].id];
    if (hasPhuongThienKich && isLastCard) {
      chosenTargets = sortedEnemies.slice(0, 3).map(p => p.id);
    } else if (hasVanDon) {
      chosenTargets = sortedEnemies.slice(0, 2).map(p => p.id);
    }

    const virtualName = slashCard.name !== 'Chém' ? 'Chém' : null;
    return {
      type: 'PLAY_CARD',
      cardId: slashCard.id,
      targetId: chosenTargets[0],
      targetIds: chosenTargets,
      virtualCardName: virtualName,
      asSlash: Boolean(virtualName)
    };
  }

  /**
   * Helper tìm lá bài có giá trị thấp nhất để hy sinh/bỏ
   */
  static _pickLowestValueCard(bot) {
    if (!bot.hand || bot.hand.length === 0) return null;
    const isPeach = c => c.name === 'Đào' || c.type === 'peach';
    const isWine = c => c.name === 'Rượu' || c.type === 'wine';
    // Tuyệt đối không hy sinh Đào/Rượu nếu bot đang thấp máu (hp <= 2)
    const filtered = (bot.hp <= 2) ? bot.hand.filter(c => !isPeach(c) && !isWine(c)) : bot.hand;
    const candidates = filtered.length > 0 ? filtered : bot.hand;
    return candidates[candidates.length - 1];
  }

  /**
   * Helper kiểm tra đồng minh đã lộ diện cùng phe (Faction Loyalty)
   */
  static _isKnownAlly(bot, target) {
    if (!target || target.id === bot.id) return true;
    if (bot.isDaTam || target.isDaTam) return false;
    const isRevealed = target.revealedHeroes?.some(Boolean);
    return Boolean(isRevealed && isSameFaction(bot, target));
  }

  /**
   * Helper kiểm tra kẻ thù đã lộ diện khác phe
   */
  static _isKnownEnemy(bot, target) {
    if (!target || target.id === bot.id) return false;
    if (bot.isDaTam || target.isDaTam) return true;
    const isRevealed = target.revealedHeroes?.some(Boolean);
    return Boolean(isRevealed && getCanonicalFaction(target.faction) !== 'none' && !isSameFaction(bot, target));
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
   * Phản hồi khi có yêu cầu từ PriorityStack (Né, Đào, Bỏ bài, và các Kỹ Năng Phản Ứng chuyên biệt)
   */
  static decideReaction(state, botId, frame) {
    const bot = state.getPlayer(botId);
    if (!bot || !bot.isAlive) {
      return { type: 'ACTION_REACT', canceled: true };
    }

    switch (frame.type) {
      case 'ASK_DODGE': {
        const hasBaguaArmor = bot.equipment?.armor && (
          isEquip(bot.equipment.armor, 'bat_quai') ||
          bot.equipment.armor.name === 'Bát Quái' ||
          bot.equipment.armor.id === 'bat_quai' ||
          bot.equipment.armor.key === 'bat_quai'
        );
        const hasThanGiap = !bot.equipment?.armor && globalHeroRegistry.hasSkill(bot, 'than_giap', true);

        if ((hasBaguaArmor || hasThanGiap) && !frame.context?.baguaAttempted) {
          return {
            type: 'ACTION_REACT',
            useBagua: true
          };
        }

        const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
        const hasThinhChinh = globalHeroRegistry.hasSkill(bot, 'thinh_chinh', true);
        const isBlack = c => {
          if (!c) return false;
          const col = globalHeroRegistry.getEffectiveColor(bot, c);
          return col ? col === 'black' : Boolean(c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
        };
        const dodgeCard = bot.hand.find(c => c.type === 'dodge' || c.name === 'Né') || 
          (hasDoiNui ? bot.hand.find(c => c.type === 'slash' || c.name === 'Chém') : null) ||
          (hasThinhChinh ? bot.hand.find(isBlack) : null);
        
        return {
          type: 'ACTION_REACT',
          dodgeCard: dodgeCard || null
        };
      }

      case 'ASK_PEACH': {
        const victim = state.getPlayer(frame.targetId);
        const isSelf = frame.targetId === bot.id;
        const isAlly = victim && this._isKnownAlly(bot, victim);
        const hasNamDuoc = globalHeroRegistry.hasSkill(bot, 'nam_duoc', true) && state.currentTurnPlayerId !== bot.id;
        const isRed = c => {
          if (!c) return false;
          const col = globalHeroRegistry.getEffectiveColor(bot, c);
          return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
        };

        let healCard = bot.hand.find(c => c.type === 'peach' || c.name === 'Đào');
        if (!healCard && isSelf) {
          healCard = bot.hand.find(c => c.type === 'wine' || c.name === 'Rượu');
        }
        if (!healCard && hasNamDuoc) {
          healCard = bot.hand.find(isRed);
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
        const hasChuongDuong = globalHeroRegistry.hasSkill(bot, 'chuong_duong', true);
        const isBlack = c => {
          if (!c) return false;
          const col = globalHeroRegistry.getEffectiveColor(bot, c);
          return col ? col === 'black' : Boolean(c.color === 'black' || c.suit === 'spade' || c.suit === 'club' || c.suit === '♠' || c.suit === '♣');
        };
        const equipCard = bot.hand.find(c => c.type === 'equip' || ['weapon', 'armor', 'horse_attack', 'horse_defense'].includes(c.type));
        const negateCard = bot.hand.find(c => c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') ||
          (hasLinhGiam ? bot.hand.find(isBlack) : null) ||
          (hasChuongDuong ? equipCard : null);

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

      case 'ASK_BOC_TRAM_TRUNG_DODGE': {
        // Đồng minh phe Lạc ra Né giùm cho Chúa công Lạc Long Quân
        const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
        const dodgeCard = bot.hand.find(c => c.type === 'dodge' || c.name === 'Né') || 
          (hasDoiNui ? bot.hand.find(c => c.type === 'slash' || c.name === 'Chém') : null);
        if (dodgeCard) {
          return {
            type: 'ACTION_REACT',
            doProvide: true,
            cardId: dodgeCard.id
          };
        }
        return {
          type: 'ACTION_REACT',
          doProvide: false
        };
      }

      case 'ASK_BOC_TRAM_TRUNG_SLASH': {
        // Đồng minh phe Lạc ra Chém giùm cho Chúa công Lạc Long Quân
        const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
        const hasKhaiThien = globalHeroRegistry.hasSkill(bot, 'khai_thien', true);
        const isRed = c => {
          if (!c) return false;
          const col = globalHeroRegistry.getEffectiveColor(bot, c);
          return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
        };
        const slashCard = bot.hand.find(c => c.type === 'slash' || c.name === 'Chém') || 
          (hasDoiNui ? bot.hand.find(c => c.type === 'dodge' || c.name === 'Né') : null) ||
          (hasKhaiThien ? bot.hand.find(isRed) : null);
        if (slashCard) {
          return {
            type: 'ACTION_REACT',
            doProvide: true,
            cardId: slashCard.id
          };
        }
        return {
          type: 'ACTION_REACT',
          doProvide: false
        };
      }

      case 'ASK_TIEN_PHAT': {
        // Lý Thường Kiệt bỏ lá Né để chặn đòn Chém của kẻ địch
        const dodgeCard = bot.hand.find(c => c.type === 'dodge' || c.name === 'Né');
        if (dodgeCard) {
          return {
            type: 'ACTION_REACT',
            doReact: true,
            cardId: dodgeCard.id
          };
        }
        return {
          type: 'ACTION_REACT',
          doReact: false
        };
      }

      case 'ASK_HOACONG_DISCARD': {
        // Kẻ tấn công Hỏa Công bỏ bài cùng chất với lá bài mục tiêu hiển lộ để gây 1 sát thương lửa
        const revealedCard = frame.context?.revealedCard || frame.revealedCard;
        const targetId = frame.targetId;
        const target = targetId !== null && targetId !== undefined ? state.getPlayer(targetId) : null;
        if (revealedCard && (!target || !this._isKnownAlly(bot, target))) {
          const matchCard = bot.hand.find(c => c.suit === revealedCard.suit);
          if (matchCard) {
            return {
              type: 'ACTION_REACT',
              doReact: true,
              cardId: matchCard.id
            };
          }
        }
        return {
          type: 'ACTION_REACT',
          doReact: false
        };
      }

      case 'ASK_DISMANTLE':
      case 'ASK_SNATCH': {
        const targetId = frame.context?.targetId ?? frame.targetId;
        const target = state.getPlayer(targetId);
        if (!target) return { type: 'ACTION_REACT', canceled: true };

        const equipCards = Object.values(target.equipment || {}).filter(Boolean);
        if (equipCards.length > 0) {
          const armor = target.equipment?.armor;
          const weapon = target.equipment?.weapon;
          const chosenEquip = armor || weapon || equipCards[0];
          return {
            type: 'ACTION_REACT',
            cardId: chosenEquip.id,
            zone: 'equip',
            canceled: false
          };
        }
        if (target.hand && target.hand.length > 0) {
          const randCard = target.hand[Math.floor(Math.random() * target.hand.length)];
          return {
            type: 'ACTION_REACT',
            cardId: randCard.id,
            zone: 'hand',
            canceled: false
          };
        }
        if (target.judgementArea && target.judgementArea.length > 0) {
          return {
            type: 'ACTION_REACT',
            cardId: target.judgementArea[0].id,
            zone: 'judge',
            canceled: false
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_HOACONG_REVEAL': {
        // Nạn nhân Hỏa Công hiển lộ 1 lá bài trên tay
        const leastDangerousCard = this._pickLowestValueCard(bot) || bot.hand[0];
        return {
          type: 'ACTION_REACT',
          cardId: leastDangerousCard ? leastDangerousCard.id : null
        };
      }

      case 'ASK_HIEN_HAU': {
        // Ngọc Hân Công Chúa bỏ 1 bài ngăn toàn bộ sát thương và chuyển 1 sát thương sang kẻ địch
        if (bot.hand?.length > 0) {
          const discardCard = this._pickLowestValueCard(bot);
          const aliveEnemies = this._sortTargetsByPriority(
            bot,
            state.getAlivePlayers().filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p))
          );
          if (aliveEnemies.length > 0 && discardCard) {
            return {
              type: 'ACTION_REACT',
              doUse: true,
              cardId: discardCard.id,
              targetId: aliveEnemies[0].id,
              option: 2
            };
          }
        }
        return {
          type: 'ACTION_REACT',
          doUse: false
        };
      }

      case 'ASK_CHANGE_JUDGE': {
        // Đổi phán xét (Thần Trụ Trời / Rùa Vàng)
        const judgeTargetId = frame.context?.judgeTargetId ?? frame.targetId;
        const judgeTarget = judgeTargetId !== null && judgeTargetId !== undefined ? state.getPlayer(judgeTargetId) : null;
        const isAlly = judgeTarget && this._isKnownAlly(bot, judgeTarget);
        const trickName = frame.context?.trickName;

        if (isAlly && trickName === 'Sấm Sét') {
          // Tránh Bích 2-9 cho bản thân/đồng minh
          const safeCard = bot.hand.find(c => c.suit !== 'spade' && c.suit !== '♠');
          if (safeCard) {
            return { type: 'ACTION_REACT', doReact: true, cardId: safeCard.id };
          }
        } else if (!isAlly && trickName === 'Sấm Sét') {
          // Ép kẻ địch dính sét (Bích 2-9)
          const lightningCard = bot.hand.find(c => (c.suit === 'spade' || c.suit === '♠') && rankToNumber(c.rank) >= 2 && rankToNumber(c.rank) <= 9);
          if (lightningCard) {
            return { type: 'ACTION_REACT', doReact: true, cardId: lightningCard.id };
          }
        } else if (isAlly && trickName === 'Hỗn Loạn') {
          // Giúp bản thân/đồng minh thoát Hỗn Loạn (chất Cơ ♥)
          const heartCard = bot.hand.find(c => c.suit === 'heart' || c.suit === '♥');
          if (heartCard) {
            return { type: 'ACTION_REACT', doReact: true, cardId: heartCard.id };
          }
        } else if (!isAlly && trickName === 'Hỗn Loạn') {
          // Ép kẻ địch dính Hỗn Loạn (không phải Cơ ♥)
          const nonHeartCard = bot.hand.find(c => c.suit !== 'heart' && c.suit !== '♥');
          if (nonHeartCard) {
            return { type: 'ACTION_REACT', doReact: true, cardId: nonHeartCard.id };
          }
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_HAU_VIEN': {
        // Ngô Quyền nhường Đào cho đồng minh bị thương và rút 1 bài
        const woundedAlly = state.getAlivePlayers().find(p => p.id !== bot.id && this._isKnownAlly(bot, p) && p.hp < p.maxHp);
        if (woundedAlly) {
          return {
            type: 'ACTION_REACT',
            doReact: true,
            targetId: woundedAlly.id
          };
        }
        return {
          type: 'ACTION_REACT',
          doReact: false
        };
      }

      case 'ASK_THUY_TO': {
        // Lạc Long Quân giao bài cho đồng minh
        const ally = state.getAlivePlayers().find(p => p.id !== bot.id && this._isKnownAlly(bot, p));
        if (ally && bot.hand?.length >= 2) {
          return {
            type: 'ACTION_REACT',
            selectedAlly: ally.id,
            selectedCardIds: [bot.hand[0].id, bot.hand[1].id]
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_THUY_TO_BONUS': {
        // Thưởng Thủy Tổ: Dùng Đào/Rượu/Chém miễn phí
        if (bot.hp < bot.maxHp) {
          return { type: 'ACTION_REACT', virtualCardName: 'Đào' };
        }
        const hasSlash = bot.hand.some(c => c.type === 'slash' || c.name === 'Chém');
        if (hasSlash && !bot.temporaryFlags?.wineActive) {
          return { type: 'ACTION_REACT', virtualCardName: 'Rượu' };
        }
        const validSlashTargets = RangeSystem.getValidSlashTargets(bot, state.getAlivePlayers(), { name: 'Chém', virtual: true });
        const validEnemies = this._sortTargetsByPriority(bot, validSlashTargets.filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p)));
        if (validEnemies.length > 0) {
          return { type: 'ACTION_REACT', virtualCardName: 'Chém', targetId: validEnemies[0].id };
        }
        return { type: 'ACTION_REACT', virtualCardName: 'Rượu' };
      }

      case 'ASK_VAN_DON': {
        // Trần Khánh Dư đấu điểm: Chọn lá bài lớn nhất
        const highestCard = [...bot.hand].sort((a, b) => rankToNumber(b.rank) - rankToNumber(a.rank))[0];
        return {
          type: 'ACTION_REACT',
          cardId: highestCard ? highestCard.id : null
        };
      }

      case 'ASK_TU_CHU': {
        // Khúc Thừa Dụ đấu điểm: Chọn lá bài lớn nhất
        const highestCard = [...bot.hand].sort((a, b) => rankToNumber(b.rank) - rankToNumber(a.rank))[0];
        const enemies = this._sortTargetsByPriority(bot, state.getAlivePlayers().filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p)));
        return {
          type: 'ACTION_REACT',
          cardId: highestCard ? highestCard.id : null,
          targetId: enemies[0]?.id
        };
      }

      case 'ASK_DINH_QUOC': {
        // Đồng minh Sơn dâng lá Né hoặc Sấm Sét cho Đinh Điền
        const tributeCard = bot.hand.find(c => c.type === 'dodge' || c.name === 'Né' || c.idKey === 'sam_set' || c.name === 'Sấm Sét');
        if (tributeCard) {
          return {
            type: 'ACTION_REACT',
            cardId: tributeCard.id
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_KHOAN_DAN': {
        // Khúc Thừa Dụ rút bài khi bị sát thương
        return { type: 'ACTION_REACT', doReact: true };
      }

      case 'ASK_DOAT_SAO': {
        // Trần Quang Khải cướp bài sau chiến đấu
        return { type: 'ACTION_REACT', doReact: true, targetCardArea: 'hand' };
      }

      case 'ASK_DOAT_SAO_DISCARD': {
        const lowestCard = this._pickLowestValueCard(bot) || bot.hand[0];
        return { type: 'ACTION_REACT', cardId: lowestCard ? lowestCard.id : null };
      }

      case 'ASK_THAT_TRAM_SO_PUNISH': {
        // Chu Văn An Thất Trảm Sớ: Ưu tiên bỏ 2 bài nếu còn nhiều bài
        if (bot.hand?.length >= 2) {
          return {
            type: 'ACTION_REACT',
            option: 'discard',
            cardIds: [bot.hand[0].id, bot.hand[1].id]
          };
        }
        return { type: 'ACTION_REACT', option: 'damage' };
      }

      case 'ASK_DOI_SU':
      case 'ASK_HOA_NGHI':
      case 'ASK_NAM_QUOC_SON_HA':
      case 'ASK_HO_CHU':
      case 'ASK_THONG_NGON':
      case 'ASK_PHAT_TAM': {
        return { type: 'ACTION_REACT', doUse: true, doReact: true };
      }

      case 'ASK_CAN_GIAN': {
        if (bot.hp >= 3) {
          return { type: 'ACTION_REACT', doUse: true, doReact: true };
        }
        return { type: 'ACTION_REACT', doUse: false, doReact: false };
      }

      case 'ASK_HOA_THAN_AN_TU': {
        const diamondCard = (bot.hand || []).find(c => c.suit === 'diamond' || c.suit === '♦');
        const enemies = this._sortTargetsByPriority(bot, state.getAlivePlayers().filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p)));
        if (diamondCard && enemies[0]) {
          return {
            type: 'ACTION_REACT',
            cardId: diamondCard.id,
            targetId: enemies[0].id
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_SUIT': {
        // Tâm Công đoán chất bài
        return { type: 'ACTION_REACT', suit: 'heart' };
      }

      case 'ASK_XA_THAN': {
        // Công chúa An Tư bỏ bài chuyển hướng đòn đánh sang người chơi khác trong tầm công kích
        const allowedTargetIds = frame.context?.validTargets || 
          RangeSystem.getValidSlashTargets(bot, state.getAlivePlayers())
            .filter(p => p.id !== bot.id && p.id !== frame.sourceId)
            .map(p => p.id);
        
        const candidateEnemies = state.getAlivePlayers().filter(p => 
          p.id !== bot.id && 
          p.id !== frame.sourceId && 
          allowedTargetIds.includes(p.id) && 
          !this._isKnownAlly(bot, p)
        );
        const sortedEnemies = this._sortTargetsByPriority(bot, candidateEnemies);
        const lowestCard = this._pickLowestValueCard(bot);
        if (sortedEnemies.length > 0 && lowestCard) {
          return {
            type: 'ACTION_REACT',
            targetId: sortedEnemies[0].id,
            cardId: lowestCard.id
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_DUONG_QUAN_1': {
        // Dương Đình Nghệ bỏ qua Phán xét & Rút bài để Chém không giới hạn cự ly
        const enemies = this._sortTargetsByPriority(bot, state.getAlivePlayers().filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p) && !(hasSkill(p, 'dam_bac') && (!p.hand || p.hand.length === 0))));
        if (enemies.length > 0 && bot.hp > 1) {
          return {
            type: 'ACTION_REACT',
            doUse: true,
            targetId: enemies[0].id,
            canceled: false
          };
        }
        return { type: 'ACTION_REACT', doUse: false, canceled: true };
      }

      case 'ASK_DUONG_QUAN_2': {
        // Dương Đình Nghệ bỏ trang bị để Chém kết thúc pha ra bài
        const enemies = this._sortTargetsByPriority(bot, state.getAlivePlayers().filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p) && !(hasSkill(p, 'dam_bac') && (!p.hand || p.hand.length === 0))));
        const equipCard = (bot.hand && bot.hand.find(c => c.type === 'equip' || ['weapon', 'armor', 'horse_attack', 'horse_defense'].includes(c.type))) ||
          Object.values(bot.equipment || {}).find(Boolean);
        if (enemies.length > 0 && equipCard) {
          return {
            type: 'ACTION_REACT',
            targetId: enemies[0].id,
            cardId: equipCard.id,
            canceled: false
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_DUONG_QUAN_3': {
        // Dương Đình Nghệ úp mặt bỏ qua bỏ bài để Chém không giới hạn cự ly
        const enemies = this._sortTargetsByPriority(bot, state.getAlivePlayers().filter(p => p.id !== bot.id && !this._isKnownAlly(bot, p)));
        const excess = (bot.hand?.length || 0) - bot.hp;
        if (enemies.length > 0 && (excess >= 2 || enemies[0].hp <= 1)) {
          return {
            type: 'ACTION_REACT',
            doUse: true,
            targetId: enemies[0].id,
            canceled: false
          };
        }
        return { type: 'ACTION_REACT', doUse: false, canceled: true };
      }

      case 'ASK_PHA_THANH': {
        // Đô Đốc Bảo / Đinh Điền phán xét nhận bài và xác định màu Quyết Đấu
        return {
          type: 'ACTION_REACT',
          doJudge: true,
          canceled: false
        };
      }

      case 'ASK_DUYEN_THO': {
        // Hồ Xuân Hương hồi máu cho bản thân và tướng nam
        const maleTarget = state.getAlivePlayers().find(p => getPlayerGender(p) === 'male' && p.hp < p.maxHp && (p.id === bot.id || this._isKnownAlly(bot, p))) ||
          state.getAlivePlayers().find(p => getPlayerGender(p) === 'male');
        if (maleTarget && (bot.hand?.length || 0) >= 2) {
          return {
            type: 'ACTION_REACT',
            targetId: maleTarget.id,
            cardIds: [bot.hand[0].id, bot.hand[1].id],
            canceled: false
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_DIEU_DUOC': {
        // Tuệ Tĩnh hồi máu khi mở frame ASK_DIEU_DUOC
        const wounded = state.getAlivePlayers()
          .filter(p => p.hp < p.maxHp && (p.id === bot.id || this._isKnownAlly(bot, p)))
          .sort((a, b) => a.hp - b.hp);
        const lowestCard = this._pickLowestValueCard(bot);
        if (wounded.length > 0 && lowestCard) {
          return {
            type: 'ACTION_REACT',
            targetId: wounded[0].id,
            cardId: lowestCard.id,
            canceled: false
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_HOA_THAN': {
        // Huyền Trân Công Chúa ép 2 tướng nam Quyết Đấu
        const maleEnemies = this._sortTargetsByPriority(
          bot,
          state.getAlivePlayers().filter(p => p.id !== bot.id && getPlayerGender(p) === 'male' && !this._isKnownAlly(bot, p))
        );
        const lowestCard = this._pickLowestValueCard(bot);
        if (maleEnemies.length >= 2 && lowestCard) {
          return {
            type: 'ACTION_REACT',
            targetA: maleEnemies[0].id,
            targetB: maleEnemies[1].id,
            cardId: lowestCard.id,
            canceled: false
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_BINH_LOAN': {
        // Nguyễn Bặc bỏ 2 lá cùng chất phát động Loạn Tiễn
        const suits = {};
        for (const c of (bot.hand || [])) {
          suits[c.suit] = suits[c.suit] || [];
          suits[c.suit].push(c);
        }
        for (const s in suits) {
          if (suits[s].length >= 2) {
            return {
              type: 'ACTION_REACT',
              cardIds: [suits[s][0].id, suits[s][1].id],
              canceled: false
            };
          }
        }
        return { type: 'ACTION_REACT', canceled: true };
      }

      case 'ASK_TIEN_PHONG': {
        // Nguyễn Lữ chọn hy sinh vũ khí (trang bị hoặc trên tay) hoặc 1 HP
        const handWeapon = (bot.hand || []).find(c => c && (c.type === 'weapon' || c.subtype === 'equip_weapon' || c.subType === 'equip_weapon'));
        const hasWeapon = Boolean(bot.equipment?.weapon || handWeapon);
        const costType = hasWeapon ? 'weapon' : 'hp';
        const cardId = bot.equipment?.weapon ? bot.equipment.weapon.id : (handWeapon ? handWeapon.id : undefined);
        return {
          type: 'ACTION_REACT',
          costType,
          cardId,
          targetId: frame.context?.targetId,
          canceled: false
        };
      }

      case 'ASK_TRUNG_DUNG': {
        // Lê Ngân úp bài tuyên bố bài ảo
        const lowestCard = this._pickLowestValueCard(bot);
        if (lowestCard) {
          const virtualName = bot.hp < bot.maxHp ? 'Đào' : 'Chém';
          return {
            type: 'ACTION_REACT',
            virtualCardName: virtualName,
            cardId: lowestCard.id,
            targetId: bot.id,
            canceled: false
          };
        }
        return { type: 'ACTION_REACT', canceled: true };
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

      case 'ASK_SLASH_DUEL':
      case 'ASK_SLASH_RESPONSE': {
        const hasDoiNui = globalHeroRegistry.hasSkill(bot, 'doi_nui', true);
        const hasKhaiThien = globalHeroRegistry.hasSkill(bot, 'khai_thien', true);
        const isRed = c => {
          if (!c) return false;
          const col = globalHeroRegistry.getEffectiveColor(bot, c);
          return col ? col === 'red' : Boolean(c.color === 'red' || c.suit === 'heart' || c.suit === 'diamond' || c.suit === '♥' || c.suit === '♦');
        };
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

        if (!bot.temporaryFlags?.vanDonLose && slashCard && (!targetB || !this._isKnownAlly(bot, targetB))) {
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

      case 'ASK_WEAPON_SKILL': {
        const weapon = frame.context?.weapon || frame.context?.weaponName;
        if (weapon === 'Rìu Đá' || weapon === 'Quán Thạch Phủ' || isEquip(weapon, 'riu_da')) {
          const target = state.getPlayer(frame.targetId);
          const isEnemy = target && !this._isKnownAlly(bot, target);
          const availableCards = [...(bot.hand || [])];
          const nonPeachCards = availableCards.filter(c => c.name !== 'Đào' && c.type !== 'peach');
          if (isEnemy && (target.hp <= (frame.context?.damageAmount || 1) || nonPeachCards.length >= 3)) {
            const getPriority = (card) => {
              if (card.name === 'Đào' || card.type === 'peach') return 100;
              if (card.name === 'Né' || card.type === 'dodge') return 80;
              if (card.name === 'Chém' || card.type === 'slash') return 60;
              return 20;
            };
            const sorted = [...nonPeachCards].sort((a, b) => getPriority(a) - getPriority(b));
            if (sorted.length >= 2) {
              return {
                type: 'ACTION_REACT',
                doUse: true,
                cardIds: [sorted[0].id, sorted[1].id]
              };
            }
          }
          return {
            type: 'ACTION_REACT',
            doUse: false,
            canceled: true
          };
        }

        if (weapon === 'Thanh Long Đao' || isEquip(weapon, 'thanh_long_dao')) {
          const target = state.getPlayer(frame.targetId);
          const isEnemy = target && !this._isKnownAlly(bot, target);
          const extraSlash = bot.hand?.find(c => c.type === 'slash' || c.name === 'Chém');
          if (isEnemy && extraSlash) {
            return {
              type: 'ACTION_REACT',
              doUse: true,
              cardId: extraSlash.id
            };
          }
          return {
            type: 'ACTION_REACT',
            doUse: false,
            canceled: true
          };
        }

        if (weapon === 'Song Kiếm' || isEquip(weapon, 'song_kiem')) {
          const nonPeachCards = (bot.hand || []).filter(c => c.name !== 'Đào' && c.type !== 'peach');
          if (nonPeachCards.length > 0) {
            return {
              type: 'ACTION_REACT',
              doUse: true,
              cardIds: [nonPeachCards[0].id]
            };
          }
          return {
            type: 'ACTION_REACT',
            doUse: false,
            canceled: true
          };
        }

        return {
          type: 'ACTION_REACT',
          doUse: false,
          canceled: true
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

