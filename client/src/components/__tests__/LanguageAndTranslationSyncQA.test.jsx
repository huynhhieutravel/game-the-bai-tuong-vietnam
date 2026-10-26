/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  normalizeSkillType, 
  getCanonicalFaction, 
  getFactionLabel, 
  getFactionColor,
  isSameFaction, 
  normalizeGender, 
  getPlayerGender,
  getPlayerGenderLabel,
  normalizeSuit, 
  getSuitColor, 
  isSameSuit, 
  normalizeSkillId,
  normalizePhase,
  getPhaseLabel,
  FACTIONS,
  SKILL_TYPES,
  GENDERS
} from 'shared/utils/translationHelper.js';
import { ActionBar } from '../game/ActionBar.jsx';
import { CombatRules } from 'shared/engine_v4/rules/CombatRules.js';
import { GameState } from 'shared/engine_v4/core/GameState.js';

describe('QA Toàn Diện Đồng Bộ Ngôn Ngữ (Language & Translation Synchronization QA)', () => {

  describe('1. Chuẩn Hóa Kiểu Kỹ Năng (normalizeSkillType)', () => {
    it('nhận diện chính xác tất cả biến thể tiếng Việt và tiếng Anh của CHỦ ĐỘNG (ACTIVE)', () => {
      const activeVariants = ['CHỦ ĐỘNG', 'chủ động', 'CHU DONG', 'chu dong', 'ACTIVE', 'active', 'ACTIVE_DEFENSIVE', 'active defensive', 'action'];
      activeVariants.forEach(variant => {
        const norm = normalizeSkillType(variant);
        expect(norm.code).toBe(SKILL_TYPES.ACTIVE);
        expect(norm.label).toBe('CHỦ ĐỘNG');
        expect(norm.isActive).toBe(true);
        expect(norm.isPassive).toBe(false);
        expect(norm.badgeColor).toBe('#3b82f6');
      });
    });

    it('nhận diện chính xác tất cả biến thể tiếng Việt và tiếng Anh của BỊ ĐỘNG (PASSIVE)', () => {
      const passiveVariants = ['BỊ ĐỘNG', 'bị động', 'BI DONG', 'bi dong', 'PASSIVE', 'passive', 'reactive', 'phản ứng'];
      passiveVariants.forEach(variant => {
        const norm = normalizeSkillType(variant);
        expect(norm.code).toBe(SKILL_TYPES.PASSIVE);
        expect(norm.label).toBe('BỊ ĐỘNG');
        expect(norm.isPassive).toBe(true);
        expect(norm.isActive).toBe(false);
        expect(norm.badgeColor).toBe('#10b981');
      });
    });

    it('nhận diện chính xác tất cả biến thể của TỎA ĐỊNH (LOCK)', () => {
      const lockVariants = ['TỎA ĐỊNH', 'tỏa định', 'TOA DINH', 'LOCK', 'locked', 'khóa', 'KHOA'];
      lockVariants.forEach(variant => {
        const norm = normalizeSkillType(variant);
        expect(norm.code).toBe(SKILL_TYPES.LOCK);
        expect(norm.label).toBe('TỎA ĐỊNH');
        expect(norm.isLock).toBe(true);
        expect(norm.badgeColor).toBe('#ef4444');
      });
    });

    it('nhận diện chính xác tất cả biến thể của HẠN ĐỊNH (LIMITED)', () => {
      const limitedVariants = ['HẠN ĐỊNH', 'hạn định', 'HAN DINH', 'LIMITED', 'limited'];
      limitedVariants.forEach(variant => {
        const norm = normalizeSkillType(variant);
        expect(norm.code).toBe(SKILL_TYPES.LIMITED);
        expect(norm.label).toBe('HẠN ĐỊNH');
        expect(norm.isLimited).toBe(true);
        expect(norm.badgeColor).toBe('#8b5cf6');
      });
    });

    it('fallback an toàn khi truyền null, undefined hoặc kiểu rỗng', () => {
      const normNull = normalizeSkillType(null);
      expect(normNull.code).toBe(SKILL_TYPES.PASSIVE);
      expect(normNull.label).toBe('BỊ ĐỘNG');
      
      const normEmpty = normalizeSkillType('');
      expect(normEmpty.code).toBe(SKILL_TYPES.PASSIVE);
    });
  });

  describe('2. Chuẩn Hóa Phe Phái & Đồng Minh (Faction & Alliance Synchronization)', () => {
    it('đồng bộ chính xác 100% giữa mã tiếng Anh và tên tiếng Việt có dấu của 4 Phe', () => {
      expect(getCanonicalFaction('Lạc')).toBe(FACTIONS.LAC);
      expect(getCanonicalFaction('lac')).toBe(FACTIONS.LAC);
      expect(getFactionLabel('lac')).toBe('Lạc');

      expect(getCanonicalFaction('Việt')).toBe(FACTIONS.VIET);
      expect(getCanonicalFaction('viet')).toBe(FACTIONS.VIET);
      expect(getFactionLabel('viet')).toBe('Việt');

      expect(getCanonicalFaction('Hà')).toBe(FACTIONS.HA);
      expect(getCanonicalFaction('ha')).toBe(FACTIONS.HA);
      expect(getFactionLabel('ha')).toBe('Hà');

      expect(getCanonicalFaction('Sơn')).toBe(FACTIONS.SON);
      expect(getCanonicalFaction('son')).toBe(FACTIONS.SON);
      expect(getFactionLabel('son')).toBe('Sơn');
    });

    it('hàm isSameFaction xử lý hoàn hảo trường hợp một bên là tiếng Anh một bên là tiếng Việt', () => {
      const p1 = { id: 0, faction: 'Hà', isDaTam: false };
      const p2 = { id: 1, faction: 'ha', isDaTam: false };
      expect(isSameFaction(p1, p2)).toBe(true);

      const p3 = { id: 2, faction: 'Sơn', isDaTam: false };
      const p4 = { id: 3, faction: 'son', isDaTam: false };
      expect(isSameFaction(p3, p4)).toBe(true);

      const p5 = { id: 4, faction: 'Lạc', isDaTam: false };
      const p6 = { id: 5, faction: 'lac', isDaTam: false };
      expect(isSameFaction(p5, p6)).toBe(true);

      // Khác phe
      expect(isSameFaction(p1, p3)).toBe(false);
      expect(isSameFaction('ha', 'son')).toBe(false);
    });

    it('Dã Tâm không bao giờ đồng minh với bất kỳ ai, kể cả một Dã Tâm khác', () => {
      const daTam1 = { id: 0, faction: 'Lạc', isDaTam: true };
      const daTam2 = { id: 1, faction: 'Lạc', isDaTam: true };
      const normalLac = { id: 2, faction: 'Lạc', isDaTam: false };

      expect(isSameFaction(daTam1, normalLac)).toBe(false);
      expect(isSameFaction(daTam1, daTam2)).toBe(false);
    });

    it('getFactionColor trả về màu chuẩn xác bất kể định dạng đầu vào', () => {
      expect(getFactionColor('Hà')).toBe('#3b82f6');
      expect(getFactionColor('ha')).toBe('#3b82f6');
      expect(getFactionColor('Sơn')).toBe('#b45309');
      expect(getFactionColor('son')).toBe('#b45309');
      expect(getFactionColor('Lạc')).toBe('#10b981');
      expect(getFactionColor('lac')).toBe('#10b981');
      expect(getFactionColor('Việt')).toBe('#ef4444');
      expect(getFactionColor('viet')).toBe('#ef4444');
      expect(getFactionColor('Lạc', true)).toBe('#eab308'); // Dã Tâm
    });
  });

  describe('3. Chuẩn Hóa Giới Tính Tướng (Gender Synchronization)', () => {
    it('chuẩn hóa cả tiếng Việt và tiếng Anh sang canonical male/female', () => {
      expect(normalizeGender('Nam')).toBe(GENDERS.MALE);
      expect(normalizeGender('nam')).toBe(GENDERS.MALE);
      expect(normalizeGender('male')).toBe(GENDERS.MALE);
      expect(normalizeGender('MALE')).toBe(GENDERS.MALE);

      expect(normalizeGender('Nữ')).toBe(GENDERS.FEMALE);
      expect(normalizeGender('nữ')).toBe(GENDERS.FEMALE);
      expect(normalizeGender('nu')).toBe(GENDERS.FEMALE);
      expect(normalizeGender('female')).toBe(GENDERS.FEMALE);
      expect(normalizeGender('FEMALE')).toBe(GENDERS.FEMALE);
    });

    it('tướng chưa lộ diện trả về none', () => {
      const hiddenPlayer = {
        id: 0,
        mainHeroId: 'thuy_to',
        heroes: [{ id: 'thuy_to', gender: 'male' }],
        revealedHeroes: [false, false]
      };
      expect(getPlayerGender(hiddenPlayer)).toBe(GENDERS.NONE);
    });

    it('tướng đã mở trả về giới tính chính xác', () => {
      const revealedPlayer = {
        id: 0,
        mainHeroId: 'thuy_to',
        heroes: [{ id: 'thuy_to', gender: 'Nam' }],
        revealedHeroes: [true, false]
      };
      expect(getPlayerGender(revealedPlayer)).toBe(GENDERS.MALE);
      expect(getPlayerGenderLabel(revealedPlayer)).toBe('Nam');
    });
  });

  describe('4. Chuẩn Hóa Chất & Màu Sắc Lá Bài (Suit & Color Synchronization)', () => {
    it('nhận diện chính xác 4 chất qua tiếng Anh, tiếng Việt và Symbol', () => {
      // Cơ / Heart
      ['heart', 'hearts', '♥', 'cơ', 'co', 'Cơ'].forEach(s => {
        const norm = normalizeSuit(s);
        expect(norm.code).toBe('heart');
        expect(norm.color).toBe('red');
        expect(norm.emoji).toBe('♥');
        expect(getSuitColor(s)).toBe('red');
      });

      // Rô / Diamond
      ['diamond', 'diamonds', '♦', 'rô', 'ro', 'Rô'].forEach(s => {
        const norm = normalizeSuit(s);
        expect(norm.code).toBe('diamond');
        expect(norm.color).toBe('red');
        expect(norm.emoji).toBe('♦');
        expect(getSuitColor(s)).toBe('red');
      });

      // Bích / Spade
      ['spade', 'spades', '♠', 'bích', 'bich', 'Bích'].forEach(s => {
        const norm = normalizeSuit(s);
        expect(norm.code).toBe('spade');
        expect(norm.color).toBe('black');
        expect(norm.emoji).toBe('♠');
        expect(getSuitColor(s)).toBe('black');
      });

      // Nhép / Chuồn / Club
      ['club', 'clubs', '♣', 'chuồn', 'chuon', 'nhép', 'nhep'].forEach(s => {
        const norm = normalizeSuit(s);
        expect(norm.code).toBe('club');
        expect(norm.color).toBe('black');
        expect(norm.emoji).toBe('♣');
        expect(getSuitColor(s)).toBe('black');
      });
    });

    it('isSameSuit so sánh chính xác giữa ký hiệu emoji và chữ viết', () => {
      expect(isSameSuit('cơ', '♥')).toBe(true);
      expect(isSameSuit('heart', 'Cơ')).toBe(true);
      expect(isSameSuit('♦', 'rô')).toBe(true);
      expect(isSameSuit('diamond', '♦')).toBe(true);
      expect(isSameSuit('chuồn', '♣')).toBe(true);
      expect(isSameSuit('bích', '♠')).toBe(true);
      expect(isSameSuit('cơ', 'bích')).toBe(false);
    });
  });

  describe('5. Chuẩn Hóa ID & Tên Kỹ Năng (Skill ID Normalization)', () => {
    it('chuyển đổi hoàn hảo tên tiếng Việt có dấu sang ID snake_case', () => {
      expect(normalizeSkillId('Hòa Thân')).toBe('hoa_than');
      expect(normalizeSkillId('Hòa Thân An Tư')).toBe('hoa_than_an_tu');
      expect(normalizeSkillId('Đoạt Sáo')).toBe('doat_sao');
      expect(normalizeSkillId('Đoạt Sao')).toBe('doat_sao'); // Fix lỗi typo tiếng Việt
      expect(normalizeSkillId('Can Gián')).toBe('can_gian');
      expect(normalizeSkillId('Kỳ Tập')).toBe('ky_tap');
      expect(normalizeSkillId('Dời Núi')).toBe('doi_nui');
      expect(normalizeSkillId('Bọc Trăm Trứng')).toBe('boc_tram_trung');
      expect(normalizeSkillId('Phá Thành')).toBe('pha_thanh');
      expect(normalizeSkillId('Thần Hỏa')).toBe('than_hoa');
      expect(normalizeSkillId('Khai Thiên')).toBe('khai_thien');
      expect(normalizeSkillId('Định Quốc')).toBe('dinh_quoc');
      expect(normalizeSkillId('Tiên Phong')).toBe('tien_phong');
      expect(normalizeSkillId('Tiên Duyên')).toBe('tien_duyen');
      expect(normalizeSkillId('Tâm Công')).toBe('tam_cong');
      expect(normalizeSkillId('Vân Đồn')).toBe('van_don');
      expect(normalizeSkillId('Duyên Thơ')).toBe('duyen_tho');
      expect(normalizeSkillId('Lặn Sâu')).toBe('lan_sau');
      expect(normalizeSkillId('Bạch Đằng')).toBe('bach_dang');
      expect(normalizeSkillId('Tự Chủ')).toBe('tu_chu');
      expect(normalizeSkillId('Bình Loạn')).toBe('binh_loan');
      expect(normalizeSkillId('Thủy Tổ')).toBe('thuy_to');
      expect(normalizeSkillId('Diệu Dược')).toBe('dieu_duoc');
      expect(normalizeSkillId('Trung Dũng')).toBe('trung_dung');
    });

    it('xử lý trơn tru cả slug kebab-case (dấu gạch nối)', () => {
      expect(normalizeSkillId('hoa-than')).toBe('hoa_than');
      expect(normalizeSkillId('doat-sao')).toBe('doat_sao');
      expect(normalizeSkillId('can-gian')).toBe('can_gian');
      expect(normalizeSkillId('ky-tap')).toBe('ky_tap');
      expect(normalizeSkillId('thuy-to')).toBe('thuy_to');
    });
  });

  describe('6. Chuẩn Hóa Giai Đoạn (Phase Normalization)', () => {
    it('chuyển đổi giai đoạn chuẩn xác sang tiếng Việt có dấu', () => {
      expect(normalizePhase('action')).toBe('action');
      expect(normalizePhase('Hành động')).toBe('action');
      expect(normalizePhase('draw')).toBe('draw');
      expect(getPhaseLabel('action')).toBe('Hành Động');
      expect(getPhaseLabel('draw')).toBe('Rút Bài');
      expect(getPhaseLabel('discard')).toBe('Bỏ Bài');
    });
  });

  describe('7. Tích Hợp Giao Diện ActionBar (UI Integration Test)', () => {
    it('hiển thị đầy đủ nút kỹ năng chủ động dù type là chuỗi tiếng Việt hay tiếng Anh', () => {
      const mockMe = {
        id: 0,
        name: 'Người Chơi',
        faction: 'Lạc',
        isSilenced: false,
        revealedHeroes: [true, false],
        heroes: [
          {
            name: 'Kinh Dương Vương',
            skills: [
              { name: 'Thủy Tổ', type: 'CHỦ ĐỘNG', desc: 'Mô tả Thủy Tổ', isUsable: true },
              { name: 'Hòa Thân', type: 'ACTIVE', desc: 'Mô tả Hòa Thân', isUsable: true }
            ]
          }
        ]
      };

      const mockGameState = {
        phase: 'action',
        players: [mockMe]
      };

      render(
        <ActionBar
          me={mockMe}
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

      // Cả 2 nút kỹ năng Thủy Tổ (type: 'CHỦ ĐỘNG') và Hòa Thân (type: 'ACTIVE') đều phải xuất hiện trên màn hình!
      expect(screen.getByText('Thủy Tổ')).toBeDefined();
      expect(screen.getByText('Hòa Thân')).toBeDefined();
    });

    it('kích hoạt nút trợ chiến Định Quốc khi đồng minh thuộc phe Sơn bất kể chữ hoa/thường hay có dấu', () => {
      const mockMe = {
        id: 0,
        name: 'Đồng Minh Sơn',
        faction: 'Sơn', // Tiếng Việt có dấu, viết hoa
        isSilenced: false,
        hand: [{ id: 'card_1', name: 'Né' }],
        revealedHeroes: [true],
        heroes: [{ name: 'Sơn Tinh', skills: [] }],
        dinhQuocUsedThisTurn: false
      };

      const mockDinhDien = {
        id: 1,
        name: 'Đinh Điền',
        faction: 'son', // Tiếng Anh viết thường
        isAlive: true,
        revealedHeroes: [true],
        heroes: [{ name: 'Đinh Điền', skills: [{ id: 'dinh-quoc', name: 'Định Quốc' }] }]
      };

      const mockGameState = {
        phase: 'action',
        players: [mockMe, mockDinhDien]
      };

      render(
        <ActionBar
          me={mockMe}
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

      // Nút Định Quốc trợ chiến phải xuất hiện!
      expect(screen.getByText('Định Quốc')).toBeDefined();
    });
  });

  describe('8. Tích Hợp CombatRules với Đồng Bộ Phe Phái', () => {
    it('xử lý đúng thưởng diệt địch và phạt ngộ sát khi killer mang phe "ha" còn victim mang phe "Hà"', () => {
      const state = new GameState({
        players: [
          { id: 0, name: 'Player 1', faction: 'ha', isAlive: true, hand: [{ id: 'card_1' }, { id: 'card_2' }] },
          { id: 1, name: 'Player 2', faction: 'Hà', isAlive: false, hp: 0, hand: [] },
          { id: 2, name: 'Player 3', faction: 'Sơn', isAlive: true, hp: 3, hand: [] }
        ]
      });

      // Giết đồng minh p2 (cùng phe Hà) -> Bị phạt bỏ toàn bộ bài trên tay và trang bị
      CombatRules.handleDeath(state, 1, 0);

      // Do isSameFaction('ha', 'Hà') === true, p1 phải bị phạt mất toàn bộ bài trên tay!
      const killer = state.getPlayer(0);
      expect(killer.hand.length).toBe(0);
    });

    it('nhận diện chính xác chiến thắng khi toàn bộ người còn sống cùng phe dù định dạng khác nhau', () => {
      const state = new GameState({
        players: [
          { id: 0, name: 'P1', faction: 'ha', isAlive: true, revealedHeroes: [true] },
          { id: 1, name: 'P2', faction: 'Hà', isAlive: true, revealedHeroes: [true] },
          { id: 2, name: 'P3', faction: 'Sơn', isAlive: false, hp: 0 },
          { id: 3, name: 'P4', faction: 'son', isAlive: false, hp: 0 }
        ]
      });

      const isOver = CombatRules.checkGameOver(state);
      expect(isOver).toBe(true);
      expect(state.gameOver).toBe(true);
      expect(state.winner).toEqual([0, 1]);
    });
  });

});
