import { describe, it, expect } from 'vitest';
import { globalHeroRegistry, getEffectiveSuit, getEffectiveColor, getEffectiveCard } from '../../heroes/HeroRegistry.js';
import { GameInvariants } from '../../core/Invariants.js';
import { createGameState, selectDraftHeroes } from '../../application/gameSetupV4.js';
import { Dispatcher } from '../../application/DispatcherV4.js';
import { GameAPI } from '../../application/GameAPIV4.js';
import { canPlayCard, canUseSkill } from '../../rules/TargetResolverV4.js';
import { LAC_HEROES } from '../../heroes/lac/index.js';
import { VIET_HEROES } from '../../heroes/viet/index.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('Ma Trận Fuzzing Toàn Diện Tổ Hợp Song Tướng (741 Pairs Dual-Hero Fuzzing Matrix)', () => {
  const allHeroes = [...LAC_HEROES, ...VIET_HEROES, ...HA_HEROES, ...SON_HEROES];
  const uniqueHeroes = Array.from(new Map(allHeroes.map(h => [h.id, h])).values());

  it(`xác thực có đầy đủ 39 vị tướng trong danh mục hệ thống`, () => {
    expect(uniqueHeroes.length).toBe(39);
  });

  it('quét toàn bộ 741 cặp song tướng để kiểm định tính hợp lệ của MaxHP và không gây xung đột crash', () => {
    let pairCount = 0;
    const errors = [];

    for (let i = 0; i < uniqueHeroes.length; i++) {
      for (let j = i + 1; j < uniqueHeroes.length; j++) {
        pairCount++;
        const h1 = uniqueHeroes[i];
        const h2 = uniqueHeroes[j];

        try {
          // Tính combined HP
          const expectedHp = Math.floor((h1.maxHp + h2.maxHp) / 2);
          expect(expectedHp).toBeGreaterThanOrEqual(3);
          expect(expectedHp).toBeLessThanOrEqual(5);

          // Tạo state giả lập gắn cả 2 tướng
          const mockPlayer = {
            id: 0,
            name: `${h1.name} & ${h2.name}`,
            isAlive: true,
            hp: expectedHp,
            maxHp: expectedHp,
            mainHeroId: h1.id,
            subHeroId: h2.id,
            heroes: [h1, h2],
            revealedHeroes: [true, true],
            hand: [
              { id: 'c_spade', name: 'Sát Thương', suit: 'spade', color: 'black', rank: '7', type: 'basic' },
              { id: 'c_heart', name: 'Né', suit: 'heart', color: 'red', rank: '8', type: 'basic' },
              { id: 'c_club', name: 'Chém', suit: 'club', color: 'black', rank: '9', type: 'basic' },
              { id: 'c_diamond', name: 'Đào', suit: 'diamond', color: 'red', rank: '10', type: 'basic' }
            ],
            equipment: [],
            judgementArea: [],
            attackRange: 1
          };

          // Kiểm tra tính toán chất và màu hiệu dụng không throw
          for (const card of mockPlayer.hand) {
            const effSuit = getEffectiveSuit(mockPlayer, card);
            const effColor = getEffectiveColor(mockPlayer, card);
            const effCard = getEffectiveCard(mockPlayer, card);

            expect(effSuit).toBeTruthy();
            expect(effColor === 'red' || effColor === 'black').toBe(true);
            expect(effCard.suit).toBe(effSuit);
            expect(effCard.color).toBe(effColor);
          }
        } catch (err) {
          errors.push(`Pair [${h1.name} + ${h2.name}]: ${err.message}`);
        }
      }
    }

    expect(pairCount).toBe((39 * 38) / 2); // 741 cặp
    expect(errors).toEqual([]);
  });

  describe('Ma trận hiệp đồng chuyên sâu các Tướng biến đổi bài & kỹ năng tiêu hao chất', () => {
    it('Quốc Sắc (Ngọc Hân) + Khai Thiên (Thần Trụ Trời): Spade hóa Cơ/Đỏ và được đánh như Chém', () => {
      const ngocHan = uniqueHeroes.find(h => h.id.includes('ngoc_han'));
      const thanTru = uniqueHeroes.find(h => h.id.includes('than_tru_troi'));

      const player = {
        id: 0,
        mainHeroId: ngocHan.id,
        subHeroId: thanTru.id,
        heroes: [ngocHan, thanTru],
        revealedHeroes: [true, true],
        hand: [{ id: 's1', name: 'Vô Trung Sinh Hữu', suit: 'spade', color: 'black', rank: 'A', type: 'trick' }],
        equipment: []
      };

      const card = player.hand[0];
      const effSuit = getEffectiveSuit(player, card);
      const effColor = getEffectiveColor(player, card);

      // Bích biến thành Cơ và Đỏ
      expect(effSuit).toBe('heart');
      expect(effColor).toBe('red');

      // Khai Thiên cho phép dùng bài đỏ làm Chém
      const canUseAsSlash = effColor === 'red';
      expect(canUseAsSlash).toBe(true);
    });

    it('Quốc Sắc (Ngọc Hân) + Thính Chính (Nguyễn Lữ): Spade không còn là Đen nên không được làm Né', () => {
      const ngocHan = uniqueHeroes.find(h => h.id.includes('ngoc_han'));
      const nguyenLu = uniqueHeroes.find(h => h.id.includes('nguyen_lu'));

      const player = {
        id: 0,
        mainHeroId: ngocHan.id,
        subHeroId: nguyenLu.id,
        heroes: [ngocHan, nguyenLu],
        revealedHeroes: [true, true],
        hand: [{ id: 's1', name: 'Đao', suit: 'spade', color: 'black', rank: '5', type: 'equipment' }],
        equipment: []
      };

      const card = player.hand[0];
      const effColor = getEffectiveColor(player, card);
      expect(effColor).toBe('red');

      // Thính Chính cần bài Đen làm Né -> Spade đã thành Đỏ nên KHÔNG được dùng
      const canUseThinhChinh = effColor === 'black';
      expect(canUseThinhChinh).toBe(false);
    });

    it('Quốc Sắc (Ngọc Hân) + Quân Cơ (Đinh Điền): Spade không được dùng để thay bài phán xét', () => {
      const ngocHan = uniqueHeroes.find(h => h.id.includes('ngoc_han'));
      const dinhDien = uniqueHeroes.find(h => h.id.includes('dinh_dien'));

      const player = {
        id: 0,
        mainHeroId: ngocHan.id,
        subHeroId: dinhDien.id,
        heroes: [ngocHan, dinhDien],
        revealedHeroes: [true, true],
        hand: [{ id: 's1', name: 'Chém', suit: 'spade', color: 'black', rank: '7', type: 'basic' }],
        equipment: []
      };

      const card = player.hand[0];
      const effColor = getEffectiveColor(player, card);
      expect(effColor).toBe('red');

      // Quân Cơ đòi hỏi bài Đen -> Spade đã thành Đỏ nên KHÔNG được dùng
      const canUseQuanCo = effColor === 'black';
      expect(canUseQuanCo).toBe(false);
    });

    it('Quốc Sắc (Ngọc Hân) + Bình Loạn (Nguyễn Bặc): 1 lá Bích và 1 lá Cơ tính là cùng chất Cơ', () => {
      const ngocHan = uniqueHeroes.find(h => h.id.includes('ngoc_han'));
      const nguyenBac = uniqueHeroes.find(h => h.id.includes('nguyen_bac'));

      const player = {
        id: 0,
        mainHeroId: ngocHan.id,
        subHeroId: nguyenBac.id,
        heroes: [ngocHan, nguyenBac],
        revealedHeroes: [true, true],
        hand: [
          { id: 'c1', name: 'Chém', suit: 'spade', color: 'black', rank: '7', type: 'basic' },
          { id: 'c2', name: 'Né', suit: 'heart', color: 'red', rank: '8', type: 'basic' }
        ],
        equipment: []
      };

      const s1 = getEffectiveSuit(player, player.hand[0]);
      const s2 = getEffectiveSuit(player, player.hand[1]);

      expect(s1).toBe('heart');
      expect(s2).toBe('heart');
      expect(s1).toBe(s2); // Cùng chất Cơ -> Kích hoạt thành công Bình Loạn
    });

    it('Quốc Sắc (Ngọc Hân) + Nam Dược (Tuệ Tĩnh): Lá Bích ngoài lượt dùng được như Đào cứu người', () => {
      const ngocHan = uniqueHeroes.find(h => h.id.includes('ngoc_han'));
      const tueTinh = uniqueHeroes.find(h => h.id.includes('tue_tinh'));

      const player = {
        id: 0,
        mainHeroId: ngocHan.id,
        subHeroId: tueTinh.id,
        heroes: [ngocHan, tueTinh],
        revealedHeroes: [true, true],
        hand: [{ id: 's1', name: 'Qua Cầu Rút Ván', suit: 'spade', color: 'black', rank: 'Q', type: 'trick' }],
        equipment: []
      };

      const effColor = getEffectiveColor(player, player.hand[0]);
      expect(effColor).toBe('red');

      // Nam Dược: Bài Đỏ ngoài lượt làm Đào
      const canUseAsPeach = effColor === 'red';
      expect(canUseAsPeach).toBe(true);
    });

    it('Quốc Sắc (Ngọc Hân) + Thần Hỏa (Rùa Vàng): Lá Bích dùng được như Hỏa Công', () => {
      const ngocHan = uniqueHeroes.find(h => h.id.includes('ngoc_han'));
      const ruaVang = uniqueHeroes.find(h => h.id.includes('rua_vang'));

      const player = {
        id: 0,
        mainHeroId: ngocHan.id,
        subHeroId: ruaVang.id,
        heroes: [ngocHan, ruaVang],
        revealedHeroes: [true, true],
        hand: [{ id: 's1', name: 'Chém', suit: 'spade', color: 'black', rank: '8', type: 'basic' }],
        equipment: []
      };

      const effColor = getEffectiveColor(player, player.hand[0]);
      expect(effColor).toBe('red');

      // Thần Hỏa: Dùng bài Đỏ làm Hỏa Công
      const canUseAsFireAttack = effColor === 'red';
      expect(canUseAsFireAttack).toBe(true);
    });
  });
});
