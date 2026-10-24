// @ts-check
/**
 * TargetResolverV4.js
 * Hệ thống giải quyết mục tiêu (Target Resolver) cho Việt Sát Engine v4.
 * Tương thích với GameViewModel & UI, tích hợp RangeSystem & HeroRegistry v4.
 */

import { RangeSystem } from './RangeSystem.js';
import { globalHeroRegistry } from '../heroes/HeroRegistry.js';

export function mapVietnameseToSlug(name) {
  if (!name) return name;
  const map = {
    'Chém': 'chem', 'Né': 'ne', 'Đào': 'dao', 'Rượu': 'ruou',
    'Dã Man': 'da-man', 'Loạn Tiễn': 'loan-tien', 'Hồi Xuân': 'hoi-xuan',
    'Tước Bài': 'tuoc-bai', 'Cướp Bài': 'cuop-bai', 'Quyết Đấu': 'quyet-dau',
    'Mượn Đao': 'muon-dao', 'Vô Trung Sinh Hữu': 'vo-trung', 'Hỏa Công': 'hoa-cong',
    'Xiềng Xích': 'xieng-xich', 'Sấm Sét': 'sam-set', 'Binh Lương Thốn Đoạn': 'binh-luong',
    'Hỗn Loạn': 'hon-loan', 'Hóa Giải': 'hoa-giai',
    // ID Keys / Types
    'slash': 'chem', 'dodge': 'ne', 'peach': 'dao', 'wine': 'ruou',
    'da_man': 'da-man', 'loan_tien': 'loan-tien', 'hoi_xuan': 'hoi-xuan',
    'tuoc_bai': 'tuoc-bai', 'cuop_bai': 'cuop-bai', 'quyet_dau': 'quyet-dau',
    'muon_dao': 'muon-dao', 'vo_trung': 'vo-trung', 'hoa_cong': 'hoa-cong',
    'xieng_xich': 'xieng-xich', 'sam_set': 'sam-set', 'binh_luong': 'binh-luong',
    'hon_loan': 'hon-loan', 'hoa_giai': 'hoa-giai',
    // Equips
    'Liên Nỏ': 'lien-no', 'Thanh Long Đao': 'thanh-long-dao', 'Rìu Đá': 'riu-da',
    'Bát Quái': 'bat-quai', 'Hắc Thuẫn': 'hac-thuan', 'Bạch Ngân': 'bach-ngan',
    'Ngựa Chiến (-1)': 'ngua-chien', 'Ngựa Thần (+1)': 'ngua-than',
    'Phương Thiên Kích': 'phuong-thien-kich', 'Song Kiếm': 'song-kiem', 'Quạt Sắt': 'quat-sat'
  };
  const str = typeof name === 'object' && name !== null ? (name.name || name.idKey || name.id || '') : String(name || '');
  return map[str] || str.replace(/-[0-9]+-[0-9]+$/, '').replace(/_[0-9]+$/, '');
}

/**
 * Lấy định nghĩa cơ chế chọn mục tiêu (Targeting Definition) của một lá bài
 */
