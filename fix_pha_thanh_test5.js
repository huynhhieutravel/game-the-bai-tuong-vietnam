const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`       } else if (payload.doProvide) {
          // Phá thành: Thay vì rút bài, chọn 1 mục tiêu mất 1 máu
          dispatcher.addLog(\`💥 Đô Đốc Bảo dùng [Phá Thành] bỏ rút bài để đả thương!\`, 'important');
          
          dispatcher.state.reactionStack.push({
              type: 'EVENT_DAMAGE',
              payload: { sourceId: player.id, targetId: payload.targetId, amount: 1, damageType: 'normal' }
          });
          
          // Hủy trạng thái chờ rút bài (bỏ qua rút bài)
          dispatcher.state.waitingForResponse = null;
       }`,
`       } else if (payload.doProvide) {
          // Phá thành: Thay vì rút bài, chọn 1 mục tiêu mất 1 máu
          dispatcher.addLog(\`💥 Đô Đốc Bảo dùng [Phá Thành] bỏ rút bài để đả thương!\`, 'important');
          
          console.log("[PHA THANH] Pushing EVENT_DAMAGE to reactionStack for target:", payload.targetId);
          dispatcher.state.reactionStack.push({
              type: 'EVENT_DAMAGE',
              payload: { sourceId: player.id, targetId: payload.targetId, amount: 1, damageType: 'normal' }
          });
          
          // Hủy trạng thái chờ rút bài (bỏ qua rút bài)
          dispatcher.state.waitingForResponse = null;
       }`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillRegistry);
console.log("Success");
