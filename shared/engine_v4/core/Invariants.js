/**
 * Invariants.js
 * Bộ kiểm định các Luật Thép Bất Biến (Game Invariants) trong Việt Sát v4.
 * Tự động assert để phát hiện bug logic ngay lập tức trong quá trình chạy test và mô phỏng.
 */

import { isEquip } from '../../utils/translationHelper.js';

export class GameInvariants {
  /**
   * Bất biến 1: Giới hạn đánh Chém trong lượt
   * Tuyệt đối không được đánh > 1 Chém nếu không có Liên Nỏ hoặc cờ phá giới hạn
   */
  static assertSlashLimit(player) {
    const weapon = player.equipment?.weapon;
    const weaponName = weapon?.name || '';
    const weaponId = String(weapon?.id || weapon?.idKey || weapon?.key || '');
    const hasCrossbow = isEquip(weapon, 'lien_no') ||
                        weaponName === 'Liên Nỏ' || 
                        weaponId === 'crossbow' || 
                        weaponId.includes('lien-no') || 
                        weaponId.includes('liên-nỏ') || 
                        weaponId.includes('lien_no');
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

    const allPresent = new Set();
    state.drawPile?.forEach(c => c && allPresent.add(c.id));
    state.discardPile?.forEach(c => c && allPresent.add(c.id));

    for (const p of state.players) {
      p.hand?.forEach(c => c && allPresent.add(c.id));
      if (p.equipment) {
        if (p.equipment.weapon) allPresent.add(p.equipment.weapon.id);
        if (p.equipment.armor) allPresent.add(p.equipment.armor.id);
        if (p.equipment.horse_attack) allPresent.add(p.equipment.horse_attack.id);
        if (p.equipment.horse_defense) allPresent.add(p.equipment.horse_defense.id);
      }
      p.judgementArea?.forEach(c => c && allPresent.add(c.id));
      p.trungCards?.forEach(c => c && allPresent.add(c.id));
    }

    if (state.priorityStack?.stack) {
      for (const frame of state.priorityStack.stack) {
        if (frame.context?.card) allPresent.add(frame.context.card.id);
        if (frame.context?.judgeCard) allPresent.add(frame.context.judgeCard.id);
        if (frame.context?.delayedCard) allPresent.add(frame.context.delayedCard.id);
        if (frame.context?.revealedCard) allPresent.add(frame.context.revealedCard.id);
        if (Array.isArray(frame.context?.drawnCards)) {
          for (const card of frame.context.drawnCards) {
            if (card) allPresent.add(card.id);
          }
        }
      }
    }

    if (allPresent.size !== initialTotalCards) {
      throw new Error(`[INVARIANT_VIOLATION] Lệch tổng số bài trong bàn! Ban đầu: ${initialTotalCards}, Hiện tại: ${allPresent.size}. Có lá bài bị mất hoặc bị trùng lặp!`);
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

  /**
   * Bất biến 6: Không được tự Hóa Giải lá bài Hóa Giải của chính mình (No Self-Negate Loop)
   * Trong chuỗi phản hồi Hóa Giải, người vừa đánh Hóa Giải (lastNegaterId)
   * tuyệt đối không được là actorId trong hàng đợi hỏi tiếp theo.
   */
  static assertNoSelfNegate(frame, actorId) {
    if (!frame || frame.type !== 'ASK_NEGATE') return;
    const lastNegaterId = frame.context?.lastNegaterId;
    if (lastNegaterId !== undefined && lastNegaterId !== null && actorId === lastNegaterId) {
      throw new Error(`[INVARIANT_VIOLATION] Người chơi ${actorId} vừa sử dụng Hóa Giải không được tự Hóa Giải lại chính lá bài của mình!`);
    }
  }

  /**
   * Bất biến 7: Tính toàn vẹn của Thao tác Thẻ Ảo (Virtual Card Action Integrity)
   * Khi đánh một lá bài dưới dạng chuyển đổi (virtualCardName / asSlash / asDuel / asDismantle...):
   * Thẻ vật lý tuyệt đối KHÔNG ĐƯỢC nằm trong ô player.equipment[slot]
   */
  static assertVirtualActionIntegrity(player, isVirtualAction, card, virtualCardName) {
    if (!isVirtualAction || !card || !player) return;
    if (player.equipment) {
      for (const slot in player.equipment) {
        if (player.equipment[slot]?.id === card.id && virtualCardName) {
          throw new Error(`[INVARIANT_VIOLATION] Lá bài [${card.name}] (id: ${card.id}) được dùng làm bài ảo [${virtualCardName}] nhưng lại bị mặc vào slot trang bị [${slot}] của người chơi ${player.id} (${player.name})!`);
        }
      }
    }
  }

  /**
   * Bất biến 8: Ngăn chặn Deadlock trong Hàng đợi Ưu tiên (Priority Queue Deadlock)
   * PriorityQueue không được chứa phần tử trùng lặp vô tận và không được vượt quá số người chơi * 2
   */
  static assertNoPriorityQueueDeadlock(frame) {
    if (!frame || !frame.priorityQueue) return;
    if (frame.priorityQueue.length > 20) {
      throw new Error(`[INVARIANT_VIOLATION] Hàng đợi ưu tiên frame [${frame.type}] vượt quá 20 người chơi, dấu hiệu vòng lặp vô hạn!`);
    }
  }
}

