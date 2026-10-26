/**
 * fuzz_dual_heroes.mjs
 * Script Fuzzing Ma Trận Song Tướng (741 Pairs Dual-Hero Combinatorial Fuzzer)
 * Chạy độc lập: node shared/engine_v4/simulation/fuzz_dual_heroes.mjs
 */

import { globalHeroRegistry, getEffectiveSuit, getEffectiveColor, getEffectiveCard } from '../heroes/HeroRegistry.js';
import { LAC_HEROES } from '../heroes/lac/index.js';
import { VIET_HEROES } from '../heroes/viet/index.js';
import { HA_HEROES } from '../heroes/ha/index.js';
import { SON_HEROES } from '../heroes/son/index.js';

console.log('='.repeat(70));
console.log('🎲 BẮT ĐẦU FUZZING MA TRẬN 741 CẶP SONG TƯỚNG (VIỆT SÁT ENGINE V4)');
console.log('='.repeat(70));

const allHeroes = [...LAC_HEROES, ...VIET_HEROES, ...HA_HEROES, ...SON_HEROES];
const uniqueHeroes = Array.from(new Map(allHeroes.map(h => [h.id, h])).values());

console.log(`[INFO] Đã nạp thành công ${uniqueHeroes.length} vị tướng độc bản từ 4 hệ (Lạc, Việt, Hà, Sơn).`);

let totalPairs = 0;
let totalCardsChecked = 0;
let errors = 0;

const testCards = [
  { id: 'c_spade_7', name: 'Sát Thương', suit: 'spade', color: 'black', rank: '7' },
  { id: 'c_heart_8', name: 'Né', suit: 'heart', color: 'red', rank: '8' },
  { id: 'c_club_9', name: 'Chém', suit: 'club', color: 'black', rank: '9' },
  { id: 'c_diamond_10', name: 'Đào', suit: 'diamond', color: 'red', rank: '10' }
];

for (let i = 0; i < uniqueHeroes.length; i++) {
  for (let j = i + 1; j < uniqueHeroes.length; j++) {
    totalPairs++;
    const h1 = uniqueHeroes[i];
    const h2 = uniqueHeroes[j];

    const expectedHp = Math.floor((h1.maxHp + h2.maxHp) / 2);
    if (expectedHp < 3 || expectedHp > 5) {
      console.error(`[LỖI] Cặp [${h1.name} + ${h2.name}] có MaxHP bất thường: ${expectedHp}`);
      errors++;
    }

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
      hand: [...testCards],
      equipment: []
    };

    for (const card of testCards) {
      totalCardsChecked++;
      try {
        const effSuit = getEffectiveSuit(mockPlayer, card);
        const effColor = getEffectiveColor(mockPlayer, card);
        const effCard = getEffectiveCard(mockPlayer, card);

        if (!effSuit || (effColor !== 'red' && effColor !== 'black')) {
          console.error(`[LỖI] Cặp [${h1.name} + ${h2.name}] sinh chất/màu sai: suit=${effSuit}, color=${effColor}`);
          errors++;
        }

        // Tướng Quốc Sắc phải luôn biến Spade thành Cơ/Đỏ
        const hasQuocSac = mockPlayer.heroes.some(h => (h.skills || []).some(s => s.id === 'quoc_sac' || s.id === 'quoc-sac'));
        if (hasQuocSac && card.suit === 'spade') {
          if (effSuit !== 'heart' || effColor !== 'red') {
            console.error(`[LỖI] Quốc Sắc không biến Spade thành Heart/Red ở cặp [${h1.name} + ${h2.name}]`);
            errors++;
          }
        }
      } catch (err) {
        console.error(`[EXCEPTION] Cặp [${h1.name} + ${h2.name}] gặp lỗi: ${err.message}`);
        errors++;
      }
    }
  }
}

console.log('-'.repeat(70));
console.log(`[KẾT QUẢ] Tổng số cặp song tướng đã duyệt: ${totalPairs} / 741`);
console.log(`[KẾT QUẢ] Tổng số thẻ bài đã kiểm thử biến đổi: ${totalCardsChecked}`);
console.log(`[KẾT QUẢ] Tổng số lỗi phát hiện: ${errors}`);
console.log('='.repeat(70));

if (errors > 0) {
  console.error('❌ FUZZING THẤT BẠI!');
  process.exit(1);
} else {
  console.log('✅ FUZZING 741 CẶP SONG TƯỚNG THÀNH CÔNG 100%!');
  process.exit(0);
}
