const fs = require('fs');
let code = fs.readFileSync('client/src/engine/__tests__/heroes_son.test.js', 'utf8');

const testBlock = `

    describe('Đinh Điền (Sơn)', () => {
        beforeEach(() => {
            dispatcher = new Dispatcher();
            dispatcher.state.players = [
                { id: 'p1', isAlive: true, hp: 3, maxHp: 3, hand: [], equipment: [], judgementArea: [], mainHeroId: 'dinh-dien', subHeroId: null, revealedHeroes: [true, false] },
                { id: 'p2', isAlive: true, hp: 4, maxHp: 4, hand: [], equipment: [], judgementArea: [], mainHeroId: null, subHeroId: null, faction: 'Sơn' },
                { id: 'p3', isAlive: true, hp: 4, maxHp: 4, hand: [], equipment: [], judgementArea: [], mainHeroId: null, subHeroId: null, faction: 'Thủy' }
            ];
            dispatcher.state.currentPlayerId = 'p1';
            dispatcher.state.deck = [];
        });

        test('Phạt Tội - Gây sát thương Lôi khi phán xét ra Bích (Spade)', () => {
            // p2 chém p1, p1 đánh Né, kích hoạt Phạt Tội
            const neCard = { id: 'c1', name: 'Né' };
            dispatcher.state.players[0].hand = [neCard];
            
            // Set deck for Judge = Spade 2
            dispatcher.state.deck = [{ id: 'judge1', suit: '♠', rank: 2, color: 'black' }];
            
            // p2 chém p1
            dispatcher.state.reactionStack.push({
                type: 'EVENT_ACTION_PLAY_CARD',
                payload: { sourceId: 'p2', targetId: 'p1', cardId: null, virtualCardName: 'chem', isVirtual: true }
            });
            dispatcher.processQueue();
            
            // p1 bị ask_dodge, p1 đánh Né
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');
            dispatcher.handleAction('p1', 'ACTION_REACT', { cardId: 'c1' });
            
            // Phạt Tội kích hoạt (ON_DODGE hook -> ask_phat_toi)
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_phat_toi');
            dispatcher.handleAction('p1', 'ACTION_REACT', { targetId: 'p2' }); // chọn p2 để phạt tội
            
            // p2 phải nhận 2 sát thương lôi
            expect(dispatcher.state.players[1].hp).toBe(2);
        });

        test('Quân Cơ - Thay thế bài phán xét bằng lá bài Đen', () => {
            // p1 bị Bát Quái phán xét
            const blackCard = { id: 'c1', suit: '♠', rank: 5, color: 'black', name: 'Chém' };
            dispatcher.state.players[0].hand = [blackCard];
            
            // Deck có lá Đỏ (Trái tim)
            dispatcher.state.deck = [{ id: 'judge_red', suit: '♥', rank: 5, color: 'red' }];
            
            dispatcher.state.reactionStack.push({
                type: 'EVENT_JUDGE',
                payload: { targetId: 'p1', reason: 'bat-quai', cardId: 'batquai_card' }
            });
            dispatcher.processQueue();
            
            // Do p1 có Quân Cơ nên bị hỏi ask_quan_co
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_quan_co');
            expect(dispatcher.state.currentJudgeCard.suit).toBe('♥'); // đang là đỏ
            
            // p1 đưa lá bài Đen
            dispatcher.handleAction('p1', 'ACTION_REACT', { cardId: 'c1' });
            
            // Kết quả: Bát quái thất bại vì bị đổi thành Đen, currentJudgeCard là Đen
            // Wait, EVENT_JUDGE_RESOLVE sẽ đẩy judgeCard vào mộ
            expect(dispatcher.state.discardPile.some(c => c.id === 'c1')).toBe(true);
        });

        test('Định Quốc - Đồng minh Hệ Sơn đưa Né cho Đinh Điền', () => {
            const neCard = { id: 'c1', name: 'Né' };
            dispatcher.state.players[1].hand = [neCard]; // p2 (Sơn) có Né
            
            dispatcher.state.currentPlayerId = 'p2'; // Đến lượt p2
            dispatcher.state.phase = 'PHASE_ACTION';
            
            dispatcher.handleAction('p2', 'ACTION_USE_SKILL', {
                skillId: 'dinh-quoc',
                targets: ['p1'],
                options: { cardIdx: 0 }
            });
            
            expect(dispatcher.state.players[1].hand.length).toBe(0);
            expect(dispatcher.state.players[0].hand[0].name).toBe('Né');
            expect(dispatcher.state.players[1].dinhQuocUsedThisTurn).toBe(true);
        });
    });
`;

code = code.replace(/describe\('HeroRegistry - Hệ Sơn', \(\) => {/, "describe('HeroRegistry - Hệ Sơn', () => {" + testBlock);
fs.writeFileSync('client/src/engine/__tests__/heroes_son.test.js', code);
console.log("Success");
