import { describe, it, expect, vi } from 'vitest';
import { RangeSystem, getEquipmentSlot } from '../../rules/RangeSystem.js';
import { getAvailableTargets, getTargetingDefinition } from '../../rules/TargetResolverV4.js';
import { BotRunnerV4 } from '../../application/BotRunnerV4.js';

describe('QA Mượn Đao với Thanh Long Đao & BotRunner Chống Đứng Hình', () => {
  describe('1. RangeSystem & getEquipmentSlot hỗ trợ cấu trúc Array Equipment', () => {
    it('1.1. Nhận diện Thanh Long Đao và trả về tầm 3 khi equipment là mảng', () => {
      const playerWithArrayEquip = {
        id: 1,
        isAlive: true,
        hp: 3,
        equipment: [
          { id: 'wp_thanh_long', name: 'Thanh Long Đao', type: 'equip', subtype: 'equip_weapon' }
        ]
      };

      const weapon = getEquipmentSlot(playerWithArrayEquip, 'weapon');
      expect(weapon).toBeDefined();
      expect(weapon.name).toBe('Thanh Long Đao');

      const attackRange = RangeSystem.getAttackRange(playerWithArrayEquip);
      expect(attackRange).toBe(3);
    });

    it('1.2. Nhận diện Ngựa công và Ngựa thủ khi equipment là mảng', () => {
      const source = {
        id: 0,
        isAlive: true,
        equipment: [{ id: 'horse_atk', name: 'Ngựa Chiến (-1)', subtype: 'horse_attack' }]
      };
      const target = {
        id: 1,
        isAlive: true,
        equipment: [{ id: 'horse_def', name: 'Ngựa Thần (+1)', subtype: 'horse_defense' }]
      };
      const alive = [source, target];

      // Khoảng cách vòng tròn cơ bản: 1. Source -1, Target +1 -> effective = 1 - 1 + 1 = 1
      const dist = RangeSystem.calculateDistance(source, target, alive);
      expect(dist).toBe(1);
    });
  });

  describe('2. Mượn Đao Diệt Địch: Cho phép chọn người chơi mang Thanh Long Đao', () => {
    it('2.1. getAvailableTargets bước 1 hiển thị người mang Thanh Long Đao là mục tiêu hợp lệ', () => {
      const state = {
        players: [
          { id: 0, name: 'Bạn', isAlive: true, hp: 4, equipment: [] },
          { id: 1, name: 'Người chơi 1', isAlive: true, hp: 3, equipment: [] },
          { 
            id: 2, 
            name: 'Người chơi 2', 
            isAlive: true, 
            hp: 4, 
            equipment: [
              { id: 'w_dragon', name: 'Thanh Long Đao', type: 'equip', subtype: 'equip_weapon' }
            ] 
          },
          { id: 3, name: 'Người chơi 3', isAlive: true, hp: 2, equipment: [] }
        ],
        getPlayer: (id) => state.players.find(p => p.id === id),
        getAlivePlayers: () => state.players.filter(p => p.isAlive)
      };

      // P0 muốn dùng Mượn Đao
      const validTargets = getAvailableTargets(state, 0, 'Mượn Đao', 'c_muon_dao', []);
      expect(validTargets).toContain(2); // Người chơi 2 có Thanh Long Đao PHẢI chọn được!
    });
  });

  describe('3. BotRunnerV4: Cơ chế hàng đợi pendingState chống đứng hình / nuốt state', () => {
    it('3.1. Khi isProcessing = true, onStateUpdate lưu vào pendingState và tự động kích hoạt sau đó', () => {
      vi.useFakeTimers();
      const mockGameAPI = {
        dispatcher: {
          state: {
            players: [
              { id: 0, isBot: false, isAlive: true },
              { id: 1, isBot: true, isAlive: true }
            ],
            currentTurnPlayerId: 1,
            currentPhase: 'ACTION',
            priorityStack: { peek: () => null, isEmpty: () => true },
            getPlayer: (id) => mockGameAPI.dispatcher.state.players.find(p => p.id === id)
          }
        },
        endPhase: vi.fn(),
        respond: vi.fn()
      };

      const runner = new BotRunnerV4(mockGameAPI, 'fast');
      runner.isProcessing = true; // Giả lập đang xử lý timer cũ

      const newState = {
        ...mockGameAPI.dispatcher.state,
        currentPhase: 'ACTION'
      };

      runner.onStateUpdate(newState);
      expect(runner.pendingState).toBe(newState);

      // Giải phóng processing
      runner._finishProcessing();
      expect(runner.pendingState).toBeNull();
      vi.useRealTimers();
    });
  });
});
