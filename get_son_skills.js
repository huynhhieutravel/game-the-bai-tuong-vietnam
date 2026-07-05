const fs = require('fs');
const code = fs.readFileSync('client/src/engine/registries/SkillDescriptions.js', 'utf8');
const skillIds = [
  'nam-duoc', 'dieu-duoc', 'uy-chan', 'binh-loan', 'khai-quoc',
  'hoa-than', 'an-bang', 'phat-toi', 'quan-co', 'dinh-quoc',
  'pha-quan', 'pha-thanh', 'trung-dung', 'ho-gia'
];
skillIds.forEach(id => {
  const match = code.match(new RegExp(`"${id}":\\s*"([^"]+)"`));
  if (match) {
    console.log(`- ${id}: ${match[1]}`);
  } else {
    console.log(`- ${id}: NOT FOUND`);
  }
});
