const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');

const oldBlock1 = `    it('Tiên Duyên: Dùng bài nhép làm Xiềng Xích', () => {
      const state = createTestState({ mainHeroId: 'chu-dong-tu' });
      // P0 có bài nhép
      state.players[0].hand = [createCard('Đánh Kẻ Trộm', 'Cơ bản', '♣', '3', 'black')];
      
      const dispatcher = createTestDispatcher({ deck: [] });
      dispatcher.state = state;`;

const newBlock1 = `    it('Tiên Duyên: Dùng bài nhép làm Xiềng Xích', () => {
      const nhap = createCard('Đánh Kẻ Trộm', 'Cơ bản', '♣', '3', 'black');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'chu-dong-tu',
          p0Hand: [nhap],
          deck: []
      });
      // Bỏ đoạn gắn state thủ công, dùng state của dispatcher
      const state = dispatcher.state;`;

const oldBlock2 = `    it('Tiên Duyên: Rèn lại (không mục tiêu)', () => {
      const state = createTestState({ mainHeroId: 'chu-dong-tu' });
      // P0 có bài nhép
      state.players[0].hand = [createCard('Đánh Kẻ Trộm', 'Cơ bản', '♣', '3', 'black')];
      
      const dispatcher = createTestDispatcher({ deck: [createCard('Chém', 'Cơ bản', '♠', '2', 'black')] });
      dispatcher.state = state;`;

const newBlock2 = `    it('Tiên Duyên: Rèn lại (không mục tiêu)', () => {
      const nhap = createCard('Đánh Kẻ Trộm', 'Cơ bản', '♣', '3', 'black');
      const chem = createCard('Chém', 'Cơ bản', '♠', '2', 'black');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'chu-dong-tu',
          p0Hand: [nhap],
          deck: [chem]
      });
      const state = dispatcher.state;`;

code = code.replace(oldBlock1, newBlock1);
code = code.replace(oldBlock2, newBlock2);
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', code);
console.log("Success");