export function getTargetingDefinition(state, playerId, cardNameOrId, physicalCard = null) {
  // 1. Trang bị -> Luôn là self (tự trang bị)
  if (physicalCard && (physicalCard.type === 'equip' || physicalCard.type === 'EQUIP')) {
    return { type: 'self' };
  }

  // 2. Tra cứu card name / slug
  const isVirtual = Boolean(cardNameOrId && physicalCard && cardNameOrId !== physicalCard.id && cardNameOrId !== physicalCard.name);
  let actualCardName = cardNameOrId;
  if (physicalCard && cardNameOrId === physicalCard.id) {
    actualCardName = physicalCard.name;
  } else if (!actualCardName && physicalCard) {
    actualCardName = physicalCard.name;
  }

  let slug = mapVietnameseToSlug(actualCardName);
  const player = state ? (state.getPlayer ? state.getPlayer(playerId) : (state.players || []).find(p => p.id === playerId)) : null;

  const isRed = physicalCard && (physicalCard.color === 'red' || physicalCard.suit === 'heart' || physicalCard.suit === 'diamond' || physicalCard.suit === '♥' || physicalCard.suit === '♦');
  const isBlack = physicalCard && (physicalCard.color === 'black' || physicalCard.suit === 'spade' || physicalCard.suit === 'club' || physicalCard.suit === '♠' || physicalCard.suit === '♣');

  // Sơn Tinh Dời Núi: Có thể dùng [Né] làm [Chém]
  if (slug === 'ne' && player && globalHeroRegistry.hasSkill(player, 'doi_nui', true)) {
    slug = 'chem';
  }
  // Thần Trụ Trời Khai Thiên: Mọi lá bài Đỏ đều dùng như [Chém] (chỉ chuyển slug khi là Né hoặc được chỉ định làm Chém)
  if (player && globalHeroRegistry.hasSkill(player, 'khai_thien', true) && isRed) {
    if (slug === 'ne' || actualCardName === 'Chém' || cardNameOrId === 'Chém') {
      slug = 'chem';
    }
  }
  // Rùa Vàng Thần Hỏa: Dùng bài Đỏ làm [Hỏa Công]
  if (player && globalHeroRegistry.hasSkill(player, 'than_hoa', true) && isRed && (cardNameOrId === 'Hỏa Công' || actualCardName === 'Hỏa Công')) {
    slug = 'hoa-cong';
  }
  // Rùa Vàng Linh Giám: Dùng bài Đen làm [Hóa Giải]
  if (player && globalHeroRegistry.hasSkill(player, 'linh_giam', true) && isBlack && (cardNameOrId === 'Hóa Giải' || actualCardName === 'Hóa Giải')) {
    slug = 'hoa-giai';
  }
  // Chử Đồng Tử Tiên Duyên: Dùng bài ♣ làm [Xiềng Xích]
  const isClub = physicalCard && (physicalCard.suit === 'club' || physicalCard.suit === '♣');
  if (player && globalHeroRegistry.hasSkill(player, 'tien_duyen_chu_dong_tu', true) && isClub && (cardNameOrId === 'Xiềng Xích' || actualCardName === 'Xiềng Xích')) {
    slug = 'xieng-xich';
  }
  // Dã Tượng Kỳ Tập: Dùng bài Đen làm [Tước Bài]
  if (player && globalHeroRegistry.hasSkill(player, 'ky_tap', true) && isBlack && (cardNameOrId === 'Tước Bài' || actualCardName === 'Tước Bài' || actualCardName === 'tuoc_bai' || cardNameOrId === 'tuoc_bai')) {
    slug = 'tuoc-bai';
  }
  // Công chúa An Tư Hòa Thân: Dùng bài ♦ làm [Hỗn Loạn]
  const isDiamond = physicalCard && (physicalCard.suit === 'diamond' || physicalCard.suit === '♦');
  if (player && (globalHeroRegistry.hasSkill(player, 'hoa_than_an_tu', true) || globalHeroRegistry.hasSkill(player, 'hoa-than-an-tu', true)) && isDiamond && (cardNameOrId === 'Hỗn Loạn' || actualCardName === 'Hỗn Loạn' || actualCardName === 'hon_loan' || cardNameOrId === 'hon_loan')) {
    slug = 'hon-loan';
  }

  switch (slug) {
    case 'chem': {
      // Kiểm tra Vân Đồn (Trần Khánh Dư)
      if (player?.temporaryFlags?.vanDonWin) {
        return {
          type: 'multiple',
          min: 1,
          max: 2,
          filter: (s, p) => {
            const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
            return RangeSystem.getValidSlashTargets(p, alive, physicalCard);
          }
        };
      }

      // Kiểm tra Phương Thiên Kích khi là lá bài cuối cùng trên tay
      const isLastHandCard = player && player.hand && player.hand.length === 1 && (!physicalCard || player.hand[0].id === physicalCard.id);
      const hasPhuongThienKich = player?.equipment?.weapon?.name === 'Phương Thiên Kích' || player?.equipment?.weapon?.idKey === 'phuong_thien_kich';
      if (hasPhuongThienKich && isLastHandCard) {
        return {
          type: 'multiple',
          min: 1,
          max: 3,
          filter: (s, p) => {
            const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
            return RangeSystem.getValidSlashTargets(p, alive, physicalCard);
          }
        };
      }

      return {
        type: 'single',
        filter: (s, p) => {
          const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
          return RangeSystem.getValidSlashTargets(p, alive, physicalCard);
        }
      };
    }

    case 'dao':
    case 'ruou':
    case 'vo-trung':
    case 'sam-set':
      return { type: 'self' };

    case 'da-man':
    case 'loan-tien':
    case 'hoi-xuan':
      return { type: 'aoe' };

    case 'ne':
    case 'hoa-giai':
      return { type: 'none' };

    case 'quyet-dau':
      return {
        type: 'single',
        filter: (s, p) => {
          const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
          return alive.filter(x => {
            if (x.id === p.id) return false;
            // Đạm Bạc (Lang Liêu) khi hết bài trên tay
            if (globalHeroRegistry.hasSkill(x, 'dam_bac', true) && (!x.hand || x.hand.length === 0)) return false;
            return true;
          });
        }
      };

    case 'tuoc-bai':
      return {
        type: 'single',
        filter: (s, p) => {
          const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
          return alive.filter(x => {
            if (x.id === p.id) return false;
            const hasHand = x.hand && x.hand.length > 0;
            const hasEquip = x.equipment && (Array.isArray(x.equipment) ? x.equipment.length > 0 : Object.values(x.equipment).some(Boolean));
            const hasJudge = x.judgementArea && x.judgementArea.length > 0;
            return hasHand || hasEquip || hasJudge;
          });
        }
      };

    case 'cuop-bai':
      return {
        type: 'single',
        filter: (s, p) => {
          const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
          const hasInfiniteTrickRange = globalHeroRegistry.hasSkill(p, 'tien_duyen_khoang_cach', true);
          return alive.filter(x => {
            if (x.id === p.id) return false;
            // Nghệ An Kế (Nguyễn Chích): Miễn nhiễm Cướp Bài
            if (globalHeroRegistry.hasSkill(x, 'nghe_an_ke') || x.skills?.includes('nghe_an_ke')) return false;
            const dist = RangeSystem.calculateDistance(p, x, alive);
            if (!hasInfiniteTrickRange && dist > 1) return false;
            const hasHand = x.hand && x.hand.length > 0;
            const hasEquip = x.equipment && (Array.isArray(x.equipment) ? x.equipment.length > 0 : Object.values(x.equipment).some(Boolean));
            const hasJudge = x.judgementArea && x.judgementArea.length > 0;
            return hasHand || hasEquip || hasJudge;
          });
        }
      };

    case 'hoa-cong':
      return {
        type: 'single',
        filter: (s, p) => {
          const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
          return alive.filter(x => x.hand && x.hand.length > 0);
        }
      };

    case 'xieng-xich':
      return {
        type: 'multiple',
        min: 0,
        max: 2,
        optional: true,
        filter: (s, p) => {
          return s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
        }
      };

    case 'binh-luong':
      return {
        type: 'single',
        filter: (s, p) => {
          const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
          const hasInfiniteTrickRange = globalHeroRegistry.hasSkill(p, 'tien_duyen_khoang_cach', true);
          return alive.filter(x => {
            if (x.id === p.id) return false;
            const dist = RangeSystem.calculateDistance(p, x, alive);
            if (!hasInfiniteTrickRange && dist > 1) return false;
            const alreadyHas = x.judgementArea && x.judgementArea.some(c => c.name === 'Binh Lương Thốn Đoạn' || c.idKey === 'binh_luong' || c.idKey === 'binh-luong');
            return !alreadyHas;
          });
        }
      };

    case 'hon-loan':
      return {
        type: 'single',
        filter: (s, p) => {
          const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
          return alive.filter(x => {
            if (x.id === p.id) return false;
            // Nghệ An Kế (Nguyễn Chích): Miễn nhiễm Hỗn Loạn
            if (globalHeroRegistry.hasSkill(x, 'nghe_an_ke') || x.skills?.includes('nghe_an_ke')) return false;
            const alreadyHas = x.judgementArea && x.judgementArea.some(c => c.name === 'Hỗn Loạn' || c.idKey === 'hon_loan' || c.idKey === 'hon-loan');
            return !alreadyHas;
          });
        }
      };

    case 'muon-dao':
      return {
        type: 'sequence',
        steps: [
          {
            message: 'Chọn người chơi đang có Vũ khí để Mượn Đao',
            filter: (s, p) => {
              const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
              return alive.filter(x => {
                if (x.id === p.id) return false;
                if (Array.isArray(x.equipment)) {
                  return x.equipment.some(e => e.type === 'weapon');
                }
                return Boolean(x.equipment?.weapon);
              });
            }
          },
          {
            message: 'Chọn mục tiêu trong tầm đánh của người mang vũ khí',
            filter: (s, p, currentSelected) => {
              const alive = s.getAlivePlayers ? s.getAlivePlayers() : (s.players || []).filter(x => x.isAlive);
              const firstTargetId = currentSelected[0];
              const firstTarget = alive.find(x => x.id === firstTargetId);
              if (!firstTarget) return [];
              return RangeSystem.getValidSlashTargets(firstTarget, alive).filter(x => x.id !== firstTarget.id);
            }
          }
        ]
      };

    default:
      return { type: 'none' };
  }
}

