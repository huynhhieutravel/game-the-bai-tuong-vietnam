/**
 * QA Test Script — Hệ Việt (越) Skills
 * Kiểm tra tất cả 10 kỹ năng của 7 tướng hệ Việt
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

// ========== Việt Faction Heroes ==========
const VIET_HEROES = [
  'trieu-quang-phuc', 'phung-hung', 'khuc-thua-du', 'duong-dinh-nghe',
  'ly-thuong-kiet', 'tran-quang-khai', 'nguyen-lu'
];

const VIET_SKILLS = [
  'da-trach',           // Triệu Quang Phục
  'khoi-nghia',         // Phùng Hưng
  'tu-chu', 'khoan-dan',// Khúc Thừa Dụ
  'duong-quan',         // Dương Đình Nghệ
  'nam-quoc-son-ha', 'tien-phat', // Lý Thường Kiệt
  'doat-sao', 'chuong-duong',    // Trần Quang Khải
  'tien-phong'          // Nguyễn Lữ
];

// ========== TEST 1: All Việt Heroes Registered ==========
section('TEST 1: Việt Heroes Registration');

for (const heroId of VIET_HEROES) {
  const hero = HeroRegistry[heroId];
  assert(hero !== undefined, `Hero "${heroId}" registered`);
  if (hero) {
    assert(hero.faction === 'Việt', `Hero "${hero.name}" faction is Việt (got: ${hero.faction})`);
    assert(hero.maxHp > 0, `Hero "${hero.name}" maxHp > 0 (got: ${hero.maxHp})`);
    assert(hero.skillIds && hero.skillIds.length > 0, `Hero "${hero.name}" has skills`);
  }
}

// ========== TEST 2: All Việt Skills Registered ==========
section('TEST 2: Việt Skills Registration');

for (const skillId of VIET_SKILLS) {
  const skill = SkillRegistry[skillId];
  assert(skill !== undefined, `Skill "${skillId}" registered`);
  if (skill) {
    assert(skill.name && skill.name.length > 0, `Skill "${skillId}" has name: "${skill.name}"`);
    assert(skill.type !== undefined, `Skill "${skillId}" has type: ${skill.type}`);
  }
}

// ========== TEST 3: Active Skills Have Required Methods ==========
section('TEST 3: Active Skills Structure');

const ACTIVE_SKILLS = VIET_SKILLS.filter(id => {
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

const PASSIVE_SKILLS = VIET_SKILLS.filter(id => {
  const s = SkillRegistry[id];
  return s && s.type === 'PASSIVE';
});

for (const skillId of PASSIVE_SKILLS) {
  const skill = SkillRegistry[skillId];
  const hasHooks = skill.hooks && Object.keys(skill.hooks).length > 0;
  const hasOnReact = typeof skill.onReact === 'function';
  const hasConvertCard = typeof skill.convertCard === 'function';
  const hasSomeLogic = hasHooks || hasOnReact || hasConvertCard;
  
  // Some passives might be "flag-only", but we check if they have actual logic in their object.
  assert(hasSomeLogic, `Passive skill "${skill.name}" has hooks/onReact/convertCard`);
}

// ========== TEST 5: Hero-Skill Linking ==========
section('TEST 5: Hero-Skill Linking Integrity');

for (const heroId of VIET_HEROES) {
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
