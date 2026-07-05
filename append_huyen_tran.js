const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const newTest = `
  describe('Huyền Trân Công Chúa (An Bang, Hòa Thân)', () => {
    it('An Bang: Rút 1 lá khi kết thúc lượt', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'huyen-tran-cong-chua', // Player 0
          playerCount: 2,
          p0Hand: [],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.deck = [createCard('Chém')]; // Có 1 lá trên tay
      
      // Chuyển sang End Phase
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'cancel' } // skip current phase ? No, dispatcher test doesn't auto-run phases
      });
      
      // Kích hoạt END_PHASE hook
      dispatcher.triggerHooks('END_PHASE', { targetId: 0 });
      
      // UI đợi yêu cầu
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_an_bang');
      
      // Đồng ý rút
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { doUse: true } }
      });
      
      expect(dispatcher.state.players[0].anBangUsed).toBe(true);
      expect(dispatcher.state.players[0].hand.length).toBe(1);
    });

    it('Hòa Thân: Bỏ 1 lá, ép 2 tướng nam Quyết Đấu', () => {
      const pCard = createCard('Đào');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'huyen-tran-cong-chua', // Player 0 (Nữ)
          playerCount: 3,
          p0Hand: [pCard],
          p1Hand: [],
          p2Hand: []
      });
      dispatcher.state.players[1].gender = 'Nam';
      dispatcher.state.players[2].gender = 'Nam';
      dispatcher.state.players[0].revealedHeroes = [true, false];
      
      // Kích hoạt Hòa Thân
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { playerId: 0, skillId: 'hoa-than', targets: [] }
      });
      
      // UI đợi yêu cầu
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_hoa_than');
      
      // Chọn bỏ lá index 0, ép P1 Quyết Đấu P2
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { cardIndex: 0, targetA: 1, targetB: 2 } }
      });
      
      expect(dispatcher.state.players[0].hoaThanUsedThisTurn).toBe(true);
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile.length).toBe(1);
      
      // Action queue sẽ có Quyết Đấu
      const evt = dispatcher.state.actionQueue[0];
      expect(evt.type).toBe('EVENT_ACTION_PLAY_CARD');
      expect(evt.payload.virtualCardName).toBe('Quyết Đấu');
      expect(evt.payload.sourceId).toBe(1);
      expect(evt.payload.targetId).toBe(2);
      expect(evt.payload.activeSkill).toBe('hoa-than');
    });
  });
});`;

// Remove the last "});" and append newTest
code = code.substring(0, code.lastIndexOf('});')) + newTest;
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