/**
 * Lấy danh sách ID mục tiêu hợp lệ cho bước hiện tại
 */
export function getAvailableTargets(state, playerId, cardNameOrId, physicalCardId = null, currentSelectedTargets = []) {
  if (!state) return [];
  const player = state.getPlayer ? state.getPlayer(playerId) : (state.players || []).find(p => p.id === playerId);
  if (!player || !player.isAlive) return [];

  let physicalCard = null;
  const searchId = physicalCardId || cardNameOrId;
  if (searchId && player.hand) {
    physicalCard = player.hand.find(c => c.id === searchId);
  }

  const targeting = getTargetingDefinition(state, playerId, cardNameOrId, physicalCard);

  if (targeting.type === 'none' || targeting.type === 'aoe' || targeting.type === 'self') {
    return [];
  }

  if (targeting.type === 'single' || targeting.type === 'multiple') {
    if (targeting.filter) {
      return targeting.filter(state, player, currentSelectedTargets).map(p => p.id);
    }
  }

  if (targeting.type === 'sequence') {
    const stepIndex = currentSelectedTargets.length;
    if (stepIndex >= targeting.steps.length) return [];
    const step = targeting.steps[stepIndex];
    if (step.filter) {
      return step.filter(state, player, currentSelectedTargets).map(p => p.id);
    }
  }

  return [];
}

