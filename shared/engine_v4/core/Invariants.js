/**
 * Invariants.js
 * Bộ kiểm định các Luật Thép Bất Biến (Game Invariants) trong Việt Sát v4.
 * Tự động assert để phát hiện bug logic ngay lập tức trong quá trình chạy test và mô phỏng.
 */

export class GameInvariants {
  /**
   * Bất biến 1: Giới hạn đánh Chém trong lượt
   * Tuyệt đối không được đánh > 1 Chém nếu không có Liên Nỏ hoặc cờ phá giới hạn
   */
  static assertSlashLimit(player) {
    const hasCrossbow = player.equipment?.weapon?.id === 'crossbow' || player.equipment?.weapon?.key === 'crossbow';
    const hasUnlimitedFlag = player.temporaryFlags?.unlimitedSlash === true;

    if (!hasCrossbow && !hasUnlimitedFlag) {
      if ((player.turnStats?.slashCount || 0) > 1) {
        throw new Error(`[INVARIANT_VIOLATION] Người chơi ${player.id} (${player.name}) đã đánh ${player.turnStats.slashCount} lá Chém mà không có Liên Nỏ hoặc kỹ năng cho phép!`);
      }
    }
  }

  /**
   * Bất biến 2: Bỏ bài cuối lượt (Discard Phase)
   * Số bài trên tay không được vượt quá HP hiện tại (trừ kỹ năng đặc thù)
   */
  static assertDiscardLimit(player) {
    if (player.temporaryFlags?.skipDiscardPhase || player.skills?.includes('nhiep_chinh_to_hien_thanh')) {
      return;
    }

    // Tính Max Hand: Mặc định bằng HP hiện tại + bonus kỹ năng (như Khai Quốc của Nguyễn Bặc)
    const baseMaxHand = Math.max(0, player.hp);
    const bonusMaxHand = player.bonusMaxHand || 0;
    const effectiveMaxHand = baseMaxHand + bonusMaxHand;

    const handCount = player.hand?.length || 0;
    if (handCount > effectiveMaxHand) {
      throw new Error(`[INVARIANT_VIOLATION] Người chơi ${player.id} (${player.name}) còn ${handCount} bài trên tay sau pha Bỏ bài, vượt quá giới hạn cho phép (${effectiveMaxHand} = HP ${player.hp} + Bonus ${bonusMaxHand})!`);
    }
  }

  /**
   * Bất biến 3: Bảo toàn số lượng thẻ bài (Deck Conservation)
   * Không bao giờ được làm biến mất hoặc nhân đôi bất kỳ lá bài nào trong toàn game
   */
  static assertCardConservation(state, initialTotalCards) {
    if (!initialTotalCards) return;

    let currentTotal = 0;
    currentTotal += state.drawPile?.length || 0;
    currentTotal += state.discardPile?.length || 0;

    for (const p of state.players) {
      currentTotal += p.hand?.length || 0;
      if (p.equipment) {
        if (p.equipment.weapon) currentTotal += 1;
        if (p.equipment.armor) currentTotal += 1;
        if (p.equipment.horse_attack) currentTotal += 1;
        if (p.equipment.horse_defense) currentTotal += 1;
      }
      currentTotal += p.judgementArea?.length || 0;
    }

    if (currentTotal !== initialTotalCards) {
      throw new Error(`[INVARIANT_VIOLATION] Lệch tổng số bài trong bàn! Ban đầu: ${initialTotalCards}, Hiện tại: ${currentTotal}. Có lá bài bị mất hoặc bị nhân đôi!`);
    }
  }

  /**
   * Bất biến 4: Trạng thái Hấp hối trước khi Tử trận
   * Người chơi có HP <= 0 bắt buộc phải qua trạng thái Dying, không được biến thành Dead trực tiếp
   */
  static assertDyingBeforeDeath(player, wasInDyingState) {
    if (player.hp <= 0 && !player.isAlive && !wasInDyingState) {
      throw new Error(`[INVARIANT_VIOLATION] Người chơi ${player.id} (${player.name}) bị đánh dấu tử trận trực tiếp mà không đi qua trạng thái Hấp hối (Dying)!`);
    }
  }

  /**
   * Bất biến 5: Hợp lệ Song Tướng khi khởi tạo/Draft (Dual Hero Validation)
   * 1. Phải có ít nhất Main Hero.
   * 2. Nếu có Sub Hero, cả 2 tướng phải tồn tại trong Hero Registry.
   * 3. Hai tướng không được trùng nhau.
   * 4. Hai tướng phải cùng Phe (Faction) tương thích (trừ khi có tướng Dã sử/Trung lập).
   */
  static assertValidDraftHeroes(mainHeroId, subHeroId = null, heroRegistry = null) {
    if (!mainHeroId) {
      throw new Error(`[INVARIANT_VIOLATION] Thiếu Tướng Chính (mainHeroId) khi khởi tạo!`);
    }
    if (!heroRegistry) return;

    const h1 = heroRegistry.getHero ? heroRegistry.getHero(mainHeroId) : null;
    if (!h1) {
      throw new Error(`[INVARIANT_VIOLATION] Tướng chính [${mainHeroId}] không tồn tại trong HeroRegistry!`);
    }

    if (subHeroId) {
      if (mainHeroId === subHeroId) {
        throw new Error(`[INVARIANT_VIOLATION] Không thể chọn cùng một Tướng [${mainHeroId}] cho cả Tướng Chính và Tướng Phụ!`);
      }
      const h2 = heroRegistry.getHero ? heroRegistry.getHero(subHeroId) : null;
      if (!h2) {
        throw new Error(`[INVARIANT_VIOLATION] Tướng phụ [${subHeroId}] không tồn tại trong HeroRegistry!`);
      }

      // Kiểm tra cùng Faction (nếu cả 2 đều có faction xác định)
      const f1 = (h1.faction || h1.rawFaction || '').toLowerCase();
      const f2 = (h2.faction || h2.rawFaction || '').toLowerCase();
      if (f1 && f2 && f1 !== f2 && f1 !== 'wild' && f2 !== 'wild') {
        throw new Error(`[INVARIANT_VIOLATION] Tướng chính [${h1.name}] (Phe ${h1.faction}) và Tướng phụ [${h2.name}] (Phe ${h2.faction}) không cùng Phe!`);
      }
    }
  }
}
