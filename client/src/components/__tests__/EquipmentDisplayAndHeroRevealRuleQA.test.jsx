// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlayerBoard } from '../game/PlayerBoard.jsx';
import { BotBrain } from '../../../../shared/engine_v4/ai/BotBrain.js';
import { DispatcherV4 } from '../../../../shared/engine_v4/application/DispatcherV4.js';
import { globalHeroRegistry, getPlayerGender } from '../../../../shared/engine_v4/heroes/HeroRegistry.js';
import { CARD_SUBTYPES } from '../../../../shared/constants/cardTypes.js';

describe('QA Toàn Diện: Hiển Thị Trang Bị, Quy Tắc Mở Tướng & Giới Tính (Ảnh 1, 2, 3, 4)', () => {

  describe('1. Hiển thị Trang Bị Ngựa & Slot Trang Bị trên PlayerBoard (Ảnh 1, 2, 3)', () => {
    it('PlayerBoard: hiển thị icon trang bị rõ ràng, badge chỉ số +1/-1 và chất số ♣4, không trơ trọi chất số', () => {
      const mockPlayer = {
        id: 3,
        name: 'Người chơi 4',
        hp: 3,
        maxHp: 3,
        hand: [],
        handCount: 0,
        attackRange: 1,
        distanceFromMe: 2,
        revealedHeroes: [true, true],
        faction: 'Hà',
        heroes: [
          { name: 'Dã Tượng', faction: 'Hà', maxHp: 4 },
          { name: 'Nguyễn Trãi', faction: 'Hà', maxHp: 3 }
        ],
        equipment: {
          weapon: null,
          armor: null,
          horse_attack: null,
          horse_defense: {
            id: 'ngua-than-4-club',
            name: 'Ngựa Thần (+1)',
            suit: 'club',
            rank: '4',
            color: 'black',
            subType: CARD_SUBTYPES.EQUIP_MOUNT_DEF,
            desc: 'Ngựa phòng thủ: Tăng khoảng cách từ người khác đến mình thêm 1.'
          }
        }
      };

      const { container } = render(
        <PlayerBoard
          player={mockPlayer}
          isCurrentTurn={false}
          isTargetable={false}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      // 1. Kiểm tra slot Ngựa thủ được render
      const equipSlots = container.querySelectorAll('.equip-slot');
      expect(equipSlots.length).toBe(4);

      const mountDefSlot = equipSlots[3];
      expect(mountDefSlot.classList.contains('equipped')).toBe(true);

      // 2. Phải có badge chỉ số +1 ở góc trên
      expect(mountDefSlot.textContent).toContain('+1');

      // 3. Ô ngựa tập trung hiển thị chỉ số +1 trực quan thay vì đè mã thẻ bài thu nhỏ
      expect(mountDefSlot.textContent).toContain('+1');

      // 4. Tooltip title phải mô tả đầy đủ tên và công dụng
      expect(mountDefSlot.getAttribute('title')).toContain('Ngựa Thần (+1)');
      expect(mountDefSlot.getAttribute('title')).toContain('♣4');

      // 5. Kiểm tra style không mix shorthand background với backgroundSize
      // backgroundColor phải là riêng biệt
      expect(mountDefSlot.style.backgroundColor).toBeTruthy();
    });
  });

  describe('2. Quy tắc Lật Tướng: Tướng đầu tiên mở BẮT BUỘC phải là Tướng Chính (Ảnh 4)', () => {
    it('BotBrain: khi bot chưa lộ diện Tướng Chính, bot KHÔNG BAO GIỜ mở Phó Tướng trước dù Phó Tướng có kỹ năng chủ động', () => {
      // Giả lập bot: Tướng Chính là Dã Tượng (không có skill active), Phó Tướng là Hồ Xuân Hương (có skill duyen_tho)
      const bot = {
        id: 1,
        name: 'Bot 1',
        hp: 3,
        maxHp: 3,
        mainHeroId: 'da-tuong',
        subHeroId: 'ho-xuan-huong',
        revealedHeroes: [false, false],
        hand: [{ id: 'card-1' }, { id: 'card-2' }],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {}
      };

      const mockState = {
        hasPioneerRewardClaimed: true, // Tiên phong đã nhận để kiểm tra việc lật vì skill
        players: [bot],
        getAlivePlayers: () => [bot],
        getPlayer: () => bot
      };

      const action = BotBrain._decideHeroReveal(mockState, bot);
      expect(action).not.toBeNull();
      expect(action.type).toBe('REVEAL_HERO');
      // BẮT BUỘC phải là heroIndex: 0 (Tướng Chính)
      expect(action.heroIndex).toBe(0);
    });

    it('HeroRegistry & Dispatcher: khi cả 2 tướng đang úp, lật ô 1 thì ô 1 thành Tướng Chính, CHỈ LẬT 1 TƯỚNG (tướng kia vẫn úp)', () => {
      const p = {
        id: 2,
        name: 'Người chơi 2',
        hp: 3,
        maxHp: 3,
        mainHeroId: 'da-tuong',
        subHeroId: 'ho-xuan-huong',
        heroes: [{ id: 'da-tuong', name: 'Dã Tượng', gender: 'male' }, { id: 'ho-xuan-huong', name: 'Hồ Xuân Hương', gender: 'female' }],
        gender: 'male',
        revealedHeroes: [false, false],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null },
        judgementArea: [],
        temporaryFlags: {}
      };

      const mockState = {
        players: [p],
        hasPioneerRewardClaimed: true,
        getPlayer: (id) => p,
        getAlivePlayers: () => [p],
        addLog: vi.fn(),
        drawCards: vi.fn()
      };

      const dispatcher = new DispatcherV4(mockState);

      // Người chơi bấm lật ô thứ 2 (heroIndex: 1)
      dispatcher.dispatchAction({
        type: 'ACTION_REVEAL_HERO',
        payload: { playerId: 2, heroIndex: 1 }
      });

      // 1. Hồ Xuân Hương được thăng cấp thành Tướng Chính (slot 0)
      expect(p.mainHeroId).toBe('ho-xuan-huong');
      expect(p.heroes[0].id).toBe('ho-xuan-huong');

      // 2. CHỈ CÓ DUY NHẤT 1 TƯỚNG ĐƯỢC LẬT! Tướng còn lại (Dã Tượng ở slot 1) VẪN TIẾP TỤC ÚP!
      expect(p.revealedHeroes).toEqual([true, false]);

      // 3. Giới tính nhân vật được xác định theo Tướng Chính vừa lật (Hồ Xuân Hương = Nữ)
      expect(p.gender).toBe('female');
    });
  });

  describe('3. Quy tắc Giới Tính: Giới tính nhân vật LUÔN LUÔN thuộc về Tướng Chính (Ảnh 4)', () => {
    it('Nhân vật có Tướng Chính là Nam (Dã Tượng) và Phó Tướng là Nữ (Hồ Xuân Hương) -> Giới tính luôn là Nam', () => {
      const p = {
        id: 0,
        name: 'Player Test',
        hp: 3,
        maxHp: 3,
        mainHeroId: 'da-tuong', // Nam
        subHeroId: 'ho-xuan-huong', // Nữ
        gender: 'male',
        revealedHeroes: [false, false],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }
      };

      const mockState = {
        players: [p],
        hasPioneerRewardClaimed: true,
        getPlayer: () => p,
        getAlivePlayers: () => [p],
        addLog: vi.fn(),
        drawCards: vi.fn()
      };

      // Khi lật tướng
      globalHeroRegistry.revealPlayerHero(mockState, p, 0);

      // Giới tính phải là male theo Tướng Chính
      expect(p.gender).toBe('male');
      expect(getPlayerGender(p)).toBe('male');

      // Khi lật tiếp Phó Tướng Nữ (Hồ Xuân Hương)
      globalHeroRegistry.revealPlayerHero(mockState, p, 1);

      // Giới tính vẫn BẮT BUỘC là male theo Tướng Chính!
      expect(p.gender).toBe('male');
      expect(getPlayerGender(p)).toBe('male');
    });

    it('Nhân vật có Tướng Chính là Nữ (Nguyên Phi Ỷ Lan) và Phó Tướng là Nam (Dã Tượng) -> Giới tính luôn là Nữ', () => {
      const p = {
        id: 1,
        name: 'Player Female Main',
        hp: 3,
        maxHp: 3,
        mainHeroId: 'nguyen-phi-y-lan', // Nữ
        subHeroId: 'da-tuong', // Nam
        gender: 'female',
        revealedHeroes: [false, false],
        hand: [],
        equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }
      };

      const mockState = {
        players: [p],
        hasPioneerRewardClaimed: true,
        getPlayer: () => p,
        getAlivePlayers: () => [p],
        addLog: vi.fn(),
        drawCards: vi.fn()
      };

      // Khi lật tướng chính
      globalHeroRegistry.revealPlayerHero(mockState, p, 0);
      expect(p.gender).toBe('female');
      expect(getPlayerGender(p)).toBe('female');

      // Khi lật phó tướng Nam
      globalHeroRegistry.revealPlayerHero(mockState, p, 1);
      // Giới tính vẫn là female theo Tướng Chính!
      expect(p.gender).toBe('female');
      expect(getPlayerGender(p)).toBe('female');
    });
  });

  describe('4. Nút Kỹ Năng Hòa Thân trên ActionBar (Ảnh 1, 2, 3, 4)', () => {
    it('ActionBar: hiển thị nút [Hòa Thân] khi người chơi sở hữu Công chúa An Tư đã lộ diện', async () => {
      const { ActionBar } = await import('../game/ActionBar.jsx');
      const { PHASES } = await import('../../../../shared/engine_v4/core/StateMachine.js');

      const mockMe = {
        id: 0,
        name: 'Bạn',
        faction: 'Hà',
        revealedHeroes: [true, true],
        heroes: [
          {
            id: 'nguyen-phi-y-lan',
            name: 'Nguyên Phi Ỷ Lan',
            skills: [
              { id: 'thinh-chinh', name: 'Thính Chính', type: 'CHỦ ĐỘNG', isUsable: true }
            ]
          },
          {
            id: 'cong-chua-an-tu',
            name: 'Công chúa An Tư',
            skills: [
              { id: 'hoa-than-an-tu', name: 'Hòa Thân', type: 'CHỦ ĐỘNG', isUsable: true }
            ]
          }
        ],
        hand: [{ id: 'c1', name: 'Chém', suit: 'diamond', rank: 'A' }]
      };

      const mockGameState = {
        phase: PHASES.ACTION,
        currentPlayerIndex: 0,
        players: [mockMe]
      };

      const { container } = render(
        <ActionBar
          gameState={mockGameState}
          me={mockMe}
          isMyTurn={true}
          needsDiscard={false}
          targetSession={null}
          handleEndTurn={() => {}}
          handleDraw={() => {}}
          handleRevealClick={() => {}}
          handleExecuteSkill={() => {}}
        />
      );

      // Nút Hòa Thân BẮT BUỘC phải xuất hiện trên ActionBar!
      const hoaThanBtn = screen.getByText(/Hòa Thân/i);
      expect(hoaThanBtn).toBeTruthy();
    });
  });
});
