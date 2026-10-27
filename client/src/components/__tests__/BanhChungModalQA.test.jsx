// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { BanhChungModal } from '../modals/BanhChungModal';

describe('UI QA: BanhChungModal - Kỹ năng Bánh Chưng (Lang Liêu) Compact & Responsive', () => {
  const sampleCards = [
    { id: 'c1', name: 'Đào', suit: 'heart', rank: 'A', color: 'red' },
    { id: 'c2', name: 'Chém', suit: 'spade', rank: '7', color: 'black' },
    { id: 'c3', name: 'Né', suit: 'diamond', rank: 'K', color: 'red' },
    { id: 'c4', name: 'Sấm Sét', suit: 'spade', rank: 'Q', color: 'black' },
  ];

  it('1. Hiển thị đủ các lá bài ở cột Đỉnh với huy hiệu #1 Rút Đầu và số thứ tự', () => {
    render(
      <BanhChungModal
        req={{ viewedCards: sampleCards, viewCount: 4 }}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText(/Bánh Chưng \(Lang Liêu\)/i)).toBeTruthy();
    expect(screen.getByText(/#1 Rút Đầu/i)).toBeTruthy();
    expect(screen.getByText(/#2/i)).toBeTruthy();
    expect(screen.getByText(/#3/i)).toBeTruthy();
    expect(screen.getByText(/#4/i)).toBeTruthy();
    expect(screen.getByText(/Đào/i)).toBeTruthy();
    expect(screen.getByText(/Sấm Sét/i)).toBeTruthy();
  });

  it('2. Chuyển bài từ Đỉnh xuống Đáy khi bấm "Đáy ⬇"', () => {
    render(
      <BanhChungModal
        req={{ viewedCards: sampleCards, viewCount: 4 }}
        onConfirm={() => {}}
      />
    );

    const dayBtns = screen.getAllByRole('button', { name: /Đáy ⬇/i });
    expect(dayBtns.length).toBe(4);

    // Bấm chuyển lá đầu tiên (Đào) xuống đáy
    fireEvent.click(dayBtns[0]);

    // Sau khi chuyển, cột Đáy có 1 lá Đào
    expect(screen.getByText(/Đáy Bộ Bài \(1\)/i)).toBeTruthy();
    expect(screen.getByText(/Đỉnh Bộ Bài \(3\)/i)).toBeTruthy();
    // Nút "⬆ Lên Đỉnh" xuất hiện ở cột Đáy
    expect(screen.getByRole('button', { name: /⬆ Lên Đỉnh/i })).toBeTruthy();
  });

  it('3. Đưa bài từ Đáy trở lại Đỉnh khi bấm "⬆ Lên Đỉnh"', () => {
    render(
      <BanhChungModal
        req={{ viewedCards: sampleCards, viewCount: 4 }}
        onConfirm={() => {}}
      />
    );

    // Chuyển lá đầu tiên xuống đáy
    fireEvent.click(screen.getAllByRole('button', { name: /Đáy ⬇/i })[0]);
    expect(screen.getByText(/Đáy Bộ Bài \(1\)/i)).toBeTruthy();

    // Bấm nút đưa lên lại
    const lenDinhBtn = screen.getByRole('button', { name: /⬆ Lên Đỉnh/i });
    fireEvent.click(lenDinhBtn);

    // Cột Đáy lại trống, cột Đỉnh đủ 4 lá
    expect(screen.getByText(/Đáy Bộ Bài \(0\)/i)).toBeTruthy();
    expect(screen.getByText(/Đỉnh Bộ Bài \(4\)/i)).toBeTruthy();
  });

  it('4. Đổi thứ tự rút bài bằng nút ▲ và ▼', () => {
    const onConfirm = vi.fn();
    render(
      <BanhChungModal
        req={{ viewedCards: sampleCards, viewCount: 4 }}
        onConfirm={onConfirm}
      />
    );

    // Lá 1 đang là Đào, lá 2 là Chém. Bấm ▼ của lá 1 để đảo vị trí
    const downBtns = screen.getAllByRole('button', { name: '▼' });
    fireEvent.click(downBtns[0]); // Đào xuống vị trí 2, Chém lên #1

    // Bấm nút Xác nhận
    const confirmBtn = screen.getByRole('button', { name: /Xác Nhận Sắp Xếp/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0];
    expect(payload.orderedCards).toBe(true);
    expect(payload.deckTop[0].name).toBe('Chém');
    expect(payload.deckTop[1].name).toBe('Đào');
  });

  it('5. Thao tác nhanh: Bấm "Đẩy hết ⬇" và "Giữ hết ⬆"', () => {
    render(
      <BanhChungModal
        req={{ viewedCards: sampleCards, viewCount: 4 }}
        onConfirm={() => {}}
      />
    );

    // Bấm "Đẩy hết ⬇"
    const dayHetBtn = screen.getByRole('button', { name: /Đẩy hết ⬇/i });
    fireEvent.click(dayHetBtn);

    expect(screen.getByText(/Đỉnh Bộ Bài \(0\)/i)).toBeTruthy();
    expect(screen.getByText(/Đáy Bộ Bài \(4\)/i)).toBeTruthy();

    // Bấm "Giữ hết ⬆"
    const giuHetBtn = screen.getByRole('button', { name: /Giữ hết ⬆/i });
    fireEvent.click(giuHetBtn);

    expect(screen.getByText(/Đỉnh Bộ Bài \(4\)/i)).toBeTruthy();
    expect(screen.getByText(/Đáy Bộ Bài \(0\)/i)).toBeTruthy();
  });

  it('6. Không bị crash khi viewedCards rỗng hoặc undefined', () => {
    const { container } = render(
      <BanhChungModal
        req={{}}
        onConfirm={() => {}}
      />
    );

    expect(container).toBeTruthy();
    expect(screen.getByText(/\(Không có lá nào ở đỉnh\)/i)).toBeTruthy();
    expect(screen.getByText(/\(Không có lá nào ở đáy\)/i)).toBeTruthy();
  });
});
