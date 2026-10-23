// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { DodgeModal } from '../modals/DodgeModal';
import { TienPhatModal } from '../modals/TienPhatModal';
import { AskChangeJudgeModal } from '../modals/AskChangeJudgeModal';
import { HauVienModal } from '../modals/HauVienModal';
import { AskBocTramTrungDodgeModal } from '../modals/AskBocTramTrungDodgeModal';
import { AskBocTramTrungSlashModal } from '../modals/AskBocTramTrungSlashModal';

describe('QA Toàn diện UX/UI các kỹ năng & tính năng mới cải tiến', () => {
  describe('1. DodgeModal - Kỹ năng Bọc Trăm Trứng & Tiên Phát trong Quốc Chiến', () => {
    it('hiển thị nút Bọc Trăm Trứng cho Lạc Long Quân khi có đồng minh Lạc', () => {
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

      const bocTramTrungBtn = screen.getByText(/Kích Hoạt Bọc Trăm Trứng/i);
      expect(bocTramTrungBtn).toBeTruthy();

      fireEvent.click(bocTramTrungBtn);
      expect(onConfirm).toHaveBeenCalledWith({ callBocTramTrung: true });
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

  describe('5. AskBocTramTrungDodgeModal & AskBocTramTrungSlashModal', () => {
    it('lấy đúng bài của responderId khi được Lạc Long Quân gọi trợ chiến', () => {
      const onConfirm = vi.fn();
      const gameState = {
        players: [
          { id: 0, name: 'Lạc Long Quân', isAlive: true, faction: 'lac', hand: [] },
          { id: 1, name: 'Đồng Minh Âu Cơ', isAlive: true, faction: 'lac', hand: [{ id: 'ally_dodge_1', name: 'Né', suit: 'heart', rank: '10' }] }
        ]
      };

      const req = {
        type: 'ask_boc_tram_trung_dodge',
        sourceId: 0,
        targetId: 0,
        responderId: 1
      };

      render(<AskBocTramTrungDodgeModal req={req} gameState={gameState} onConfirm={onConfirm} />);

      // Chọn option lá Né
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '0' } });

      const helpBtn = screen.getByRole('button', { name: /Giúp đỡ/i });
      expect(helpBtn.disabled).toBe(false);

      fireEvent.click(helpBtn);
      expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
        doProvide: true,
        cardId: 'ally_dodge_1'
      }));
    });
  });
});
