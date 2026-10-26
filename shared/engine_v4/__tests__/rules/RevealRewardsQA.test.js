import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { getPlayerGender } from '../../heroes/HeroRegistry.js';

describe('Cơ Chế Lộ Diện Tướng: Tiên Phong & Âm Dương Giao Hoà (Quốc Chiến)', () => {
  const createTestGame = () => {
    const drawPile = Array.from({ length: 40 }, (_, i) => ({
      id: `c_${i}`,
      name: `Lá bài ${i}`,
      type: 'basic',
      suit: 'heart',
      color: 'red'
    }));

    const players = [
      {
        id: 0,
        name: 'Player 0',
        mainHeroId: 'tran-nhat-duat', // 3 HP
        subHeroId: 'nguyen-dia-lo',   // 4 HP -> Tổng 7 (LẺ)
        hp: 3,
        maxHp: 3,
        faction: 'ha',
        hand: [],
        revealedHeroes: [false, false]
      },
      {
        id: 1,
        name: 'Player 1',
        mainHeroId: 'thanh-giong',   // 4 HP
        subHeroId: 'lac-long-quan',  // 4 HP -> Tổng 8 (CHẴN)
        hp: 4,
        maxHp: 4,
        faction: 'lac',
        hand: [],
        revealedHeroes: [false, false]
      }
    ];

    return new GameState({ players, drawPile, currentTurnPlayerId: 0 });
  };

  it('1. Tiên Phong: Người chơi ĐẦU TIÊN lật tướng trong ván đấu nhận thưởng ngay 2 lá bài', () => {
    const state = createTestGame();
    const dispatcher = new DispatcherV4(state);

    // Player 0 bắt đầu với 0 bài trên tay
    expect(state.getPlayer(0).hand.length).toBe(0);

    // Player 0 mở tướng chính (Trần Nhật Duật)
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 0, heroIndex: 0 }
    });

    // Là người đầu tiên trong ván đấu -> Nhận thưởng Tiên Phong 2 lá bài!
    expect(state.getPlayer(0).hand.length).toBe(2);
    expect(state.hasPioneerRewardClaimed).toBe(true);
    expect(state.pioneerPlayerId).toBe(0);

    // Người chơi 1 sau đó mới mở tướng chính
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 1, heroIndex: 0 }
    });

    // Không phải người đầu tiên nữa -> Không nhận thưởng Tiên Phong
    expect(state.getPlayer(1).hand.length).toBe(0);
  });

  it('2. Âm Dương Giao Hoà: Cặp tướng có tổng máu LẺ (3 + 4 = 7) khi mở full cả 2 tướng nhận thêm 1 lá bài', () => {
    const state = createTestGame();
    const dispatcher = new DispatcherV4(state);

    // Player 0 mở tướng 1 -> Nhận 2 lá Tiên phong
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 0, heroIndex: 0 }
    });
    expect(state.getPlayer(0).hand.length).toBe(2);

    // Player 0 mở tiếp tướng 2 (Nguyễn Địa Lô)
    // Tổng máu: 3 + 4 = 7 (lẻ) -> Nhận thêm 1 lá thưởng Âm Dương Ngư!
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 0, heroIndex: 1 }
    });

    expect(state.getPlayer(0).revealedHeroes).toEqual([true, true]);
    expect(state.getPlayer(0).hasReceivedYinYangReward).toBe(true);
    expect(state.getPlayer(0).hand.length).toBe(3); // 2 Tiên phong + 1 Âm Dương = 3 lá!
  });

  it('3. Tổng máu CHẴN (4 + 4 = 8) khi mở full cả 2 tướng sẽ KHÔNG nhận thưởng bù máu lẻ', () => {
    const state = createTestGame();
    state.hasPioneerRewardClaimed = true; // Giả lập Tiên phong đã được nhận trước đó
    const dispatcher = new DispatcherV4(state);

    // Player 1 (4 HP + 4 HP = 8 CHẴN) mở tướng 1
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 1, heroIndex: 0 }
    });
    expect(state.getPlayer(1).hand.length).toBe(0);

    // Player 1 mở tiếp tướng 2
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 1, heroIndex: 1 }
    });

    expect(state.getPlayer(1).revealedHeroes).toEqual([true, true]);
    expect(state.getPlayer(1).hasReceivedYinYangReward).toBeFalsy();
    expect(state.getPlayer(1).hand.length).toBe(0); // Không có thưởng máu lẻ
  });

  it('4. Giới tính Tướng Ẩn: Chưa lật tướng có giới tính là none; lật tướng nào cập nhật theo tướng đó', () => {
    const state = createTestGame();
    const dispatcher = new DispatcherV4(state);

    const p0 = state.getPlayer(0); // main: tran-nhat-duat (nam), sub: nguyen-dia-lo (nam)
    const p1 = state.getPlayer(1); // main: thanh-giong (nam), sub: lac-long-quan (nam)

    // Lúc đầu chưa lật tướng -> giới tính là 'none'
    expect(getPlayerGender(p0)).toBe('none');
    expect(getPlayerGender(p1)).toBe('none');

    // Lật tướng chính của p0
    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 0, heroIndex: 0 }
    });
    expect(getPlayerGender(p0)).toBe('male');
    expect(p0.gender).toBe('male');
  });

  it('5. Tương tác Song Kiếm: Không kích hoạt ép bỏ bài nếu mục tiêu hoặc người chém chưa lật tướng', () => {
    const state = createTestGame();
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    // Gán p0 là nữ, p1 là nam
    p0.gender = 'female';
    p1.gender = 'male';

    p0.equipment.weapon = { id: 'song_kiem', name: 'Song Kiếm', type: 'weapon' };
    p0.hand = [{ id: 'slash_1', name: 'Chém', type: 'slash', suit: 'diamond', color: 'red' }];
    p1.hand = [{ id: 'card_p1', name: 'Thẻ P1' }];

    // Cả 2 chưa lật tướng (revealedHeroes: [false, false]) -> Giới tính đều là 'none'
    // p0 chém p1 bằng Song Kiếm
    CombatRules.playSlash(state, 0, 1, p0.hand[0]);

    // Vì giới tính là 'none' -> Song Kiếm KHÔNG kích hoạt ép bỏ bài!
    expect(p1.hand.length).toBe(1);

    // Bây giờ lật cả 2 tướng lên
    p0.revealedHeroes = [true, false];
    p1.revealedHeroes = [true, false];
    state.priorityStack.clear();
    p0.turnStats.slashCount = 0;

    const slash2 = { id: 'slash_2', name: 'Chém', type: 'slash', suit: 'heart', color: 'red' };
    p0.hand.push(slash2);

    // p0 chém p1 khi cả 2 đã lộ diện và khác giới tính (female vs male)
    CombatRules.playSlash(state, 0, 1, slash2);

    // Song Kiếm kích hoạt -> p1 bị ép bỏ 1 lá bài!
    expect(p1.hand.length).toBe(0);
  });

  it('6. Lật đồng thời cả 2 tướng với heroIndex = "all"', () => {
    const state = createTestGame();
    const dispatcher = new DispatcherV4(state);

    dispatcher.dispatchAction({
      type: 'ACTION_REVEAL_HERO',
      payload: { playerId: 0, heroIndex: 'all' }
    });

    const p0 = state.getPlayer(0);
    expect(p0.revealedHeroes).toEqual([true, true]);
    // 2 Tiên phong + 1 Âm dương (3+4=7 lẻ) = 3 lá
    expect(p0.hand.length).toBe(3);
    expect(p0.hasReceivedYinYangReward).toBe(true);
  });

  it('7. Bảo mật thông tin: Đối thủ chỉ lộ 1 tướng thì tướng còn lại bị che giấu hoàn toàn trong ViewModel', async () => {
    const { toViewModel } = await import('../../application/GameViewMapperV4.js');
    const state = createTestGame();

    // Đối thủ (Player 1) lật tướng 0 (Thánh Gióng), tướng 1 (Lạc Long Quân) vẫn úp mặt
    state.getPlayer(1).revealedHeroes = [true, false];

    // ViewModel đứng ở góc nhìn của Player 0 (mainPlayerId = 0)
    const vm = toViewModel(state, 0);

    // Bản thân (Player 0) thấy được toàn bộ tướng của mình dù chưa lật
    expect(vm.players[0].heroes[0].name).toBe('Trần Nhật Duật');
    expect(vm.players[0].heroes[1].name).toBe('Nguyễn Địa Lô');

    // Đối thủ (Player 1):
    // Tướng 0 đã lật -> thấy rõ Thánh Gióng
    expect(vm.players[1].heroes[0].name).toBe('Thánh Gióng');
    expect(vm.players[1].heroes[0].isRevealed).toBe(true);

    // Tướng 1 CHƯA lật -> Bị che giấu thành 'Tướng Ẩn', không rò rỉ tên hay kỹ năng
    expect(vm.players[1].heroes[1].name).toBe('Tướng Ẩn');
    expect(vm.players[1].heroes[1].isRevealed).toBe(false);
    expect(vm.players[1].heroes[1].skills.length).toBe(0);
    expect(vm.players[1].subHeroId).toBeNull();

    // Khi ván đấu kết thúc (gameOver = true) -> Cho phép hiển lộ để xem tổng kết
    state.gameOver = true;
    const vmGameOver = toViewModel(state, 0);
    expect(vmGameOver.players[1].heroes[1].name).toBe('Lạc Long Quân');
  });

  it('8. Tử trận (Death): Người chơi tử trận tự động công khai cả 2 tướng và phe phái cho toàn bàn cờ', () => {
    const state = createTestGame();
    const p1 = state.getPlayer(1);

    // Ban đầu p1 chưa lật tướng nào
    expect(p1.revealedHeroes).toEqual([false, false]);

    // Xử lý tử trận cho p1
    CombatRules.handleDeath(state, 1, 0);

    expect(p1.isAlive).toBe(false);
    expect(p1.revealedHeroes).toEqual([true, true]);
    expect(p1.isRevealed).toBe(true);

    const deathLog = state.logs.find(l => (typeof l === 'string' ? l : l.message).includes('ĐÃ TỬ TRẬN'));
    expect(deathLog).toBeTruthy();
    const logText = typeof deathLog === 'string' ? deathLog : deathLog.message;
    expect(logText).toContain('Thánh Gióng');
    expect(logText).toContain('Lạc Long Quân');
    expect(logText).toContain('LAC');
  });

  it('9. Bảo mật Phe Phái & Giới Tính: Đối thủ chưa lật tướng nào thì faction, gender, skills đều là none/empty', async () => {
    const { toViewModel } = await import('../../application/GameViewMapperV4.js');
    const { getPlayerFaction, getPlayerGender } = await import('../../index.js');
    const state = createTestGame();

    const p1 = state.getPlayer(1);
    // p1 chưa lật tướng nào
    expect(getPlayerFaction(p1)).toBe('none');
    expect(getPlayerGender(p1)).toBe('none');

    // Trong ViewModel của Player 0:
    const vm = toViewModel(state, 0);
    expect(vm.players[1].faction).toBe('none');
    expect(vm.players[1].gender).toBe('none');
    expect(vm.players[1].skills).toEqual([]);
    expect(vm.players[1].mainHeroId).toBeNull();
    expect(vm.players[1].subHeroId).toBeNull();
  });

  it('10. Tiên Phát: Không thể kêu gọi đồng minh khi đồng minh chưa lộ diện tướng', () => {
    const state = createTestGame();
    const p0 = state.getPlayer(0); // Lý Thường Kiệt (Phe Việt)
    p0.faction = 'viet';
    p0.skills = ['tien_phat'];
    p0.revealedHeroes = [true, false];

    const p1 = state.getPlayer(1); // Đồng minh Việt
    p1.faction = 'viet';
    p1.hand = [{ id: 'd_1', name: 'Né', type: 'dodge' }];
    // p1 CHƯA lật tướng nào (đang ẩn danh)
    p1.revealedHeroes = [false, false];

    // Bị tấn công, đẩy frame ASK_DODGE vào stack
    state.priorityStack.push({
      type: 'ASK_DODGE',
      sourceId: 2,
      targetId: 0,
      currentActorId: 0,
      priorityQueue: [0],
      context: { requiredDodges: 1, dodgesProvided: 0, damageAmount: 1 }
    });

    // Kích hoạt Tiên Phát khi bị tấn công
    const result = CombatRules.respondDodge(state, 0, null, { doTienPhat: true });

    // Vì đồng minh chưa lật tướng -> Không tìm thấy đồng minh hợp lệ nào!
    expect(result.calledAllies).toBeUndefined();
    const log = state.logs.find(l => (typeof l === 'string' ? l : l.message).includes('Không có đồng minh'));
    expect(log).toBeTruthy();
  });
});



