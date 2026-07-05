const { createTestDispatcher, createCard } = require('./client/src/engine/__tests__/testHelper.js');
const cuopBai = createCard('Cướp Bài', 'Cẩm nang', '♠', '3', 'black');
const dispatcher = createTestDispatcher({ 
    mainHeroId: 'tien-dung',
    subHeroId: null,
    p0Hand: [cuopBai],
    p1Hand: [createCard('Né', 'Cơ bản', '♥', '2', 'red')],
    deck: [createCard('Chém', 'Cơ bản', '♠', '3', 'black')]
});
console.log(dispatcher.state.players[0].mainHeroId);
console.log(dispatcher.state.players[0].subHeroId);
