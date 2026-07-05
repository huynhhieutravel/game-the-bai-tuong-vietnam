const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const hoGiaTest = `
  describe('Lê Ngân (Sơn)', () => {
    it('Trung Dũng: Đánh 1 lá bài và tuyên bố là 1 lá bài khác (Không ai nghi ngờ)', () => {
      // (Đã giữ nguyên mã cũ)
    });

    it('Hộ Giá: Gọi đồng minh Hệ Sơn đỡ đòn', () => {
      const dispatcher = createTestDispatcher({
        mainHeroId: 'le-ngan', // P0 (Lord)
        playerCount: 2,
        p0Hand: [],
        p1Hand: []
      });
      
      const p0 = dispatcher.state.players[0];
      const p1 = dispatcher.state.players[1];
      p0.faction = 'Sơn';
      p1.faction = 'Sơn'; // Đồng minh
      p0.revealedHeroes = [true, false];
      p1.revealedHeroes = [true, false];
      
      p1.hand = [createCard('test-né-1', 'Né', 'diamonds', 2)];
      
      // Force trigger Dodge
      dispatcher.state.actionQueue = [{
         type: 'EVENT_DO_ASK_DODGE',
         payload: { responderId: p0.id, targetId: p0.id, sourceId: p1.id, reason: 'chem' }
      }];
      dispatcher.tick();
      
      // Should ask P1 to Dodge for P0
      expect(dispatcher.state.waitingForResponse).not.toBeNull();
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_ho_gia');
      expect(dispatcher.state.waitingForResponse.targetId).toBe(1);
      
      // P1 accepts
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL_RESPONSE',
        payload: { playerId: 1, doReact: true }
      });
      
      // Since Dodge was played, waitingForResponse should become null or proceed
      expect(dispatcher.state.playedCards.length).toBe(1);
      expect(dispatcher.state.playedCards[0].name).toBe('Né');
    });
  });
`;

testCode = testCode.replace(
  `  describe('Lê Ngân (Sơn)', () => {
    it('Trung Dũng: Đánh 1 lá bài và tuyên bố là 1 lá bài khác (Không ai nghi ngờ)', () => {`,
`  describe('Lê Ngân (Sơn)', () => {
    it('Hộ Giá: Gọi đồng minh Hệ Sơn đỡ đòn', () => {
      const dispatcher = createTestDispatcher({
        mainHeroId: 'le-ngan',
        playerCount: 2,
        p0Hand: [],
        p1Hand: []
      });
      
      const p0 = dispatcher.state.players[0];
      const p1 = dispatcher.state.players[1];
      p0.faction = 'Sơn';
      p1.faction = 'Sơn'; // Đồng minh
      p0.revealedHeroes = [true, false];
      p1.revealedHeroes = [true, false];
      
      p1.hand = [createCard('test-né-1', 'Né', 'diamonds', 2)];
      
      dispatcher.state.actionQueue = [{
         type: 'EVENT_DO_ASK_DODGE',
         payload: { responderId: p0.id, targetId: p0.id, sourceId: 1, reason: 'chem' }
      }];
      dispatcher.tick();
      
      expect(dispatcher.state.waitingForResponse).not.toBeNull();
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_ho_gia');
      expect(dispatcher.state.waitingForResponse.targetId).toBe(1);
      
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL_RESPONSE',
        payload: { playerId: 1, doReact: true }
      });
      
      // Because P1 played Né, original Dodge should receive ACTION_SKILL_RESPONSE Dodge automatically
      // However we might need to tick because we dispatched ACTION_SKILL_RESPONSE
      expect(dispatcher.state.playedCards.length).toBe(1);
      expect(dispatcher.state.playedCards[0].name).toBe('Né');
    });

    it('Trung Dũng: Đánh 1 lá bài và tuyên bố là 1 lá bài khác (Không ai nghi ngờ)', () => {`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
