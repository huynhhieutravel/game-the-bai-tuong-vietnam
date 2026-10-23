/**
 * SkillContract.js
 * Bản khế ước chuẩn hóa cho mọi Kỹ năng Tướng trong Việt Sát v4.
 * Đảm bảo 3 chốt chặn an toàn:
 * 1. Chống "nhảy ké" (Trigger Filter)
 * 2. Chống lặp vô tận (Auto-flag on Action & on Cancel)
 * 3. Chống kẹt game (Universal AI Fallback)
 */

export class SkillContract {
  constructor(config = {}) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type || 'active'; // 'active' | 'reactive' | 'passive' | 'lock'
    this.frequency = config.frequency || 'turn'; // 'turn' (mỗi lượt 1 lần) | 'phase' | 'limited' (hạn định 1 lần/trận) | 'unlimited'
    this.trigger = config.trigger || null; // Tên Event kích hoạt nếu là reactive / trigger
    this.description = config.description || '';
    
    // Custom handlers
    this._filter = config.filter || null;
    this._canUse = config.canUse || (() => true);
    this._cost = config.cost || null;
    this._execute = config.execute || (() => {});
    this._ai = config.ai || null;
  }

  /**
   * Bộ lọc kích hoạt: Ngăn chặn triệt để lỗi "nhảy ké" sự kiện của người khác
   */
  matchesTrigger(event, context) {
    if (!this.trigger) return false;
    const triggers = Array.isArray(this.trigger) ? this.trigger : [this.trigger];
    if (!triggers.includes(event.type)) return false;

    if (this._filter) {
      return this._filter(context);
    }

    // Mặc định: Kỹ năng chỉ kích hoạt nếu người sở hữu chính là Actor gây ra hoặc Target nhận sự kiện
    return context.ownerId === context.actorId || context.ownerId === context.targetId;
  }

  /**
   * Kiểm tra điều kiện có thể dùng
   */
  canUse(state, context) {
    // 1. Kiểm tra giới hạn số lần sử dụng (tần suất & Safe Turn Cap)
    const usage = context.owner?.skillUsage?.[this.id];
    if (this.frequency === 'turn' && usage?.usedThisTurn) {
      return false;
    }
    if (this.frequency === 'limited' && usage?.usedThisGame) {
      return false;
    }
    // Safe Turn Cap: Tối đa 5 lần kích hoạt trong một lượt để ngăn chặn loop vô hạn
    if ((usage?.turnTriggerCount || 0) >= 5) {
      return false;
    }

    return this._canUse(state, context);
  }

  /**
   * Thực thi kỹ năng: Tự động đánh dấu cờ đã dùng để chống loop vô tận
   */
  execute(state, context, stack) {
    this._markUsed(context.owner);
    return this._execute(state, context, stack);
  }

  /**
   * Khi người chơi hoặc bot chọn HỦY (Cancel):
   * Vẫn tự động đánh dấu cờ nếu là kỹ năng giới hạn theo lượt, tránh bot spam liên tục
   */
  onCancel(state, context) {
    if (this.frequency === 'turn' && context.markUsedOnCancel) {
      this._markUsed(context.owner);
    }
  }

  /**
   * Bộ ngắt an toàn AI: Tự động Fallback an toàn nếu bot chưa được lập trình
   */
  decideAI(state, context) {
    if (this._ai) {
      try {
        const decision = this._ai(state, context);
        if (decision !== undefined && decision !== null) {
          return decision;
        }
      } catch (err) {
        console.warn(`[AI Error] Kỹ năng ${this.name} (${this.id}) văng lỗi trong BotBrain:`, err);
      }
    }

    // Universal AI Fallback: Tuyệt đối không để Bot im lặng gây deadlock
    return {
      type: 'ACTION_REACT',
      skillId: this.id,
      canceled: true,
      reason: 'AI_FALLBACK_PASS'
    };
  }

  _markUsed(owner) {
    if (!owner) return;
    if (!owner.skillUsage) owner.skillUsage = {};
    if (!owner.skillUsage[this.id]) owner.skillUsage[this.id] = {};
    owner.skillUsage[this.id].usedThisTurn = true;
    owner.skillUsage[this.id].usedThisGame = true;
    owner.skillUsage[this.id].turnTriggerCount = (owner.skillUsage[this.id].turnTriggerCount || 0) + 1;
  }
}
