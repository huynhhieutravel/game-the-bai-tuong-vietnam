const fs = require('fs');

let skillRegistry = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillRegistry = skillRegistry.replace(
`       if (payload.canceled) {
          dispatcher.applyEffect(Effects.SetWaitingEffect(null));
       } else if (payload.doProvide) {
          // Phá thành: Thay vì rút bài, chọn 1 mục tiêu mất 1 máu
          const drawEvent = dispatcher.state.reactionStack.find(e => e.type === 'EVENT_APPLY_DRAW');
          if (drawEvent) drawEvent.payload.isCancelled = true;
          
          {
             dispatcher.applyEffect(Effects.DamageEffect(player.id, payload.targetId, 1, 'normal'));
             const t = state.players.find(p => p.id === payload.targetId);
             if (t && t.hp <= 0) dispatcher.state.reactionStack.push({ type: 'EVENT_DYING', payload: { targetId: t.id, sourceId: player.id } });
             dispatcher.addLog(\`💥 Đô Đốc Bảo dùng [Phá Thành] bỏ rút bài để đả thương!\`, 'important');
             
             dispatcher.applyEffect(Effects.SetWaitingEffect(null));
          }
       }`,
`       if (payload.canceled) {
          // Khôi phục lại trạng thái rút bài nếu hủy kỹ năng
          dispatcher.state.waitingForResponse = { type: 'draw_phase', responderId: player.id, targetId: player.id };
       } else if (payload.doProvide) {
          // Phá thành: Thay vì rút bài, chọn 1 mục tiêu mất 1 máu
          dispatcher.addLog(\`💥 Đô Đốc Bảo dùng [Phá Thành] bỏ rút bài để đả thương!\`, 'important');
          
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
