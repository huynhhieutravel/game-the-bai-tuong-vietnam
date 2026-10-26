// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';

describe('UI QA: VipHeroSelectorModal - 3 Cột & Hồ Sơ Kỹ Năng Chi Tiết', () => {
  it('1. Hiển thị đúng 3 cột và có đầy đủ 4 tab Phe chuẩn (Lạc, Việt, Hà, Sơn)', () => {
    const { container } = render(
      <VipHeroSelectorModal
        draftSelection={[]}
        me={{ id: 0 }}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );

    // Kiểm tra các Tab Phe
    expect(screen.getByText(/Tất Cả/i)).toBeTruthy();
    expect(screen.getByText(/🟢 Lạc/i)).toBeTruthy();
    expect(screen.getByText(/🔴 Việt/i)).toBeTruthy();
    expect(screen.getByText(/🔵 Hà/i)).toBeTruthy();
    expect(screen.getByText(/🟤 Sơn/i)).toBeTruthy();

    // Kiểm tra Grid 3 cột theo đúng yêu cầu
    const gridEl = container.querySelector('div[style*="grid-template-columns: repeat(3, 1fr)"], div[style*="gridTemplateColumns: repeat(3, 1fr)"], div[style*="repeat(3, 1fr)"]');
    expect(gridEl).toBeTruthy();
  });

  it('2. Nhấn vào một tướng mở bảng thông tin chi tiết đầy đủ kỹ năng (Hero Inspection Dossier)', () => {
    render(
      <VipHeroSelectorModal
        draftSelection={[]}
        me={{ id: 0 }}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );

    // Tìm và nhấn vào thẻ tướng "Lạc Long Quân"
    const llqCard = screen.getByText('Lạc Long Quân');
    expect(llqCard).toBeTruthy();
    fireEvent.click(llqCard);

    // Bảng chi tiết hồ sơ danh tướng mở ra
    expect(screen.getByText(/BẢNG KỸ NĂNG CHI TIẾT/i)).toBeTruthy();
    // Đọc được thông tin các kỹ năng của Lạc Long Quân
    expect(screen.getAllByText(/Thủy Tổ/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bọc Trăm Trứng/i).length).toBeGreaterThan(0);
    // Có nút Tuyển Mộ Tướng Này và nút Xem Tướng Khác
    expect(screen.getByText(/👑 Tuyển Mộ Tướng Này/i)).toBeTruthy();
    expect(screen.getByText(/✕ Xem Tướng Khác/i)).toBeTruthy();
  });

  it('3. Bấm "👑 Tuyển Mộ Tướng Này" gọi callback onSelect và đóng inspection', () => {
    const onSelect = vi.fn();
    render(
      <VipHeroSelectorModal
        draftSelection={[]}
        me={{ id: 0 }}
        onSelect={onSelect}
        onClose={() => {}}
      />
    );

    // Nhấn vào thẻ tướng Lạc Long Quân
    fireEvent.click(screen.getByText('Lạc Long Quân'));

    // Nhấn nút Tuyển Mộ Tướng Này
    const recruitBtn = screen.getByText(/👑 Tuyển Mộ Tướng Này/i);
    fireEvent.click(recruitBtn);

    // onSelect được gọi với id của Lạc Long Quân
    expect(onSelect).toHaveBeenCalledWith('lac-long-quan');
    // Panel inspection đóng lại
    expect(screen.queryByText(/BẢNG KỸ NĂNG CHI TIẾT/i)).toBeNull();
  });

  it('4. Lọc tab Phe "🔴 Việt" hiển thị các tướng phe Việt như Triệu Quang Phục, Phùng Hưng, Lý Thường Kiệt', () => {
    render(
      <VipHeroSelectorModal
        draftSelection={[]}
        me={{ id: 0 }}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );

    // Click vào tab Phe Việt
    fireEvent.click(screen.getByText(/🔴 Việt/i));

    // Thấy các tướng phe Việt
    expect(screen.getByText('Lý Thường Kiệt')).toBeTruthy();
    expect(screen.getByText('Triệu Quang Phục')).toBeTruthy();
    // Không thấy Lạc Long Quân (phe Lạc)
    expect(screen.queryByText('Lạc Long Quân')).toBeNull();
  });
});