/**
 * Xác thực payload targets
 */
export function validateTargetPayload(state, playerId, cardNameOrId, physicalCardId = null, payloadTargets = []) {
  const player = state.getPlayer ? state.getPlayer(playerId) : (state.players || []).find(p => p.id === playerId);
  if (!player || !player.isAlive) return { valid: false, reason: 'Người chơi không hợp lệ hoặc đã chết' };

  let physicalCard = null;
  const searchId = physicalCardId || cardNameOrId;
  if (searchId && player.hand) {
    physicalCard = player.hand.find(c => c.id === searchId);
  }

  const targeting = getTargetingDefinition(state, playerId, cardNameOrId, physicalCard);

  if (targeting.type === 'none' || targeting.type === 'aoe') {
    return { valid: true, requiresAutoCast: false };
  }

  if (targeting.type === 'self') {
    return { valid: true, requiresAutoCast: true, autoTarget: playerId };
  }

  if (targeting.type === 'single') {
    if (payloadTargets.length !== 1) return { valid: false, reason: 'Cần chọn đúng 1 mục tiêu' };
    const allowed = getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, []);
    if (!allowed.includes(payloadTargets[0])) {
      return { valid: false, reason: 'Mục tiêu được chọn không hợp lệ' };
    }
    return { valid: true };
  }

  if (targeting.type === 'multiple') {
    const min = targeting.min ?? 1;
    const max = targeting.max ?? 2;
    if (payloadTargets.length < min || payloadTargets.length > max) {
      return { valid: false, reason: `Số lượng mục tiêu phải từ ${min} đến ${max}` };
    }
    const allowed = getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, []);
    const allValid = payloadTargets.every(id => allowed.includes(id));
    if (!allValid) return { valid: false, reason: 'Có mục tiêu không hợp lệ' };
    return { valid: true };
  }

  if (targeting.type === 'sequence') {
    if (payloadTargets.length !== targeting.steps.length) {
      return { valid: false, reason: `Cần chọn đủ ${targeting.steps.length} mục tiêu` };
    }
    const simSelected = [];
    for (let i = 0; i < targeting.steps.length; i++) {
      const allowed = getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, simSelected);
      const targetId = payloadTargets[i];
      if (!allowed.includes(targetId)) {
        return { valid: false, reason: `Mục tiêu bước ${i + 1} không hợp lệ` };
      }
      simSelected.push(targetId);
    }
    return { valid: true };
  }

  return { valid: false, reason: 'Không rõ cấu hình targeting' };
}

/**
 * Kiểm tra xem người chơi có thể chơi lá bài này không
 */
