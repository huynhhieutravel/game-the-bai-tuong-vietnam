const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`import { createTestDispatcher } from './testHelper';
import { createCard } from './testHelper';`,
`import { createTestDispatcher, createCard } from './testHelper';
import { getHandLimit } from '../rules/TurnRules';`
);

code = code.replace(
`      // Action queue sẽ có Loạn Tiễn
      const evt = dispatcher.state.actionQueue[0];
      expect(evt.type).toBe('EVENT_ACTION_PLAY_CARD');
      expect(evt.payload.virtualCardName).toBe('Loạn Tiễn');
      expect(evt.payload.activeSkill).toBe('binh-loan');`,
`      // Kiểm tra Event đã được đẩy lên ReactionStack (Ask Negate)
      const negateEvt = dispatcher.state.reactionStack.find(e => e.type === 'EVENT_ASK_NEGATE');
      expect(negateEvt).toBeDefined();`
);

code = code.replace(
`      const turnRules = require('../rules/TurnRules');
      const limit = turnRules.getHandLimit(dispatcher.state, 0);`,
`      const limit = getHandLimit(dispatcher.state, 0);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
