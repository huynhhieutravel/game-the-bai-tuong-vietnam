// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { TienPhongModal } from '../modals/TienPhongModal';
import { VanDonModal } from '../modals/VanDonModal';

describe('UI QA: TienPhongModal và VanDonModal', () => {
  describe('1. TienPhongModal', () => {
    const mockGameStateWithHandWeapon = {
      players: [
        {
          id: 0,
          name: 'Player 0 (Nguyễn Lữ)',
          hp: 3,
          maxHp: 4,
          hand: [
            { id: 'w_dao_long', name: 'Thanh Long Đao', type: 'equip', subtype: 'equip_weapon', suit: 'diamond', rank: '3' },
            { id: 'c_chem', name: 'Chém', type: 'basic', subtype: 'slash', suit: 'spade', rank: 'A' }
          ],
          equipment: { weapon: null, armor: null }
        },
        {
          id: 1,
          name: 'Player 1 (Mục Tiêu)',
          hp: 3,
          maxHp: 3,
          hand: [],
          equipment: {}
        }
      ]
    };

    it('Nút "Bỏ 1 Vũ Khí" được enable khi người chơi có vũ khí trên tay (Thanh Long Đao)', () => {
      const onConfirm = vi.fn();
      render(
        <TienPhongModal
          req={{ sourceId: 0, targetId: 1 }}
          gameState={mockGameStateWithHandWeapon}
          onConfirm={onConfirm}
        />
      );

      const weaponBtn = screen.getByText(/Bỏ 1 Vũ Khí/i);
      expect(weaponBtn.disabled).toBe(false);

      // Click vào nút Bỏ 1 Vũ Khí
      fireEvent.click(weaponBtn);

      // Thấy tên vũ khí Thanh Long Đao hiển thị
      expect(screen.getByText('Thanh Long Đao')).toBeTruthy();

      // Bấm Xác Nhận
      const confirmBtn = screen.getByText('Xác Nhận');
      expect(confirmBtn.disabled).toBe(false);
      fireEvent.click(confirmBtn);

      expect(onConfirm).toHaveBeenCalledWith({
        doUse: true,
        costType: 'weapon',
        cardId: 'w_dao_long',
        targetId: 1
      });
    });

    it('Nút "Bỏ 1 Vũ Khí" bị disable khi không có vũ khí trên tay hay trang bị', () => {
      const mockStateNoWeapon = {
        players: [
          {
            id: 0,
            name: 'Player 0',
            hp: 3,
            hand: [{ id: 'c1', name: 'Chém', type: 'basic', subtype: 'slash' }],
            equipment: {}
          },
          { id: 1, name: 'Player 1', hp: 3, hand: [], equipment: {} }
        ]
      };
      render(
        <TienPhongModal
          req={{ sourceId: 0, targetId: 1 }}
          gameState={mockStateNoWeapon}
          onConfirm={() => {}}
        />
      );

      const weaponBtn = screen.getByText(/Bỏ 1 Vũ Khí/i);
      expect(weaponBtn.disabled).toBe(true);
    });
  });

  describe('2. VanDonModal', () => {
    const mockGameState = {
      players: [
        {
          id: 0,
          name: 'Bạn',
          hp: 3,
          hand: [
            { id: 'c_hoa_giai', name: 'Hóa Giải', suit: 'heart', rank: '8', color: 'red' },
            { id: 'c_chem', name: 'Chém', suit: 'spade', rank: 'K', color: 'black' }
          ]
        },
        {
          id: 1,
          name: 'Người chơi 2',
          hp: 4,
          revealedHeroes: [true],
          heroes: [{ id: 'tran_khanh_du', name: 'Trần Khánh Dư' }],
          hand: [{ id: 'c_tuoc_bai', name: 'Tước Bài', suit: 'spade', rank: 'Q' }]
        }
      ]
    };

    it('Khi người chơi là bên bị thách đấu (targetId = 0, sourceId = 1): Hiển thị đối thủ là Trần Khánh Dư và cho chọn bài đọ điểm', () => {
      const onConfirm = vi.fn();
      render(
        <VanDonModal
          req={{ sourceId: 1, targetId: 0, responderId: 0 }}
          gameState={mockGameState}
          onConfirm={onConfirm}
        />
      );

      // Kiểm tra text hiển thị chính xác tên đối thủ phát động đấu điểm
      expect(screen.getByText(/Trần Khánh Dư/i)).toBeTruthy();
      expect(screen.getByText(/phát động Đấu Điểm với bạn/i)).toBeTruthy();

      // Kiểm tra có lá bài Hóa Giải 8 và Chém K để người chơi click chọn
      expect(screen.getByText('Hóa Giải')).toBeTruthy();
      expect(screen.getByText('Chém')).toBeTruthy();

      // Nút Đấu Điểm bị disable trước khi chọn bài
      const duelBtn = screen.getByText(/⚔️ Đấu Điểm/i);
      expect(duelBtn.disabled).toBe(true);

      // Người chơi click chọn lá Chém K
      fireEvent.click(screen.getByText('Chém'));

      // Nút Đấu Điểm đã được kích hoạt
      expect(duelBtn.disabled).toBe(false);
      fireEvent.click(duelBtn);

      expect(onConfirm).toHaveBeenCalledWith({
        canceled: false,
        cardId: 'c_chem',
        cardIndex: 1
      });
    });
  });
});
