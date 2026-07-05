const fs = require('fs');

let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`      dispatcher.state.reactionStack.push({
          type: 'EVENT_JUDGE',
          payload: { targetId: 0, reason: 'bat-quai', cardId: 'batquai' }
      });
      
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_quan_co');`,
`      dispatcher.state.reactionStack.push({
          type: 'EVENT_JUDGE',
          payload: { targetId: 0, reason: 'bat-quai', cardId: 'batquai' }
      });
      
      while(dispatcher.tick()){}
      
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_quan_co');`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
