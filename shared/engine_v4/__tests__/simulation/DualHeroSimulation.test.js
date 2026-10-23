import { describe, it, expect } from 'vitest';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { GameInvariants } from '../../core/Invariants.js';
import { createGameState, selectDraftHeroes } from '../../application/gameSetupV4.js';
import { Dispatcher } from '../../application/DispatcherV4.js';
import { GameAPI } from '../../application/GameAPIV4.js';
import { BotRunner } from '../../application/BotRunnerV4.js';
import { toViewModel } from '../../application/GameViewMapperV4.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';

describe('QA Song Tướng (Dual Hero System) & Auto-Reveal Invariants', () => {
  it('kiểm định GameInvariants.assertValidDraftHeroes bắt lỗi chính xác', () => {
    // 1. Thiếu mainHeroId -> ném lỗi
    expect(() => {
      GameInvariants.assertValidDraftHeroes(null, 'thanh_giong', globalHeroRegistry);
    }).toThrow('[INVARIANT_VIOLATION]');

    // 2. Tướng không tồn tại trong Registry -> ném lỗi
    expect(() => {
      GameInvariants.assertValidDraftHeroes('fake_hero_123', 'thanh_giong', globalHeroRegistry);
    }).toThrow('[INVARIANT_VIOLATION]');

    // 3. Trùng cả 2 tướng -> ném lỗi
    expect(() => {
      GameInvariants.assertValidDraftHeroes('thanh_giong', 'thanh_giong', globalHeroRegistry);
    }).toThrow('[INVARIANT_VIOLATION]');

    // 4. Khác phe (Lạc + Hà) -> ném lỗi
    expect(() => {
      GameInvariants.assertValidDraftHeroes('thanh_giong', 'ngo_quyen', globalHeroRegistry);
    }).toThrow('[INVARIANT_VIOLATION]');

    // 5. Cùng phe hợp lệ (Lạc + Lạc) -> thành công
    expect(() => {
      GameInvariants.assertValidDraftHeroes('thanh_giong', 'lac_long_quan', globalHeroRegistry);
    }).not.toThrow();

    // 6. Cùng phe Sơn (dinh_bo_linh + nguyen_bac) -> thành công
    expect(() => {
      GameInvariants.assertValidDraftHeroes('dinh_bo_linh', 'nguyen_bac', globalHeroRegistry);
    }).not.toThrow();
  });

  it('tính toán máu Song Tướng chuẩn xác (Combined HP)', () => {
    let state = createGameState(4);
    // Chọn Thánh Gióng (4 máu) + Lạc Long Quân (4 máu) -> 4 máu
    state = selectDraftHeroes(state, 0, 'lac_long_quan', 'thanh_giong');
    state = selectDraftHeroes(state, 1, 'trieu_quang_phuc', 'phung_hung');
    state = selectDraftHeroes(state, 2, 'ngo_quyen', 'yet_kieu');
    state = selectDraftHeroes(state, 3, 'dinh_bo_linh', 'nguyen_bac');

    expect(state.players[0].maxHp).toBe(4);
    expect(state.players[0].mainHeroId).toBe('lac_long_quan');
    expect(state.players[0].subHeroId).toBe('thanh_giong');
    expect(state.players[0].revealedHeroes).toEqual([false, false]);

    const vm = toViewModel(state);
    expect(vm.players[0].heroes.length).toBe(2);
    expect(vm.players[0].heroes[0].isRevealed).toBe(false);
    expect(vm.players[0].heroes[1].isRevealed).toBe(false);
  });

  it('kỹ năng ẩn: không kích hoạt passive khi chưa lộ diện, tự động lộ diện khi phát động', () => {
    let state = createGameState(4);
    state = selectDraftHeroes(state, 0, 'thanh_giong', 'lac_long_quan');
    state = selectDraftHeroes(state, 1, 'son_tinh', 'chu_dong_tu');
    state = selectDraftHeroes(state, 2, 'ngo_quyen', 'yet_kieu');
    state = selectDraftHeroes(state, 3, 'dinh_bo_linh', 'nguyen_bac');

    const p0 = state.players[0]; // Thánh Gióng (có thiet_ma)
    const p1 = state.players[1]; // Sơn Tinh (có doi_nui)

    // Khi cả 2 chưa lộ diện:
    // Thánh Gióng chưa lộ diện -> thiet_ma không giảm cự ly tấn công
    const distBefore = RangeSystem.getDistance(state, p0.id, p1.id);
    expect(distBefore).toBe(1);

    // Sơn Tinh chưa lộ diện -> doi_nui không tăng khoảng cách phòng thủ
    const distToSonTinh = RangeSystem.getDistance(state, state.players[2].id, p1.id);
    expect(distToSonTinh).toBe(1);

    // Bây giờ Thánh Gióng tự lộ diện (hoặc phát động kỹ năng)
    p0.revealedHeroes[0] = true;
    // Cự ly từ p0 đến p2 bình thường là 2, nhưng thiet_ma (-1) làm cự ly còn 1
    const distWithRevealed = RangeSystem.getDistance(state, p0.id, state.players[2].id);
    expect(distWithRevealed).toBe(1);

    // Sơn Tinh lộ diện -> doi_nui (+1) tăng cự ly phòng thủ
    p1.revealedHeroes[0] = true;
    const distToRevealedSonTinh = RangeSystem.getDistance(state, state.players[2].id, p1.id);
    expect(distToRevealedSonTinh).toBe(2); // 1 + 1 từ doi_nui
  });

  it('Đạm Bạc của Lang Liêu: Miễn nhiễm Chém và Quyết Đấu khi hết bài tay (sau khi lộ diện)', () => {
    let state = createGameState(4);
    state = selectDraftHeroes(state, 0, 'lac_long_quan', 'thanh_giong');
    state = selectDraftHeroes(state, 1, 'lang_lieu', 'chu_dong_tu');
    state = selectDraftHeroes(state, 2, 'ngo_quyen', 'yet_kieu');
    state = selectDraftHeroes(state, 3, 'dinh_bo_linh', 'nguyen_bac');

    const p0 = state.players[0];
    const p1 = state.players[1]; // Lang Liêu
    p1.hand = []; // Hết bài tay

    // Khi Lang Liêu CHƯA lộ diện -> Vẫn bị Chém bình thường
    const slashCard = { id: 'slash_1', name: 'Chém', type: 'slash' };
    expect(() => {
      CombatRules.playSlash(state, p0.id, p1.id, slashCard);
    }).not.toThrow();

    // Dọn stack
    state.priorityStack.clear();

    // Khi Lang Liêu ĐÃ lộ diện -> Không thể là mục tiêu của Chém
    p1.revealedHeroes[0] = true;
    expect(() => {
      CombatRules.playSlash(state, p0.id, p1.id, slashCard);
    }).toThrow(/Đạm Bạc/);

    // Kiểm tra Quyết Đấu cũng bị chặn
    const duelCard = { id: 'duel_1', name: 'Quyết Đấu', type: 'trick' };
    expect(() => {
      TrickRules.playTrick(state, p0.id, [p1.id], duelCard);
    }).toThrow(/Đạm Bạc/);
  });

  it('chạy 50 trận mô phỏng toàn diện Song Tướng (Lạc, Việt, Hà, Sơn) qua Dispatcher & BotRunner', () => {
    const factionPairs = [
      ['lac_long_quan', 'thanh_giong'],
      ['trieu_quang_phuc', 'phung_hung'],
      ['ngo_quyen', 'yet_kieu'],
      ['dinh_bo_linh', 'nguyen_bac']
    ];

    let passedGames = 0;
    for (let g = 0; g < 50; g++) {
      let state = createGameState(4);

      // Draft 4 cặp tướng đại diện cho 4 phe
      for (let i = 0; i < 4; i++) {
        const pair = factionPairs[(g + i) % factionPairs.length];
        state = selectDraftHeroes(state, i, pair[0], pair[1]);
      }

      const dispatcher = new Dispatcher(state);
      const api = new GameAPI(dispatcher);
      const runner = new BotRunner(api);

      // Cho Bot tự chơi 10 bước/lượt
      for (let step = 0; step < 10; step++) {
        runner.onStateUpdate(state);
        // Tự động bỏ qua hoặc kết thúc lượt nếu cần
        if (state.currentPhase === 'ACTION') {
          api.endTurn();
        }
      }

      runner.cleanup();
      expect(state.players.length).toBe(4);
      passedGames++;
    }

    expect(passedGames).toBe(50);
  });
});
