/**
 * RangeSystem.js
 * Hệ thống tính toán Khoảng cách (Distance) và Tầm đánh (Attack Range) trong Việt Sát v4.
 * Tuân thủ tuyệt đối quy tắc hình học vòng tròn chuẩn Tam Quốc Sát.
 */

import { globalHeroRegistry } from '../heroes/HeroRegistry.js';

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

    const sourceIdx = alivePlayers.findIndex(p => p.id === source.id);
    const targetIdx = alivePlayers.findIndex(p => p.id === target.id);

    if (sourceIdx === -1 || targetIdx === -1) {
      throw new Error(`[RangeSystem] Người chơi không tồn tại trong danh sách sống: ${source.id} -> ${target.id}`);
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
    if (globalHeroRegistry.hasSkill(target, 'tien_duyen_khoang_cach', true) && source.gender && target.gender && source.gender !== target.gender) {
      defenseModifier += 1;
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
    if (player.skills?.includes('no_than_cao_lo') && card && card.type === 'slash') {
      const rankNum = typeof card.rank === 'number' ? card.rank : parseInt(card.rank, 10);
      if (!isNaN(rankNum) && rankNum > 0) {
        return rankNum;
      }
    }

    // Vũ khí trang bị
    const weapon = player.equipment?.weapon;
    if (weapon && typeof weapon.range === 'number') {
      return weapon.range;
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
    if (source.temporaryFlags?.unlimitedSlashRange) {
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
      // Đạm Bạc (Lang Liêu): Khi không có bài trên tay và đã lật, không thể là mục tiêu của [Chém]
      if (globalHeroRegistry.hasSkill(target, 'dam_bac', true) && (!target.hand || target.hand.length === 0)) {
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
