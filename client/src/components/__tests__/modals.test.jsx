// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { ModalContainer } from '../modals/ModalContainer';
import * as GameProvider from '../../contexts/GameProvider';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';

// Mock contexts
vi.mock('../../contexts/GameProvider', () => ({
  useGameState: vi.fn(),
  useGameAPI: vi.fn(),
}));

describe('ModalContainer and all sub-modals', () => {
  const mockPlayers = [
    { id: 0, isAlive: true, name: 'Player 0', hand: [{ idx: 0, name: 'Chém', suit: '♠', color: 'black' }], hp: 3, maxHp: 3, equipment: [], draftHeroes: [{id: 1, faction: 'Lạc'}], attackRange: 1, distanceFromMe: 0, distances: {1: 1} },
    { id: 1, isAlive: true, name: 'Player 1', hand: [], hp: 3, maxHp: 3, equipment: [], draftHeroes: [], attackRange: 1, distanceFromMe: 1, distances: {0: 1} },
  ];

  const modalTypes = [
    'ask_khai_quoc', 'ask_snatch', 'ask_dismantle', 'ask_quan_co', 'ask_quan_co_draw', 
    'ask_banh_chung', 'ask_can_gian', 'ask_thong_ngon', 'ask_hau_vien', 'ask_tien_phat', 
    'ask_doat_sao', 'ask_hien_hau', 'ask_that_tram_so', 'ask_that_tram_so_punish', 
    'ask_doi_su', 'ask_hoa_nghi', 'ask_ho_chu', 'ask_xa_than', 'ask_xuan_huong', 
    'ask_bach_dang', 'ask_lan_sau', 'ask_suit', 'ask_van_don', 'ask_phat_tam', 
    'ask_duyen_tho', 'ask_doat_sao_discard', 'ask_chuong_duong_discard', 'ask_chuong_duong_move', 
    'ask_da_trach', 'ask_khoi_nghia', 'ask_khoan_dan', 'ask_nam_quoc_son_ha', 'ask_tu_chu', 
    'ask_tu_chu_target', 'ask_duong_quan', 'ask_tien_phong', 'ask_uy_chan', 'ask_an_bang', 
    'ask_phat_toi', 'ask_pha_thanh', 'ask_dieu_duoc', 'ask_hoa_than', 'ask_binh_loan', 
    'ask_trung_dung', 'ask_nghi_ngo', 'ask_perfect_pair', 'ask_reveal_for_skill', 'ask_thuy_to', 
    'ask_thuy_to_bonus', 'ask_boc_tram_trung_slash', 'ask_tre_nga_discard', 'ask_dodge', 'ask_slash',
    'ask_peach', 'ask_negate', 'ask_weapon_skill'
  ];

  it('renders VipHeroSelectorModal without crashing', () => {
    const { container } = render(
      <VipHeroSelectorModal 
        draftSelection={[1]} 
        me={mockPlayers[0]} 
        onSelect={() => {}} 
        onClose={() => {}} 
      />
    );
    expect(container).toBeTruthy();
  });

  modalTypes.forEach(type => {
    it(`renders ModalContainer for request type: ${type} without crashing`, () => {
      GameProvider.useGameState.mockReturnValue({
        players: mockPlayers,
        waitingForResponse: {
          type: type,
          responderId: 0,
          sourceId: 1,
          targetId: 1,
          duelTargetId: 1,
          dyingId: 1,
          reqCard: 'Chém',
          virtualCardName: 'Chém',
          skillName: 'TestSkill',
          judgeSuit: '♠',
          reason: 'quyet-dau', 
        },
        deck: [{ name: 'Né' }, { name: 'Chém' }]
      });
      GameProvider.useGameAPI.mockReturnValue({ respond: vi.fn() });

      const { container } = render(<ModalContainer />);
      expect(container).toBeTruthy(); 
    });
  });
});
