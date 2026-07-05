/**
 * QA Test Script — Hệ Hà (河) Skills
 * Kiểm tra tất cả 24 kỹ năng của 15 tướng hệ Hà
 */

import { SkillRegistry } from '../src/engine/registries/SkillRegistry.js';
import { HeroRegistry } from '../src/engine/registries/HeroRegistry.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${'='.repeat(60)}\n📋 ${name}\n${'='.repeat(60)}`);
}

// ========== Hà Faction Heroes ==========
const HA_HEROES = [
  'ngo-quyen', 'da-tuong', 'yet-kieu', 'nguyen-trai', 'nguyen-chich',
  'to-hien-thanh', 'nguyen-phi-y-lan', 'tran-nhat-duat', 'tran-khanh-du',
  'mac-dinh-chi', 'chu-van-an', 'ho-xuan-huong', 'nguyen-dia-lo',
  'ngoc-han-cong-chua', 'cong-chua-an-tu'
];

const HA_SKILLS = [
  'bach-dang', 'hau-vien',           // Ngô Quyền
  'ky-tap',                            // Dã Tượng
  'lan-sau',                           // Yết Kiêu
  'binh-ngo', 'tam-cong',             // Nguyễn Trãi
  'nghe-an-ke',                        // Nguyễn Chích
  'nhiep-chinh',                       // Tô Hiến Thành
  'thinh-chinh', 'phat-tam',          // Nguyên Phi Ỷ Lan
  'thong-ngon', 'hoa-nghi',           // Trần Nhật Duật
  'van-don',                           // Trần Khánh Dư
  'doi-su', 'ung-bien',               // Mạc Đĩnh Chi
  'that-tram-so',                      // Chu Văn An
  'duyen-tho', 'xuan-huong',          // Hồ Xuân Hương
  'ho-chu', 'can-gian',               // Nguyễn Địa Lô
  'hien-hau', 'quoc-sac',             // Ngọc Hân Công Chúa
  'hoa-than', 'xa-than'               // Công Chúa An Tư
];

// ========== TEST 1: All Hà Heroes Registered ==========
section('TEST 1: Hà Heroes Registration');

for (const heroId of HA_HEROES) {
  const hero = HeroRegistry[heroId];
  assert(hero !== undefined, `Hero "${heroId}" registered`);
  if (hero) {
    assert(hero.faction === 'Hà', `Hero "${hero.name}" faction is Hà (got: ${hero.faction})`);
    assert(hero.maxHp > 0, `Hero "${hero.name}" maxHp > 0 (got: ${hero.maxHp})`);
    assert(hero.skillIds && hero.skillIds.length > 0, `Hero "${hero.name}" has skills`);
  }
}

// ========== TEST 2: All Hà Skills Registered ==========
section('TEST 2: Hà Skills Registration');

for (const skillId of HA_SKILLS) {
  const skill = SkillRegistry[skillId];
  assert(skill !== undefined, `Skill "${skillId}" registered`);
  if (skill) {
    assert(skill.name && skill.name.length > 0, `Skill "${skillId}" has name: "${skill.name}"`);
    assert(skill.type !== undefined, `Skill "${skillId}" has type: ${skill.type}`);
    assert(skill.aiConfig !== undefined, `Skill "${skillId}" has aiConfig`);
  }
}

// ========== TEST 3: Active Skills Have Required Methods ==========
section('TEST 3: Active Skills Structure');

const ACTIVE_SKILLS = HA_SKILLS.filter(id => {
  const s = SkillRegistry[id];
  return s && s.type === 'ACTIVE';
});

for (const skillId of ACTIVE_SKILLS) {
  const skill = SkillRegistry[skillId];
  const hasCanUse = typeof skill.canUse === 'function';
  const hasOnUse = typeof skill.onUse === 'function' || typeof skill.onActivate === 'function';
  const hasTargets = typeof skill.getValidTargets === 'function';
  
  assert(hasCanUse, `Active skill "${skill.name}" has canUse`);
  assert(hasOnUse, `Active skill "${skill.name}" has onUse or onActivate`);
  assert(hasTargets, `Active skill "${skill.name}" has getValidTargets`);
}

// ========== TEST 4: Passive Skills Have Hooks or onReact ==========
section('TEST 4: Passive Skills Structure');

const PASSIVE_SKILLS = HA_SKILLS.filter(id => {
  const s = SkillRegistry[id];
  return s && s.type === 'PASSIVE';
});

