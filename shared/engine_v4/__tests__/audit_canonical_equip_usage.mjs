/**
 * audit_canonical_equip_usage.mjs
 * Kiểm tra tĩnh tự động (Static Build Gate) đảm bảo toàn bộ codebase:
 * 1. TUYỆT ĐỐI KHÔNG dùng so sánh chuỗi ID trang bị thủ công kiểu cũ (.includes('crossbow'), .includes('thanh_long'), v.v.).
 * 2. Bắt buộc sử dụng isEquip() hoặc normalizeEquipKey() từ translationHelper.js.
 * 3. Kiểm tra tính toàn vẹn của từ điển CANONICAL_EQUIP_KEYS và WEAPON_RANGE_MAP.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CANONICAL_EQUIP_KEYS, CANONICAL_CARD_KEYS, normalizeEquipKey, isEquip, isTrick, isDelayedTrick } from '../../utils/translationHelper.js';
import { WEAPON_RANGE_MAP } from '../rules/RangeSystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

console.log('🛡️ Bắt đầu quét tĩnh kiểm định Thẻ Bài & Trang Bị Chuẩn (Canonical Cards & Equip Gate)...');

// 1. Kiểm tra từ điển trang bị chuẩn
const expectedEquipKeys = [
  'lien_no', 'thanh_long_dao', 'riu_da', 'song_kiem', 'phuong_thien_kich', 'quat_sat', 'ky_lan_cung',
  'bat_quai', 'hac_thuan', 'bach_ngan', 'ngua_chien', 'ngua_than'
];

for (const key of expectedEquipKeys) {
  if (!Object.values(CANONICAL_EQUIP_KEYS).includes(key)) {
    console.error(`❌ [LỖI] Thiếu canonical key trong CANONICAL_EQUIP_KEYS: ${key}`);
    process.exit(1);
  }
}

// 1b. Kiểm tra từ điển thẻ bài chuẩn (Basic & Tricks)
const expectedCardKeys = [
  'chem', 'ne', 'dao', 'ruou',
  'quyet_dau', 'cuop_bai', 'tuoc_bai', 'muon_dao', 'loan_tien', 'da_man', 'hoi_xuan', 'hoa_giai',
  'xieng_xich', 'hoa_cong', 'vo_trung', 'sam_set', 'hon_loan', 'binh_luong'
];

for (const key of expectedCardKeys) {
  if (!Object.values(CANONICAL_CARD_KEYS).includes(key)) {
    console.error(`❌ [LỖI] Thiếu canonical card key trong CANONICAL_CARD_KEYS: ${key}`);
    process.exit(1);
  }
}

// 7 vũ khí phải có trong WEAPON_RANGE_MAP
const weaponKeys = ['lien_no', 'thanh_long_dao', 'riu_da', 'song_kiem', 'phuong_thien_kich', 'quat_sat', 'ky_lan_cung'];
for (const wKey of weaponKeys) {
  if (!WEAPON_RANGE_MAP[wKey]) {
    console.error(`❌ [LỖI] Thiếu tầm đánh cho vũ khí chuẩn trong WEAPON_RANGE_MAP: ${wKey}`);
    process.exit(1);
  }
}

// 2. Quét mã nguồn cấm anti-pattern
const bannedPatterns = [
  { pattern: /\.id(\?)?\.includes\(['"]crossbow['"]\)/, desc: "Cấm dùng .id.includes('crossbow'), hãy dùng isEquip(card, 'lien_no')" },
  { pattern: /\.id(\?)?\.includes\(['"]hoa_giai['"]\)/, desc: "Cấm dùng .id.includes('hoa_giai'), hãy dùng isTrick(card, 'hoa_giai')" },
  { pattern: /\.id(\?)?\.includes\(['"]sam_set['"]\)/, desc: "Cấm dùng .id.includes('sam_set'), hãy dùng isDelayedTrick(card, 'sam_set')" },
  { pattern: /\.id(\?)?\.includes\(['"]hon_loan['"]\)/, desc: "Cấm dùng .id.includes('hon_loan'), hãy dùng isDelayedTrick(card, 'hon_loan')" },
  { pattern: /equipment\?\.find\(/, desc: "Cấm dùng .equipment?.find(), hãy dùng getPlayerEquip() hoặc Array.isArray guard" },
];

const targetDirs = [
  path.join(rootDir, 'shared', 'engine_v4', 'rules'),
  path.join(rootDir, 'shared', 'engine_v4', 'application'),
  path.join(rootDir, 'shared', 'engine_v4', 'ai'),
  path.join(rootDir, 'shared', 'engine_v4', 'core'),
  path.join(rootDir, 'client', 'src', 'components', 'game'),
  path.join(rootDir, 'client', 'src', 'components', 'modals')
];

let violations = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== '__tests__' && file !== 'node_modules') {
        scanDir(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, lineIdx) => {
        for (const b of bannedPatterns) {
          if (b.pattern.test(line)) {
            console.error(`❌ [ANTI-PATTERN] ${path.relative(rootDir, fullPath)}:${lineIdx + 1} - ${b.desc}`);
            console.error(`    Dòng code: ${line.trim()}`);
            violations++;
          }
        }
      });
    }
  }
}

targetDirs.forEach(scanDir);

if (violations > 0) {
  console.error(`\n🚨 Phát hiện ${violations} vi phạm quy chuẩn trang bị! Vui lòng khắc phục trước khi build/test.`);
  process.exit(1);
} else {
  console.log('✅ 100% mã nguồn tuân thủ Bất Biến Trang Bị Chuẩn (Canonical Equipment Invariant). 0 vi phạm.');
}
