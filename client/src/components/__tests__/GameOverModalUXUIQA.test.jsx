/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameOverModal } from '../modals/GameOverModal';

describe('GameOverModal UX/UI QA Test Suite', () => {
  const mockGameState = {
    gameOver: true,
    winner: [1, 3], // Phe Việt thắng gồm Player 1 và Player 3
    players: [
      {
        id: 0,
        name: 'Bạn',
        faction: 'lac',
        isAlive: false,
        hp: 0,
        maxHp: 4,
        heroes: [{ name: 'Lạc Long Quân' }, { name: 'Thánh Gióng' }],
        revealedHeroes: [true, true]
      },
      {
        id: 1,
        name: 'Người chơi 2',
        faction: 'viet',
        isAlive: true,
        hp: 4,
        maxHp: 4,
        heroes: [{ name: 'Dương Đình Nghệ' }, { name: 'Phùng Hưng' }],
        revealedHeroes: [true, true]
      },
      {
        id: 2,
        name: 'Người chơi 3',
        faction: 'son',
        isAlive: false,
        hp: 0,
        maxHp: 3,
        heroes: [{ name: 'Đô Đốc Bảo' }, { name: 'Tuệ Tĩnh' }],
        revealedHeroes: [true, true]
      },
      {
        id: 3,
        name: 'Người chơi 4',
        faction: 'viet',
        isAlive: true,
        hp: 3,
        maxHp: 4,
        heroes: [{ name: 'Lý Thường Kiệt' }, { name: 'Nguyễn Lữ' }],
        revealedHeroes: [true, true]
      }
    ]
  };

  it('1. Hiển thị "Bạn" chuẩn mực, KHÔNG BAO GIỜ bị lặp thành "Bạn (Bạn)"', () => {
    render(<GameOverModal gameState={mockGameState} mainPlayerId={0} />);

    // Kiểm tra tên người chơi chính hiển thị là 'Bạn'
    const youElements = screen.getAllByText('Bạn');
    expect(youElements.length).toBeGreaterThanOrEqual(1);

    // Tuyệt đối không có chuỗi 'Bạn (Bạn)'
    expect(screen.queryByText(/Bạn \(Bạn\)/i)).toBeNull();
  });

  it('2. Hiển thị đầy đủ tất cả 4 người chơi trong bảng tổng kết', () => {
    render(<GameOverModal gameState={mockGameState} mainPlayerId={0} />);

    expect(screen.getByText(/Danh Sách Người Chơi \(4\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('Bạn').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Người chơi 2')).toBeInTheDocument();
    expect(screen.getByText('Người chơi 3')).toBeInTheDocument();
    expect(screen.getByText('Người chơi 4')).toBeInTheDocument();

    // Kiểm tra các tướng của người chơi hiển thị đầy đủ
    expect(screen.getByText(/Lạc Long Quân & Thánh Gióng/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dương Đình Nghệ & Phùng Hưng/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Đô Đốc Bảo & Tuệ Tĩnh/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Lý Thường Kiệt & Nguyễn Lữ/i).length).toBeGreaterThanOrEqual(1);
  });

  it('3. Phe Phái Chiến Thắng hiển thị rõ ràng, không nối xích dài dòng khó đọc', () => {
    render(<GameOverModal gameState={mockGameState} mainPlayerId={0} />);

    expect(screen.getByText(/PHE VIỆT/i)).toBeInTheDocument();
    // Người thắng cuộc được vinh danh rõ ràng
    expect(screen.getByText(/Người chơi 2 \(Dương Đình Nghệ & Phùng Hưng\)/i)).toBeInTheDocument();
  });

  it('4. Có đầy đủ 3 nút hành động và gọi đúng callback', () => {
    const onRestartMock = vi.fn();
    const onCloseMock = vi.fn();
    const onHomeMock = vi.fn();

    render(
      <GameOverModal 
        gameState={mockGameState} 
        mainPlayerId={0} 
        onRestart={onRestartMock} 
        onClose={onCloseMock} 
        onHome={onHomeMock} 
      />
    );

    const restartBtn = screen.getByText(/🔄 Chơi Lại Ván Mới/i);
    expect(restartBtn).toBeInTheDocument();
    fireEvent.click(restartBtn);
    expect(onRestartMock).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByText(/📜 Xem Lại Bàn Đấu/i);
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    const homeBtn = screen.getByText(/🏠 Về Menu Chính/i);
    expect(homeBtn).toBeInTheDocument();
    fireEvent.click(homeBtn);
    expect(onHomeMock).toHaveBeenCalledTimes(1);
  });
});
