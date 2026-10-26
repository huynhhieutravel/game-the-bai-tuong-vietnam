// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DodgeModal } from '../modals/DodgeModal';
import { TienPhatModal } from '../modals/TienPhatModal';
import { AskChangeJudgeModal } from '../modals/AskChangeJudgeModal';
import { HauVienModal } from '../modals/HauVienModal';
import { AskBocTramTrungDodgeModal } from '../modals/AskBocTramTrungDodgeModal';
import { AskBocTramTrungSlashModal } from '../modals/AskBocTramTrungSlashModal';
import { PlayerHand } from '../game/PlayerHand';

describe('QA Toàn diện UX/UI các kỹ năng & tính năng mới cải tiến', () => {
  describe('1. DodgeModal - Kỹ năng Bọc Trăm Trứng & Tiên Phát trong Quốc Chiến', () => {
    it('không hiển thị nút Bọc Trăm Trứng trong DodgeModal vì Bọc Trăm Trứng chỉ dùng cho Chém', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          {
            id: 0,
            name: 'Lạc Long Quân',
            isAlive: true,
            faction: 'lac',
            heroes: [{ id: 'lac-long-quan', name: 'Lạc Long Quân' }],
            hand: [{ id: 'c1', name: 'Né', suit: 'heart', rank: '2' }],
            equipment: []
          },
          {
            id: 1,
            name: 'Đồng Minh Lạc',
            isAlive: true,
            faction: 'lac',
            hand: [],
            equipment: []
          },
          {
            id: 2,
            name: 'Kẻ Địch',
            isAlive: true,
            faction: 'viet',
            hand: [],
            equipment: []
          }
        ]
      };

      const req = {
        type: 'ask_dodge',
        sourceId: 2,
        targetId: 0,
        responderId: 0
      };

      render(<DodgeModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      const bocTramTrungBtn = screen.queryByText(/Kích Hoạt Bọc Trăm Trứng/i);
      expect(bocTramTrungBtn).toBeNull();
    });

    it('hiển thị nút Tiên Phát cho Lý Thường Kiệt trong Quốc Chiến (không cần isLord)', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          {
            id: 0,
            name: 'Lý Thường Kiệt',
            isAlive: true,
            faction: 'viet',
            isLord: false, // Trong Quốc Chiến không có role isLord
            heroes: [{ id: 'ly-thuong-kiet', name: 'Lý Thường Kiệt' }],
            hand: [],
            equipment: []
          },
          {
            id: 1,
            name: 'Đồng Minh Việt',
            isAlive: true,
            faction: 'viet',
            hand: [{ id: 'c2', name: 'Né' }],
            equipment: []
          },
          {
            id: 2,
            name: 'Kẻ Địch',
            isAlive: true,
            faction: 'lac',
            hand: [],
            equipment: []
          }
        ]
      };

      const req = {
        type: 'ask_dodge',
        sourceId: 2,
        targetId: 0,
        responderId: 0
      };

      render(<DodgeModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      const tienPhatBtn = screen.getByText(/Kích Hoạt Tiên Phát/i);
      expect(tienPhatBtn).toBeTruthy();

      fireEvent.click(tienPhatBtn);
      expect(onConfirm).toHaveBeenCalledWith({ doTienPhat: true });
    });

    it('bấm Chịu đấm gửi đúng doReact: false', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          {
            id: 0,
            name: 'Người chơi',
            isAlive: true,
            faction: 'viet',
            hand: [{ id: 'c1', name: 'Né' }],
            equipment: []
          },
          {
            id: 1,
            name: 'Kẻ Địch',
            isAlive: true,
            faction: 'lac',
            hand: [],
            equipment: []
          }
        ]
      };

      const req = {
        type: 'ask_dodge',
        sourceId: 1,
        targetId: 0,
        responderId: 0
      };

      render(<DodgeModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      const skipBtn = screen.getByText(/Chịu đấm/i);
      fireEvent.click(skipBtn);
      expect(onConfirm).toHaveBeenCalledWith({ doReact: false });
    });
  });

  describe('2. TienPhatModal - Hiển thị đúng đồng minh responderId và hỗ trợ Né ảo', () => {
    it('hiển thị bài của responderId (đồng minh) chứ không phải của targetId (Lý Thường Kiệt)', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          {
            id: 0,
            name: 'Lý Thường Kiệt',
            isAlive: true,
            faction: 'viet',
            hand: [{ id: 'card_ltk', name: 'Chém' }],
            equipment: []
          },
          {
            id: 1,
            name: 'Đồng Minh Trần Hưng Đạo',
            isAlive: true,
            faction: 'viet',
            hand: [{ id: 'card_ally_dodge', name: 'Né', suit: 'diamond', rank: '7' }],
            equipment: []
          }
        ]
      };

      const req = {
        type: 'ask_tien_phat',
        sourceId: 0, // Lý Thường Kiệt
        targetId: 0, // Bị chém
        responderId: 1, // Đồng minh nhận modal
        currentActorId: 1
      };

      render(<TienPhatModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      // Chọn lá bài Né trên tay đồng minh
      const cardItem = screen.getByText('Né');
      fireEvent.click(cardItem);

      // Bấm nút "Đánh Né giúp"
      const confirmBtn = screen.getByRole('button', { name: /Đánh Né giúp/i });
      expect(confirmBtn.disabled).toBe(false);

      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
        doReact: true,
        cardId: 'card_ally_dodge'
      }));
    });

    it('hỗ trợ bỏ qua không đánh thay', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          { id: 0, name: 'Lý Thường Kiệt', hand: [] },
          { id: 1, name: 'Đồng Minh', hand: [] }
        ]
      };

      const req = {
        type: 'ask_tien_phat',
        sourceId: 0,
        targetId: 0,
        responderId: 1
      };

      render(<TienPhatModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      const skipBtn = screen.getByRole('button', { name: /Bỏ qua/i });
      fireEvent.click(skipBtn);
      expect(onConfirm).toHaveBeenCalledWith({ doReact: false });
    });
  });

  describe('3. AskChangeJudgeModal - Phán xét & Can thiệp (Ứng Biến / Quân Cơ)', () => {
    it('hiển thị lá bài phán xét hiện tại và tên kỹ năng tương ứng', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          {
            id: 0,
            name: 'Mạc Đĩnh Chi',
            isAlive: true,
            heroes: [{ id: 'mac-dinh-chi', skills: ['ung-bien'] }],
            hand: [{ id: 'replace_card_1', name: 'Chém', suit: 'heart', rank: '9', color: 'red' }],
            equipment: []
          },
          {
            id: 1,
            name: 'Nạn Nhân Sấm Sét',
            isAlive: true,
            hand: [],
            equipment: []
          }
        ]
      };

      const req = {
        type: 'ask_change_judge',
        sourceId: 1,
        targetId: 1,
        responderId: 0,
        reason: 'sam-set',
        judgeCard: { id: 'lightning_judge', name: 'Phán xét Sấm Sét', suit: 'spade', rank: '3', color: 'black' },
        skills: ['ung-bien']
      };

      render(<AskChangeJudgeModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      // Phải có tiêu đề ỨNG BIẾN
      expect(screen.getByText(/ỨNG BIẾN/i)).toBeTruthy();

      // Phải hiển thị lá phán xét hiện tại
      expect(screen.getByText(/Lá phán xét hiện tại/i)).toBeTruthy();

      // Click chọn thẻ bài trên tay
      const cardItem = screen.getByText('Chém');
      fireEvent.click(cardItem);

      // Bấm nút đổi phán xét
      const changeBtn = screen.getByRole('button', { name: /Đổi phán xét/i });
      expect(changeBtn.disabled).toBe(false);
      fireEvent.click(changeBtn);

      expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
        doReact: true,
        skillId: 'ung-bien',
        cardId: 'replace_card_1'
      }));
    });
  });

  describe('4. HauVienModal - Nhường Đào hồi máu cho đồng minh & rút bài', () => {
    it('tự động chọn đồng minh duy nhất nếu chỉ có 1 mục tiêu hợp lệ', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          { id: 0, name: 'Nguyễn Bỉnh Khiêm', isAlive: true, hp: 3, maxHp: 3 },
          { id: 1, name: 'Đồng Minh Bị Thương', isAlive: true, hp: 1, maxHp: 3 }
        ]
      };

      const req = {
        type: 'ask_hau_vien',
        sourceId: 0,
        responderId: 0,
        targets: [1]
      };

      render(<HauVienModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      const confirmBtn = screen.getByRole('button', { name: /Nhường Đào/i });
      expect(confirmBtn.disabled).toBe(false);

      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalledWith({ doReact: true, targetId: 1 });
    });

    it('bấm Dùng Cho Mình gửi doReact: false', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          { id: 0, name: 'Nguyễn Bỉnh Khiêm', isAlive: true, hp: 2, maxHp: 3 },
          { id: 1, name: 'Đồng Minh', isAlive: true, hp: 1, maxHp: 3 }
        ]
      };

      const req = {
        type: 'ask_hau_vien',
        sourceId: 0,
        responderId: 0,
        targets: [1]
      };

      render(<HauVienModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      const selfBtn = screen.getByRole('button', { name: /Dùng Cho Mình/i });
      fireEvent.click(selfBtn);
      expect(onConfirm).toHaveBeenCalledWith({ doReact: false });
    });
  });

  describe('5. AskBocTramTrungSlashModal', () => {
    it('lấy đúng bài của responderId khi được Lạc Long Quân gọi trợ chiến ra Chém', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          { id: 0, name: 'Lạc Long Quân', isAlive: true, faction: 'lac', hand: [] },
          { id: 1, name: 'Đồng Minh Âu Cơ', isAlive: true, faction: 'lac', hand: [{ id: 'ally_slash_1', name: 'Chém', suit: 'heart', rank: '10' }] }
        ]
      };

      const req = {
        type: 'ask_boc_tram_trung_slash',
        sourceId: 0,
        targetId: 0,
        responderId: 1
      };

      render(<AskBocTramTrungSlashModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      // Chọn option lá Chém
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '0' } });

      const helpBtn = screen.getByRole('button', { name: /Giúp đỡ/i });
      expect(helpBtn.disabled).toBe(false);

      fireEvent.click(helpBtn);
      expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
        doProvide: true,
        cardId: 'ally_slash_1'
      }));
    });
  });

  describe('6. PlayerHand - Cơ chế gấp gọn v3 & Badge thẻ bài không vỡ dòng', () => {
    const defaultGameState = {
      phase: 'action',
      waitingForResponse: null
    };

    it('hiển thị đầy đủ tất cả lá bài khi số lá <= 5 (không có ô +N)', () => {
      const me = {
        id: 0,
        hand: [
          { id: 'c1', name: 'Chém', type: 'basic', suit: 'spade', rank: '7' },
          { id: 'c2', name: 'Né', type: 'basic', suit: 'heart', rank: '2' },
          { id: 'c3', name: 'Đào', type: 'basic', suit: 'diamond', rank: '3' },
          { id: 'c4', name: 'Rượu', type: 'basic', suit: 'club', rank: '9' },
          { id: 'c5', name: 'Quyết Đấu', type: 'trick', suit: 'spade', rank: '4' }
        ]
      };

      const { container } = render(
        <PlayerHand
          me={me}
          gameState={defaultGameState}
          needsDiscard={false}
          isMyTurn={true}
          selectedDiscards={[]}
          handleDiscardToggle={vi.fn()}
          handleCardClick={vi.fn()}
        />
      );

      // 5 lá bài đều hiển thị inline
      const cards = container.querySelectorAll('.hand-cards .card:not(.card-overflow-badge)');
      expect(cards.length).toBe(5);

      // Không có ô +N
      const overflowBadge = container.querySelector('.card-overflow-badge');
      expect(overflowBadge).toBeNull();
    });

    it('khi có 6 lá bài, tất cả 6 lá đều hiển thị trực tiếp (không bị ẩn lá nào, không có ô +N)', () => {
      const me = {
        id: 0,
        hand: [
          { id: 'c1', name: 'Hỗn Loạn', type: 'trick', suit: 'diamond', rank: '3' },
          { id: 'c2', name: 'Loạn Tiễn', type: 'trick', suit: 'spade', rank: 'K' },
          { id: 'c3', name: 'Chém', type: 'basic', suit: 'diamond', rank: 'K' },
          { id: 'c4', name: 'Quyết Đấu', type: 'trick', suit: 'spade', rank: '4' },
          { id: 'c5', name: 'Rượu', type: 'basic', suit: 'heart', rank: 'K' },
          { id: 'c6', name: 'Chém', type: 'basic', suit: 'diamond', rank: '9' }
        ]
      };

      const { container } = render(
        <PlayerHand
          me={me}
          gameState={defaultGameState}
          needsDiscard={false}
          isMyTurn={true}
          selectedDiscards={[]}
          handleDiscardToggle={vi.fn()}
          handleCardClick={vi.fn()}
        />
      );

      // Đủ 6 lá bài đều hiển thị trực tiếp
      const cards = container.querySelectorAll('.hand-cards .card:not(.card-overflow-badge)');
      expect(cards.length).toBe(6);

      // Không có ô +N
      const overflowBadge = container.querySelector('.card-overflow-badge');
      expect(overflowBadge).toBeNull();
    });

    it('khi có nhiều hơn 6 lá (ví dụ 7 lá), hiển thị 5 lá đầu + 1 ô mở rộng +2', () => {
      const me = {
        id: 0,
        hand: [
          { id: 'c1', name: 'Hỗn Loạn', type: 'trick', suit: 'diamond', rank: '3' },
          { id: 'c2', name: 'Loạn Tiễn', type: 'trick', suit: 'spade', rank: 'K' },
          { id: 'c3', name: 'Chém', type: 'basic', suit: 'diamond', rank: 'K' },
          { id: 'c4', name: 'Quyết Đấu', type: 'trick', suit: 'spade', rank: '4' },
          { id: 'c5', name: 'Rượu', type: 'basic', suit: 'heart', rank: 'K' },
          { id: 'c6', name: 'Chém', type: 'basic', suit: 'diamond', rank: '9' },
          { id: 'c7', name: 'Né', type: 'basic', suit: 'heart', rank: '2' }
        ]
      };

      const { container } = render(
        <PlayerHand
          me={me}
          gameState={defaultGameState}
          needsDiscard={false}
          isMyTurn={true}
          selectedDiscards={[]}
          handleDiscardToggle={vi.fn()}
          handleCardClick={vi.fn()}
        />
      );

      // Hiển thị đúng 5 lá đầu tiên
      const cards = container.querySelectorAll('.hand-cards .card:not(.card-overflow-badge)');
      expect(cards.length).toBe(5);

      // Hiển thị ô mở rộng +2
      const overflowBadge = container.querySelector('.card-overflow-badge');
      expect(overflowBadge).not.toBeNull();
      expect(overflowBadge.textContent).toContain('+2');
      expect(overflowBadge.textContent).toContain('Xem hết');
    });

    it('thẻ Quyết Đấu có badge nowrap không bao giờ ngắt 2 dòng', () => {
      const me = {
        id: 0,
        hand: [
          { id: 'c1', name: 'Quyết Đấu', type: 'trick', suit: 'spade', rank: '4' }
        ]
      };

      const { container } = render(
        <PlayerHand
          me={me}
          gameState={defaultGameState}
          needsDiscard={false}
          isMyTurn={true}
          selectedDiscards={[]}
          handleDiscardToggle={vi.fn()}
          handleCardClick={vi.fn()}
        />
      );

      const pill = container.querySelector('.card-name-pill');
      expect(pill).not.toBeNull();
      expect(pill.textContent).toBe('Quyết Đấu');
      expect(pill.style.whiteSpace).toBe('nowrap');
      expect(pill.style.overflow).toBe('hidden');
    });

    it('bấm vào ô +N mở modal portal hiển thị đầy đủ toàn bộ lá bài và có nút Thu gọn', () => {
      const me = {
        id: 0,
        hand: [
          { id: 'c1', name: 'C1', type: 'basic', suit: 'spade', rank: '1' },
          { id: 'c2', name: 'C2', type: 'basic', suit: 'spade', rank: '2' },
          { id: 'c3', name: 'C3', type: 'basic', suit: 'spade', rank: '3' },
          { id: 'c4', name: 'C4', type: 'basic', suit: 'spade', rank: '4' },
          { id: 'c5', name: 'C5', type: 'basic', suit: 'spade', rank: '5' },
          { id: 'c6', name: 'C6', type: 'basic', suit: 'spade', rank: '6' },
          { id: 'c7', name: 'C7', type: 'basic', suit: 'spade', rank: '7' }
        ]
      };

      const { container } = render(
        <PlayerHand
          me={me}
          gameState={defaultGameState}
          needsDiscard={false}
          isMyTurn={true}
          selectedDiscards={[]}
          handleDiscardToggle={vi.fn()}
          handleCardClick={vi.fn()}
        />
      );

      const overflowBadge = container.querySelector('.card-overflow-badge');
      fireEvent.click(overflowBadge);

      // Modal hiển thị đủ 7 lá
      const modalTitle = screen.getByText(/Toàn Bộ Bài Trên Tay \(7 Lá\)/i);
      expect(modalTitle).toBeTruthy();

      // Nút thu gọn đóng modal
      const closeBtn = screen.getByRole('button', { name: /✕ Thu gọn/i });
      expect(closeBtn).toBeTruthy();
      fireEvent.click(closeBtn);

      expect(screen.queryByText(/Toàn Bộ Bài Trên Tay \(7 Lá\)/i)).toBeNull();
    });
  });

  describe('7. MyHeroBar & ActionBar UX Tối ưu layout điện thoại landscape', () => {
    it('MyHeroBar render dock header chứa HP bar và Phe tag ở trên cùng, body chứa 2x2 equipment grid', async () => {
      const { default: MyHeroBar } = await import('../game/MyHeroBar');
      const me = {
        id: 0,
        hp: 4,
        maxHp: 4,
        faction: 'lac',
        attackRange: 1,
        isRevealed: true,
        revealedHeroes: [true, true],
        heroes: [
          { id: 'h1', name: 'Tướng 1', emoji: '⚔️' },
          { id: 'h2', name: 'Tướng 2', emoji: '🛡️' }
        ],
        equipment: []
      };

      const { container } = render(
        <MyHeroBar
          me={me}
          gameState={{ phase: 'action' }}
          activePhase="action"
          handleRevealClick={vi.fn()}
          actionBar={<div>ACTION_BUTTONS</div>}
          playerHand={<div>PLAYER_HAND</div>}
          setHeroPopup={vi.fn()}
          setCardPopup={vi.fn()}
          targetSession={null}
          handleTargetClick={vi.fn()}
        />
      );

      // Dock container & Dock header (Header nằm trên khung dock)
      const dockContainer = container.querySelector('.my-hero-dock-container');
      expect(dockContainer).not.toBeNull();
      const dockHeader = dockContainer.querySelector('.my-hero-dock-header');
      expect(dockHeader).not.toBeNull();
      expect(dockHeader.querySelector('.my-hero-hp-bar')).not.toBeNull();
      expect(dockHeader.querySelector('.my-hero-faction-tag')).not.toBeNull();
      expect(dockHeader.textContent).toContain('4/4');

      // Dock frame chứa 2 thẻ tướng
      const dock = dockContainer.querySelector('.my-hero-dock');
      expect(dock).not.toBeNull();
      const dockBody = dock.querySelector('.my-hero-dock-body');
      expect(dockBody).not.toBeNull();
      expect(dockBody.querySelector('.my-hero-avatars')).not.toBeNull();

      // 4 ô trang bị dàn ngang 1 hàng ở trên cùng của dock container (trên thanh HP)
      const equipArea = dockContainer.querySelector('.my-hero-equipment-row');
      expect(equipArea).not.toBeNull();
      expect(equipArea.querySelectorAll('.my-hero-equip-slot').length).toBe(4);

      // my-hero-hand-wrapper chỉ chứa bài trên tay, không bị ô trang bị che
      const handWrapper = container.querySelector('.my-hero-hand-wrapper');
      expect(handWrapper).not.toBeNull();
      expect(handWrapper.querySelector('.my-hero-equipment-row')).toBeNull();

      // Stats box should NOT be inside action-hub
      const actionHub = container.querySelector('.my-hero-action-hub');
      expect(actionHub).not.toBeNull();
      expect(actionHub.querySelector('.my-hero-stats-box')).toBeNull();
    });

    it('getTargetingDefinition không bị lỗi ReferenceError: isVirtual khi kích hoạt kỹ năng chuyển bài (Thần Hỏa/Linh Giám/Tiên Duyên)', async () => {
      const { getTargetingDefinition } = await import('shared/engine_v4/rules/TargetResolverV4');
      const state = {
        getPlayer: (id) => ({
          id,
          skills: ['than_hoa', 'linh_giam'],
          revealedHeroes: [true, true],
          heroes: [{ id: 'rua_vang', skills: ['than_hoa', 'linh_giam'] }]
        }),
        getAlivePlayers: () => [
          { id: 0, isAlive: true },
          { id: 1, isAlive: true }
        ]
      };
      const physicalCard = { id: 'c1', name: 'Đào', color: 'red', suit: 'heart' };
      // Gọi getTargetingDefinition với virtual card conversion
      const def = getTargetingDefinition(state, 0, 'Hỏa Công', physicalCard);
      expect(def).toBeDefined();
      expect(def.type).toBe('single');
    });

    it('Hero reveal overlay hiển thị nút Lật và nút Xem bên dưới để xem tướng an toàn không nhấn nhầm', async () => {
      const { default: MyHeroBar } = await import('../game/MyHeroBar');
      const setHeroPopup = vi.fn();
      const handleRevealClick = vi.fn();
      const me = {
        id: 0,
        hp: 3,
        maxHp: 3,
        faction: 'son',
        isRevealed: false,
        revealedHeroes: [false, false],
        heroes: [
          { id: 'h1', name: 'Lăng Liệu', emoji: '⚔️' },
          { id: 'h2', name: 'Chỉ Đồng Tử', emoji: '🛡️' }
        ],
        equipment: []
      };

      const { container } = render(
        <MyHeroBar
          me={me}
          gameState={{ phase: 'action' }}
          activePhase="action"
          handleRevealClick={handleRevealClick}
          actionBar={<div>ACTION_BUTTONS</div>}
          playerHand={<div>PLAYER_HAND</div>}
          setHeroPopup={setHeroPopup}
          setCardPopup={vi.fn()}
          targetSession={null}
          handleTargetClick={vi.fn()}
        />
      );

      const overlays = container.querySelectorAll('.my-hero-reveal-overlay');
      expect(overlays.length).toBe(2);

      const firstOverlay = overlays[0];
      const revealBtn = firstOverlay.querySelector('.my-hero-reveal-btn');
      const viewBtn = firstOverlay.querySelector('.my-hero-view-btn');
      expect(revealBtn).not.toBeNull();
      expect(revealBtn.textContent).toBe('Lật');
      expect(viewBtn).not.toBeNull();
      expect(viewBtn.textContent).toBe('Xem');

      // Test click Xem button
      fireEvent.click(viewBtn);
      expect(setHeroPopup).toHaveBeenCalledWith(me);
      expect(handleRevealClick).not.toHaveBeenCalled();

      // Test click Lật button
      fireEvent.click(revealBtn);
      expect(handleRevealClick).toHaveBeenCalledWith(0);
    });

    it('ActionBar hiển thị nút Bỏ Bài khi needsDiscard là true', async () => {
      const { ActionBar } = await import('../game/ActionBar');
      const confirmDiscard = vi.fn();
      const me = {
        id: 0,
        isSilenced: false,
        heroes: []
      };

      const { getByRole } = render(
        <ActionBar
          me={me}
          isMyTurn={true}
          gameState={{ phase: 'discard' }}
          gameAPI={{}}
          needsDiscard={true}
          discardAmount={2}
          selectedDiscards={[10, 11]}
          confirmDiscard={confirmDiscard}
        />
      );

      const discardBtn = getByRole('button', { name: /Bỏ Bài \(2\/2\)/i });
      expect(discardBtn).not.toBeNull();
      expect(discardBtn.disabled).toBe(false);

      fireEvent.click(discardBtn);
      expect(confirmDiscard).toHaveBeenCalled();
    });

    it('ActionBar hiển thị Kết Thúc và Kỹ Năng thuần text, không chứa icon emoji', async () => {
      const { ActionBar } = await import('../game/ActionBar');
      const handleEndTurn = vi.fn();
      const handleExecuteSkill = vi.fn();
      const me = {
        id: 0,
        isSilenced: false,
        heroes: [
          {
            name: 'Hồ Xuân Hương',
            skills: [
              { name: 'Duyên Thơ', type: 'ACTIVE', desc: 'Mô tả Duyên Thơ', isUsable: true }
            ]
          }
        ],
        revealedHeroes: [true]
      };

      const { getByRole } = render(
        <ActionBar
          me={me}
          isMyTurn={true}
          gameState={{ phase: 'action', players: [me] }}
          gameAPI={{}}
          needsDiscard={false}
          handleEndTurn={handleEndTurn}
          handleExecuteSkill={handleExecuteSkill}
        />
      );

      const endTurnBtn = getByRole('button', { name: /^Kết Thúc$/i });
      expect(endTurnBtn).not.toBeNull();
      expect(endTurnBtn.textContent.trim()).toBe('Kết Thúc');

      const skillBtn = getByRole('button', { name: /^Duyên Thơ$/i });
      expect(skillBtn).not.toBeNull();
      expect(skillBtn.textContent.trim()).toBe('Duyên Thơ');
    });

    it('PlayerHand hiển thị Floating Action Pill trực tiếp trên lá bài khi đang chọn (UX UI)', async () => {
      const { PlayerHand } = await import('../game/PlayerHand');
      const cancelTargeting = vi.fn();
      const confirmPlayCard = vi.fn();
      const card = { id: 'c1', name: 'Dã Man', type: 'trick', rank: '4', suit: 'spade', isPlayable: true, emoji: '🐗', desc: 'Sát thương toàn trường' };
      const me = {
        id: 0,
        hand: [card]
      };
      const targetSession = {
        card,
        cardIndex: 0,
        targetingDef: { type: 'aoe' },
        selectedTargets: [],
        validTargets: []
      };

      const { container } = render(
        <PlayerHand
          me={me}
          gameState={{ phase: 'action', waitingForResponse: null }}
          needsDiscard={false}
          isMyTurn={true}
          activeSkill={null}
          targetSession={targetSession}
          selectedDiscards={[]}
          handleDiscardToggle={vi.fn()}
          handleCardClick={vi.fn()}
          handleUnplayableClick={vi.fn()}
          cancelTargeting={cancelTargeting}
          confirmPlayCard={confirmPlayCard}
        />
      );

      const floatingPill = container.querySelector('.card-floating-actions');
      expect(floatingPill).not.toBeNull();

      const cancelBtn = floatingPill.querySelector('.btn-card-floating-cancel');
      const confirmBtn = floatingPill.querySelector('.btn-card-floating-confirm');
      expect(cancelBtn).not.toBeNull();
      expect(confirmBtn).not.toBeNull();
      expect(confirmBtn.textContent.trim()).toBe('Dùng');

      fireEvent.click(confirmBtn);
      expect(confirmPlayCard).toHaveBeenCalled();

      fireEvent.click(cancelBtn);
      expect(cancelTargeting).toHaveBeenCalled();
    });

    it('MyHeroBar hiển thị badge PHE ẨN hoặc PHE SƠN đơn lẻ, không chứa emoji 🕵️ hay 🐺', async () => {
      const { default: MyHeroBar } = await import('../game/MyHeroBar');
      const unrevealedMe = {
        id: 0,
        faction: 'none',
        isRevealed: false,
        isDaTam: false,
        hp: 4,
        maxHp: 4,
        heroes: [
          { name: 'Lê Ngân', emoji: '⚔️' },
          { name: 'Đinh Điền', emoji: '🛡️' }
        ],
        revealedHeroes: [false, false]
      };

      const { container, rerender } = render(
        <MyHeroBar
          me={unrevealedMe}
          gameState={{ phase: 'action' }}
          activePhase="action"
          handleRevealClick={vi.fn()}
          actionBar={<div>BAR</div>}
          playerHand={<div>HAND</div>}
          setHeroPopup={vi.fn()}
          setCardPopup={vi.fn()}
          targetSession={null}
          handleTargetClick={vi.fn()}
        />
      );

      const badgesContainer = container.querySelector('.my-hero-dock-badges');
      expect(badgesContainer.textContent).toContain('PHE ẨN');
      expect(badgesContainer.textContent).not.toContain('🕵️');
      expect(badgesContainer.textContent).not.toContain('PHE NONE');

      // Khi đã lật tướng Sơn
      const revealedMe = {
        ...unrevealedMe,
        faction: 'sơn',
        isRevealed: true,
        revealedHeroes: [true, true]
      };

      rerender(
        <MyHeroBar
          me={revealedMe}
          gameState={{ phase: 'action' }}
          activePhase="action"
          handleRevealClick={vi.fn()}
          actionBar={<div>BAR</div>}
          playerHand={<div>HAND</div>}
          setHeroPopup={vi.fn()}
          setCardPopup={vi.fn()}
          targetSession={null}
          handleTargetClick={vi.fn()}
        />
      );

      expect(badgesContainer.textContent).toContain('PHE SƠN');
      expect(badgesContainer.textContent).not.toContain('🕵️');
      expect(badgesContainer.textContent).not.toContain('🐺');
    });

    it('PlayerBoard hiển thị tên đối thủ không bị cắt cụt maxWidth: 80px và badge ẨN không emoji', async () => {
      const { PlayerBoard } = await import('../game/PlayerBoard');
      const opponent = {
        id: 1,
        name: 'Người chơi 2',
        isAlive: true,
        isRevealed: false,
        faction: 'none',
        hp: 3,
        maxHp: 3,
        handCount: 4,
        heroes: [],
        revealedHeroes: [false, false]
      };
      const me = {
        id: 0,
        attackRange: 1,
        faction: 'sơn'
      };

      const { container } = render(
        <PlayerBoard
          player={opponent}
          me={me}
          isCurrentTurn={false}
          gameState={{ phase: 'action' }}
          handleTargetClick={vi.fn()}
          setHeroPopup={vi.fn()}
          setCardPopup={vi.fn()}
          targetSession={null}
        />
      );

      const nameEl = container.querySelector('.player-name');
      expect(nameEl.textContent).toContain('Người chơi 2');
      expect(nameEl.style.maxWidth).not.toBe('80px');

      const badgeEl = container.querySelector('.player-faction-badge');
      expect(badgeEl.textContent.trim()).toBe('ẨN');
      expect(badgeEl.textContent).not.toContain('🕵️');
    });

    it('GameView hiển thị nút Dùng và Hủy trực tiếp trên banner thông báo targetSession', async () => {
      const { default: GameView } = await import('../game/GameView');
      const card = { id: 'card-ruou', name: 'Rượu', type: 'basic', rank: '2', suit: 'spade', isPlayable: true, emoji: '🍷', desc: 'Hồi 1 máu hoặc tăng sát thương Chém' };
      const me = {
        id: 0,
        name: 'Người chơi 1',
        faction: 'sơn',
        hp: 3,
        maxHp: 3,
        hand: [card],
        heroes: [{ name: 'Lê Ngân' }, { name: 'Đinh Điền' }],
        revealedHeroes: [true, true]
      };
      const p2 = { id: 1, name: 'Người chơi 2', isAlive: true, isRevealed: false, hp: 3, maxHp: 3, hand: [], heroes: [], revealedHeroes: [false, false] };
      const p3 = { id: 2, name: 'Người chơi 3', isAlive: true, isRevealed: false, hp: 3, maxHp: 3, hand: [], heroes: [], revealedHeroes: [false, false] };
      const p4 = { id: 3, name: 'Người chơi 4', isAlive: true, isRevealed: false, hp: 3, maxHp: 3, hand: [], heroes: [], revealedHeroes: [false, false] };

      const gameState = {
        phase: 'action',
        currentPlayerIndex: 0,
        players: [me, p2, p3, p4],
        deck: [1, 2, 3],
        discardPile: [],
        playedCards: []
      };

      const gameAPI = {
        playCard: vi.fn(),
        dispatcher: { dispatchAction: vi.fn() },
        drawPhase: vi.fn(),
        endPhase: vi.fn()
      };

      const { container } = render(
        <MemoryRouter>
          <GameView
            gameState={gameState}
            gameAPI={gameAPI}
            onExit={vi.fn()}
          />
        </MemoryRouter>
      );

      // Khi người chơi chạm vào lá bài Rượu
      const ruouCard = container.querySelector('.hand-cards .card');
      expect(ruouCard).not.toBeNull();
      fireEvent.click(ruouCard);

      // Banner thông báo xuất hiện với thông điệp và các nút thao tác ngay tại chỗ
      const notificationBanner = container.querySelector('.target-notification-banner');
      expect(notificationBanner).not.toBeNull();
      expect(notificationBanner.textContent).toContain('Bạn muốn sử dụng [Rượu]?');

      const confirmBtn = notificationBanner.querySelector('.btn-notification-confirm');
      const cancelBtn = notificationBanner.querySelector('.btn-notification-cancel');
      expect(confirmBtn).not.toBeNull();
      expect(cancelBtn).not.toBeNull();
      expect(confirmBtn.textContent).toContain('Dùng Rượu');

      // Nhấn nút Dùng ngay trên thông báo
      fireEvent.click(confirmBtn);
      expect(gameAPI.playCard).toHaveBeenCalledWith(0, 'card-ruou', [], expect.anything());
    });

    it('Tâm Công: Khi kích hoạt kỹ năng, nhấp chọn mục tiêu luôn dispatch ACTION_USE_SKILL chứ không bị nhầm thành playCard', async () => {
      const { useTargeting } = await import('../game/hooks/useTargeting');
      const gameAPI = {
        playCard: vi.fn(),
        dispatcher: { dispatchAction: vi.fn() }
      };
      const isActionPending = { current: false };
      const setTargetSession = vi.fn();
      const setActiveSkill = vi.fn();

      const { result } = renderHook(() => useTargeting({
        gameState: { players: [{ id: 0 }, { id: 1 }] },
        gameAPI,
        targetSession: {
          card: { id: 'c_chem', name: 'Chém' }, // Giả định card bị dính trong session
          targetingDef: { type: 'single' },
          selectedTargets: [],
          validTargets: [1]
        },
        setTargetSession,
        activeSkill: 'Tâm Công',
        setActiveSkill,
        isActionPending,
        mainPlayerId: 0
      }));

      // Người chơi nhấp chọn người chơi 1
      result.current.handleTargetClick(1);

      // Phải dispatch ACTION_USE_SKILL cho tam-cong, KHÔNG được gọi playCard!
      expect(gameAPI.dispatcher.dispatchAction).toHaveBeenCalledWith({
        type: 'ACTION_USE_SKILL',
        payload: {
          playerId: 0,
          skillId: 'tam-cong',
          targets: [1]
        }
      });
      expect(gameAPI.playCard).not.toHaveBeenCalled();
    });

    it('Tâm Công: Nhấp vào lá bài trên tay khi đang bật Tâm Công sẽ cảnh báo và không ghi đè session bài', async () => {
      const { useCardInteraction } = await import('../game/hooks/useCardInteraction');
      const gameAPI = {
        addLog: vi.fn()
      };
      const setTargetSession = vi.fn();

      const { result } = renderHook(() => useCardInteraction({
        gameState: {
          phase: 'action',
          players: [
            { id: 0, hand: [{ id: 'c_chem', name: 'Chém', isPlayable: false }] }
          ]
        },
        gameAPI,
        activeSkill: 'Tâm Công',
        targetSession: { card: null },
        setTargetSession,
        cancelTargeting: vi.fn(),
        mainPlayerId: 0
      }));

      result.current.handleCardClick(0);

      // Không ghi đè targetSession sang lá Chém, mà báo log hướng dẫn người chơi
      expect(setTargetSession).not.toHaveBeenCalled();
      expect(gameAPI.addLog).toHaveBeenCalledWith(
        expect.stringContaining('Tâm Công'),
        'warning'
      );
    });
  });

  describe('10. Mobile Landscape Layout & Combat Log Text Size Stability', () => {
    it('GameView: Tab Cá nhân lọc chính xác log của Người chơi chính và hiển thị fallback khi trống', async () => {
      const GameViewModule = await import('../game/GameView');
      const GameView = GameViewModule.default;

      const mockGameState = {
        phase: 'action',
        currentPlayerIndex: 0,
        deck: [1, 2, 3],
        discardPile: [],
        playedCards: [],
        players: [
          {
            id: 0,
            name: 'Người chơi 1',
            heroes: [{ id: 'hero-1', name: 'Nguyễn Trãi' }],
            revealedHeroes: [true],
            hand: [],
            equipment: [],
            hp: 3,
            maxHp: 3
          },
          {
            id: 1,
            name: 'Người chơi 2',
            heroes: [{ id: 'hero-2', name: 'Trần Hưng Đạo' }],
            revealedHeroes: [true],
            hand: [],
            equipment: [],
            hp: 3,
            maxHp: 3
          }
        ],
        logs: [
          { text: 'Trần Hưng Đạo dùng [Sát] lên Người chơi 3', timestamp: Date.now() },
          { text: 'Nguyễn Trãi mất 1 sinh lực', timestamp: Date.now(), important: true }
        ]
      };

      const { container } = render(
        <MemoryRouter>
          <GameView gameState={mockGameState} mainPlayerId={0} />
        </MemoryRouter>
      );

      // Mở log container và chuyển sang tab Cá nhân
      const personalTab = screen.getByText('Cá nhân');
      expect(personalTab).toBeTruthy();

      fireEvent.click(personalTab);

      // Phải thấy log liên quan đến Nguyễn Trãi
      expect(screen.getAllByText(/Nguyễn Trãi mất 1 sinh lực/i).length).toBeGreaterThan(0);
      // Không thấy log chỉ dành cho Trần Hưng Đạo và Người chơi 3
      expect(screen.queryByText(/Trần Hưng Đạo dùng \[Sát\] lên Người chơi 3/i)).toBeNull();
    });
  });
});

