/**
 * RangeSystem.js
 * Hệ thống tính toán Khoảng cách (Distance) và Tầm đánh (Attack Range) trong Việt Sát v4.
 * Tuân thủ tuyệt đối quy tắc hình học vòng tròn chuẩn Tam Quốc Sát.
 */

import { globalHeroRegistry, getPlayerGender } from '../heroes/HeroRegistry.js';
import { normalizeEquipKey } from '../../utils/translationHelper.js';

export const WEAPON_RANGE_MAP = {
  // Liên Nỏ (1)
  'lien_no': 1, 'lien-no': 1, 'liên-nỏ': 1, 'Liên Nỏ': 1, 'crossbow': 1,
  // Song Kiếm (2)
  'song_kiem': 2, 'song-kiem': 2, 'song-kiếm': 2, 'Song Kiếm': 2, 'twin_swords': 2,
  // Quạt Sắt / Cổ Đĩnh Đao (2)
  'quat_sat': 2, 'quat-sat': 2, 'quạt-sắt': 2, 'Quạt Sắt': 2, 'co_dinh_dao': 2, 'co-dinh-dao': 2, 'cổ-đĩnh-đao': 2, 'Cổ Đĩnh Đao': 2, 'iron_fan': 2,
  // Thanh Long Đao (3)
  'thanh_long_dao': 3, 'thanh-long-dao': 3, 'thanh-long-đao': 3, 'Thanh Long Đao': 3, 'thanh_long': 3, 'dragon_blade': 3,
  // Rìu Đá / Quán Thạch Phủ (3)
  'riu_da': 3, 'riu-da': 3, 'rìu-đá': 3, 'Rìu Đá': 3, 'quan_thach_phu': 3, 'quan-thach-phu': 3, 'quán-thạch-phủ': 3, 'Quán Thạch Phủ': 3, 'rock_axe': 3,
  // Phương Thiên Kích (4)
  'phuong_thien_kich': 4, 'phuong-thien-kich': 4, 'phương-thiên-kích': 4, 'Phương Thiên Kích': 4, 'phuong_thien': 4, 'sky_halberd': 4,
  // Kỳ Lân Cung (5)
  'ky_lan_cung': 5, 'ky-lan-cung': 5, 'kỳ-lân-cung': 5, 'Kỳ Lân Cung': 5, 'ky_lan': 5, 'kirin_bow': 5
};

export class RangeSystem {
  /**
   * Tính khoảng cách từ người chơi Source đến người chơi Target
   * @param {Object} source Người chơi thực hiện hành động
   * @param {Object} target Người chơi mục tiêu
   * @param {Array} alivePlayers Danh sách người chơi còn sống theo thứ tự ngồi quanh bàn
   * @returns {number} Khoảng cách thực tế (tối thiểu = 1)
   */
  static calculateDistance(source, target, alivePlayers) {
    if (!source || !target || source.id === target.id) return 0;

    if (!Array.isArray(alivePlayers) || alivePlayers.length === 0) return 999;

    const sourceIdx = alivePlayers.findIndex(p => p.id === source.id);
    const targetIdx = alivePlayers.findIndex(p => p.id === target.id);

    if (sourceIdx === -1 || targetIdx === -1) {
      // Người chơi đã chết / không còn trong danh sách còn sống -> cự ly vô hạn (không thể với tới)
      return 999;
    }

    const total = alivePlayers.length;
    const diff = Math.abs(sourceIdx - targetIdx);
    const rawCircleDist = Math.min(diff, total - diff);

    // 1. Điều chỉnh từ Ngựa / Trang bị
    let attackModifier = 0; // Trừ khoảng cách khi tấn công người khác (-1)
    let defenseModifier = 0; // Tăng khoảng cách khi người khác tấn công mình (+1)

    // Ngựa tấn công (-1) của Source
    if (source.equipment?.horse_attack) {
      attackModifier += 1;
    }

    // Ngựa phòng thủ (+1) của Target
    if (target.equipment?.horse_defense) {
      defenseModifier += 1;
    }

    // 2. Kỹ năng Tướng can thiệp khoảng cách (chỉ có tác dụng khi tướng đã lật mặt)
    // - Thánh Gióng: Thiết Mã (khoảng cách từ Gióng đến người khác luôn -1)
    if (globalHeroRegistry.hasSkill(source, 'thiet_ma', true)) {
      attackModifier += 1;
    }

    // - Sơn Tinh: Dời Núi (khoảng cách từ người khác đến Sơn Tinh luôn +1)
    if (globalHeroRegistry.hasSkill(target, 'doi_nui', true)) {
      defenseModifier += 1;
    }

    // - Tiên Dung: Tiên Duyên cự ly (khoảng cách từ người khác giới tính đến Tiên Dung luôn +1)
    if (globalHeroRegistry.hasSkill(target, 'tien_duyen_khoang_cach', true)) {
      const sGender = getPlayerGender(source);
      const tGender = getPlayerGender(target);
      if (sGender !== 'none' && tGender !== 'none' && sGender !== tGender) {
        defenseModifier += 1;
      }
    }

    const effectiveDistance = rawCircleDist - attackModifier + defenseModifier;

    // Khoảng cách tối thiểu giữa 2 người khác nhau luôn là 1
    return Math.max(1, effectiveDistance);
  }

