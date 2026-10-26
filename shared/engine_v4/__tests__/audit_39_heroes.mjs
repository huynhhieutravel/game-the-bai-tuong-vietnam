import { globalHeroRegistry, hasSkill } from '../heroes/HeroRegistry.js';
import { GameState } from '../core/GameState.js';
import { Dispatcher } from '../application/DispatcherV4.js';
import { BotBrain } from '../ai/BotBrain.js';
import { getAvailableTargets } from '../rules/TargetResolverV4.js';
import { HEROES } from '../../data/gameData.js';
import { SkillDescriptions, SkillIdToName } from '../../data/SkillDescriptions.js';
import { normalizeSkillId, normalizeSkillType, isSameFaction, getCanonicalFaction } from '../../utils/translationHelper.js';

console.log('=== GRILL AUDIT: 39 HEROES DEEP VERIFICATION ===');
let issues = [];

for (const gh of HEROES) {
  const hero = globalHeroRegistry.getHero(gh.id);
  if (!hero) {
    issues.push(`[${gh.id}] Không tìm thấy hero trong HeroRegistry!`);
    continue;
  }

  // 1. Check HP & Faction & Gender
  if (hero.hp !== gh.maxHp) {
    issues.push(`[${hero.name}] HP mismatch: Registry=${hero.hp}, gameData=${gh.maxHp}`);
  }
  const canFac1 = getCanonicalFaction(hero.faction);
  const canFac2 = getCanonicalFaction(gh.faction);
  if (canFac1 !== canFac2) {
    issues.push(`[${hero.name}] Faction mismatch: Registry=${hero.faction} (${canFac1}), gameData=${gh.faction} (${canFac2})`);
  }

  // 2. Invariant Check: KHÔNG ĐƯỢC CÓ KỸ NĂNG TRÙNG LẶP TRONG CÙNG MỘT TƯỚNG
  const ghNames = (gh.skills || []).map(s => s.name);
  const uniqueGhNames = new Set(ghNames);
  if (ghNames.length !== uniqueGhNames.size) {
    issues.push(`[${gh.name}] Trùng lặp tên kỹ năng trong gameData: ${ghNames.join(', ')}`);
  }
  const regNames = (hero.skills || []).map(s => s.name);
  const uniqueRegNames = new Set(regNames);
  if (regNames.length !== uniqueRegNames.size) {
    issues.push(`[${hero.name}] Trùng lặp tên kỹ năng trong HeroRegistry: ${regNames.join(', ')}`);
  }

  // 3. Check Skills in hero against gameData
  const regSkillIds = (hero.skills || []).map(s => s.id);
  for (const gs of gh.skills || []) {
    const normGsId = normalizeSkillId(gs.id);
    const hasMatch = regSkillIds.some(sid => normalizeSkillId(sid) === normGsId);
    if (!hasMatch) {
      issues.push(`[${hero.name}] Kỹ năng ${gs.name} (${gs.id}) trong gameData không khớp với skill nào trong HeroRegistry!`);
    }

    // Check description
    const desc = SkillDescriptions[gs.name] || SkillDescriptions[gs.id] || SkillDescriptions[normGsId];
    if (!desc) {
      issues.push(`[${hero.name}] Kỹ năng ${gs.name} thiếu mô tả trong SkillDescriptions!`);
    }
  }

  // 4. Check Lock & Active Skills
  for (const s of hero.skills || []) {
    if (s.type === 'lock') {
      const isLock = globalHeroRegistry.isLockSkill(s.id);
      if (!isLock) {
        issues.push(`[${hero.name}] Lock skill [${s.name}] (${s.id}) chưa được đăng ký trong isLockSkill!`);
      }
    }
    
    // Check normalizeSkillType
    const normType = normalizeSkillType(s.type);
    if (!normType.code) {
      issues.push(`[${hero.name}] Skill [${s.name}] có type không xác định: ${s.type}`);
    }
  }
}

// 5. Cross-Hero Skill Collision Audit (Chặn đứng xung đột ID/Bí danh giữa 39 Tướng)
const globalSkillOwnership = new Map();
for (const gh of HEROES) {
  for (const s of gh.skills || []) {
    const normId = normalizeSkillId(s.id);
    if (globalSkillOwnership.has(normId)) {
      const existingOwner = globalSkillOwnership.get(normId);
      if (existingOwner.id !== gh.id) {
        issues.push(`[XUNG ĐỘT KỸ NĂNG] Kỹ năng [${s.name}] (${normId}) bị trùng ID giữa 2 tướng khác nhau: [${existingOwner.name}] và [${gh.name}]!`);
      }
    } else {
      globalSkillOwnership.set(normId, { id: gh.id, name: gh.name });
    }
  }
}

// 6. Conversion Skill Audit: Đảm bảo toàn bộ kỹ năng biến đổi bài được đăng ký trong hệ thống
const conversionSkills = ['than_hoa', 'ky_tap', 'doi_nui', 'pha_thanh', 'chuong_duong'];
for (const cs of conversionSkills) {
  const norm = normalizeSkillId(cs);
  if (!globalSkillOwnership.has(norm)) {
    issues.push(`[THIẾU KỸ NĂNG CHUYỂN ĐỔI] Kỹ năng biến đổi bài quan trọng [${cs}] không tìm thấy trong danh sách 39 tướng!`);
  }
}

console.log('--- GRILL AUDIT RESULTS ---');
if (issues.length === 0) {
  console.log('✅ TUYỆT VỜI! 39/39 Vị Tướng đạt chuẩn 100% không phát hiện bất kỳ lỗi nào!');
} else {
  console.error(`❌ Phát hiện ${issues.length} vấn đề cần xử lý ngay:`);
  issues.forEach(i => console.error(' - ' + i));
  process.exit(1);
}
