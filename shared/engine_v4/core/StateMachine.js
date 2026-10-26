/**
 * StateMachine.js
 * Cỗ máy Quản lý Vòng Đời 6 Pha Chuẩn Tam Quốc Sát trong Việt Sát v4.
 * Đảm bảo tính tuần tự, không nhảy cóc và tự động kiểm định Invariants sau mỗi pha.
 */

import { GameInvariants } from './Invariants.js';
import { TrickRules } from '../rules/TrickRules.js';
import { globalHeroRegistry } from '../heroes/HeroRegistry.js';

export const PHASES = {
  BEGIN: 'BEGIN',
  JUDGE: 'JUDGE',
  DRAW: 'DRAW',
  ACTION: 'ACTION',
  DISCARD: 'DISCARD',
  END: 'END'
};

export class StateMachine {
  constructor(gameState, eventBus = null) {
    this.state = gameState;
    this.eventBus = eventBus;
  }

  /**
   * Bắt đầu lượt chơi mới cho một người chơi
   */
  startTurn(playerId = null) {
    const nextPlayerId = playerId ?? this.state.currentTurnPlayerId;
    const player = this.state.getPlayer(nextPlayerId);

    if (!player || !player.isAlive) {
      return this.nextTurn();
    }

    // Nếu người chơi đang bị lật úp mặt tướng (isFlipped) -> Tự động lật ngửa lại và bỏ qua lượt này
    if (player.isFlipped) {
      player.isFlipped = false;
      player.isFaceUp = true;
      this.state.addLog(`🔄 ${player.name} bị lật úp mặt tướng, phải bỏ qua lượt này và tự lật ngửa lại!`);
      return this.nextTurn();
    }

    this.state.currentTurnPlayerId = nextPlayerId;
    this.state.currentPhase = PHASES.BEGIN;

    // Reset chỉ số và cờ tạm thời trong lượt của người chơi
    player.turnStats = {
      slashCount: 0,
      wineCount: 0,
      cardsDrawn: 0,
      damageDealt: 0,
      damageTaken: 0
    };
    player.temporaryFlags = {};

    // Reset số lần dùng skill có tần suất theo lượt & turnTriggerCount
    if (player.skillUsage) {
      for (const skillId in player.skillUsage) {
        player.skillUsage[skillId].usedThisTurn = false;
        player.skillUsage[skillId].turnTriggerCount = 0;
      }
    }

    this.state.addLog(`=== BẮT ĐẦU LƯỢT CỦA ${player.name} ===`);
    this._runPhaseBegin();
  }

  /**
   * Pha 1: BEGIN (Pha Bắt đầu)
   * Kích hoạt kỹ năng đầu lượt (Lang Liêu - Bánh Chưng, Nguyên Phi Ỷ Lan - Phật Tâm...)
   */
  _runPhaseBegin() {
    this.state.currentPhase = PHASES.BEGIN;
    const player = this.state.getCurrentPlayer();
    this.state.addLog(`Pha Bắt đầu của ${player.name}`);

    // Kích hoạt kỹ năng đầu lượt qua HeroRegistry
    globalHeroRegistry.dispatchTrigger('BEGIN_PHASE', { sourceId: player.id }, this.state);

    // Bắn sự kiện PHASE_BEGIN để hệ thống bên ngoài phản ứng
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('PHASE_BEGIN', { player, state: this.state });
    }

