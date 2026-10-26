/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionBar } from '../game/ActionBar.jsx';
import { HEROES } from 'shared/data/gameData.js';
import { normalizeSkillType, normalizeSkillId } from 'shared/utils/translationHelper.js';

describe('QA Hợp Đồng Giao Diện Tướng (ActionBar Hero Skills UI Contract QA)', () => {
  // Lọc ra các tướng có kỹ năng chủ động trong gameData
  const activeHeroes = HEROES.filter(hero => {
    return (hero.skills || []).some(skill => {
      const norm = normalizeSkillType(skill.type || skill.name);
      const normId = normalizeSkillId(skill.id || skill.name);
      const knownActiveIds = [
        'hoa_than', 'dieu_duoc', 'tu_chu', 'binh_loan', 'thuy_to',
        'duyen_tho', 'tam_cong', 'bach_dang', 'lan_sau', 'van_don',
        'ky_tap', 'doi_nui', 'pha_thanh', 'than_hoa', 'khai_thien',
        'dinh_quoc', 'tien_phong', 'tien_duyen', 'doat_sao', 'can_gian'
      ];
      return norm.isActive || knownActiveIds.includes(normId);
    });
  });

  it('phải có ít nhất 15 vị tướng sở hữu kỹ năng chủ động trong danh sách 39 tướng', () => {
    expect(activeHeroes.length).toBeGreaterThanOrEqual(15);
  });

  describe('1. Kiểm Tra Hiển Thị Nút Kỹ Năng Chủ Động Khi Tướng Đã Lộ Diện', () => {
    activeHeroes.forEach(hero => {
      it(`tướng [${hero.name}] (${hero.faction}) hiển thị đầy đủ nút bấm kỹ năng chủ động trong Pha Hành Động`, () => {
        const mockPlayer = {
          id: 0,
          name: hero.name,
          faction: hero.faction,
          isSilenced: false,
          hand: [{ id: 'card_dummy', name: 'Chém' }],
          revealedHeroes: [true],
          heroes: [hero],
          dinhQuocUsedThisTurn: false
        };

        const mockGameState = {
          phase: 'action',
          players: [mockPlayer]
        };

        const { unmount } = render(
          <ActionBar
            me={mockPlayer}
            isMyTurn={true}
            gameState={mockGameState}
            gameAPI={{}}
            isActionPending={{ current: false }}
            handleDraw={() => {}}
            handleRevealClick={() => {}}
            handleExecuteSkill={() => {}}
            handleEndTurn={() => {}}
            cancelTargeting={() => {}}
          />
        );

        // Nút Kết Thúc phải luôn hiện diện
        expect(screen.getByText('Kết Thúc')).toBeDefined();

        // Kiểm tra xem kỹ năng chủ động của tướng có hiển thị nút bấm hay không
        const activeSkills = hero.skills.filter(s => {
          const norm = normalizeSkillType(s.type || s.name);
          const normId = normalizeSkillId(s.id || s.name);
          const knownActiveIds = [
            'hoa_than', 'dieu_duoc', 'tu_chu', 'binh_loan', 'thuy_to',
            'duyen_tho', 'tam_cong', 'bach_dang', 'lan_sau', 'van_don',
            'ky_tap', 'doi_nui', 'pha_thanh', 'than_hoa', 'khai_thien',
            'dinh_quoc', 'tien_phong', 'tien_duyen', 'doat_sao', 'can_gian'
          ];
          return norm.isActive || knownActiveIds.includes(normId);
        });

        activeSkills.forEach(s => {
          const btn = screen.getByText(s.name);
          expect(btn).toBeDefined();
          expect(btn.tagName).toBe('BUTTON');
        });

        unmount();
      });
    });
  });

  describe('2. Kiểm Tra Hành Vi Khi Tướng Đang Ẩn (Chế độ Quốc Chiến)', () => {
    it('hiển thị nút lật tướng có nhãn (Ẩn) khi tướng chưa lộ diện', () => {
      const anTuHero = HEROES.find(h => h.id === 'an-tu-cong-chua') || {
        name: 'An Tư Công Chúa',
        skills: [{ id: 'hoa-than', name: 'Hòa Thân', type: 'CHỦ ĐỘNG' }]
      };

      const mockPlayer = {
        id: 0,
        name: 'Player 0',
        faction: 'Hà',
        isSilenced: false,
        hand: [],
        revealedHeroes: [false], // Chưa lộ diện
        heroes: [anTuHero]
      };

      const mockGameState = {
        phase: 'action',
        players: [mockPlayer]
      };

      const { unmount } = render(
        <ActionBar
          me={mockPlayer}
          isMyTurn={true}
          gameState={mockGameState}
          gameAPI={{}}
          isActionPending={{ current: false }}
          handleDraw={() => {}}
          handleRevealClick={() => {}}
          handleExecuteSkill={() => {}}
          handleEndTurn={() => {}}
          cancelTargeting={() => {}}
        />
      );

      // Nút hiển thị Hòa Thân (Ẩn)
      expect(screen.getByText('Hòa Thân (Ẩn)')).toBeDefined();
      unmount();
    });
  });

  describe('3. Kiểm Tra Trạng Thái Vô Hiệu Khi Bị Câm Lặng (Silenced)', () => {
    it('vô hiệu hóa các nút kỹ năng chủ động khi player bị câm lặng (me.isSilenced = true)', () => {
      const tueTinhHero = HEROES.find(h => h.id === 'tue-tinh') || {
        name: 'Tuệ Tĩnh',
        skills: [{ id: 'dieu-duoc', name: 'Diệu Dược', type: 'ACTIVE' }]
      };

      const mockPlayer = {
        id: 0,
        name: 'Player 0',
        faction: 'Hà',
        isSilenced: true, // Bị câm lặng
        hand: [],
        revealedHeroes: [true],
        heroes: [tueTinhHero]
      };

      const mockGameState = {
        phase: 'action',
        players: [mockPlayer]
      };

      const { unmount } = render(
        <ActionBar
          me={mockPlayer}
          isMyTurn={true}
          gameState={mockGameState}
          gameAPI={{}}
          isActionPending={{ current: false }}
          handleDraw={() => {}}
          handleRevealClick={() => {}}
          handleExecuteSkill={() => {}}
          handleEndTurn={() => {}}
          cancelTargeting={() => {}}
        />
      );

      const btn = screen.getByText('Diệu Dược');
      expect(btn).toBeDefined();
      expect(btn.hasAttribute('disabled')).toBe(true);
      unmount();
    });
  });
});
