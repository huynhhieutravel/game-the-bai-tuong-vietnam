// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerBoard } from '../game/PlayerBoard';
import MyHeroBar from '../game/MyHeroBar';
import { GameOverModal } from '../modals/GameOverModal';
import { toViewModel } from 'shared/engine_v4/application/GameViewMapperV4';
import { globalHeroRegistry } from 'shared/engine_v4/heroes/HeroRegistry';
import { ToHienThanh } from 'shared/engine_v4/heroes/ha/index';

describe('QA Features: Dead Labels, GameOver Modal, Skill Deduplication, Kill Rewards', () => {
  // Test 1: Deduplication - Tô Hiến Thành only has 1 "Nhiếp Chính"
  it('1- Tô Hiến Thành chỉ có đúng 1 mô tả Nhiếp Chính, không bị nhân đôi', () => {
    globalHeroRegistry.registerHero(ToHienThanh);
    const mockState = {
      players: [
        {
          id: 0,
          name: 'Player 0',
          heroId: 'to_hien_thanh',
          mainHeroId: 'to_hien_thanh',
          skills: ['nhiep_chinh'],
          revealedHeroes: [true, false],
          hand: [],
          hp: 3,
          maxHp: 3,
          isAlive: true
        }
      ]
    };

    const vm = toViewModel(mockState, 0);
    const p0 = vm.players[0];
    const hero = p0.heroes[0];
    expect(hero.name).toBe('Tô Hiến Thành');
    const nhiepChinhSkills = hero.skills.filter(s => s.name === 'Nhiếp Chính');
    expect(nhiepChinhSkills.length).toBe(1);
    expect(nhiepChinhSkills[0].desc).toContain('Nếu trong giai đoạn Hành động');
  });

  // Test 2: Dead label on PlayerBoard
  it('2- Khi người chơi chết (isAlive = false), PlayerBoard hiển thị nhãn TỬ TRẬN nổi bật', () => {
    const deadPlayer = {
      id: 2,
      name: 'Bot 2 [Sơn Tinh & Cao Lỗ]',
      faction: 'lac',
      hp: 0,
      maxHp: 4,
      isAlive: false,
      isRevealed: true,
      revealedHeroes: [true, true],
      heroes: [{ name: 'Sơn Tinh' }, { name: 'Cao Lỗ' }],
      hand: [],
      equipment: {}
    };

    const me = { id: 0, faction: 'ha', isAlive: true, attackRange: 1 };
    const gameState = { players: [me, deadPlayer] };

    render(
      <PlayerBoard 
        player={deadPlayer} 
        gameState={gameState} 
        me={me} 
        isCurrentTurn={false} 
        handleTargetClick={() => {}} 
        setHeroPopup={() => {}} 
      />
    );

    const deadBadges = screen.getAllByText(/TỬ TRẬN/i);
    expect(deadBadges.length).toBeGreaterThanOrEqual(1);
  });

  // Test 2b: Dead label on MyHeroBar
  it('2b- Khi bản thân chết (me.isAlive = false), MyHeroBar hiển thị BẠN ĐÃ TỬ TRẬN', () => {
    const deadMe = {
      id: 0,
      name: 'Bạn',
      faction: 'ha',
      hp: 0,
      maxHp: 3,
      isAlive: false,
      isRevealed: true,
      revealedHeroes: [true, false],
      heroes: [{ name: 'Nguyễn Trãi' }],
      hand: [],
      equipment: {}
    };

    const gameState = { players: [deadMe] };

    render(
      <MyHeroBar 
        me={deadMe} 
        gameState={gameState} 
        activePhase="action" 
        handleRevealClick={() => {}} 
        actionBar={null} 
        playerHand={null} 
        setHeroPopup={() => {}} 
      />
    );

    expect(screen.getAllByText(/TỬ TRẬN/i).length).toBeGreaterThanOrEqual(1);
  });

  // Test 3: GameOverModal renders properly with winner details and replay action
  it('3- Khi kết thúc game (gameState.gameOver = true), GameOverModal hiển thị đầy đủ thông tin thắng bại và nút chơi lại', () => {
    const mockGameOverState = {
      gameOver: true,
      winner: [0],
      players: [
        {
          id: 0,
          name: 'Người chơi 0',
          faction: 'ha',
          isAlive: true,
          hp: 3,
          maxHp: 3,
          heroes: [{ name: 'Nguyễn Trãi' }, { name: 'Trần Khánh Dư' }],
          revealedHeroes: [true, true]
        },
        {
          id: 1,
          name: 'Người chơi 1',
          faction: 'viet',
          isAlive: false,
          hp: 0,
          maxHp: 4,
          heroes: [{ name: 'Dương Đình Nghệ' }],
          revealedHeroes: [true, false]
        }
      ]
    };

    const onRestartMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <GameOverModal 
        gameState={mockGameOverState} 
        mainPlayerId={0} 
        onRestart={onRestartMock} 
        onClose={onCloseMock} 
      />
    );

    // Header đại thắng
    expect(screen.getByText(/ĐẠI THẮNG QUANG VINH!/i)).toBeInTheDocument();
    expect(screen.getByText(/PHE HÀ/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Nguyễn Trãi & Trần Khánh Dư/i).length).toBeGreaterThanOrEqual(1);

    // Nút hành động
    const restartBtn = screen.getByText(/Chơi Lại Ván Mới/i);
    expect(restartBtn).toBeInTheDocument();
    fireEvent.click(restartBtn);
    expect(onRestartMock).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByText(/Xem Lại Bàn Đấu/i);
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