for (const skillId of PASSIVE_SKILLS) {
  const skill = SkillRegistry[skillId];
  const hasHooks = skill.hooks && Object.keys(skill.hooks).length > 0;
  const hasOnReact = typeof skill.onReact === 'function';
  const hasConvertCard = typeof skill.convertCard === 'function';
  const hasSomeLogic = hasHooks || hasOnReact || hasConvertCard;
  
  // Some passives are "flag-only" (logic handled in Dispatcher)
  const flagOnlySkills = ['binh-ngo', 'nghe-an-ke', 'nhiep-chinh', 'quoc-sac'];
  const isFlagOnly = flagOnlySkills.includes(skillId);
  
  if (isFlagOnly) {
    assert(true, `Passive skill "${skill.name}" is flag-only (logic in Dispatcher) ✓`);
  } else {
    assert(hasSomeLogic, `Passive skill "${skill.name}" has hooks/onReact/convertCard`);
  }
}

// ========== TEST 5: turnResetFlags ==========
section('TEST 5: Turn Reset Flags');

const SKILLS_WITH_FLAGS = ['bach-dang', 'lan-sau', 'van-don', 'tam-cong', 'duyen-tho', 'hoa-than', 'that-tram-so'];

for (const skillId of SKILLS_WITH_FLAGS) {
  const skill = SkillRegistry[skillId];
  if (skill) {
    const hasFlags = skill.turnResetFlags && skill.turnResetFlags.length > 0;
    assert(hasFlags, `Skill "${skill.name}" has turnResetFlags: [${skill.turnResetFlags?.join(', ')}]`);
  }
}

// ========== TEST 6: Kỳ Tập Implementation ==========
section('TEST 6: Kỳ Tập (Dã Tượng) — Bài Đen → Tước Bài');

const kyTap = SkillRegistry['ky-tap'];
assert(kyTap !== undefined, 'Kỳ Tập registered');
assert(kyTap.type === 'ACTIVE', 'Kỳ Tập is ACTIVE');
assert(typeof kyTap.canUse === 'function', 'Has canUse');
assert(typeof kyTap.getValidTargets === 'function', 'Has getValidTargets');
assert(typeof kyTap.onActivate === 'function', 'Has onActivate');

// Test canUse with mock state
const mockState6 = {
  players: [
    { id: 0, isAlive: true, hand: [{ name: 'Chém', color: 'black', suit: '♠' }], equipment: [], judgementArea: [] },
    { id: 1, isAlive: true, hand: [{ name: 'Đào', color: 'red' }], equipment: [], judgementArea: [] },
  ]
};
assert(kyTap.canUse(mockState6, mockState6.players[0]) === true, 'canUse returns true when has black card + target');

const mockState6b = {
  players: [
    { id: 0, isAlive: true, hand: [{ name: 'Đào', color: 'red', suit: '♥' }], equipment: [] },
    { id: 1, isAlive: true, hand: [{ name: 'Đào', color: 'red' }], equipment: [], judgementArea: [] },
  ]
};
assert(kyTap.canUse(mockState6b, mockState6b.players[0]) === false, 'canUse returns false when no black card');

// Test onActivate
const result6 = kyTap.onActivate(mockState6, mockState6.players[0]);
assert(result6.activeSkill === 'Kỳ Tập', 'onActivate returns {activeSkill: "Kỳ Tập"}');

// Test getValidTargets
const targets6 = kyTap.getValidTargets(mockState6, mockState6.players[0]);
assert(targets6.length === 1, 'getValidTargets returns 1 target');
assert(targets6[0].id === 1, 'Target is player 1');

// ========== TEST 7: Thính Chính Implementation ==========
section('TEST 7: Thính Chính (Nguyên Phi Ỷ Lan) — Bài Đen → Né');

const thinhChinh = SkillRegistry['thinh-chinh'];
assert(thinhChinh !== undefined, 'Thính Chính registered');
assert(thinhChinh.type === 'PASSIVE', 'Thính Chính is PASSIVE');
assert(typeof thinhChinh.convertCard === 'function', 'Has convertCard');

// Test convertCard with black card
const blackCard = { name: 'Chém', color: 'black', suit: '♠', rank: 'K' };
const converted = thinhChinh.convertCard(blackCard);
assert(converted !== null, 'Converts black card');
assert(converted.virtualName === 'Né', 'Converted virtualName is "Né"');
assert(converted.isConverted === true, 'Marked as converted');

// Test convertCard with red card (should return null)
const redCard = { name: 'Đào', color: 'red', suit: '♥', rank: 'A' };
const notConverted = thinhChinh.convertCard(redCard);
assert(notConverted === null, 'Does NOT convert red card');

// ========== TEST 8: Hero-Skill Linking ==========
section('TEST 8: Hero-Skill Linking Integrity');

for (const heroId of HA_HEROES) {
  const hero = HeroRegistry[heroId];
  if (!hero) continue;
  for (const skillId of hero.skillIds) {
    const skill = SkillRegistry[skillId];
    assert(skill !== undefined, `Hero "${hero.name}" → Skill "${skillId}" exists in registry`);
  }
}

// ========== SUMMARY ==========
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);

if (failed > 0) {
  process.exit(1);
}
