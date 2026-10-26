import { describe, it, expect } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { toViewModel } from '../../application/GameViewMapperV4.js';

function createMockState(playerCount = 4) {
  return new GameState({
    mode: 'standard',
    enableLog: false,
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: i,
      name: i === 0 ? 'Bạn' : `Người chơi ${i + 1}`,
      hp: 4,
      maxHp: 4,
      hand: [],
      equipment: { weapon: null, armor: null, defensiveHorse: null, offensiveHorse: null },
      judgementArea: [],
      temporaryFlags: {},
      isAlive: true,
      revealedHeroes: [false, false]
    }))
  });
}

describe('Tầng 2 QA: ViewModel Contract Guard (Bảo vệ Hợp đồng Dữ liệu Engine - UI)', () => {
  const frameTypes = [
    { type: 'ASK_SLASH_DUEL', expectedType: 'ask_slash' },
    { type: 'ASK_SLASH_RESPONSE', expectedType: 'ask_slash' },
    { type: 'ASK_NEGATE', expectedType: 'ask_negate' },
    { type: 'ASK_DODGE', expectedType: 'ask_dodge' },
    { type: 'ASK_PEACH', expectedType: 'ask_peach' },
    { type: 'ASK_DISCARD', expectedType: 'discard_phase' },
    { type: 'ASK_HAU_VIEN', expectedType: 'ask_hau_vien' },
    { type: 'ASK_WEAPON_SKILL', expectedType: 'ask_weapon_skill' },
    { type: 'ASK_DISMANTLE', expectedType: 'ask_dismantle' },
    { type: 'ASK_SNATCH', expectedType: 'ask_snatch' },
    { type: 'ASK_CHANGE_JUDGE', expectedType: 'ask_change_judge' },
    { type: 'ASK_TIEN_PHAT', expectedType: 'ask_tien_phat' },
    { type: 'ASK_HOACONG_REVEAL', expectedType: 'ask_hoacong_reveal' },
    { type: 'ASK_HOACONG_DISCARD', expectedType: 'ask_hoacong_discard' },
    { type: 'ASK_HIEN_HAU', expectedType: 'ask_hien_hau' },
    { type: 'ASK_DUYEN_THO', expectedType: 'ask_duyen_tho' },
    { type: 'ASK_HOA_THAN_AN_TU', expectedType: 'ask_hoa_than_an_tu' },
    { type: 'ASK_BOC_TRAM_TRUNG_SLASH', expectedType: 'ask_boc_tram_trung_slash' },
    { type: 'ASK_JUDGEMENT_ROLL', expectedType: 'ask_judgement_roll' },
    { type: 'ASK_JUDGEMENT_RESULT', expectedType: 'ask_judgement_result' }
  ];

  describe('1. Zero-Falsy Eradication: Tuyệt đối không để số 0 bị nuốt thành ID khác', () => {
    frameTypes.forEach(({ type, expectedType }) => {
      it(`Frame ${type} với currentActorId = 0 phải cho responderId = 0 trên ViewModel`, () => {
        const state = createMockState(4);

        // Đẩy frame với currentActorId = 0 (Bạn), nhưng targetId = 3, sourceId = 3
        // Giả lập bối cảnh dễ gây bug falsy 0 nhất (0 || 3)
        state.priorityStack.push({
          id: `frame_${type}_0`,
          type,
          currentActorId: 0,
          sourceId: 3,
          targetId: 3,
          priorityQueue: [0],
          context: {
            currentResponderId: 0,
            attackerId: 3,
            targetId: 0,
            weapon: 'Rìu Đá',
            reason: type === 'ASK_SLASH_DUEL' ? 'quyet-dau' : 'test'
          }
        });

        const vm = toViewModel(state, 0);

        expect(vm.waitingForResponse).toBeDefined();
        expect(vm.waitingForResponse.id).toBe(`frame_${type}_0`);
        expect(vm.waitingForResponse.type).toBe(expectedType);

        // ĐÂY LÀ ĐIỀU KIỆN SỐNG CÒN CỦA DỰ ÁN:
        // responderId BẮT BUỘC phải là 0, không bao giờ được là 3 do toán tử ||
        expect(vm.waitingForResponse.responderId).toBe(0);
      });
    });
  });

  describe('2. Anti-Context-Override: Context cũ không được ghi đè responderId', () => {
    frameTypes.forEach(({ type }) => {
      it(`Frame ${type} có context chứa responderId rác vẫn phải giữ đúng currentActorId = 0`, () => {
        const state = createMockState(4);

        state.priorityStack.push({
          id: `frame_override_${type}`,
          type,
          currentActorId: 0,
          sourceId: 2,
          targetId: 2,
          context: {
            responderId: 999, // Giá trị rác trong context
            currentResponderId: 0
          }
        });

        const vm = toViewModel(state, 0);
        expect(vm.waitingForResponse.responderId).toBe(0);
      });
    });
  });

  describe('3. Multi-Player ID Uniformity: Đúng với mọi ID người chơi (0, 1, 2, 3)', () => {
    [0, 1, 2, 3].forEach(playerId => {
      it(`toViewModel gán chính xác responderId = ${playerId} khi currentActorId = ${playerId}`, () => {
        const state = createMockState(4);

        state.priorityStack.push({
          id: `frame_p_${playerId}`,
          type: 'ASK_SLASH_DUEL',
          currentActorId: playerId,
          sourceId: (playerId + 1) % 4,
          targetId: playerId,
          context: {
            currentResponderId: playerId,
            attackerId: (playerId + 1) % 4
          }
        });

        const vm = toViewModel(state, 0);
        expect(vm.waitingForResponse.responderId).toBe(playerId);
      });
    });
  });
});
