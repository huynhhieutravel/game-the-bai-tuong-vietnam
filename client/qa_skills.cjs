const fs = require('fs');
const { execSync } = require('child_process');

const skills = [
  'Thiết Mã', 'Dời Núi', 'Tiên Duyên', 'Duyên Tiên', 'Nỏ Thần', 'Đạm Bạc', 
  'Khai Thiên', 'Thần Giáp', 'Thần Hỏa', 'Linh Giám', 'Hậu Viện', 'Kỳ Tập', 
  'Bình Ngô', 'Nghệ An Kế', 'Nhiếp Chính', 'Thính Chính', 'Thông Ngôn', 'Ứng Biến', 
  'Can Gián', 'Quốc Sắc', 'Hóa Thân', 'Nam Dược', 'Khai Quốc', 'Phạt Tội', 
  'Quân Cơ', 'Định Quốc', 'Phá Quân', 'Hộ Giá'
];

const results = [];
for (const skill of skills) {
    try {
        const out = execSync(`grep -r -l "${skill}" src/engine src/App.jsx 2>/dev/null | grep -v "SkillDescriptions.js" | grep -v "HeroRegistry.js" | grep -v "SkillRegistry.js" | grep -v "phase4_backup"`, { encoding: 'utf8' }).trim();
        if (!out) {
            results.push({ skill, status: 'MISSING LOGIC' });
        } else {
            results.push({ skill, status: 'IMPLEMENTED', files: out.split('\n') });
        }
    } catch (e) {
        results.push({ skill, status: 'MISSING LOGIC' });
    }
}
console.log(JSON.stringify(results, null, 2));
