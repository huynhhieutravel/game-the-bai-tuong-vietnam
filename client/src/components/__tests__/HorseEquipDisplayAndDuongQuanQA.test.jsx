// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import MyHeroBar from '../game/MyHeroBar';
import { PlayerBoard } from '../game/PlayerBoard';
import { ModalContainer } from '../modals/ModalContainer';
import * as GameProvider from '../../contexts/GameProvider';
import { CARD_SUBTYPES } from 'shared/constants/cardTypes';

vi.mock('../../contexts/GameProvider', () => ({
  useGameState: vi.fn(),
  useGameAPI: vi.fn(),
}));

describe('QA: Horse Equipment Display and Duong Quan Skills', () => {
  const mockRespond = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    GameProvider.useGameAPI.mockReturnValue({
      respond: mockRespond,
    });
  });

  describe('1. MyHeroBar Horse Equipment Display (+1 / -1)', () => {
    it('hiển thị rõ ràng icon ngựa thủ và huy hiệu +1, không hiển thị thẻ bài thu nhỏ hay chất bài ♠Q', () => {
      const mockPlayer = {
        id: 0,
        name: 'Người chơi 1',
        hp: 4,
        maxHp: 4,
        isRevealed: true,
        faction: 'viet',
        equipment: [
          {
            id: 'horse_def_1',
            name: 'Đích Lô',
            suit: 'spade',
            rank: 'Q',
            type: 'equip',
            subType: CARD_SUBTYPES.EQUIP_MOUNT_DEF,
            desc: 'Cự ly đối thủ đến bạn +1'
          }
        ],
        heroes: [{ id: 'duong_dinh_nghe', name: 'Dương Đình Nghệ', skills: ['duong_quan', 'duong_quan_1', 'duong_quan_3'] }],
        revealedHeroes: [true, false]
      };

      const { container } = render(
        <MyHeroBar
          me={mockPlayer}
          targetSession={null}
          onCardClick={() => {}}
          onUseSkill={() => {}}
        />
      );

      // Ô ngựa thủ đã trang bị
      const horseSlot = container.querySelector('.my-hero-equip-slot.horse-equipped');
      expect(horseSlot).toBeTruthy();

      // Không chứa background image lá bài (url)
      expect(horseSlot.style.backgroundImage).not.toContain('url(');

      // Chứa badge +1 to rõ
      const badgeVal = horseSlot.querySelector('.my-hero-equip-horse-val.def');
      expect(badgeVal).toBeTruthy();
      expect(badgeVal.textContent).toBe('+1');

      // Không chứa badge chất/số ♠Q của thẻ bài bình thường
      expect(horseSlot.querySelector('.my-hero-equip-badge')).toBeNull();
    });

    it('hiển thị rõ ràng icon ngựa công và huy hiệu -1 khi trang bị ngựa công', () => {
      const mockPlayer = {
        id: 0,
        name: 'Người chơi 1',
        hp: 4,
        maxHp: 4,
        isRevealed: true,
        faction: 'viet',
        equipment: [
          {
            id: 'horse_atk_1',
            name: 'Xích Thố',
            suit: 'heart',
            rank: '5',
            type: 'equip',
            subType: CARD_SUBTYPES.EQUIP_MOUNT_ATK,
            desc: 'Tầm đánh đến đối thủ -1 cự ly'
          }
        ],
        heroes: [{ id: 'duong_dinh_nghe', name: 'Dương Đình Nghệ' }],
        revealedHeroes: [true, false]
      };

      const { container } = render(
        <MyHeroBar
          me={mockPlayer}
          targetSession={null}
          onCardClick={() => {}}
          onUseSkill={() => {}}
        />
      );

      const horseSlot = container.querySelector('.my-hero-equip-slot.horse-equipped');
      expect(horseSlot).toBeTruthy();
      const badgeVal = horseSlot.querySelector('.my-hero-equip-horse-val.atk');
      expect(badgeVal).toBeTruthy();
      expect(badgeVal.textContent).toBe('-1');
    });
  });

  describe('2. PlayerBoard Opponent Horse Equipment Display', () => {
    it('đối thủ trang bị ngựa thủ hiển thị badge +1 không che khuất bởi ảnh thẻ bài', () => {
      const opponent = {
        id: 1,
        name: 'Đối thủ 2',
        hp: 3,
        maxHp: 3,
        hand: [],
        attackRange: 1,
        distanceFromMe: 2,
        equipment: {
          horse_defense: {
            id: 'horse_def_2',
            name: 'Tuyệt Ảnh',
            suit: 'club',
            rank: 'K',
            type: 'equip',
            subType: CARD_SUBTYPES.EQUIP_MOUNT_DEF
          }
        },
        heroes: [{ id: 'lang_lieu', name: 'Lang Liêu' }],
        revealedHeroes: [true, false]
      };

      const { container } = render(
        <PlayerBoard
          player={opponent}
          mainPlayerId={0}
          targetSession={null}
        />
      );

      const horseSlot = container.querySelector('.opponent-equipment-row .horse-equipped');
      expect(horseSlot).toBeTruthy();
      expect(horseSlot.textContent).toContain('+1');
      expect(horseSlot.style.backgroundImage).toBe('none');
    });
  });

  describe('3. ModalContainer ask_duong_quan_1, 2, 3 Interactive Responses', () => {
    it('ask_duong_quan_1: mở giao diện Pha Bắt đầu và gửi phản hồi bỏ qua (doUse: false)', () => {
      const mockGameState = {
        currentPhase: 'BEGIN',
        players: [
          { id: 0, name: 'Người chơi 1', isAlive: true, hp: 4, maxHp: 4, hand: [] },
          { id: 1, name: 'Đối thủ 2', isAlive: true, hp: 3, maxHp: 3, hand: [] }
        ],
        waitingForResponse: {
          id: 'req_dq_1',
          type: 'ask_duong_quan_1',
          responderId: 0,
          sourceId: 0,
          validTargets: [1]
        }
      };

      GameProvider.useGameState.mockReturnValue(mockGameState);

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getByText(/DƯỠNG QUÂN \(Pha Bắt Đầu\)/i)).toBeTruthy();
      expect(screen.getByText(/bỏ qua Pha Phán xét và Pha Rút bài/i)).toBeTruthy();

      const skipBtn = screen.getByText(/Bỏ qua \(Rút bài\)/i);
      fireEvent.click(skipBtn);

      expect(mockRespond).toHaveBeenCalledWith({
        playerId: 0,
        doUse: false
      });
    });

    it('ask_duong_quan_1: chọn mục tiêu và kích hoạt đòn Chém (doUse: true, targetId)', () => {
      const mockGameState = {
        currentPhase: 'BEGIN',
        players: [
          { id: 0, name: 'Người chơi 1', isAlive: true, hp: 4, maxHp: 4, hand: [] },
          { id: 1, name: 'Đối thủ 2', isAlive: true, hp: 3, maxHp: 3, hand: [] }
        ],
        waitingForResponse: {
          id: 'req_dq_1',
          type: 'ask_duong_quan_1',
          responderId: 0,
          sourceId: 0,
          validTargets: [1]
        }
      };

      GameProvider.useGameState.mockReturnValue(mockGameState);

      render(<ModalContainer mainPlayerId={0} />);

      const confirmBtn = screen.getByText(/Xác nhận Chém/i);
      fireEvent.click(confirmBtn);

      expect(mockRespond).toHaveBeenCalledWith({
        playerId: 0,
        doUse: true,
        targetId: 1
      });
    });

    it('ask_duong_quan_2: chọn trang bị và mục tiêu Chém trong Pha Ra bài', () => {
      const mockGameState = {
        currentPhase: 'ACTION',
        players: [
          {
            id: 0,
            name: 'Người chơi 1',
            isAlive: true,
            hp: 4,
            maxHp: 4,
            hand: [{ id: 'w_dao', name: 'Đao', type: 'equip', suit: 'spade', rank: 'A' }],
            equipment: {}
          },
          { id: 1, name: 'Đối thủ 2', isAlive: true, hp: 3, maxHp: 3, hand: [] }
        ],
        waitingForResponse: {
          id: 'req_dq_2',
          type: 'ask_duong_quan_2',
          responderId: 0,
          sourceId: 0,
          validTargets: [1]
        }
      };

      GameProvider.useGameState.mockReturnValue(mockGameState);

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getByText(/DƯỠNG QUÂN \(Pha Ra Bài\)/i)).toBeTruthy();

      const confirmBtn = screen.getByText(/Chém & Kết thúc/i);
      fireEvent.click(confirmBtn);

      expect(mockRespond).toHaveBeenCalledWith({
        playerId: 0,
        cardId: 'w_dao',
        targetId: 1,
        doUse: true
      });
    });

    it('ask_duong_quan_3: chọn mục tiêu và tự lật úp mặt tướng trong Pha Bỏ bài', () => {
      const mockGameState = {
        currentPhase: 'DISCARD',
        players: [
          { id: 0, name: 'Người chơi 1', isAlive: true, hp: 4, maxHp: 4, hand: [] },
          { id: 1, name: 'Đối thủ 2', isAlive: true, hp: 3, maxHp: 3, hand: [] }
        ],
        waitingForResponse: {
          id: 'req_dq_3',
          type: 'ask_duong_quan_3',
          responderId: 0,
          sourceId: 0,
          validTargets: [1]
        }
      };

      GameProvider.useGameState.mockReturnValue(mockGameState);

      render(<ModalContainer mainPlayerId={0} />);

      expect(screen.getByText(/DƯỠNG QUÂN \(Pha Bỏ Bài\)/i)).toBeTruthy();

      const confirmBtn = screen.getByText(/Lật úp & Chém/i);
      fireEvent.click(confirmBtn);

      expect(mockRespond).toHaveBeenCalledWith({
        playerId: 0,
        doUse: true,
        targetId: 1
      });
    });
  });
});