  /**
   * Tính khoảng cách trực tiếp giữa 2 người chơi từ GameState
   */
  static getDistance(state, sourceId, targetId) {
    const alive = state.getAlivePlayers ? state.getAlivePlayers() : (state.players || []).filter(p => p.isAlive);
    const source = state.getPlayer ? state.getPlayer(sourceId) : (state.players || []).find(p => p.id === sourceId);
    const target = state.getPlayer ? state.getPlayer(targetId) : (state.players || []).find(p => p.id === targetId);
    return this.calculateDistance(source, target, alive);
  }

  /**
   * Lấy tầm đánh (Attack Range) hiện tại của người chơi
   * @param {Object} player Người chơi
   * @param {Object} card Lá bài sử dụng (để hỗ trợ kỹ năng như Cao Lỗ)
   * @returns {number} Tầm đánh
   */
  static getAttackRange(player, card = null) {
    if (!player) return 1;

    // Kỹ năng đặc biệt: Cao Lỗ (Nỏ Thần) - Tầm đánh của Chém bằng đúng điểm số (rank) lá bài
    const hasNoThan = globalHeroRegistry.hasSkill(player, 'no_than_cao_lo', false) || (player.skills && player.skills.includes('no_than_cao_lo'));
    const isSlash = card && (card.type === 'slash' || card.name === 'Chém' || card.idKey === 'chem' || card.idKey === 'slash');
    if (hasNoThan && isSlash) {
      const rankNum = typeof card.rank === 'number' ? card.rank : parseInt(card.rank, 10);
      if (!isNaN(rankNum) && rankNum > 0) {
        return rankNum;
      }
    }

    // Vũ khí trang bị
    const weapon = player.equipment?.weapon;
    if (weapon) {
      if (typeof weapon.range === 'number') {
        return weapon.range;
      }
      const canonicalKey = normalizeEquipKey(weapon);
      if (WEAPON_RANGE_MAP[canonicalKey]) {
        return WEAPON_RANGE_MAP[canonicalKey];
      }
      const rawName = weapon.idKey || weapon.name || weapon.key || weapon.id || '';
      if (WEAPON_RANGE_MAP[rawName]) {
        return WEAPON_RANGE_MAP[rawName];
      }
      const cleanSlug = String(rawName).toLowerCase().replace(/[-_][0-9]+.*$/, '');
      if (WEAPON_RANGE_MAP[cleanSlug]) {
        return WEAPON_RANGE_MAP[cleanSlug];
      }
      for (const [key, r] of Object.entries(WEAPON_RANGE_MAP)) {
        if (typeof rawName === 'string' && rawName.toLowerCase().includes(key.toLowerCase())) {
          return r;
        }
      }
    }

    // Mặc định tay không tầm đánh = 1
    return 1;
  }

  /**
   * Kiểm tra mục tiêu có nằm trong tầm đánh để dùng [Chém] hay không
   */
  static inSlashRange(source, target, alivePlayers, card = null) {
    if (source.id === target.id) return false;

    // Kỹ năng phá cự ly (VD: Dương Đình Nghệ - Dưỡng Quân, Trần Khánh Dư - Vân Đồn)
    if (source.temporaryFlags?.unlimitedSlashRange || source.temporaryFlags?.vanDonWin) {
      return true;
    }

    const distance = this.calculateDistance(source, target, alivePlayers);
    const range = this.getAttackRange(source, card);

    return distance <= range;
  }

  /**
   * Lọc danh sách tất cả mục tiêu hợp lệ trong tầm đánh [Chém]
   */
  static getValidSlashTargets(source, alivePlayers, card = null) {
    return alivePlayers.filter(target => {
      if (target.id === source.id) return false;
      // Đạm Bạc (Lang Liêu): Khi không có bài trên tay, không thể là mục tiêu của [Chém]
      if (globalHeroRegistry.hasSkill(target, 'dam_bac', false) && (!target.hand || target.hand.length === 0)) {
        return false;
      }
      return this.inSlashRange(source, target, alivePlayers, card);
    });
  }

  /**
   * Kiểm tra xem sourceId có thể dùng Chém lên targetId không
   */
  static canAttack(state, sourceId, targetId, card = null) {
    const alive = state.getAlivePlayers ? state.getAlivePlayers() : (state.players || []).filter(p => p.isAlive);
    const source = state.getPlayer ? state.getPlayer(sourceId) : (state.players || []).find(p => p.id === sourceId);
    const target = state.getPlayer ? state.getPlayer(targetId) : (state.players || []).find(p => p.id === targetId);
    if (!source || !target) return false;
    return this.inSlashRange(source, target, alive, card);
  }
}
