const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

// Find the last index of `describe('Rùa Vàng (Thần Giáp, Thần Hỏa)', () => {`
const idx = code.lastIndexOf(`describe('Rùa Vàng (Thần Giáp, Thần Hỏa)', () => {`);
if (idx !== -1) {
    const startCode = code.substring(0, idx);
    const ruaVangCode = `
  describe('Rùa Vàng (Thần Giáp, Thần Hỏa)', () => {
    it('Thần Giáp: Tự động dùng Bát Quái khi không có giáp', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'rua-vang',
          playerCount: 2,
          p0Hand: [],
          p1Hand: [createCard('Chém')]
      });
      // Bật revealedHeroes cho p0
      dispatcher.state.players[0].revealedHeroes = [true, false];
      // Cho lá Đỏ lên top deck để Bát Quái thành công
      const redCard = createCard('Đào', 'Cơ bản', '♥', '3', 'red');
      dispatcher.state.deck = [redCard];
      
      // p1 chém p0
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { 
            playerId: 1, 
            cardId: dispatcher.state.players[1].hand[0].id, 
            targets: [0] 
        }
      });
      
      const askDodge = dispatcher.state.waitingForResponse;
      expect(askDodge).toBeDefined();
      expect(askDodge.type).toBe('ask_dodge');
      
      // p0 dùng Bát Quái
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
           playerId: 0,
           responseType: 'play',
           data: { cardId: null, virtualCardName: 'Né', doBagua: true }
        }
      });
      
      // Thành công => không mất máu
      expect(dispatcher.state.players[0].hp).toBe(dispatcher.state.players[0].maxHp);
      expect(dispatcher.state.waitingForResponse).toBeNull();
    });
  });
});
`;
    fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', startCode + ruaVangCode);
}
console.log("Success");
