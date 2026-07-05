const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

code = code.replace(
`      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { 
            playerId: 0, 
            skillId: 'dieu-duoc', 
            targets: [1],
            options: { cardIdx: 0 }
        }
      });
      
      // Kiểm tra xem máu p1 có tăng lên 4 không`,
`      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { 
            playerId: 0, 
            skillId: 'dieu-duoc'
        }
      });
      
      const askDieuDuoc = dispatcher.state.waitingForResponse;
      expect(askDieuDuoc).toBeDefined();
      expect(askDieuDuoc.type).toBe('ask_dieu_duoc');
      
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { 
            playerId: 0, 
            responseType: 'play',
            cardIndex: 0,
            targetId: 1
        }
      });
      
      // Kiểm tra xem máu p1 có tăng lên 4 không`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
