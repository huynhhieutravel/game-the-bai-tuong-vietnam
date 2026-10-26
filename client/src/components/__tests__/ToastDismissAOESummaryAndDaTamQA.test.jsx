import { describe, it, expect } from 'vitest';
import { GameState } from '../../../../shared/engine_v4/core/GameState.js';
import { TrickRules } from '../../../../shared/engine_v4/rules/TrickRules.js';
import { CombatRules } from '../../../../shared/engine_v4/rules/CombatRules.js';
import { DispatcherV4 } from '../../../../shared/engine_v4/application/DispatcherV4.js';
import { toViewModel } from '../../../../shared/engine_v4/application/GameViewMapperV4.js';

describe('QA Toast Dismissal, AOE Summary, and Dã Tâm (Careerist) Lifecycle', () => {
  const create4PlayerState = () => {
    const players = [
      { id: 0, name: 'Người chơi 1', hp: 4, maxHp: 4, isBot: false, hand: [] },
      { id: 1, name: 'Người chơi 2', hp: 3, maxHp: 3, isBot: true, hand: [{ id: 's_1', name: 'Chém', type: 'slash' }, { id: 'd_1', name: 'Né', type: 'dodge' }] },
      { id: 2, name: 'Người chơi 3', hp: 3, maxHp: 3, isBot: true, hand: [] },
      { id: 3, name: 'Người chơi 4', hp: 3, maxHp: 3, isBot: true, hand: [{ id: 's_4', name: 'Chém', type: 'slash' }] },
    ];
    const state = new GameState({ players, drawPile: [] });
    state.activePlayerId = 0;
    state.currentTurnPlayerId = 0;
    state.currentPhase = 'action';
    return state;
  };

  it('1. Cẩm nang [Dã Man] tổng kết kết quả chuẩn xác khi hoàn tất đợt công kích', () => {
    const state = create4PlayerState();
    const barbCard = { id: 'barb_1', name: 'Dã Man', idKey: 'da_man', type: 'trick' };

    // P0 đánh Dã Man
    TrickRules.playBarbarian(state, 0, barbCard);
    expect(state.priorityStack.size()).toBe(3);

    // P2 dùng Chém
    TrickRules.respondBarbarian(state, 1, state.getPlayer(1).hand[0]);
    // Chưa có summary vì còn P3 và P4
    expect(state.logs.some(l => (l.message || l.text || '').includes('🏹 [Dã Man]:'))).toBe(false);

    // P3 không có Chém -> mất máu
    TrickRules.respondBarbarian(state, 2, null);
    expect(state.getPlayer(2).hp).toBe(2);

    // P4 dùng Chém -> Hoàn thành chuỗi AOE!
    TrickRules.respondBarbarian(state, 3, state.getPlayer(3).hand[0]);

    // BẮT BUỘC phải phát sinh thông báo tổng kết rõ ràng
    const summaryLog = state.logs.find(l => (l.message || l.text || '').includes('🏹 [Dã Man]:'));
    expect(summaryLog).toBeDefined();
    const sumText = summaryLog.message || summaryLog.text || '';
    expect(sumText).toContain('Người chơi 2, Người chơi 4 dùng [Chém] cản');
    expect(sumText).toContain('Người chơi 3 mất máu');
  });

  it('2. Cẩm nang [Vạn Tiễn] tổng kết kết quả chuẩn xác khi mọi đối thủ đã phản hồi', () => {
    const state = create4PlayerState();
    const rainCard = { id: 'rain_1', name: 'Vạn Tiễn', idKey: 'loan_tien', type: 'trick' };

    // P0 đánh Vạn Tiễn
    TrickRules.playArrowRain(state, 0, rainCard);
    expect(state.priorityStack.size()).toBe(3);

    // P2 dùng Né
    CombatRules.respondDodge(state, 1, state.getPlayer(1).hand[1]);
    // P3 không né -> mất máu
    CombatRules.respondDodge(state, 2, null);
    // P4 không né -> mất máu
    CombatRules.respondDodge(state, 3, null);

    const summaryLog = state.logs.find(l => (l.message || l.text || '').includes('🎯 [Vạn Tiễn]:'));
    expect(summaryLog).toBeDefined();
    const sumText = summaryLog.message || summaryLog.text || '';
    expect(sumText).toContain('Người chơi 2 dùng [Né] cản');
    expect(sumText).toContain('Người chơi 3, Người chơi 4 mất máu');
  });

  it('3. Cơ chế Dã Tâm: Khi 3 người phe Lạc lộ diện trong bàn 4 người -> Người thứ 3 thành Dã Tâm và ViewModel hiển thị Phe Dã Tâm', () => {
    const state = new GameState({
      players: [
        { id: 0, name: 'Bạn', mainHeroId: 'lac_long_quan', subHeroId: 'lang_lieu', faction: 'lac', revealedHeroes: [false, false] },
        { id: 1, name: 'Người chơi 2', mainHeroId: 'cao_lo', subHeroId: 'than_tru_troi', faction: 'lac', revealedHeroes: [false, false] },
        { id: 2, name: 'Người chơi 3', mainHeroId: 'lang_lieu', subHeroId: 'tien_dung', faction: 'lac', revealedHeroes: [false, false] },
        { id: 3, name: 'Người chơi 4', mainHeroId: 'trieu_quang_phuc', subHeroId: 'trieu_quang_phuc', faction: 'viet', revealedHeroes: [false, false] }
      ]
    });

    const dispatcher = new DispatcherV4(state);

    // Người 0 lộ diện Lạc
    dispatcher.dispatchAction({ type: 'ACTION_REVEAL_HERO', payload: { playerId: 0, heroIndex: 0 } });
    expect(state.getPlayer(0).isDaTam).toBeFalsy();

    // Người 1 lộ diện Lạc (2 <= 2 -> vẫn là Lạc)
    dispatcher.dispatchAction({ type: 'ACTION_REVEAL_HERO', payload: { playerId: 1, heroIndex: 0 } });
    expect(state.getPlayer(1).isDaTam).toBeFalsy();

    // Người 2 lộ diện Lạc (3 > 2 -> Thoái hóa thành Dã Tâm!)
    dispatcher.dispatchAction({ type: 'ACTION_REVEAL_HERO', payload: { playerId: 2, heroIndex: 0 } });
    expect(state.getPlayer(2).isDaTam).toBe(true);

    // Kiểm tra ViewModel xuất ra cho UI
    const vm = toViewModel(state, 0);
    const p3VM = vm.players[2];
    expect(p3VM.isDaTam).toBe(true);
    expect(p3VM.faction).toBe('Dã Tâm');
    expect(p3VM.canonicalFaction).toBe('datam');
  });
});
