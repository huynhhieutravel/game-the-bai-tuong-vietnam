const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

// Thay ACTION_PHASE_START bằng cách push trực tiếp vào reactionStack rồi tick()
code = code.replace(
`      dispatcher.dispatchAction({
        type: 'EVENT_PHASE_START',
        payload: { targetId: 0, phase: 'turn_begin' }
      });`,
`      dispatcher.state.reactionStack.push({
        type: 'EVENT_PHASE_START',
        payload: { targetId: 0, phase: 'turn_begin' }
      });
      dispatcher.tick();`
);

// Sửa test Đạm Bạc: expect(canTarget(...)) false thay vì cho vào action loop
code = code.replace(
`      // import { canTarget } from '../rangeSystem.js';
      // Mặc dù ta không có canTarget trong scope test, ta có thể test qua Validation.
      // Vì validation chưa chắc đã tích hợp, ta tạm kiểm tra rangeSystem logic.
      // Ta không cần test logic của rangeSystem trong bài test này nếu khó truy cập.
      // Thay vào đó test qua ACTION_PLAY_CARD
      const chem = createCard('Chém');
      p1.hand.push(chem);
      
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { playerId: 1, cardId: chem.id, targets: [0] }
      });
      
      // Không có EVENT_ASK_DODGE vì target invalid
      const askDodge = dispatcher.state.reactionStack.find(e => e.type === 'EVENT_DO_ASK_DODGE');
      expect(askDodge).toBeUndefined();`,
`      const chem = createCard('Chém', 'Cơ bản', '♠', '3', 'black');
      p1.hand.push(chem);
      
      const { canTarget } = require('../rangeSystem.js');
      const isTargetable = canTarget(dispatcher.state, 1, 0, chem.name, chem.id);
      expect(isTargetable).toBe(false);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
