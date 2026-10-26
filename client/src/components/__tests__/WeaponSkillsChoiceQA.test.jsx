// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameState } from 'shared/engine_v4/core/GameState.js';
import { CombatRules } from 'shared/engine_v4/rules/CombatRules.js';
import { DispatcherV4 } from 'shared/engine_v4/application/DispatcherV4.js';
import { GameViewMapperV4 } from 'shared/engine_v4/application/GameViewMapperV4.js';
import { BotBrain } from 'shared/engine_v4/ai/BotBrain.js';
import { ModalContainer } from '../modals/ModalContainer.jsx';
import { AskWeaponSkillModal } from '../modals/AskWeaponSkillModal.jsx';
import * as GameProvider from '../../contexts/GameProvider.jsx';

const mockRespond = vi.fn();
vi.mock('../../contexts/GameProvider.jsx', () => ({
  useGameState: vi.fn(),
  useGameAPI: vi.fn(),
}));

describe('QA Hệ Thống Lựa Chọn Kỹ Năng Vũ Khí (Weapon Skills Choice QA: Rìu Đá, Thanh Long Đao, Song Kiếm)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.playerId = 0;
    GameProvider.useGameAPI.mockReturnValue({
      respond: mockRespond
    });
  });

  describe('1. Rìu Đá (Rock Axe) - Hỏi người chơi chọn 2 lá bỏ hoặc bỏ qua', () => {
    it('1.1. Khi đòn Chém bị Né, đẩy frame ASK_WEAPON_SKILL hỏi người cầm Rìu Đá thay vì tự động vứt bài', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'P0 Chủ Rìu',
            gender: 'male',
            hp: 4,
            maxHp: 4,
            isAlive: true,
            hand: [
              { id: 'c_peach', name: 'Đào', type: 'peach' },
              { id: 'c_junk1', name: 'Sát Khí 1', type: 'basic' },
              { id: 'c_junk2', name: 'Sát Khí 2', type: 'basic' }
            ],
            equipment: { weapon: { id: 'wp_axe', name: 'Rìu Đá', range: 3 } }
          },
          {
            id: 1,
            name: 'P1 Mục Tiêu',
            gender: 'male',
            hp: 3,
            maxHp: 3,
            isAlive: true,
            hand: [{ id: 'c_dodge', name: 'Né', type: 'dodge' }],
            equipment: {}
          }
        ]
      });

      const slashCard = { id: 's1', name: 'Chém', type: 'slash' };
      state.getPlayer(0).hand.push(slashCard);

      // P0 chém P1
      CombatRules.playSlash(state, 0, 1, slashCard);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');

      // P1 đánh Né -> Rìu Đá KHÔNG được tự động vứt 2 lá đầu tiên (c_peach)!
      const resDodge = CombatRules.respondDodge(state, 1, state.getPlayer(1).hand[0]);
      expect(resDodge.dodged).toBe(true);
      expect(resDodge.pendingWeaponSkill).toBe(true);

      // Kiểm tra frame ASK_WEAPON_SKILL đã được đẩy lên đỉnh stack
      const weaponFrame = state.priorityStack.peek();
      expect(weaponFrame).toBeDefined();
      expect(weaponFrame.type).toBe('ASK_WEAPON_SKILL');
      expect(weaponFrame.currentActorId).toBe(0);
      expect(weaponFrame.context.weapon).toBe('Rìu Đá');

      // Bài trên tay P0 vẫn còn nguyên, Đào không bị cướp mất
      expect(state.getPlayer(0).hand.some(c => c.id === 'c_peach')).toBe(true);
      expect(state.getPlayer(0).hand.length).toBe(3);
    });

    it('1.2. Dispatcher xử lý người chơi chọn 2 lá rác chỉ định -> Xuyên Né gây sát thương', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'P0 Chủ Rìu',
            gender: 'male',
            hp: 4,
            maxHp: 4,
            isAlive: true,
            hand: [
              { id: 'c_peach', name: 'Đào', type: 'peach' },
              { id: 'c_junk1', name: 'Rác 1', type: 'basic' },
              { id: 'c_junk2', name: 'Rác 2', type: 'basic' }
            ],
            equipment: { weapon: { id: 'wp_axe', name: 'Rìu Đá', range: 3 } }
          },
          {
            id: 1,
            name: 'P1 Mục Tiêu',
            gender: 'male',
            hp: 3,
            maxHp: 3,
            isAlive: true,
            hand: [{ id: 'c_dodge', name: 'Né', type: 'dodge' }],
            equipment: {}
          }
        ]
      });

      const dispatcher = new DispatcherV4(state, {
        handleDiscard: vi.fn(),
        _completeBeginPhase: vi.fn(),
        _completeDrawPhase: vi.fn(),
        _checkDiscardLimit: vi.fn()
      });

      const slashCard = { id: 's1', name: 'Chém', type: 'slash' };
      state.getPlayer(0).hand.push(slashCard);
      CombatRules.playSlash(state, 0, 1, slashCard);

      // P1 né qua Dispatcher
      dispatcher._handleReact({ playerId: 1, responseType: 'react', cardId: 'c_dodge', doReact: true });

      // Frame hiện tại là ASK_WEAPON_SKILL cho P0
      expect(state.priorityStack.peek().type).toBe('ASK_WEAPON_SKILL');

      // P0 phản hồi: Chọn 2 lá rác 1 và 2 (giữ lại Đào)
      dispatcher._handleReact({
        playerId: 0,
        responseType: 'react',
        data: {
          doUse: true,
          cardIds: ['c_junk1', 'c_junk2']
        }
      });

      // Frame ASK_WEAPON_SKILL đã được pop
      expect(state.priorityStack.isEmpty()).toBe(true);

      // P1 nhận 1 sát thương (3 - 1 = 2)
      expect(state.getPlayer(1).hp).toBe(2);

      // P0 chỉ mất 2 lá rác, giữ được lá Đào quý giá
      expect(state.getPlayer(0).hand.length).toBe(1);
      expect(state.getPlayer(0).hand[0].id).toBe('c_peach');
    });

    it('1.3. Dispatcher xử lý người chơi bấm "Bỏ qua" (doUse: false) -> Giữ nguyên toàn bộ bài, P1 né an toàn', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'P0 Chủ Rìu',
            gender: 'male',
            hp: 4,
            maxHp: 4,
            isAlive: true,
            hand: [
              { id: 'c_peach', name: 'Đào', type: 'peach' },
              { id: 'c_wine', name: 'Rượu', type: 'wine' }
            ],
            equipment: { weapon: { id: 'wp_axe', name: 'Rìu Đá', range: 3 } }
          },
          {
            id: 1,
            name: 'P1 Mục Tiêu',
            gender: 'male',
            hp: 3,
            maxHp: 3,
            isAlive: true,
            hand: [{ id: 'c_dodge', name: 'Né', type: 'dodge' }],
            equipment: {}
          }
        ]
      });

      const dispatcher = new DispatcherV4(state, {
        handleDiscard: vi.fn(),
        _completeBeginPhase: vi.fn(),
        _completeDrawPhase: vi.fn(),
        _checkDiscardLimit: vi.fn()
      });

      const slashCard = { id: 's1', name: 'Chém', type: 'slash' };
      state.getPlayer(0).hand.push(slashCard);
      CombatRules.playSlash(state, 0, 1, slashCard);

      dispatcher._handleReact({ playerId: 1, responseType: 'react', cardId: 'c_dodge', doReact: true });
      expect(state.priorityStack.peek().type).toBe('ASK_WEAPON_SKILL');

      // P0 bấm Bỏ qua vì chỉ có Đào và Rượu, không muốn vứt
      dispatcher._handleReact({
        playerId: 0,
        responseType: 'react',
        data: {
          doUse: false
        }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(state.getPlayer(1).hp).toBe(3); // P1 không mất máu
      expect(state.getPlayer(0).hand.length).toBe(2); // P0 không mất lá nào
    });
  });

  describe('2. Thanh Long Đao (Dragon Blade) - Hỏi người chơi chọn lá Chém bồi thêm hoặc bỏ qua', () => {
    it('2.1. Khi Chém bị Né, đẩy frame ASK_WEAPON_SKILL cho Thanh Long Đao, không tự ý chém bồi', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'P0 Chủ Đao',
            gender: 'male',
            hp: 4,
            maxHp: 4,
            isAlive: true,
            hand: [{ id: 's2', name: 'Chém', type: 'slash' }],
            equipment: { weapon: { id: 'wp_dragon', name: 'Thanh Long Đao', range: 3 } }
          },
          {
            id: 1,
            name: 'P1',
            gender: 'male',
            hp: 3,
            maxHp: 3,
            isAlive: true,
            hand: [{ id: 'd1', name: 'Né', type: 'dodge' }],
            equipment: {}
          }
        ]
      });

      const s1 = { id: 's1', name: 'Chém', type: 'slash' };
      state.getPlayer(0).hand.push(s1);
      CombatRules.playSlash(state, 0, 1, s1);

      const res = CombatRules.respondDodge(state, 1, state.getPlayer(1).hand[0]);
      expect(res.dodged).toBe(true);
      expect(res.pendingWeaponSkill).toBe(true);

      const frame = state.priorityStack.peek();
      expect(frame.type).toBe('ASK_WEAPON_SKILL');
      expect(frame.context.weapon).toBe('Thanh Long Đao');
      // Lá s2 vẫn còn trên tay, chưa bị tự động lấy
      expect(state.getPlayer(0).hand.some(c => c.id === 's2')).toBe(true);
    });

    it('2.2. Dispatcher xử lý người chơi từ chối chém tiếp -> Kết thúc an toàn', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'P0 Chủ Đao',
            gender: 'male',
            hp: 4,
            maxHp: 4,
            isAlive: true,
            hand: [{ id: 's2', name: 'Chém', type: 'slash' }],
            equipment: { weapon: { id: 'wp_dragon', name: 'Thanh Long Đao', range: 3 } }
          },
          {
            id: 1,
            name: 'P1',
            gender: 'male',
            hp: 3,
            maxHp: 3,
            isAlive: true,
            hand: [{ id: 'd1', name: 'Né', type: 'dodge' }],
            equipment: {}
          }
        ]
      });

      const dispatcher = new DispatcherV4(state, {
        handleDiscard: vi.fn(),
        _completeBeginPhase: vi.fn(),
        _completeDrawPhase: vi.fn(),
        _checkDiscardLimit: vi.fn()
      });

      const s1 = { id: 's1', name: 'Chém', type: 'slash' };
      state.getPlayer(0).hand.push(s1);
      CombatRules.playSlash(state, 0, 1, s1);
      dispatcher._handleReact({ playerId: 1, responseType: 'react', cardId: 'd1', doReact: true });

      // P0 chọn Bỏ qua
      dispatcher._handleReact({
        playerId: 0,
        responseType: 'react',
        data: { doUse: false }
      });

      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(state.getPlayer(0).hand.length).toBe(1);
      expect(state.getPlayer(0).hand[0].id).toBe('s2');
      expect(state.getPlayer(1).hp).toBe(3);
    });
  });

  describe('3. Song Kiếm (Twin Swords) - Hỏi nạn nhân khác giới tự chọn bài bỏ hoặc cho địch rút', () => {
    it('3.1. Chém khác giới tính với Song Kiếm đẩy ASK_WEAPON_SKILL cho nạn nhân trên đỉnh stack', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'P0 Nam',
            gender: 'male',
            hp: 4,
            maxHp: 4,
            isAlive: true,
            hand: [],
            equipment: { weapon: { id: 'wp_twin', name: 'Song Kiếm', range: 2 } }
          },
          {
            id: 1,
            name: 'P1 Nữ',
            gender: 'female',
            hp: 3,
            maxHp: 3,
            isAlive: true,
            hand: [
              { id: 'c_save', name: 'Đào', type: 'peach' },
              { id: 'c_drop', name: 'Rác', type: 'basic' }
            ],
            equipment: {}
          }
        ]
      });

      const slash = { id: 's1', name: 'Chém', type: 'slash' };
      state.getPlayer(0).hand.push(slash);

      CombatRules.playSlash(state, 0, 1, slash, { interactiveSongKiem: true });

      // Đỉnh stack phải là ASK_WEAPON_SKILL của Song Kiếm cho P1 Nữ
      const topFrame = state.priorityStack.peek();
      expect(topFrame.type).toBe('ASK_WEAPON_SKILL');
      expect(topFrame.currentActorId).toBe(1);
      expect(topFrame.context.weapon).toBe('Song Kiếm');

      // Không bị cướp lá Đào đầu tiên
      expect(state.getPlayer(1).hand.length).toBe(2);
    });

    it('3.2. Nạn nhân chọn bỏ 1 lá rác chỉ định -> Kẻ địch không được rút bài', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'P0 Nam',
            gender: 'male',
            hp: 4,
            maxHp: 4,
            isAlive: true,
            hand: [],
            equipment: { weapon: { id: 'wp_twin', name: 'Song Kiếm', range: 2 } }
          },
          {
            id: 1,
            name: 'P1 Nữ',
            gender: 'female',
            hp: 3,
            maxHp: 3,
            isAlive: true,
            hand: [
              { id: 'c_save', name: 'Đào', type: 'peach' },
              { id: 'c_drop', name: 'Rác', type: 'basic' }
            ],
            equipment: {}
          }
        ]
      });

      const dispatcher = new DispatcherV4(state, {
        handleDiscard: vi.fn(),
        _completeBeginPhase: vi.fn(),
        _completeDrawPhase: vi.fn(),
        _checkDiscardLimit: vi.fn()
      });

      const slash = { id: 's1', name: 'Chém', type: 'slash' };
      state.getPlayer(0).hand.push(slash);
      CombatRules.playSlash(state, 0, 1, slash, { interactiveSongKiem: true });

      // P1 tự chọn bỏ c_drop
      dispatcher._handleReact({
        playerId: 1,
        responseType: 'react',
        data: {
          doUse: true,
          cardId: 'c_drop'
        }
      });

      // P1 mất c_drop, giữ được c_save
      expect(state.getPlayer(1).hand.length).toBe(1);
      expect(state.getPlayer(1).hand[0].id).toBe('c_save');
      // P0 không được rút bài
      expect(state.getPlayer(0).hand.length).toBe(0);
      // Stack bây giờ lộ ra ASK_DODGE
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });

    it('3.3. Nạn nhân chọn "Bỏ qua" (không bỏ bài) -> Người tấn công được rút 1 lá bài', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'P0 Nam',
            gender: 'male',
            hp: 4,
            maxHp: 4,
            isAlive: true,
            hand: [],
            equipment: { weapon: { id: 'wp_twin', name: 'Song Kiếm', range: 2 } }
          },
          {
            id: 1,
            name: 'P1 Nữ',
            gender: 'female',
            hp: 3,
            maxHp: 3,
            isAlive: true,
            hand: [{ id: 'c_save', name: 'Đào', type: 'peach' }],
            equipment: {}
          }
        ]
      });
      state.drawPile = [{ id: 'card_drawn', name: 'Bài Mới', type: 'basic' }];

      const dispatcher = new DispatcherV4(state, {
        handleDiscard: vi.fn(),
        _completeBeginPhase: vi.fn(),
        _completeDrawPhase: vi.fn(),
        _checkDiscardLimit: vi.fn()
      });

      const slash = { id: 's1', name: 'Chém', type: 'slash' };
      state.getPlayer(0).hand.push(slash);
      CombatRules.playSlash(state, 0, 1, slash, { interactiveSongKiem: true });

      // P1 từ chối bỏ bài (bấm Bỏ qua)
      dispatcher._handleReact({
        playerId: 1,
        responseType: 'react',
        data: { doUse: false }
      });

      // P1 giữ nguyên bài
      expect(state.getPlayer(1).hand.length).toBe(1);
      // P0 được rút 1 lá bài từ deck
      expect(state.getPlayer(0).hand.length).toBe(1);
      expect(state.getPlayer(0).hand[0].id).toBe('card_drawn');
      // Stack lộ ra ASK_DODGE
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });
  });

  describe('4. UI ModalContainer & AskWeaponSkillModal Interactive Rendering', () => {
    it('4.1. Modal hiển thị đúng thông tin Rìu Đá, cho phép chọn 2 lá và bấm "Xuyên Né!"', () => {
      const mockGameState = {
        players: [
          {
            id: 0,
            name: 'P0 Chủ Nhân',
            hand: [
              { id: 'c1', name: 'Bài 1', suit: 'spade', rank: '7', color: 'black' },
              { id: 'c2', name: 'Bài 2', suit: 'heart', rank: '8', color: 'red' },
              { id: 'c3', name: 'Bài 3', suit: 'club', rank: '9', color: 'black' }
            ],
            equipment: { weapon: { id: 'wp_axe', name: 'Rìu Đá' } }
          }
        ],
        waitingForResponse: {
          id: 'req_axe_1',
          type: 'ask_weapon_skill',
          weapon: 'Rìu Đá',
          sourceId: 0,
          targetId: 1,
          responderId: 0
        }
      };

      GameProvider.useGameState.mockReturnValue(mockGameState);

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getByText(/⚔️ Rìu Đá/i)).toBeDefined();
      expect(screen.getByText(/Chọn 2 lá bài/i)).toBeDefined();

      const btnConfirm = screen.getByText(/Xuyên Né!/i);
      expect(btnConfirm.disabled).toBe(true);

      // Click chọn 2 lá bài Bài 1 và Bài 2
      fireEvent.click(screen.getByText('Bài 1'));
      fireEvent.click(screen.getByText('Bài 2'));

      expect(btnConfirm.disabled).toBe(false);

      fireEvent.click(btnConfirm);
      expect(mockRespond).toHaveBeenCalledWith({
        playerId: 0,
        doUse: true,
        cardIndexes: [0, 1],
        equipIndexes: [],
        cardIds: ['c1', 'c2'],
        equipIds: []
      });
    });

    it('4.2. Modal hiển thị nút "Bỏ qua", khi click gửi payload doUse: false', () => {
      const mockGameState = {
        players: [
          {
            id: 0,
            name: 'P0',
            hand: [{ id: 'c1', name: 'Bài 1' }],
            equipment: {}
          }
        ],
        waitingForResponse: {
          id: 'req_axe_2',
          type: 'ask_weapon_skill',
          weapon: 'Rìu Đá',
          sourceId: 0,
          targetId: 1,
          responderId: 0
        }
      };

      GameProvider.useGameState.mockReturnValue(mockGameState);

      render(<ModalContainer mainPlayerId={0} />);

      const btnSkip = screen.getByText('Bỏ qua');
      fireEvent.click(btnSkip);

      expect(mockRespond).toHaveBeenCalledWith({
        playerId: 0,
        doUse: false
      });
    });
  });

  describe('5. Trí tuệ nhân tạo BotBrain ra quyết định chiến thuật cho ASK_WEAPON_SKILL', () => {
    it('5.1. Bot dùng Rìu Đá chọn 2 lá bài rác (không bỏ Đào) khi mục tiêu là kẻ địch sắp chết', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'Bot Axe',
            faction: 'viet',
            hand: [
              { id: 'c_peach', name: 'Đào', type: 'peach' },
              { id: 'junk1', name: 'Rác 1', type: 'basic' },
              { id: 'junk2', name: 'Rác 2', type: 'basic' }
            ],
            equipment: { weapon: { id: 'wp_axe', name: 'Rìu Đá' } }
          },
          {
            id: 1,
            name: 'Enemy Target',
            faction: 'ha',
            hp: 1, // Sắp chết!
            isAlive: true,
            hand: [],
            equipment: {}
          }
        ]
      });

      const frame = {
        type: 'ASK_WEAPON_SKILL',
        sourceId: 0,
        targetId: 1,
        currentActorId: 0,
        context: {
          weapon: 'Rìu Đá',
          damageAmount: 1
        }
      };

      const decision = BotBrain.decideReaction(state, 0, frame);
      expect(decision.doUse).toBe(true);
      expect(decision.cardIds.length).toBe(2);
      expect(decision.cardIds).not.toContain('c_peach');
    });

    it('5.2. Bot với Rìu Đá từ chối kích hoạt nếu chỉ toàn bài quan trọng (Đào)', () => {
      const state = new GameState({
        players: [
          {
            id: 0,
            name: 'Bot Axe',
            faction: 'viet',
            hand: [
              { id: 'c_peach1', name: 'Đào', type: 'peach' },
              { id: 'c_peach2', name: 'Đào', type: 'peach' }
            ],
            equipment: { weapon: { id: 'wp_axe', name: 'Rìu Đá' } }
          },
          {
            id: 1,
            name: 'Enemy Target',
            faction: 'ha',
            hp: 3,
            isAlive: true,
            hand: [],
            equipment: {}
          }
        ]
      });

      const frame = {
        type: 'ASK_WEAPON_SKILL',
        sourceId: 0,
        targetId: 1,
        currentActorId: 0,
        context: {
          weapon: 'Rìu Đá',
          damageAmount: 1
        }
      };

      const decision = BotBrain.decideReaction(state, 0, frame);
      expect(decision.doUse).toBe(false);
      expect(decision.canceled).toBe(true);
    });
  });
});
