const fs = require('fs');

let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const testBlock = `
  describe('Đinh Điền (Sơn)', () => {
    it('Phạt Tội: Gây sát thương Lôi khi phán xét ra Bích (Spade)', () => {
      const pNe = createCard('Né', 'Cơ bản', '♥', '3', 'red');
      const pJudge = createCard('Chém', 'Cơ bản', '♠', '2', 'black');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'dinh-dien',
          playerCount: 2,
          p0Hand: [pNe],
          p1Hand: [createCard('Chém')]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.deck = [pJudge]; // Deck cho Phán xét
      
      // Player 1 chém Player 0
      dispatcher.dispatchAction({
          type: 'ACTION_PLAY_CARD',
          payload: { playerId: 'p1', cardId: dispatcher.state.players[1].hand[0].id, targetId: 'p0' }
      });
      dispatcher.processQueue();
      
      // p0 bị hỏi Né
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');
      
      // p0 đánh Né
      dispatcher.handleAction('p0', 'ACTION_REACT', { cardId: pNe.id });
      
      // Hook ON_DODGE kích hoạt Phạt Tội
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_phat_toi');
      
      // p0 chọn p1 để phạt tội
      dispatcher.handleAction('p0', 'ACTION_REACT', { targetId: 'p1' });
      
      // Phán xét ra Bích -> gây 2 sát thương Lôi
      expect(dispatcher.state.players[1].hp).toBe(2);
    });

    it('Quân Cơ: Thay thế bài phán xét bằng lá bài Đen', () => {
      const blackCard = createCard('Chém', 'Cơ bản', '♠', '5', 'black');
      const judgeRed = createCard('Đào', 'Cơ bản', '♥', '5', 'red');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'dinh-dien',
          playerCount: 2,
          p0Hand: [blackCard],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.deck = [judgeRed];
      
      // Giả lập phán xét Bát Quái cho p0
      dispatcher.state.reactionStack.push({
          type: 'EVENT_JUDGE',
          payload: { targetId: 'p0', reason: 'bat-quai' }
      });
      dispatcher.processQueue();
      
      // Do p0 có Quân Cơ nên bị hỏi ask_quan_co
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_quan_co');
      expect(dispatcher.state.currentJudgeCard.suit).toBe('♥'); // Đang là đỏ
      
      // p0 dùng Quân Cơ đổi bằng blackCard
      dispatcher.handleAction('p0', 'ACTION_REACT', { cardId: blackCard.id });
      
      // Kết quả: Bát quái thất bại (do đổi thành Đen)
      expect(dispatcher.state.discardPile.find(c => c.id === blackCard.id)).toBeTruthy();
      expect(dispatcher.state.discardPile.find(c => c.id === judgeRed.id)).toBeTruthy(); // Cũ bị vứt đi
    });

    it('Định Quốc: Đồng minh Hệ Sơn đưa Né hoặc Sấm Sét cho Đinh Điền', () => {
      const neCard = createCard('Né', 'Cơ bản', '♥', '3', 'red');
      const daoCard = createCard('Đào', 'Cơ bản', '♥', '4', 'red');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'dinh-dien',
          playerCount: 2,
          p0Hand: [],
          p1Hand: [neCard, daoCard]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[1].faction = 'Sơn'; // Đồng minh Sơn
      
      dispatcher.state.currentPlayerId = 'p1';
      dispatcher.state.phase = 'PHASE_ACTION';
      
      // p1 dùng Định Quốc gửi Né cho p0
      dispatcher.handleAction('p1', 'ACTION_USE_SKILL', {
          skillId: 'dinh-quoc',
          targets: ['p0'],
          options: { cardIdx: 0 } // Đưa Né
      });
      
      expect(dispatcher.state.players[1].hand.length).toBe(1);
      expect(dispatcher.state.players[0].hand.length).toBe(1);
      expect(dispatcher.state.players[0].hand[0].name).toBe('Né');
      expect(dispatcher.state.players[1].dinhQuocUsedThisTurn).toBe(true);
    });
  });
});
`;

code = code.replace(/}\);\n$/, testBlock);
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
