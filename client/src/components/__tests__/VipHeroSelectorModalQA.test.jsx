// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';

describe('UI QA: VipHeroSelectorModal - 4 Cột (4 Tướng 1 Hàng), Chọn Nhanh & Xem Chi Tiết Kỹ Năng', () => {
  it('1. Hiển thị đúng 4 cột (4 tướng 1 hàng) và có đầy đủ 4 tab Phe chuẩn (Lạc, Việt, Hà, Sơn)', () => {
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

    // Kiểm tra Grid 4 cột theo đúng yêu cầu
    const gridEl = container.querySelector('div[style*="grid-template-columns: repeat(4, 1fr)"], div[style*="gridTemplateColumns: repeat(4, 1fr)"], div[style*="repeat(4, 1fr)"]');
    expect(gridEl).toBeTruthy();
  });

  it('2. Chọn nhanh: Bấm nút "Chọn ✓" trên thẻ gọi onSelect ngay lập tức mà không cần mở inspection', () => {
    const onSelect = vi.fn();
    render(
      <VipHeroSelectorModal
        draftSelection={[]}
        me={{ id: 0 }}
        onSelect={onSelect}
        onClose={() => {}}
      />
    );

    // Tìm các nút "Chọn ✓" trên giao diện
    const selectBtns = screen.getAllByRole('button', { name: /Chọn ✓/i });
    expect(selectBtns.length).toBeGreaterThan(0);

    // Bấm nút Chọn của tướng đầu tiên hiển thị
    fireEvent.click(selectBtns[0]);

    // onSelect được gọi ngay lập tức với id tướng
    expect(onSelect).toHaveBeenCalledWith('ngo-quyen');
    // KHÔNG mở popup bảng kỹ năng chi tiết
    expect(screen.queryByText(/BẢNG KỸ NĂNG CHI TIẾT/i)).toBeNull();
  });

  it('3. Chọn nhanh: Nhấp trực tiếp vào thân thẻ tướng cũng kích hoạt onSelect', () => {
    const onSelect = vi.fn();
    render(
      <VipHeroSelectorModal
        draftSelection={[]}
        me={{ id: 0 }}
        onSelect={onSelect}
        onClose={() => {}}
      />
    );

    // Tìm thẻ Lạc Long Quân
    const llqTitle = screen.getByText('Lạc Long Quân');
    const cardEl = llqTitle.closest('div[style*="min-height: 230px"], div[style*="minHeight: 230px"]');
    expect(cardEl).toBeTruthy();

    // Click vào thẻ
    fireEvent.click(cardEl);

    // onSelect được gọi với id lac-long-quan
    expect(onSelect).toHaveBeenCalledWith('lac-long-quan');
    // Không mở inspection
    expect(screen.queryByText(/BẢNG KỸ NĂNG CHI TIẾT/i)).toBeNull();
  });

  it('4. Xem chi tiết: Bấm nút "Soi 🔍" mở bảng thông tin chi tiết đầy đủ kỹ năng (Hero Inspection Dossier)', () => {
    render(
      <VipHeroSelectorModal
        draftSelection={[]}
        me={{ id: 0 }}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );

    // Tìm và bấm nút "Soi 🔍" đầu tiên
    const inspectBtns = screen.getAllByRole('button', { name: /Soi 🔍/i });
    expect(inspectBtns.length).toBeGreaterThan(0);
    fireEvent.click(inspectBtns[0]);

    // Bảng chi tiết hồ sơ danh tướng mở ra
    expect(screen.getByText(/BẢNG KỸ NĂNG CHI TIẾT/i)).toBeTruthy();
    expect(screen.getAllByText('Ngô Quyền').length).toBeGreaterThanOrEqual(1);
    // Có nút Tuyển Mộ Tướng Này và nút Xem Tướng Khác
    expect(screen.getByText(/👑 Tuyển Mộ Tướng Này/i)).toBeTruthy();
    expect(screen.getByText(/✕ Xem Tướng Khác/i)).toBeTruthy();
  });

  it('5. Bấm "👑 Tuyển Mộ Tướng Này" trong bảng chi tiết gọi callback onSelect và đóng inspection', () => {
    const onSelect = vi.fn();
    render(
      <VipHeroSelectorModal
        draftSelection={[]}
        me={{ id: 0 }}
        onSelect={onSelect}
        onClose={() => {}}
      />
    );

    // Bấm nút Soi 🔍
    const inspectBtns = screen.getAllByRole('button', { name: /Soi 🔍/i });
    fireEvent.click(inspectBtns[0]);

    // Nhấn nút Tuyển Mộ Tướng Này
    const recruitBtn = screen.getByText(/👑 Tuyển Mộ Tướng Này/i);
    fireEvent.click(recruitBtn);

    // onSelect được gọi với id của Ngô Quyền
    expect(onSelect).toHaveBeenCalledWith('ngo-quyen');
    // Panel inspection đóng lại
    expect(screen.queryByText(/BẢNG KỸ NĂNG CHI TIẾT/i)).toBeNull();
  });

  it('6. Tướng đã chọn hiển thị badge "✓ ĐÃ CHỌN" và nút "Bỏ ✕"', () => {
    const onSelect = vi.fn();
    render(
      <VipHeroSelectorModal
        draftSelection={['lac-long-quan']}
        me={{ id: 0 }}
        onSelect={onSelect}
        onClose={() => {}}
      />
    );

    // Có badge "✓ ĐÃ CHỌN"
    expect(screen.getByText(/✓ ĐÃ CHỌN/i)).toBeTruthy();

    // Nút chọn chuyển thành "Bỏ ✕"
    const removeBtn = screen.getByRole('button', { name: /Bỏ ✕/i });
    expect(removeBtn).toBeTruthy();

    // Bấm "Bỏ ✕" gọi onSelect để bỏ chọn
    fireEvent.click(removeBtn);
    expect(onSelect).toHaveBeenCalledWith('lac-long-quan');
  });

  it('7. Khi đã chọn 1 tướng phe Lạc, tướng phe khác hiển thị "Khác phe" và bị disabled', () => {
    const onSelect = vi.fn();
    render(
      <VipHeroSelectorModal
        draftSelection={['lac-long-quan']} // Phe Lạc
        me={{ id: 0 }}
        onSelect={onSelect}
        onClose={() => {}}
      />
    );

    // Các tướng khác phe Lạc (như Triệu Quang Phục phe Việt, Ngô Quyền phe Hà) sẽ có nút "Khác phe"
    const otherFactionBtns = screen.getAllByRole('button', { name: /Khác phe/i });
    expect(otherFactionBtns.length).toBeGreaterThan(0);
    expect(otherFactionBtns[0].disabled).toBe(true);

    // Bấm vào nút khác phe không kích hoạt onSelect
    fireEvent.click(otherFactionBtns[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('8. Lọc tab Phe "🔴 Việt" hiển thị các tướng phe Việt như Triệu Quang Phục, Phùng Hưng, Lý Thường Kiệt', () => {
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