export function canPlayCard(state, playerId, cardNameOrId, physicalCardId = null) {
  const player = state.getPlayer ? state.getPlayer(playerId) : (state.players || []).find(p => p.id === playerId);
  if (!player || !player.isAlive) return { valid: false, reason: 'Người chơi không hợp lệ hoặc đã chết' };

  let physicalCard = null;
  const searchId = physicalCardId || cardNameOrId;
  if (searchId && player.hand) {
    physicalCard = player.hand.find(c => c.id === searchId);
  }

  if (physicalCard && (physicalCard.type === 'equip' || physicalCard.type === 'EQUIP')) {
    return { valid: true };
  }

  const isVirtual = cardNameOrId && physicalCardId && cardNameOrId !== physicalCardId;
  const actualCardName = isVirtual ? cardNameOrId : (physicalCard ? physicalCard.name : cardNameOrId);
  let slug = mapVietnameseToSlug(actualCardName);

  const isRedCard = physicalCard && (physicalCard.color === 'red' || physicalCard.suit === 'heart' || physicalCard.suit === 'diamond' || physicalCard.suit === '♥' || physicalCard.suit === '♦');
  const hasDoiNui = player && globalHeroRegistry.hasSkill(player, 'doi_nui', true);
  const hasKhaiThien = player && globalHeroRegistry.hasSkill(player, 'khai_thien', true) && isRedCard;

  if (slug === 'ne') {
    if (hasDoiNui || hasKhaiThien) {
      slug = 'chem';
    } else {
      return { valid: false, reason: 'Chỉ có thể dùng để phản ứng khi được yêu cầu' };
    }
  }

  // Khai Thiên cho phép dùng bài ảo là Chém
  if (hasKhaiThien && isVirtual && actualCardName === 'Chém') {
    slug = 'chem';
  }

  if (slug === 'hoa-giai') {
    return { valid: false, reason: 'Chỉ có thể dùng để phản ứng khi được yêu cầu' };
  }

  if (slug === 'dao') {
    if (player.hp >= player.maxHp) {
      if (hasKhaiThien) {
        slug = 'chem';
      } else {
        return { valid: false, reason: 'Máu đã đầy, không thể dùng Đào' };
      }
    } else {
      return { valid: true };
    }
  }

  if (slug === 'ruou') {
    if ((player.turnStats?.wineCount || player.wineCount || 0) >= 1) {
      if (hasKhaiThien) {
        slug = 'chem';
      } else {
        return { valid: false, reason: 'Mỗi lượt chỉ được uống Rượu 1 lần trong giai đoạn Hành động' };
      }
    } else {
      return { valid: true };
    }
  }

  if (slug === 'chem') {
    if (player.temporaryFlags?.vanDonLose) {
      return { valid: false, reason: 'Thất bại đấu điểm Vân Đồn, bị cấm Chém lượt này' };
    }
    const hasUnlimitedSlash = player.temporaryFlags?.unlimitedSlash ||
      player.equipment?.weapon?.name === 'Liên Nỏ' ||
      player.equipment?.weapon?.idKey === 'lien_no';
    const hasVanDonExtraSlash = player.temporaryFlags?.vanDonWin && (player.turnStats?.slashCount || player.slashCount || 0) < 2;
    const currentSlashCount = player.turnStats?.slashCount || player.slashCount || player.slashesPlayed || 0;
    if (!hasUnlimitedSlash && !hasVanDonExtraSlash && currentSlashCount >= 1) {
      return { valid: false, reason: 'Bạn đã dùng Chém trong lượt này rồi' };
    }
    const targets = getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, []);
    if (targets.length === 0) {
      return { valid: false, reason: 'Không có mục tiêu nào trong tầm đánh' };
    }
    return { valid: true };
  }

  // Cẩm nang cần mục tiêu
  if (['cuop-bai', 'tuoc-bai', 'muon-dao', 'binh-luong', 'hon-loan', 'quyet-dau', 'hoa-cong'].includes(slug)) {
    const targets = getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, []);
    if (targets.length === 0) {
      return { valid: false, reason: 'Không có mục tiêu hợp lệ để sử dụng lá bài này' };
    }
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Kiểm tra kỹ năng có dùng được không (tương thích UI)
 */
export function canUseSkill(state, playerId, skillIdentifier) {
  const player = state.getPlayer ? state.getPlayer(playerId) : (state.players || []).find(p => p.id === playerId);
  if (!player || !player.isAlive) return { valid: false, reason: 'Người chơi không hợp lệ' };
  if (player.isSilenced) return { valid: false, reason: 'Bạn đang bị khóa kỹ năng' };
  return { valid: true };
}

/**
 * Lấy danh sách mục tiêu hợp lệ của lá bài (tương thích CardRules cũ)
 */
export function getValidCardTargets(state, playerId, cardNameOrId, physicalCardId = null) {
  return getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, []);
}

/**
 * Tương thích RangeSystem canAttack
 */
export function canAttack(state, sourceId, targetId, card = null) {
  return RangeSystem.canAttack(state, sourceId, targetId, card);
}
