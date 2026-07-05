const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`       } else if (payload.doProvide) {
          // Phá thành: Thay vì rút bài, chọn 1 mục tiêu mất 1 máu
          dispatcher.addLog(\`💥 Đô Đốc Bảo dùng [Phá Thành] bỏ rút bài để đả thương!\`, 'important');
          
          console.log("[PHA THANH] Pushing EVENT_DAMAGE to reactionStack for target:", payload.targetId);
          dispatcher.state.reactionStack.push({`,
`       } else if (payload.doProvide) {
          // Phá thành: Thay vì rút bài, chọn 1 mục tiêu mất 1 máu
          dispatcher.addLog(\`💥 Đô Đốc Bảo dùng [Phá Thành] bỏ rút bài để đả thương!\`, 'important');
          
          dispatcher.state.reactionStack.push({`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
