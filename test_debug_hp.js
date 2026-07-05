const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

code = code.replace(
`      // Sẽ có EVENT_ASK_USE_SKILL cho Hóa Tiên
      expect(dispatcher.state.waitingForResponse).toBeDefined();
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_hoa_tien');
      
      // Người chơi đồng ý dùng
      dispatcher.dispatchAction({
         type: 'ACTION_REACT',
         payload: {
            playerId: 0,
            responseType: 'yes',
            data: {}
         }
      });
      
      // HP phục hồi về 3, bốc 3 lá
      expect(dispatcher.state.players[0].hp).toBe(3);`,
`      // Sẽ có EVENT_ASK_USE_SKILL cho Hóa Tiên
      expect(dispatcher.state.waitingForResponse).toBeDefined();
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_hoa_tien');
      
      console.log("BEFORE REACT HP: ", dispatcher.state.players[0].hp);
      
      // Người chơi đồng ý dùng
      dispatcher.dispatchAction({
         type: 'ACTION_REACT',
         payload: {
            playerId: 0,
            responseType: 'yes',
            data: {}
         }
      });
      
      console.log("AFTER REACT HP: ", dispatcher.state.players[0].hp);
      
      // HP phục hồi về 3, bốc 3 lá
      expect(dispatcher.state.players[0].hp).toBe(3);`
);
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
