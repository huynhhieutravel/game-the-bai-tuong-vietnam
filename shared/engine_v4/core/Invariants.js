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
    const hasCrossbow = player.equipment?.weapon?.id === 'crossbow' || 
                        player.equipment?.weapon?.key === 'crossbow' || 
                        player.equipment?.weapon?.name === 'Liên Nỏ';
    const hasUnlimitedFlag = player.temporaryFlags?.unlimitedSlash === true;
    const hasVanDonBonus = player.temporaryFlags?.vanDonWin === true && (player.turnStats?.slashCount || 0) <= 2;

    if (!hasCrossbow && !hasUnlimitedFlag && !hasVanDonBonus) {
      if ((player.turnStats?.slashCount || 0) > 1) {
        throw new Error(`[INVARIANT_VIOLATION] Người chơi ${player.id} (${player.name}) đã đánh ${player.turnStats.slashCount} lá Chém mà không có Liên Nỏ hoặc kỹ năng cho phép!`);
      }
    }
  }

  /**
   * Bất biến 1b: Giới hạn uống Rượu trong Pha Hành Động
   * Mỗi lượt người chơi chỉ được uống Rượu tối đa 1 lần trong pha Hành động
   */
  static assertWineLimit(player) {
    if ((player.turnStats?.wineCount || 0) > 1) {
      throw new Error(`[INVARIANT_VIOLATION] Người chơi ${player.id} (${player.name}) đã uống ${player.turnStats.wineCount} lần Rượu trong giai đoạn Hành động!`);
    }
  }

  /**
   * Bất biến 2: Bỏ bài cuối lượt (Discard Phase)
   * Số bài trên tay không được vượt quá HP hiện tại (trừ kỹ năng đặc thù)
   */
  static assertDiscardLimit(player, state = null) {
    if (!player || player.isAlive === false) {
      return;
    }
    const hasToHienThanh = (player.skills?.includes('nhiep_chinh_to_hien_thanh') || player.skills?.includes('nhiep_chinh') || player.skills?.includes('nhiep-chinh') || player.temporaryFlags?.skipDiscardPhase) && (player.turnStats?.slashCount || 0) === 0;
    if (player.temporaryFlags?.skipDiscardPhase || hasToHienThanh) {
      return;
    }

    // Tính Max Hand: Mặc định bằng HP hiện tại + bonus kỹ năng (như Khai Quốc của Nguyễn Bặc, Hộ Chủ của Nguyễn Địa Lô)
    const baseMaxHand = Math.max(0, player.hp);
    let bonusMaxHand = player.bonusMaxHand || 0;

    const hasKhaiQuoc = player.skills?.includes('khai_quoc') || (player.heroes && Object.values(player.heroes).some(h => h?.skills?.includes('khai_quoc')));
    if (hasKhaiQuoc && state?.players) {
      const allySonCount = state.players.filter(p => p.id !== player.id && p.isAlive && (p.faction === 'son' || p.faction === 'Sơn' || p.rawFaction === 'son')).length;
      bonusMaxHand += allySonCount * 2;
    }

    let effectiveMaxHand = baseMaxHand + bonusMaxHand;
    const hasHoChu = player.skills?.includes('ho_chu') || (player.heroes && Object.values(player.heroes).some(h => h?.skills?.includes('ho_chu')));
    if (hasHoChu && Array.isArray(player.trungCards) && player.trungCards.length > 0) {
      effectiveMaxHand = Math.max(effectiveMaxHand, player.trungCards.length);
    }

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
      currentTotal += p.trungCards?.length || 0;
    }

    if (state.priorityStack?.stack) {
      for (const frame of state.priorityStack.stack) {
        if (frame.context?.judgeCard) currentTotal += 1;
        if (frame.context?.delayedCard) currentTotal += 1;
        if (Array.isArray(frame.context?.drawnCards)) {
          for (const card of frame.context.drawnCards) {
            const alreadyInHand = state.players.some(p => p.hand?.some(c => c.id === card?.id));
            if (!alreadyInHand) currentTotal += 1;
          }
        }
      }
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
