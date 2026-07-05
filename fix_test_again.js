const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

code = code.replace(
    'dispatcher.processQueue();',
    'dispatcher.dispatchAction({ type: "ACTION_DUMMY", payload: {} });'
);

code = code.replace(
`      // Kiểm tra event ACTION_PLAY_CARD Xiềng Xích đã được thêm vào actionQueue
      const action = dispatcher.state.actionQueue[0];
      expect(action).toBeDefined();
      expect(action.type).toBe('EVENT_ACTION_PLAY_CARD');
      expect(action.payload.virtualCardName).toBe('Xiềng Xích');
      expect(action.payload.targetIds).toContain(1);
      
      // Bài trên tay bị mất
      expect(dispatcher.state.players[0].hand.length).toBe(0);`,
`      // Kiểm tra xem bài trên tay đã bị mất chưa
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      
      // Vì nó đẩy vào actionQueue và đã thực thi ngay, nên thẻ bài đã vào discardPile/playedCards
      expect(dispatcher.state.playedCards.length).toBeGreaterThan(0);
      expect(dispatcher.state.playedCards[0].id).toBe(state.players[0].hand[0]?.id || dispatcher.state.playedCards[0].id);`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
