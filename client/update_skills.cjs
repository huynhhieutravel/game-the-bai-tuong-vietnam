const fs = require('fs');
const file = 'src/engine/registries/SkillRegistry.js';
let content = fs.readFileSync(file, 'utf8');

const missingSkills = [
  { id: 'thiet-ma', name: 'Thiết Mã', type: 'PASSIVE' },
  { id: 'doi-nui', name: 'Dời Núi', type: 'ACTIVE' },
  { id: 'tien-duyen-active', name: 'Tiên Duyên', type: 'ACTIVE' },
  { id: 'duyen-tien', name: 'Duyên Tiên', type: 'PASSIVE' },
  { id: 'tien-duyen-passive', name: 'Tiên Duyên (Tỏa Định Kỹ)', type: 'PASSIVE' },
  { id: 'no-than', name: 'Nỏ Thần', type: 'PASSIVE' },
  { id: 'dam-bac', name: 'Đạm Bạc', type: 'PASSIVE' },
  { id: 'khai-thien', name: 'Khai Thiên', type: 'ACTIVE' },
  { id: 'than-giap', name: 'Thần Giáp (Tỏa Định Kỹ)', type: 'PASSIVE' },
  { id: 'than-hoa', name: 'Thần Hỏa', type: 'ACTIVE' },
  { id: 'linh-giam', name: 'Linh Giám', type: 'PASSIVE' },
  { id: 'hau-vien', name: 'Hậu Viện', type: 'PASSIVE' },
  { id: 'ky-tap', name: 'Kỳ Tập', type: 'ACTIVE' },
  { id: 'binh-ngo', name: 'Bình Ngô', type: 'PASSIVE' },
  { id: 'nghe-an-ke', name: 'Nghệ An Kế', type: 'PASSIVE' },
  { id: 'nhiep-chinh', name: 'Nhiếp Chính', type: 'PASSIVE' },
  { id: 'thinh-chinh', name: 'Thính Chính', type: 'PASSIVE' },
  { id: 'thong-ngon', name: 'Thông Ngôn', type: 'PASSIVE' },
  { id: 'ung-bien', name: 'Ứng Biến', type: 'PASSIVE' },
  { id: 'can-gian', name: 'Can Gián', type: 'PASSIVE' },
  { id: 'quoc-sac', name: 'Quốc Sắc', type: 'PASSIVE' },
  { id: 'hoa-than-an-tu', name: 'Hóa Thân', type: 'PASSIVE' },
  { id: 'nam-duoc', name: 'Nam Dược', type: 'PASSIVE' },
  { id: 'khai-quoc', name: 'Khai Quốc', type: 'PASSIVE' },
  { id: 'hoa-than-huyen-tran', name: 'Hóa Thân', type: 'PASSIVE' },
  { id: 'phat-toi', name: 'Phạt Tội', type: 'PASSIVE' },
  { id: 'quan-co', name: 'Quân Cơ', type: 'PASSIVE' },
  { id: 'dinh-quoc', name: 'Định Quốc', type: 'PASSIVE' },
  { id: 'pha-quan', name: 'Phá Quân', type: 'PASSIVE' },
  { id: 'ho-gia', name: 'Hộ Giá', type: 'PASSIVE' }
];

let injectedCode = '';
for (const s of missingSkills) {
  injectedCode += `
  '${s.id}': {
    id: '${s.id}',
    name: '${s.name}',
    type: SKILL_TYPES.${s.type},
    aiConfig: { priority: 5, condition: () => false }
  },`;
}

// Find the last "};" which closes the SkillRegistry object
const lastBraceIndex = content.lastIndexOf('};');
if (lastBraceIndex !== -1) {
    content = content.slice(0, lastBraceIndex - 1) + ',' + injectedCode + '\n' + content.slice(lastBraceIndex);
    fs.writeFileSync(file, content);
    console.log('Successfully injected 30 missing skills!');
} else {
    console.error('Could not find the end of SkillRegistry!');
}
