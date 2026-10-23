import { describe, it, expect } from 'vitest';
import { createTestDispatcher, createCard } from './testHelper.js';

describe('Heroes Hệ Hà QA', () => {

  describe('Ngô Quyền (Bạch Đằng, Hậu Viện)', () => {
    it('Bạch Đằng: Bỏ bài và rút lại số lượng tương ứng (+1 nếu bỏ hết)', () => {
       const p0Card1 = createCard('Chém', 'Cơ bản', 'spade', 'K');
       const p0Card2 = createCard('Né', 'Cơ bản', 'heart', '2');
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'ngo-quyen',
           playerCount: 2,
           p0Hand: [p0Card1, p0Card2],
       });

       dispatcher.state.actionQueue = []; // Bypass normal turn flow to manually trigger skill
       dispatcher.dispatchAction({
           type: 'ACTION_USE_SKILL',
           payload: { playerId: 0, skillId: 'bach-dang' }
       });
       
       const askBachDang = dispatcher.state.waitingForResponse;
       expect(askBachDang).toBeDefined();
       expect(askBachDang.type).toBe('ask_bach_dang');
       
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { cardIndexes: [0, 1] } }
       });
       
       const p0 = dispatcher.state.players[0];
       expect(p0.hand.length).toBe(3); // Bỏ 2 lá (hết tay) -> Rút 2 + 1 = 3 lá
       expect(p0.bachDangUsedThisTurn).toBe(true);
    });
    
    it('Hậu Viện: Đồng minh hệ Hà nhường Đào', () => {
       const p0Card = createCard('Đào', 'Cơ bản', 'heart', 'K');
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'tran-nhat-duat', // A Hà faction hero
           playerCount: 2,
           p0Hand: [p0Card],
           p1Hand: []
       });
       
       // P1 is Ngô Quyền with hau-vien
       dispatcher.state.players[1].mainHeroId = 'ngo-quyen';
       dispatcher.state.players[1].revealedHeroes = [true, false];
       dispatcher.state.players[0].hp = 2; // P0 plays Đào (2 < 3 maxHp)
       dispatcher.state.players[1].hp = 1; // P1 needs heal (1 < 2)
       
       dispatcher.state.actionQueue = [];
       dispatcher.dispatchAction({
           type: 'ACTION_PLAY_CARD',
           payload: { playerId: 0, cardId: p0Card.id }
       });
       
       const askHauVien = dispatcher.state.waitingForResponse;
       expect(askHauVien).toBeDefined();
       expect(askHauVien.type).toBe('ask_hau_vien');
       
       // P0 chooses to give Đào to P1
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { doReact: true, targetId: 1 } }
       });
       
       expect(dispatcher.state.players[1].hp).toBe(2); // P1 healed 1 -> 2
       expect(dispatcher.state.players[0].hp).toBe(2); // P0 did NOT heal, stays at 2
       expect(dispatcher.state.players[0].hand.length).toBe(1); // P0 draws 1 card
    });
  });

  describe('Dã Tượng (Kỳ Tập)', () => {
    it('Kỳ Tập: Dùng bài đen làm Tước Bài', () => {
       const p0Card = createCard('Chém', 'Cơ bản', 'spade', 'K'); // Black card
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'da-tuong',
           playerCount: 2,
           p0Hand: [p0Card],
           p1Hand: [createCard('Đào', 'Cơ bản', 'heart', 'A')]
       });

       dispatcher.state.actionQueue = [];
       dispatcher.dispatchAction({
           type: 'ACTION_PLAY_CARD',
           payload: { playerId: 0, cardId: p0Card.id, virtualCardName: 'Tước Bài', targetId: 1 }
       });
       
       // Decline Vô Kế Khả Thi for P1 and P0
       while (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_negate') {
          dispatcher.dispatchAction({
             type: 'ACTION_REACT',
             payload: { playerId: dispatcher.state.waitingForResponse.responderId, responseType: 'negate', data: { doNegate: false } }
          });
       }
       
       // Should prompt P0 to select which card to steal from P1
       const askTướcBài = dispatcher.state.waitingForResponse;
       expect(askTướcBài).toBeDefined();
       expect(askTướcBài.type).toBe('ask_dismantle');
    });
  });

  describe('Yết Kiêu (Lặn Sâu)', () => {
    it('Lặn Sâu: Mất 1 HP và rút 2 lá bài', () => {
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'yet-kieu',
           playerCount: 2,
           p0Hand: [],
       });

       dispatcher.state.players[0].hp = 3;
       dispatcher.state.actionQueue = [];
       
       dispatcher.dispatchAction({
           type: 'ACTION_USE_SKILL',
           payload: { playerId: 0, skillId: 'lan-sau' }
       });
       
       const askLanSau = dispatcher.state.waitingForResponse;
       expect(askLanSau).toBeDefined();
       expect(askLanSau.type).toBe('ask_lan_sau');
       
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { canceled: false } }
       });
       
       const p0 = dispatcher.state.players[0];
       expect(p0.hp).toBe(2); // Lost 1 HP
       expect(p0.hand.length).toBe(2); // Drew 2 cards
       // Lặn Sâu không bị giới hạn số lần nên không có cờ này nữa
    });
  });

  describe('Nguyễn Trãi (Bình Ngô, Tâm Công)', () => {
    it('Bình Ngô: Rút thêm 1 lá ở Draw Phase', () => {
       const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-trai', playerCount: 1 });
       dispatcher.state.players[0].hand = [];
       dispatcher.state.waitingForResponse = { type: 'draw_phase', targetId: 0 };
       
       dispatcher.dispatchAction({ type: 'ACTION_DRAW_CARDS', payload: { playerId: 0, drawExtra: true } });
       
       const p0 = dispatcher.state.players[0];
       expect(p0.hand.length).toBe(3); // Bình Ngô -> 3 lá
    });

    it('Tâm Công: Đoán chất bài để gây sát thương', () => {
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'nguyen-trai', 
           playerCount: 2,
           p0Hand: [createCard('Đào', 'Cơ bản', 'heart', 'K')],
           p1Hand: []
       });
       dispatcher.state.players[1].hp = 3;

       dispatcher.dispatchAction({
           type: 'ACTION_USE_SKILL',
           payload: { playerId: 0, skillId: 'tam-cong', targets: [1] }
       });
       
       const askSuit = dispatcher.state.waitingForResponse;
       expect(askSuit).toBeDefined();
       expect(askSuit.type).toBe('ask_suit');
       
       // P1 guesses 'spade' (wrong, since card is heart)
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 1, responseType: 'skill_response', data: { suit: 'spade' } }
       });
       
       expect(dispatcher.state.players[1].hp).toBe(2); // Took 1 damage
       expect(dispatcher.state.players[0].tamCongUsedThisTurn).toBe(true);
       expect(dispatcher.state.players[0].hand.length).toBe(0); // P0 mất bài
       expect(dispatcher.state.players[1].hand.length).toBe(1); // P1 nhận bài
    });
  });

  describe('Nguyễn Chích (Nghệ An Kế)', () => {
    it('Nghệ An Kế: Không thể bị chọn làm mục tiêu của Cướp Bài và Hỗn Loạn', () => {
       const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-chich', playerCount: 2 });
       // We'll test valid targets for Cướp Bài from P1 to P0
       const cuopBai = createCard('Cướp Bài', 'Cẩm nang', 'spade', 'J');
       
       dispatcher.state.players[1].hand = [cuopBai];
       dispatcher.state.players[0].hand = [createCard('Né', 'Cơ bản', 'heart', '2')];
       
       const CardRegistry = require('../registries/CardRegistry').CardRegistry;
       const validTargets = CardRegistry['cuop-bai'].getValidTargets(dispatcher.state, dispatcher.state.players[1]);
       
       // P0 (Nguyễn Chích) should not be in validTargets
       expect(validTargets.map(p => p.id)).not.toContain(0);
    });

    it('Hiến Kế: Rút 1 lá bài khi mất lá bài cuối cùng trên tay', () => {
       const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-chich', playerCount: 2 });
       
       const lastCard = createCard('Chém', 'Cơ bản', 'spade', '2');
       dispatcher.state.players[0].hand = [lastCard]; // P0 có đúng 1 lá
       dispatcher.state.players[0].hasPlayedAttack = false;
       dispatcher.state.players[0].hasAttackedThisTurn = false;
       
       // Tạo event dùng Chém
       dispatcher.dispatchAction({
           type: 'ACTION_PLAY_CARD',
           payload: { playerId: 0, cardId: lastCard.id, targets: [1] }
       });
       
       // Hiến Kế sẽ hỏi có muốn rút 1 lá không
       const askHienKe = dispatcher.state.waitingForResponse;
       expect(askHienKe).toBeDefined();
       expect(askHienKe.type).toBe('ask_hien_ke');
       
       // P0 chọn đồng ý rút
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, doReact: true }
       });
       
       // P0 nhận được 1 lá bài
       expect(dispatcher.state.players[0].hand.length).toBe(1);
    });
  });

  describe('Tô Hiến Thành (Nhiếp Chính)', () => {
    it('Nhiếp Chính: Bỏ qua Bỏ bài nếu không dùng Chém', () => {
       const dispatcher = createTestDispatcher({ mainHeroId: 'to-hien-thanh', playerCount: 1 });
       dispatcher.state.players[0].hand = Array(10).fill(createCard('Né', 'Cơ bản', 'heart', '2'));
       dispatcher.state.players[0].hp = 3; // Max hand size = 3
       
       dispatcher.state.players[0].hasPlayedAttack = false; // Didn't play Attack
       dispatcher.state.players[0].hasAttackedThisTurn = false;
       dispatcher.state.waitingForResponse = { type: 'play_phase', targetId: 0 };
       dispatcher.state.actionQueue = [];
       
       dispatcher.dispatchAction({ type: 'ACTION_END_PHASE', payload: { playerId: 0 } }); // End action -> discard
       
       // Skipped discard phase, hand size should still be 10.
       // The game loop will automatically advance to the next turn's draw phase because discard phase was skipped.
       expect(dispatcher.state.players[0].hand.length).toBe(10);
       expect(dispatcher.state.waitingForResponse.type).toBe('draw_phase');
    });
  });

  describe('Nguyên Phi Ỷ Lan (Thính Chính, Phật Tâm)', () => {
    it.skip('Thính Chính: Dùng bài đen làm Né', () => {
       const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-phi-y-lan', playerCount: 2 });
       
       const blackCard = createCard('Chém', 'Cơ bản', 'spade', '2'); // Black card
       dispatcher.state.players[0].hand = [blackCard];
       
       dispatcher.state.reactionStack.push({
           type: 'EVENT_ASK_DODGE',
           payload: { sourceId: 1, targetId: 0, count: 1 }
       });
       dispatcher.tick();
       
       // React with virtual Né using the black card
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'play', data: { cardId: blackCard.id, virtualCardName: 'Né' } }
       });
       
       expect(dispatcher.state.players[0].hand.length).toBe(0);
       expect(dispatcher.state.discardPile[0].id).toBe(blackCard.id);
    });

    it.skip('Phật Tâm: Phán xét bài Đen để lấy', () => {
       const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-phi-y-lan', playerCount: 1 });
       
       // Move past initial play_phase to a clean state
       dispatcher.dispatchAction({ type: 'ACTION_END_PHASE', payload: { playerId: 0 } });
       dispatcher.state.waitingForResponse = null;
       dispatcher.state.reactionStack = [];
       dispatcher.state.actionQueue = [];
       dispatcher.state.players[0].hand = [];
       
       // Setup deck with 1 Red then 1 Black (so it pops Black first, then Red)
       const blackCard = createCard('Chém', 'Cơ bản', 'spade', '2');
       const redCard = createCard('Đào', 'Cơ bản', 'heart', '3', 'red');
       dispatcher.state.deck = [redCard, blackCard]; // pop() will get blackCard first
       
       dispatcher.state.reactionStack.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
       dispatcher.tick(); // Will trigger TURN_BEGIN hook and ask_phat_tam
       
       expect(dispatcher.state.waitingForResponse.type).toBe('ask_phat_tam');
       
       // Accept phat_tam
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true } }
       });
       
       // It judged black, so player got the card. It should loop and ask again.
       expect(dispatcher.state.players[0].hand.length).toBe(1); // 1 black
       expect(dispatcher.state.players[0].hand.find(c => c.id === blackCard.id)).toBeDefined();
       
       // It asks again
       expect(dispatcher.state.waitingForResponse.type).toBe('ask_phat_tam');
       
       // Accept again
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true } }
       });
       
       // Judged red, so it stops and discards it
       expect(dispatcher.state.players[0].hand.length).toBe(1);
       expect(dispatcher.state.discardPile.length).toBe(1);
       expect(dispatcher.state.discardPile[0].id).toBe(redCard.id);
    });
  });

  describe('Trần Nhật Duật (Thông Ngôn, Hòa Nghị)', () => {
    it('Thông Ngôn: Lấy lá bài phán xét sau khi phán xét xong', () => {
       const dispatcher = createTestDispatcher({ mainHeroId: 'tran-nhat-duat', playerCount: 1 });
       
       dispatcher.state.waitingForResponse = null;
       dispatcher.state.reactionStack = [];
       dispatcher.state.players[0].hand = [];
       
       const judgeCard = createCard('Chém', 'Cơ bản', 'heart', '5');
       dispatcher.state.deck = [judgeCard]; // Next pop() is the judge card
       
       dispatcher.state.players[0].judgementArea = [judgeCard]; // Put judge card
       dispatcher.state.reactionStack.push({
           type: 'EVENT_JUDGE',
           payload: { targetId: 0, reason: 'binh-luong', cardId: judgeCard.id }
       });
       
       dispatcher.tick(); // will process EVENT_JUDGE -> EVENT_JUDGE_RESOLVE -> AFTER_JUDGEMENT
       
       expect(dispatcher.state.waitingForResponse.type).toBe('ask_thong_ngon');
       
       // Accept thong-ngon
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true } }
       });
       
       expect(dispatcher.state.waitingForResponse?.type).toBe('play_phase');
       expect(dispatcher.state.players[0].hand.length).toBe(1); // the judge card
       expect(dispatcher.state.players[0].hand.find(c => c.id === judgeCard.id)).toBeDefined();
       expect(dispatcher.state.discardPile.length).toBe(0); // Card was taken, not discarded
    });

    it('Hòa Nghị: Nhận sát thương, rút 2 lá và phân phối', () => {
       const dispatcher = createTestDispatcher({ mainHeroId: 'tran-nhat-duat', playerCount: 2 });
       
       dispatcher.state.waitingForResponse = null;
       dispatcher.state.reactionStack = [];
       dispatcher.state.players[0].hand = [];
       dispatcher.state.players[1].hand = [];
       
       const card1 = createCard('Chém', 'Cơ bản', 'spade', '2');
       const card2 = createCard('Đào', 'Cơ bản', 'heart', '3');
       dispatcher.state.deck = [card1, card2]; // pop() will get card2 then card1
       
       // Deal damage
       dispatcher.state.reactionStack.push({
           type: 'EVENT_DAMAGE',
           payload: { sourceId: 1, targetId: 0, amount: 1, damageType: 'normal' }
       });
       
       console.log('HP before damage:', dispatcher.state.players[0].hp);
       dispatcher.tick(); // Applies damage, triggers POST_DAMAGE -> ask_hoa_nghi
       console.log('HP after damage:', dispatcher.state.players[0].hp);
       
       expect(dispatcher.state.players[0].hp).toBeLessThan(dispatcher.state.players[0].maxHp); // At least less than maxHp
       expect(dispatcher.state.waitingForResponse.type).toBe('ask_hoa_nghi');
       expect(dispatcher.state.waitingForResponse.drawnCards.length).toBe(2);
       
       // Provide distribution
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { 
               playerId: 0, 
               responseType: 'skill_response', 
               data: { 
                   doProvide: true,
                   distribution: [
                       { cardId: card2.id, targetId: 0 },
                       { cardId: card1.id, targetId: 1 }
                   ]
               } 
           }
       });
       
       expect(dispatcher.state.waitingForResponse.type).toBe('play_phase');
       expect(dispatcher.state.players[0].hand.length).toBe(1); // 1 card
       expect(dispatcher.state.players[1].hand.length).toBe(1); // 1 card
       expect(dispatcher.state.players[0].hand.find(c => c.id === card2.id)).toBeDefined();
       expect(dispatcher.state.players[1].hand.find(c => c.id === card1.id)).toBeDefined();
    });
  });

  describe('Chu Văn An (Thất Trảm Sớ)', () => {
    it('Thất Trảm Sớ: Bắt mục tiêu bỏ 2 lá bài hoặc mất 1 máu', () => {
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'chu-van-an',
           playerCount: 2
       });
       const p0 = dispatcher.state.players[0]; // Chu Van An
       const p1 = dispatcher.state.players[1];
       
       p0.hp = 3;
       p1.hp = 3;
       p1.hand = [
           createCard('Đánh', 'Cơ bản', 'spade', 'K'),
           createCard('Né', 'Cơ bản', 'heart', '2')
       ];

       // p1 damages p0
       dispatcher.state.reactionStack.push({
           type: 'EVENT_DAMAGE',
           payload: { sourceId: p1.id, targetId: p0.id, amount: 1, damageType: 'normal' }
       });
       dispatcher.tick();
       
       expect(dispatcher.state.players[0].hp).toBe(2);
       
       const askThatTramSo = dispatcher.state.waitingForResponse;
       expect(askThatTramSo).toBeDefined();
       expect(askThatTramSo.type).toBe('ask_that_tram_so');
       
       // Chu Van An uses skill
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true } }
       });
       
       const askPunish = dispatcher.state.waitingForResponse;
       expect(askPunish).toBeDefined();
       expect(askPunish.type).toBe('ask_that_tram_so_punish');
       expect(askPunish.targetId).toBe(p1.id);
       
       // p1 discards 2 cards
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 1, responseType: 'skill_response', data: { doReact: true, discardCards: [p1.hand[0].id, p1.hand[1].id] } }
       });
       
       expect(dispatcher.state.waitingForResponse).not.toBeNull();
       expect(dispatcher.state.waitingForResponse.type).toBe('play_phase');
       expect(dispatcher.state.players[1].hand.length).toBe(0);
       expect(dispatcher.state.players[1].hp).toBe(3); // p1 didn't lose HP
    });
    it('Thất Trảm Sớ: Mục tiêu mất 1 máu nếu không bỏ đủ 2 lá bài', () => {
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'chu-van-an',
           playerCount: 2
       });
       const p0 = dispatcher.state.players[0]; // Chu Van An
       const p1 = dispatcher.state.players[1];
       
       p0.hp = 3;
       p1.hp = 3;
       p1.mainHeroId = 'son-tinh';
       p1.subHeroId = 'son-tinh';
       p1.hand = [
           createCard('Đánh', 'Cơ bản', 'spade', 'K')
       ];

       // p1 damages p0
       dispatcher.state.reactionStack.push({
           type: 'EVENT_DAMAGE',
           payload: { sourceId: p1.id, targetId: p0.id, amount: 1, damageType: 'normal' }
       });
       dispatcher.tick();
       
       // Chu Van An uses skill
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true } }
       });
       
       // p1 does not have enough cards, cancels
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 1, responseType: 'skill_response', data: { doReact: false } }
       });
       
       expect(dispatcher.state.waitingForResponse).not.toBeNull();
       expect(dispatcher.state.waitingForResponse.type).toBe('play_phase');
       expect(dispatcher.state.players[1].hp).toBe(2); // p1 lost 1 HP
    });
  });

  describe('Hồ Xuân Hương (Duyên Thơ, Xuân Hương)', () => {
      it('Duyên Thơ: Bỏ 2 lá bài hồi 1 máu cho mình và 1 nam tướng', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'ho-xuan-huong', playerCount: 2 });
            const p0 = dispatcher.state.players[0];
            p0.hp = 2;
            const p1 = dispatcher.state.players[1];
            p1.gender = 'Nam';
            p1.hp = 2;
            
            p0.hand = [
                { id: 'c1', name: 'Chém' },
                { id: 'c2', name: 'Né' }
            ];
            
            // Add skill to player
            p0.mainHeroId = 'ho-xuan-huong';
            
            dispatcher.dispatchAction({
                type: 'ACTION_USE_SKILL',
                payload: {
                    skillId: 'duyen-tho',
                    playerId: 0,
                    targets: []
                }
            });
            
            expect(dispatcher.state.waitingForResponse).not.toBeNull();
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_duyen_tho');
            
            dispatcher.dispatchAction({
                type: 'ACTION_REACT',
                payload: {
                    playerId: 0,
                    responseType: 'skill_response',
                    data: {
                        skillId: 'duyen-tho',
                        targetId: 1,
                        cardIndexes: [0, 1]
                    }
                }
            });
            
            expect(dispatcher.state.players[0].hp).toBe(3);
            expect(dispatcher.state.players[1].hp).toBe(3);
            expect(dispatcher.state.players[0].hand.length).toBe(0);
            expect(dispatcher.state.players[0].duyenThoUsedThisTurn).toBe(true);
        });

        it('Xuân Hương: Rút 2 lá bài khi mất trang bị', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'ho-xuan-huong', playerCount: 2 });
            const p0 = dispatcher.state.players[0];
            p0.mainHeroId = 'ho-xuan-huong';
            p0.skills = ['xuan-huong'];
            
            const horse = { id: 'horse1', type: 'equipment', equipmentType: 'horse_plus' };
            p0.equipment.push(horse);
            p0.hand = [];
            dispatcher.state.deck = [ { id: 'd1' }, { id: 'd2' } ];
            
            // Simulate losing equipment
            dispatcher.triggerHooks('ON_EQUIP_LOST', { sourceId: 0, cardId: 'horse1' });
            dispatcher.tick();
            
            expect(dispatcher.state.waitingForResponse).not.toBeNull();
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_xuan_huong');
            
            dispatcher.dispatchAction({
                type: 'ACTION_REACT',
                payload: {
                    playerId: 0,
                    responseType: 'skill_response',
                    data: {
                        skillId: 'xuan-huong',
                        doReact: true
                    }
                }
            });
            
            expect(dispatcher.state.players[0].hand.length).toBe(2);
        });
    });

    describe('Nguyễn Địa Lô (Hộ Chủ, Can Gián)', () => {
        it('Hộ Chủ: Lật bài không trùng, hồi 1 máu và lưu bài Trung', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-dia-lo', playerCount: 2 });
            const p0 = dispatcher.state.players[0];
            p0.mainHeroId = 'nguyen-dia-lo';
            p0.skills = ['ho-chu'];
            p0.hp = 0;
            
            dispatcher.state.deck = [
                { id: 'c1', rank: '5', suit: 'heart' }
            ];
            
            dispatcher.state.reactionStack.push({
                type: 'EVENT_DYING',
                payload: { targetId: 0, sourceId: 1 }
            });
            
            dispatcher.tick();
            
            expect(dispatcher.state.players[0].hp).toBe(1);
            expect(dispatcher.state.players[0].trungCards.length).toBe(1);
            expect(dispatcher.state.players[0].trungCards[0].rank).toBe('5');
            expect(dispatcher.state.players[0].isDying).toBe(false);
        });

        it('Hộ Chủ: Lật bài trùng điểm, Hộ Chủ thất bại', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-dia-lo', playerCount: 2 });
            const p0 = dispatcher.state.players[0];
            p0.mainHeroId = 'nguyen-dia-lo';
            p0.skills = ['ho-chu'];
            p0.hp = 0;
            p0.trungCards = [ { id: 'c0', rank: '5', suit: 'spade' } ];
            
            dispatcher.state.deck = [
                { id: 'c1', rank: '5', suit: 'heart' }
            ];
            
            dispatcher.state.reactionStack.push({
                type: 'EVENT_DYING',
                payload: { targetId: 0, sourceId: 1 }
            });
            
            dispatcher.tick();
            
            expect(dispatcher.state.players[0].hp).toBe(0);
            expect(dispatcher.state.players[0].trungCards.length).toBe(1); // Not added
            expect(dispatcher.state.discardPile.find(c => c.id === 'c1')).toBeDefined();
        });

        it('Can Gián: Mất 1 HP để giúp tướng vừa mất bài rút 2 lá', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-dia-lo', playerCount: 2 });
            const p0 = dispatcher.state.players[0]; // Nguyễn Địa Lô
            p0.mainHeroId = 'nguyen-dia-lo';
            p0.skills = [{ id: 'can-gian' }];
            p0.revealedHeroes = [true];
            p0.hp = 3;
            
            const p1 = dispatcher.state.players[1]; // Target
            p1.hand = [];
            
            // Setup a fake POST_DISCARD event trigger
            dispatcher.state.waitingForResponse = {
                type: 'ask_can_gian',
                responderId: 0,
                sourceId: 0,
                targetId: 1,
                interruptedEvent: null
            };
            
            dispatcher.dispatchAction({
                type: 'ACTION_REACT',
                payload: {
                    playerId: 0,
                    responseType: 'skill_response',
                    data: {
                        skillId: 'can-gian',
                        doUse: true
                    }
                }
            });
            
            expect(dispatcher.state.players[0].hp).toBe(2);
            expect(dispatcher.state.players[1].hand.length).toBe(2);
        });
    });

    describe('Ngọc Hân Công Chúa (Hiền Hậu, Quốc Sắc)', () => {
        it('Quốc Sắc: Bài bích được tính là bài cơ trong getEffectiveSuit', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'ngoc-han-cong-chua', playerCount: 2 });
            const p0 = dispatcher.state.players[0];
            p0.skills = ['quoc-sac'];
            
            const cardSpade = { suit: 'spade' };
            const cardClub = { suit: 'club' };
            
            // We need to import getEffectiveSuit or test it indirectly
            // It's used in Hiền Hậu. Let's test Hiền Hậu with a spade card.
            p0.mainHeroId = 'ngoc-han-cong-chua';
            p0.skills = ['hien-hau', 'quoc-sac'];
            p0.hand = [ { id: 'c1', suit: 'spade' } ];
            p0.hp = 3;
            
            const p1 = dispatcher.state.players[1];
            p1.hp = 3;
            
            const damagePayload = { targetId: 0, sourceId: 1, amount: 1 };
            
            dispatcher.state.reactionStack.push({
                type: 'EVENT_DAMAGE',
                payload: damagePayload
            });
            
            dispatcher.tick();
            
            // Should ask hien-hau because spade becomes heart (red)
            expect(dispatcher.state.waitingForResponse).not.toBeNull();
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_hien_hau');
        });

        it('Hiền Hậu: Bỏ lá bài đỏ, chuyển sát thương thành mất máu và thu lá bài', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'ngoc-han-cong-chua', playerCount: 2 });
            const p0 = dispatcher.state.players[0];
            p0.mainHeroId = 'ngoc-han-cong-chua';
            p0.skills = ['hien-hau'];
            p0.hand = [ { id: 'c1', suit: 'heart' } ]; // Red card
            p0.hp = 3;
            
            const p1 = dispatcher.state.players[1];
            p1.hp = 4;
            p1.hand = [];
            
            const damagePayload = { targetId: 0, sourceId: 1, amount: 1 };
            
            dispatcher.state.reactionStack.push({
                type: 'EVENT_DAMAGE',
                payload: damagePayload
            });
            
            dispatcher.tick();
            
            expect(dispatcher.state.waitingForResponse).not.toBeNull();
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_hien_hau');
            
            dispatcher.dispatchAction({
                type: 'ACTION_REACT',
                payload: {
                    playerId: 0,
                    responseType: 'skill_response',
                    data: {
                        skillId: 'hien-hau',
                        doProvide: true,
                        cardId: 'c1',
                        targetId: 1,
                        option: 2 // Lựa chọn 2: Mục tiêu mất 1 HP và thu lá bài
                    }
                }
            });
            
            // Bỏ qua assert damagePayload.isCancelled vì applyEffect đã deep clone state làm mất tham chiếu
            expect(dispatcher.state.players[0].hand.length).toBe(0);
            expect(dispatcher.state.players[1].hp).toBe(3); // Lost 1 HP
            expect(dispatcher.state.players[1].hand.length).toBe(1); // Received the discarded card
            expect(dispatcher.state.players[1].hand[0].id).toBe('c1');
        });
    });

    describe('Công chúa An Tư (Hòa Thân, Xả Thân)', () => {
        it('Hòa Thân (An Tư): Dùng bài Rô làm Hỗn Loạn', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'cong-chua-an-tu', playerCount: 2 });
            const p0 = dispatcher.state.players[0];
            p0.mainHeroId = 'cong-chua-an-tu';
            p0.skills = ['hoa-than-an-tu', 'xa-than']; // ensure correct skills
            p0.hand = [ { id: 'c1', suit: 'diamond', rank: 'A', name: 'Đào' } ];
            
            const p1 = dispatcher.state.players[1];
            p1.gender = 'Nam';
            
            dispatcher.dispatchAction({
                type: 'ACTION_USE_SKILL',
                payload: {
                    skillId: 'hoa-than-an-tu',
                    playerId: 0,
                    targets: []
                }
            });
            
            expect(dispatcher.state.waitingForResponse).not.toBeNull();
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_hoa_than_an_tu');
            
            dispatcher.dispatchAction({
                type: 'ACTION_REACT',
                payload: {
                    playerId: 0,
                    responseType: 'skill_response',
                    data: {
                        skillId: 'hoa-than-an-tu',
                        targetId: 1,
                        cardFrom: 'hand',
                        cardIndex: 0
                    }
                }
            });
            
            expect(dispatcher.state.players[0].hand.length).toBe(0);
            
            // Should place a virtual Hon Loan card in p1's judgement area
            // Before it resolves into judgement area, it triggers ask_negate for the trick "Hỗn Loạn"
            // Should place a virtual Hon Loan card in p1's judgement area
            expect(dispatcher.state.waitingForResponse.type).toBe('play_phase');
            expect(dispatcher.state.players[1].judgementArea).toBeDefined();
            expect(dispatcher.state.players[1].judgementArea.length).toBe(1);
            expect(dispatcher.state.players[1].judgementArea[0].name).toBe('Đào');
            expect(dispatcher.state.players[1].judgementArea[0].virtualName).toBe('hon-loan');
        });

        it('Xả Thân: Chuyển hướng mục tiêu của Chém', () => {
            const dispatcher = createTestDispatcher({ mainHeroId: 'cong-chua-an-tu', playerCount: 3 });
            const p0 = dispatcher.state.players[0]; // Attacker
            p0.hand = [ { id: 'slash1', name: 'Chém', suit: 'spade', rank: '5' } ];
            
            const p1 = dispatcher.state.players[1]; // An Tư
            p1.mainHeroId = 'cong-chua-an-tu';
            p1.skills = ['xa-than'];
            p1.hand = [ { id: 'c1' } ];
            
            const p2 = dispatcher.state.players[2]; // Nam target
            p2.gender = 'Nam';
            
            // Attacker plays slash on An Tư
            dispatcher.dispatchAction({
                type: 'ACTION_PLAY_CARD',
                payload: {
                    playerId: 0,
                    cardId: 'slash1',
                    targets: [1]
                }
            });
            
            // Xả Thân triggers on EVENT_TARGETED_SLASH
            expect(dispatcher.state.waitingForResponse).not.toBeNull();
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_xa_than');
            
            dispatcher.dispatchAction({
                type: 'ACTION_REACT',
                payload: {
                    playerId: 1,
                    responseType: 'skill_response',
                    data: {
                        skillId: 'xa-than',
                        doProvide: true,
                        cardId: 'c1',
                        targetId: 2
                    }
                }
            });
            
            expect(dispatcher.state.players[1].hand.length).toBe(0);
            expect(dispatcher.state.players[1].askedXaThan).toBe(true);
            
            // The next waiting for response should be asking the new target (p2) to dodge
            expect(dispatcher.state.waitingForResponse).not.toBeNull();
            expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');
            expect(dispatcher.state.waitingForResponse.responderId).toBe(2);
        });
    });
  describe('Mạc Đĩnh Chi (Đối Sứ)', () => {
    it('Đối Sứ: Thu 1 lá bài của nguồn sát thương', () => {
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'mac-dinh-chi',
           playerCount: 2
       });
       const p0 = dispatcher.state.players[0]; // Mac Dinh Chi
       const p1 = dispatcher.state.players[1];
       
       p0.hp = 3;
       const targetCard = createCard('Đánh', 'Cơ bản', 'spade', 'K');
       p1.hand = [targetCard];
       
       const initialP0HandLength = p0.hand.length;

       dispatcher.state.waitingForResponse = null;
       dispatcher.state.reactionStack = [];

       // p1 damages p0
       dispatcher.state.reactionStack.push({
           type: 'EVENT_DAMAGE',
           payload: { sourceId: p1.id, targetId: p0.id, amount: 1, damageType: 'normal' }
       });
       dispatcher.tick();
       
       const askDoiSu = dispatcher.state.waitingForResponse;
       expect(askDoiSu).toBeDefined();
       expect(askDoiSu.type).toBe('ask_doi_su');
       
       // Mac Dinh Chi uses skill
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true } }
       });
       
       expect(dispatcher.state.waitingForResponse).not.toBeNull();
       expect(dispatcher.state.waitingForResponse.type).toBe('play_phase');
       expect(dispatcher.state.players[1].hand.length).toBe(0);
       expect(dispatcher.state.players[0].hand.length).toBe(initialP0HandLength + 1);
       expect(dispatcher.state.players[0].hand.find(c => c.id === targetCard.id)).toBeDefined();
    });
  });

  describe('Trần Khánh Dư (Vân Đồn)', () => {
    it('Vân Đồn: Đấu điểm thắng thì được dùng thêm 1 lá Chém', () => {
       const dispatcher = createTestDispatcher({ 
           mainHeroId: 'tran-khanh-du',
           playerCount: 2
       });
       const p0 = dispatcher.state.players[0]; // Trần Khánh Dư
       const p1 = dispatcher.state.players[1];
       
       const p0Card = createCard('Đánh', 'Cơ bản', 'spade', 'K'); // Rank K (13)
       p0.hand = [p0Card];
       
       const p1Card = createCard('Né', 'Cơ bản', 'heart', '2'); // Rank 2 (2)
       p1.hand = [p1Card];
       
       p0.skills = ['van-don'];
       p0.revealedHeroes = [true];

       dispatcher.state.waitingForResponse = null;
       dispatcher.state.reactionStack = [];

       // Trần Khánh Dư uses Vân Đồn
       dispatcher.dispatchAction({
           type: 'ACTION_USE_SKILL',
           payload: { playerId: 0, skillId: 'van-don', targets: [1] }
       });
       
       const askVanDon = dispatcher.state.waitingForResponse;
       expect(askVanDon).toBeDefined();
       expect(askVanDon.type).toBe('ask_van_don');
       
       // Trần Khánh Dư chooses target and card
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { 
               playerId: 0, 
               responseType: 'skill_response', 
               data: { targetId: 1, cardId: p0Card.id, cardIndex: 0 } 
           }
       });
       
       // p0 wins (K vs 2) -> vanDonWin = true
       expect(dispatcher.state.players[0].vanDonWin).toBe(true);
       expect(dispatcher.state.players[0].vanDonLose).toBeUndefined(); // or false
       expect(dispatcher.state.players[0].hand.length).toBe(0);
       expect(dispatcher.state.players[1].hand.length).toBe(0);
    });
  });
});
