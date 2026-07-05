const fs = require('fs');
const code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');
const skillIds = [
  'nam-duoc', 'dieu-duoc', 'uy-chan', 'binh-loan', 'khai-quoc',
  'hoa-than', 'an-bang', 'phat-toi', 'quan-co', 'dinh-quoc',
  'pha-quan', 'pha-thanh', 'trung-dung', 'ho-gia'
];

skillIds.forEach(id => {
    const idx = code.indexOf(`'${id}':`);
    if (idx !== -1) {
        let endIndex = code.indexOf(`\n  '`, idx + 1);
        if (endIndex === -1) endIndex = code.length;
        console.log(`\n==== ${id} ====`);
        console.log(code.substring(idx, Math.min(idx + 500, endIndex)));
    }
});
