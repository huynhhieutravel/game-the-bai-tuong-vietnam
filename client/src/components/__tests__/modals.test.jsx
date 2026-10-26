// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, act, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { ModalContainer } from '../modals/ModalContainer';
import * as GameProvider from '../../contexts/GameProvider';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';
import { BinhLoanModal } from '../modals/BinhLoanModal';
import { HoaCongDiscardModal } from '../modals/HoaCongDiscardModal';
import { DodgeModal } from '../modals/DodgeModal';
import { AskChangeJudgeModal } from '../modals/AskChangeJudgeModal';
import { HienHauModal } from '../modals/HienHauModal';
import { HoaThanAnTuModal } from '../modals/HoaThanAnTuModal';

// Mock contexts
vi.mock('../../contexts/GameProvider', () => ({
  useGameState: vi.fn(),
  useGameAPI: vi.fn(),
}));

describe('ModalContainer and all sub-modals', () => {
  const mockPlayers = [
    { id: 0, isAlive: true, name: 'Player 0', hand: [{ idx: 0, name: 'Chém', suit: 'spade', color: 'black' }], hp: 3, maxHp: 3, equipment: [], draftHeroes: [{id: 1, faction: 'Lạc'}], attackRange: 1, distanceFromMe: 0, distances: {1: 1} },
    { id: 1, isAlive: true, name: 'Player 1', hand: [], hp: 3, maxHp: 3, equipment: [], draftHeroes: [], attackRange: 1, distanceFromMe: 1, distances: {0: 1} },
  ];

  const modalTypes = [
    'ask_khai_quoc', 'ask_snatch', 'ask_dismantle',
    'ask_banh_chung', 'ask_can_gian', 'ask_thong_ngon', 'ask_hau_vien', 'ask_tien_phat', 
    'ask_doat_sao', 'ask_hien_hau', 'ask_that_tram_so', 'ask_that_tram_so_punish', 
    'ask_doi_su', 'ask_hoa_nghi', 'ask_ho_chu', 'ask_xa_than', 'ask_xuan_huong', 
    'ask_bach_dang', 'ask_lan_sau', 'ask_suit', 'ask_van_don', 'ask_phat_tam', 
    'ask_duyen_tho', 'ask_doat_sao_discard', 'ask_chuong_duong_discard', 'ask_chuong_duong_move', 
    'ask_da_trach', 'ask_khoi_nghia', 'ask_khoan_dan', 'ask_nam_quoc_son_ha', 'ask_tu_chu', 
    'ask_tu_chu_target', 'ask_duong_quan', 'ask_duong_quan_1', 'ask_duong_quan_2', 'ask_duong_quan_3', 'ask_tien_phong', 'ask_uy_chan', 'ask_an_bang', 
    'ask_phat_toi', 'ask_pha_thanh', 'ask_dieu_duoc', 'ask_hoa_than', 'ask_binh_loan', 
    'ask_trung_dung', 'ask_nghi_ngo', 'ask_perfect_pair', 'ask_reveal_for_skill', 'ask_thuy_to', 
    'ask_thuy_to_bonus', 'ask_boc_tram_trung_slash', 'ask_tre_nga_discard', 'ask_dodge', 'ask_slash',
    'ask_peach', 'ask_negate', 'ask_weapon_skill'
  ];

  it('renders VipHeroSelectorModal without crashing', () => {
    const { container } = render(
      <VipHeroSelectorModal 
        draftSelection={[1]} 
        me={mockPlayers[0]} 
        onSelect={() => {}} 
        onClose={() => {}} 
      />
    );
    expect(container).toBeTruthy();
  });

  modalTypes.forEach(type => {
    it(`renders ModalContainer for request type: ${type} without crashing`, () => {
      const isDodge = type === 'ask_dodge';
      const isWeaponSkill = type === 'ask_weapon_skill';

      GameProvider.useGameState.mockReturnValue({
        players: mockPlayers,
        waitingForResponse: {
          type: type,
          responderId: 0,
          sourceId: isWeaponSkill ? 0 : 1,
          targetId: 1,
          duelTargetId: 1,
          dyingId: 1,
          reqCard: 'Chém',
          virtualCardName: 'Chém',
          skillName: 'TestSkill',
          judgeSuit: '♠',
          reason: isDodge ? 'chem' : 'quyet-dau', 
          skills: ['quan-co'],
          targets: [1],
        },
        deck: [{ name: 'Né' }, { name: 'Chém' }]
      });
      GameProvider.useGameAPI.mockReturnValue({ respond: vi.fn() });

      const { container } = render(<ModalContainer />);
      expect(container).toBeTruthy(); 
    });
  });

  describe('Client-Side Watchdog Timer', () => {
    it('renders watchdog countdown pill with 15s when an interactive modal is active', () => {
      GameProvider.useGameState.mockReturnValue({
        players: mockPlayers,
        waitingForResponse: {
          type: 'ask_slash',
          reason: 'quyet-dau',
          responderId: 0,
          sourceId: 1,
          targetId: 0
        },
        deck: []
      });
      GameProvider.useGameAPI.mockReturnValue({ respond: vi.fn() });

      const { getByTestId } = render(<ModalContainer />);
      const pill = getByTestId('modal-watchdog-pill');
      expect(pill).toBeTruthy();
      expect(pill.textContent).toContain('15s');
    });

    it('does not auto-skip when 15s timer expires (paused for live combat testing)', () => {
      vi.useFakeTimers();
      const mockRespond = vi.fn();
      GameProvider.useGameState.mockReturnValue({
        players: mockPlayers,
        waitingForResponse: {
          id: 'duel_frame_1',
          type: 'ask_slash',
          reason: 'quyet-dau',
          responderId: 0,
          sourceId: 1,
          targetId: 0
        },
        deck: []
      });
      GameProvider.useGameAPI.mockReturnValue({ respond: mockRespond });

      let rendered;
      act(() => {
        rendered = render(<ModalContainer />);
      });
      expect(mockRespond).not.toHaveBeenCalled();

      // Advance by 15 seconds
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // Auto-skip is paused for real match testing: mockRespond must NOT be called
      expect(mockRespond).not.toHaveBeenCalled();
      const pill = rendered.getByTestId('modal-watchdog-pill');
      expect(pill.textContent).toContain('0s');

      vi.useRealTimers();
    });
  });

  describe('UI Reaction Contract & Click Interaction Tests', () => {
    it('BinhLoanModal: cho phép phát động khi chọn 1 lá Bích và 1 lá Cơ của người chơi có Quốc Sắc', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [{
          id: 0,
          name: 'Nguyễn Bặc & Ngọc Hân',
          heroes: [
            { id: 'nguyen_bac', skills: [{ id: 'binh_loan' }] },
            { id: 'ngoc_han_cong_chua', skills: [{ id: 'quoc_sac' }] }
          ],
          revealedHeroes: [true, true],
          hand: [
            { id: 'c1', name: 'Chém', suit: 'spade', color: 'black', rank: '7' },
            { id: 'c2', name: 'Né', suit: 'heart', color: 'red', rank: '8' }
          ]
        }]
      };

      const req = { sourceId: 0, type: 'ask_binh_loan' };
      render(<BinhLoanModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      const card1 = screen.getByText('Chém');
      const card2 = screen.getByText('Né');
      fireEvent.click(card1);
      fireEvent.click(card2);

      const submitBtn = screen.getByText('Phát Động');
      expect(submitBtn.disabled).toBe(false);

      fireEvent.click(submitBtn);
      expect(onConfirm).toHaveBeenCalledWith({ cardIndexes: [0, 1] });
    });

    it('HoaCongDiscardModal: chấp nhận lá Bích khi đối thủ để lộ lá Cơ với người chơi có Quốc Sắc', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          {
            id: 0,
            name: 'Ngọc Hân Công Chúa',
            heroes: [{ id: 'ngoc_han_cong_chua', skills: [{ id: 'quoc_sac' }] }],
            revealedHeroes: [true],
            hand: [{ id: 'spade_c1', name: 'Chém', suit: 'spade', color: 'black', rank: '9' }]
          },
          {
            id: 1,
            name: 'Đối thủ',
            heroes: [],
            revealedHeroes: []
          }
        ]
      };

      const req = {
        sourceId: 0,
        targetId: 1,
        revealedCard: { id: 'revealed_heart', name: 'Đào', suit: 'heart', color: 'red', rank: '10' }
      };

      render(<HoaCongDiscardModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      const cardEl = screen.getByText('Chém');
      fireEvent.click(cardEl);

      const triggerBtn = screen.getByText(/Bỏ bài kích hỏa/i);
      expect(triggerBtn.disabled).toBe(false);

      fireEvent.click(triggerBtn);
      expect(onConfirm).toHaveBeenCalledWith({
        doReact: true,
        cardId: 'spade_c1',
        card: expect.objectContaining({ id: 'spade_c1' })
      });
    });

    it('DodgeModal: nhận diện lá Nhép đen cho Thính Chính nhưng không nhận lá Bích (đã thành Đỏ qua Quốc Sắc)', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [{
          id: 0,
          name: 'Nguyễn Lữ & Ngọc Hân',
          heroes: [
            { id: 'nguyen_lu', skills: [{ id: 'thinh_chinh' }] },
            { id: 'ngoc_han_cong_chua', skills: [{ id: 'quoc_sac' }] }
          ],
          revealedHeroes: [true, true],
          equipment: [],
          hand: [
            { id: 'spade_c', name: 'Đao Bích', suit: 'spade', color: 'black', rank: '3' },
            { id: 'club_c', name: 'Thương Nhép', suit: 'club', color: 'black', rank: '4' }
          ]
        }, {
          id: 1,
          name: 'Kẻ Địch',
          equipment: []
        }]
      };

      const req = { responderId: 0, sourceId: 1, type: 'ask_dodge' };
      render(<DodgeModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      // Chọn lá Nhép
      const clubCard = screen.getByText('Thương Nhép');
      fireEvent.click(clubCard);

      const dodgeBtn = screen.getByText(/Đánh Né/i);
      expect(dodgeBtn.disabled).toBe(false);

      fireEvent.click(dodgeBtn);
      expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
        doReact: true,
        activeSkill: 'thinh-chinh',
        virtualCardName: 'Né'
      }));
    });

    it('HienHauModal: gửi payload chính xác khi chọn đối thủ và thẻ bài chất Cơ (Bích qua Quốc Sắc)', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          {
            id: 0,
            name: 'Ngọc Hân Công Chúa',
            heroes: [{ id: 'ngoc_han_cong_chua', skills: [{ id: 'quoc_sac' }] }],
            revealedHeroes: [true],
            hand: [{ id: 'spade_card_id', name: 'Chém', suit: 'spade', color: 'black', rank: '7' }]
          },
          {
            id: 1,
            name: 'Đối thủ B',
            isAlive: true,
            heroes: []
          }
        ]
      };

      const req = { responderId: 0, type: 'ask_hien_hau' };
      render(<HienHauModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      // Chọn thẻ bài
      const cardEl = screen.getByText('Chém');
      fireEvent.click(cardEl);

      // Chọn mục tiêu (hiển thị "Người chơi 2" theo getFullPlayerName)
      const targetEl = screen.getByText(/Người chơi 2/i);
      fireEvent.click(targetEl);

      // Bấm nút tùy chọn 1
      const option1Btn = screen.getByText(/Nhận 1 ST & Rút bài/i);
      expect(option1Btn.disabled).toBe(false);

      fireEvent.click(option1Btn);
      expect(onConfirm).toHaveBeenCalledWith({
        doUse: true,
        targetId: 1,
        cardId: 'spade_card_id',
        option: 1
      });
    });

    it('HoaThanAnTuModal: gửi payload chính xác khi chọn thẻ bài Rô trên trang bị', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          {
            id: 0,
            name: 'Công Chúa An Tư',
            heroes: [{ id: 'cong_chua_an_tu', skills: [{ id: 'hoa_than_an_tu' }] }],
            revealedHeroes: [true],
            hand: [],
            equipment: [{ id: 'eq_diamond', name: 'Gia Cát Nỏ', suit: 'diamond', color: 'red', rank: 'A' }]
          },
          {
            id: 1,
            name: 'Tướng Địch',
            isAlive: true,
            judgementArea: []
          }
        ]
      };

      const req = { sourceId: 0, type: 'ask_hoa_than_an_tu' };
      render(<HoaThanAnTuModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      // Chọn trang bị
      const equipEl = screen.getByText(/Gia Cát Nỏ/i);
      fireEvent.click(equipEl);

      // Chọn mục tiêu (hiển thị "Người chơi 2" theo getFullPlayerName)
      const targetEl = screen.getByText(/Người chơi 2/i);
      fireEvent.click(targetEl);

      // Bấm nút Sử Dụng
      const submitBtn = screen.getByText('Sử Dụng');
      expect(submitBtn.disabled).toBe(false);

      fireEvent.click(submitBtn);
      expect(onConfirm).toHaveBeenCalledWith({
        targetId: 1,
        cardFrom: 'equip',
        cardIndex: 0
      });
    });
  });
});