    // Nếu không có kỹ năng nào yêu cầu tương tác (Stack trống) -> Tự động sang pha JUDGE
    if (this.state.priorityStack.isEmpty()) {
      this._runPhaseJudge();
    }
  }

  /**
   * Pha 2: JUDGE (Pha Phán xét)
   * Xử lý các lá cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn) theo quy tắc LIFO (bài đặt sau xử lý trước)
   */
  _runPhaseJudge() {
    this.state.currentPhase = PHASES.JUDGE;
    const player = this.state.getCurrentPlayer();

    // Xử lý cẩm nang trong khu phán xét (Sấm Sét, Hỗn Loạn)
    if (player.judgementArea && player.judgementArea.length > 0) {
      TrickRules.resolveJudgementPhase(this.state, player.id, { interactiveRoll: true });
    }

    if (this.state.priorityStack.isEmpty()) {
      this._completeJudgePhase();
    }
  }

  _completeJudgePhase() {
    const player = this.state.getCurrentPlayer();
    if (!player || !player.isAlive) {
      if (!this.state.gameOver) {
        this.nextTurn();
      }
      return;
    }

    // Nếu còn cẩm nang trì hoãn khác cần phán xét tiếp
    if (player.judgementArea && player.judgementArea.length > 0) {
      TrickRules.resolveJudgementPhase(this.state, player.id, { interactiveRoll: true });
      if (!this.state.priorityStack.isEmpty()) {
        return;
      }
    }

    if (!player.isAlive) {
      if (!this.state.gameOver) {
        this.nextTurn();
      }
      return;
    }

    this._runPhaseDraw();
  }

  /**
   * Pha 3: DRAW (Pha Rút bài)
   * Mặc định rút 2 lá bài
   */
  _runPhaseDraw() {
    this.state.currentPhase = PHASES.DRAW;
    const player = this.state.getCurrentPlayer();

    // Kích hoạt kỹ năng rút bài qua HeroRegistry (Triệu Quang Phục - Dạ Trạch, Phùng Hưng - Khởi Nghĩa, Đô Đốc Bảo - Phá Thành...)
    globalHeroRegistry.dispatchTrigger('DRAW_PHASE', { sourceId: player.id }, this.state);

    if (this.state.priorityStack.isEmpty()) {
      this._completeDrawPhase();
    }
  }

  _completeDrawPhase() {
    const player = this.state.getCurrentPlayer();
    if (!player || !player.isAlive) {
      if (!this.state.gameOver) {
        this.nextTurn();
      }
      return;
    }

    if (!player.temporaryFlags?.skipDrawPhase) {
      const drawCount = player.temporaryFlags?.drawCardCount ?? 2;
      const drawn = this.state.drawCards(player.id, drawCount);
      this.state.addLog(`${player.name} rút ${drawn.length} lá bài.`);
    } else {
      this.state.addLog(`⛔ ${player.name} bị bỏ qua Giai đoạn Rút bài!`);
      player.temporaryFlags.skipDrawPhase = false;
    }

    // Kiểm tra mất Giai đoạn Ra bài do [Hỗn Loạn]
    if (player.temporaryFlags?.skipActionPhase) {
      this.state.addLog(`🌀 Do hiệu ứng [Hỗn Loạn], ${player.name} bị mất Giai đoạn Ra bài!`);
      player.temporaryFlags.skipActionPhase = false;
      this._runPhaseDiscard();
      return;
    }

    this._runPhaseAction();
  }

  _completeBeginPhase() {
    const player = this.state.getCurrentPlayer();
    if (!player || !player.isAlive) {
      if (!this.state.gameOver) {
        this.nextTurn();
      }
      return;
    }
    this._runPhaseJudge();
  }

  /**
   * Pha 4: ACTION (Pha Ra bài / Hành động)
   * Người chơi đánh bài, dùng kỹ năng. Dừng lại chờ lệnh từ người chơi / Bot.
   */
  _runPhaseAction() {
    this.state.currentPhase = PHASES.ACTION;
    const player = this.state.getCurrentPlayer();
    this.state.addLog(`Pha Hành động của ${player.name}`);
  }

  /**
   * Kết thúc Pha Hành động -> Chuyển sang Pha Bỏ bài
   */
  endActionPhase() {
    if (this.state.currentPhase !== PHASES.ACTION) {
      if (this.state.currentPhase === PHASES.DISCARD) {
        const player = this.state.getCurrentPlayer();
        this._checkDiscardLimit(player);
        return;
      }
      if (this.state.currentPhase === PHASES.END) {
        this.nextTurn();
        return;
      }
      console.warn(`[StateMachine] Bỏ qua kết thúc Pha Hành động khi đang ở pha ${this.state.currentPhase}`);
      return;
    }

    const player = this.state.getCurrentPlayer();
    if (!player || player.isAlive === false || (player.hp !== undefined && player.hp <= 0)) {
      this.nextTurn();
      return;
    }

    // Tô Hiến Thành - [Nhiếp Chính]: Nếu không dùng lá Chém nào trong lượt, bỏ qua Pha Bỏ bài
    const hasNhiepChinh = player && (
      globalHeroRegistry.hasSkill(player, 'nhiep_chinh') ||
      globalHeroRegistry.hasSkill(player, 'nhiep-chinh') ||
      player.skills?.includes('nhiep_chinh') ||
      player.skills?.includes('nhiep-chinh') ||
      player.skills?.includes('nhiep_chinh_to_hien_thanh')
    );
    if (hasNhiepChinh && (!player.turnStats?.slashCount || player.turnStats.slashCount === 0)) {
      this.state.addLog(`✨ [Nhiếp Chính] ${player.name} không đánh [Chém] trong lượt, bỏ qua Giai đoạn Bỏ bài!`);
      this._runPhaseEnd();
      return;
    }

    this._runPhaseDiscard();
  }

  /**
   * Pha 5: DISCARD (Pha Bỏ bài)
   * Kiểm tra bài trên tay so với HP. Nếu vượt quá -> tạo PriorityFrame yêu cầu bỏ bài
   */
  _runPhaseDiscard() {
    this.state.currentPhase = PHASES.DISCARD;
    const player = this.state.getCurrentPlayer();
    if (!player || player.isAlive === false || (player.hp !== undefined && player.hp <= 0)) {
      this.nextTurn();
      return;
    }

    // Trigger DISCARD_PHASE (Dương Đình Nghệ - Dưỡng Quân 3...)
    globalHeroRegistry.dispatchTrigger('DISCARD_PHASE', { sourceId: player.id }, this.state);

    if (this.state.priorityStack.isEmpty()) {
      this._checkDiscardLimit(player);
    }
  }

  _checkDiscardLimit(player = null) {
    if (!player) player = this.state.getCurrentPlayer();
    if (!player || player.isAlive === false || (player.hp !== undefined && player.hp <= 0)) {
      this.nextTurn();
      return;
    }

    if (player.temporaryFlags?.skipDiscardPhase) {
      this.state.addLog(`⚡ ${player.name} bỏ qua Pha Bỏ bài!`);
      player.temporaryFlags.skipDiscardPhase = false;
      this._runPhaseEnd();
      return;
    }

    const baseMaxHand = Math.max(0, player.hp);
    let bonusMaxHand = player.bonusMaxHand || 0;

    // Nguyễn Bặc - Khai Quốc (Chủ Công Kỹ): Giới hạn bài tay +2 × (số tướng hệ Sơn)
    const hasKhaiQuoc = globalHeroRegistry.hasSkill(player, 'khai_quoc', true) || globalHeroRegistry.hasSkill(player, 'khai_quoc_nguyen_bac', true);
    if (hasKhaiQuoc) {
      const allySonCount = this.state.players.filter(p => p.id !== player.id && p.isAlive && (p.faction === 'son' || p.faction === 'Sơn' || p.rawFaction === 'son')).length;
      bonusMaxHand += allySonCount * 2;
    }

    let effectiveMaxHand = baseMaxHand + bonusMaxHand;

    // Nguyễn Địa Lô - Hộ Chủ: Nếu có các lá bài Trung, Max hand được tính bằng số lá bài Trung
    if (globalHeroRegistry.hasSkill(player, 'ho_chu', true) && Array.isArray(player.trungCards) && player.trungCards.length > 0) {
      effectiveMaxHand = Math.max(effectiveMaxHand, player.trungCards.length);
    }

    const excess = player.hand.length - effectiveMaxHand;

    // Nhiếp chính Tô Hiến Thành: Chỉ được miễn bỏ bài nếu lượt này KHÔNG sử dụng lá Chém nào
    const hasToHienThanh = (
      globalHeroRegistry.hasSkill(player, 'nhiep_chinh', true) ||
      globalHeroRegistry.hasSkill(player, 'nhiep_chinh_to_hien_thanh', true) ||
      player.skills?.includes('nhiep_chinh') ||
      player.skills?.includes('nhiep_chinh_to_hien_thanh')
    ) && (player.turnStats?.slashCount || 0) === 0;

    if (excess > 0 && !hasToHienThanh) {
      // Đẩy Frame yêu cầu bỏ bài vào PriorityStack
      this.state.priorityStack.push({
        type: 'ASK_DISCARD',
        sourceId: player.id,
        targetId: player.id,
        priorityQueue: [player.id],
        context: {
          cardsToDiscard: excess,
          maxHand: effectiveMaxHand
        }
      });
      this.state.addLog(`${player.name} cần bỏ ${excess} lá bài.`);
    } else {
      // Đã thỏa mãn điều kiện bỏ bài -> Chuyển sang END
      this._runPhaseEnd();
    }
  }

  /**
   * Xử lý hành động bỏ bài của người chơi trong Pha Bỏ bài
   */
  handleDiscard(playerId, cardIds = []) {
    if (this.state.currentPhase !== PHASES.DISCARD) {
      throw new Error(`[StateMachine] Không thể bỏ bài vì không ở Pha Bỏ bài (hiện tại: ${this.state.currentPhase})`);
    }

    const currentFrame = this.state.priorityStack.peek();
    if (!currentFrame || currentFrame.type !== 'ASK_DISCARD') {
      throw new Error(`[StateMachine] Không có yêu cầu bỏ bài nào đang chờ!`);
    }

    const player = this.state.getPlayer(playerId);
    const required = Math.min(player.hand?.length || 0, currentFrame.context.cardsToDiscard);

    if (cardIds.length !== required) {
      throw new Error(`[StateMachine] Cần bỏ chính xác ${required} lá bài, nhưng nhận được ${cardIds.length} lá.`);
    }

    // Thực hiện bỏ bài
    this.state.discardFromHand(playerId, cardIds);
    this.state.addLog(`${player.name} đã bỏ ${cardIds.length} lá bài.`);

    // Giải phóng Frame bỏ bài
    this.state.priorityStack.pop();

    // Assert Invariant bỏ bài
    GameInvariants.assertDiscardLimit(player, this.state);

    // Chuyển sang Pha Kết thúc
    this._runPhaseEnd();
  }

  /**
   * Pha 6: END (Pha Kết thúc)
   * Kích hoạt kỹ năng cuối lượt, dọn dẹp cờ tạm và chuyển lượt
   */
  _runPhaseEnd() {
    this.state.currentPhase = PHASES.END;
    const player = this.state.getCurrentPlayer();
    this.state.addLog(`Pha Kết thúc của ${player.name}`);

    // Kích hoạt kỹ năng cuối lượt qua HeroRegistry (Trần Quang Khải - Đoạt Sáo, Huyền Trân - An Bang...)
    globalHeroRegistry.dispatchTrigger('END_PHASE', { sourceId: player.id }, this.state);

    // Bắn sự kiện PHASE_END để hệ thống bên ngoài phản ứng
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('PHASE_END', { player, state: this.state });
    }

    // Chuyển sang lượt của người tiếp theo nếu không có kỹ năng nào đang chờ
    if (this.state.priorityStack.isEmpty()) {
      this.nextTurn();
    }
  }

  /**
   * Chuyển sang người chơi còn sống tiếp theo theo chiều kim đồng hồ
   */
  nextTurn() {
    const alivePlayers = this.state.getAlivePlayers();
    if (alivePlayers.length <= 1) {
      this.state.addLog('Trò chơi kết thúc!');
      return;
    }

    const currentIdx = alivePlayers.findIndex(p => p.id === this.state.currentTurnPlayerId);
    const nextIdx = (currentIdx + 1) % alivePlayers.length;
    const nextPlayer = alivePlayers[nextIdx];

    if (nextIdx === 0 || nextIdx <= currentIdx) {
      this.state.turn = (this.state.turn || 1) + 1;
    }

    // Dọn dẹp các cờ khóa kỹ năng tạm thời của lượt trước (Tre Ngà...)
    for (const p of alivePlayers) {
      if (p.temporaryFlags) {
        p.temporaryFlags.skillsSuppressed = false;
        p.temporaryFlags.treNgaRequiredSuit = null;
      }
    }

    this.startTurn(nextPlayer.id);
  }
}
