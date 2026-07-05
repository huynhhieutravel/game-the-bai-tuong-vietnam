const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const phaThanhTest = `
describe('Đô đốc Bảo (Sơn)', () => {
  it('Phá Thành: Bỏ rút bài để gây 1 sát thương', () => {
    const { dispatcher } = createTestDispatcher([
      { id: 0, mainHeroId: 'do-doc-bao', hand: [], hp: 4, maxHp: 4 },
      { id: 1, mainHeroId: 'le-loi', hand: [], hp: 4, maxHp: 4 }
    ]);
    
    // Jump to DRAW phase manually for testing
    dispatcher.state.actionQueue = [{ type: 'EVENT_PHASE_DRAW', payload: { targetId: 0 } }];
    dispatcher.tick();
    
    // Should ask for Pha Thanh
    expect(dispatcher.state.waitingForResponse).not.toBeNull();
    expect(dispatcher.state.waitingForResponse.type).toBe('ask_pha_thanh');
    
    // Use Pha Thanh on P1
    dispatcher.dispatchAction({
      type: 'ACTION_SKILL_RESPONSE',
      payload: { playerId: 0, doProvide: true, targetId: 1 }
    });
    
    // P1 should take 1 damage
    expect(dispatcher.state.players[1].hp).toBe(3);
    
    // Should not ask for draw anymore, should move to play phase eventually (or next event)
    expect(dispatcher.state.waitingForResponse).toBeNull();
  });
});
`;

testCode = testCode.replace("describe('Nguyễn Xí (Sơn)', () => {", phaThanhTest + "\ndescribe('Nguyễn Xí (Sơn)', () => {");
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', testCode);
console.log("Success");
