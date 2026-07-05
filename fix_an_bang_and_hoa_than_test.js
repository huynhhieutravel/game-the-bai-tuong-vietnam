const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

// Phục hồi lại test An Bang
code = code.replace(
`      // turnResetFlags có thể đã reset anBangUsed thành false khi qua lượt mới
      // Nên chỉ cần kiểm tra số bài trên tay
      expect(dispatcher.state.players[0].hand.length).toBe(2);`,
`      // turnResetFlags có thể đã reset anBangUsed thành false khi qua lượt mới
      // Nên chỉ cần kiểm tra số bài trên tay (từ 0 -> 1)
      expect(dispatcher.state.players[0].hand.length).toBe(1);`
);

// Sửa test Hòa Thân
code = code.replace(
`      expect(dispatcher.state.waitingForResponse.event.virtualCardName).toBe('Quyết Đấu');`,
`      expect(dispatcher.state.waitingForResponse.trickType).toBe('duel');`
);

fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
